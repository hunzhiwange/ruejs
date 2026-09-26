import HomeSplitExamplePage from './createHomeSplitExamplePage'
import JSXArrayChildrenDemo from './home-demos/JSXArrayChildrenDemo'
import source from './home-demos/JSXArrayChildrenDemo.tsx?raw'

const JSXArrayChildren = () => (
  <HomeSplitExamplePage options={{ title: 'JSX 数组子节点', source }}>
    <JSXArrayChildrenDemo />
  </HomeSplitExamplePage>
)

export default JSXArrayChildren
