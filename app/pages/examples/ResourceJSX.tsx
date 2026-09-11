import HomeSplitExamplePage from './createHomeSplitExamplePage'
import ResourceJSXDemo from './home-demos/ResourceJSXDemo'
import source from './home-demos/ResourceJSXDemo.tsx?raw'

const ResourceJSX = () => (
  <HomeSplitExamplePage
    options={{
      title: '资源（纯 JSX，移植自 SolidJS）',
      source,
      codeCardClassName: 'h-[420px] md:h-[900px]',
    }}
  >
    <ResourceJSXDemo />
  </HomeSplitExamplePage>
)

export default ResourceJSX
