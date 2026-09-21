// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { _$createComponent } from '../src/compiled-component-call'
import type { CompiledComponentFactory } from '../src/compiler-runtime/component'
import { setReactiveScheduling } from '../src/runtime-core/compiled'
import TreeView from '../../../app/pages/examples/TreeView'
import { click, mountContainer, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => <div>{props.children}</div>,
}))
vi.mock('../../../app/pages/site/components/Code', () => ({ default: () => null }))

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})

it('mounts the actual TreeView page, expands it, and adds a child', async () => {
  setReactiveScheduling('sync')
  const container = mountContainer()
  const root = _$createComponent(TreeView as unknown as CompiledComponentFactory<{}>, {})
  try {
    root.__rue_compiled_mount(container)
    await waitForContent(() => expect(container.textContent).toContain('My Tree'))
    await click(container.querySelector('[data-testid="label-root"]'))
    expect(container.textContent).toContain('child folder')
    await click(container.querySelector('[data-testid="add-root"]'))
    expect(container.textContent).toContain('new stuff')
  } finally {
    root.dispose()
  }
})
