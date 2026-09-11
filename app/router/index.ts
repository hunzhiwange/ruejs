import {
  createRouter,
  createWebHistory,
  useAsyncRouteComponent,
  type HistoryLike,
  type RouteComponentLoader,
  type RouteRecordRaw,
} from '@rue-js/router'
import { routerDemoLabEnabled } from '../pages/examples/router-demo/state'

export const routeComponent = (loader: RouteComponentLoader) => useAsyncRouteComponent(loader)

const loadRouterDemoScene = () => import('../pages/examples/router-demo/RouterDemoScene')

const AsyncRouterDemoGuideShell = routeComponent(async () => ({
  default: (await loadRouterDemoScene()).RouterDemoGuideShell,
}))

const AsyncRouterDemoTopicPage = routeComponent(async () => ({
  default: (await loadRouterDemoScene()).RouterDemoTopicPage,
}))

const AsyncRouterDemoLabPage = routeComponent(async () => ({
  default: (await loadRouterDemoScene()).RouterDemoLabPage,
}))

const AsyncDesignRouteLayout = routeComponent(async () => ({
  default: (await import('../pages/site/SidebarPlaygroundDesign')).DesignRouteLayout,
}))

const AsyncExamplesRouteLayout = routeComponent(async () => ({
  default: (await import('../pages/site/SidebarPlaygroundExample')).ExamplesRouteLayout,
}))

const AsyncGuideRouteLayout = routeComponent(async () => ({
  default: (await import('../pages/site/SidebarPlaygroundGuide')).GuideRouteLayout,
}))

const AsyncApiRouteLayout = routeComponent(async () => ({
  default: (await import('../pages/site/SidebarPlaygroundApi')).ApiRouteLayout,
}))

