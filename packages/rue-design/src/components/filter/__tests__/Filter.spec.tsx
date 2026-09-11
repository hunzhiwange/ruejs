import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Filter from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Filter', () => {
  it('renders the filter root as form by default', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Filter data-testid="filter-root">
          <Filter.Item name="demo" aria-label="All" />
        </Filter>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="filter-root"]') as HTMLElement
      expect(root.tagName.toLowerCase()).toBe('form')
      expect(root.classList.contains('filter')).toBe(true)
      expect((container.querySelector('.btn') as HTMLInputElement).type).toBe('radio')
    })
  })

  it('renders reset variants for form and div modes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Filter.Reset mode="form" data-testid="form-reset" value="×" />
          <Filter.Reset mode="div" data-testid="div-reset" aria-label="×" name="demo" />
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const formReset = container.querySelector('[data-testid="form-reset"]') as HTMLInputElement
      const divReset = container.querySelector('[data-testid="div-reset"]') as HTMLInputElement
      expect(formReset.type).toBe('reset')
      expect(formReset.classList.contains('btn-square')).toBe(true)
      expect(divReset.type).toBe('radio')
      expect(divReset.classList.contains('filter-reset')).toBe(true)
    })
  })

  it('supports items-driven radio selection and div reset clearing', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const changes: Array<string | undefined> = []

    mountTestApp(container, () =>
      render(
        <Filter
          as="div"
          data-testid="filter-root"
          color="primary"
          variant="outlined"
          items={[
            { label: 'All', value: 'all' },
            { label: 'Open', value: 'open' },
            { label: 'Closed', value: 'closed' },
          ]}
          reset={{ label: 'Clear' }}
          onChange={value => {
            changes.push(
              Array.isArray(value)
                ? String(value[0] ?? '') || undefined
                : (value as string | undefined),
            )
          }}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[aria-label="Open"]')).toBeTruthy()
      expect(container.querySelector('[aria-label="Clear"]')).toBeTruthy()
    })

    const open = container.querySelector('[aria-label="Open"]') as HTMLInputElement
    const clear = container.querySelector('[aria-label="Clear"]') as HTMLElement

    open.checked = true
    open.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="filter-root"]') as HTMLElement
      expect(open.type).toBe('radio')
      expect(open.name).toMatch(/^rue-filter-/)
      expect(open.className.includes('undefined')).toBe(false)
      expect(open.classList.contains('btn-active')).toBe(true)
      expect(root.tagName.toLowerCase()).toBe('div')
      expect(open.checked).toBe(true)
      expect(open.classList.contains('btn-primary')).toBe(true)
      expect(open.classList.contains('btn-outline')).toBe(true)
      expect(changes[changes.length - 1]).toBe('open')
    })

    clear.click()

    await waitForContent(() => {
      expect(clear.classList.contains('filter-reset')).toBe(true)
      expect(open.checked).toBe(false)
      expect(changes[changes.length - 1]).toBe(undefined)
    })
  })

  it('clears controlled radio selection on the first div reset click', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const changes: Array<string | undefined> = []

    const ControlledFilter = () => {
      const active = ref<string | undefined>('open')

      return (
        <Filter
          as="div"
          items={[
            { label: 'Open', value: 'open' },
            { label: 'Closed', value: 'closed' },
          ]}
          reset={{ label: 'All' }}
          value={active.value}
          onChange={value => {
            const next = Array.isArray(value)
              ? String(value[0] ?? '') || undefined
              : (value as string | undefined)
            changes.push(next)
            active.value = next
          }}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledFilter />, container))

    await waitForContent(() => {
      const open = container.querySelector('[aria-label="Open"]') as HTMLInputElement
      const reset = container.querySelector('[aria-label="All"]') as HTMLInputElement
      expect(open.checked).toBe(true)
      expect(open.classList.contains('btn-active')).toBe(true)
      expect(reset.tagName.toLowerCase()).toBe('input')
      expect(reset.checked).toBe(false)
    })

    const open = container.querySelector('[aria-label="Open"]') as HTMLInputElement
    const reset = container.querySelector('[aria-label="All"]') as HTMLElement

    reset.click()

    await waitForContent(() => {
      expect(open.checked).toBe(false)
      expect(open.classList.contains('btn-active')).toBe(false)
      expect(changes[changes.length - 1]).toBe(undefined)
    })
  })

  it('restores default value on form reset in items mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const changes: Array<string | undefined> = []

    mountTestApp(container, () =>
      render(
        <Filter
          data-testid="filter-form-items"
          items={[
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
          ]}
          defaultValue="draft"
          onChange={value => {
            changes.push(
              Array.isArray(value)
                ? String(value[0] ?? '') || undefined
                : (value as string | undefined),
            )
          }}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const draft = container.querySelector('[aria-label="Draft"]') as HTMLInputElement
      const published = container.querySelector('[aria-label="Published"]') as HTMLInputElement
      expect(container.querySelector('[data-testid="filter-form-items"]')).toBeTruthy()
      expect(draft.checked).toBe(true)
      expect(published.checked).toBe(false)
    })

    const form = container.querySelector('[data-testid="filter-form-items"]') as HTMLFormElement
    const draft = container.querySelector('[aria-label="Draft"]') as HTMLInputElement
    const published = container.querySelector('[aria-label="Published"]') as HTMLInputElement

    published.checked = true
    published.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(published.checked).toBe(true)
      expect(changes[changes.length - 1]).toBe('published')
    })

    form.dispatchEvent(new Event('reset', { bubbles: true }))

    await waitForContent(() => {
      expect(draft.checked).toBe(true)
      expect(published.checked).toBe(false)
      expect(changes[changes.length - 1]).toBe('draft')
    })
  })

  it('supports multiple selection arrays', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const changes: string[][] = []

    mountTestApp(container, () =>
      render(
        <Filter
          multiple
          items={[
            { label: 'Search', value: 'search' },
            { label: 'Alerts', value: 'alerts' },
          ]}
          defaultValue={['search']}
          onChange={value => {
            changes.push(
              Array.isArray(value) ? value.map(item => String(item)) : value ? [String(value)] : [],
            )
          }}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const search = container.querySelector('[aria-label="Search"]') as HTMLInputElement
      const alerts = container.querySelector('[aria-label="Alerts"]') as HTMLInputElement
      const root = container.querySelector('form') as HTMLFormElement
      expect(root.classList.contains('filter')).toBe(false)
      expect(root.classList.contains('flex')).toBe(true)
      expect(root.classList.contains('gap-1')).toBe(true)
      expect(search.checked).toBe(true)
      expect(alerts.checked).toBe(false)
    })

    const search = container.querySelector('[aria-label="Search"]') as HTMLInputElement
    const alerts = container.querySelector('[aria-label="Alerts"]') as HTMLInputElement

    alerts.checked = true
    alerts.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(search.checked).toBe(true)
      expect(alerts.checked).toBe(true)
      expect(search.classList.contains('btn-active')).toBe(true)
      expect(alerts.classList.contains('btn-active')).toBe(true)
      expect(changes[changes.length - 1]).toEqual(['search', 'alerts'])
    })
  })

  it('renders checkbox reset after items when using form mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Filter
          multiple
          items={[
            { label: 'Search', value: 'search' },
            { label: 'Alerts', value: 'alerts' },
          ]}
          reset={{ label: 'Clear' }}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const form = container.querySelector('form') as HTMLFormElement
      const inputs = Array.from(form.querySelectorAll('input'))
      expect(form.classList.contains('filter')).toBe(false)
      expect(form.classList.contains('flex')).toBe(true)
      expect(
        inputs.map(input => input.getAttribute('aria-label') ?? input.getAttribute('value')),
      ).toEqual(['Search', 'Alerts', 'Clear'])
      expect((inputs[inputs.length - 1] as HTMLInputElement).type).toBe('reset')
    })
  })
})
