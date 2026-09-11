import { type FC, onUnmounted, useRef } from '@rue-js/rue'
import { RouterView } from '@rue-js/router'
import { extend } from '@rue-js/shared'
import { resolveStaticRenderPath, useStaticRenderContext } from '../../staticRenderContext'
import { type SidebarSection, PersistentSidebarPlayground } from './persistentSidebarPlayground'

const readCurrentHashPath = (): string => {
  const hash = globalThis.location?.hash || ''
  if (hash.startsWith('#')) {
    return hash.slice(1) || '/'
  }
  return hash || globalThis.location?.pathname || ''
}

const useInitialCurrentPath = (): string => {
  const staticRenderContext = useStaticRenderContext()

  return import.meta.env.SSR
    ? resolveStaticRenderPath(staticRenderContext?.url)
    : readCurrentHashPath()
}

const withDesignHrefs = (sections: SidebarSection[]): SidebarSection[] => {
  return sections.map(section =>
    extend(section, {
      items: section.items.map(item => {
        if (item.href || item.children?.length) {
          return item
        }
        return extend(item, { href: `/design/${item.id}` })
      }),
    }),
  )
}

export const SECTIONS_BY_TYPE: Record<'design', SidebarSection[]> = {
  design: withDesignHrefs([
    {
      id: 'design1',
      title: '操作 Actions',
      items: [
        {
          id: 'button',
          title: '按钮 Button',
          href: '/design/button',
        },
        {
          id: 'typography',
          title: '排版 Typography',
          href: '/design/typography',
        },
        {
          id: 'time-picker',
          title: '时间选择器 TimePicker',
          href: '/design/time-picker',
        },
        {
          id: 'dropdown',
          title: '下拉菜单 Dropdown',
        },
        {
          id: 'fab',
          title: '悬浮操作按钮 FAB',
        },
        {
          id: 'modal',
          title: '模态框 Modal',
        },
        {
          id: 'swap',
          title: '切换 Swap',
        },
        {
          id: 'theme-controller',
          title: '主题控制器 Theme Controller',
        },
      ],
    },
    {
      id: 'design2',
      title: '数据展示 Data Display',
      items: [
        {
          id: 'accordion',
          title: '手风琴 Accordion',
          href: '/design/accordion',
        },
        {
          id: 'avatar',
          title: '头像 Avatar',
          href: '/design/avatar',
        },
        {
          id: 'badge',
          title: '徽标 Badge',
          href: '/design/badge',
        },
        {
          id: 'card',
          title: '卡片 Card',
          href: '/design/card',
        },
        {
          id: 'carousel',
          title: '轮播 Carousel',
          href: '/design/carousel',
        },
        {
          id: 'chat',
          title: '聊天气泡 Chat',
          href: '/design/chat',
        },
        {
          id: 'collapse',
          title: '折叠面板 Collapse',
          href: '/design/collapse',
        },
        {
          id: 'countdown',
          title: '倒计时 Countdown',
          href: '/design/countdown',
        },
        {
          id: 'descriptions',
          title: '描述列表 Descriptions',
          href: '/design/descriptions',
        },
        {
          id: 'diff',
          title: '对比 Diff',
          href: '/design/diff',
        },
        {
          id: 'qr-code',
          title: '二维码 QRCode',
        },
        {
          id: 'hover-3d',
          title: '悬浮 3D 卡片 Hover 3D',
          href: '/design/hover-3d',
        },
        {
          id: 'hover-gallery',
          title: '悬浮画廊 Hover Gallery',
          href: '/design/hover-gallery',
        },
        {
          id: 'kbd',
          title: '键盘提示 Kbd',
          href: '/design/kbd',
        },
        {
          id: 'list',
          title: '列表 List',
          href: '/design/list',
        },
        {
          id: 'stat',
          title: '统计 Stat',
          href: '/design/stat',
        },
        {
          id: 'status',
          title: '状态 Status',
          href: '/design/status',
        },
        {
          id: 'table',
          title: '表格 Table',
          href: '/design/table',
        },
        {
          id: 'text-rotate',
          title: '文本轮播 Text Rotate',
          href: '/design/text-rotate',
        },
        {
          id: 'timeline',
          title: '时间线 Timeline',
          href: '/design/timeline',
        },
      ],
    },
    {
      id: 'design3',
      title: '导航 Navigation',
      items: [
        {
          id: 'anchor',
          title: '锚点 Anchor',
          href: '/design/anchor',
        },
        {
          id: 'affix',
          title: '固钉 Affix',
          href: '/design/affix',
        },
        {
          id: 'breadcrumbs',
          title: '面包屑 Breadcrumbs',
          href: '/design/breadcrumbs',
        },
        {
          id: 'dock',
          title: '底部导航 Dock',
          href: '/design/dock',
        },
        {
          id: 'link',
          title: '链接 Link',
          href: '/design/link',
        },
        {
          id: 'menu',
          title: '菜单 Menu',
          href: '/design/menu',
        },
        {
          id: 'navbar',
          title: '导航栏 Navbar',
        },
        {
          id: 'pagination',
          title: '分页 Pagination',
        },
        {
          id: 'steps',
          title: '步骤 Steps',
        },
        {
          id: 'tabs',
          title: '选项卡 Tabs',
          href: '/design/tabs',
        },
      ],
    },
    {
      id: 'design4',
      title: '反馈 Feedback',
      items: [
        {
          id: 'alert',
          title: '提示 Alert',
          href: '/design/alert',
        },
        {
          id: 'result',
          title: '结果页 Result',
          href: '/design/result',
        },
        {
          id: 'empty',
          title: '空状态 Empty',
        },
        {
          id: 'loading',
          title: '加载 Loading',
        },
        {
          id: 'message',
          title: '全局提示 Message',
          href: '/design/message',
        },
        {
          id: 'progress',
          title: '进度条 Progress',
        },
        {
          id: 'radial-progress',
          title: '环形进度 Radial Progress',
        },
        {
          id: 'skeleton',
          title: '骨架屏 Skeleton',
        },
        {
          id: 'notification',
          title: '通知提醒框 Notification',
        },
        {
          id: 'toast',
          title: '轻提示 Toast',
        },
        {
          id: 'popconfirm',
          title: '气泡确认框 Popconfirm',
        },
        {
          id: 'popover',
          title: '气泡卡片 Popover',
        },
        {
          id: 'tooltip',
          title: '工具提示 Tooltip',
        },
      ],
    },
    {
      id: 'design5',
      title: '数据输入 Data Input',
      items: [
        {
          id: 'calendar',
          title: '日历 Calendar',
          href: '/design/calendar',
        },
        {
          id: 'color-picker',
          title: '颜色选择器 ColorPicker',
          href: '/design/color-picker',
        },
        {
          id: 'checkbox',
          title: '复选框 Checkbox',
        },
        {
          id: 'fieldset',
          title: '字段集 Fieldset',
        },
        {
          id: 'form',
          title: '表单 Form',
          href: '/design/form',
        },
        {
          id: 'file-input',
          title: '文件输入 File Input',
        },
        {
          id: 'filter',
          title: '筛选器 Filter',
        },
        {
          id: 'label',
          title: '标签 Label',
        },
        {
          id: 'radio',
          title: '单选框 Radio',
        },
        {
          id: 'range',
          title: '范围选择 Range',
        },
        {
          id: 'rating',
          title: '评分 Rating',
        },
        {
          id: 'segmented',
          title: '分段选择 Segmented',
          href: '/design/segmented',
        },
        {
          id: 'auto-complete',
          title: '自动完成 AutoComplete',
          href: '/design/auto-complete',
        },
        {
          id: 'select',
          title: '选择器 Select',
        },
        {
          id: 'tree-select',
          title: '树选择 TreeSelect',
        },
        {
          id: 'tree',
          title: '树控件 Tree',
          href: '/design/tree',
        },
        {
          id: 'mentions',
          title: '提及输入 Mentions',
        },
        {
          id: 'transfer',
          title: '穿梭框 Transfer',
          href: '/design/transfer',
        },
        {
          id: 'tour',
          title: '漫游引导 Tour',
          href: '/design/tour',
        },
        {
          id: 'input',
          title: '输入框 Input',
        },
        {
          id: 'input-number',
          title: '数字输入 InputNumber',
        },
        {
          id: 'textarea',
          title: '文本域 Textarea',
        },
        {
          id: 'toggle',
          title: '开关 Toggle',
        },
        {
          id: 'validator',
          title: '校验器 Validator',
        },
      ],
    },
    {
      id: 'design6',
      title: '布局 Layout',
      items: [
        {
          id: 'divider',
          title: '分隔线 Divider',
          href: '/design/divider',
        },
        {
          id: 'flex',
          title: '弹性布局 Flex',
          href: '/design/flex',
        },
        {
          id: 'splitter',
          title: '分割面板 Splitter',
          href: '/design/splitter',
        },
        {
          id: 'drawer',
          title: '抽屉侧边栏 Drawer',
        },
        {
          id: 'footer',
          title: '页脚 Footer',
          href: '/design/footer',
        },
        {
          id: 'grid',
          title: '栅格 Grid',
          href: '/design/grid',
        },
        {
          id: 'masonry',
          title: '瀑布流 Masonry',
          href: '/design/masonry',
        },
        {
          id: 'layout',
          title: '布局 Layout',
          href: '/design/layout',
        },
        {
          id: 'hero',
          title: '主视觉区 Hero',
        },
        {
          id: 'indicator',
          title: '指示器 Indicator',
        },
        {
          id: 'join',
          title: '组合项 Join',
        },
        {
          id: 'mask',
          title: '蒙版 Mask',
        },
        {
          id: 'watermark',
          title: '水印 Watermark',
        },
        {
          id: 'space',
          title: '间距 Space',
        },
        {
          id: 'stack',
          title: '堆叠 Stack',
        },
      ],
    },
    {
      id: 'design7',
      title: '样机 Mockup',
      items: [
        {
          id: 'mockup-browser',
          title: '浏览器样机 Mockup Browser',
        },
        {
          id: 'mockup-code',
          title: '代码样机 Mockup Code',
        },
        {
          id: 'mockup-phone',
          title: '手机样机 Mockup Phone',
        },
        {
          id: 'mockup-window',
          title: '窗口样机 Mockup Window',
        },
      ],
    },
  ]),
}