const flatRoutes: RouteRecordRaw[] = [
  { path: '/jsx', component: routeComponent(() => import('../pages/jsx/Index')) },
  {
    path: '/jsx/basic-elements',
    component: routeComponent(() => import('../pages/jsx/BasicElements')),
  },
  { path: '/jsx/expressions', component: routeComponent(() => import('../pages/jsx/Expressions')) },
  {
    path: '/jsx/attributes-and-props',
    component: routeComponent(() => import('../pages/jsx/AttributesAndProps')),
  },
  { path: '/design/space', component: routeComponent(() => import('../pages/design/Space')) },
  {
    path: '/design/auto-complete',
    component: routeComponent(() => import('../pages/design/AutoComplete')),
  },
  { path: '/design/select', component: routeComponent(() => import('../pages/design/Select')) },
  { path: '/design/tree', component: routeComponent(() => import('../pages/design/Tree')) },
  {
    path: '/design/tree-select',
    component: routeComponent(() => import('../pages/design/TreeSelect')),
  },
  {
    path: '/design/time-picker',
    component: routeComponent(() => import('../pages/design/TimePicker')),
  },
  {
    path: '/design/color-picker',
    component: routeComponent(() => import('../pages/design/ColorPicker')),
  },
  {
    path: '/design/descriptions',
    component: routeComponent(() => import('../pages/design/Descriptions')),
  },
  { path: '/design/qr-code', component: routeComponent(() => import('../pages/design/QRCode')) },
  {
    path: '/design/segmented',
    component: routeComponent(() => import('../pages/design/Segmented')),
  },
  { path: '/design/transfer', component: routeComponent(() => import('../pages/design/Transfer')) },
  { path: '/design/tour', component: routeComponent(() => import('../pages/design/Tour')) },
  {
    path: '/design/skeleton',
    component: routeComponent(() => import('../pages/design/Skeleton')),
  },
  { path: '/design/flex', component: routeComponent(() => import('../pages/design/Flex')) },
  { path: '/design/splitter', component: routeComponent(() => import('../pages/design/Splitter')) },
  { path: '/design/stack', component: routeComponent(() => import('../pages/design/Stack')) },
  { path: '/design/steps', component: routeComponent(() => import('../pages/design/Steps')) },
  { path: '/design/swap', component: routeComponent(() => import('../pages/design/Swap')) },
  {
    path: '/jsx/spread-props',
    component: routeComponent(() => import('../pages/jsx/SpreadProps')),
  },
  {
    path: '/jsx/conditional-rendering',
    component: routeComponent(() => import('../pages/jsx/ConditionalRendering')),
  },
  {
    path: '/jsx/v-if-r-if',
    component: routeComponent(() => import('../pages/jsx/VIfAndRIf')),
  },
  {
    path: '/jsx/v-show-r-show',
    component: routeComponent(() => import('../pages/jsx/VShowAndRShow')),
  },
  {
    path: '/jsx/v-pre-r-pre',
    component: routeComponent(() => import('../pages/jsx/VPreAndRPre')),
  },
  {
    path: '/jsx/v-once-r-once',
    component: routeComponent(() => import('../pages/jsx/VOnceAndROnce')),
  },
  {
    path: '/jsx/v-memo-r-memo',
    component: routeComponent(() => import('../pages/jsx/VMemoAndRMemo')),
  },
  {
    path: '/jsx/v-text-r-text',
    component: routeComponent(() => import('../pages/jsx/VTextAndRText')),
  },
  {
    path: '/jsx/v-html-r-html',
    component: routeComponent(() => import('../pages/jsx/VHtmlAndRHtml')),
  },
  {
    path: '/jsx/v-on-r-on',
    component: routeComponent(() => import('../pages/jsx/VOnAndROn')),
  },
  {
    path: '/jsx/v-model-r-model',
    component: routeComponent(() => import('../pages/jsx/VModelAndRModel')),
  },
  {
    path: '/jsx/lists-and-keys',
    component: routeComponent(() => import('../pages/jsx/ListsAndKeys')),
  },
  {
    path: '/jsx/v-for-r-for',
    component: routeComponent(() => import('../pages/jsx/VForAndRFor')),
  },
  {
    path: '/jsx/template',
    component: routeComponent(() => import('../pages/jsx/TemplateDemo')),
  },
  {
    path: '/jsx/scoped-style',
    component: routeComponent(() => import('../pages/jsx/ScopedStyle')),
  },
  { path: '/jsx/fragments', component: routeComponent(() => import('../pages/jsx/Fragments')) },
  { path: '/jsx/children', component: routeComponent(() => import('../pages/jsx/Children')) },
  { path: '/jsx/components', component: routeComponent(() => import('../pages/jsx/Components')) },
  {
    path: '/jsx/dynamic-component',
    component: routeComponent(() => import('../pages/jsx/DynamicComponent')),
  },
  {
    path: '/jsx/suspense',
    component: routeComponent(() => import('../pages/jsx/SuspenseDemo')),
  },
  {
    path: '/jsx/async-hydration',
    component: routeComponent(() => import('../pages/jsx/AsyncHydrationDemo')),
  },
  {
    path: '/jsx/keep-alive',
    component: routeComponent(() => import('../pages/jsx/KeepAliveDemo')),
  },
  { path: '/jsx/events', component: routeComponent(() => import('../pages/jsx/Events')) },
  {
    path: '/jsx/controlled-inputs',
    component: routeComponent(() => import('../pages/jsx/ControlledInputs')),
  },
  { path: '/jsx/refs', component: routeComponent(() => import('../pages/jsx/Refs')) },
  {
    path: '/examples/hello-world',
    component: routeComponent(() => import('../pages/examples/HelloWorld')),
  },
  {
    path: '/examples/on-deactivated',
    component: routeComponent(() => import('../pages/examples/OnDeactivated')),
  },
  {
    path: '/examples/reactive-counter',
    component: routeComponent(() => import('../pages/examples/ReactiveCounter')),
  },
  // 响应式工具 API 示例，保持与侧边栏中 ref/signal 相关条目顺序一致。
  {
    path: '/examples/signal-values',
    component: routeComponent(() => import('../pages/examples/ToRefs')),
  },
  {
    path: '/examples/signal-path',
    component: routeComponent(() => import('../pages/examples/ToRef')),
  },
  {
    path: '/examples/is-ref',
    component: routeComponent(() => import('../pages/examples/IsRef')),
  },
  {
    path: '/examples/shallow-ref',
    component: routeComponent(() => import('../pages/examples/ShallowRef')),
  },
  {
    path: '/examples/trigger-ref',
    component: routeComponent(() => import('../pages/examples/TriggerRef')),
  },
  {
    path: '/examples/on-activated',
    component: routeComponent(() => import('../pages/examples/OnActivatedDemo')),
  },
  {
    path: '/examples/proxy-free-state',
    component: routeComponent(() => import('../pages/examples/IsProxy')),
  },
  {
    path: '/examples/computed-readonly',
    component: routeComponent(() => import('../pages/examples/IsReadonly')),
  },
  {
    path: '/examples/next-tick',
    component: routeComponent(() => import('../pages/examples/NextTick')),
  },
  // 保留仍位于编译期能力面的 scope 与渲染调试示例。
  {
    path: '/examples/on-scope-dispose',
    component: routeComponent(() => import('../pages/examples/OnScopeDispose')),
  },
  {
    path: '/examples/render-counter',
    component: routeComponent(() => import('../pages/examples/RenderCounter')),
  },
  {
    path: '/examples/on-render-triggered',
    component: routeComponent(() => import('../pages/examples/OnRenderTriggered')),
  },
  {
    path: '/examples/use-state-counter',
    component: routeComponent(() => import('../pages/examples/UseStateCounter')),
  },
  {
    path: '/examples/basic-todo-list',
    component: routeComponent(() => import('../pages/examples/BasicTodoList')),
  },
  {
    path: '/examples/editable-user-profile',
    component: routeComponent(() => import('../pages/examples/EditableUserProfile')),
  },
  {
    path: '/examples/map-list-rendering',
    component: routeComponent(() => import('../pages/examples/MapListRendering')),
  },
  {
    path: '/examples/react-style-conditional',
    component: routeComponent(() => import('../pages/examples/ReactStyleConditional')),
  },
  {
    path: '/examples/compiled-control-flow',
    component: routeComponent(
      () => import('../pages/examples/compiled-control-flow/CompiledControlFlowDemo'),
    ),
  },
  {
    path: '/examples/child-to-parent-notify',
    component: routeComponent(() => import('../pages/examples/ChildToParentNotify')),
  },
  {
    path: '/examples/parent-child-counter-control',
    component: routeComponent(() => import('../pages/examples/ParentChildCounterControl')),
  },
  {
    path: '/examples/component-v-model',
    component: routeComponent(() => import('../pages/examples/ComponentVModel')),
  },
  {
    path: '/examples/named-v-model',
    component: routeComponent(() => import('../pages/examples/NamedVModel')),
  },
  {
    path: '/examples/component-emit',
    component: routeComponent(() => import('../pages/examples/ComponentEmit')),
  },
  {
    path: '/examples/use-state-array',
    component: routeComponent(() => import('../pages/examples/UseStateArray')),
  },
  {
    path: '/examples/use-state-object',
    component: routeComponent(() => import('../pages/examples/UseStateObject')),
  },
  {
    path: '/examples/local-counter',
    component: routeComponent(() => import('../pages/examples/LocalCounter')),
  },
  {
    path: '/examples/local-todo-list',
    component: routeComponent(() => import('../pages/examples/LocalTodoList')),
  },
  {
    path: '/examples/hello-children',
    component: routeComponent(() => import('../pages/examples/HelloChildren')),
  },
  {
    path: '/examples/basic-children-box',
    component: routeComponent(() => import('../pages/examples/BasicChildrenBox')),
  },
  {
    path: '/examples/nested-children-box',
    component: routeComponent(() => import('../pages/examples/NestedChildrenBox')),
  },
  {
    path: '/examples/layout-children',
    component: routeComponent(() => import('../pages/examples/LayoutChildren')),
  },
  {
    path: '/examples/handling-input',
    component: routeComponent(() => import('../pages/examples/HandlingInput')),
  },
  {
    path: '/examples/attribute-bindings',
    component: routeComponent(() => import('../pages/examples/AttributeBindings')),
  },
  {
    path: '/examples/conditionals-and-loops',
    component: routeComponent(() => import('../pages/examples/ConditionalsAndLoops')),
  },
  {
    path: '/examples/form-bindings',
    component: routeComponent(() => import('../pages/examples/FormBindings')),
  },
  {
    path: '/examples/simple-component',
    component: routeComponent(() => import('../pages/examples/SimpleComponent')),
  },
  {
    path: '/examples/global-component-registration',
    component: routeComponent(() => import('../pages/examples/GlobalComponentRegistration')),
  },
  {
    path: '/examples/on-error-captured',
    component: routeComponent(() => import('../pages/examples/OnErrorCaptured')),
  },
  {
    path: '/examples/reactive-props-destructure',
    component: routeComponent(() => import('../pages/examples/ReactivePropsDestructure')),
  },
  {
    path: '/examples/props-setup-boundary',
    component: routeComponent(() => import('../pages/examples/PropsSetupBoundary')),
  },
  {
    path: '/examples/slots',
    component: routeComponent(() => import('../pages/examples/Slots')),
  },
  {
    path: '/examples/web-components',
    component: routeComponent(() => import('../pages/examples/WebComponents')),
  },
  {
    path: '/examples/web-components-lab',
    component: routeComponent(() => import('../pages/examples/WebComponentFeatureLab')),
  },
  {
    path: '/examples/fetching-data',
    component: routeComponent(() => import('../pages/examples/FetchingData')),
  },
  {
    path: '/examples/on-server-prefetch',
    component: routeComponent(() => import('../pages/examples/OnServerPrefetch')),
  },
  {
    path: '/examples/resources',
    component: routeComponent(() => import('../pages/examples/ResourceDemo')),
  },
  {
    path: '/examples/resources-jsx',
    component: routeComponent(() => import('../pages/examples/ResourceJSX')),
  },
  {
    path: '/examples/context',
    component: routeComponent(() => import('../pages/examples/Context')),
  },
  {
    path: '/examples/i18n-switcher',
    component: routeComponent(() => import('../pages/examples/I18nSwitcher')),
  },
  {
    path: '/examples/router-demo',
    component: routeComponent(() => import('../pages/examples/RouterDemo')),
    meta: { demo: 'router', surface: 'examples' },
    children: [
      {
        path: '',
        redirect: { name: 'router-demo-topic', params: { section: 'router', topic: 'overview' } },
      },
      {
        path: 'guide/:section(router|data)',
        component: AsyncRouterDemoGuideShell,
        meta: { layer: 'guide-shell' },
        children: [
          {
            path: '',
            redirect: to => ({
              name: 'router-demo-topic',
              params: {
                section: to?.params.section || 'router',
                topic: 'overview',
              },
            }),
          },
          {
            path: ':topic',
            name: 'router-demo-topic',
            component: AsyncRouterDemoTopicPage,
            meta: { layer: 'topic-leaf' },
          },
        ],
      },
      {
        path: 'lab',
        name: 'router-demo-lab',
        component: AsyncRouterDemoLabPage,
        meta: { layer: 'lab-leaf', gated: true },
        beforeEnter: () => {
          if (routerDemoLabEnabled.value) {
            return
          }

          return { name: 'router-demo-topic', params: { section: 'router', topic: 'guards' } }
        },
      },
    ],
  },
  {
    path: '/examples/todo-app',
    component: routeComponent(() => import('../pages/examples/TodoApp')),
  },
  {
    path: '/examples/markdown-editor',
    component: routeComponent(() => import('../pages/examples/MarkdownEditor')),
  },
  {
    path: '/examples/sort-filter-grid',
    component: routeComponent(() => import('../pages/examples/SortFilterGrid')),
  },
  {
    path: '/examples/store-query-sync',
    component: routeComponent(() => import('../pages/examples/StoreQuerySync')),
  },
  {
    path: '/examples/tree-view',
    component: routeComponent(() => import('../pages/examples/TreeView')),
  },
  {
    path: '/examples/svg-graph',
    component: routeComponent(() => import('../pages/examples/SVGGraph')),
  },
  {
    path: '/examples/svg-shared-namespace',
    component: routeComponent(() => import('../pages/examples/SVGSharedNamespace')),
  },
  { path: '/examples/modal', component: routeComponent(() => import('../pages/examples/Modal')) },
  {
    path: '/examples/transition-mode',
    component: routeComponent(() => import('../pages/examples/TransitionMode')),
  },
  {
    path: '/examples/list-transition',
    component: routeComponent(() => import('../pages/examples/ListTransition')),
  },
  { path: '/design/button', component: routeComponent(() => import('../pages/design/Button')) },
  { path: '/design/anchor', component: routeComponent(() => import('../pages/design/Anchor')) },
  { path: '/design/affix', component: routeComponent(() => import('../pages/design/Affix')) },
  {
    path: '/design/typography',
    component: routeComponent(() => import('../pages/design/Typography')),
  },
  { path: '/design/tabs', component: routeComponent(() => import('../pages/design/Tabs')) },
  { path: '/design/alert', component: routeComponent(() => import('../pages/design/Alert')) },
  { path: '/design/result', component: routeComponent(() => import('../pages/design/Result')) },
  { path: '/design/empty', component: routeComponent(() => import('../pages/design/Empty')) },
  { path: '/design/card', component: routeComponent(() => import('../pages/design/Card')) },
  { path: '/design/calendar', component: routeComponent(() => import('../pages/design/Calendar')) },
  { path: '/design/collapse', component: routeComponent(() => import('../pages/design/Collapse')) },
  {
    path: '/design/countdown',
    component: routeComponent(() => import('../pages/design/Countdown')),
  },
  {
    path: '/design/descriptions',
    component: routeComponent(() => import('../pages/design/Descriptions')),
  },
  {
    path: '/design/hover-gallery',
    component: routeComponent(() => import('../pages/design/HoverGallery')),
  },
  { path: '/design/kbd', component: routeComponent(() => import('../pages/design/Kbd')) },
  { path: '/design/list', component: routeComponent(() => import('../pages/design/List')) },
  { path: '/design/table', component: routeComponent(() => import('../pages/design/Table')) },
  { path: '/design/chat', component: routeComponent(() => import('../pages/design/Chat')) },
  { path: '/design/checkbox', component: routeComponent(() => import('../pages/design/Checkbox')) },
  { path: '/design/badge', component: routeComponent(() => import('../pages/design/Badge')) },
  { path: '/design/divider', component: routeComponent(() => import('../pages/design/Divider')) },
  { path: '/design/diff', component: routeComponent(() => import('../pages/design/Diff')) },
  { path: '/design/carousel', component: routeComponent(() => import('../pages/design/Carousel')) },
  { path: '/design/dropdown', component: routeComponent(() => import('../pages/design/Dropdown')) },
  { path: '/design/fab', component: routeComponent(() => import('../pages/design/Fab')) },
  { path: '/design/modal', component: routeComponent(() => import('../pages/design/Modal')) },
  { path: '/design/footer', component: routeComponent(() => import('../pages/design/Footer')) },
  { path: '/design/fieldset', component: routeComponent(() => import('../pages/design/Fieldset')) },
  { path: '/design/form', component: routeComponent(() => import('../pages/design/Form')) },
  {
    path: '/design/file-input',
    component: routeComponent(() => import('../pages/design/FileInput')),
  },
  { path: '/design/filter', component: routeComponent(() => import('../pages/design/Filter')) },
  { path: '/design/grid', component: routeComponent(() => import('../pages/design/Grid')) },
  { path: '/design/masonry', component: routeComponent(() => import('../pages/design/Masonry')) },
  { path: '/design/drawer', component: routeComponent(() => import('../pages/design/Drawer')) },
  { path: '/design/hero', component: routeComponent(() => import('../pages/design/Hero')) },
  {
    path: '/design/indicator',
    component: routeComponent(() => import('../pages/design/Indicator')),
  },
  { path: '/design/input', component: routeComponent(() => import('../pages/design/Input')) },
  {
    path: '/design/input-number',
    component: routeComponent(() => import('../pages/design/InputNumber')),
  },
  { path: '/design/join', component: routeComponent(() => import('../pages/design/Join')) },
  { path: '/design/layout', component: routeComponent(() => import('../pages/design/Layout')) },
  { path: '/design/label', component: routeComponent(() => import('../pages/design/Label')) },
  { path: '/design/loading', component: routeComponent(() => import('../pages/design/Loading')) },
  { path: '/design/mask', component: routeComponent(() => import('../pages/design/Mask')) },
  {
    path: '/design/mockup-browser',
    component: routeComponent(() => import('../pages/design/MockupBrowser')),
  },
  {
    path: '/design/mockup-code',
    component: routeComponent(() => import('../pages/design/MockupCode')),
  },
  {
    path: '/design/mockup-phone',
    component: routeComponent(() => import('../pages/design/MockupPhone')),
  },
  {
    path: '/design/mockup-window',
    component: routeComponent(() => import('../pages/design/MockupWindow')),
  },
  { path: '/design/navbar', component: routeComponent(() => import('../pages/design/Navbar')) },
  {
    path: '/design/pagination',
    component: routeComponent(() => import('../pages/design/Pagination')),
  },
  {
    path: '/design/accordion',
    component: routeComponent(() => import('../pages/design/Accordion')),
  },
  { path: '/design/avatar', component: routeComponent(() => import('../pages/design/Avatar')) },
  { path: '/design/hover-3d', component: routeComponent(() => import('../pages/design/Hover3D')) },
  { path: '/design/timeline', component: routeComponent(() => import('../pages/design/Timeline')) },
  {
    path: '/design/text-rotate',
    component: routeComponent(() => import('../pages/design/TextRotate')),
  },
  { path: '/design/status', component: routeComponent(() => import('../pages/design/Status')) },
  { path: '/design/stat', component: routeComponent(() => import('../pages/design/Stat')) },
  { path: '/design/progress', component: routeComponent(() => import('../pages/design/Progress')) },
  {
    path: '/design/radial-progress',
    component: routeComponent(() => import('../pages/design/RadialProgress')),
  },
  { path: '/design/radio', component: routeComponent(() => import('../pages/design/Radio')) },
  { path: '/design/range', component: routeComponent(() => import('../pages/design/Range')) },
  { path: '/design/rating', component: routeComponent(() => import('../pages/design/Rating')) },
  {
    path: '/design/breadcrumbs',
    component: routeComponent(() => import('../pages/design/Breadcrumbs')),
  },
  { path: '/design/link', component: routeComponent(() => import('../pages/design/Link')) },
  { path: '/design/dock', component: routeComponent(() => import('../pages/design/Dock')) },
  { path: '/design/menu', component: routeComponent(() => import('../pages/design/Menu')) },
  { path: '/design/mentions', component: routeComponent(() => import('../pages/design/Mentions')) },
  { path: '/design/textarea', component: routeComponent(() => import('../pages/design/Textarea')) },
  {
    path: '/design/theme-controller',
    component: routeComponent(() => import('../pages/design/ThemeController')),
  },
  {
    path: '/design/message',
    component: routeComponent(() => import('../pages/design/Message')),
  },
  {
    path: '/design/notification',
    component: routeComponent(() => import('../pages/design/Notification')),
  },
  { path: '/design/toast', component: routeComponent(() => import('../pages/design/Toast')) },
  { path: '/design/toggle', component: routeComponent(() => import('../pages/design/Toggle')) },
  {
    path: '/design/popconfirm',
    component: routeComponent(() => import('../pages/design/Popconfirm')),
  },
  { path: '/design/popover', component: routeComponent(() => import('../pages/design/Popover')) },
  { path: '/design/tooltip', component: routeComponent(() => import('../pages/design/Tooltip')) },
  {
    path: '/design/watermark',
    component: routeComponent(() => import('../pages/design/Watermark')),
  },
  {
    path: '/design/validator',
    component: routeComponent(() => import('../pages/design/Validator')),
  },
  {
    path: '/design/:slug',
    component: routeComponent(() => import('../pages/design/DesignPlaceholder')),
  },
  { path: '/e2e/tdz', component: routeComponent(() => import('../pages/e2e/TDZMemo')) },
  {
    path: '/e2e/router-unmount-a',
    component: routeComponent(() => import('../pages/e2e/RouterUnmountProbeA')),
  },
  {
    path: '/e2e/router-unmount-b',
    component: routeComponent(() => import('../pages/e2e/RouterUnmountProbeB')),
  },
  {
    path: '/',
    component: routeComponent(() => import('../pages/site/SiteHome')),
    meta: { clientMode: 'app' },
  },
  {
    path: '/textjs',
    component: routeComponent(() => import('../pages/TextJs')),
    meta: { clientMode: 'app' },
  },
  {
    path: '/settings',
    component: routeComponent(() => import('../pages/site/SiteSettings')),
    meta: { clientMode: 'app' },
  },
  {
    path: '/guide/:path(.*)',
    component: routeComponent(() => import('../pages/site/GuideDocDetail')),
  },
  { path: '/api/:path(.*)', component: routeComponent(() => import('../pages/site/ApiDocDetail')) },
  {
    path: '/page/:path(.*)',
    component: routeComponent(() => import('../pages/site/PageDocDetail')),
  },
  {
    path: '/plugins',
    component: routeComponent(() => import('../pages/site/PluginsIndex')),
    meta: { clientMode: 'app' },
  },
  {
    path: '/page',
    component: routeComponent(() => import('../pages/site/DocsIndex')),
    meta: { clientMode: 'app' },
  },
  {
    path: '/report-data1',
    component: routeComponent(() => import('../pages/report-data1/index')),
    meta: { clientMode: 'app' },
  },
  {
    path: '/report-bi-arch',
    component: routeComponent(() => import('../pages/report-bi-arch/index')),
    meta: { clientMode: 'app' },
  },
]

