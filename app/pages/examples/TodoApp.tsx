import { type FC, computed, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

type TodoStatus = 'todo' | 'doing' | 'done'
type TodoFilter = 'all' | 'todo' | 'doing' | 'done' | 'archived'

type TodoItem = {
  id: number
  title: string
  archived: boolean
  status: TodoStatus
  createdAt: string
}

const FILTER_OPTIONS: Array<{ key: TodoFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待开始' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' },
  { key: 'archived', label: '已归档' },
]

const STATUS_OPTIONS: Array<{ key: TodoStatus; label: string }> = [
  { key: 'todo', label: '待开始' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' },
]

const INITIAL_TODOS: TodoItem[] = [
  {
    id: 1,
    title: '整理 Rue 3.0 示例文档结构',
    status: 'doing',
    archived: false,
    createdAt: '今天 09:30',
  },
  {
    id: 2,
    title: '补充 Todo App 的交互与视觉细节',
    status: 'todo',
    archived: false,
    createdAt: '今天 10:10',
  },
  {
    id: 3,
    title: '复查按钮、输入框与卡片层级样式',
    status: 'done',
    archived: false,
    createdAt: '昨天 18:20',
  },
  {
    id: 4,
    title: '归档旧版草稿设计',
    status: 'done',
    archived: true,
    createdAt: '昨天 14:05',
  },
]

const STATUS_META: Record<
  TodoStatus,
  {
    label: string
    badgeClass: string
    dotClass: string
    cardClass: string
  }
> = {
  todo: {
    label: '待开始',
    badgeClass: 'badge badge-warning badge-outline',
    dotClass: 'bg-warning',
    cardClass: 'border-warning/30',
  },
  doing: {
    label: '进行中',
    badgeClass: 'badge badge-info badge-outline',
    dotClass: 'bg-info',
    cardClass: 'border-info/30',
  },
  done: {
    label: '已完成',
    badgeClass: 'badge badge-success badge-outline',
    dotClass: 'bg-success',
    cardClass: 'border-success/30',
  },
}

const SOURCE_CODE = [
  "import { type FC, computed, ref } from '@rue-js/rue';",
  '',
  "type TodoStatus = 'todo' | 'doing' | 'done';",
  "type TodoFilter = 'all' | 'todo' | 'doing' | 'done' | 'archived';",
  '',
  'type TodoItem = {',
  '  id: number;',
  '  title: string;',
  '  archived: boolean;',
  '  status: TodoStatus;',
  '  createdAt: string;',
  '};',
  '',
  'const FILTER_OPTIONS: Array<{ key: TodoFilter; label: string }> = [',
  "  { key: 'all', label: '全部' },",
  "  { key: 'todo', label: '待开始' },",
  "  { key: 'doing', label: '进行中' },",
  "  { key: 'done', label: '已完成' },",
  "  { key: 'archived', label: '已归档' },",
  '];',
  '',
  'const STATUS_OPTIONS: Array<{ key: TodoStatus; label: string }> = [',
  "  { key: 'todo', label: '待开始' },",
  "  { key: 'doing', label: '进行中' },",
  "  { key: 'done', label: '已完成' },",
  '];',
  '',
  'const INITIAL_TODOS: TodoItem[] = [',
  "  { id: 1, title: '整理 Rue 3.0 示例文档结构', status: 'doing', archived: false, createdAt: '今天 09:30' },",
  "  { id: 2, title: '补充 Todo App 的交互与视觉细节', status: 'todo', archived: false, createdAt: '今天 10:10' },",
  "  { id: 3, title: '复查按钮、输入框与卡片层级样式', status: 'done', archived: false, createdAt: '昨天 18:20' },",
  "  { id: 4, title: '归档旧版草稿设计', status: 'done', archived: true, createdAt: '昨天 14:05' },",
  '];',
  '',
  'const STATUS_META = {',
  "  todo: { label: '待开始', badgeClass: 'badge badge-warning badge-outline', dotClass: 'bg-warning', cardClass: 'border-warning/30' },",
  "  doing: { label: '进行中', badgeClass: 'badge badge-info badge-outline', dotClass: 'bg-info', cardClass: 'border-info/30' },",
  "  done: { label: '已完成', badgeClass: 'badge badge-success badge-outline', dotClass: 'bg-success', cardClass: 'border-success/30' },",
  '};',
  '',
  'const PreviewPanel: FC = () => {',
  '  const todos = ref<TodoItem[]>(INITIAL_TODOS);',
  "  const draft = ref('');",
  "  const search = ref('');",
  "  const activeFilter = ref<TodoFilter>('all');",
  '  const editingId = ref<number | null>(null);',
  "  const editingTitle = ref('');",
  '  const nextId = ref(INITIAL_TODOS.length + 1);',
  '',
  '  const counts = computed(() => ({',
  '    total: todos.value.filter(item => !item.archived).length,',
  "    todo: todos.value.filter(item => !item.archived && item.status === 'todo').length,",
  "    doing: todos.value.filter(item => !item.archived && item.status === 'doing').length,",
  "    done: todos.value.filter(item => !item.archived && item.status === 'done').length,",
  '    archived: todos.value.filter(item => item.archived).length,',
  '  }));',
  '',
  '  const visibleTodos = computed(() => {',
  '    const keyword = search.value.trim().toLowerCase();',
  '    return todos.value.filter(item => {',
  '      const matchesKeyword = !keyword || item.title.toLowerCase().includes(keyword);',
  '      if (!matchesKeyword) return false;',
  "      if (activeFilter.value === 'archived') return item.archived;",
  '      if (item.archived) return false;',
  "      if (activeFilter.value === 'all') return true;",
  '      return item.status === activeFilter.value;',
  '    });',
  '  });',
  '',
  '  const addTodo = () => {',
  '    const title = draft.value.trim();',
  '    if (!title) return;',
  '    todos.value = [',
  '      {',
  '        id: nextId.value++,',
  '        title,',
  "        status: 'todo',",
  '        archived: false,',
  "        createdAt: '刚刚',",
  '      },',
  '      ...todos.value,',
  '    ];',
  "    draft.value = '';",
  '  };',
  '',
  '  const removeTodo = (id: number) => {',
  '    todos.value = todos.value.filter(item => item.id !== id);',
  '    if (editingId.value === id) {',
  '      editingId.value = null;',
  "      editingTitle.value = '';",
  '    }',
  '  };',
  '',
  '  const updateStatus = (id: number, status: TodoStatus) => {',
  '    todos.value = todos.value.map(item => (item.id === id ? { ...item, status, archived: false } : item));',
  '  };',
  '',
  '  const toggleArchived = (id: number) => {',
  '    todos.value = todos.value.map(item => (item.id === id ? { ...item, archived: !item.archived } : item));',
  '  };',
  '',
  '  const startEditing = (item: TodoItem) => {',
  '    editingId.value = item.id;',
  '    editingTitle.value = item.title;',
  '  };',
  '',
  '  const cancelEditing = () => {',
  '    editingId.value = null;',
  "    editingTitle.value = '';",
  '  };',
  '',
  '  const saveEditing = (id: number) => {',
  '    const title = editingTitle.value.trim();',
  '    if (!title) return;',
  '    todos.value = todos.value.map(item => (item.id === id ? { ...item, title } : item));',
  '    cancelEditing();',
  '  };',
  '',
  '  return (',
  '    <div className="grid gap-6">',
  '      <div className="card overflow-hidden border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-primary/5 shadow-xl">',
  '        <div className="card-body gap-6">',
  '          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">',
  '            <div className="space-y-2">',
  '              <div className="badge badge-primary badge-outline">Rue Todo Studio</div>',
  '              <h2 className="text-3xl font-semibold">一个完整的 Todo 应用示例</h2>',
  '              <p className="max-w-2xl text-sm leading-6 text-base-content/70">支持新增、搜索、编辑标题、状态变更、删除、归档和恢复，并展示实时统计信息。</p>',
  '            </div>',
  '            <div className="stats stats-vertical bg-base-100 shadow sm:stats-horizontal">',
  '              <div className="stat px-6 py-4"><div className="stat-title">活跃任务</div><div className="stat-value text-primary">{counts.get().total}</div></div>',
  '              <div className="stat px-6 py-4"><div className="stat-title">已完成</div><div className="stat-value text-success">{counts.get().done}</div></div>',
  '              <div className="stat px-6 py-4"><div className="stat-title">已归档</div><div className="stat-value text-secondary">{counts.get().archived}</div></div>',
  '            </div>',
  '          </div>',
  '',
  '          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">',
  '            <label className="form-control w-full">',
  '              <div className="label"><span className="label-text font-medium">新增任务</span></div>',
  '              <div className="join w-full">',
  '                <input',
  '                  className="input input-bordered join-item w-full"',
  '                  value={draft.value}',
  '                  placeholder="例如：实现 Todo 应用的归档功能"',
  '                  onInput={(e: any) => { draft.value = (e.target as HTMLInputElement).value; }}',
  "                  onKeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') addTodo(); }}",
  '                />',
  '                <button className="btn btn-primary join-item" onClick={addTodo}>添加</button>',
  '              </div>',
  '            </label>',
  '',
  '            <label className="form-control w-full">',
  '              <div className="label"><span className="label-text font-medium">搜索任务</span></div>',
  '              <input',
  '                className="input input-bordered w-full"',
  '                value={search.value}',
  '                placeholder="按标题筛选任务"',
  '                onInput={(e: any) => { search.value = (e.target as HTMLInputElement).value; }}',
  '              />',
  '            </label>',
  '          </div>',
  '',
  '          <div className="flex flex-wrap gap-2">',
  '            {FILTER_OPTIONS.map(filter => (',
  '              <button',
  '                key={filter.key}',
  "                className={`btn btn-sm ${activeFilter.value === filter.key ? 'btn-primary' : 'btn-ghost border border-base-300'}`}",
  '                onClick={() => { activeFilter.value = filter.key; }}',
  '              >',
  '                {filter.label}',
  '              </button>',
  '            ))}',
  '          </div>',
  '        </div>',
  '      </div>',
  '',
  '      <div className="grid gap-4 md:grid-cols-3">',
  '        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5"><p className="text-sm text-base-content/70">待开始</p><p className="mt-2 text-3xl font-semibold">{counts.get().todo}</p></div>',
  '        <div className="rounded-2xl border border-info/30 bg-info/10 p-5"><p className="text-sm text-base-content/70">进行中</p><p className="mt-2 text-3xl font-semibold">{counts.get().doing}</p></div>',
  '        <div className="rounded-2xl border border-success/30 bg-success/10 p-5"><p className="text-sm text-base-content/70">已完成</p><p className="mt-2 text-3xl font-semibold">{counts.get().done}</p></div>',
  '      </div>',
  '',
  '      <div className="grid gap-4">',
  '        {visibleTodos.get().length ? (',
  '          visibleTodos.get().map(item => {',
  '            const meta = STATUS_META[item.status];',
  '            const isEditing = editingId.value === item.id;',
  '            return (',
  "              <div key={item.id} className={`card border bg-base-100 shadow-sm transition-all ${meta.cardClass} ${item.archived ? 'opacity-75' : 'hover:-translate-y-0.5 hover:shadow-md'}`}>",
  '                <div className="card-body gap-4">',
  '                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">',
  '                    <div className="space-y-3 flex-1">',
  '                      <div className="flex flex-wrap items-center gap-2">',
  '                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dotClass}`}></span>',
  '                        <span className={meta.badgeClass}>{meta.label}</span>',
  '                        {item.archived && <span className="badge badge-secondary badge-outline">已归档</span>}',
  '                        <span className="text-xs text-base-content/50">创建于 {item.createdAt}</span>',
  '                      </div>',
  '',
  '                      {!isEditing && (',
  "                        <h3 className={`text-xl font-semibold ${item.status === 'done' ? 'text-base-content/50 line-through' : 'text-base-content'}`}>",
  '                          {item.title}',
  '                        </h3>',
  '                      )}',
  '',
  '                      {isEditing && (',
  '                        <div className="flex flex-col gap-3 sm:flex-row">',
  '                          <input',
  '                            className="input input-bordered w-full"',
  '                            value={editingTitle.value}',
  '                            onInput={(e: any) => { editingTitle.value = (e.target as HTMLInputElement).value; }}',
  '                            onKeydown={(e: KeyboardEvent) => {',
  "                              if (e.key === 'Enter') saveEditing(item.id);",
  "                              if (e.key === 'Escape') cancelEditing();",
  '                            }}',
  '                          />',
  '                          <div className="flex gap-2">',
  '                            <button className="btn btn-primary btn-sm" onClick={() => saveEditing(item.id)}>保存</button>',
  '                            <button className="btn btn-ghost btn-sm" onClick={cancelEditing}>取消</button>',
  '                          </div>',
  '                        </div>',
  '                      )}',
  '',
  '                      <div className="flex flex-wrap gap-2">',
  '                        {STATUS_OPTIONS.map(option => (',
  '                          <button',
  '                            key={option.key}',
  "                            className={`btn btn-xs ${item.status === option.key ? 'btn-neutral' : 'btn-ghost border border-base-300'}`}",
  '                            onClick={() => updateStatus(item.id, option.key)}',
  '                          >',
  '                            {option.label}',
  '                          </button>',
  '                        ))}',
  '                      </div>',
  '                    </div>',
  '',
  '                    <div className="flex flex-wrap gap-2 lg:justify-end">',
  '                      {!isEditing && <button className="btn btn-sm btn-outline" onClick={() => startEditing(item)}>改名</button>}',
  "                      <button className=\"btn btn-sm btn-outline btn-secondary\" onClick={() => toggleArchived(item.id)}>{item.archived ? '恢复' : '归档'}</button>",
  '                      <button className="btn btn-sm btn-outline btn-error" onClick={() => removeTodo(item.id)}>删除</button>',
  '                    </div>',
  '                  </div>',
  '                </div>',
  '              </div>',
  '            );',
  '          })',
  '        ) : (',
  '          <div className="card border border-dashed border-base-300 bg-base-100 shadow-sm">',
  '            <div className="card-body items-center py-14 text-center">',
  '              <h3 className="text-xl font-semibold">当前筛选下没有任务</h3>',
  '              <p className="max-w-md text-sm leading-6 text-base-content/70">试试切换筛选、搜索关键字，或者直接新增一条任务。</p>',
  '            </div>',
  '          </div>',
  '        )}',
  '      </div>',
  '    </div>',
  '  );',
  '};',
].join('\n')

const PreviewPanel: FC = () => {
  const todos = ref<TodoItem[]>(INITIAL_TODOS)
  const draft = ref('')
  const search = ref('')
  const activeFilter = ref<TodoFilter>('all')
  const editingId = ref<number | null>(null)
  const editingTitle = ref('')
  const nextId = ref(INITIAL_TODOS.length + 1)

  const counts = computed(() => ({
    total: todos.value.filter(item => !item.archived).length,
    todo: todos.value.filter(item => !item.archived && item.status === 'todo').length,
    doing: todos.value.filter(item => !item.archived && item.status === 'doing').length,
    done: todos.value.filter(item => !item.archived && item.status === 'done').length,
    archived: todos.value.filter(item => item.archived).length,
  }))

  const visibleTodos = computed(() => {
    const keyword = search.value.trim().toLowerCase()

    return todos.value.filter(item => {
      const matchesKeyword = !keyword || item.title.toLowerCase().includes(keyword)
      if (!matchesKeyword) {
        return false
      }

      if (activeFilter.value === 'archived') {
        return item.archived
      }

      if (item.archived) {
        return false
      }

      if (activeFilter.value === 'all') {
        return true
      }

      return item.status === activeFilter.value
    })
  })

  const addTodo = () => {
    const title = draft.value.trim()
    if (!title) {
      return
    }

    todos.value = [
      {
        id: nextId.value++,
        title,
        status: 'todo',
        archived: false,
        createdAt: '刚刚',
      },
      ...todos.value,
    ]
    draft.value = ''
  }

  const removeTodo = (id: number) => {
    todos.value = todos.value.filter(item => item.id !== id)
    if (editingId.value === id) {
      editingId.value = null
      editingTitle.value = ''
    }
  }

  const updateStatus = (id: number, status: TodoStatus) => {
    todos.value = todos.value.map(item =>
      item.id === id ? { ...item, status, archived: false } : item,
    )
  }

  const toggleArchived = (id: number) => {
    todos.value = todos.value.map(item =>
      item.id === id ? { ...item, archived: !item.archived } : item,
    )
  }

  const startEditing = (item: TodoItem) => {
    editingId.value = item.id
    editingTitle.value = item.title
  }

  const cancelEditing = () => {
    editingId.value = null
    editingTitle.value = ''
  }

  const saveEditing = (id: number) => {
    const title = editingTitle.value.trim()
    if (!title) {
      return
    }

    todos.value = todos.value.map(item => (item.id === id ? { ...item, title } : item))
    cancelEditing()
  }

  return (
    <div className="grid gap-6">
      <div className="card overflow-hidden border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-primary/5 shadow-xl">
        <div className="card-body gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="badge badge-primary badge-outline">Rue Todo Studio</div>
              <h2 className="text-3xl font-semibold">一个完整的 Todo 应用示例</h2>
              <p className="max-w-2xl text-sm leading-6 text-base-content/70">
                支持新增、搜索、编辑标题、状态变更、删除、归档和恢复，并展示实时统计信息。
              </p>
            </div>

            <div className="stats stats-vertical bg-base-100 shadow sm:stats-horizontal">
              <div className="stat px-6 py-4">
                <div className="stat-title">活跃任务</div>
                <div className="stat-value text-primary">{counts.get().total}</div>
              </div>
              <div className="stat px-6 py-4">
                <div className="stat-title">已完成</div>
                <div className="stat-value text-success">{counts.get().done}</div>
              </div>
              <div className="stat px-6 py-4">
                <div className="stat-title">已归档</div>
                <div className="stat-value text-secondary">{counts.get().archived}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-medium">新增任务</span>
              </div>
              <div className="join w-full">
                <input
                  className="input input-bordered join-item w-full"
                  value={draft.value}
                  placeholder="例如：实现 Todo 应用的归档功能"
                  onInput={(e: any) => {
                    draft.value = (e.target as HTMLInputElement).value
                  }}
                  onKeydown={(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      addTodo()
                    }
                  }}
                />
                <button className="btn btn-primary join-item" onClick={addTodo}>
                  添加
                </button>
              </div>
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-medium">搜索任务</span>
              </div>
              <input
                className="input input-bordered w-full"
                value={search.value}
                placeholder="按标题筛选任务"
                onInput={(e: any) => {
                  search.value = (e.target as HTMLInputElement).value
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map(filter => (
              <button
                key={filter.key}
                className={`btn btn-sm ${
                  activeFilter.value === filter.key
                    ? 'btn-primary'
                    : 'btn-ghost border border-base-300'
                }`}
                onClick={() => {
                  activeFilter.value = filter.key
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5">
          <p className="text-sm text-base-content/70">待开始</p>
          <p className="mt-2 text-3xl font-semibold">{counts.get().todo}</p>
        </div>
        <div className="rounded-2xl border border-info/30 bg-info/10 p-5">
          <p className="text-sm text-base-content/70">进行中</p>
          <p className="mt-2 text-3xl font-semibold">{counts.get().doing}</p>
        </div>
        <div className="rounded-2xl border border-success/30 bg-success/10 p-5">
          <p className="text-sm text-base-content/70">已完成</p>
          <p className="mt-2 text-3xl font-semibold">{counts.get().done}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {visibleTodos.get().length ? (
          visibleTodos.get().map(item => {
            const meta = STATUS_META[item.status]
            const isEditing = editingId.value === item.id

            return (
              <div
                key={item.id}
                className={`card border bg-base-100 shadow-sm transition-all ${meta.cardClass} ${
                  item.archived ? 'opacity-75' : 'hover:-translate-y-0.5 hover:shadow-md'
                }`}
              >
                <div className="card-body gap-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dotClass}`}
                        ></span>
                        <span className={meta.badgeClass}>{meta.label}</span>
                        {item.archived && (
                          <span className="badge badge-secondary badge-outline">已归档</span>
                        )}
                        <span className="text-xs text-base-content/50">
                          创建于 {item.createdAt}
                        </span>
                      </div>

                      {!isEditing && (
                        <h3
                          className={`text-xl font-semibold ${
                            item.status === 'done'
                              ? 'text-base-content/50 line-through'
                              : 'text-base-content'
                          }`}
                        >
                          {item.title}
                        </h3>
                      )}

                      {isEditing && (
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <input
                            className="input input-bordered w-full"
                            value={editingTitle.value}
                            onInput={(e: any) => {
                              editingTitle.value = (e.target as HTMLInputElement).value
                            }}
                            onKeydown={(e: KeyboardEvent) => {
                              if (e.key === 'Enter') {
                                saveEditing(item.id)
                              }
                              if (e.key === 'Escape') {
                                cancelEditing()
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => saveEditing(item.id)}
                            >
                              保存
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={cancelEditing}>
                              取消
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map(option => (
                          <button
                            key={option.key}
                            className={`btn btn-xs ${
                              item.status === option.key
                                ? 'btn-neutral'
                                : 'btn-ghost border border-base-300'
                            }`}
                            onClick={() => updateStatus(item.id, option.key)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {!isEditing && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => startEditing(item)}
                        >
                          改名
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline btn-secondary"
                        onClick={() => toggleArchived(item.id)}
                      >
                        {item.archived ? '恢复' : '归档'}
                      </button>
                      <button
                        className="btn btn-sm btn-outline btn-error"
                        onClick={() => removeTodo(item.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="card border border-dashed border-base-300 bg-base-100 shadow-sm">
            <div className="card-body items-center py-14 text-center">
              <h3 className="text-xl font-semibold">当前筛选下没有任务</h3>
              <p className="max-w-md text-sm leading-6 text-base-content/70">
                试试切换筛选、搜索关键字，或者直接新增一条任务。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const TodoApp: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <h1 className="mb-4 text-5xl font-semibold md:mb-4">Todo 应用（完整实战示例）</h1>

      <div role="tablist" className="tabs tabs-box">
        <button
          role="tab"
          className={`tab ${activeTab.value === 'preview' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'preview'
          }}
        >
          效果
        </button>
        <button
          role="tab"
          className={`tab ${activeTab.value === 'code' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'code'
          }}
        >
          代码
        </button>
      </div>

      <div className="mt-4 grid items-start gap-6 md:grid-cols-1">
        {activeTab.value === 'preview' && <PreviewPanel />}

        {activeTab.value === 'code' && (
          <div className="card h-[420px] overflow-auto bg-base-100 shadow md:h-[920px]">
            <div className="card-body p-0">
              <Code className="h-full" lang="tsx" code={SOURCE_CODE} />
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default TodoApp
