import { type FC, computed, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

type Node = { id: string; name: string; open?: boolean; children?: Node[] }

const TreeItem: FC<{
  model: Node
  className?: string
  onChange: (id: string, patch: Partial<Node>) => void
}> = props => {
  const isOpen = computed(() => !!props.model.open)
  const isFolder = computed(() => !!props.model.children && props.model.children.length > 0)

  const toggle = (e?: any) => {
    e?.stopPropagation()
    props.onChange(props.model.id, { open: !isOpen.get() })
  }

  const addChild = (e?: any) => {
    e?.stopPropagation()
    const childNodes = props.model.children ?? []
    props.onChange(props.model.id, {
      children: [
        ...childNodes,
        { id: `${props.model.id}-new-${childNodes.length}`, name: 'new stuff' },
      ],
      open: true,
    })
  }

  const changeType = (e?: any) => {
    e?.stopPropagation()
    if (!isFolder.get()) addChild()
  }

  return (
    <li>
      <div
        data-testid={`label-${props.model.id}`}
        className={`${isFolder.get() ? 'font-bold' : ''} cursor-pointer leading-6 ${props.className || ''}`}
        onClick={toggle}
        onDblClick={changeType}
      >
        {props.model.name}
        {isFolder.get() ? <span className="ml-2">[{isOpen.get() ? '-' : '+'}]</span> : null}
      </div>
      {isFolder.get() && isOpen.get() ? (
        <ul className="pl-6">
          {props.model.children!.map(m => (
            <TreeItem key={m.id} className="item" model={m} onChange={props.onChange} />
          ))}
          <li
            key={`${props.model.id}-add`}
            data-testid={`add-${props.model.id}`}
            className="item text-emerald-600 select-none"
            onClick={addChild}
          >
            +
          </li>
        </ul>
      ) : null}
    </li>
  )
}

const TreeView: FC = () => {
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

  const onChange = (id: string, patch: Partial<Node>) => {
    const update = (node: Node): Node =>
      node.id === id ? { ...node, ...patch } : { ...node, children: node.children?.map(update) }
    treeData.value = update(treeData.value)
  }

  const activeTab = ref<'preview' | 'code'>('preview')
  const treeViewExampleCode =
    "import { type FC, computed, ref } from '@rue-js/rue'\n\ntype Node = { id: string; name: string; open?: boolean; children?: Node[] }\n\nconst TreeItem: FC<{ model: Node; className?: string; onChange: (id: string, patch: Partial<Node>) => void }> = props => {\n  const isOpen = computed(() => !!props.model.open)\n  const isFolder = computed(() => !!props.model.children && props.model.children.length > 0)\n\n  const toggle = (e?: any) => {\n    e?.stopPropagation()\n    props.onChange(props.model.id, { open: !isOpen.get() })\n  }\n\n  const addChild = (e?: any) => {\n    e?.stopPropagation()\n    const children = props.model.children ?? []\n    props.onChange(props.model.id, {\n      children: [...children, { id: `${props.model.id}-new-${children.length}`, name: 'new stuff' }],\n      open: true,\n    })\n  }\n\n  const changeType = (e?: any) => {\n    e?.stopPropagation()\n    if (!isFolder.get()) addChild()\n  }\n\n  return (\n    <li>\n      <div\n        data-testid={`label-${props.model.id}`}\n        className={`${isFolder.get() ? 'font-bold' : ''} cursor-pointer leading-6 ${props.className || ''}`}\n        onClick={toggle}\n        onDblClick={changeType}\n      >\n        {props.model.name}\n        {isFolder.get() ? <span className=\"ml-2\">[{isOpen.get() ? '-' : '+'}]</span> : null}\n      </div>\n      {isFolder.get() && isOpen.get() ? (\n        <ul className=\"pl-6\">\n          {props.model.children!.map(m => (\n            <TreeItem key={m.id} className=\"item\" model={m} onChange={props.onChange} />\n          ))}\n          <li\n            key={`${props.model.id}-add`}\n            data-testid={`add-${props.model.id}`}\n            className=\"item text-emerald-600 select-none\"\n            onClick={addChild}\n          >\n            +\n          </li>\n        </ul>\n      ) : null}\n    </li>\n  )\n}\n\nconst TreeView: FC = () => {\n  const treeData = ref<Node>({\n    id: 'root',\n    name: 'My Tree',\n    children: [\n      { id: 'hello', name: 'hello' },\n      { id: 'world', name: 'world' },\n      {\n        id: 'branch',\n        name: 'child folder',\n        children: [\n          {\n            id: 'branch-deep-1',\n            name: 'child folder',\n            children: [\n              { id: 'branch-deep-1-hello', name: 'hello' },\n              { id: 'branch-deep-1-world', name: 'world' },\n            ],\n          },\n          { id: 'branch-hello', name: 'hello' },\n          { id: 'branch-world', name: 'world' },\n          {\n            id: 'branch-deep-2',\n            name: 'child folder',\n            children: [\n              { id: 'branch-deep-2-hello', name: 'hello' },\n              { id: 'branch-deep-2-world', name: 'world' },\n            ],\n          },\n        ],\n      },\n    ],\n  })\n\n  const onChange = (id: string, patch: Partial<Node>) => {\n    const update = (node: Node): Node => node.id === id\n      ? { ...node, ...patch }\n      : { ...node, children: node.children?.map(update) }\n    treeData.value = update(treeData.value)\n  }\n\n  const activeTab = ref<'preview' | 'code'>('preview')\n  return <ul><TreeItem model={treeData.value} onChange={onChange} /></ul>\n}\n"

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">树状视图（移植自 Vue）</h1>
      <div role="tablist" className="tabs tabs-box">
        <button
          role="tab"
          className={`tab ${activeTab.value === 'preview' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'preview'
          }}
        >
          效果
        </button>
        <button
          role="tab"
          className={`tab ${activeTab.value === 'code' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'code'
          }}
        >
          代码
        </button>
      </div>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'code' && (
          <div className="card bg-base-100 shadow overflow-auto h-[360px] md:h-[720px]">
            <div className="card-body p-0">
              <Code className="h-full" lang="tsx" code={treeViewExampleCode} />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4">
              <ul>
                <TreeItem className="item" model={treeData.value} onChange={onChange} />
              </ul>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default TreeView