const BaseSidebarPlayground: FC<{ currentPath?: string }> = props => (
  <PersistentSidebarPlayground
    sections={SECTIONS_BY_TYPE.design}
    showCounts
    fallbackToRoute={false}
    currentPath={props.currentPath}
  >
    {props.children}
  </PersistentSidebarPlayground>
)

const RouteSidebarPlayground: FC<{ currentPath?: string }> = props => (
  <PersistentSidebarPlayground
    sections={SECTIONS_BY_TYPE.design}
    showCounts
    currentPath={props.currentPath}
  >
    {props.children}
  </PersistentSidebarPlayground>
)

let activeDesignRouteLayoutCount = 0

const SidebarPlayground: FC = props => {
  if (activeDesignRouteLayoutCount > 0) {
    return <>{props.children}</>
  }

  const initialCurrentPath = useInitialCurrentPath()

  return (
    <BaseSidebarPlayground currentPath={initialCurrentPath}>{props.children}</BaseSidebarPlayground>
  )
}

export const DesignRouteLayout: FC = () => {
  const registeredRef = useRef(false)
  const initialCurrentPath = useInitialCurrentPath()

  if (!registeredRef.current) {
    registeredRef.current = true
    activeDesignRouteLayoutCount += 1
  }

  onUnmounted(() => {
    if (!registeredRef.current) {
      return
    }

    registeredRef.current = false
    activeDesignRouteLayoutCount = Math.max(0, activeDesignRouteLayoutCount - 1)
  })

  return (
    <RouteSidebarPlayground
      currentPath={import.meta.env.SSR && initialCurrentPath ? initialCurrentPath : undefined}
    >
      <RouterView />
    </RouteSidebarPlayground>
  )
}

export default SidebarPlayground
