import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Label from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Label', () => {
  it('renders the standard input wrapper and text part', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Label className="w-full" data-testid="root">
          <Label.Text data-testid="text">https://</Label.Text>
          <input type="text" placeholder="URL" />
        </Label>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="root"]') as HTMLLabelElement
      const text = container.querySelector('[data-testid="text"]') as HTMLSpanElement
      expect(root.classList.contains('input')).toBe(true)
      expect(root.classList.contains('w-full')).toBe(true)
      expect(root.hasAttribute('aria-required')).toBe(false)
      expect(root.hasAttribute('aria-invalid')).toBe(false)
      expect(root.hasAttribute('aria-disabled')).toBe(false)
      expect(text.classList.contains('label')).toBe(true)
      expect(root.querySelector('input')).not.toBeNull()
    })
  })

  it('supports div as the control wrapper under vapor compilation', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Label as="div" label="Plain wrapper" data-testid="div-root">
          <input type="text" placeholder="Plain" />
        </Label>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="div-root"]') as HTMLDivElement
      expect(root.tagName).toBe('DIV')
      expect(root.classList.contains('input')).toBe(true)
      expect(root.querySelector('input')).not.toBeNull()
      expect(container.textContent).toContain('Plain wrapper')
    })
  })

  it('supports select wrapper control', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Label control="select" data-testid="select-root">
          <Label.Text>Type</Label.Text>
          <select>
            <option>Personal</option>
          </select>
        </Label>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="select-root"]') as HTMLLabelElement
      expect(root.classList.contains('select')).toBe(true)
      expect(root.querySelector('select')).not.toBeNull()
    })
  })

  it('renders the floating label compound parts', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Label.Floating className="max-w-xs" data-testid="floating-root">
          <input type="email" className="input input-md" placeholder="mail@site.com" />
          <Label.FloatingText data-testid="floating-text">Your Email</Label.FloatingText>
        </Label.Floating>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="floating-root"]') as HTMLLabelElement
      const text = container.querySelector('[data-testid="floating-text"]') as HTMLSpanElement
      expect(root.classList.contains('floating-label')).toBe(true)
      expect(root.classList.contains('max-w-xs')).toBe(true)
      expect(text.classList.contains('label')).toBe(false)
      expect(text.textContent).toContain('Your Email')
    })
  })

  it('supports field metadata, affixes, status, size and variant classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Label
          label="Workspace URL"
          description="Use the public slug shown in team settings."
          help="Only lowercase letters and dashes."
          required
          optional="Required"
          status="warning"
          size="large"
          variant="filled"
          prefix="rue.dev/"
          suffix=".app"
          rootClassName="field-shell"
          data-testid="workspace-field"
        >
          <input type="text" placeholder="acme" />
        </Label>,
        container,
      ),
    )

    await waitForContent(() => {
      const control = container.querySelector('[data-testid="workspace-field"]') as HTMLLabelElement
      const shell = control.parentElement as HTMLDivElement
      expect(shell.classList.contains('field-shell')).toBe(true)
      expect(control.classList.contains('input')).toBe(true)
      expect(control.classList.contains('input-warning')).toBe(true)
      expect(control.classList.contains('input-lg')).toBe(true)
      expect(control.classList.contains('bg-base-200/70')).toBe(true)
      expect(control.getAttribute('aria-required')).toBe('true')
      expect(shell.textContent).toContain('Workspace URL')
      expect(shell.textContent).toContain('Required')
      expect(shell.textContent).toContain('Use the public slug')
      expect(shell.textContent).toContain('Only lowercase')
      expect(shell.textContent).toContain('rue.dev/')
      expect(shell.textContent).toContain('.app')
    })
  })

  it('supports textarea wrappers and error feedback', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Label
          control="textarea"
          label="Release notes"
          error="Release notes are required."
          block
          data-testid="notes-field"
        >
          <textarea placeholder="What changed?" />
        </Label>,
        container,
      ),
    )

    await waitForContent(() => {
      const control = container.querySelector('[data-testid="notes-field"]') as HTMLLabelElement
      const shell = control.parentElement as HTMLDivElement
      expect(control.classList.contains('textarea')).toBe(true)
      expect(control.classList.contains('textarea-error')).toBe(true)
      expect(control.getAttribute('aria-invalid')).toBe('true')
      expect(shell.classList.contains('w-full')).toBe(true)
      expect(shell.textContent).toContain('Release notes are required.')
    })
  })

  it('supports floating label shortcut text and feedback', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Label.Floating
          caption="Contact"
          text="Email"
          error="Use a company email."
          required
          data-testid="floating-shortcut"
        >
          <input type="email" className="input input-md" placeholder="mail@site.com" />
        </Label.Floating>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="floating-shortcut"]') as HTMLLabelElement
      const shell = root.parentElement as HTMLDivElement
      expect(root.classList.contains('floating-label')).toBe(true)
      expect(root.getAttribute('aria-invalid')).toBe('true')
      expect(root.querySelector('span')?.textContent).toContain('Email')
      expect(shell.textContent).toContain('Contact')
      expect(shell.textContent).toContain('Use a company email.')
    })
  })
})
