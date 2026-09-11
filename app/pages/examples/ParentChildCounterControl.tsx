import HomeSplitExamplePage from './createHomeSplitExamplePage'
import ParentChildCounterControlDemo from './home-demos/ParentChildCounterControlDemo'
import source from './home-demos/ParentChildCounterControlDemo.tsx?raw'

const ParentChildCounterControl = () => (
  <HomeSplitExamplePage
    options={{
      title: '父控子计数',
      source,
    }}
  >
    <ParentChildCounterControlDemo />
  </HomeSplitExamplePage>
)

export default ParentChildCounterControl
