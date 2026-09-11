import HomeSplitExamplePage from './createHomeSplitExamplePage'
import ContextDemo from './home-demos/ContextDemo'
import source from './home-demos/ContextDemo.tsx?raw'

const Context = () => (
  <HomeSplitExamplePage
    options={{
      title: 'Context（移植自 SolidJS）',
      source,
      codeCardClassName: 'h-[420px] md:h-[860px]',
    }}
  >
    <ContextDemo />
  </HomeSplitExamplePage>
)

export default Context
