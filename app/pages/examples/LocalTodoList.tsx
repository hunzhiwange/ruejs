import HomeSplitExamplePage from './createHomeSplitExamplePage'
import LocalTodoListDemo from './home-demos/LocalTodoListDemo'
import source from './home-demos/LocalTodoListDemo.tsx?raw'

const LocalTodoList = () => (
  <HomeSplitExamplePage
    options={{
      title: '本地待办事项',
      source,
    }}
  >
    <LocalTodoListDemo />
  </HomeSplitExamplePage>
)

export default LocalTodoList
