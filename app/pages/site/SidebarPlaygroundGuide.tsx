import { type FC, useState, computed } from 'rue-js'
import { extend } from 'rue-shared'
import { RouterLink, useRoute } from 'rue-router'

type Item = { id: string; title: string; href?: string; children?: Item[] }
type Section = { id: string; title: string; items: Item[] }

export const SECTIONS_BY_TYPE: Record<'guide', Section[]> = {
  guide: [
    {
      id: 'docs-guide1',
      title: '指南',
      items: [
        { id: 'guide/introduction', title: '介绍', href: '/guide/guide/introduction' },
        { id: 'guide/quick-start', title: '快速上手', href: '/guide/guide/quick-start' },
      ],
    },
    {
      id: 'guide/essentials',
      title: '基础',
      items: [
        {
          id: 'guide/essentials/application',
          title: '应用',
          href: '/guide/guide/essentials/application',
        },
        {
          id: 'guide/essentials/class-and-style',
          title: '类与样式',
          href: '/guide/guide/essentials/class-and-style',
        },
        {
          id: 'guide/essentials/component-basics',
          title: '组件基础',
          href: '/guide/guide/essentials/component-basics',
        },
        {
          id: 'guide/essentials/computed',
          title: '计算属性',
          href: '/guide/guide/essentials/computed',
        },
        {
          id: 'guide/essentials/conditional',
          title: '条件渲染',
          href: '/guide/guide/essentials/conditional',
        },
        {
          id: 'guide/essentials/event-handling',
          title: '事件处理',
          href: '/guide/guide/essentials/event-handling',
        },
        { id: 'guide/essentials/forms', title: '表单', href: '/guide/guide/essentials/forms' },
        {
          id: 'guide/essentials/lifecycle',
          title: '生命周期',
          href: '/guide/guide/essentials/lifecycle',
        },
        { id: 'guide/essentials/list', title: '列表', href: '/guide/guide/essentials/list' },
        {
          id: 'guide/essentials/reactivity-fundamentals',
          title: '响应式基础',
          href: '/guide/guide/essentials/reactivity-fundamentals',
        },
        {
          id: 'guide/essentials/template-refs',
          title: '模板引用',
          href: '/guide/guide/essentials/template-refs',
        },
        {
          id: 'guide/essentials/template-syntax',
          title: '模板语法',
          href: '/guide/guide/essentials/template-syntax',
        },
        {
          id: 'guide/essentials/watchers',
          title: '侦听',
          href: '/guide/guide/essentials/watchers',
        },
      ],
    },
    {
      id: 'guide/built-ins',
      title: '内置功能',
      items: [
        {
          id: 'guide/built-ins/keep-alive',
          title: 'KeepAlive',
          href: '/guide/guide/built-ins/keep-alive',
        },
        {
          id: 'guide/built-ins/suspense',
          title: 'Suspense',
          href: '/guide/guide/built-ins/suspense',
        },
        {
          id: 'guide/built-ins/teleport',
          title: 'Teleport',
          href: '/guide/guide/built-ins/teleport',
        },
        {
          id: 'guide/built-ins/transition-group',
          title: 'TransitionGroup',
          href: '/guide/guide/built-ins/transition-group',
        },
        {
          id: 'guide/built-ins/transition',
          title: 'Transition',
          href: '/guide/guide/built-ins/transition',
        },
      ],
    },
    {
      id: 'guide/components',
      title: '组件',
      items: [
        {
          id: 'guide/components/async',
          title: '异步组件',
          href: '/guide/guide/components/async',
        },
        { id: 'guide/components/attrs', title: '属性', href: '/guide/guide/components/attrs' },
        { id: 'guide/components/events', title: '事件', href: '/guide/guide/components/events' },
        { id: 'guide/components/props', title: 'Props', href: '/guide/guide/components/props' },
        {
          id: 'guide/components/provide-inject',
          title: '依赖注入',
          href: '/guide/guide/components/provide-inject',
        },
        {
          id: 'guide/components/registration',
          title: '注册',
          href: '/guide/guide/components/registration',
        },
        { id: 'guide/components/slots', title: '插槽', href: '/guide/guide/components/slots' },
        {
          id: 'guide/components/v-model',
          title: 'v-model',
          href: '/guide/guide/components/v-model',
        },
      ],
    },
    {
      id: 'guide/extras',
      title: '进阶',
      items: [
        { id: 'guide/extras/animation', title: '动画', href: '/guide/guide/extras/animation' },
        {
          id: 'guide/extras/composition-api-faq',
          title: '组合式 API 常见问题',
          href: '/guide/guide/extras/composition-api-faq',
        },
        {
          id: 'guide/extras/reactivity-in-depth',
          title: '响应式深入',
          href: '/guide/guide/extras/reactivity-in-depth',
        },
        {
          id: 'guide/extras/reactivity-transform',
          title: '响应式转换',
          href: '/guide/guide/extras/reactivity-transform',
        },
        {
          id: 'guide/extras/render-function',
          title: '渲染函数',
          href: '/guide/guide/extras/render-function',
        },
        {
          id: 'guide/extras/rendering-mechanism',
          title: '渲染机制',
          href: '/guide/guide/extras/rendering-mechanism',
        },
        {
          id: 'guide/extras/ways-of-using-vue',
          title: '使用方式',
          href: '/guide/guide/extras/ways-of-using-vue',
        },
        {
          id: 'guide/extras/web-components',
          title: 'Web 组件',
          href: '/guide/guide/extras/web-components',
        },
      ],
    },
    {
      id: 'guide/reusability',
      title: '复用性',
      items: [
        {
          id: 'guide/reusability/composables',
          title: '可组合函数',
          href: '/guide/guide/reusability/composables',
        },
        {
          id: 'guide/reusability/custom-directives',
          title: '自定义指令',
          href: '/guide/guide/reusability/custom-directives',
        },
        {
          id: 'guide/reusability/plugins',
          title: '插件',
          href: '/guide/guide/reusability/plugins',
        },
      ],
    },
    {
      id: 'guide/scaling-up',
      title: '扩展与进阶',
      items: [
        {
          id: 'guide/scaling-up/routing',
          title: '路由',
          href: '/guide/guide/scaling-up/routing',
        },
        { id: 'guide/scaling-up/sfc', title: '单文件组件', href: '/guide/guide/scaling-up/sfc' },
        { id: 'guide/scaling-up/ssr', title: '服务端渲染', href: '/guide/guide/scaling-up/ssr' },
        {
          id: 'guide/scaling-up/state-management',
          title: '状态管理',
          href: '/guide/guide/scaling-up/state-management',
        },
        {
          id: 'guide/scaling-up/testing',
          title: '测试',
          href: '/guide/guide/scaling-up/testing',
        },
        {
          id: 'guide/scaling-up/tooling',
          title: '工具链',
          href: '/guide/guide/scaling-up/tooling',
        },
      ],
    },
    {
      id: 'guide/best-practices',
      title: '最佳实践',
      items: [
        {
          id: 'guide/best-practices/accessibility',
          title: '无障碍',
          href: '/guide/guide/best-practices/accessibility',
        },
        {
          id: 'guide/best-practices/performance',
          title: '性能',
          href: '/guide/guide/best-practices/performance',
        },
        {
          id: 'guide/best-practices/production-deployment',
          title: '生产部署',
          href: '/guide/guide/best-practices/production-deployment',
        },
        {
          id: 'guide/best-practices/security',
          title: '安全',
          href: '/guide/guide/best-practices/security',
        },
      ],
    },
    {
      id: 'guide/typescript',
      title: 'TypeScript',
      items: [
        {
          id: 'guide/typescript/composition-api',
          title: '组合式 API',
          href: '/guide/guide/typescript/composition-api',
        },
        {
          id: 'guide/typescript/options-api',
          title: '选项式 API',
          href: '/guide/guide/typescript/options-api',
        },
        {
          id: 'guide/typescript/overview',
          title: '概览',
          href: '/guide/guide/typescript/overview',
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

  const currentType = 'guide'
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
