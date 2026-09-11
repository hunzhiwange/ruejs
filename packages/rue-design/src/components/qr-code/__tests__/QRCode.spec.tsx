import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Template, render, setReactiveScheduling } from '@rue-js/rue'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'
import QRCode from '../index'
import { encodeQrMatrix } from '../encoder'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const triggerClick = (element: Element | null) => {
  ;(element as HTMLElement | null)?.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true }),
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('encodeQrMatrix', () => {
  it('encodes short text into a version 1 matrix and can boost the error level', () => {
    const result = encodeQrMatrix('Rue', { errorLevel: 'L', boostLevel: true })
    const darkCount = result.matrix.reduce(
      (count, row) => count + row.filter(cell => cell).length,
      0,
    )

    expect(result.size).toBe(21)
    expect(result.level).toBe('H')
    expect(result.matrix).toHaveLength(21)
    expect(result.matrix[0]).toHaveLength(21)
    expect(darkCount).toBeGreaterThan(100)
  })
})

describe('QRCode', () => {
  it('renders svg output and exposes the expired refresh action', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleRefresh = vi.fn()
    const icon =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 rx=%224%22 fill=%22%230f172a%22/%3E%3C/svg%3E'

    mountTestApp(container, () =>
      render(
        <QRCode
          type="svg"
          value="https://rue.dev"
          icon={icon}
          status="expired"
          onRefresh={handleRefresh}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-qrcode="true"]') as HTMLElement
      const svg = root.querySelector('[data-rue-qrcode-svg="true"]') as SVGElement
      const image = svg.querySelector('image') as SVGImageElement
      const cover = root.querySelector('[data-rue-qrcode-cover="true"]') as HTMLElement

      expect(root.classList.contains('rue-qrcode')).toBe(true)
      expect(svg).toBeTruthy()
      expect(svg.getAttribute('viewBox')).toContain('0 0')
      expect(image).toBeTruthy()
      expect(image.namespaceURI).toBe('http://www.w3.org/2000/svg')
      expect(image.getAttribute('href') || image.getAttribute('xlink:href')).toBe(icon)
      expect(image.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet')
      expect(cover.textContent).toContain('二维码已过期')
    })

    triggerClick(container.querySelector('[data-rue-qrcode-refresh="true"]'))
    expect(handleRefresh).toHaveBeenCalledTimes(1)
  })

  it('renders a canvas node and respects custom statusRender content', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const fillRect = vi.fn()
    const clearRect = vi.fn()
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ clearRect, fillRect } as unknown as CanvasRenderingContext2D)

    mountTestApp(container, () =>
      render(
        <QRCode type="canvas" value="https://rue.dev/design" status="loading">
          <Template slot="status">
            <div data-testid="custom-status">custom:loading</div>
          </Template>
        </QRCode>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-qrcode="true"]') as HTMLElement
      const canvas = root.querySelector('[data-rue-qrcode-canvas="true"]') as HTMLCanvasElement
      const customStatus = root.querySelector('[data-testid="custom-status"]') as HTMLElement

      expect(canvas).toBeTruthy()
      expect(customStatus.textContent).toBe('custom:loading')
      expect(getContextSpy).toHaveBeenCalledWith('2d')
      expect(fillRect).toHaveBeenCalled()
    })
  })

  it('keeps the canvas backing store size managed by drawCanvas', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const previousDevicePixelRatio = globalThis.devicePixelRatio

    Object.defineProperty(globalThis, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    })

    try {
      mountTestApp(container, () =>
        render(<QRCode type="canvas" value="https://rue.dev/design" size={160} />, container),
      )

      await waitForContent(() => {
        const canvas = container.querySelector(
          '[data-rue-qrcode-canvas="true"]',
        ) as HTMLCanvasElement

        expect(canvas).toBeTruthy()
        expect(canvas.width).toBe(280)
        expect(canvas.height).toBe(280)
        expect(canvas.style.width).toBe('140px')
        expect(canvas.style.height).toBe('140px')
      })
    } finally {
      Object.defineProperty(globalThis, 'devicePixelRatio', {
        configurable: true,
        value: previousDevicePixelRatio,
      })
    }
  })
})
