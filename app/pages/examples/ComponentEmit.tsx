import HomeSplitExamplePage from './createHomeSplitExamplePage'
import ComponentEmitDemo from './home-demos/ComponentEmitDemo'
import source from './home-demos/ComponentEmitDemo.tsx?raw'

const ComponentEmit = () => (
  <HomeSplitExamplePage
    options={{
      title: '组件 emit',
      source,
    }}
  >
    <ComponentEmitDemo />
  </HomeSplitExamplePage>
)

export default ComponentEmit
