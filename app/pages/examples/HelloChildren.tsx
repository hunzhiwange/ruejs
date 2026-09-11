import HomeSplitExamplePage from './createHomeSplitExamplePage'
import HelloChildrenDemo from './home-demos/HelloChildrenDemo'
import source from './home-demos/HelloChildrenDemo.tsx?raw'

const HelloChildren = () => (
  <HomeSplitExamplePage
    options={{
      title: 'Hello children',
      source,
    }}
  >
    <HelloChildrenDemo />
  </HomeSplitExamplePage>
)

export default HelloChildren
