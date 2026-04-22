import { useComponent } from '@rue-js/rue'
import { createRouter, createWebHashHistory } from '@rue-js/router'

type RouteRecord = { path: string; component: any }

const routes: RouteRecord[] = [
  { path: '/home', component: useComponent(() => import('../pages/Home')) },
  { path: '/about', component: useComponent(() => import('../pages/About')) },
  { path: '/posts', component: useComponent(() => import('../pages/PostsList')) },
  { path: '/posts/:id', component: useComponent(() => import('../pages/PostDetail')) },
  { path: '/use-cart', component: useComponent(() => import('../pages/UseCart')) },
  { path: '/vapor', component: useComponent(() => import('../pages/Vapor')) },
  { path: '/vapor-jsx', component: useComponent(() => import('../pages/VaporJSXDemo')) },
  { path: '/jsx', component: useComponent(() => import('../pages/jsx/Index')) },
  {
    path: '/jsx/basic-elements',
    component: useComponent(() => import('../pages/jsx/BasicElements')),
  },
  { path: '/jsx/expressions', component: useComponent(() => import('../pages/jsx/Expressions')) },
  {
    path: '/jsx/attributes-and-props',
    component: useComponent(() => import('../pages/jsx/AttributesAndProps')),
  },
  { path: '/jsx/spread-props', component: useComponent(() => import('../pages/jsx/SpreadProps')) },
  {
    path: '/jsx/conditional-rendering',
    component: useComponent(() => import('../pages/jsx/ConditionalRendering')),
  },
  {
    path: '/jsx/lists-and-keys',
    component: useComponent(() => import('../pages/jsx/ListsAndKeys')),
  },
  { path: '/jsx/fragments', component: useComponent(() => import('../pages/jsx/Fragments')) },
  { path: '/jsx/children', component: useComponent(() => import('../pages/jsx/Children')) },
  { path: '/jsx/components', component: useComponent(() => import('../pages/jsx/Components')) },
  { path: '/jsx/events', component: useComponent(() => import('../pages/jsx/Events')) },
  {
    path: '/jsx/controlled-inputs',
    component: useComponent(() => import('../pages/jsx/ControlledInputs')),
  },
  { path: '/jsx/refs', component: useComponent(() => import('../pages/jsx/Refs')) },
  {
    path: '/examples/hello-world',
    component: useComponent(() => import('../pages/examples/HelloWorld')),
  },
  {
    path: '/examples/handling-input',
    component: useComponent(() => import('../pages/examples/HandlingInput')),
  },
  {
    path: '/examples/attribute-bindings',
    component: useComponent(() => import('../pages/examples/AttributeBindings')),
  },
  {
    path: '/examples/conditionals-and-loops',
    component: useComponent(() => import('../pages/examples/ConditionalsAndLoops')),
  },
  {
    path: '/examples/form-bindings',
    component: useComponent(() => import('../pages/examples/FormBindings')),
  },
  {
    path: '/examples/simple-component',
    component: useComponent(() => import('../pages/examples/SimpleComponent')),
  },
  {
    path: '/examples/fetching-data',
    component: useComponent(() => import('../pages/examples/FetchingData')),
  },
  {
    path: '/examples/markdown-editor',
    component: useComponent(() => import('../pages/examples/MarkdownEditor')),
  },
  {
    path: '/examples/sort-filter-grid',
    component: useComponent(() => import('../pages/examples/SortFilterGrid')),
  },
  {
    path: '/examples/tree-view',
    component: useComponent(() => import('../pages/examples/TreeView')),
  },
  {
    path: '/examples/svg-graph',
    component: useComponent(() => import('../pages/examples/SVGGraph')),
  },
  { path: '/examples/modal', component: useComponent(() => import('../pages/examples/Modal')) },
  {
    path: '/examples/list-transition',
    component: useComponent(() => import('../pages/examples/ListTransition')),
  },
  { path: '/rust-canvas', component: useComponent(() => import('../pages/RustCanvasDemo')) },
  { path: '/rust-wgpu', component: useComponent(() => import('../pages/RustWebGpuDemo')) },
  {
    path: '/rust-wgpu-vertex-animation',
    component: useComponent(() => import('../pages/RustWGpuDemo')),
  },
  { path: '/rust-layers', component: useComponent(() => import('../pages/RustLayerManagerDemo')) },
  { path: '/rust-game-wgpu', component: useComponent(() => import('../pages/RustGameWGpuDemo')) },
  { path: '/design/button', component: useComponent(() => import('../pages/design/Button')) },
  { path: '/design/tabs', component: useComponent(() => import('../pages/design/Tabs')) },
  { path: '/design/alert', component: useComponent(() => import('../pages/design/Alert')) },
  { path: '/design/card', component: useComponent(() => import('../pages/design/Card')) },
  { path: '/design/collapse', component: useComponent(() => import('../pages/design/Collapse')) },
  { path: '/design/countdown', component: useComponent(() => import('../pages/design/Countdown')) },
  {
    path: '/design/hover-gallery',
    component: useComponent(() => import('../pages/design/HoverGallery')),
  },
  { path: '/design/kbd', component: useComponent(() => import('../pages/design/Kbd')) },
  { path: '/design/list', component: useComponent(() => import('../pages/design/List')) },
  { path: '/design/table', component: useComponent(() => import('../pages/design/Table')) },
  { path: '/design/chat', component: useComponent(() => import('../pages/design/Chat')) },
  { path: '/design/badge', component: useComponent(() => import('../pages/design/Badge')) },
  { path: '/design/divider', component: useComponent(() => import('../pages/design/Divider')) },
  { path: '/design/diff', component: useComponent(() => import('../pages/design/Diff')) },
  { path: '/design/carousel', component: useComponent(() => import('../pages/design/Carousel')) },
  { path: '/design/footer', component: useComponent(() => import('../pages/design/Footer')) },
  { path: '/design/accordion', component: useComponent(() => import('../pages/design/Accordion')) },
  { path: '/design/avatar', component: useComponent(() => import('../pages/design/Avatar')) },
  { path: '/design/hover-3d', component: useComponent(() => import('../pages/design/Hover3D')) },
  { path: '/design/timeline', component: useComponent(() => import('../pages/design/Timeline')) },
  {
    path: '/design/text-rotate',
    component: useComponent(() => import('../pages/design/TextRotate')),
  },
  { path: '/design/status', component: useComponent(() => import('../pages/design/Status')) },
  { path: '/design/stat', component: useComponent(() => import('../pages/design/Stat')) },
  {
    path: '/design/breadcrumbs',
    component: useComponent(() => import('../pages/design/Breadcrumbs')),
  },
  { path: '/design/link', component: useComponent(() => import('../pages/design/Link')) },
  { path: '/design/dock', component: useComponent(() => import('../pages/design/Dock')) },
  { path: '/design/menu', component: useComponent(() => import('../pages/design/Menu')) },
  { path: '/e2e/tdz', component: useComponent(() => import('../pages/e2e/TDZMemo')) },
  { path: '/', component: useComponent(() => import('../pages/site/SiteHome')) },
  {
    path: '/guide/:path(.*)',
    component: useComponent(() => import('../pages/site/GuideDocDetail')),
  },
  { path: '/api/:path(.*)', component: useComponent(() => import('../pages/site/ApiDocDetail')) },
  { path: '/page/:path(.*)', component: useComponent(() => import('../pages/site/PageDocDetail')) },
  { path: '/plugins', component: useComponent(() => import('../pages/site/PluginsIndex')) },
  { path: '/page', component: useComponent(() => import('../pages/site/DocsIndex')) },
  { path: '/report-data1', component: useComponent(() => import('../pages/report-data1/index')) },
  {
    path: '/report-bi-arch',
    component: useComponent(() => import('../pages/report-bi-arch/index')),
  },
]

export default createRouter({
  history: createWebHashHistory(),
  routes: routes,
})
