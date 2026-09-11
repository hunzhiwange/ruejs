import HomeSplitExamplePage from './createHomeSplitExamplePage'
import ReactStyleConditionalDemo from './home-demos/ReactStyleConditionalDemo'
import source from './home-demos/ReactStyleConditionalDemo.tsx?raw'

const ReactStyleConditional = () => (
  <HomeSplitExamplePage
    options={{
      title: '条件渲染',
      source,
    }}
  >
    <ReactStyleConditionalDemo />
  </HomeSplitExamplePage>
)

export default ReactStyleConditional
