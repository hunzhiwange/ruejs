import HomeSplitExamplePage from './createHomeSplitExamplePage'
import GlobalComponentRegistrationDemo from './home-demos/GlobalComponentRegistrationDemo'
import source from './home-demos/GlobalComponentRegistrationDemo.tsx?raw'

const GlobalComponentRegistration = () => (
  <HomeSplitExamplePage
    options={{
      title: 'useApp().component 运行时注册',
      source,
    }}
  >
    <GlobalComponentRegistrationDemo />
  </HomeSplitExamplePage>
)

export default GlobalComponentRegistration
