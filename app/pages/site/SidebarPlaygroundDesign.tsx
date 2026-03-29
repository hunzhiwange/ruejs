import { type FC, useState, computed } from '@rue-js/rue'
import { extend } from '@rue-js/shared'
import { RouterLink, useRoute } from '@rue-js/router'

type Item = { id: string; title: string; href?: string; children?: Item[] }
type Section = { id: string; title: string; items: Item[] }

export const SECTIONS_BY_TYPE: Record<'design', Section[]> = {
  design: [
    {
      id: 'design1',
      title: '操作',
      items: [
        {
          id: 'button',
          title: '按钮',
          href: '/design/button',
        },
      ],
    },
    {
      id: 'design5',
      title: '数据展示',
      items: [
        {
          id: 'card',
          title: '卡片',
          href: '/design/card',
        },
        {
          id: 'collapse',
          title: '折叠面板',
          href: '/design/collapse',
        },
        {
          id: 'countdown',
          title: '倒计时',
          href: '/design/countdown',
        },
        {
          id: 'chat',
          title: '聊天',
          href: '/design/chat',
        },
        {
          id: 'diff',
          title: '对比',
          href: '/design/diff',
        },
        {
          id: 'carousel',
          title: '跑马灯',
          href: '/design/carousel',
        },
        {
          id: 'badge',
          title: '徽标',
          href: '/design/badge',
        },
        {
          id: 'avatar',
          title: '头像',
          href: '/design/avatar',
        },
        {
          id: 'accordion',
          title: '手风琴',
          href: '/design/accordion',
        },
        {
          id: 'hover-3d',
          title: '悬浮 3D',
          href: '/design/hover-3d',
        },
        {
          id: 'hover-gallery',
          title: '悬浮画廊',
          href: '/design/hover-gallery',
        },
        {
          id: 'kbd',
          title: '键盘提示',
          href: '/design/kbd',
        },
        {
          id: 'list',
          title: '列表',
          href: '/design/list',
        },
        {
          id: 'table',
          title: '表格',
          href: '/design/table',
        },
        {
          id: 'timeline',
          title: '时间线',
          href: '/design/timeline',
        },
        {
          id: 'text-rotate',
          title: '文本轮播',
          href: '/design/text-rotate',
        },
        {
          id: 'status',
          title: '状态',
          href: '/design/status',
        },
        {
          id: 'stat',
          title: '统计',
          href: '/design/stat',
        },
      ],
    },
    {
      id: 'design4',
      title: '导航',
      items: [
        {
          id: 'link',
          title: '链接',
          href: '/design/link',
        },
        {
          id: 'tabs',
          title: '选项卡',
          href: '/design/tabs',
        },
        {
          id: 'breadcrumbs',
          title: '面包屑',
          href: '/design/breadcrumbs',
        },
        {
          id: 'dock',
          title: '底部栏',
          href: '/design/dock',
        },
        {
          id: 'menu',
          title: '菜单',
          href: '/design/menu',
        },
      ],
    },
    {
      id: 'design2',
      title: '反馈',
      items: [
        {
          id: 'alert',
          title: '警告',
          href: '/design/alert',
        },
      ],
    },
    {
      id: 'design3',
      title: '布局',
      items: [
        {
          id: 'divider',
          title: '分隔线',
          href: '/design/divider',
        },
        {
          id: 'footer',
          title: '页脚',
          href: '/design/footer',
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

  const currentType = 'design'
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
