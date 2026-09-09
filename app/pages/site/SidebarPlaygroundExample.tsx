import { type FC } from '@rue-js/rue'
import { RouterView, useRoute } from '@rue-js/router'
import { resolveStaticRenderPath, useStaticRenderContext } from '../../staticRenderContext'
import {
  createPersistentSidebarPlayground,
  type SidebarSection,
} from './persistentSidebarPlayground'

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

const isTestEnvironment = (): boolean => {
  return (
    import.meta.env?.MODE === 'test' ||
    import.meta.env?.VITEST === true ||
    import.meta.env?.VITEST === 'true' ||
    !!(globalThis as any).vitest
  )
}

const SIDEBAR_LAYOUT_META = 'examples'

const useInsideSidebarRouteLayout = (): boolean => {
  try {
    const route = useRoute()
    const routeData = route.get() as any
    return !!routeData?.matched?.some(
      (record: any) => record?.meta?.sidebarPlaygroundLayout === SIDEBAR_LAYOUT_META,
    )
  } catch {
    return false
  }
}

export const SECTIONS_BY_TYPE: Record<'examples', SidebarSection[]> = {
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
          id: 'compiled-control-flow',
          title: 'Compiled 顶层控制流',
          href: '/examples/compiled-control-flow',
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
          id: 'global-component-registration',
          title: 'useApp().component 注册',
          href: '/examples/global-component-registration',
        },
        {
          id: 'reactive-props-destructure',
          title: 'Reactive Props Destructure',
          href: '/examples/reactive-props-destructure',
        },
        {
          id: 'props-setup-boundary',
          title: 'Props 与 useSetup',
          href: '/examples/props-setup-boundary',
        },
        {
          id: 'slots',
          title: 'Slots 插槽',
          href: '/examples/slots',
        },
        {
          id: 'web-components',
          title: '原生 Web Components',
          href: '/examples/web-components',
        },
        {
          id: 'web-components-lab',
          title: 'Web Components 分项测试',
          href: '/examples/web-components-lab',
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
          id: 'v-if-r-if',
          title: 'v-if / r-if 指令',
          href: '/jsx/v-if-r-if',
        },
        {
          id: 'v-show-r-show',
          title: 'v-show / r-show 指令',
          href: '/jsx/v-show-r-show',
        },
        {
          id: 'v-pre-r-pre',
          title: 'v-pre / r-pre 指令',
          href: '/jsx/v-pre-r-pre',
        },
        {
          id: 'v-once-r-once',
          title: 'v-once / r-once 指令',
          href: '/jsx/v-once-r-once',
        },
        {
          id: 'v-memo-r-memo',
          title: 'v-memo / r-memo 指令',
          href: '/jsx/v-memo-r-memo',
        },
        {
          id: 'v-text-r-text',
          title: 'v-text / r-text 指令',
          href: '/jsx/v-text-r-text',
        },
        {
          id: 'v-html-r-html',
          title: 'v-html / r-html 指令',
          href: '/jsx/v-html-r-html',
        },
        {
          id: 'v-on-r-on',
          title: 'v-on / r-on 指令',
          href: '/jsx/v-on-r-on',
        },
        {
          id: 'v-model-r-model',
          title: 'v-model / r-model 指令',
          href: '/jsx/v-model-r-model',
        },
        {
          id: 'lists-and-keys',
          title: '列表渲染与 key',
          href: '/jsx/lists-and-keys',
        },
        {
          id: 'v-for-r-for',
          title: 'v-for / r-for 指令',
          href: '/jsx/v-for-r-for',
        },
        {
          id: 'template',
          title: 'Template 无包装容器',
          href: '/jsx/template',
        },
        {
          id: 'scoped-style',
          title: 'Scoped Style 组件作用域样式',
          href: '/jsx/scoped-style',
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
        {
          id: 'dynamic-component',
          title: '动态组件（Component）',
          href: '/jsx/dynamic-component',
        },
        {
          id: 'suspense',
          title: 'Suspense 异步边界',
          href: '/jsx/suspense',
        },
        {
          id: 'async-hydration',
          title: '异步组件懒水合',
          href: '/jsx/async-hydration',
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
          id: 'on-server-prefetch',
          title: '服务端预取',
          href: '/examples/on-server-prefetch',
        },
        {
          id: 'resources',
          title: '资源',
          href: '/examples/resources',
        },
        {
          id: 'resources-jsx',
          title: '资源（纯 JSX）',
          href: '/examples/resources-jsx',
        },
        {
          id: 'rue-islands',
          title: 'Rue Islands 总览',
          href: '/examples/rue-islands',
        },
        {
          id: 'rue-islands-load',
          title: 'Island：client:load',
          href: '/examples/rue-islands/load',
        },
        {
          id: 'rue-islands-idle',
          title: 'Island：client:idle',
          href: '/examples/rue-islands/idle',
        },
        {
          id: 'rue-islands-visible',
          title: 'Island：client:visible',
          href: '/examples/rue-islands/visible',
        },
        {
          id: 'rue-islands-media',
          title: 'Island：client:media',
          href: '/examples/rue-islands/media',
        },
        {
          id: 'rue-islands-interaction',
          title: 'Island：client:interaction',
          href: '/examples/rue-islands/interaction',
        },
        {
          id: 'rue-islands-none',
          title: 'Island：client:none',
          href: '/examples/rue-islands/none',
        },
        {
          id: 'rue-islands-only',
          title: 'Island：client:only',
          href: '/examples/rue-islands/only',
        },
        {
          id: 'rue-islands-props',
          title: 'Island：安全 Props',
          href: '/examples/rue-islands/props',
        },
        {
          id: 'rue-islands-manifest',
          title: 'Island：Manifest Props',
          href: '/examples/rue-islands/manifest',
        },
        {
          id: 'rue-islands-compiler',
          title: 'Island：client:* 编译',
          href: '/examples/rue-islands/compiler',
        },
        {
          id: 'context',
          title: 'Context',
          href: '/examples/context',
        },
        {
          id: 'i18n-switcher',
          title: '语言切换（_ 模型）',
          href: '/examples/i18n-switcher',
        },
        {
          id: 'router-demo-overview',
          title: '路由 Demo：总览（嵌套路由）',
          href: '/examples/router-demo/guide/router/overview',
        },
        {
          id: 'router-demo-guards',
          title: '路由 Demo：守卫（beforeEnter）',
          href: '/examples/router-demo/guide/router/guards',
        },
        {
          id: 'router-demo-lab',
          title: '路由 Demo：实验页（受守卫保护）',
          href: '/examples/router-demo/lab',
        },
        {
          id: 'reactive-counter',
          title: '基础计数器',
          href: '/examples/reactive-counter',
        },
        {
          id: 'shallow-ref',
          title: 'shallowRef 浅层 ref',
          href: '/examples/shallow-ref',
        },
        // 响应式高级 API 示例集中放在浅层 ref 与 nextTick 之间，便于按能力递进浏览。
        {
          id: 'trigger-ref',
          title: 'triggerRef 手动触发',
          href: '/examples/trigger-ref',
        },
        {
          id: 'custom-ref',
          title: 'customRef 自定义 ref',
          href: '/examples/custom-ref',
        },
        {
          id: 'on-activated',
          title: 'onActivated 缓存生命周期',
          href: '/examples/on-activated',
        },
        {
          id: 'signal-path',
          title: 'Signal 路径读写',
          href: '/examples/signal-path',
        },
        {
          id: 'signal-values',
          title: '独立 Signal 与派生值',
          href: '/examples/signal-values',
        },
        {
          id: 'is-ref',
          title: 'isRef 判定示例',
          href: '/examples/is-ref',
        },
        {
          id: 'proxy-free-state',
          title: '无代理状态模型',
          href: '/examples/proxy-free-state',
        },
        {
          id: 'computed-readonly',
          title: '只读派生值',
          href: '/examples/computed-readonly',
        },
        {
          id: 'next-tick',
          title: 'nextTick 真实业务场景',
          href: '/examples/next-tick',
        },
        // 调度、scope 与渲染调试示例紧邻 nextTick，突出它们都依赖 effect 执行时机。
        {
          id: 'watch-post-effect',
          title: 'watchPostEffect DOM 读取',
          href: '/examples/watch-post-effect',
        },
        {
          id: 'watch-sync-effect',
          title: 'watchSyncEffect 同步防线',
          href: '/examples/watch-sync-effect',
        },
        {
          id: 'on-watcher-cleanup',
          title: 'onWatcherCleanup 请求清理',
          href: '/examples/on-watcher-cleanup',
        },
        {
          id: 'effect-scope',
          title: 'effectScope 批量停止',
          href: '/examples/effect-scope',
        },
        {
          id: 'on-scope-dispose',
          title: 'onScopeDispose 作用域清理',
          href: '/examples/on-scope-dispose',
        },
        {
          id: 'get-current-scope',
          title: 'getCurrentScope 作用域探针',
          href: '/examples/get-current-scope',
        },
        {
          id: 'render-counter',
          title: '渲染函数计数器',
          href: '/examples/render-counter',
        },
        {
          id: 'on-render-tracked',
          title: 'onRenderTracked 调试',
          href: '/examples/on-render-tracked',
        },
        {
          id: 'on-render-triggered',
          title: 'onRenderTriggered 调试',
          href: '/examples/on-render-triggered',
        },
        {
          id: 'on-deactivated',
          title: 'onDeactivated',
          href: '/examples/on-deactivated',
        },
        {
          id: 'on-error-captured',
          title: 'onErrorCaptured 错误捕获',
          href: '/examples/on-error-captured',
        },
        {
          id: 'use-state-counter',
          title: 'useState 计数器',
          href: '/examples/use-state-counter',
        },
        {
          id: 'react-style-conditional',
          title: '条件渲染',
          href: '/examples/react-style-conditional',
        },
        {
          id: 'map-list-rendering',
          title: 'map 列表渲染',
          href: '/examples/map-list-rendering',
        },
        {
          id: 'todo-app',
          title: 'Todo 应用',
          href: '/examples/todo-app',
        },
        {
          id: 'basic-todo-list',
          title: '基础待办事项',
          href: '/examples/basic-todo-list',
        },
        {
          id: 'local-todo-list',
          title: '本地待办事项',
          href: '/examples/local-todo-list',
        },
        {
          id: 'editable-user-profile',
          title: '用户资料编辑',
          href: '/examples/editable-user-profile',
        },
        {
          id: 'use-state-array',
          title: 'useState 数组',
          href: '/examples/use-state-array',
        },
        {
          id: 'use-state-object',
          title: 'useState 对象',
          href: '/examples/use-state-object',
        },
        {
          id: 'local-counter',
          title: '本地 ref 计数器',
          href: '/examples/local-counter',
        },
        {
          id: 'sort-filter-grid',
          title: '排序、筛选与网格',
          href: '/examples/sort-filter-grid',
        },
        {
          id: 'store-query-sync',
          title: 'Store Query Sync 与 URL 状态',
          href: '/examples/store-query-sync',
        },
        { id: 'tree-view', title: '树状视图', href: '/examples/tree-view' },
        { id: 'svg-graph', title: 'SVG 图表', href: '/examples/svg-graph' },
        {
          id: 'svg-shared-namespace',
          title: 'SVG 共享标签命名空间',
          href: '/examples/svg-shared-namespace',
        },
        { id: 'modal', title: '带过渡动效的模态框', href: '/examples/modal' },
        {
          id: 'transition-mode',
          title: 'Transition mode',
          href: '/examples/transition-mode',
        },
        {
          id: 'child-to-parent-notify',
          title: '子调父方法',
          href: '/examples/child-to-parent-notify',
        },
        {
          id: 'parent-child-counter-control',
          title: '父控子计数',
          href: '/examples/parent-child-counter-control',
        },
        {
          id: 'component-v-model',
          title: '组件级 v-model',
          href: '/examples/component-v-model',
        },
        {
          id: 'named-v-model',
          title: '命名 v-model',
          href: '/examples/named-v-model',
        },
        {
          id: 'component-emit',
          title: '组件 emit',
          href: '/examples/component-emit',
        },
        {
          id: 'hello-children',
          title: 'Hello children',
          href: '/examples/hello-children',
        },
        {
          id: 'basic-children-box',
          title: '基础 children Box',
          href: '/examples/basic-children-box',
        },
        {
          id: 'nested-children-box',
          title: '嵌套 children Box',
          href: '/examples/nested-children-box',
        },
        {
          id: 'layout-children',
          title: 'Layout children',
          href: '/examples/layout-children',
        },
        {
          id: 'list-transition',
          title: '过渡动效',
          href: '/examples/list-transition',
        },
      ],
    },
  ],
}

