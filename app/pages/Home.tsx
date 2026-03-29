import { type FC, computed, emitted, h, reactive, ref, useState, watch, watchEffect } from 'rue-js'
import { extend } from '@rue-js/shared'
import { RouterLink } from 'rue-router'

interface Todo {
  id: number
  text: string
  completed: boolean
}

interface User {
  name: string
  age: number
  email: string
  isEditing: boolean
}

const counter = ref(0)
watch(
  counter,
  (newValue: number, oldValue: number) => {
    console.info(`watch计数从 ${oldValue} 变为 ${newValue}`)
  },
  { immediate: true },
)
const Counter: FC = () => {
  const count = counter
  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-2">计数器示例 123456</h2>
      <div className="text-4xl font-bold mb-3">{count.value}</div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          className="rounded-lg border border-blue-500 bg-blue-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-blue-700 hover:bg-blue-700 focus:ring focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
          onClick={() => count.value++}
        >
          +1
        </button>
        <button
          className="rounded-lg border border-yellow-500 bg-yellow-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-yellow-700 hover:bg-yellow-700 focus:ring focus:ring-yellow-200 disabled:cursor-not-allowed disabled:border-yellow-300 disabled:bg-yellow-300"
          onClick={() => count.value--}
        >
          -1
        </button>
        <button
          className="rounded-lg border border-gray-700 bg-gray-700 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-900 hover:bg-gray-900 focus:ring focus:ring-gray-200 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300"
          onClick={() => (count.value = 0)}
        >
          重置
        </button>
      </div>
    </div>
  )
}

const counter2 = ref(0)
const CounterH: FC = () => {
  const count = counter2
  return h(
    'div',
    { className: 'max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm' },
    h('h2', { className: 'text-xl font-semibold mb-2' }, '计数器示例'),
    h('div', { className: 'text-3xl font-bold mb-3' }, count.value),
    h(
      'div',
      { className: 'flex flex-wrap justify-center gap-2' },
      h(
        'button',
        {
          className:
            'rounded-lg border border-blue-500 bg-blue-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-blue-700 hover:bg-blue-700 focus:ring focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300',
          onClick: () => count.value++,
        },
        '+1',
      ),
      h(
        'button',
        {
          className:
            'rounded-lg border border-yellow-500 bg-yellow-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-yellow-700 hover:bg-yellow-700 focus:ring focus:ring-yellow-200 disabled:cursor-not-allowed disabled:border-yellow-300 disabled:bg-yellow-300',
          onClick: () => count.value--,
        },
        '-1',
      ),
      h(
        'button',
        {
          className:
            'rounded-lg border border-gray-700 bg-gray-700 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-900 hover:bg-gray-900 focus:ring focus:ring-gray-200 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300',
          onClick: () => (count.value = 0),
        },
        '重置',
      ),
    ),
  )
}
watchEffect(() => {
  console.info(`watchEffect计数发生了counter变化：${counter.value}`)
  console.info(`watchEffect计数counter2发生了变化：${counter2.value}`)
})

const Counter3: FC = () => {
  const [count, setCount] = useState(0)
  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-2">计数器示例 useState</h2>
      <div className="text-4xl font-bold mb-3">{count.value}</div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          className="rounded-lg border border-blue-500 bg-blue-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-blue-700 hover:bg-blue-700 focus:ring focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
          onClick={() =>
            setCount(ref => {
              ref.value += 1
            })
          }
        >
          +1
        </button>
        <button
          className="rounded-lg border border-yellow-500 bg-yellow-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-yellow-700 hover:bg-yellow-700 focus:ring focus:ring-yellow-200 disabled:cursor-not-allowed disabled:border-yellow-300 disabled:bg-yellow-300"
          onClick={() =>
            setCount(ref => {
              ref.value -= 1
            })
          }
        >
          -1
        </button>
        <button
          className="rounded-lg border border-gray-700 bg-gray-700 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-900 hover:bg-gray-900 focus:ring focus:ring-gray-200 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300"
          onClick={() => setCount(0)}
        >
          重置
        </button>
      </div>
    </div>
  )
}

