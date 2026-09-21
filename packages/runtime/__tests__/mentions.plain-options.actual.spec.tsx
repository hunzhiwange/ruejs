import { afterEach, describe, expect, it } from 'vitest'

import { ref, setReactiveScheduling } from '../src'
import Mentions from '../../../packages/rue-design/src/components/mentions/index'
import { render, mountContainer, waitForContent } from './page-test-utils'

let activeContainer: HTMLElement | null = null

afterEach(() => {
  if (activeContainer) {
    render(null, activeContainer)
    activeContainer = null
  }

  setReactiveScheduling('sync')
  document.body.innerHTML = ''
})

describe('Mentions plain options actual', () => {
  it('mounts under microtask scheduling with plain string labels', async () => {
    const container = mountContainer()
    activeContainer = container

    const PlainMentionsCase = () => {
      const value = ref('@sakura 请帮我同步 Mentions 设计稿')

      return (
        <Mentions
          value={value.value}
          options={[
            { value: 'sakura', label: 'Sakura' },
            { value: 'lin', label: 'Lin' },
            { value: 'nano', label: 'Nano' },
          ]}
          rows={4}
          onChange={text => {
            value.value = text
          }}
        />
      )
    }

    setReactiveScheduling('microtask')

    expect(() => render(<PlainMentionsCase />, container)).not.toThrow()

    await waitForContent(() => {
      const textarea = container.querySelector(
        'textarea[data-rue-mentions-input="true"]',
      ) as HTMLTextAreaElement | null

      expect(textarea).toBeTruthy()
      expect(textarea?.value).toContain('@sakura')
      expect(textarea?.readOnly).toBe(false)
      expect(textarea?.getAttribute('readonly')).toBeNull()
      expect(textarea?.getAttribute('aria-controls')).toBeNull()
      expect(textarea?.getAttribute('aria-activedescendant')).toBeNull()
    })
  })
})
