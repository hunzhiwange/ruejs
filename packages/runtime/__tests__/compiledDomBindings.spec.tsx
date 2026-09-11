// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as compiledRuntime from '../src/internal'
import { resolveCompilerCapability } from './compiler-capability-test-runtime'

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const compileDirectTextSource = (source: string): string => {
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  return swc.transformSync(source, {
    filename: 'compiled-direct-text.tsx',
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      target: 'es2020',
      transform: {
        react: {
          runtime: 'automatic',
          importSource: '@rue-js',
          development: false,
          throwIfNamespace: false,
        },
      },
      experimental: { plugins: [[pluginPath, {}]] },
    },
    module: { type: 'commonjs' },
  }).code
}

const evaluateDirectTextSource = (output: string) => {
  const module = { exports: {} as Record<string, unknown> }
  new Function('require', 'module', 'exports', output)(
    (id: string) => {
      const capability = resolveCompilerCapability(id)
      if (capability) return capability
      if (id === '@rue-js/rue') return compiledRuntime
      throw new Error(`Unexpected generated import: ${id}`)
    },
    module,
    module.exports,
  )
  return module.exports as {
    state: { set(value: unknown): void }
    View(): compiledRuntime.CompiledRootHandle
  }
}

const step = compiledRuntime.signal(0)

const bind = <T,>(read: () => T, write: (value: T) => void): void => {
  let previous: T | undefined
  compiledRuntime.effect(() => {
    const next = read()
    if (Object.is(previous, next)) return
    previous = next
    write(next)
  })
}

const scalarBindings = compiledRuntime._$compiledRoot(() => {
  const root = document.createElement('section')
  const text = document.createElement('span')
  const input = document.createElement('input')
  text.dataset.binding = 'text'
  input.dataset.binding = 'input'
  root.append(text, input)

  bind(
    () => (step.get() < 2 ? 'idle' : 'ready'),
    value => {
      root.className = value
    },
  )
  bind(
    () => String(step.get() < 2 ? 'color:red' : 'color:blue'),
    value => {
      root.style.cssText = value
    },
  )
  bind(
    () => (step.get() < 2 ? 'present' : null),
    value => {
      if (value == null) root.removeAttribute('title')
      else root.setAttribute('title', String(value))
    },
  )
  bind(
    () => String(step.get() < 2 ? 'first' : 'second'),
    value => {
      text.textContent = value
    },
  )
  bind(
    () => String(step.get() < 2 ? 'one' : 'two'),
    value => {
      input.value = value
    },
  )
  bind(
    () => Boolean(step.get() >= 2),
    value => {
      input.checked = value
    },
  )
  bind(
    () => Boolean(step.get() >= 2),
    value => {
      input.disabled = value
    },
  )

  return [root, root] as const
})

const flushCompiledEffects = async (): Promise<void> => {
  const waitForScheduler = (): Promise<void> =>
    typeof requestAnimationFrame === 'function'
      ? new Promise(resolve => requestAnimationFrame(() => resolve()))
      : Promise.resolve()

  await waitForScheduler()
  await waitForScheduler()
  await waitForScheduler()
}

const trackPropertyWrites = (target: object, property: string): (() => number) => {
  const getter = (target as any).__lookupGetter__(property) as (() => unknown) | undefined
  const setter = (target as any).__lookupSetter__(property) as
    | ((value: unknown) => void)
    | undefined
  expect(getter, `Missing getter for ${property}`).toBeTypeOf('function')
  expect(setter, `Missing setter for ${property}`).toBeTypeOf('function')

  let writes = 0
  Object.defineProperty(target, property, {
    configurable: true,
    get: () => getter?.call(target),
    set: value => {
      writes += 1
      setter?.call(target, value)
    },
  })
  return () => writes
}

