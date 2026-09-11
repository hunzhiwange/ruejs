import HomeSplitExamplePage from './createHomeSplitExamplePage'
import NestedChildrenBoxDemo from './home-demos/NestedChildrenBoxDemo'
import source from './home-demos/NestedChildrenBoxDemo.tsx?raw'

const NestedChildrenBox = () => (
  <HomeSplitExamplePage
    options={{
      title: '嵌套 children Box',
      source,
    }}
  >
    <NestedChildrenBoxDemo />
  </HomeSplitExamplePage>
)

export default NestedChildrenBox
