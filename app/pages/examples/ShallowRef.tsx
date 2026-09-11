import HomeSplitExamplePage from './createHomeSplitExamplePage'
import ShallowRefDemo from './home-demos/ShallowRefDemo'
import source from './home-demos/ShallowRefDemo.tsx?raw'

const ShallowRef = () => (
  <HomeSplitExamplePage
    options={{
      title: 'shallowRef 浅层 ref',
      source,
    }}
  >
    <ShallowRefDemo />
  </HomeSplitExamplePage>
)

export default ShallowRef
