'use client'

import { computed, type FC, ref } from '@rue-js/rue'

type TodoFilter = 'all' | 'active' | 'done'

interface Todo {
  id: number
  title: string
  completed: boolean
}

const initialTodos: Todo[] = [
  { id: 1, title: 'Render the shell on the server', completed: true },
  { id: 2, title: 'Hydrate a focused client island', completed: false },
  { id: 3, title: 'Ship a tiny interactive todo app', completed: false },
]

const TodoFilterButton: FC<{
  item: TodoFilter
  filter: { value: TodoFilter }
}> = ({ item, filter }) => (
  <button
    className={`tab-button${filter.value === item ? ' active' : ''}`}
    type="button"
    aria-pressed={filter.value === item}
    onClick={() => {
      filter.value = item
    }}
  >
    {item === 'all' ? 'All' : item === 'active' ? 'Active' : 'Done'}
  </button>
)

const TodoRow: FC<{
  todo: Todo
  onToggle: (id: number) => void
  onRemove: (id: number) => void
}> = ({ todo, onToggle, onRemove }) => (
  <li className={`todo-item${todo.completed ? ' completed' : ''}`}>
    <label>
      <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo.id)} />
      <span>{todo.title}</span>
    </label>
    <button className="todo-remove" type="button" onClick={() => onRemove(todo.id)}>
      Remove
    </button>
  </li>
)

export default function ClientTodoApp() {
  const todos = ref<Todo[]>(initialTodos)
  const draft = ref('')
  const filter = ref<TodoFilter>('all')
  const nextId = ref(4)

  const visibleTodos = computed(() =>
    todos.value.filter(todo => {
      if (filter.value === 'active') return !todo.completed
      if (filter.value === 'done') return todo.completed
      return true
    }),
  )
  const remainingCount = computed(() => todos.value.filter(todo => !todo.completed).length)
  const completedCount = computed(() => todos.value.length - remainingCount.get())

  function addTodo() {
    const title = draft.value.trim()
    if (!title) return

    todos.value = [...todos.value, { id: nextId.value, title, completed: false }]
    nextId.value += 1
    draft.value = ''
  }

  function toggleTodo(id: number) {
    todos.value = todos.value.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    )
  }

  function removeTodo(id: number) {
    todos.value = todos.value.filter(todo => todo.id !== id)
  }

  function clearCompleted() {
    todos.value = todos.value.filter(todo => !todo.completed)
  }

  return (
    <section className="todo-app" aria-labelledby="todo-app-title">
      <div className="todo-panel">
        <div>
          <p className="eyebrow">Client component</p>
          <h2 id="todo-app-title">Todo island</h2>
          <p>
            This page is still rendered through the App Router, while the form, filters, and list
            updates run in the browser.
          </p>
        </div>

        <div className="todo-composer">
          <label className="field todo-field">
            <span>New task</span>
            <input
              value={draft.value}
              placeholder="Add something for the client to track"
              onInput={(event: InputEvent) => {
                draft.value = (event.target as HTMLInputElement).value
              }}
              onKeyDown={(event: KeyboardEvent) => {
                if (event.key === 'Enter') {
                  addTodo()
                }
              }}
            />
          </label>
          <button className="button" type="button" onClick={addTodo}>
            Add task
          </button>
        </div>

        <div className="todo-toolbar">
          <div className="filter-tabs" role="group" aria-label="Todo filter">
            {(['all', 'active', 'done'] as TodoFilter[]).map(item => (
              <TodoFilterButton key={item} item={item} filter={filter} />
            ))}
          </div>
          <button
            className="chip"
            type="button"
            disabled={completedCount.get() === 0}
            onClick={clearCompleted}
          >
            Clear done
          </button>
        </div>

        <ul className="todo-list" aria-live="polite">
          {visibleTodos.get().map(todo => (
            <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onRemove={removeTodo} />
          ))}
        </ul>

        <p className="todo-summary">
          {remainingCount.get()} active · {completedCount.get()} done · {todos.value.length} total
        </p>
      </div>
    </section>
  )
}
