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
const mountTree = () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  render(
    <div>
      <TreeViewFixture />
    </div>,
    container,
  )

  return { container }
}

const click = async (el: Element | null) => {
  expect(el).not.toBeNull()
  el!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flush()
}

const getRootList = (container: HTMLElement) =>
  container.querySelector('ul > li > ul') as HTMLUListElement | null

const getRootAdd = (container: HTMLElement) => getRootList(container)?.lastElementChild ?? null

const getBranchItem = (container: HTMLElement) =>
  container.querySelector('[data-testid="label-branch"]')?.parentElement ?? null

const getBranchAdd = (container: HTMLElement) =>
  getBranchItem(container)?.querySelector('ul')?.lastElementChild ?? null

describe('TreeView plus interactions', () => {
  it('keeps the root add button clickable across repeated inserts', async () => {
    const { container } = mountTree()

    await flush()
    await click(container.querySelector('[data-testid="label-root"]'))
    await click(getRootAdd(container))
    await click(getRootAdd(container))

    expect(container.querySelectorAll('[data-testid^="label-root-new-"]')).toHaveLength(2)
  })

  it('keeps nested add buttons clickable inside expanded subtrees', async () => {
    const { container } = mountTree()

    await flush()
    await click(container.querySelector('[data-testid="label-root"]'))
    await click(container.querySelector('[data-testid="label-branch"]'))
    await click(getBranchAdd(container))

    expect(container.querySelectorAll('[data-testid^="label-branch-new-"]')).toHaveLength(1)
  })
})
