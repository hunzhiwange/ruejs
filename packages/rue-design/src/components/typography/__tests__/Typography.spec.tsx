import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'

import { render, setReactiveScheduling } from '@rue-js/rue'
import Typography from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Typography', () => {
  it('renders root wrapper with base class', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Typography as={'section'} className={'space-y-3'}>
          {'Content'}
        </Typography>,
        c,
      ),
    )

    await waitForContent(() => {
      const el = c.querySelector('section.rue-typography') as HTMLElement
      expect(el).toBeTruthy()
      expect(el.classList.contains('text-base-content')).toBe(true)
      expect(el.classList.contains('space-y-3')).toBe(true)
      expect(el.textContent).toBe('Content')
    })
  })

  it('renders compound semantic subcomponents', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Typography>
          <Typography.Text type={'warning'} code={true} italic={true}>
            {'npm create rue'}
          </Typography.Text>
          <Typography.Link href={'https://rue.dev'} strong={true}>
            {'Rue Link'}
          </Typography.Link>
          <Typography.Title level={3}>{'Typography Title'}</Typography.Title>
          <Typography.Paragraph mark={true}>{'Typography paragraph content'}</Typography.Paragraph>
        </Typography>,
        c,
      ),
    )

    await waitForContent(() => {
      const text = c.querySelector('span.text-warning.italic') as HTMLElement
      const code = text?.querySelector('code') as HTMLElement
      const link = c.querySelector('a.link.font-semibold') as HTMLAnchorElement
      const title = c.querySelector('h3') as HTMLElement
      const paragraph = c.querySelector('p mark') as HTMLElement

      expect(code?.textContent).toBe('npm create rue')
      expect(link?.getAttribute('href')).toBe('https://rue.dev')
      expect(title?.textContent).toBe('Typography Title')
      expect(title?.className.includes('text-2xl')).toBe(true)
      expect(paragraph?.textContent).toBe('Typography paragraph content')
    })
  })

  it('adds safe rel for blank links and disables navigation when disabled', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <div>
          <Typography.Link href="https://rue.dev" target="_blank">
            Docs
          </Typography.Link>
          <Typography.Link href="https://rue.dev" disabled>
            Disabled
          </Typography.Link>
        </div>,
        c,
      ),
    )

    await waitForContent(() => {
      const links = c.querySelectorAll('a.link')
      expect(links[0]?.getAttribute('rel')).toBe('noreferrer')
      expect(links[1]?.getAttribute('href')).not.toBe('https://rue.dev')
      expect(links[1]?.getAttribute('aria-disabled')).toBe('true')
      expect(links[1]?.getAttribute('tabindex')).toBe('-1')
    })
  })
})
