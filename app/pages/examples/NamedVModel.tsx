import HomeSplitExamplePage from './createHomeSplitExamplePage'
import NamedVModelDemo from './home-demos/NamedVModelDemo'
import source from './home-demos/NamedVModelDemo.tsx?raw'

const NamedVModel = () => (
  <HomeSplitExamplePage
    options={{
      title: '命名 v-model',
      source,
    }}
  >
    <NamedVModelDemo />
  </HomeSplitExamplePage>
)

export default NamedVModel