const todoState = reactive({
  todos: [
    { id: 1, text: '学习响应式框架', completed: false },
    { id: 2, text: '编写示例代码', completed: true },
    { id: 3, text: '测试功能', completed: false },
  ] as Todo[],
  newTodo: '',
})
const TodoApp: FC = () => {
  const state = todoState
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
          <div
            key={todo.id}
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
        ))}
      </div>
      <p>{`总计: ${state.todos.length} | 已完成: ${completedCount.get()}`}</p>
    </div>
  )
}

const user = reactive<User>({
  name: '张三',
  age: 25,
  email: 'zhangsan@example.com',
  isEditing: false,
})

const UserProfile: FC = () => {
  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-4">用户信息</h2>
      {user.isEditing ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2">
            <span>姓名:</span>
            <input
              className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 px-3 py-1"
              value={user.name}
              onInput={(e: any) => {
                user.name = (e.target as HTMLInputElement).value
              }}
            />
          </p>
          <p className="flex items-center gap-2">
            <span>年龄:</span>
            <input
              className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 px-3 py-1"
              type="number"
              value={user.age}
              onInput={(e: any) => {
                user.age = parseInt((e.target as HTMLInputElement).value) || 0
              }}
            />
          </p>
          <p className="flex items-center gap-2">
            <span>邮箱:</span>
            <input
              className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 px-3 py-1"
              value={user.email}
              onInput={(e: any) => {
                user.email = (e.target as HTMLInputElement).value
              }}
            />
          </p>
          <button
            className="rounded-lg border border-green-500 bg-green-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-green-700 hover:bg-green-700 focus:ring focus:ring-green-200"
            onClick={() => (user.isEditing = false)}
          >
            保存
          </button>
        </div>
      ) : (
        <div>
          <p>姓名: {user.name}</p>
          <p>年龄: {user.age}</p>
          <p>邮箱: {user.email}</p>
          <button onClick={() => (user.isEditing = true)}>编辑</button>
        </div>
      )}
    </div>
  )
}

const Box: FC<{ title: string; background: string }> = props => {
  return (
    <div
      className="box"
      style={{
        border: '1px solid #ddd',
        padding: '12px',
        marginBottom: '12px',
        background: props.background,
      }}
    >
      <h3 style={{ margin: '0 0 8px' }}>{props.title}</h3>
      <div className="content">{props.children}</div>
    </div>
  )
}

const Layout: FC<{ header?: any; footer?: any; content?: any }> = props => {
  return (
    <div className="layout border border-gray-300 p-4 rounded-md">
      <div className="layout-header bg-gray-100 p-3">{props.header}</div>
      <div className="layout-content p-3">{props.children}</div>
      <div className="layout-footer bg-gray-100 p-3">{props.footer}</div>
      <div className="layout-content bg-gray-100 p-3">{props.content}</div>
    </div>
  )
}

