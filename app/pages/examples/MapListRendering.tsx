import HomeSplitExamplePage from './createHomeSplitExamplePage'
import MapListRenderingDemo from './home-demos/MapListRenderingDemo'
import source from './home-demos/MapListRenderingDemo.tsx?raw'

const MapListRendering = () => (
  <HomeSplitExamplePage
    options={{
      title: 'map 列表渲染',
      source,
    }}
  >
    <MapListRenderingDemo />
  </HomeSplitExamplePage>
)

export default MapListRendering
