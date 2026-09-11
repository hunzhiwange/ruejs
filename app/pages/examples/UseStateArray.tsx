import HomeSplitExamplePage from './createHomeSplitExamplePage'
import UseStateArrayDemo from './home-demos/UseStateArrayDemo'
import source from './home-demos/UseStateArrayDemo.tsx?raw'

const UseStateArray = () => (
  <HomeSplitExamplePage
    options={{
      title: 'useState 数组',
      source,
    }}
  >
    <UseStateArrayDemo />
  </HomeSplitExamplePage>
)

export default UseStateArray
