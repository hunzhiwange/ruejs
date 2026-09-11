import HomeSplitExamplePage from './createHomeSplitExamplePage'
import RouterDemoScene from './router-demo/RouterDemoScene'
import source from './router-demo/RouterDemoScene.tsx?raw'

const RouterDemo = () => (
  <HomeSplitExamplePage
    options={{
      title: '路由（嵌套 / 命名路由 / 守卫）',
      source,
      codeCardClassName: 'h-[560px] md:h-[1850px]',
    }}
  >
    <RouterDemoScene />
  </HomeSplitExamplePage>
)

export default RouterDemo
