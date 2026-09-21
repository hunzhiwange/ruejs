import { afterEach, expect, it, vi } from 'vitest'
import { setReactiveScheduling } from '../src/runtime-core/compiled'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { mountContainer } from './page-test-utils'

vi.mock('../../../app/pages/examples/createHomeSplitExamplePage', () => ({
  default: (props: { children?: unknown }) => props.children,
}))
vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => props.children,
}))
vi.mock('../../../app/pages/site/components/Code', () => ({ default: () => null }))

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  setReactiveScheduling('frame')
})

export const defineActualExamplePageTest = (name: string, Page: unknown) => {
  it(`mounts the actual ${name} example source`, () => {
    setReactiveScheduling('sync')
    const container = mountContainer()
    const mounted = createMountedCompiledTestComponent(Page as any, container)
    try {
      expect(container.childNodes.length).toBeGreaterThan(0)
      expect(container.textContent?.trim().length).toBeGreaterThan(0)
    } finally {
      mounted.dispose()
    }
  })
}
