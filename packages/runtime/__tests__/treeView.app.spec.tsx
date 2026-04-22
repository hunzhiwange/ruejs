import { afterEach, describe, expect, it } from 'vitest'

import { render, setReactiveScheduling } from '../src'
import { TreeViewFixture } from '../../../app/test-fixtures/TreeViewFixture'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const mount = (view: any) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  render(view, container)
  return container
}

const click = async (el: Element | null) => {
  expect(el).not.toBeNull()
  el!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flush()
}

describe('TreeView fixture reactivity', () => {
  it('refreshes immediately after adding a root child', async () => {
    const container = mount(
      <div>
        <TreeViewFixture />
      </div>,
    )

    await flush()
    await click(container.querySelector('[data-testid="label-root"]'))
    await click(container.querySelector('[data-testid="add-root"]'))

    expect(container.querySelectorAll('[data-testid^="label-root-new-"]')).toHaveLength(1)
  })

  it('refreshes immediately after adding a nested child', async () => {
    const container = mount(
      <div>
        <TreeViewFixture />
      </div>,
    )

    await flush()
    await click(container.querySelector('[data-testid="label-root"]'))
    await click(container.querySelector('[data-testid="label-branch"]'))
    await click(container.querySelector('[data-testid="add-branch"]'))

    expect(container.querySelectorAll('[data-testid^="label-branch-new-"]')).toHaveLength(1)
  })
})
