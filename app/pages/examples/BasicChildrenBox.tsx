import HomeSplitExamplePage from './createHomeSplitExamplePage'
import BasicChildrenBoxDemo from './home-demos/BasicChildrenBoxDemo'
import source from './home-demos/BasicChildrenBoxDemo.tsx?raw'

const BasicChildrenBox = () => (
  <HomeSplitExamplePage
    options={{
      title: '基础 children Box',
      source,
    }}
  >
    <BasicChildrenBoxDemo />
  </HomeSplitExamplePage>
)

export default BasicChildrenBox
