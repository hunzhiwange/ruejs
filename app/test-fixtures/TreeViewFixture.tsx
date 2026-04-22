import { computed, ref, type FC } from '@rue-js/rue'

type Node = {
  id: string
  name: string
  children?: Node[]
}

const TreeItem: FC<{ model: Node }> = props => {
  const isOpen = ref(false)
  const isFolder = computed(() => !!props.model.children && props.model.children.length > 0)

  const toggle = (e?: any) => {
    e?.stopPropagation()
    isOpen.value = !isOpen.value
  }

  const addChild = (e?: any) => {
    e?.stopPropagation()
    if (!props.model.children) {
      props.model.children = []
    }
    props.model.children.push({
      id: `${props.model.id}-new-${props.model.children.length}`,
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
          {props.model.children!.map(model => (
            <TreeItem key={model.id} model={model} />
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

  return (
    <div>
      <ul>
        <TreeItem model={treeData.value} />
      </ul>
    </div>
  )
}
