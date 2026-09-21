// @vitest-environment jsdom
import Page from '../../../app/pages/examples/OnErrorCaptured'
import { setReactiveScheduling } from '../src/runtime-core/compiled'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { defineActualExamplePageTest } from './actual-example-page-test-utils'
import { mountContainer, waitForContent } from './page-test-utils'

defineActualExamplePageTest('OnErrorCaptured', Page)

it.each(['sync', 'frame'] as const)(
  'captures the deliberately triggered child error without hanging (%s scheduling)',
  async scheduling => {
    setReactiveScheduling(scheduling)
    const container = mountContainer()
    const mounted = createMountedCompiledTestComponent(Page as any, container)

    try {
      const trigger = Array.from(container.querySelectorAll('button')).find(button =>
        button.textContent?.includes('故意触发一次错误'),
      )
      expect(trigger).toBeDefined()

      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

      const expectCaptured = () => {
        expect(container.textContent).toContain('已捕获 1 次')
        expect(container.textContent).toContain('BrokenPanel 在渲染时故意抛出的错误')
        expect(trigger!.disabled).toBe(false)
      }
      await waitForContent(expectCaptured)
    } finally {
      mounted.dispose()
    }
  },
)
