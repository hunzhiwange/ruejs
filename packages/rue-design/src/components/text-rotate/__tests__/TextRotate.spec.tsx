import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'

import { render, setReactiveScheduling } from '@rue-js/rue'
import TextRotate from '..'
import Typography from '../../typography'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('TextRotate', () => {
  it('renders with base class and children', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <TextRotate>
          <span>
            <span>{'ONE'}</span>
            <span>{'TWO'}</span>
          </span>
        </TextRotate>,
        c,
      ),
    )

    await waitForContent(() => {
      const el = c.querySelector('span.text-rotate') as HTMLElement
      expect(el).toBeTruthy()
      expect(el.classList.contains('text-rotate')).toBe(true)
      expect(c.querySelector('span span span')?.textContent).toBe('ONE')
    })
  })

  it('appends custom className', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <TextRotate className={'text-7xl'}>
          <span>
            <span>{'A'}</span>
          </span>
        </TextRotate>,
        c,
      ),
    )

    await waitForContent(() => {
      const el = c.querySelector('span.text-rotate') as HTMLElement
      expect(el.classList.contains('text-7xl')).toBe(true)
    })
  })

  it('renders items array with inner and item classes', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <TextRotate
          innerClassName={'justify-items-center'}
          items={[
            { text: 'ONE' },
            { text: 'TWO', strong: true, italic: true, className: 'px-2' },
            { text: 'THREE', className: 'text-red-500' },
          ]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const el = c.querySelector('span.text-rotate') as HTMLElement
      expect(el).toBeTruthy()
      const inner = el.querySelector('span.justify-items-center') as HTMLElement
      expect(inner).toBeTruthy()
      const s1 = inner.querySelector('span:nth-child(1)') as HTMLElement
      const s2 = inner.querySelector('span:nth-child(2)') as HTMLElement
      const s3 = inner.querySelector('span:nth-child(3)') as HTMLElement
      expect(s1.textContent).toBe('ONE')
      expect(s2.querySelector('span')?.textContent).toBe('TWO')
      expect(s3.classList.contains('text-red-500')).toBe(true)
    })
  })

  it('renders semantic items via text and link presets', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <TextRotate
          items={[
            { text: 'Secondary', type: 'secondary' },
            { text: 'Marked', mark: true, strong: true },
            { text: 'Read docs', href: 'https://rue.dev', type: 'danger' },
          ]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const el = c.querySelector('span.text-rotate') as HTMLElement
      expect(el).toBeTruthy()
      const secondary = el.querySelector('span.text-base-content\\/65') as HTMLElement
      const marked = el.querySelector('span.font-semibold mark') as HTMLElement
      const link = el.querySelector('a.link') as HTMLAnchorElement

      expect(secondary?.textContent).toBe('Secondary')
      expect(marked?.textContent).toBe('Marked')
      expect(link?.textContent).toBe('Read docs')
      expect(link?.getAttribute('href')).toBe('https://rue.dev')
      expect(link?.classList.contains('text-error')).toBe(true)
    })
  })

  it('keeps typography aliases for backwards compatibility', () => {
    expect(TextRotate.Text).toBe(Typography.Text)
    expect(TextRotate.Link).toBe(Typography.Link)
    expect(TextRotate.Title).toBe(Typography.Title)
    expect(TextRotate.Paragraph).toBe(Typography.Paragraph)
  })
})
