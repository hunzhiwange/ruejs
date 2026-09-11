import HomeSplitExamplePage from './createHomeSplitExamplePage'
import UseStateObjectDemo from './home-demos/UseStateObjectDemo'
import source from './home-demos/UseStateObjectDemo.tsx?raw'

const UseStateObject = () => (
  <HomeSplitExamplePage
    options={{
      title: 'useState 对象',
      source,
    }}
  >
    <UseStateObjectDemo />
  </HomeSplitExamplePage>
)

export default UseStateObject
