import { describe, expect, it } from 'vite-plus/test'
import {
  createAppRenderDependency,
  renderAfterAppDependencies,
  renderWithAppDependencyBarrier,
} from '../src/server/app-render-dependency.js'
import {
  Fragment,
  createElement,
  renderAppServerElementToHtmlAsync,
  type TestServerNode,
} from './app-server-protocol-test-utils.js'

function renderHtml(element: TestServerNode): Promise<string> {
  return renderAppServerElementToHtmlAsync(element)
}

describe('app render dependency helpers', () => {
  it('executes compiled siblings in writer order', async () => {
    let activeLocale = 'en'

    async function LocaleLayout() {
      await Promise.resolve()
      activeLocale = 'de'
      return createElement('div', null, 'layout')
    }

    function LocalePage() {
      return createElement('p', null, `page:${activeLocale}`)
    }

    const body = await renderHtml(
      createElement(Fragment, null, createElement(LocaleLayout), createElement(LocalePage)),
    )

    expect(body).toContain('page:de')
  })

  it('waits to serialize dependent entries until the barrier entry has rendered', async () => {
    let activeLocale = 'en'
    const layoutDependency = createAppRenderDependency()

    async function LocaleLayout() {
      await Promise.resolve()
      activeLocale = 'de'
      return createElement(
        'div',
        null,
        renderWithAppDependencyBarrier(createElement('span', null, 'layout'), layoutDependency),
      )
    }

    function LocalePage() {
      return createElement('p', null, `page:${activeLocale}`)
    }

    const body = await renderHtml(
      createElement(
        Fragment,
        null,
        createElement(LocaleLayout),
        renderAfterAppDependencies(createElement(LocalePage), [layoutDependency]),
      ),
    )

    expect(body).toContain('page:de')
    expect(body).not.toContain('page:en')
  })
})
