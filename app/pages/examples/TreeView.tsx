import { type FC, computed, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

type Node = { id: string; name: string; open?: boolean; children?: Node[] }

const TreeItem: FC<{ model: Node; className?: string }> = props => {
  const isOpen = computed(() => !!props.model.open)
  const isFolder = computed(() => !!props.model.children && props.model.children.length > 0)

  const toggle = (e?: any) => {
    e?.stopPropagation()
    props.model.open = !isOpen.get()
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
    props.model.open = true
  }

  const changeType = (e?: any) => {
    e?.stopPropagation()
    if (!isFolder.get()) {
      props.model.children = []
      addChild()
      props.model.open = true
    }
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
            <TreeItem key={m.id} className="item" model={m} />
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

  const activeTab = ref<'preview' | 'code'>('preview')
  const treeViewExampleCode = [
    "import { type FC, computed, ref } from '@rue-js/rue';",
    '',
    'type Node = { id: string; name: string; open?: boolean; children?: Node[] };',
    '',
    'const TreeItem: FC<{ model: Node; className?: string }> = (props) => {',
    '  const isOpen = computed(() => !!props.model.open);',
    '  const isFolder = computed(() => !!props.model.children && props.model.children.length > 0);',
    '  const toggle = (e?: any) => {',
    '    e?.stopPropagation();',
    '    props.model.open = !isOpen.get();',
    '  };',
    '  const addChild = (e?: any) => {',
    '    e?.stopPropagation();',
    '    if (!props.model.children) {',
    '      props.model.children = [];',
    '    }',
    '    props.model.children.push({',
    '      id: `${props.model.id}-new-${props.model.children.length}`,',
    "      name: 'new stuff',",
    '    });',
    '    props.model.open = true;',
    '  };',
    '  const changeType = (e?: any) => {',
    '    e?.stopPropagation();',
    '    if (!isFolder.get()) {',
    '      props.model.children = [];',
    '      addChild();',
    '      props.model.open = true;',
    '    }',
    '  };',
    '  return (',
    '    <li>',
    '      <div',
    '        data-testid={`label-${props.model.id}`}',
    "        className={`${isFolder.get() ? 'font-bold' : ''} cursor-pointer leading-6 ${props.className || ''}`}",
    '        onClick={toggle}',
    '        onDblClick={changeType}',
    '      >',
    '        {props.model.name}',
    "        {isFolder.get() ? (<span className=\"ml-2\">[{isOpen.get() ? '-' : '+'}]</span>) : null}",
    '      </div>',
    '      {isFolder.get() && isOpen.get() ? (',
    '        <ul className="pl-6">',
    '          {props.model.children!.map((m) => (',
    '            <TreeItem key={m.id} className="item" model={m} />',
    '          ))}',
    '          <li data-testid={`add-${props.model.id}`} key={`${props.model.id}-add`} className="item text-emerald-600 select-none" onClick={addChild}>+</li>',
    '        </ul>',
    '      ) : null}',
    '    </li>',
    '  );',
    '};',
    '',
    'const TreeView: FC = () => {',
    '  const treeData = ref<Node>({',
    "    id: 'root',",
    "    name: 'My Tree',",
    '    children: [',
    "      { id: 'hello', name: 'hello' },",
    "      { id: 'world', name: 'world' },",
    '      {',
    "        id: 'branch',",
    "        name: 'child folder',",
    '        children: [',
    '          {',
    "            id: 'branch-deep-1',",
    "            name: 'child folder',",
    '            children: [',
    "              { id: 'branch-deep-1-hello', name: 'hello' },",
    "              { id: 'branch-deep-1-world', name: 'world' },",
    '            ],',
    '          },',
    "          { id: 'branch-hello', name: 'hello' },",
    "          { id: 'branch-world', name: 'world' },",
    '          {',
    "            id: 'branch-deep-2',",
    "            name: 'child folder',",
    '            children: [',
    "              { id: 'branch-deep-2-hello', name: 'hello' },",
    "              { id: 'branch-deep-2-world', name: 'world' },",
    '            ],',
    '          },',
    '        ],',
    '      },',
    '    ],',
    '  });',
    '  return (',
    '    <div className="grid gap-4">',
    '      <ul>',
    '        <TreeItem className="item" model={treeData.value} />',
    '      </ul>',
    '    </div>',
    '  );',
    '};',
    '',
    'export default TreeView;',
  ].join('\n')

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
                <TreeItem className="item" model={treeData.value} />
              </ul>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default TreeView
