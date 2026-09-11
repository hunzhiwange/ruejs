import HomeSplitExamplePage from './createHomeSplitExamplePage'
import RenderCounterDemo from './home-demos/RenderCounterDemo'
import source from './home-demos/RenderCounterDemo.tsx?raw'

const RenderCounter = () => (
  <HomeSplitExamplePage
    options={{
      title: '渲染函数计数器',
      source,
    }}
  >
    <RenderCounterDemo />
  </HomeSplitExamplePage>
)

export default RenderCounter
