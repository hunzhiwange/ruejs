import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as runtime from '../src/index'
import * as compilerInternal from '../../rue/src/compiler-internal'
import * as runtimeInternal from '../src/internal'
import * as legacyDOM from '../src/compiled-legacy-dom'
import {
  _$compiledBindUseRef,
  _$compiledRoot,
  _$compiledComponent,
  _$compiledSignal,
  _$compiledValue,
  _$mountCompiledSlotAt,
  _$withCompiledHookScope,
  effect,
  watchEffect,
  renderAnchor,
  untrack,
} from '../src/internal'

const runtimeSource = `${resolve(process.cwd(), 'packages/runtime/src')}/`

const removedClientModules = [
  'vapor.ts',
  'vapor-core.ts',
  'vapor-helpers.ts',
  'renderable-bridge.ts',
  'renderable-lifecycle.ts',
  'renderable-mount-handle.ts',
  'renderable-normalize.ts',
  'compiled-vapor.ts',
]

describe('client runtime architecture', () => {
  it('removes object Proxy APIs from runtime and Rue public types', () => {
    const removed = [
      'createReactive',
      'reactive',
      'readonly',
      'shallowReactive',
      'shallowReadonly',
      'propsReactive',
      'isProxy',
      'toRaw',
    ]
    for (const name of removed) {
      expect(runtime).not.toHaveProperty(name)
      expect(runtimeInternal).not.toHaveProperty(name)
      expect(compilerInternal).not.toHaveProperty(name)
      for (const file of ['index.ts', 'index.d.ts', 'internal.ts']) {
        expect(readFileSync(resolve('packages/rue/src', file), 'utf8')).not.toMatch(
          new RegExp(`\\b${name}\\b`),
        )
      }
    }
  })

  it('has no reactive Proxy production paths or compatibility modules', () => {
    for (const file of [
      'compiled-reactive-compat.ts',
      'runtime-core/reactive-kernel/reactive.ts',
    ]) {
      expect(existsSync(`${runtimeSource}${file}`)).toBe(false)
    }
    for (const directory of [
      'runtime-core/reactive-kernel',
      'runtime-core/js-reactive',
      'compiler-runtime',
      'reactivity',
    ]) {
      const base = `${runtimeSource}${directory}`
      for (const file of readdirSync(base, { recursive: true }) as string[]) {
        if (file.endsWith('.ts'))
          expect(readFileSync(`${base}/${file}`, 'utf8')).not.toMatch(/new\s+Proxy\s*\(/)
      }
    }
  })

  it.each([
    ['runtime internal', runtimeInternal],
    ['Rue compiler internal', compilerInternal],
  ])('exports only the canonical compiled root from %s', (_name, entry) => {
    expect(entry).toHaveProperty('_$compiledRoot', _$compiledRoot)
    expect(entry).not.toHaveProperty('vapor')
  })

  it('removes the legacy DOM compiled root alias', () => {
    expect(legacyDOM).not.toHaveProperty('vapor')
  })

  it('removes the compiler dependency graph and pending effect queue', () => {
    const compiled = readFileSync(`${runtimeSource}runtime-core/compiled.ts`, 'utf8')
    expect(compiled).not.toMatch(
      /DependencyRecord|DirectSelectorSubscriber|pendingEffects|nextSignalId|nextEffectId/,
    )
  })

  it('removes the compatibility runtime after migrating its behavior tests', () => {
    expect(removedClientModules.filter(file => existsSync(`${runtimeSource}${file}`))).toEqual([])
  })

  it('does not expose compatibility APIs from the public entry', () => {
    expect(runtime).not.toHaveProperty('normalizeRenderable')
    expect(runtime).not.toHaveProperty('renderBetween')
    expect(runtime).not.toHaveProperty('vapor')

    const publicEntry = readFileSync(`${runtimeSource}index.ts`, 'utf8')
    expect(publicEntry).not.toMatch(/renderable-normalize|vapor-helpers/)
  })

  it('mounts and disposes a compiler-created root without the removed layer', () => {
    const container = document.createElement('div')
    const handle = _$compiledRoot(parent => {
      const node = document.createElement('strong')
      node.textContent = 'compiled fixture'
      ;(parent as ParentNode | null)?.appendChild(node)
      return node
    })

    handle.__rue_compiled_mount(container)
    expect(container.innerHTML).toBe('<strong>compiled fixture</strong>')
    handle.dispose()
    expect(container.innerHTML).toBe('')
  })

  it('shares one reactive graph between the public API and compiler effects', () => {
    runtime.setReactiveScheduling('sync')
    const value = runtime.ref('one')
    let seen = ''
    const observer = runtime.effect(() => {
      seen = value.value
    })
    expect(seen).toBe('one')
    value.value = 'two'
    expect(seen).toBe('two')
    observer.dispose()
  })

  it('keeps compiler effects alive when handles are mounted through a slot value', () => {
    runtime.setReactiveScheduling('sync')
    const value = runtime.ref('one')
    const text = document.createTextNode('')
    const child = _$compiledRoot(parent => {
      parent?.appendChild(text)
      watchEffect(() => {
        text.data = value.value
      })
      return text
    })
    const handle = _$compiledValue([child])
    const container = document.createElement('div')
    handle.__rue_compiled_mount(container)
    expect(container.textContent).toBe('one')
    value.value = 'two'
    expect(container.textContent).toBe('two')
    handle.dispose()
  })

  it('tracks effects created inside a compiled hook scope', () => {
    runtime.setReactiveScheduling('sync')
    const value = runtime.ref('one')
    const handle = _$withCompiledHookScope(() =>
      _$compiledRoot(parent => {
        const text = document.createTextNode('')
        parent?.appendChild(text)
        effect(() => {
          text.data = value.value
        })
        return text
      }),
    )
    const container = document.createElement('div')
    handle.__rue_compiled_mount(container)
    value.value = 'two'
    expect(container.textContent).toBe('two')
    handle.dispose()
  })

  it('tracks child effects mounted by a compiled slot effect', () => {
    runtime.setReactiveScheduling('sync')
    const value = runtime.ref('one')
    const child = _$compiledRoot(parent => {
      const text = document.createTextNode('')
      parent?.appendChild(text)
      watchEffect(() => {
        text.data = value.value
      })
      return text
    })
    const slot = _$compiledSignal([child])
    const handle = _$compiledRoot(parent => {
      if (parent == null) return null
      const anchor = document.createComment('slot')
      parent.appendChild(anchor)
      _$mountCompiledSlotAt(
        { parent, before: anchor },
        () => slot.get(),
        () => ({}),
      )
      return anchor
    })
    const container = document.createElement('div')
    handle.__rue_compiled_mount(container)
    value.value = 'two'
    expect(container.textContent).toBe('two')
    handle.dispose()
  })

  it('tracks the compiler dynamic-text anchor read', () => {
    runtime.setReactiveScheduling('sync')
    const value = runtime.ref('one')
    const handle = _$compiledRoot(parent => {
      if (parent == null) return null
      const anchor = document.createComment('text')
      parent.appendChild(anchor)
      watchEffect(() => {
        const next = value.value
        untrack(() => renderAnchor(next, parent, anchor))
      })
      return anchor
    })
    const container = document.createElement('div')
    handle.__rue_compiled_mount(container)
    value.value = 'two'
    expect(container.textContent).toBe('two')
    handle.dispose()
  })

  it('tracks state created inside a compiled component factory', () => {
    runtime.setReactiveScheduling('sync')
    let setValue = (_value: string) => {}
    const View = () => {
      const value = runtime.ref('one')
      setValue = next => (value.value = next)
      return _$withCompiledHookScope(() =>
        _$compiledRoot(parent => {
          if (parent == null) return null
          const anchor = document.createComment('text')
          parent.appendChild(anchor)
          watchEffect(() => {
            const next = value.value
            untrack(() => renderAnchor(next, parent, anchor))
          })
          return anchor
        }),
      )
    }
    const container = document.createElement('div')
    const handle = _$compiledComponent(View as any, () => ({}))
    handle.__rue_compiled_mount(container)
    setValue('two')
    expect(container.textContent).toBe('two')
    handle.dispose()
  })

  it('tracks stable nested reactive arrays', () => {
    runtime.setReactiveScheduling('sync')
    const state = runtime.signal({ items: [{ done: false }] })
    let count = -1
    const observer = runtime.effect(() => {
      count = state.getPath(['items', 0, 'done']) ? 1 : 0
    })
    expect(count).toBe(0)
    state.setPath(['items', 0, 'done'], true)
    expect(count).toBe(1)
    state.setPath(['items', 1], { done: false })
    expect((state.peekPath(['items']) as unknown[]).length).toBe(2)
    observer.dispose()
  })

  it('keeps computed setup dependencies connected to mounted DOM effects', () => {
    runtime.setReactiveScheduling('sync')
    let append = () => {}
    const View = () => {
      const [state] = runtime.useState(() => runtime.signal({ items: ['one'] }))
      const [items] = runtime.useState(() => runtime.computed(() => [...state.get().items]))
      append = () => state.update(value => ({ items: [...value.items, 'two'] }))
      return _$compiledRoot(parent => {
        const text = document.createTextNode('')
        parent?.appendChild(text)
        effect(() => {
          text.data = items.get().join(',')
        })
        return text
      })
    }
    const container = document.createElement('div')
    const handle = _$compiledComponent(View as any, () => ({}))
    handle.__rue_compiled_mount(container)
    expect(container.textContent).toBe('one')
    append()
    expect(container.textContent).toBe('one,two')
    handle.dispose()
  })

  it('exports the ref binding helper emitted by the current compiler', () => {
    const container = document.createElement('div')
    const ref = { current: null as HTMLButtonElement | null }
    const handle = _$compiledRoot(parent => {
      const node = document.createElement('button')
      _$compiledBindUseRef(node, () => ref)
      parent?.appendChild(node)
      return node
    })

    handle.__rue_compiled_mount(container)
    expect(ref.current).toBe(container.firstChild)
    handle.dispose()
    expect(ref.current).toBeNull()
  })

  it('mounts a compiler root inside a compiled value', () => {
    const child = _$compiledRoot(parent => {
      const node = document.createElement('span')
      node.textContent = 'compiled child'
      ;(parent as ParentNode | null)?.appendChild(node)
      return node
    })
    const handle = _$compiledValue(child)
    const container = document.createElement('div')

    handle.__rue_compiled_mount(container)
    expect(container.innerHTML).toBe('<span>compiled child</span>')
    handle.dispose()
    expect(container.innerHTML).toBe('')
  })
})
