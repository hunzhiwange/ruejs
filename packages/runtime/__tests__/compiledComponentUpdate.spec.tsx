// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, describe, expect, it } from 'vitest'

import * as runtimeRoot from '../src'
import * as compilerRuntime from '../src/internal'
import * as vaporRuntime from './legacy-test-render'
import { _$compiledRoot as createTestCompiledRoot } from './legacy-test-render'

vaporRuntime.setReactiveScheduling('sync')

type CompiledModule = {
  View: () => unknown
  BranchView: () => unknown
  setLabel(value: string): void
  resolveResource(): void
  trace: {
    childCalls: number
    childRenders: number
    childSetups: number
    beforeUpdated: number
    mounted: number
    updated: number
    unmounted: number
  }
}

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const source = `
import {
  _$compiledSignal as makeSignal,
} from '@rue-js/rue/internal'

const childProps = makeSignal({ label: 'one', extra: 'present' })
const resourceLoading = makeSignal(true)
const resource = {
  loading: resourceLoading,
  error: { get: () => null },
  data: { get: () => ['resolved commit'] },
}

export const trace = {
  childCalls: 0,
  childRenders: 0,
  childSetups: 0,
  beforeUpdated: 0,
  mounted: 0,
  updated: 0,
  unmounted: 0,
}

const Child = props => {
  trace.childCalls += 1
  trace.childRenders += 1
  return <section data-testid="child">
    <input data-testid="input" value={props.label} />
    <span data-testid="label">{props.label}</span>
    <span data-testid="extra">{props.extra ?? 'missing'}</span>
  </section>
}

const ResourceContent = props => <p data-testid="resource">{props.resource.data.get()[0]}</p>

export const setLabel = value => childProps.set({ label: value })
const renderResourceCard = resource => <main>
  <span data-testid="loading">{String(resource.loading.get())}</span>
  {!resource.loading.get() && <ResourceContent resource={resource} />}
</main>

export const resolveResource = () => resourceLoading.set(false)
export const View = () => <main><Child {...childProps.get()} /></main>
export const BranchView = () => renderResourceCard(resource)
`

const compile = (): string => {
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  const code = swc.transformSync(source, {
    filename: 'compiled-component-update.tsx',
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
  expect(code).toContain('@rue-js/rue/internal')
  return code
}

const evaluate = (): CompiledModule => {
  const module = { exports: {} as Record<string, unknown> }
  const runtimeRequire = (id: string): Record<string, unknown> => {
    if (id === '@rue-js/rue/internal') return compilerRuntime
    if (id === '@rue-js/rue/internal/component') return compilerRuntime
    if (id === '@rue-js/rue') return runtimeRoot
    throw new Error(`Unexpected generated import: ${id}`)
  }
  new Function('require', 'module', 'exports', compile())(runtimeRequire, module, module.exports)
  return module.exports as CompiledModule
}

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  vaporRuntime.setReactiveScheduling('sync')
  compilerRuntime.setReactiveScheduling('frame')
  document.body.innerHTML = ''
})

