import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Join, Tabs } from '@rue-js/design'
type TabMode = 'preview' | 'code'

interface ExampleBlockProps {
  title: string
  summary?: string
  tab: { value: TabMode }
  preview: () => any
  code: string
}

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const actionItems = [
  { key: 'back', label: 'Back' },
  { key: 'draft', label: 'Save draft', className: 'btn-ghost' },
  { key: 'preview', label: 'Preview', className: 'btn-outline' },
  { key: 'publish', label: 'Publish', className: 'btn-primary' },
]

const filterItems = [
  { key: 'all', label: 'All', active: true },
  { key: 'open', label: 'Open' },
  { key: 'merged', label: 'Merged' },
  { key: 'archived', label: 'Archived', disabled: true },
  { key: 'api', label: 'API', as: 'a', href: '#join-api', className: 'btn-ghost' },
]

const rootApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '指定 Join 根节点标签，默认输出 div',
    type: 'any',
    defaultValue: `'div'`,
  },
  {
    prop: 'direction',
    description: '控制 Join 的主轴方向',
    type: `'horizontal' | 'vertical'`,
    defaultValue: `'horizontal'`,
  },
  {
    prop: 'items',
    description: '数据驱动模式；未传 children 时会自动渲染 Join.Item 列表',
    type: 'JoinItemConfig[]',
    defaultValue: '-',
  },
  {
    prop: 'itemClassName',
    description: '数据驱动模式下，为每个 Join.Item 追加公共 className',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'wrap',
    description: '让 Join 容器支持换行，适合标签筛选或窄屏工具条',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'block',
    description: '让 Join 根节点撑满容器宽度',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'className',
    description: '透传给根节点，用于响应式方向和布局覆盖',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'children',
    description: '组合模式内容；存在 children 时优先渲染 children',
    type: 'any',
    defaultValue: '-',
  },
]

const itemApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: 'Join.Item 的推荐标签别名，和 tag 二选一即可',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'tag',
    description: '基础标签写法，支持 button、input、select 等原生元素',
    type: 'any',
    defaultValue: `'button'`,
  },
  {
    prop: 'active',
    description: '为按钮类项追加 btn-active，适合分段选择器',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'disabled',
    description: '禁用当前项；button 会写入 disabled，a 会补 aria-disabled 语义',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'href',
    description: '当 as/tag 为 a 时透传链接地址',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '追加到 join-item 上，通常用来组合 btn、input、select 等视觉类',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'children',
    description: '当前项内容；数据驱动模式也支持用 label 作为内容别名',
    type: 'any',
    defaultValue: '-',
  },
]

const ExampleBlock: FC<ExampleBlockProps> = ({ title, summary, tab, preview, code }) => {
  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {title}</h2>
          {summary ? <p className="m-0 text-sm opacity-70">{summary}</p> : null}
        </div>
      </div>
      <Tabs
        style="box"
        items={[
          { key: 'preview', label: '预览' },
          { key: 'code', label: 'JSX代码' },
        ]}
        activeKey={tab.value}
        onChange={key => (tab.value = key as TabMode)}
        className="mb-3 mt-4"
      />
      {tab.value === 'preview' ? preview() : <Code className="mt-2" lang="tsx" code={code} />}
    </div>
  )
}