const items = ref<string[]>(['苹果', '香蕉', '橘子'])
const input = ref('')
const MapListDemo: FC = () => {
  function addItem(): void {
    const text = input.value.trim()
    if (text) {
      items.value = [...items.value, text]
      input.value = ''
    }
  }
  function removeAt(index: number): void {
    items.value = items.value.filter((_, i) => i !== index)
  }
  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-blue-600 mb-3">React 风格 map 列表渲染</h2>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input.value}
          onInput={(e: any) => {
            input.value = (e.target as HTMLInputElement).value
          }}
          onKeyPress={(e: any) => {
            if (e.key === 'Enter') addItem()
          }}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 px-3 py-2"
        />
        <button
          className="rounded-md bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-700"
          onClick={addItem}
        >
          添加
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {items.value.map((item, idx) => (
          <li key={idx} className="flex items-center gap-3 mb-2">
            <span className="text-gray-800">{item}</span>
            <button
              className="rounded-md bg-red-600 text-white px-2 py-1 text-sm hover:bg-red-700"
              onClick={() => removeAt(idx)}
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const show = ref(true)
const level = ref(1)
const message = ref('Hello')

const ReactConditionalDemo: FC = () => {
  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-purple-600 mb-3">React 风格条件渲染</h2>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          className="rounded-lg border border-gray-700 bg-gray-700 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-900 hover:bg-gray-900 focus:ring focus:ring-gray-200"
          onClick={() => (show.value = !show.value)}
        >
          {show.value ? '隐藏详情' : '显示详情'}
        </button>
        <button
          className="rounded-lg border border-blue-500 bg-blue-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-blue-700 hover:bg-blue-700 focus:ring focus:ring-blue-200"
          onClick={() => level.value++}
        >
          等级+1
        </button>
        <button
          className="rounded-lg border border-gray-500 bg-gray-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-700 hover:bg-gray-700 focus:ring focus:ring-gray-200"
          onClick={() => (message.value = message.value ? '' : 'Hello')}
        >
          {message.value ? '清空消息' : '恢复消息'}
        </button>
      </div>

      {show.value ? (
        <div className="mt-2">
          <p className="text-gray-700">详情区域：仅在 show 为 true 时显示</p>
        </div>
      ) : null}

      <p className="text-gray-700">等级状态：{level.value >= 3 ? '高级' : '普通'}</p>
      {message.value ? <p className="text-gray-700">消息：{message.value}</p> : null}
    </div>
  )
}

const lastMessage = ref('')
const childInput = ref('')
const NotifierChild: FC<{ onNotify: (msg: string) => void }> = props => {
  return (
    <div className="flex items-center gap-2">
      <input
        className="rounded-md border-gray-300 shadow-sm px-3 py-1 focus:border-violet-500 focus:ring focus:ring-violet-200"
        value={childInput.value}
        onInput={(e: any) => {
          childInput.value = (e.target as HTMLInputElement).value
        }}
        placeholder="输入消息"
      />
      <button
        className="rounded-lg border border-violet-500 bg-violet-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:border-violet-700 hover:bg-violet-700 focus:ring focus:ring-violet-200"
        onClick={() => props.onNotify(childInput.value)}
      >
        子触发通知
      </button>
    </div>
  )
}

const ChildCallsParentDemo: FC = () => {
  const onNotify = (msg: string) => {
    lastMessage.value = msg
  }
  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-teal-600 mb-3">子组件调用父组件的方法</h2>
      <NotifierChild onNotify={onNotify} />
      <p className="text-gray-700">父组件接收的消息：{lastMessage.value || '（暂无）'}</p>
    </div>
  )
}

const parentCount = ref(0)
const ChildCounter: FC<{
  count: number
  onInc: () => void
  onReset: () => void
}> = p => {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span>子计数：{p.count}</span>
      <button
        className="rounded-lg border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:border-blue-700 hover:bg-blue-700 focus:ring focus:ring-blue-200"
        onClick={p.onInc}
      >
        子自增
      </button>
      <button
        className="rounded-lg border border-gray-700 bg-gray-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:border-gray-900 hover:bg-gray-900 focus:ring focus:ring-gray-200"
        onClick={p.onReset}
      >
        子重置
      </button>
    </div>
  )
}

const ParentControlsChildDemo: FC = () => {
  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-sky-600 mb-3">
        父组件调用子组件（状态提升 + 事件回调）
      </h2>
      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:border-blue-700 hover:bg-blue-700 focus:ring focus:ring-blue-200"
          onClick={() => parentCount.value++}
        >
          父触发子自增
        </button>
        <button
          className="rounded-lg border border-gray-700 bg-gray-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:border-gray-900 hover:bg-gray-900 focus:ring focus:ring-gray-200"
          onClick={() => (parentCount.value = 0)}
        >
          父触发子重置
        </button>
      </div>
      <p className="mt-2 text-gray-700">（父视图展示子计数）：{parentCount.value}</p>
      <ChildCounter
        count={parentCount.value}
        onInc={() => parentCount.value++}
        onReset={() => (parentCount.value = 0)}
      />
    </div>
  )
}

const modelName = ref('小明')
const agree = ref(false)

