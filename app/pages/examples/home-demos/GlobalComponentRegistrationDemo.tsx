import { Component, type FC, useState } from '@rue-js/rue'

type Todo = {
  id: number
  text: string
  done: boolean
}

type TodoItemProps = {
  todo: Todo
  onToggle: (id: number) => void
  onRemove: (id: number) => void
}

const TodoItem: FC<TodoItemProps> = props => (
  <li className="flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3">
    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        className="checkbox checkbox-primary checkbox-sm"
        checked={props.todo.done}
        onChange={() => props.onToggle(props.todo.id)}
      />
      <span className={`truncate ${props.todo.done ? 'text-base-content/45 line-through' : ''}`}>
        {props.todo.text}
      </span>
    </label>
    <button className="btn btn-ghost btn-xs" onClick={() => props.onRemove(props.todo.id)}>
      删除
    </button>
  </li>
)

const RegisteredTodoHost: FC = () => {
  const [state] = useState({
    draft: '确认 Component 能解析字符串名',
    todos: [
      { id: 1, text: '定义 TodoItem 函数组件', done: true },
      { id: 2, text: '为 Component 声明有限 registry', done: true },
      { id: 3, text: '用静态可证明的 TodoItem 工厂渲染', done: false },
    ] as Todo[],
  })

  const addTodo = () => {
    const text = `${state.draft}`.trim()
    if (!text) return

    state.todos.push({
      id: Date.now(),
      text,
      done: false,
    })
    state.draft = ''
  }

  const toggleTodo = (id: number) => {
    const index = state.todos.findIndex(item => item.id === id)
    if (index !== -1) {
      state.todos[index] = { ...state.todos[index], done: !state.todos[index].done }
    }
  }

  const removeTodo = (id: number) => {
    const index = state.todos.findIndex(item => item.id === id)
    if (index !== -1) {
      state.todos.splice(index, 1)
    }
  }

  const completed = state.todos.filter(todo => todo.done).length

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            compiler-proven registry
          </p>
          <h2 className="mt-2 text-2xl font-semibold">TodoItem 来自有限组件注册表</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/70">
            <code>{'<Component is="TodoItem" />'}</code> 的 registry 在调用点显式声明，编译器能静态
            验证并生成有限工厂分支。
          </p>
        </div>
        <div className="stats stats-horizontal bg-base-200">
          <div className="stat px-4 py-2">
            <div className="stat-title text-xs">完成</div>
            <div className="stat-value text-lg">
              {completed}/{state.todos.length}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          className="input input-bordered flex-1"
          value={state.draft}
          placeholder="新增一条任务"
          onInput={(event: any) => {
            state.draft = event.currentTarget.value
          }}
          onKeyDown={(event: any) => {
            if (event.key === 'Enter') addTodo()
          }}
        />
        <button className="btn btn-primary" onClick={addTodo}>
          添加
        </button>
      </div>

      <ul className="mt-4 grid gap-3">
        {state.todos.map(todo => (
          <Component
            is={'TodoItem'}
            registry={{ TodoItem }}
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onRemove={removeTodo}
          />
        ))}
      </ul>
    </div>
  )
}

const GlobalComponentRegistrationDemo: FC = () => {
  return (
    <div className="grid gap-4">
      <div className="alert border border-info/30 bg-info/10 text-sm">
        <span>TodoItem 已通过调用点的有限 registry 编译为静态工厂分支。</span>
      </div>
      <RegisteredTodoHost />
      <div className="mockup-code bg-neutral text-neutral-content">
        <pre data-prefix="1">
          <code>{`<Component`}</code>
        </pre>
        <pre data-prefix="2">
          <code>{`  is="TodoItem"`}</code>
        </pre>
        <pre data-prefix="3">
          <code>{`  registry={{ TodoItem }}`}</code>
        </pre>
        <pre data-prefix="4">
          <code>{`/>`}</code>
        </pre>
      </div>
    </div>
  )
}

export default GlobalComponentRegistrationDemo