const ApiTable: FC<{ rows: ApiRow[] }> = ({ rows }) => {
  return (
    <div className="not-prose overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>属性</th>
            <th>说明</th>
            <th>类型</th>
            <th>默认值</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.prop}>
              <td>
                <code>{row.prop}</code>
              </td>
              <td>{row.description}</td>
              <td>
                <code>{row.type}</code>
              </td>
              <td>
                <code>{row.defaultValue}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const JoinPage: FC = () => {
  const tabItems = ref<TabMode>('preview')
  const tabStateful = ref<TabMode>('preview')
  const tabBasic = ref<TabMode>('preview')
  const tabVertical = ref<TabMode>('preview')
  const tabResponsive = ref<TabMode>('preview')
  const tabMixed = ref<TabMode>('preview')
  const tabRadius = ref<TabMode>('preview')
  const tabRadio = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Join 组合容器</h1>
        <p className="text-sm mt-3 mb-3">
          Join 用来把一组操作或输入控件拼成连续整体。当前页面展示基础{' '}
          <code>children + Join.Item</code> 组合写法，同时补充了 <code>items</code>{' '}
          数据驱动入口、根节点自定义和基础状态语义，让工具条、筛选器和紧凑表单更容易组织。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要把按钮、输入框、选择器等控件拼成一个连续分组。</li>
          <li>需要在保持 Rue 视觉风格的同时，用更语义化的方式组织工具条和分段选择器。</li>
        </ul>

        <ExampleBlock
          title="推荐：数据驱动工具条"
          summary="items 适合快速描述一组顺序稳定的动作，itemClassName 负责公共视觉，单项 className 负责差异。"
          tab={tabItems}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <Join items={actionItems} itemClassName="btn" data-testid="join-items-preview" />
                <p className="m-0 text-sm opacity-70">
                  推荐把公共样式放到 <code>itemClassName</code>，把强调项放到单个 item 的{' '}
                  <code>className</code>。
                </p>
              </div>
            </div>
          )}
          code={`const items = [
  { key: 'back', label: 'Back' },
  { key: 'draft', label: 'Save draft', className: 'btn-ghost' },
  { key: 'preview', label: 'Preview', className: 'btn-outline' },
  { key: 'publish', label: 'Publish', className: 'btn-primary' },
]

<Join items={items} itemClassName="btn" />`}
        />

        <ExampleBlock
          title="状态与布局"
          summary="active、disabled、as、wrap、block 可以组合出筛选条、导航条和窄屏换行布局。"
          tab={tabStateful}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <Join
                  as="nav"
                  wrap
                  block
                  className="max-w-xl"
                  itemClassName="btn"
                  items={filterItems}
                  data-testid="join-stateful-preview"
                />
                <p className="m-0 text-sm opacity-70">
                  需要响应式方向时，仍然可以直接在 <code>className</code> 里叠加{' '}
                  <code>lg:join-horizontal</code> 这类类名。
                </p>
              </div>
            </div>
          )}
          code={`const filters = [
  { key: 'all', label: 'All', active: true },
  { key: 'open', label: 'Open' },
  { key: 'merged', label: 'Merged' },
  { key: 'archived', label: 'Archived', disabled: true },
  { key: 'api', label: 'API', as: 'a', href: '#join-api', className: 'btn-ghost' },
]

<Join
  as="nav"
  wrap
  block
  className="max-w-xl"
  itemClassName="btn"
  items={filters}
/>`}
        />

        <ExampleBlock
          title="基础组合"
          summary="展示 children + Join.Item 写法，适合自定义程度更高的场景。"
          tab={tabBasic}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <Join data-testid="join-basic-preview">
                  <Join.Item className="btn">Button</Join.Item>
                  <Join.Item className="btn">Button</Join.Item>
                  <Join.Item className="btn">Button</Join.Item>
                </Join>
              </div>
            </div>
          )}
          code={`<Join>
  <Join.Item className="btn">Button</Join.Item>
  <Join.Item className="btn">Button</Join.Item>
  <Join.Item className="btn">Button</Join.Item>
</Join>`}
        />

        <ExampleBlock
          title="纵向排列"
          summary="direction 继续控制 Join 主轴方向，基础用法保持不变。"
          tab={tabVertical}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <Join direction="vertical">
                  <Join.Item className="btn">Button</Join.Item>
                  <Join.Item className="btn">Button</Join.Item>
                  <Join.Item className="btn">Button</Join.Item>
                </Join>
              </div>
            </div>
          )}
          code={`<Join direction="vertical">
  <Join.Item className="btn">Button</Join.Item>
  <Join.Item className="btn">Button</Join.Item>
  <Join.Item className="btn">Button</Join.Item>
</Join>`}
        />

        <ExampleBlock
          title="响应式方向"
          summary="展示基础示例，通过 className 叠加响应式修饰符即可切换方向。"
          tab={tabResponsive}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <Join direction="vertical" className="lg:join-horizontal">
                  <Join.Item className="btn">Button</Join.Item>
                  <Join.Item className="btn">Button</Join.Item>
                  <Join.Item className="btn">Button</Join.Item>
                </Join>
              </div>
            </div>
          )}
          code={`<Join direction="vertical" className="lg:join-horizontal">
  <Join.Item className="btn">Button</Join.Item>
  <Join.Item className="btn">Button</Join.Item>
  <Join.Item className="btn">Button</Join.Item>
</Join>`}
        />

        <ExampleBlock
          title="混合表单元素"
          summary="保持当前复杂示例，Join 仍然可以包裹 input、select 和其他额外结构。"
          tab={tabMixed}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <Join>
                  <div>
                    <div>
                      <Join.Item
                        tag="input"
                        className="input w-[5.3rem] md:w-52"
                        placeholder="Search"
                        data-testid="join-search-input"
                      />
                    </div>
                  </div>
                  <Join.Item
                    tag="select"
                    className="select w-[5.8rem] md:w-auto"
                    defaultValue="Filter"
                  >
                    <option disabled={true} value="Filter">
                      Filter
                    </option>
                    <option>Sci-fi</option>
                    <option>Drama</option>
                    <option>Action</option>
                  </Join.Item>
                  <div className="indicator">
                    <span className="indicator-item badge badge-secondary">new</span>
                    <Join.Item className="btn" data-testid="join-search-button">
                      Search
                    </Join.Item>
                  </div>
                </Join>
              </div>
            </div>
          )}
          code={`<Join>
  <div>
    <div>
      <Join.Item tag="input" className="input w-[5.3rem] md:w-52" placeholder="Search" />
    </div>
  </div>
  <Join.Item tag="select" className="select w-[5.8rem] md:w-auto" defaultValue="Filter">
    <option disabled={true} value="Filter">Filter</option>
    <option>Sci-fi</option>
    <option>Drama</option>
    <option>Action</option>
  </Join.Item>
  <div className="indicator">
    <span className="indicator-item badge badge-secondary">new</span>
    <Join.Item className="btn">Search</Join.Item>
  </div>
</Join>`}
        />

        <ExampleBlock
          title="自定义圆角"
          summary="Join 只负责组合关系，具体圆角和视觉细节仍然交给子项自身控制。"
          tab={tabRadius}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <Join>
                  <Join.Item tag="input" className="input w-36 lg:w-52" placeholder="Email" />
                  <Join.Item className="btn rounded-r-full">Subscribe</Join.Item>
                </Join>
              </div>
            </div>
          )}
          code={`<Join>
  <Join.Item tag="input" className="input w-36 lg:w-52" placeholder="Email" />
  <Join.Item className="btn rounded-r-full">Subscribe</Join.Item>
</Join>`}
        />

        <ExampleBlock
          title="按钮化单选组"
          summary="展示 radio 示例，也可以用 as 继续切到其他标签。"
          tab={tabRadio}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <Join>
                  <Join.Item
                    tag="input"
                    className="btn"
                    type="radio"
                    name="join-options"
                    aria-label="Radio 1"
                  />
                  <Join.Item
                    tag="input"
                    className="btn"
                    type="radio"
                    name="join-options"
                    aria-label="Radio 2"
                  />
                  <Join.Item
                    tag="input"
                    className="btn"
                    type="radio"
                    name="join-options"
                    aria-label="Radio 3"
                  />
                </Join>
              </div>
            </div>
          )}
          code={`<Join>
  <Join.Item tag="input" className="btn" type="radio" name="join-options" aria-label="Radio 1" />
  <Join.Item tag="input" className="btn" type="radio" name="join-options" aria-label="Radio 2" />
  <Join.Item tag="input" className="btn" type="radio" name="join-options" aria-label="Radio 3" />
</Join>`}
        />

        <h2 id="join-api">API</h2>
        <p>Join 当前同时支持组合模式和数据驱动模式，下面分别列出根节点与 Join.Item 的常用能力。</p>

        <h3>Join</h3>
        <ApiTable rows={rootApiRows} />

        <h3>Join.Item</h3>
        <ApiTable rows={itemApiRows} />

        <div className="not-prose mt-6 rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="mt-0 mb-3 text-base font-semibold">JoinItemConfig</h3>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <code>key</code> 用于列表稳定渲染
            </div>
            <div>
              <code>label</code> 是数据驱动模式下的内容别名
            </div>
            <div>
              其余字段使用 <code>Join.Item</code> 的 props
            </div>
            <div>
              单项 <code>className</code> 会和 <code>itemClassName</code> 自动合并
            </div>
          </div>
        </div>

        <h2>FAQ</h2>

        <h3>什么时候用 items，什么时候可以写 Join.Item？</h3>
        <p>
          如果是一组结构稳定、可以直接由数组描述的操作，优先用 <code>items</code>
          。如果内部包含额外布局、 指示器、嵌套容器或复杂表单结构，可以使用{' '}
          <code>children + Join.Item</code> 会更直接。
        </p>

        <h3>as 和 tag 有什么区别？</h3>
        <p>
          两者都能切换渲染标签。<code>as</code> 是当前推荐写法，适合新的调用方式；<code>tag</code>{' '}
          展示， 用来支持项目代码和当前示例。
        </p>

        <h3>Join 会不会接管按钮尺寸、颜色和圆角？</h3>
        <p>
          不会。Join 只负责组合关系和少量容器语义，具体视觉仍然由每个子项自己的{' '}
          <code>className</code> 决定， 这样可以继续保持 Rue 当前的视觉风格和可组合性。
        </p>
      </div>
    </SidebarPlayground>
  )
}

export default JoinPage
