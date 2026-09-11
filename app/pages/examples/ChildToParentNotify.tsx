import HomeSplitExamplePage from './createHomeSplitExamplePage'
import ChildToParentNotifyDemo from './home-demos/ChildToParentNotifyDemo'
import source from './home-demos/ChildToParentNotifyDemo.tsx?raw'

const ChildToParentNotify = () => (
  <HomeSplitExamplePage
    options={{
      title: '子调父方法',
      source,
    }}
  >
    <ChildToParentNotifyDemo />
  </HomeSplitExamplePage>
)

export default ChildToParentNotify
