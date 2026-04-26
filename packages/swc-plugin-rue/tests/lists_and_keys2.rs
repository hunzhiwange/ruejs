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

    let expected_fragment = r##"
import { _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$vaporKeyedList, _$createTextWrapper, _$setAttribute, _$addEventListener, _$setClassName, _$setValue } from "@rue-js/rue/vapor";
import { FC, reactive, computed, Fragment } from '@rue-js/rue';
interface Todo {
    id: number;
    text: string;
    completed: boolean;
}
const TodoApp: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const state = _$vaporWithHookId("reactive:1:0", ()=>reactive({
                    todos: [
                        {
                            id: 1,
                            text: '学习响应式框架',
                            completed: false
                        },
                        {
                            id: 2,
                            text: '编写示例代码',
                            completed: true
                        },
                        {
                            id: 3,
                            text: '测试功能',
                            completed: false
                        }
                    ] as Todo[],
                    newTodo: ''
                }));
            function addTodo(): void {
                if (state.newTodo.trim()) {
                    state.todos.push({
                        id: Date.now(),
                        text: state.newTodo,
                        completed: false
                    });
                    state.newTodo = '';
                }
            }
            function toggleTodo(id: number): void {
                const todo = state.todos.find((t)=>t.id === id);
                if (todo) todo.completed = !todo.completed;
            }
            function deleteTodo(id: number): void {
                const index = state.todos.findIndex((t)=>t.id === id);
                if (index !== -1) state.todos.splice(index, 1);
            }
            const completedCount = _$vaporWithHookId("computed:1:1", ()=>computed(()=>state.todos.filter((t)=>t.completed).length));
            return {
                state: state,
                addTodo: addTodo,
                toggleTodo: toggleTodo,
                deleteTodo: deleteTodo,
                completedCount: completedCount
            };
        }));
    const { state: state, addTodo: addTodo, toggleTodo: toggleTodo, deleteTodo: deleteTodo, completedCount: completedCount } = _$useSetup;
    return vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h2");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold mb-3");
        _$appendChild(_el1, _$createTextNode("待办事项"));
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        _$setClassName(_el2, "flex items-center gap-2 mb-3");
        const _el3 = _$createElement("input");
        _$appendChild(_el2, _el3);
        _$setAttribute(_el3, "type", "text");
        watchEffect(()=>{
            _$setValue(_el3, state.newTodo);
        });
        _$addEventListener(_el3, "input", ((e: any)=>{
            state.newTodo = (e.target as HTMLInputElement).value;
        }));
        _$addEventListener(_el3, "keypress", ((e: any)=>{
            if (e.key === 'Enter') addTodo();
        }));
        _$setClassName(_el3, "flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 px-3 py-2");
        const _el4 = _$createElement("button");
        _$appendChild(_el2, _el4);
        _$setClassName(_el4, "rounded-lg border border-green-500 bg-green-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-green-700 hover:bg-green-700 focus:ring focus:ring-green-200 disabled:cursor-not-allowed disabled:border-green-300 disabled:bg-green-300");
        _$addEventListener(_el4, "click", (addTodo));
        _$appendChild(_el4, _$createTextNode("添加"));
        const _el5 = _$createElement("div");
        _$appendChild(_root, _el5);
        const _list1 = _$createComment("rue:list:start");
        const _list2 = _$createComment("rue:list:end");
        _$appendChild(_el5, _list1);
        _$appendChild(_el5, _list2);
        let _map1_elements = new Map;
        watchEffect(()=>{
            const _map1_current = state.todos || [];
            const _map1_newElements = _$vaporKeyedList({
                items: _map1_current,
                getKey: (todo, _idx)=>todo.id,
                elements: _map1_elements,
                parent: _el5,
                before: _list2,
                start: _list1,
                renderItem: (todo, parent, start, end, _idx)=>{
                  const __child1 = vapor(()=>{
                    const _root = _$createDocumentFragment();
                    const _el6 = _$createElement("p");
                    _$appendChild(_root, _el6);
                    const _el7 = _$createTextWrapper(_el6);
                    _$appendChild(_el6, _el7);
                    watchEffect(()=>{
                      _$settextContent(_el7, todo.id);
                    });
                    const _el8 = _$createElement("div");
                    _$appendChild(_root, _el8);
                    watchEffect(()=>{
                      _$setClassName(_el8, String(`flex items-center justify-between rounded-lg border p-3 mb-2 ${todo.completed ? 'bg-gray-50' : 'bg-white'}`));
                    });
                    const _el9 = _$createElement("span");
                    _$appendChild(_el8, _el9);
                    _$addEventListener(_el9, "click", (()=>toggleTodo(todo.id)));
                    watchEffect(()=>{
                      _$setClassName(_el9, String(`cursor-pointer ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`));
                    });
                    const _el10 = _$createTextWrapper(_el9);
                    _$appendChild(_el9, _el10);
                    watchEffect(()=>{
                      _$settextContent(_el10, todo.text);
                    });
                    const _el11 = _$createElement("button");
                    _$appendChild(_el8, _el11);
                    _$setClassName(_el11, "rounded-lg border border-red-500 bg-red-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:border-red-700 hover:bg-red-700 focus:ring focus:ring-red-200");
                    _$addEventListener(_el11, "click", (()=>deleteTodo(todo.id)));
                    _$appendChild(_el11, _$createTextNode("删除"));
                    return _root;
                  });
                  const __slot = __child1;
                    renderBetween(__slot, parent, start, end);
                }
            });
            _map1_elements = _map1_newElements;
        });
        const _el12 = _$createElement("p");
        _$appendChild(_root, _el12);
        const _el13 = _$createTextWrapper(_el12);
        _$appendChild(_el12, _el13);
        watchEffect(()=>{
            _$settextContent(_el13, `总计: ${state.todos.length} | 已完成: ${completedCount.value}`);
        });
        return _root;
    });
};
export default TodoApp;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/lists_and_keys2.out.js", utils::strip_marker(&out)).ok();
    assert_eq!(
        utils::normalize(&utils::strip_marker(&out)),
        utils::normalize(&utils::strip_marker(expected_fragment))
    );
}
