import HomeSplitExamplePage from './createHomeSplitExamplePage'
import StoreQuerySyncDemo from './home-demos/StoreQuerySyncDemo'
import source from './home-demos/StoreQuerySyncDemo.tsx?raw'

const StoreQuerySync = () => (
  <HomeSplitExamplePage
    options={{
      title: 'Store Query Sync 与 URL 状态',
      source,
      codeCardClassName: 'h-[520px] md:h-[1220px]',
    }}
  >
    <StoreQuerySyncDemo />
  </HomeSplitExamplePage>
)

export default StoreQuerySync
