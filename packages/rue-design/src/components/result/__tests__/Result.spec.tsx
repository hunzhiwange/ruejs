import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { Template, render, setReactiveScheduling } from '@rue-js/rue'
import Result from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Result', () => {
  it('renders semantic status icon with title and subtitle', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Result
          status="success"
          title="发布完成"
          subTitle="最新产物已经同步到边缘节点。"
          data-testid="result-success"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="result-success"]') as HTMLElement
      expect(element).toBeTruthy()
      expect(element.dataset.rueStatus).toBe('success')
      expect(element.dataset.rueTone).toBe('success')
      expect(element.textContent).toContain('发布完成')
      expect(element.textContent).toContain('最新产物已经同步到边缘节点。')
      expect(element.querySelector('[data-rue-result-glyph="success"]')).toBeTruthy()
    })
  })

  it('falls back to built-in exception copy and illustration', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Result status={404} data-testid="result-404" />, container),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="result-404"]') as HTMLElement
      expect(element.dataset.rueStatus).toBe('404')
      expect(element.dataset.rueTone).toBe('info')
      expect(element.textContent).toContain('页面没有找到')
      expect(element.textContent).toContain('目标页面可能已移动、删除')
      expect(element.querySelector('[data-rue-result-illustration="404"]')).toBeTruthy()
    })
  })

  it('supports custom icon and action area', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Result status="info" title="处理完毕" data-testid="result-custom">
          <Template slot="icon">
            <span id="custom-icon">自定义图标</span>
          </Template>
          <Template slot="extra">
            <button id="open-panel">查看面板</button>
          </Template>
        </Result>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="result-custom"]') as HTMLElement
      expect(element.querySelector('#custom-icon')?.textContent).toBe('自定义图标')
      expect(element.querySelector('#open-panel')?.textContent).toBe('查看面板')
      expect(element.querySelector('[data-rue-result-glyph="info"]')).toBeNull()
      expect(element.querySelector('[data-rue-result-extra="true"]')).toBeTruthy()
    })
  })

  it('supports outline variant start alignment and body content', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Result
          status="warning"
          align="start"
          variant="outline"
          title="待人工确认"
          children={<div id="detail">审批流已经挂起，请在 30 分钟内处理。</div>}
          data-testid="result-body"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="result-body"]') as HTMLElement
      expect(element.classList.contains('text-left')).toBe(true)
      expect(element.querySelector('[data-rue-result-body="true"]')).toBeTruthy()
      expect(element.querySelector('#detail')?.textContent).toContain('审批流已经挂起')
    })
  })

  it('does not render the body wrapper for empty children payloads', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Result data-testid="result-empty-boolean">{false}</Result>
          <Result data-testid="result-empty-array"></Result>
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const booleanResult = container.querySelector(
        '[data-testid="result-empty-boolean"]',
      ) as HTMLElement
      const arrayResult = container.querySelector(
        '[data-testid="result-empty-array"]',
      ) as HTMLElement
      expect(booleanResult.querySelector('[data-rue-result-body="true"]')).toBeNull()
      expect(arrayResult.querySelector('[data-rue-result-body="true"]')).toBeNull()
    })
  })

  it('exposes reusable presented images', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div data-testid="images">
          <Result.PRESENTED_IMAGE_403 size="sm" />
          <Result.PRESENTED_IMAGE_500 size="sm" />
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-result-illustration="403"]')).toBeTruthy()
      expect(container.querySelector('[data-rue-result-illustration="500"]')).toBeTruthy()
    })
  })
})
