import HomeSplitExamplePage from './createHomeSplitExamplePage'
import ComponentSlotArrayDemo from './home-demos/ComponentSlotArrayDemo'
import source from './home-demos/ComponentSlotArrayDemo.tsx?raw'

const ComponentSlotArray = () => (
  <HomeSplitExamplePage options={{ title: '组件插槽中的 JSX 数组', source }}>
    <ComponentSlotArrayDemo />
  </HomeSplitExamplePage>
)

export default ComponentSlotArray
