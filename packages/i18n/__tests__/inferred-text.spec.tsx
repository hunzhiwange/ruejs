// @vitest-environment jsdom

import { expect, it } from 'vitest'
import { createI18n, useI18n } from '@rue-js/i18n'
import { nextTick, useApp, type FC } from '@rue-js/rue'

it('updates inferred translation text in place when the locale changes', async () => {
  const i18n = createI18n({
    locale: 'en',
    messages: { en: { greeting: 'Hello' }, fr: { greeting: 'Bonjour' } },
  })
  const App: FC = () => {
    const { _: translate } = useI18n()
    return <p aria-label={translate('greeting')}>{translate('greeting')}</p>
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = useApp(App).use(i18n)
  try {
    app.mount(container)
    const paragraph = container.querySelector('p')!
    const text = [...paragraph.childNodes].find(node => node.textContent === 'Hello')
    expect(text).toBeDefined()
    expect(paragraph.getAttribute('aria-label')).toBe('Hello')
    i18n.global.locale.value = 'fr'
    await nextTick()
    expect(paragraph.textContent).toBe('Bonjour')
    expect(paragraph.getAttribute('aria-label')).toBe('Bonjour')
    expect(text?.parentNode).toBe(paragraph)
    expect(text?.textContent).toBe('Bonjour')
  } finally {
    app.unmount()
    container.remove()
  }
})