const ControlledInput: FC<{
  modelValue?: string
  ['onUpdate:modelValue']?: (v: string) => void
  vModel?: { value: string }
}> = props => (
  <input
    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 px-3 py-2"
    value={props.modelValue ?? ''}
    onInput={(e: any) => props['onUpdate:modelValue']?.((e.target as HTMLInputElement).value)}
  />
)

const ControlledCheckbox: FC<{
  modelValue?: boolean
  ['onUpdate:modelValue']?: (v: boolean) => void
  vModel?: { value: boolean }
}> = props => (
  <label className="flex items-center space-x-2">
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:text-gray-400"
      checked={!!props.modelValue}
      onChange={(e: any) => props['onUpdate:modelValue']?.((e.target as HTMLInputElement).checked)}
    />
    <span className="text-sm font-medium text-gray-700">同意协议</span>
  </label>
)

const VModelCompDemo: FC = () => (
  <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
    <h2 className="text-xl font-semibold text-emerald-600 mb-3">组件级 vModel</h2>
    <ControlledInput vModel={modelName} />
    <p className="text-gray-700">姓名：{modelName.value}</p>
    <ControlledCheckbox vModel={agree} />
    <p className="text-gray-700">同意状态：{agree.value ? '是' : '否'}</p>
  </div>
)

const title = ref('初始标题')
const enabled = ref(false)
const plain = ref('默认输入')
const content = ref('初始内容')

const EnabledToggleComp: FC<{
  enabled?: boolean
  ['onUpdate:enabled']?: (v: boolean) => void
  ['vModel:enabled']?: { value: boolean }
}> = props => (
  <label className="flex items-center space-x-2">
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:text-gray-400"
      checked={!!props.enabled}
      onChange={(e: any) => props['onUpdate:enabled']?.((e.target as HTMLInputElement).checked)}
    />
    <span className="text-sm font-medium text-gray-700">启用</span>
  </label>
)

const MultiModelComp: FC<{
  modelValue?: string
  ['onUpdate:modelValue']?: (v: string) => void
  title?: string
  ['onUpdate:title']?: (v: string) => void
  content?: string
  ['onUpdate:content']?: (v: string) => void
  vModel?: { value: string }
  ['vModel:title']?: { value: string }
  ['vModel:content']?: { value: string }
}> = props => (
  <div style={{ display: 'grid', gap: '8px' }}>
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span>默认</span>
      <input
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 px-3 py-2"
        value={props.modelValue ?? ''}
        onInput={(e: any) => props['onUpdate:modelValue']?.((e.target as HTMLInputElement).value)}
      />
    </div>
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span>标题</span>
      <input
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 px-3 py-2"
        value={props.title ?? ''}
        onInput={(e: any) => props['onUpdate:title']?.((e.target as HTMLInputElement).value)}
      />
    </div>
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span>内容</span>
      <textarea
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 px-3 py-2"
        value={props.content ?? ''}
        onInput={(e: any) => props['onUpdate:content']?.((e.target as HTMLTextAreaElement).value)}
      />
    </div>
  </div>
)

const NamedVModelDemo: FC = () => (
  <div className="container">
    <h2>命名 vModel:hello（参考 Vue3）</h2>
    <MultiModelComp vModel={plain} vModel:title={title} vModel:content={content} />
    <p>默认 vModel：{plain.value}</p>
    <p>标题：{title.value}</p>
    <p>内容：{content.value}</p>
    <EnabledToggleComp vModel:enabled={enabled} />
    <p>启用状态：{enabled.value ? '是' : '否'}</p>
  </div>
)

const SavedMsg = ref('')
const emitName = ref('')

const EmitChild: FC<{ onSave?: (msg: string) => void }> = props => {
  const emit = emitted(props as any)
  return (
    <button
      className="rounded-md bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-700"
      onClick={() => emit('save', '已保存的是数据是123456')}
    >
      触发保存
    </button>
  )
}

const EmitInputChild: FC<{
  modelValue?: string
  ['onUpdate:modelValue']?: (v: string) => void
  vModel?: { value: string }
}> = props => {
  const emit = emitted(props as any)
  return (
    <input
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 px-3 py-2"
      value={props.modelValue ?? ''}
      onInput={(e: any) => emit('update:modelValue', (e.target as HTMLInputElement).value)}
    />
  )
}

