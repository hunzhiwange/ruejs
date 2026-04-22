import { afterEach, describe, expect, it } from 'vitest'

import { computed, ref, render, setReactiveScheduling, type FC } from '../src'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

type Node = {
  id: string
  name: string
  children?: Node[]
}

const TreeItem: FC<{ model: Node }> = props => {
  const isOpen = ref(false)
  const isFolder = computed(() => !!props.model.children && props.model.children.length > 0)

  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  const addChild = () => {
    const children = (props.model.children = props.model.children || [])
    children.push({
      id: `${props.model.id}-new-${children.length}`,
      name: 'new stuff',
    })
  }

  return (
    <li>
      <div data-testid={`label-${props.model.id}`} onClick={toggle}>
        {props.model.name}
        {isFolder.get() ? <span>[{isOpen.value ? '-' : '+'}]</span> : null}
      </div>
      {isFolder.get() && isOpen.value ? (
        <ul>
          {props.model.children!.map((model, index) => (
            <TreeItem key={index} model={model} />
          ))}
          <li data-testid={`add-${props.model.id}`} onClick={addChild}>
            +
          </li>
        </ul>
      ) : null}
    </li>
  )
}

const mountTree = () => {
  const treeData = ref<Node>({
    id: 'root',
    name: 'My Tree',
    children: [
      { id: 'hello', name: 'hello' },
      { id: 'world', name: 'world' },
      {
        id: 'branch',
        name: 'child folder',
        children: [
          {
            id: 'branch-deep-1',
            name: 'child folder',
            children: [
              { id: 'branch-deep-1-hello', name: 'hello' },
              { id: 'branch-deep-1-world', name: 'world' },
            ],
          },
          { id: 'branch-hello', name: 'hello' },
          { id: 'branch-world', name: 'world' },
          {
            id: 'branch-deep-2',
            name: 'child folder',
            children: [
              { id: 'branch-deep-2-hello', name: 'hello' },
              { id: 'branch-deep-2-world', name: 'world' },
            ],
          },
        ],
      },
    ],
  })

  const container = document.createElement('div')
  document.body.appendChild(container)
  render(
    <ul>
      <TreeItem model={treeData.value} />
    </ul>,
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
