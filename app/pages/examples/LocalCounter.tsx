import HomeSplitExamplePage from './createHomeSplitExamplePage'
import LocalCounterDemo from './home-demos/LocalCounterDemo'
import source from './home-demos/LocalCounterDemo.tsx?raw'

const LocalCounter = () => (
  <HomeSplitExamplePage
    options={{
      title: '本地 ref 计数器',
      source,
    }}
  >
    <LocalCounterDemo />
  </HomeSplitExamplePage>
)

export default LocalCounter
