import HomeSplitExamplePage from './createHomeSplitExamplePage'
import ComponentVModelDemo from './home-demos/ComponentVModelDemo'
import source from './home-demos/ComponentVModelDemo.tsx?raw'

const ComponentVModel = () => (
  <HomeSplitExamplePage
    options={{
      title: '组件级 v-model',
      source,
    }}
  >
    <ComponentVModelDemo />
  </HomeSplitExamplePage>
)

export default ComponentVModel
