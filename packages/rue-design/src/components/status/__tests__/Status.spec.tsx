import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'

import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'
import Status from '../index'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const renderAndWait = async (mount: (container: HTMLElement) => { dispose(): void }) => {
  const container = mountContainer()
  resetActiveRuntime()
  mountTestApp(container, () => mount(container))
  await waitForContent(() => {
    expect(container.childNodes.length).toBeGreaterThan(0)
  })
  return container
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Status', () => {
  it('renders default as span with base class', async () => {
    const c = await renderAndWait((target: HTMLElement) => render(<Status />, target))
    const el = c.querySelector('.status') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.tagName).toBe('SPAN')
    expect(el.classList.contains('status')).toBe(true)
  })

  it('supports as=div, size and color variants', async () => {
    const c = await renderAndWait((target: HTMLElement) =>
      render(<Status as={'div'} ariaLabel={'status'} size={'lg'} color={'primary'} />, target),
    )
    const el = c.querySelector('.status') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.tagName).toBe('DIV')
    expect(el.getAttribute('aria-label')).toBe('status')
    expect(el.classList.contains('status-lg')).toBe(true)
    expect(el.classList.contains('status-primary')).toBe(true)
  })

  it('appends custom className', async () => {
    const c = await renderAndWait((target: HTMLElement) =>
      render(<Status className={'animate-bounce'} />, target),
    )
    const el = c.querySelector('.status') as HTMLElement
    expect(el.classList.contains('animate-bounce')).toBe(true)
  })

  it('renders standalone count text in right-top indicator mode', async () => {
    const c = await renderAndWait((target: HTMLElement) =>
      render(<Status count={7} text={'待审核'} color={'#f97316'} />, target),
    )

    const wrapper = c.querySelector('.indicator') as HTMLElement
    const indicator = c.querySelector('.indicator-item') as HTMLElement
    const content = wrapper.querySelector('.pe-6') as HTMLElement
    const leadingDot = Array.from(content.querySelectorAll('.status')).find(
      node => !node.classList.contains('indicator-item'),
    ) as HTMLElement | undefined

    expect(wrapper).toBeTruthy()
    expect(indicator).toBeTruthy()
    expect(indicator.textContent).toBe('7')
    expect(content).toBeTruthy()
    expect(content.textContent).toBe('待审核')
    expect(leadingDot).toBeTruthy()
    expect(leadingDot?.style.backgroundColor).toBe('rgb(249, 115, 22)')
  })

  it('renders standalone dot text in right-top indicator mode', async () => {
    const c = await renderAndWait((target: HTMLElement) =>
      render(<Status dot={true} text={'处理中'} color={'warning'} />, target),
    )

    const wrapper = c.querySelector('.indicator') as HTMLElement
    const dot = c.querySelector('.indicator-item.status') as HTMLElement
    const content = Array.from(wrapper.querySelectorAll('span')).find(node =>
      (node as HTMLElement).classList.contains('pe-3.5'),
    ) as HTMLElement

    expect(wrapper).toBeTruthy()
    expect(dot).toBeTruthy()
    expect(dot.classList.contains('status-warning')).toBe(true)
    expect(content).toBeTruthy()
    expect(content.textContent).toBe('处理中')
  })
})
