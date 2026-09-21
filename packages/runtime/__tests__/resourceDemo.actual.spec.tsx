// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { _$createComponent } from '../src/compiled-component-call'
import type { CompiledComponentFactory } from '../src/compiler-runtime/component'
import { setReactiveScheduling } from '../src/runtime-core/compiled'
import ResourceDemo from '../../../app/pages/examples/ResourceDemo'
import { mountContainer, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => <div>{props.children}</div>,
}))
vi.mock('../../../app/pages/site/components/Code', () => ({ default: () => null }))

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  setReactiveScheduling('frame')
})

it('mounts the actual ResourceDemo page and replaces loading with fetched data', async () => {
  let resolveRequest!: (value: unknown) => void
  const request = new Promise(resolve => {
    resolveRequest = resolve
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(() => request),
  )
  setReactiveScheduling('microtask')
  const container = mountContainer()
  const root = _$createComponent(ResourceDemo as unknown as CompiledComponentFactory<{}>, {})
  try {
    root.__rue_compiled_mount(container)
    await waitForContent(() => expect(container.textContent).toContain('Loading...'))
    resolveRequest({
      ok: true,
      json: async () => [
        {
          sha: '1234567main',
          html_url: 'https://example.test/main',
          author: null,
          commit: {
            message: 'restored example commit',
            author: { name: 'Ferris', date: '2024-01-02T03:04:05Z' },
          },
        },
      ],
    })
    await waitForContent(() => {
      expect(container.textContent).toContain('restored example commit')
      expect(container.textContent).toContain('Ferris')
      expect(container.textContent).not.toContain('Loading...')
    })
  } finally {
    root.dispose()
  }
})
