import { type FC, useState, computed } from '@rue-js/rue'
import { extend } from '@rue-js/shared'
import { RouterLink, useRoute } from '@rue-js/router'

type Item = { id: string; title: string; href?: string; children?: Item[] }
type Section = { id: string; title: string; items: Item[] }

export const SECTIONS_BY_TYPE: Record<'examples', Section[]> = {
  examples: [
    {
      id: 'examples1',
      title: '基础',
      items: [
        {
          id: 'hello-world',
          title: '你好，世界',
          href: '/examples/hello-world',
        },
        {
          id: 'handling-input',
          title: '处理输入',
          href: '/examples/handling-input',
        },
        {
          id: 'attribute-bindings',
          title: 'Attribute 绑定',
          href: '/examples/attribute-bindings',
        },
        {
          id: 'conditionals-and-loops',
          title: '条件与循环',
          href: '/examples/conditionals-and-loops',
        },
        {
          id: 'form-bindings',
          title: '表单绑定',
          href: '/examples/form-bindings',
        },
        {
          id: 'simple-component',
          title: '简单组件',
          href: '/examples/simple-component',
        },
        {
          id: 'web-components',
          title: '原生 Web Components',
          href: '/examples/web-components',
        },
      ],
    },
    {
      id: 'jsx',
      title: 'JSX',
      items: [
        {
          id: 'basic-elements',
          title: '基础元素与自闭合标签',
          href: '/jsx/basic-elements',
        },
        { id: 'expressions', title: '表达式与插值', href: '/jsx/expressions' },
        {
          id: 'attributes-and-props',
          title: '属性、className、style 与 Props',
          href: '/jsx/attributes-and-props',
        },
        {
          id: 'spread-props',
          title: '对象展开属性（spread props）',
          href: '/jsx/spread-props',
        },
        {
          id: 'conditional-rendering',
          title: '条件渲染（?:、&&、null）',
          href: '/jsx/conditional-rendering',
        },
        {
          id: 'lists-and-keys',
          title: '列表渲染与 key',
          href: '/jsx/lists-and-keys',
        },
        {
          id: 'fragments',
          title: 'Fragments（<> … </>）',
          href: '/jsx/fragments',
        },
        { id: 'children', title: 'children 插槽与嵌套', href: '/jsx/children' },
        {
          id: 'components',
          title: '组件与 Props 传递',
          href: '/jsx/components',
        },
        { id: 'events', title: '事件处理', href: '/jsx/events' },
        {
          id: 'controlled-inputs',
          title: '受控输入',
          href: '/jsx/controlled-inputs',
        },
        { id: 'refs', title: 'Refs 基础', href: '/jsx/refs' },
      ],
    },
    {
      id: 'examples2',
      title: '实战',
      items: [
        {
          id: 'markdown-editor',
          title: 'Markdown 编辑器',
          href: '/examples/markdown-editor',
        },
        {
          id: 'fetching-data',
          title: '获取数据',
          href: '/examples/fetching-data',
        },
        {
          id: 'todo-app',
          title: 'Todo 应用',
          href: '/examples/todo-app',
        },
        {
          id: 'sort-filter-grid',
          title: '排序、筛选与网格',
          href: '/examples/sort-filter-grid',
        },
        { id: 'tree-view', title: '树状视图', href: '/examples/tree-view' },
        { id: 'svg-graph', title: 'SVG 图表', href: '/examples/svg-graph' },
        { id: 'modal', title: '带过渡动效的模态框', href: '/examples/modal' },
        {
          id: 'list-transition',
          title: '过渡动效',
          href: '/examples/list-transition',
        },
      ],
    },
  ],
}

const SidebarPlayground: FC = p => {
  const route = useRoute()

  const pathname = computed(() => {
    const r = route.get()
    return (r && r.path) || ''
  })

  const currentType = 'examples'
  const sections = SECTIONS_BY_TYPE[currentType]
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    sections.forEach(s => (init[s.id] = true))
    return init
  })

  const toggleSection = (id: string) => {
    setOpenSections(prev => extend(prev, { [id]: !prev[id] }))
  }

  return (
    <div className="sidebar-playground md:flex md:items-start md:gap-6">
      <aside className="md:w-45 shrink-0">
        <div className="sticky top-20">
          <nav className="space-y-3 w-full">
            {sections.map(sec => (
              <div
                key={sec.id}
                className={`collapse collapse-arrow bg-base-100 rounded-box shadow w-full ${
                  openSections[sec.id] ? 'collapse-open' : ''
                }`}
              >
                <button
                  className="collapse-title px-3 py-2 font-medium text-base-content w-full text-left"
                  onClick={() => toggleSection(sec.id)}
                >
                  {sec.title}
                </button>
                <div className="collapse-content px-0">
                  <ul className="menu menu-sm bg-transparent rounded-box w-full">
                    {sec.items.map(it => (
                      <li key={it.id}>
                        {it.children && it.children.length ? (
                          <div>
                            <div className="px-3 py-2 font-medium text-base-content/80">
                              {it.title}
                            </div>
                            <ul className="menu menu-sm bg-transparent rounded-box w-full">
                              {it.children.map(child => (
                                <li key={child.id}>
                                  <RouterLink
                                    to={`${child.href}`}
                                    className={`${pathname.get() === child.href ? 'active' : ''} w-full`}
                                  >
                                    {child.title}
                                  </RouterLink>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <RouterLink
                            to={`${it.href}`}
                            className={`${pathname.get() === it.href ? 'active' : ''} w-full`}
                          >
                            {it.title}
                          </RouterLink>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <article class="component-preview">{p.children}</article>
    </div>
  )
}

export default SidebarPlayground