describe('compiled component updates', () => {
  it('preserves resource props when a resolved component branch is created', async () => {
    compilerRuntime.setReactiveScheduling('microtask')
    const compiled = evaluate()
    const host = document.createElement('div')
    const uncaughtErrors: unknown[] = []
    const onError = (event: ErrorEvent) => uncaughtErrors.push(event.error ?? event.message)
    window.addEventListener('error', onError)

    runtimeRoot.render(compiled.BranchView() as any, host)
    expect(host.querySelector('[data-testid="loading"]')?.textContent).toBe('true')
    expect(host.querySelector('[data-testid="resource"]')).toBeNull()

    compiled.resolveResource()
    await flush()

    expect(host.querySelector('[data-testid="resource"]')?.textContent).toBe('resolved commit')
    expect(uncaughtErrors).toEqual([])
    window.removeEventListener('error', onError)
  })

  it('mounts dynamic native/component inputs and disposes a narrow fragment boundary', async () => {
    const host = document.createElement('div')
    const trace: string[] = []
    const Leaf = (props: { label: string }) => {
      runtimeRoot.onMounted(() => trace.push(`mounted:${props.label}`))
      runtimeRoot.onUnmounted(() => trace.push(`unmounted:${props.label}`))
      return createTestCompiledRoot(() => {
        const element = document.createElement('strong')
        element.textContent = props.label
        return element as any
      })
    }

    runtimeRoot.render(vaporRuntime._$createDynamic('section', { children: 'native' }) as any, host)
    await flush()
    expect(host.firstElementChild).toMatchObject({ tagName: 'SECTION', textContent: 'native' })

    runtimeRoot.render(
      vaporRuntime._$createFragment([
        vaporRuntime._$createDynamic(Leaf, { key: 'leaf', label: 'component' }),
        vaporRuntime._$createDynamic('span', { children: 'tail' }),
      ]) as any,
      host,
    )
    await flush()
    expect(host.textContent).toBe('componenttail')
    expect(trace).toEqual(['mounted:component'])

    runtimeRoot.render(null, host)
    await flush()
    expect(host.textContent).toBe('')
    expect(trace).toEqual(['mounted:component', 'unmounted:component'])
  })

  it.each(['sync', 'microtask'] as const)(
    'updates reactive props without rerunning the component or replacing its DOM (%s)',
    async scheduling => {
      vaporRuntime.setReactiveScheduling(scheduling)
      compilerRuntime.setReactiveScheduling(scheduling)
      const compiled = evaluate()
      const host = document.createElement('div')
      document.body.appendChild(host)
      const app = runtimeRoot.useApp(compiled.View as any)

      app.mount(host)
      await flush()

      const child = host.querySelector('[data-testid="child"]')
      const input = host.querySelector('[data-testid="input"]') as HTMLInputElement
      input.focus()
      input.setSelectionRange(1, 2)

      compiled.setLabel('two')
      await flush()

      expect(host.querySelector('[data-testid="label"]')?.textContent).toBe('two')
      expect(host.querySelector('[data-testid="extra"]')?.textContent).toBe('missing')
      expect(compiled.trace.childCalls, 'childCalls').toBe(1)
      expect(compiled.trace.childRenders, 'childRenders').toBe(1)
      expect(compiled.trace.childSetups, 'childSetups').toBe(0)
      expect(compiled.trace.mounted, 'mounted').toBe(0)
      expect(compiled.trace.beforeUpdated, 'beforeUpdated').toBe(0)
      expect(compiled.trace.updated, 'updated').toBe(0)
      expect(compiled.trace.unmounted, 'unmounted before app disposal').toBe(0)
      expect(host.querySelector('[data-testid="input"]')).toBe(input)
      expect(host.querySelector('[data-testid="child"]')).toBe(child)
      expect(document.activeElement).toBe(input)
      app.unmount()
      await flush()
      expect(compiled.trace.unmounted).toBe(0)
    },
  )

  it('keeps explicitly marked narrow components on the rerender path', async () => {
    const host = document.createElement('div')
    let renders = 0
    const Legacy = (props: { label: string }) => {
      renders += 1
      return createTestCompiledRoot(() => {
        const element = document.createElement('strong')
        element.textContent = props.label
        return element as any
      })
    }

    const ReactiveLegacy = vaporRuntime._$compiledMarkComponentRenderReactive(Legacy as any)
    runtimeRoot.render(vaporRuntime._$createDynamic(ReactiveLegacy, { label: 'one' }) as any, host)
    await flush()
    runtimeRoot.render(vaporRuntime._$createDynamic(ReactiveLegacy, { label: 'two' }) as any, host)
    await flush()

    expect(host.textContent).toBe('two')
    expect(renders).toBe(2)
  })

  it('keeps only the current unmount callback when a marked component rerenders', async () => {
    compilerRuntime.setReactiveScheduling('sync')
    const host = document.createElement('div')
    const label = runtimeRoot.signal('one')
    const lifecycle: string[] = []
    const View = vaporRuntime._$compiledMarkComponentRenderReactive((() => {
      const currentLabel = label.get()
      runtimeRoot.onUnmounted(() => lifecycle.push(`unmounted:${currentLabel}`))
      return createTestCompiledRoot(() => {
        const element = document.createElement('strong')
        element.textContent = currentLabel
        return element as any
      })
    }) as any)

    const app = runtimeRoot.useApp(View as any)
    app.mount(host)
    label.set('two')
    await flush()
    app.unmount()

    expect(lifecycle).toEqual(['unmounted:two'])
  })

  it('updates a fine-grained component without rerunning its factory', async () => {
    compilerRuntime.setReactiveScheduling('sync')
    const host = document.createElement('div')
    const active = runtimeRoot.signal(false)
    let renders = 0
    const View = () => {
      renders += 1
      return createTestCompiledRoot(parent => {
        const node = document.createElement('p')
        parent?.appendChild(node)
        compilerRuntime.effect(() => {
          node.textContent = active.get() ? 'active' : 'idle'
        })
        return node
      })
    }

    runtimeRoot.render(vaporRuntime._$createComponent(View, {}) as any, host)
    await flush()
    active.set(true)
    await flush()

    expect(host.textContent).toBe('active')
    expect(renders).toBe(1)
  })

  it('tracks a setup-local ref from a compiled DOM effect', async () => {
    compilerRuntime.setReactiveScheduling('sync')
    ;(globalThis as any).__rue_active =
      (globalThis as any).__rue_vapor_preferred ?? (globalThis as any).__rue
    const host = document.createElement('div')
    let parentRenders = 0
    const Parent = () => {
      parentRenders += 1
      const count = vaporRuntime.useSetup(() => vaporRuntime.ref(0))
      return createTestCompiledRoot(parent => {
        const button = document.createElement('button')
        parent?.appendChild(button)
        compilerRuntime.effect(() => {
          button.textContent = String(count.value)
        })
        button.addEventListener('click', () => {
          count.value += 1
        })
        return button
      })
    }

    runtimeRoot.render(vaporRuntime._$createComponent(Parent, {}) as any, host)
    await flush()
    ;(host.querySelector('button') as HTMLButtonElement).click()
    await flush()

    expect({ text: host.textContent, parentRenders }).toEqual({ text: '1', parentRenders: 1 })
  })
})
