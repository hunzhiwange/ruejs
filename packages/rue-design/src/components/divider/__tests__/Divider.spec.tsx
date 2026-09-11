import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'

import Divider from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Divider', () => {
  it('renders with base class and children', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () => render(<Divider>{'OR'}</Divider>, c))

    await waitForContent(() => {
      const el = c.querySelector('.divider') as HTMLElement
      expect(el).toBeTruthy()
      expect(el.textContent).toContain('OR')
    })
  })

  it('removes the center gap when rendered without content', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () => render(<Divider />, c))

    await waitForContent(() => {
      const el = c.querySelector('.divider') as HTMLElement
      expect(el.classList.contains('gap-0')).toBe(true)
      expect(el.querySelector('span')).toBeNull()
    })

    mountTestApp(c, () => render(<Divider content="" />, c))

    await waitForContent(() => {
      const el = c.querySelector('.divider') as HTMLElement
      expect(el.classList.contains('gap-0')).toBe(true)
      expect(el.querySelector('span')).toBeNull()
    })
  })

  it('applies direction classes', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () => render(<Divider direction={'vertical'}>{'x'}</Divider>, c))

    await waitForContent(() => {
      const el = c.querySelector('.divider') as HTMLElement
      expect(el.classList.contains('divider-horizontal')).toBe(false)
    })

    mountTestApp(c, () => render(<Divider direction={'horizontal'}>{'x'}</Divider>, c))

    await waitForContent(() => {
      const el = c.querySelector('.divider') as HTMLElement
      expect(el.classList.contains('divider-horizontal')).toBe(true)
    })
  })

  it('applies placement classes', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () => render(<Divider placement={'start'}>{'x'}</Divider>, c))

    await waitForContent(() => {
      const el = c.querySelector('.divider') as HTMLElement
      expect(el.classList.contains('divider-start')).toBe(true)
    })

    mountTestApp(c, () => render(<Divider placement={'end'}>{'x'}</Divider>, c))

    await waitForContent(() => {
      const el = c.querySelector('.divider') as HTMLElement
      expect(el.classList.contains('divider-end')).toBe(true)
    })
  })

  it('applies variant classes', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    ;(
      ['neutral', 'primary', 'secondary', 'accent', 'success', 'warning', 'info', 'error'] as const
    ).forEach(v => {
      mountTestApp(c, () => render(<Divider variant={v}>{'x'}</Divider>, c))
    })

    await waitForContent(() => {
      const el = c.querySelector('.divider') as HTMLElement
      expect(el.classList.contains('divider-error')).toBe(true)
    })
  })

  it('appends custom className', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () => render(<Divider className={'w-full'}>{'x'}</Divider>, c))

    await waitForContent(() => {
      const el = c.querySelector('.divider') as HTMLElement
      expect(el.classList.contains('w-full')).toBe(true)
    })
  })
})
