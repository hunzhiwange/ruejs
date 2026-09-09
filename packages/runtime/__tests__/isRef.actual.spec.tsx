import { describe, expect, it } from 'vitest'

import { render, setReactiveScheduling } from '../src'
import { createTestRenderable } from './legacy-test-render'
import { clickByText, defineSplitHomeExampleActualSpec } from './splitHomeExampleTestUtils'
import { mountContainer, waitForContent } from './page-test-utils'

setReactiveScheduling('sync')

defineSplitHomeExampleActualSpec({
  name: 'IsRef',
  route: '/examples/is-ref',
  importPage: () => import('../../../app/pages/examples/IsRef'),
  expectedTexts: [
    'isRef 判定示例',
    'ref(count)',
    'computed(() => count * 2)',
    "computed(() => state.getPath('name'))",
    '{ value: ... }',
  ],
  interaction: async container => {
    await clickByText(container, 'count + 1')
  },
  interactionExpectedTexts: ['count + 1', '2', '4'],
})

const cellTextForExpression = (container: HTMLElement, expression: string, columnIndex: number) => {
  const row = Array.from(container.querySelectorAll('tbody tr')).find(
    current => current.querySelector('code')?.textContent?.trim() === expression,
  )

  return row?.querySelectorAll('td')[columnIndex]?.textContent?.trim()
}

describe('IsRef actual page interactions', () => {
  it('keeps all demo controls clickable and reactive', async () => {
    const { default: Page } = await import('../../../app/pages/examples/IsRef')
    const container = mountContainer()

    render(createTestRenderable(Page as any, null), container)

    await waitForContent(() => {
      expect(cellTextForExpression(container, 'ref(count)', 3)).toBe('1')
      expect(cellTextForExpression(container, "computed(() => state.getPath('name'))", 3)).toBe(
        'Rue',
      )
      expect(cellTextForExpression(container, 'shallowRef({ label })', 3)).toBe('shallow')
    })

    await clickByText(container, 'count + 1')
    await waitForContent(() => {
      expect(cellTextForExpression(container, 'ref(count)', 3)).toBe('2')
      expect(cellTextForExpression(container, 'computed(() => count * 2)', 3)).toBe('4')
    })

    await clickByText(container, '切换 name')
    await waitForContent(() => {
      expect(cellTextForExpression(container, "computed(() => state.getPath('name'))", 3)).toBe(
        'Signal',
      )
      expect(cellTextForExpression(container, 'signal({ name })', 3)).toBe('Signal')
    })

    await clickByText(container, '替换 shallowRef.value')
    await waitForContent(() => {
      expect(cellTextForExpression(container, 'shallowRef({ label })', 3)).toBe('changed')
    })

    await clickByText(container, '代码')
    await waitForContent(() => {
      expect(cellTextForExpression(container, 'ref(count)', 3)).toBeUndefined()
    })

    await clickByText(container, '效果')
    await waitForContent(() => {
      expect(cellTextForExpression(container, 'ref(count)', 3)).toBe('2')
    })
  })
})