type SidebarRouteGroup = {
  path: string
  component: RouteRecordRaw['component']
  layoutId: string
  clientMode?: 'none' | 'app'
  redirect?: RouteRecordRaw['redirect']
}

const foldSidebarPlaygroundRoutes = (
  sourceRoutes: RouteRecordRaw[],
  groups: SidebarRouteGroup[],
): RouteRecordRaw[] => {
  const groupEntries = groups.map(group => ({
    group,
    prefix: `${group.path}/`,
    childRoutes: (group.redirect
      ? [
          {
            path: '',
            redirect: group.redirect,
          } as RouteRecordRaw,
        ]
      : []) as RouteRecordRaw[],
    seenChildPaths: new Set<string>(),
  }))
  const nonSidebarRoutes: RouteRecordRaw[] = []

  sourceRoutes.forEach(route => {
    const entry = groupEntries.find(({ group, prefix }) => {
      return route.path === group.path || route.path.startsWith(prefix)
    })

    if (!entry) {
      nonSidebarRoutes.push(route)
      return
    }

    const childPath = route.path === entry.group.path ? '' : route.path.slice(entry.prefix.length)
    if (entry.seenChildPaths.has(childPath)) {
      return
    }

    entry.seenChildPaths.add(childPath)
    entry.childRoutes.push({
      ...route,
      path: childPath,
    })
  })

  return [
    ...nonSidebarRoutes,
    ...groupEntries.map(({ group, childRoutes }) => ({
      path: group.path,
      component: group.component,
      meta: {
        sidebarPlaygroundLayout: group.layoutId,
        ...(group.clientMode ? { clientMode: group.clientMode } : {}),
      },
      children: childRoutes,
    })),
  ]
}

export const routes = foldSidebarPlaygroundRoutes(flatRoutes, [
  {
    path: '/design',
    component: AsyncDesignRouteLayout,
    layoutId: 'design',
    clientMode: 'app',
    redirect: '/design/button',
  },
  {
    path: '/examples',
    component: AsyncExamplesRouteLayout,
    layoutId: 'examples',
    clientMode: 'app',
  },
  {
    path: '/jsx',
    component: AsyncExamplesRouteLayout,
    layoutId: 'examples',
    clientMode: 'app',
  },
  {
    path: '/guide',
    component: AsyncGuideRouteLayout,
    layoutId: 'guide',
  },
  {
    path: '/api',
    component: AsyncApiRouteLayout,
    layoutId: 'api',
  },
])

export const createAppRouter = (history: HistoryLike = createWebHistory()) =>
  createRouter({
    history,
    routes,
  })
