// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { compileComponent } from './compiled-component-test-utils'

describe('compiled selector codegen', () => {
  it('uses selector subscriptions for a keyed row equality binding', () => {
    const output = compileComponent(
      `export const View = () => <tbody>{rows.get().map(row => <tr key={row.id} className={row.id === selected.get() ? 'active' : ''}>{row.label}</tr>)}</tbody>;`,
    )
    expect(output).toContain('createSelector')
    expect(output).toContain('_$reconcileKeyedSingle')
    expect(output).toContain('.subscribeKeyUnique(')
    expect(output).not.toContain('watchEffect')
    expect(output).not.toContain('_$compiledKeyedList')
  })

  it('does not select the optimization for a callable comparison', () => {
    const output = compileComponent(
      `export const View = () => <tbody>{rows.get().map(row => <tr key={row.id} className={row.id === getSelected() ? 'active' : ''}>{row.label}</tr>)}</tbody>;`,
    )
    expect(output).not.toContain('createSelector')
  })
})