const EmitDemo: FC = () => (
  <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
    <h2 className="text-xl font-semibold text-pink-600 mb-3">组件 emit（参考 Vue3）</h2>
    <EmitChild onSave={msg => (SavedMsg.value = msg)} />
    <p className="text-gray-700">保存消息：{SavedMsg.value || '（暂无）'}</p>
    <EmitInputChild vModel={emitName} />
    <p className="text-gray-700">输入的名称：{emitName.value}</p>
  </div>
)

const UseStateArrayDemo: FC = () => {
  const [list, setList] = useState<string[]>(['苹果', '香蕉'])
  const addItem = () => setList(prev => [...prev, `项目${prev.length + 1}`])
  const removeLast = () => setList(prev => prev.slice(0, -1))
  return (
    <div className="container">
      <h2>useState 数组示例</h2>
      <div className="flex gap-2 mb-2">
        <button
          className="rounded-lg border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm font-medium text-white"
          onClick={addItem}
        >
          添加
        </button>
        <button
          className={`rounded-lg border border-gray-700 bg-gray-700 px-3 py-1.5 text-sm font-medium text-white ${list.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
          onClick={() => {
            if (list.length > 0) removeLast()
          }}
        >
          删除最后一个
        </button>
      </div>
      <ul>
        {list.map((it, idx) => (
          <li key={idx}>{it}</li>
        ))}
      </ul>
      <p>长度：{list.length}</p>
    </div>
  )
}

const UseStateObjectDemo: FC = () => {
  const [profile, setProfile] = useState<{ name: string; age: number }>({
    name: '小明',
    age: 18,
  })
  const incAge = () => setProfile(p => extend(p, { age: p.age + 1 }))
  const changeName = (e: any) =>
    setProfile(p => extend(p, { name: (e.target as HTMLInputElement).value }))
  const changeName2 = (e: any) =>
    setProfile(p => extend(p, { name: (e.target as HTMLInputElement).value }))
  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-amber-600 mb-3">useState 对象示例</h2>
      <div className="flex gap-2 items-center mb-2">
        <input
          className="rounded-md border-gray-300 shadow-sm px-3 py-1"
          value={profile.name}
          onInput={changeName}
        />
        <input
          className="rounded-md border-gray-300 shadow-sm px-3 py-1"
          value={profile.name}
          onInput={changeName2}
        />
        <button
          className="rounded-lg border border-green-500 bg-green-500 px-3 py-1.5 text-sm font-medium text-white"
          onClick={incAge}
        >
          年龄+1
        </button>
      </div>
      <p className="text-gray-700">姓名：{profile.name}</p>
      <p className="text-gray-700">年龄：{profile.age}</p>
    </div>
  )
}

const Counter4: FC = () => {
  const count = ref(5)
  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-2">计数器示例 123456</h2>
      <div className="text-4xl font-bold mb-3">{count.value}</div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          className="rounded-lg border border-blue-500 bg-blue-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-blue-700 hover:bg-blue-700 focus:ring focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
          onClick={() => count.value++}
        >
          +1
        </button>
        <button
          className="rounded-lg border border-yellow-500 bg-yellow-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-yellow-700 hover:bg-yellow-700 focus:ring focus:ring-yellow-200 disabled:cursor-not-allowed disabled:border-yellow-300 disabled:bg-yellow-300"
          onClick={() => count.value--}
        >
          -1
        </button>
        <button
          className="rounded-lg border border-gray-700 bg-gray-700 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-900 hover:bg-gray-900 focus:ring focus:ring-gray-200 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300"
          onClick={() => (count.value = 0)}
        >
          重置
        </button>
      </div>
    </div>
  )
}

const TodoApp2: FC = () => {
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
          <div
            key={todo.id}
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
        ))}
      </div>
      <p>{`总计: ${state.todos.length} | 已完成: ${completedCount.get()}`}</p>
    </div>
  )
}

const Hello: FC = props => {
  return (
    <div className="rounded-md border bg-white p-3 space-y-1">
      <p className="text-gray-800">我是hello组件</p>
      <span className="text-gray-600">这是我的children {props.children}</span>
    </div>
  )
}

const World = () => {
  return <div className="rounded-md border bg-white p-3 space-y-1">我是 world</div>
}

const Home: FC = () => {
  return (
    <div className="space-y-6">
      {
        <nav className="navbar bg-base-100 mb-3 border-b border-base-200">
          <div className="max-w-5xl mx-auto w-full">
            <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-3">
              <RouterLink to="/" className="btn btn-ghost btn-sm">
                首页
              </RouterLink>
              <RouterLink to="/about" className="btn btn-ghost btn-sm">
                关于
              </RouterLink>
              <RouterLink to="/posts" className="btn btn-ghost btn-sm">
                文章
              </RouterLink>
              <RouterLink to="/vapor" className="btn btn-ghost btn-sm">
                Vapor
              </RouterLink>
              <RouterLink to="/vapor-jsx" className="btn btn-ghost btn-sm">
                Vapor(JSX)
              </RouterLink>
              <RouterLink to="/react" className="btn btn-ghost btn-sm">
                React(JSX)
              </RouterLink>
              <RouterLink to="/shop" className="btn btn-ghost btn-sm">
                商城
              </RouterLink>
              <RouterLink to="/use-cart" className="btn btn-ghost btn-sm">
                购物车
              </RouterLink>
              <RouterLink to="/shop/checkout" className="btn btn-ghost btn-sm">
                快速下单
              </RouterLink>
              <RouterLink to="/rue" className="btn btn-ghost btn-sm">
                Rue 官网
              </RouterLink>
              <RouterLink to="/page" className="btn btn-ghost btn-sm">
                文档
              </RouterLink>
              <RouterLink to="/rue/guide" className="btn btn-ghost btn-sm">
                指南
              </RouterLink>
              <RouterLink to="/rue/api" className="btn btn-ghost btn-sm">
                API
              </RouterLink>
              <RouterLink to="/plugins" className="btn btn-ghost btn-sm">
                插件
              </RouterLink>
              <RouterLink to="/ecosystem" className="btn btn-ghost btn-sm">
                生态
              </RouterLink>
            </div>
          </div>
        </nav>
      }

      <h1 className="text-center text-orange-500 font-semibold">Rue 响应式框架示例</h1>
      <Counter />
      <CounterH />
      <Counter3 />
      <TodoApp />
      <UserProfile />
      <MapListDemo />
      <ReactConditionalDemo />
      <ChildCallsParentDemo />
      <ParentControlsChildDemo />
      <VModelCompDemo />
      <NamedVModelDemo />
      <EmitDemo />
      <UseStateArrayDemo />
      <UseStateObjectDemo />
      <Counter4 />
      <TodoApp2 />
      <Hello>
        <World />
      </Hello>

      <h2 style={{ textAlign: 'center' }}>Children 属性演示</h2>

      <Box title="基本 children" background="purple">
        <p>这是子内容 A</p>
        <p>这是子内容 B</p>
      </Box>

      <Box title="嵌套 children" background="blue">
        <Box title="内层 Box" background="red">
          <span>嵌套的子元素</span>
          <Box title="内层 Box2" background="yellow">
            <span>嵌套的子元素2</span>
            <Box title="内层 Box3" background="green">
              <span>嵌套的子元素3</span>
            </Box>
          </Box>
        </Box>
      </Box>

      <Layout
        header={<div className="text-gray-800 font-semibold">自定义 Header</div>}
        footer={<div className="text-gray-600">自定义 Footer</div>}
        content={
          <div className="space-y-2">
            <Hello>
              <p className="text-gray-700">
                你好<Hello>123456</Hello>
              </p>
            </Hello>
          </div>
        }
      >
        <p className="text-gray-700">主体内容通过 props.children 传入</p>
        <p className="text-gray-600">这与 React 的 children 语义一致</p>
      </Layout>
    </div>
  )
}

export default Home
