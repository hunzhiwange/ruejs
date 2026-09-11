import HomeSplitExamplePage from './createHomeSplitExamplePage'
import EditableUserProfileDemo from './home-demos/EditableUserProfileDemo'
import source from './home-demos/EditableUserProfileDemo.tsx?raw'

const EditableUserProfile = () => (
  <HomeSplitExamplePage
    options={{
      title: '用户资料编辑',
      source,
    }}
  >
    <EditableUserProfileDemo />
  </HomeSplitExamplePage>
)

export default EditableUserProfile
