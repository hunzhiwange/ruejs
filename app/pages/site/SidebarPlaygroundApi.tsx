import { type FC, useState, computed } from '@rue-js/rue'
import { extend } from '@rue-js/shared'
import { RouterLink, useRoute } from '@rue-js/router'

type Item = { id: string; title: string; href?: string; children?: Item[] }
type Section = { id: string; title: string; items: Item[] }

export const SECTIONS_BY_TYPE: Record<'api', Section[]> = {
  api: [
    {
      id: 'docs-api',
      title: 'API',
      items: [
        { id: 'api/application', title: '应用实例', href: '/api/api/application' },
        {
          id: 'api/built-in-components',
          title: '内置组件',
          href: '/api/api/built-in-components',
        },
        {
          id: 'api/built-in-directives',
          title: '内置指令',
          href: '/api/api/built-in-directives',
        },
        {
          id: 'api/built-in-special-attributes',
          title: '特殊属性',
          href: '/api/api/built-in-special-attributes',
        },
        {
          id: 'api/built-in-special-elements',
          title: '特殊元素',
          href: '/api/api/built-in-special-elements',
        },
        {
          id: 'api/compile-time-flags',
          title: '编译时标志',
          href: '/api/api/compile-time-flags',
        },
        {
          id: 'api/component-instance',
          title: '组件实例',
          href: '/api/api/component-instance',
        },
        {
          id: 'api/composition-api-dependency-injection',
          title: '依赖注入',
          href: '/api/api/composition-api-dependency-injection',
        },
        {
          id: 'api/composition-api-helpers',
          title: '组合式 API 帮助函数',
          href: '/api/api/composition-api-helpers',
        },
        {
          id: 'api/composition-api-lifecycle',
          title: '生命周期',
          href: '/api/api/composition-api-lifecycle',
        },
        {
          id: 'api/composition-api-setup',
          title: 'setup',
          href: '/api/api/composition-api-setup',
        },
        { id: 'api/custom-elements', title: '自定义元素', href: '/api/api/custom-elements' },
        { id: 'api/custom-renderer', title: '自定义渲染器', href: '/api/api/custom-renderer' },
        { id: 'api/general', title: '通用', href: '/api/api/general' },
        {
          id: 'api/options-composition',
          title: '选项式组合',
          href: '/api/api/options-composition',
        },
        {
          id: 'api/options-lifecycle',
          title: '选项式生命周期',
          href: '/api/api/options-lifecycle',
        },
        { id: 'api/options-misc', title: '选项式其他', href: '/api/api/options-misc' },
        {
          id: 'api/options-rendering',
          title: '选项式渲染',
          href: '/api/api/options-rendering',
        },
        { id: 'api/options-state', title: '选项式状态', href: '/api/api/options-state' },
        {
          id: 'api/reactivity-advanced',
          title: '响应式进阶',
          href: '/api/api/reactivity-advanced',
        },
        { id: 'api/reactivity-core', title: '响应式核心', href: '/api/api/reactivity-core' },
        {
          id: 'api/reactivity-utilities',
          title: '响应式工具',
          href: '/api/api/reactivity-utilities',
        },
        { id: 'api/render-function', title: '渲染函数', href: '/api/api/render-function' },
        {
          id: 'api/sfc-css-features',
          title: 'SFC CSS 特性',
          href: '/api/api/sfc-css-features',
        },
        {
          id: 'api/sfc-script-setup',
          title: 'SFC Script Setup',
          href: '/api/api/sfc-script-setup',
        },
        { id: 'api/sfc-spec', title: 'SFC 规范', href: '/api/api/sfc-spec' },
        { id: 'api/ssr', title: '服务端渲染', href: '/api/api/ssr' },
        { id: 'api/utility-types', title: '工具类型', href: '/api/api/utility-types' },
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

  const currentType = 'api'
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
