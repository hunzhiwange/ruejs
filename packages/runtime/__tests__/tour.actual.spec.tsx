import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '@rue-js/rue'
import Tour from '../../rue-design/src/components/tour'
import { render, flush, mountContainer, waitForContent } from './page-test-utils'

setReactiveScheduling('sync')

let activeContainer: HTMLElement | null = null

const rect = (left: number, top: number, width: number, height: number) => ({
  x: left,
  y: top,
  top,
  left,
  width,
  height,
  right: left + width,
  bottom: top + height,
  toJSON: () => ({}),
})

const mockRect = (element: Element | null, nextRect: ReturnType<typeof rect>) => {
  expect(element).toBeTruthy()
  Object.defineProperty(element!, 'getBoundingClientRect', {
    configurable: true,
    value: () => nextRect as DOMRect,
  })
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    return window.setTimeout(() => callback(0), 0)
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    window.clearTimeout(id)
  })
})

afterEach(() => {
  if (activeContainer) {
    render(null, activeContainer)
    activeContainer = null
  }

  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('Tour actual', () => {
  it('opens, advances steps, and finishes around direct targets', async () => {
    const container = mountContainer()
    activeContainer = container
    const firstTarget = document.createElement('div')
    firstTarget.textContent = '导航模块'
    document.body.appendChild(firstTarget)

    const secondTarget = document.createElement('button')
    secondTarget.textContent = '提交按钮'
    document.body.appendChild(secondTarget)

    mockRect(firstTarget, rect(120, 80, 120, 40))
    mockRect(secondTarget, rect(360, 240, 100, 32))

    const changeSpy = vi.fn()
    const finishSpy = vi.fn()
    const openStateSpy = vi.fn()

    const renderScene = (open: boolean, current: number) => {
      render(
        <Tour
          open={open}
          current={current}
          gap={{ offset: 10, radius: 16 }}
          onOpenChange={nextOpen => {
            openStateSpy(nextOpen)
          }}
          onChange={nextCurrent => {
            changeSpy(nextCurrent)
          }}
          onFinish={() => {
            finishSpy()
          }}
          steps={[
            {
              target: () => firstTarget,
              title: '先看导航结构',
              description: '第一步应该围绕左侧导航高亮。',
              placement: 'rightTop',
            },
            {
              target: () => secondTarget,
              title: '最后确认动作',
              description: '第二步应该移动到 CTA，并在完成后关闭。',
              placement: 'leftBottom',
              nextButtonProps: { children: '完成引导' },
            },
          ]}
        />,
        container,
      )
    }

    await waitForContent(() => {
      expect(firstTarget.textContent).toContain('导航模块')
      expect(secondTarget.textContent).toContain('提交按钮')
    })

    renderScene(false, 0)

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tour="true"]')).toBeNull()
    })

    renderScene(true, 0)
    window.dispatchEvent(new Event('resize'))

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-tour="true"]') as HTMLElement

      expect(root).toBeTruthy()
      expect(root.getAttribute('data-rue-tour-current')).toBe('0')
      expect(root.textContent).toContain('先看导航结构')
      expect(changeSpy).not.toHaveBeenCalled()
    })

    const nextButton = container.querySelector(
      '[data-rue-tour-next="next"]',
    ) as HTMLButtonElement | null
    expect(nextButton).not.toBeNull()
    nextButton!.click()
    await flush()

    await waitForContent(() => {
      expect(changeSpy).toHaveBeenCalledWith(1)
    })

    renderScene(true, 1)

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-tour="true"]') as HTMLElement

      expect(root.getAttribute('data-rue-tour-current')).toBe('1')
      expect(root.textContent).toContain('最后确认动作')
      expect(root.querySelector('[data-rue-tour-next="finish"]')?.textContent).toContain('完成引导')
    })

    const finishButton = container.querySelector(
      '[data-rue-tour-next="finish"]',
    ) as HTMLButtonElement | null
    expect(finishButton).not.toBeNull()
    finishButton!.click()
    await flush()

    await waitForContent(() => {
      expect(finishSpy).toHaveBeenCalledTimes(1)
      expect(openStateSpy).toHaveBeenCalledWith(false)
    })

    renderScene(false, 1)

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tour="true"]')).toBeNull()
    })
  })
})
