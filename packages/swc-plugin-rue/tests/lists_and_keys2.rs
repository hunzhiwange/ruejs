//! 列表与 key 转换测试（响应式 Todo 场景）
//!
//! 覆盖：reactive/computed 参与的列表渲染、Fragment 包裹、多种 key 组合形式。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_lists_and_keys2() {
    let src = r##"
import {
  FC,
  reactive,
  computed,
  Fragment,
} from '@rue-js/rue'
interface Todo {
  id: number
  text: string
  completed: boolean
}
const TodoApp: FC = () => {
  const state = reactive({
    todos: [
      { id: 1, text: '学习响应式框架', completed: false },
      { id: 2, text: '编写示例代码', completed: true },
      { id: 3, text: '测试功能', completed: false },
    ] as Todo[],
    newTodo: '',
  })
  function addTodo(): void {
    if (state.newTodo.trim()) {
      state.todos.push({
        id: Date.now(),
        text: state.newTodo,
        completed: false,
      })
      state.newTodo = ''
    }
  }
  function toggleTodo(id: number): void {
    const todo = state.todos.find(t => t.id === id)
    if (todo) todo.completed = !todo.completed
  }
  function deleteTodo(id: number): void {
    const index = state.todos.findIndex(t => t.id === id)
    if (index !== -1) state.todos.splice(index, 1)
  }
  const completedCount = computed(() => state.todos.filter(t => t.completed).length)
  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-3">待办事项</h2>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={state.newTodo}
          onInput={(e: any) => {
            state.newTodo = (e.target as HTMLInputElement).value
          }}
          onKeyPress={(e: any) => {
            if (e.key === 'Enter') addTodo()
          }}
          className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 px-3 py-2"
        />
        <button
          className="rounded-lg border border-green-500 bg-green-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-green-700 hover:bg-green-700 focus:ring focus:ring-green-200 disabled:cursor-not-allowed disabled:border-green-300 disabled:bg-green-300"
          onClick={addTodo}
        >
          添加
        </button>
      </div>
      <div>
        {state.todos.map((todo: Todo, _idx: number) => (
          <Fragment key={todo.id}>
            <p>{todo.id}</p>
            <div
              className={`flex items-center justify-between rounded-lg border p-3 mb-2 ${todo.completed ? 'bg-gray-50' : 'bg-white'}`}
            >
              <span
                onClick={() => toggleTodo(todo.id)}
                className={`cursor-pointer ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
              >
                {todo.text}
              </span>
              <button
                className="rounded-lg border border-red-500 bg-red-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:border-red-700 hover:bg-red-700 focus:ring focus:ring-red-200"
                onClick={() => deleteTodo(todo.id)}
              >
                删除
              </button>
            </div>
          </Fragment>
        ))}
      </div>
      <p>{`总计: ${state.todos.length} | 已完成: ${completedCount.value}`}</p>
    </div>
  )
}

export default TodoApp
"##;
    let (program, cm) = utils::parse(src, "ListsAndKeys.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/lists_and_keys2.out.js", utils::strip_marker(&out)).ok();
    let normalized = utils::normalize(&utils::strip_marker(&out));
    assert!(normalized.contains("_$reconcileKeyed"), "{normalized}");
    assert!(normalized.contains("_$mountCompiledKeyedRow"), "{normalized}");
    assert!(normalized.contains("_$compiledComponent(Fragment"), "{normalized}");
    assert!(normalized.contains("_$compiledText(_el8, ()=>_$rowItem1.get().id)"), "{normalized}");
    assert!(
        normalized.contains("_$compiledText(_el11, ()=>_$rowItem1.get().text)"),
        "{normalized}"
    );
    assert!(!normalized.contains("_$compiledKeyedList"), "{normalized}");
    assert!(!normalized.contains("_$setAttribute(_el7, \"key\""));
}
