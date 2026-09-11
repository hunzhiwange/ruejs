import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import MockupCode from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('MockupCode', () => {
  it('renders the root with base class and custom className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupCode className="w-full bg-base-200" data-testid="mockup-code-root">
          <pre data-prefix="$">
            <code>npm i daisyui</code>
          </pre>
        </MockupCode>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="mockup-code-root"]') as HTMLElement
      const line = root.querySelector('pre[data-prefix="$"]') as HTMLElement
      expect(root.classList.contains('mockup-code')).toBe(true)
      expect(root.classList.contains('w-full')).toBe(true)
      expect(root.classList.contains('bg-base-200')).toBe(true)
      expect(line.textContent).toContain('npm i daisyui')
    })
  })

  it('renders items with default prefix, line numbers and tone classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupCode
          data-testid="mockup-code-items"
          prefix="$"
          lineNumbers
          start={7}
          items={[
            { code: 'pnpm add @rue-js/design' },
            { prefix: '>', code: 'Resolving packages...', tone: 'warning' },
            { code: 'Done!', highlight: true, tone: 'success' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="mockup-code-items"]') as HTMLElement
      const lines = root.querySelectorAll('pre')
      expect(lines).toHaveLength(3)
      expect(lines[0].getAttribute('data-prefix')).toBe('$')
      expect(lines[0].textContent).toContain('pnpm add @rue-js/design')
      expect(lines[1].getAttribute('data-prefix')).toBe('>')
      expect(lines[1].classList.contains('text-warning')).toBe(true)
      expect(lines[2].getAttribute('data-prefix')).toBe('$')
      expect(lines[2].classList.contains('bg-success')).toBe(true)
      expect(lines[2].classList.contains('text-success-content')).toBe(true)
    })
  })

  it('supports MockupCode.Line shorthand content and explicit line numbers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupCode data-testid="mockup-code-line">
          <MockupCode.Line lineNumber={21} code="const answer = 42" />
          <MockupCode.Line prefix=">" className="text-info">
            <code>console.log(answer)</code>
          </MockupCode.Line>
        </MockupCode>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="mockup-code-line"]') as HTMLElement
      const lines = root.querySelectorAll('pre')
      expect(lines).toHaveLength(2)
      expect(lines[0].getAttribute('data-prefix')).toBe('21')
      expect(lines[0].querySelector('code')?.textContent).toBe('const answer = 42')
      expect(lines[1].getAttribute('data-prefix')).toBe('>')
      expect(lines[1].classList.contains('text-info')).toBe(true)
      expect(lines[1].textContent).toContain('console.log(answer)')
    })
  })

  it('forwards nested content and attrs unchanged', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupCode aria-label="terminal" id="terminal-block">
          <pre data-prefix=">" className="text-success">
            <code>Done!</code>
          </pre>
          <pre>
            <code>without prefix</code>
          </pre>
        </MockupCode>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('#terminal-block') as HTMLElement
      const highlightedLine = root.querySelector('pre.text-success') as HTMLElement
      const plainLine = root.querySelectorAll('pre')[1] as HTMLElement
      expect(root.getAttribute('aria-label')).toBe('terminal')
      expect(highlightedLine.getAttribute('data-prefix')).toBe('>')
      expect(plainLine.getAttribute('data-prefix')).toBeNull()
      expect(plainLine.textContent).toContain('without prefix')
    })
  })
})