const TEST_SECTIONS: SidebarSection[] = [
  {
    id: 'examples-test',
    title: '基础',
    items: [
      {
        id: 'demo',
        title: 'useState 计数器',
        href: '/examples/demo',
      },
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
        id: 'signal-values',
        title: '独立 Signal 与派生值',
        href: '/examples/signal-values',
      },
      {
        id: 'attribute-bindings',
        title: 'Attribute 绑定',
        href: '/examples/attribute-bindings',
      },
      {
        id: 'i18n-switcher',
        title: '语言切换（_ 模型）',
        href: '/examples/i18n-switcher',
      },
      {
        id: 'router-demo-overview',
        title: '路由 Demo 总览',
        href: '/examples/router-demo/guide/router/overview',
      },
      {
        id: 'store-query-sync',
        title: 'Store Query Sync 与 URL 状态',
        href: '/examples/store-query-sync',
      },
    ],
  },
]

const activeSections = isTestEnvironment() ? TEST_SECTIONS : SECTIONS_BY_TYPE.examples

const BaseSidebarPlayground = createPersistentSidebarPlayground({
  sections: activeSections,
  showCounts: true,
  wrapperClassName: 'sidebar-playground-examples',
  fallbackToRoute: false,
})

const RouteSidebarPlayground = createPersistentSidebarPlayground({
  sections: activeSections,
  showCounts: true,
  wrapperClassName: 'sidebar-playground-examples',
})

type SidebarPlaygroundProps = {
  currentPath?: string
}

const SidebarPlayground: FC<SidebarPlaygroundProps> = props => {
  if (useInsideSidebarRouteLayout()) {
    return <>{props.children}</>
  }

  const initialCurrentPath = useInitialCurrentPath()

  return (
    <BaseSidebarPlayground currentPath={props.currentPath ?? initialCurrentPath}>
      {props.children}
    </BaseSidebarPlayground>
  )
}

export const ExamplesRouteLayout: FC = () => {
  const initialCurrentPath = useInitialCurrentPath()

  return (
    <RouteSidebarPlayground
      currentPath={import.meta.env.SSR && initialCurrentPath ? initialCurrentPath : undefined}
    >
      <RouterView />
    </RouteSidebarPlayground>
  )
}

export default SidebarPlayground
