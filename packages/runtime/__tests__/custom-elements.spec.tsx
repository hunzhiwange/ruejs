import { afterEach, describe, expect, it, vi } from 'vitest'

import * as runtimeMain from '@rue-js/runtime'
import * as rueMain from '@rue-js/rue'
import type { FC } from '../src'

runtimeMain.setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

let customElementId = 0

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

const defineTag = (Ctor: CustomElementConstructor) => {
  customElementId += 1
  const tag = `rue-test-ce-${customElementId}`
  customElements.define(tag, Ctor)
  return tag
}

const Message: FC<{ label?: string }> = props => <p data-testid="msg">{props.label ?? 'hi'}</p>

const HookProbeChild: FC = () => {
  const host = runtimeMain.useHost()
  const shadowRoot = runtimeMain.useShadowRoot()

  return (
    <p data-testid="hook-probe">
      {`${host?.tagName.toLowerCase() ?? 'none'}|${shadowRoot ? 'shadow' : 'light'}`}
    </p>
  )
}

const HookProbe: FC = () => {
  return (
    <div>
      <HookProbeChild />
    </div>
  )
}

const SlotHost: FC = () => {
  return (
    <section data-testid="slot-host">
      <slot name="named"></slot>
      <slot></slot>
    </section>
  )
}

const EventEmitter: FC<Record<string, unknown>> = props => {
  const emit = runtimeMain.emitted(props as any)

  return (
    <button data-testid="emit-btn" onClick={() => emit('change', 42, 'ok')}>
      emit
    </button>
  )
}

