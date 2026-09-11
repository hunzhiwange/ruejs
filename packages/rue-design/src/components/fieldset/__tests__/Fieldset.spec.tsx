import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { Template, render, setReactiveScheduling } from '@rue-js/rue'
import Fieldset from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Fieldset', () => {
  it('renders root with base class and custom className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () => render(<Fieldset className="w-xs">content</Fieldset>, container))

    await waitForContent(() => {
      const fieldset = container.querySelector('fieldset.fieldset') as HTMLElement
      expect(fieldset).toBeTruthy()
      expect(fieldset.classList.contains('w-xs')).toBe(true)
      expect(fieldset.textContent).toContain('content')
    })
  })

  it('renders legend and label parts', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Fieldset>
          <Fieldset.Legend data-testid="legend">Page title</Fieldset.Legend>
          <Fieldset.Label data-testid="label">Title</Fieldset.Label>
        </Fieldset>,
        container,
      ),
    )

    await waitForContent(() => {
      const legend = container.querySelector('[data-testid="legend"]') as HTMLElement
      const label = container.querySelector('[data-testid="label"]') as HTMLElement
      expect(legend.tagName.toLowerCase()).toBe('legend')
      expect(legend.classList.contains('fieldset-legend')).toBe(true)
      expect(label.tagName.toLowerCase()).toBe('label')
      expect(label.classList.contains('label')).toBe(true)
    })
  })

  it('supports label rendered as description text and forwards attrs', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Fieldset data-testid="root">
          <Fieldset.Label as="p" className="text-xs" data-testid="hint">
            You can edit later
          </Fieldset.Label>
        </Fieldset>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="root"]') as HTMLElement
      const hint = container.querySelector('[data-testid="hint"]') as HTMLElement
      expect(root.classList.contains('fieldset')).toBe(true)
      expect(root.hasAttribute('aria-invalid')).toBe(false)
      expect(hint.tagName.toLowerCase()).toBe('p')
      expect(hint.classList.contains('label')).toBe(true)
      expect(hint.classList.contains('whitespace-normal')).toBe(true)
      expect(hint.classList.contains('text-xs')).toBe(true)
    })
  })

  it('renders structured props and data-driven items', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Fieldset
          legend="Project details"
          description="Configure metadata"
          hint="You can edit later"
          variant="outlined"
          tone="primary"
          items={[
            {
              key: 'name',
              label: 'Project name',
              required: true,
              control: 'input',
              controlProps: { 'data-testid': 'name-input' },
              hint: 'Visible to your team',
            },
          ]}
        >
          <Template slot="actions">
            <button type="button">Save</button>
          </Template>
        </Fieldset>,
        container,
      ),
    )

    await waitForContent(() => {
      const fieldset = container.querySelector('fieldset.fieldset') as HTMLElement
      const legend = container.querySelector('legend') as HTMLElement
      const input = container.querySelector('[data-testid="name-input"]') as HTMLInputElement
      expect(fieldset.className).toContain('border')
      expect(fieldset.className).toContain('bg-primary/5')
      expect(legend.textContent).toContain('Project details')
      expect(container.textContent).toContain('Configure metadata')
      expect(container.textContent).toContain('Project name')
      expect(container.textContent).toContain('必填')
      expect(container.textContent).toContain('Visible to your team')
      expect(container.textContent).toContain('You can edit later')
      expect(container.textContent).toContain('Save')
      expect(input).toBeTruthy()
    })
  })

  it('renders Fieldset.Item in horizontal invalid mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Fieldset data-testid="root">
          <Fieldset.Item
            data-testid="item"
            horizontal
            invalid
            label="Email"
            description="Used for verification"
            hint="Please verify first"
            control="input"
            controlProps={{ 'data-testid': 'email-input' }}
          />
        </Fieldset>,
        container,
      ),
    )

    await waitForContent(() => {
      const item = container.querySelector('[data-testid="item"]') as HTMLElement
      const input = container.querySelector('[data-testid="email-input"]') as HTMLInputElement
      expect(item.className).toContain('md:grid-cols-[minmax(0,12rem)_1fr]')
      expect(item.textContent).toContain('Email')
      expect(item.textContent).toContain('Used for verification')
      expect(item.textContent).toContain('Please verify first')
      expect(item.querySelector('.text-error')).toBeTruthy()
      expect(input).toBeTruthy()
    })
  })
})
