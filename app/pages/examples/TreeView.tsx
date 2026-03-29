import { type FC, computed, ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

type Node = { name: string; children?: Node[] }

const TreeItem: FC<{ model: Node; className?: string }> = props => {
  const isOpen = ref(false)
  const isFolder = computed(() => !!props.model.children && props.model.children.length > 0)
  const toggle = () => {
    isOpen.value = !isOpen.value
  }
  const addChild = () => {
    ;(props.model.children = props.model.children || []).push({
      name: 'new stuff',
    })
  }
  const changeType = () => {
    if (!isFolder.get()) {
      props.model.children = []
      addChild()
      isOpen.value = true
    }
  }

  return (
    <li>
      <div
        className={`${isFolder.get() ? 'font-bold' : ''} cursor-pointer leading-6 ${props.className || ''}`}
        onClick={toggle}
        onDblClick={changeType}
      >
        {props.model.name}
        {isFolder.get() ? <span className="ml-2">[{isOpen.value ? '-' : '+'}]</span> : null}
      </div>
      {isFolder.get() && isOpen.value ? (
        <ul className="pl-6">
          {props.model.children!.map((m, idx) => (
            <TreeItem key={idx} className="item" model={m} />
          ))}
          <li className="item text-emerald-600 select-none" onClick={addChild}>
            +
          </li>
        </ul>
      ) : null}
    </li>
  )
}

const TreeView: FC = () => {
  const treeData = ref<Node>({
    name: 'My Tree',
    children: [
      { name: 'hello' },
      { name: 'world' },
      {
        name: 'child folder',
        children: [
          {
            name: 'child folder',
            children: [{ name: 'hello' }, { name: 'world' }],
          },
          { name: 'hello' },
          { name: 'world' },
          {
            name: 'child folder',
            children: [{ name: 'hello' }, { name: 'world' }],
          },
        ],
      },
    ],
  })

  const activeTab = ref<'preview' | 'code'>('preview')

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
              <Code
                className="h-full"
                lang="tsx"
                code={`import { type FC, ref, computed } from 'rue-js';

type Node = { name: string; children?: Node[] };

const TreeItem: FC<{ model: Node; className?: string }> = (props) => {
  const isOpen = ref(false);
  const isFolder = computed(() => !!props.model.children && props.model.children.length > 0);
  const toggle = () => { isOpen.value = !isOpen.value; };
  const addChild = () => { (props.model.children = props.model.children || []).push({ name: 'new stuff' }); };
  const changeType = () => {
    if (!isFolder.value) {
      props.model.children = [];
      addChild();
      isOpen.value = true;
    }
  };
  return (
    <li>
      <div className={\`
        \${isFolder.value ? 'font-bold' : ''} cursor-pointer leading-6\
      \`} onClick={toggle} onDblClick={changeType}>
        {props.model.name}
        {isFolder.value ? (<span className="ml-2">[{isOpen.value ? '-' : '+'}]</span>) : null}
      </div>
      {isFolder.value && isOpen.value ? (
        <ul className="pl-6">
          {props.model.children!.map((m, idx) => (
            <TreeItem key={idx} className="item" model={m} />
          ))}
          <li className="item text-emerald-600 select-none" onClick={addChild}>+</li>
        </ul>
      ) : null}
    </li>
  );
};

const TreeView: FC = () => {
  const treeData = ref<Node>({
    name: 'My Tree',
    children: [
      { name: 'hello' },
      { name: 'world' },
      {
        name: 'child folder',
        children: [
          { name: 'child folder', children: [{ name: 'hello' }, { name: 'world' }] },
          { name: 'hello' },
          { name: 'world' },
          { name: 'child folder', children: [{ name: 'hello' }, { name: 'world' }] },
        ],
      },
    ],
  });
  return (
    <div className="grid gap-4">
      <ul>
        <TreeItem className="item" model={treeData.value} />
      </ul>
    </div>
  );
};

export default TreeView;`}
              />
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
