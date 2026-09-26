import HomeSplitExamplePage from './createHomeSplitExamplePage'
import UseStateReactCompatibilityDemo from './home-demos/UseStateReactCompatibilityDemo'
import source from './home-demos/UseStateReactCompatibilityDemo.tsx?raw'

const UseStateReactCompatibility = () => (
  <HomeSplitExamplePage options={{ title: 'React useState 兼容性验证', source }}>
    <UseStateReactCompatibilityDemo />
  </HomeSplitExamplePage>
)

export default UseStateReactCompatibility
