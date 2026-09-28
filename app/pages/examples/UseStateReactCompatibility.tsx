import HomeSplitExamplePage from './createHomeSplitExamplePage'
import UseStateReactCompatibilityDemo from './home-demos/UseStateReactCompatibilityDemo'
import source from './home-demos/UseStateReactCompatibilityDemo.tsx?raw'

const UseStateReactCompatibility = () => (
  <HomeSplitExamplePage options={{ title: 'useState 与局部快照', source }}>
    <UseStateReactCompatibilityDemo />
  </HomeSplitExamplePage>
)

export default UseStateReactCompatibility
