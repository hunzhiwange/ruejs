import HomeSplitExamplePage from './createHomeSplitExamplePage'
import LayoutChildrenDemo from './home-demos/LayoutChildrenDemo'
import source from './home-demos/LayoutChildrenDemo.tsx?raw'

const LayoutChildren = () => (
  <HomeSplitExamplePage
    options={{
      title: 'Layout children',
      source,
    }}
  >
    <LayoutChildrenDemo />
  </HomeSplitExamplePage>
)

export default LayoutChildren