afterEach(() => {
  compiledRuntime.setReactiveScheduling('frame')
  step.set(0)
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('compiled scalar DOM bindings', () => {
  it('mounts proven scalar template children as one directly updated Text node', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const output = compileDirectTextSource(`
      import { signal } from '@rue-js/rue'
      export const state = signal('ready')
      export const View = () => <section><span>{state.get()}</span></section>
    `)
    const directText = evaluateDirectTextSource(output)
    const host = document.createElement('main')
    document.body.appendChild(host)
    const created = vi.spyOn(document, 'createTextNode')
    const inserted = vi.spyOn(Node.prototype, 'insertBefore')
    const removed = vi.spyOn(Node.prototype, 'removeChild')

    const handle = directText.View()
    const root = handle.__rue_compiled_mount(host)
    if (root != null && root.parentNode !== host) host.appendChild(root)
    const span = host.querySelector('span')
    if (span == null) throw new Error('Expected compiled text host')
    const text = span?.firstChild
    if (!(text instanceof Text)) throw new Error('Expected one direct Text child')
    const writes = trackPropertyWrites(text, 'textContent')

    directText.state.set('ready')
    expect(writes()).toBe(0)
    directText.state.set(0)
    directText.state.set('0')
    expect({ text: text.textContent, writes: writes() }).toEqual({ text: '0', writes: 1 })
    directText.state.set(null)
    directText.state.set(false)
    directText.state.set(undefined)
    directText.state.set('')
    expect({ text: text.textContent, writes: writes() }).toEqual({ text: '', writes: 2 })

    expect({
      comments: [...host.querySelectorAll('*')]
        .flatMap(element => [...element.childNodes])
        .filter(node => node.nodeType === Node.COMMENT_NODE).length,
      explicitTextAllocations: created.mock.calls.filter(([value]) => value === '').length,
      insertedTexts: inserted.mock.calls.filter(([node]) => node.nodeType === Node.TEXT_NODE)
        .length,
      removedComments: removed.mock.calls.filter(([node]) => node.nodeType === Node.COMMENT_NODE)
        .length,
      spanChildren: span.childNodes.length,
    }).toEqual({
      comments: 0,
      explicitTextAllocations: 0,
      insertedTexts: 0,
      removedComments: 0,
      spanChildren: 1,
    })
    expect(output).not.toContain('rue:text-hole')
    expect(output).not.toContain('renderAnchor')

    handle.dispose()
    expect(host.innerHTML).toBe('')
    directText.state.set('after-dispose')
    expect(writes()).toBe(2)
  })

  it('normalizes text and skips writes when raw values render identically', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const source = compiledRuntime.signal<unknown>(null)
    let textContent: string | null = 'stale'
    let writes = 0
    const node = {
      get textContent() {
        return textContent
      },
      set textContent(value: string | null) {
        writes += 1
        textContent = value
      },
    }

    const binding = compiledRuntime._$compiledText(node, () => source.get())
    expect({ textContent, writes }).toEqual({ textContent: '', writes: 1 })

    source.set(false)
    source.set(undefined)
    expect({ textContent, writes }).toEqual({ textContent: '', writes: 1 })

    source.set(0)
    source.set('0')
    expect({ textContent, writes }).toEqual({ textContent: '0', writes: 2 })

    binding.dispose()
    source.set('after-dispose')
    expect({ textContent, writes }).toEqual({ textContent: '0', writes: 2 })
  })

  it('writes each binding only when its normalized value changes and stops after dispose', async () => {
    const host = document.createElement('main')
    document.body.appendChild(host)

    const handle = scalarBindings as unknown as {
      __rue_compiled_mount(parent: ParentNode): Node | null | undefined
      dispose(): void
    }
    const mounted = handle.__rue_compiled_mount(host)
    if (!(mounted instanceof HTMLElement)) throw new Error('Expected a compiled HTMLElement root')
    host.appendChild(mounted)

    const text = mounted.querySelector<HTMLElement>('[data-binding="text"]')
    const input = mounted.querySelector<HTMLInputElement>('[data-binding="input"]')
    if (!text || !input) throw new Error('Expected binding targets')

    const classWrites = trackPropertyWrites(mounted, 'className')
    const styleWrites = trackPropertyWrites(mounted.style, 'cssText')
    const textWrites = trackPropertyWrites(text, 'textContent')
    const valueWrites = trackPropertyWrites(input, 'value')
    const checkedWrites = trackPropertyWrites(input, 'checked')
    const disabledWrites = trackPropertyWrites(input, 'disabled')
    const originalSetAttribute = mounted.setAttribute.bind(mounted)
    const originalRemoveAttribute = mounted.removeAttribute.bind(mounted)
    let titleWrites = 0
    mounted.setAttribute = (name, value) => {
      if (name === 'title') titleWrites += 1
      originalSetAttribute(name, value)
    }
    mounted.removeAttribute = name => {
      if (name === 'title') titleWrites += 1
      originalRemoveAttribute(name)
    }

    expect(host.innerHTML).toContain('class="idle"')
    expect(text.textContent).toBe('first')
    expect(input.value).toBe('one')
    expect(input.checked).toBe(false)
    expect(input.disabled).toBe(false)

    step.set(1)
    await flushCompiledEffects()

    expect({
      class: classWrites(),
      style: styleWrites(),
      title: titleWrites,
      text: textWrites(),
      value: valueWrites(),
      checked: checkedWrites(),
      disabled: disabledWrites(),
    }).toEqual({ class: 0, style: 0, title: 0, text: 0, value: 0, checked: 0, disabled: 0 })

    step.set(2)
    await flushCompiledEffects()

    expect({
      class: classWrites(),
      style: styleWrites(),
      title: titleWrites,
      text: textWrites(),
      value: valueWrites(),
      checked: checkedWrites(),
      disabled: disabledWrites(),
    }).toEqual({ class: 1, style: 1, title: 1, text: 1, value: 1, checked: 1, disabled: 1 })
    expect(mounted.className).toBe('ready')
    expect(mounted.getAttribute('style')).toContain('color: blue')
    expect(mounted.hasAttribute('title')).toBe(false)
    expect(text.textContent).toBe('second')
    expect(input.value).toBe('two')
    expect(input.checked).toBe(true)
    expect(input.disabled).toBe(true)

    handle.dispose()
    expect(host.innerHTML).toBe('')

    step.set(3)
    await flushCompiledEffects()

    expect({
      class: classWrites(),
      style: styleWrites(),
      title: titleWrites,
      text: textWrites(),
      value: valueWrites(),
      checked: checkedWrites(),
      disabled: disabledWrites(),
    }).toEqual({ class: 1, style: 1, title: 1, text: 1, value: 1, checked: 1, disabled: 1 })
  })
})

