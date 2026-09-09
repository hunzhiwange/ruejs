import { computed, ref, type FC } from '@rue-js/rue'

type Node = {
  id: string
  name: string
  children?: Node[]
}

const TreeItem: FC<{
  model: Node
  notifyChange: () => void
  syncChildren: (id: string, children: Node[]) => void
}> = props => {
  const isOpen = ref(false)
  const version = ref(0)
  const isFolder = computed(() => !!props.model.children && props.model.children.length > 0)

  const toggle = (e?: any) => {
    e?.stopPropagation()
    isOpen.value = !isOpen.value
  }

  const addChild = (e?: any) => {
    e?.stopPropagation()
    const nextChildren = props.model.children ? props.model.children.slice() : []

    nextChildren.push({
      id: `${props.model.id}-new-${nextChildren.length}`,
      name: 'new stuff',
    })

    props.syncChildren(props.model.id, nextChildren)
    version.value += 1
    props.notifyChange()
  }

  return (
    <li>
      <div data-testid={`label-${props.model.id}`} onClick={toggle}>
        {props.model.name}
        {isFolder.get() ? <span>[{isOpen.value ? '-' : '+'}]</span> : null}
      </div>
      {isFolder.get() && isOpen.value ? (
        <ul key={`${props.model.id}-${props.model.children!.length}-${version.value}`}>
          {props.model.children!.map(model => (
            <TreeItem
              key={model.id}
              model={model}
              notifyChange={props.notifyChange}
              syncChildren={props.syncChildren}
            />
          ))}
          <li data-testid={`add-${props.model.id}`} onClick={addChild}>
            +
          </li>
        </ul>
      ) : null}
    </li>
  )
}

export const TreeViewFixture: FC = () => {
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
          { id: 'branch-hello', name: 'hello' },
          { id: 'branch-world', name: 'world' },
        ],
      },
    ],
  })
  const revision = ref(0)

  const syncChildren = (id: string, children: Node[]) => {
    const update = (node: Node): Node =>
      node.id === id ? { ...node, children } : { ...node, children: node.children?.map(update) }
    treeData.value = update(treeData.value)
  }

  const notifyChange = () => {
    revision.value += 1
  }

  return (
    <div data-testid={`tree-${revision.value}`}>
      <ul>
        <TreeItem model={treeData.value} notifyChange={notifyChange} syncChildren={syncChildren} />
      </ul>
    </div>
  )
}
