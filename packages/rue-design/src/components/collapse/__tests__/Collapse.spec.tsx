import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from '@rue-js/rue'
import { Collapse } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Collapse', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(h(Collapse, { tabIndex: 0 }, 'hello'), c)
    const el = c.querySelector('.collapse') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('collapse')).toBe(true)
    expect(el.getAttribute('tabindex')).toBe('0')
    expect(el.textContent).toContain('hello')
  })

  it('applies modifier classes', () => {
    const c = document.createElement('div')
    render(h(Collapse, { arrow: true, plus: true, open: true, close: true }, 'x'), c)
    const el = c.querySelector('.collapse') as HTMLElement
    expect(el.classList.contains('collapse-arrow')).toBe(true)
    expect(el.classList.contains('collapse-plus')).toBe(true)
    expect(el.classList.contains('collapse-open')).toBe(true)
    expect(el.classList.contains('collapse-close')).toBe(true)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Collapse, { className: 'bg-base-100 border' }, 'x'), c)
    const el = c.querySelector('.collapse') as HTMLElement
    expect(el.classList.contains('bg-base-100')).toBe(true)
    expect(el.classList.contains('border')).toBe(true)
  })

  it('renders details tag with summary title', () => {
    const c = document.createElement('div')
    render(
      h(Collapse, { tag: 'details', className: 'bg-base-100 border border-base-300' }, [
        h(Collapse.Title, { as: 'summary', className: 'font-semibold' }, 'Title'),
        h(Collapse.Content, { className: 'text-sm' }, 'Content'),
      ]),
      c,
    )
    const details = c.querySelector('details.collapse') as HTMLElement
    expect(details).toBeTruthy()
    const summary = details.querySelector('summary.collapse-title') as HTMLElement
    expect(summary).toBeTruthy()
    const content = details.querySelector('.collapse-content') as HTMLElement
    expect(content).toBeTruthy()
  })
})