const mountSource = (source: string) => {
  const output = compileDirectTextSource(source)
  const exports = evaluateDirectTextSource(output)
  const host = document.createElement('main')
  document.body.append(host)
  const handle = exports.View()
  const root = handle.__rue_compiled_mount(host)
  if (root && root.parentNode !== host) host.appendChild(root)
  return { output, host, handle, state: exports.state }
}

describe('compiler-owned native DOM fields', () => {
  it('updates HTML/SVG, boolean properties, CSS fields and text without legacy setters', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const { output, host, handle, state } = mountSource(`
      import { signal } from '@rue-js/rue'
      export const state = signal(0)
      export const View = () => <section>
        <input value={String(state.get())} checked={Boolean(state.get())} required={Boolean(state.get())} />
        <p style={String(state.get() ? 'color:blue' : 'color:red')}>{String(state.get())}</p>
        <svg><circle className={state.get() ? 'active' : 'idle'} style={{opacity: state.get() ? 1 : 0.5}} /></svg>
      </section>
    `)
    const input = host.querySelector('input')!
    const circle = host.querySelector('circle')!
    expect([input.value, input.checked, input.required]).toEqual(['0', false, false])
    expect(circle.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(circle.getAttribute('class')).toBe('idle')
    expect(host.querySelector('p')!.style.color).toBe('red')
    state.set(1)
    expect([input.value, input.checked, input.required]).toEqual(['1', true, true])
    expect(circle.getAttribute('class')).toBe('active')
    expect(circle.style.opacity).toBe('1')
    expect(host.querySelector('p')!.textContent).toBe('1')
    expect(host.querySelector('p')!.style.color).toBe('blue')
    for (const token of [
      '_$setStyle',
      '_$setValue',
      '_$setAttribute',
      'patchStyle',
      'patchChildren',
    ])
      expect(output).not.toContain(token)
    handle.dispose()
    state.set(2)
    expect(input.value).toBe('1')
    expect(host.innerHTML).toBe('')
  })

  it('deletes spread properties, CSS keys and event handlers on the same DOM node', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const { output, host, handle, state } = mountSource(`
      import { signal } from '@rue-js/rue'
      export const state = signal({ value: 'one', checked: true, required: true,
        title: 'hello', style: {color: 'red', backgroundColor: 'blue'},
        onClick: event => event.currentTarget.dataset.clicked = 'yes' })
      export const View = () => <input {...state.get()} />
    `)
    const input = host.querySelector('input')!
    expect([input.value, input.checked, input.required]).toEqual(['one', true, true])
    input.click()
    expect(input.dataset.clicked).toBe('yes')
    state.set({ style: { color: 'green' } })
    expect(host.querySelector('input')).toBe(input)
    expect([input.value, input.checked, input.required]).toEqual(['', false, false])
    expect(input.hasAttribute('title')).toBe(false)
    expect(input.style.backgroundColor).toBe('')
    expect(input.style.color).toBe('green')
    delete input.dataset.clicked
    input.click()
    expect(input.dataset.clicked).toBeUndefined()
    expect(output).toContain('_$compiledSpreadAttributes')
    expect(output).not.toContain('_$spreadAttributes')
    handle.dispose()
    state.set({ value: 'disposed', style: { color: 'red' } })
    expect(input.value).toBe('')
    expect(input.style.color).toBe('green')
  })

  it('applies select models after options exist and replaces opaque style values', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const { output, host, handle, state } = mountSource(`
      import { signal } from '@rue-js/rue'
      export const state = signal({ selection: ['b'], style: {color: 'red', '--tone': 'warm'} })
      export const View = () => <section>
        <select multiple value={state.get().selection}><option value="a">A</option><option value="b">B</option></select>
        <p style={state.get().style}>style</p>
      </section>
    `)
    const select = host.querySelector('select')!
    const style = host.querySelector('p')!.style
    expect([...select.selectedOptions].map(option => option.value)).toEqual(['b'])
    expect(style.getPropertyValue('--tone')).toBe('warm')
    state.set({ selection: ['a'], style: { backgroundColor: 'blue' } })
    expect([...select.selectedOptions].map(option => option.value)).toEqual(['a'])
    expect(style.color).toBe('')
    expect(style.backgroundColor).toBe('blue')
    expect(style.getPropertyValue('--tone')).toBe('')
    expect(output).not.toContain('_$setValue')
    expect(output).not.toContain('_$setStyle')
    handle.dispose()
  })

  it('expands statically enumerable spreads into direct field instructions', () => {
    const { output, host, handle } = mountSource(`
      export const View = () => <input {...{value: 'fixed', required: true, className: 'field', style: {'--tone': 'warm', color: 'red'}}} />
    `)
    const input = host.querySelector('input')!
    expect([input.value, input.required, input.className]).toEqual(['fixed', true, 'field'])
    expect(input.style.getPropertyValue('--tone')).toBe('warm')
    expect(input.style.color).toBe('red')
    expect(output).not.toContain('compiledSpreadAttributes')
    handle.dispose()
  })

  it('compiles once/capture event options and disposes native listeners', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const { host, handle } = mountSource(`
      import {ref} from '@rue-js/rue'
      const count = ref(0)
      export const View = () => <section>
        <button v-on:click-once-capture={() => { count.value++ }}>increment</button>
        <span>{count.value}</span>
      </section>
    `)
    const button = host.querySelector('button')!
    const span = host.querySelector('span')!
    button.click()
    button.click()
    expect(span.textContent).toBe('1')
    handle.dispose()
    button.click()
    expect(span.textContent).toBe('1')
  })

  it('clears conditional classes and preserves false ARIA values', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const { host, handle, state } = mountSource(`
      import {signal} from '@rue-js/rue'
      export const state = signal(true)
      export const View = () => <div className={state.get() && 'active'} aria-hidden={state.get()} />
    `)
    const div = host.querySelector('div')!
    expect(div.className).toBe('active')
    state.set(false)
    expect(div.className).toBe('')
    expect(div.getAttribute('aria-hidden')).toBe('false')
    handle.dispose()
  })

  it('lowers v-model and event modifiers to an explicit property/event pair', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const { output, host, handle } = mountSource(`
      import { ref } from '@rue-js/rue'
      const text = ref('start')
      export const View = () => <section>
        <input v-model={text.value} />
        <span>{text.value}</span>
        <button v-on:click-stop-prevent={() => { text.value = 'clicked' }}>set</button>
      </section>
    `)
    const input = host.querySelector('input')!
    const span = host.querySelector('span')!
    expect(input.value).toBe('start')
    input.value = 'typed'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(span.textContent).toBe('typed')
    const bubbled = vi.fn()
    host.addEventListener('click', bubbled)
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    host.querySelector('button')!.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(bubbled).not.toHaveBeenCalled()
    expect(input.value).toBe('clicked')
    expect(output).not.toContain('_$setValue')
    expect(output).not.toContain('applyDirective')
    handle.dispose()
  })
})
