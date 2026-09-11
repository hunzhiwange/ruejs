import HomeSplitExamplePage from './createHomeSplitExamplePage'
import UseStateCounterDemo from './home-demos/UseStateCounterDemo'
import source from './home-demos/UseStateCounterDemo.tsx?raw'

const UseStateCounter = () => (
  <HomeSplitExamplePage
    options={{
      title: 'useState 计数器',
      source,
    }}
  >
    <UseStateCounterDemo />
  </HomeSplitExamplePage>
)

export default UseStateCounter
