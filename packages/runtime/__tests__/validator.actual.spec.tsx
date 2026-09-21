import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import ValidatorPage from '../../../app/pages/design/Validator'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, findTabButton, resetActiveRuntime } from './design-page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Validator actual page', () => {
  it('renders validator demos and restores the email preview after toggling code', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<ValidatorPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Validator 校验辅助')
      expect(container.querySelectorAll('.component-preview').length).toBe(6)
    })

    const emailDemo = findDemo(container, '# Validator and validator-hint') as HTMLElement | null
    const hostsDemo = findDemo(container, '# Different validator hosts') as HTMLElement | null
    const rulesDemo = findDemo(container, '# Hidden hint and rule list') as HTMLElement | null
    expect(emailDemo).not.toBeNull()
    expect(hostsDemo).not.toBeNull()
    expect(rulesDemo).not.toBeNull()

    await waitForContent(() => {
      expect(
        (emailDemo!.querySelector('input.validator') as HTMLElement).tagName.toLowerCase(),
      ).toBe('input')
      expect(
        (emailDemo!.querySelector('form button[type="submit"]') as HTMLButtonElement).textContent,
      ).toContain('Check email')
      expect(
        (hostsDemo!.querySelector('select.validator') as HTMLElement).tagName.toLowerCase(),
      ).toBe('select')
      expect(
        (hostsDemo!.querySelector('textarea.validator') as HTMLElement).tagName.toLowerCase(),
      ).toBe('textarea')
      const passwordInput = rulesDemo!.querySelector(
        'input[placeholder="Password"]',
      ) as HTMLInputElement
      expect(passwordInput.getAttribute('pattern')).toBe('(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,}')
      expect(passwordInput.getAttribute('title')).toBe(
        'Must include number, lowercase and uppercase letters',
      )
      const usernameInput = rulesDemo!.querySelector(
        'input[placeholder="Username"]',
      ) as HTMLInputElement
      const usernameForm = usernameInput.closest('form')
      expect(usernameForm).not.toBeNull()
      expect(usernameInput.getAttribute('pattern')).toBe('[A-Za-z0-9\\-]+')
      expect(usernameInput.getAttribute('title')).toBe('Only letters, numbers or dash')
      expect(
        (usernameForm!.querySelector('button[type="submit"]') as HTMLButtonElement).textContent,
      ).toContain('Check username')
    })

    await waitForContent(() => {
      const ruleHints = Array.from(rulesDemo!.querySelectorAll('.validator-hint')) as HTMLElement[]
      expect(ruleHints).toHaveLength(2)
      expect(ruleHints.every(hint => hint.classList.contains('hidden'))).toBe(true)
    })

    const passwordInput = rulesDemo!.querySelector(
      'input[placeholder="Password"]',
    ) as HTMLInputElement
    passwordInput.value = 'Microlgo234324234'
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      expect(passwordInput.getAttribute('aria-invalid')).toBe('false')
    })

    passwordInput.value = 'microlgo234324234'
    passwordInput.dispatchEvent(new Event('invalid', { cancelable: true }))

    await waitForContent(() => {
      expect(passwordInput.getAttribute('aria-invalid')).toBe('true')
    })

    passwordInput.value = 'Microlgo234324234'
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      expect(passwordInput.getAttribute('aria-invalid')).toBe('false')
    })

    const usernameInput = rulesDemo!.querySelector(
      'input[placeholder="Username"]',
    ) as HTMLInputElement
    usernameInput.value = '222222'
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      expect(usernameInput.getAttribute('aria-invalid')).toBe('false')
    })

    usernameInput.value = 'a'
    usernameInput.dispatchEvent(new Event('invalid', { cancelable: true }))

    await waitForContent(() => {
      expect(usernameInput.getAttribute('aria-invalid')).toBe('true')
    })

    usernameInput.value = 'Rue-01'
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      expect(usernameInput.getAttribute('aria-invalid')).toBe('false')
    })

    await click(findTabButton(emailDemo!, 'JSX代码'))
    const emailDemoInCode = findDemo(
      container,
      '# Validator and validator-hint',
    ) as HTMLElement | null
    expect(emailDemoInCode!.querySelectorAll('.validator').length).toBe(0)

    await click(findTabButton(emailDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredEmailDemo = findDemo(
        container,
        '# Validator and validator-hint',
      ) as HTMLElement | null
      expect(restoredEmailDemo!.querySelectorAll('.validator').length).toBe(1)
    })
  })
})