describe('useCustomElement', () => {
  it('is exported from the runtime and rue public entries', () => {
    expect(runtimeMain).toHaveProperty('useCustomElement')
    expect(rueMain).toHaveProperty('useCustomElement')
  })

  it('mounts into shadow root by default and updates after attribute changes', async () => {
    const tag = defineTag(
      runtimeMain.useCustomElement(Message, {
        styles: [':host { display: block; }', 'p { color: red; }'],
      }),
    )

    const el = document.createElement(tag)
    el.setAttribute('label', 'hello')
    document.body.appendChild(el)
    await flush()

    expect(el.shadowRoot).not.toBeNull()
    expect(el.shadowRoot?.querySelector('[data-testid="msg"]')?.textContent).toBe('hello')
    expect(el.shadowRoot?.querySelectorAll('style[data-rue-ce-style]')).toHaveLength(2)

    el.setAttribute('label', 'world')
    await flush()

    expect(el.shadowRoot?.querySelector('[data-testid="msg"]')?.textContent).toBe('world')

    el.remove()
    await flush()

    expect(el.shadowRoot?.querySelector('[data-testid="msg"]')).toBeNull()
  })

  it('supports light DOM mounting and props bag updates', async () => {
    const tag = defineTag(rueMain.useCustomElement(Message, { shadowRoot: false }))

    const el = document.createElement(tag) as HTMLElement & {
      props: Record<string, unknown>
    }

    el.props = { label: 'from-props' }
    document.body.appendChild(el)
    await flush()

    expect(el.shadowRoot).toBeNull()
    expect(el.querySelector('[data-testid="msg"]')?.textContent).toBe('from-props')

    el.props = { label: 'next' }
    await flush()

    expect(el.querySelector('[data-testid="msg"]')?.textContent).toBe('next')
  })

  it('updates props without remounting the rendered subtree', async () => {
    const tag = defineTag(runtimeMain.useCustomElement(Message, { shadowRoot: false }))
    const el = document.createElement(tag)

    el.setAttribute('label', 'one')
    document.body.appendChild(el)
    await flush()

    const first = el.querySelector('[data-testid="msg"]')
    expect(first?.textContent).toBe('one')

    el.setAttribute('label', 'two')
    await flush()

    const second = el.querySelector('[data-testid="msg"]')
    expect(second).toBe(first)
    expect(second?.textContent).toBe('two')

    el.removeAttribute('label')
    await flush()

    const third = el.querySelector('[data-testid="msg"]')
    expect(third).toBe(first)
    expect(third?.textContent).toBe('hi')
  })

  it('exposes host and shadow root hooks inside the custom element subtree', async () => {
    const shadowTag = defineTag(runtimeMain.useCustomElement(HookProbe))
    const shadowEl = document.createElement(shadowTag)
    document.body.appendChild(shadowEl)
    await flush()

    expect(shadowEl.shadowRoot?.querySelector('[data-testid="hook-probe"]')?.textContent).toBe(
      `${shadowTag}|shadow`,
    )

    const lightTag = defineTag(runtimeMain.useCustomElement(HookProbe, { shadowRoot: false }))
    const lightEl = document.createElement(lightTag)
    document.body.appendChild(lightEl)
    await flush()

    expect(lightEl.querySelector('[data-testid="hook-probe"]')?.textContent).toBe(
      `${lightTag}|light`,
    )
  })

  it('keeps host and shadow root hooks scoped per custom element instance when multiple hosts mount together', async () => {
    const shadowTag = defineTag(runtimeMain.useCustomElement(HookProbe))
    const lightTag = defineTag(runtimeMain.useCustomElement(HookProbe, { shadowRoot: false }))
    const shadowEl = document.createElement(shadowTag)
    const lightEl = document.createElement(lightTag)

    document.body.append(shadowEl, lightEl)
    await flush()

    expect(shadowEl.shadowRoot?.querySelector('[data-testid="hook-probe"]')?.textContent).toBe(
      `${shadowTag}|shadow`,
    )
    expect(lightEl.querySelector('[data-testid="hook-probe"]')?.textContent).toBe(
      `${lightTag}|light`,
    )
  })

  it('projects native slots from host light DOM into the shadow root', async () => {
    const tag = defineTag(runtimeMain.useCustomElement(SlotHost))
    const el = document.createElement(tag)
    const named = document.createElement('span')
    const plain = document.createElement('span')

    named.setAttribute('slot', 'named')
    named.textContent = 'named-content'
    plain.textContent = 'plain-content'
    el.append(named, plain)
    document.body.appendChild(el)
    await flush()

    const namedSlot = el.shadowRoot?.querySelector('slot[name="named"]') as HTMLSlotElement | null
    const defaultSlot = el.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement | null

    expect(namedSlot).not.toBeNull()
    expect(defaultSlot).not.toBeNull()
    expect(namedSlot?.assignedNodes()).toContain(named)
    expect(defaultSlot?.assignedNodes()).toContain(plain)
  })

  it('bridges emitted events to host CustomEvent listeners', async () => {
    const tag = defineTag(runtimeMain.useCustomElement(EventEmitter))
    const el = document.createElement(tag)
    const handler = vi.fn()

    el.addEventListener('change', handler)
    document.body.appendChild(el)
    await flush()

    el.shadowRoot
      ?.querySelector('[data-testid="emit-btn"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(handler).toHaveBeenCalledTimes(1)
    const event = handler.mock.calls[0][0] as CustomEvent
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail).toEqual([42, 'ok'])
    expect(event.bubbles).toBe(true)
    expect(event.composed).toBe(true)
  })

  it('mounts custom elements inside a parent Rue render without rebinding the wasm DOM adapter', async () => {
    const tag = defineTag(runtimeMain.useCustomElement(Message, { shadowRoot: false }))
    const container = document.createElement('div')
    document.body.appendChild(container)

    const Parent: FC = () => runtimeMain.h(tag as any, { label: 'nested-host' }) as any

    expect(() => {
      runtimeMain.render(runtimeMain.h(Parent, null) as any, container as any)
    }).not.toThrow()

    await flush()

    expect(container.querySelector(tag)?.querySelector('[data-testid="msg"]')?.textContent).toBe(
      'nested-host',
    )
  })

  it('mounts custom elements inside a parent Rue app mount without triggering a nested wasm mount crash', async () => {
    const tag = defineTag(runtimeMain.useCustomElement(Message, { shadowRoot: false }))
    const container = document.createElement('div')
    document.body.appendChild(container)

    const Parent: FC = () => (
      <section>
        <p>outer-app</p>
        {runtimeMain.h(tag as any, { label: 'mounted-host' }) as any}
      </section>
    )

    expect(() => {
      runtimeMain.useApp(Parent).mount(container as any)
    }).not.toThrow()

    await flush()

    expect(container.querySelector(tag)?.querySelector('[data-testid="msg"]')?.textContent).toBe(
      'mounted-host',
    )
  })
})
