import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'

import { render } from '@rue-js/rue'
import Footer from '../index'

const waitFooterRender = () => new Promise(resolve => setTimeout(resolve, 0))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Footer', () => {
  it('renders with base class and children', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Footer>
          <nav>
            <h6 className={'footer-title'}>{'Title'}</h6>
          </nav>
        </Footer>,
        c,
      ),
    )
    await waitFooterRender()
    const el = c.querySelector('footer') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('footer')).toBe(true)
    const title = c.querySelector('.footer-title') as HTMLElement
    expect(title).toBeTruthy()
    expect(title.textContent).toBe('Title')
  })

  it('applies direction classes', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Footer direction={'vertical'}>{'x'}</Footer>, c))
    await waitFooterRender()
    let el = c.querySelector('footer') as HTMLElement
    expect(el.classList.contains('footer-vertical')).toBe(true)

    mountTestApp(c, () => render(<Footer direction={'horizontal'}>{'x'}</Footer>, c))
    await waitFooterRender()
    el = c.querySelector('footer') as HTMLElement
    expect(el.classList.contains('footer-horizontal')).toBe(true)
  })

  it('applies center class', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Footer center={true}>{'x'}</Footer>, c))
    await waitFooterRender()
    const el = c.querySelector('footer') as HTMLElement
    expect(el.classList.contains('footer-center')).toBe(true)
  })

  it('appends custom className', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(<Footer className={'p-10 bg-neutral text-neutral-content'}>{'x'}</Footer>, c),
    )
    await waitFooterRender()
    const el = c.querySelector('footer') as HTMLElement
    expect(el.classList.contains('p-10')).toBe(true)
    expect(el.classList.contains('bg-neutral')).toBe(true)
  })

  it('renders structured brand and sections', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Footer
          brand="Rue"
          sections={[
            {
              key: 'product',
              title: 'Product',
              items: [{ label: 'Overview' }, { label: 'Pricing' }],
            },
          ]}
        />,
        c,
      ),
    )
    await waitFooterRender()

    expect(c.querySelector('aside')?.textContent).toContain('Rue')
    expect(c.querySelector('.footer-title')?.textContent).toBe('Product')
    expect(c.textContent).toContain('Overview')
    expect(c.textContent).toContain('Pricing')
  })

  it('renders footer link as anchor when href is provided', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Footer.Link href={'/docs'} target={'_blank'}>
          {'Docs'}
        </Footer.Link>,
        c,
      ),
    )
    await waitFooterRender()

    const link = c.querySelector('a') as HTMLAnchorElement
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/docs')
    expect(link.getAttribute('rel')).toBe('noreferrer')
    expect(link.classList.contains('link')).toBe(true)
    expect(link.classList.contains('link-hover')).toBe(true)
  })
})
