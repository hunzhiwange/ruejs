import HomeSplitExamplePage from './createHomeSplitExamplePage'
import InlineSelectListDemo from './home-demos/InlineSelectListDemo'
import source from './home-demos/InlineSelectListDemo.tsx?raw'

const InlineSelectList = () => (
  <HomeSplitExamplePage options={{ title: '内联列表下拉框', source }}>
    <InlineSelectListDemo />
  </HomeSplitExamplePage>
)

export default InlineSelectList
