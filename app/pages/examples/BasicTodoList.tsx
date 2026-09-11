import HomeSplitExamplePage from './createHomeSplitExamplePage'
import BasicTodoListDemo from './home-demos/BasicTodoListDemo'
import source from './home-demos/BasicTodoListDemo.tsx?raw'

const BasicTodoList = () => (
  <HomeSplitExamplePage
    options={{
      title: '基础待办事项',
      source,
    }}
  >
    <BasicTodoListDemo />
  </HomeSplitExamplePage>
)

export default BasicTodoList
