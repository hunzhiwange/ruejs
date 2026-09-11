import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'

import Link from '../index'
import {
  click,
  mountContainer,
  waitForContent,
} from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const waitLinkRender = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Link', () => {
  it('renders with base class', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Link>{'hello'}</Link>, c))
    await waitLinkRender()
    const el = c.querySelector('.link') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('link')).toBe(true)
    expect(el.textContent).toContain('hello')
    expect(el.tagName.toLowerCase()).toBe('a')
  })

  it('supports router to without requiring a router at render time', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Link to={'/about'}>{'go'}</Link>, c))
    await waitLinkRender()
    const el = c.querySelector('.link') as HTMLAnchorElement
    expect(el).toBeTruthy()
    expect(el.textContent).toContain('go')
    expect(el.getAttribute('href')).toBe('#/about')
  })

  it('applies color variants', async () => {
    const c = document.createElement('div')
    for (const v of [
      'neutral',
      'primary',
      'secondary',
      'accent',
      'success',
      'info',
      'warning',
      'error',
    ] as const) {
      c.innerHTML = ''
      mountTestApp(c, () => render(<Link variant={v}>{'x'}</Link>, c))
      await waitLinkRender()
      const el = c.querySelector('.link') as HTMLElement
      expect(el.classList.contains(`link-${v}`)).toBe(true)
    }
  })

  it('supports typography type tones', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Link type={'danger'}>{'x'}</Link>, c))
    await waitLinkRender()
    const el = c.querySelector('.link') as HTMLElement
    expect(el.classList.contains('link-error')).toBe(true)
  })

  it('applies hover style', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Link hover={true}>{'x'}</Link>, c))
    await waitLinkRender()
    const el = c.querySelector('.link') as HTMLElement
    expect(el.classList.contains('link-hover')).toBe(true)
  })

  it('supports href and safe target rel', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Link href={'/test'} target={'_blank'}>
          {'x'}
        </Link>,
        c,
      ),
    )
    await waitLinkRender()
    const el = c.querySelector('.link') as HTMLAnchorElement
    expect(el.getAttribute('href')).toBe('/test')
    expect(el.getAttribute('target')).toBe('_blank')
    expect(el.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('fires onClick handler', async () => {
    const c = document.createElement('div')
    const fn = vi.fn()
    mountTestApp(c, () => render(<Link onClick={fn}>{'x'}</Link>, c))
    await waitLinkRender()
    const el = c.querySelector('.link') as HTMLAnchorElement
    el.click()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('prevents click and removes href when disabled', async () => {
    const c = document.createElement('div')
    const fn = vi.fn()
    mountTestApp(c, () =>
      render(
        <Link href={'/test'} disabled={true} onClick={fn}>
          {'x'}
        </Link>,
        c,
      ),
    )
    await waitLinkRender()
    const el = c.querySelector('.link') as HTMLAnchorElement
    el.click()
    expect(el.getAttribute('href')).toBeNull()
    expect(el.getAttribute('aria-disabled')).toBe('true')
    expect(el.tabIndex).toBe(-1)
    expect(fn).not.toHaveBeenCalled()
  })

  it('supports ellipsis and title fallback', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Link ellipsis={true}>{'A very long link'}</Link>, c))
    await waitLinkRender()
    const el = c.querySelector('.truncate') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.getAttribute('title')).toBe('A very long link')
  })

  it('supports expandable ellipsis and emits expand callback', async () => {
    const c = mountContainer()
    const onExpand = vi.fn()
    mountTestApp(c, () =>
      render(
        <Link
          ellipsis={{
            expandable: 'collapsible',
            suffix: '.md',
            onExpand,
          }}
        >
          {'A very long link that should truncate inside a narrow area'}
        </Link>,
        c,
      ),
    )
    await waitLinkRender()

    let text!: HTMLElement
    await waitForContent(() => {
      text = c.querySelector('.truncate') as HTMLElement
      expect(text).toBeTruthy()
    })
    Object.defineProperty(text, 'clientWidth', {
      configurable: true,
      value: 60,
    })
    Object.defineProperty(text, 'scrollWidth', {
      configurable: true,
      value: 180,
    })

    window.dispatchEvent(new Event('resize'))
    await waitLinkRender()
    await waitLinkRender()

    const expandButton = c.querySelector('[data-rue-link-expand]') as HTMLButtonElement
    expect(expandButton).toBeTruthy()
    expect(c.textContent).toContain('.md')
    await click(expandButton)
    await waitLinkRender()

    const expandedText = c.querySelector('.truncate') as HTMLElement | null
    const collapseButton = c.querySelector('[data-rue-link-expand]') as HTMLButtonElement
    expect(onExpand).toHaveBeenCalledWith(expect.any(MouseEvent), { expanded: true })
    expect(expandedText).toBeNull()
    expect(collapseButton.textContent).toContain('收起')
    expect(c.textContent).toContain('.md')
  })

  it('supports text decorations', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Link strong={true} italic={true} code={true} mark={true} keyboard={true}>
          {'K'}
        </Link>,
        c,
      ),
    )
    await waitLinkRender()
    const el = c.querySelector('.link') as HTMLElement
    expect(el.classList.contains('font-semibold')).toBe(true)
    expect(el.classList.contains('italic')).toBe(true)
    expect(el.querySelector('kbd')).toBeTruthy()
    expect(el.querySelector('code')).toBeTruthy()
    expect(el.querySelector('mark')).toBeTruthy()
  })

  it('copies custom text', async () => {
    const c = document.createElement('div')
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const onCopy = vi.fn()

    mountTestApp(c, () => render(<Link copyable={{ text: 'copy me', onCopy }}>{'Label'}</Link>, c))
    await waitLinkRender()
    const button = c.querySelector('[data-rue-link-copy]') as HTMLButtonElement
    button.click()
    await Promise.resolve()
    await Promise.resolve()
    await waitLinkRender()

    expect(writeText).toHaveBeenCalledWith('copy me')
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('falls back when clipboard writeText is rejected and shows copied feedback', async () => {
    const c = document.createElement('div')
    const writeText = vi.fn(() => Promise.reject(new DOMException('denied', 'NotAllowedError')))
    const execCommand = vi.fn(() => true)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })
    const onCopy = vi.fn()

    mountTestApp(c, () => render(<Link copyable={{ text: 'copy me', onCopy }}>{'Label'}</Link>, c))
    await waitLinkRender()
    const button = c.querySelector('[data-rue-link-copy]') as HTMLButtonElement
    button.click()
    await Promise.resolve()
    await Promise.resolve()
    await waitLinkRender()

    expect(writeText).toHaveBeenCalledWith('copy me')
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(onCopy).toHaveBeenCalledTimes(1)
    expect(button.getAttribute('aria-label')).toBe('已复制')
  })

  it('renders editable controls and commits changes', async () => {
    const c = document.createElement('div')
    const onChange = vi.fn()
    mountTestApp(c, () =>
      render(<Link editable={{ editing: true, text: 'Draft', onChange }}>{'Draft'}</Link>, c),
    )
    await waitLinkRender()

    const input = c.querySelector('[data-rue-link-editor]') as HTMLInputElement
    input.value = 'Done'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const confirm = c.querySelector('[data-rue-link-edit-confirm]') as HTMLButtonElement
    confirm.click()

    expect(onChange).toHaveBeenCalledWith('Done')
  })

  it('enters edit mode after clicking the edit icon', async () => {
    const c = mountContainer()
    mountTestApp(c, () => render(<Link editable={{ text: 'Draft' }}>{'Draft'}</Link>, c))
    let editButton!: HTMLButtonElement
    await waitForContent(() => {
      editButton = c.querySelector('[data-rue-link-edit]') as HTMLButtonElement
      expect(editButton).toBeTruthy()
    })
    await click(editButton)
    await waitForContent(() => {
      const input = c.querySelector('[data-rue-link-editor]') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.value).toBe('Draft')
    })
  })

  it('enters edit mode after clicking link text when triggerType includes text', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(<Link editable={{ text: 'Inline', triggerType: ['text'] }}>{'Inline'}</Link>, c),
    )
    let link!: HTMLAnchorElement
    await waitForContent(() => {
      link = c.querySelector('.link') as HTMLAnchorElement
      expect(link).toBeTruthy()
    })
    await click(link)
    await waitForContent(() => {
      const input = c.querySelector('[data-rue-link-editor]') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.value).toBe('Inline')
    })
  })

  it('renders textarea editor when editable autoSize is enabled', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Link editable={{ editing: true, text: 'Draft', autoSize: { minRows: 2 } }}>
          {'Draft'}
        </Link>,
        c,
      ),
    )
    await waitLinkRender()

    const editor = c.querySelector('[data-rue-link-editor]') as HTMLTextAreaElement
    expect(editor).toBeTruthy()
    expect(editor.tagName).toBe('TEXTAREA')
    expect(editor.getAttribute('rows')).toBe('2')
  })

  it('appends custom className', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Link className={'extra'}>{'x'}</Link>, c))
    await waitLinkRender()
    const el = c.querySelector('.link') as HTMLElement
    expect(el.classList.contains('extra')).toBe(true)
  })
})
