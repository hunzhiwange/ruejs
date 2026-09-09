import { type FC, computed, ref, useState, watchEffect } from '@rue-js/rue'
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
  createdOrder: number
}

type PersistedTodoState = {
  todos: TodoItem[]
  search: string
  activeFilter: TodoFilter
}

const FILTER_OPTIONS: Array<{ key: TodoFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待开始' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' },
  { key: 'archived', label: '已归档' },
]

const STATUS_OPTIONS: Array<{ key: TodoStatus; label: string; actionLabel: string }> = [
  { key: 'todo', label: '待开始', actionLabel: '设为待开始' },
  { key: 'doing', label: '进行中', actionLabel: '设为进行中' },
  { key: 'done', label: '已完成', actionLabel: '设为已完成' },
]

const TODO_STORAGE_KEY = 'rue.todoapp.state'

const MINUTE_IN_MS = 60 * 1000
const HOUR_IN_MS = 60 * MINUTE_IN_MS
const DAY_IN_MS = 24 * HOUR_IN_MS

const padDatePart = (value: number) => String(value).padStart(2, '0')

const formatCalendarDateTime = (value: Date, includeYear = true) => {
  const month = padDatePart(value.getMonth() + 1)
  const day = padDatePart(value.getDate())
  const hours = padDatePart(value.getHours())
  const minutes = padDatePart(value.getMinutes())

  if (includeYear) {
    return `${value.getFullYear()}-${month}-${day} ${hours}:${minutes}`
  }

  return `${month}-${day} ${hours}:${minutes}`
}

const isSameCalendarDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const parseCreatedAtValue = (value: string, now = new Date()) => {
  const directDate = new Date(value)
  if (!Number.isNaN(directDate.getTime())) {
    return directDate
  }

  if (value === '刚刚') {
    return new Date(now.getTime() - 30 * 1000)
  }

  const minutesAgoMatch = /^(\d+)\s*分钟前$/.exec(value)
  if (minutesAgoMatch) {
    return new Date(now.getTime() - Number(minutesAgoMatch[1]) * MINUTE_IN_MS)
  }

  const hoursAgoMatch = /^(\d+)\s*小时前$/.exec(value)
  if (hoursAgoMatch) {
    return new Date(now.getTime() - Number(hoursAgoMatch[1]) * HOUR_IN_MS)
  }

  const todayMatch = /^今天\s+(\d{1,2}):(\d{2})$/.exec(value)
  if (todayMatch) {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      Number(todayMatch[1]),
      Number(todayMatch[2]),
    )
  }

  const yesterdayMatch = /^昨天\s+(\d{1,2}):(\d{2})$/.exec(value)
  if (yesterdayMatch) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      Number(yesterdayMatch[1]),
      Number(yesterdayMatch[2]),
    )
  }

  return null
}

const normalizeCreatedAt = (value: string, fallbackCreatedOrder: number) => {
  const parsed = parseCreatedAtValue(value)
  if (parsed) {
    return parsed.toISOString()
  }

  return new Date(Date.now() - Math.max(1, fallbackCreatedOrder) * MINUTE_IN_MS).toISOString()
}

const formatTodoCreatedAt = (value: string, now = new Date()) => {
  const parsed = parseCreatedAtValue(value, now)
  if (!parsed) {
    return value
  }

  const diffMs = now.getTime() - parsed.getTime()
  if (diffMs < 0) {
    return formatCalendarDateTime(parsed)
  }

  if (diffMs < MINUTE_IN_MS) {
    return '刚刚'
  }

  if (diffMs < HOUR_IN_MS) {
    return `${Math.max(1, Math.floor(diffMs / MINUTE_IN_MS))} 分钟前`
  }

  const shouldFormatRelativeHours = isSameCalendarDay(parsed, now) || diffMs < 6 * HOUR_IN_MS
  if (shouldFormatRelativeHours) {
    return `${Math.max(1, Math.floor(diffMs / HOUR_IN_MS))} 小时前`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (diffMs < 2 * DAY_IN_MS && isSameCalendarDay(parsed, yesterday)) {
    return `昨天 ${padDatePart(parsed.getHours())}:${padDatePart(parsed.getMinutes())}`
  }

  if (parsed.getFullYear() === now.getFullYear()) {
    return formatCalendarDateTime(parsed, false)
  }

  return formatCalendarDateTime(parsed)
}

const INITIAL_TODOS: TodoItem[] = [
  {
    id: 1,
    title: '整理 Rue 3.0 示例文档结构',
    status: 'doing',
    archived: false,
    createdAt: new Date(Date.now() - 100 * MINUTE_IN_MS).toISOString(),
    createdOrder: 3,
  },
  {
    id: 2,
    title: '补充 Todo App 的交互与视觉细节',
    status: 'todo',
    archived: false,
    createdAt: new Date(Date.now() - 35 * MINUTE_IN_MS).toISOString(),
    createdOrder: 4,
  },
  {
    id: 3,
    title: '复查按钮、输入框与卡片层级样式',
    status: 'done',
    archived: false,
    createdAt: new Date(Date.now() - 26 * HOUR_IN_MS).toISOString(),
    createdOrder: 2,
  },
  {
    id: 4,
    title: '归档旧版草稿设计',
    status: 'done',
    archived: true,
    createdAt: new Date(Date.now() - 40 * HOUR_IN_MS).toISOString(),
    createdOrder: 1,
  },
]

const isTodoStatus = (value: unknown): value is TodoStatus =>
  value === 'todo' || value === 'doing' || value === 'done'

const isTodoFilter = (value: unknown): value is TodoFilter =>
  value === 'all' ||
  value === 'todo' ||
  value === 'doing' ||
  value === 'done' ||
  value === 'archived'

const getTodoStorage = () => {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null
  }

  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

const parsePersistedTodoItem = (value: unknown, fallbackCreatedOrder: number): TodoItem | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<TodoItem>

  if (
    typeof candidate.id !== 'number' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.archived !== 'boolean' ||
    typeof candidate.createdAt !== 'string' ||
    !isTodoStatus(candidate.status)
  ) {
    return null
  }

  return {
    id: candidate.id,
    title: candidate.title,
    archived: candidate.archived,
    status: candidate.status,
    createdAt: normalizeCreatedAt(candidate.createdAt, fallbackCreatedOrder),
    createdOrder:
      typeof candidate.createdOrder === 'number' && Number.isFinite(candidate.createdOrder)
        ? candidate.createdOrder
        : fallbackCreatedOrder,
  }
}

const loadPersistedTodoState = (): PersistedTodoState | null => {
  const storage = getTodoStorage()

  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem(TODO_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as {
      todos?: unknown
      search?: unknown
      activeFilter?: unknown
    }

    let todos = INITIAL_TODOS

    if (Array.isArray(parsed.todos)) {
      const persistedTodos = parsed.todos
        .map((item, index, source) => parsePersistedTodoItem(item, source.length - index))
        .filter((item): item is TodoItem => item !== null)

      todos =
        parsed.todos.length === 0 || persistedTodos.length > 0 ? persistedTodos : INITIAL_TODOS
    }

    return {
      todos,
      search: typeof parsed.search === 'string' ? parsed.search : '',
      activeFilter: isTodoFilter(parsed.activeFilter) ? parsed.activeFilter : 'all',
    }
  } catch {
    return null
  }
}

const persistTodoState = (state: PersistedTodoState) => {
  const storage = getTodoStorage()

  if (!storage) {
    return
  }

  try {
    storage.setItem(TODO_STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

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
  "import { type FC, computed, ref, watchEffect } from '@rue-js/rue';",
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
  '  createdOrder: number;',
  '};',
  '',
  'type PersistedTodoState = {',
  '  todos: TodoItem[];',
  '  search: string;',
  '  activeFilter: TodoFilter;',
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
  'const STATUS_OPTIONS: Array<{ key: TodoStatus; label: string; actionLabel: string }> = [',
  "  { key: 'todo', label: '待开始', actionLabel: '设为待开始' },",
  "  { key: 'doing', label: '进行中', actionLabel: '设为进行中' },",
  "  { key: 'done', label: '已完成', actionLabel: '设为已完成' },",
  '];',
  '',
  "const TODO_STORAGE_KEY = 'rue.todoapp.state';",
  '',
  'const MINUTE_IN_MS = 60 * 1000;',
  'const HOUR_IN_MS = 60 * MINUTE_IN_MS;',
  'const DAY_IN_MS = 24 * HOUR_IN_MS;',
  '',
  "const padDatePart = (value: number) => String(value).padStart(2, '0');",
  '',
  'const formatCalendarDateTime = (value: Date, includeYear = true) => {',
  '  const month = padDatePart(value.getMonth() + 1);',
  '  const day = padDatePart(value.getDate());',
  '  const hours = padDatePart(value.getHours());',
  '  const minutes = padDatePart(value.getMinutes());',
  '  if (includeYear) return `${value.getFullYear()}-${month}-${day} ${hours}:${minutes}`;',
  '  return `${month}-${day} ${hours}:${minutes}`;',
  '};',
  '',
  'const isSameCalendarDay = (left: Date, right: Date) =>',
  '  left.getFullYear() === right.getFullYear() &&',
  '  left.getMonth() === right.getMonth() &&',
  '  left.getDate() === right.getDate();',
  '',
  'const parseCreatedAtValue = (value: string, now = new Date()) => {',
  '  const directDate = new Date(value);',
  '  if (!Number.isNaN(directDate.getTime())) return directDate;',
  "  if (value === '刚刚') return new Date(now.getTime() - 30 * 1000);",
  '  const minutesAgoMatch = /^(\\d+)\\s*分钟前$/.exec(value);',
  '  if (minutesAgoMatch) return new Date(now.getTime() - Number(minutesAgoMatch[1]) * MINUTE_IN_MS);',
  '  const hoursAgoMatch = /^(\\d+)\\s*小时前$/.exec(value);',
  '  if (hoursAgoMatch) return new Date(now.getTime() - Number(hoursAgoMatch[1]) * HOUR_IN_MS);',
  '  const todayMatch = /^今天\\s+(\\d{1,2}):(\\d{2})$/.exec(value);',
  '  if (todayMatch) {',
  '    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(todayMatch[1]), Number(todayMatch[2]));',
  '  }',
  '  const yesterdayMatch = /^昨天\\s+(\\d{1,2}):(\\d{2})$/.exec(value);',
  '  if (yesterdayMatch) {',
  '    const yesterday = new Date(now);',
  '    yesterday.setDate(yesterday.getDate() - 1);',
  '    return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), Number(yesterdayMatch[1]), Number(yesterdayMatch[2]));',
  '  }',
  '  return null;',
  '};',
  '',
  'const normalizeCreatedAt = (value: string, fallbackCreatedOrder: number) => {',
  '  const parsed = parseCreatedAtValue(value);',
  '  if (parsed) return parsed.toISOString();',
  '  return new Date(Date.now() - Math.max(1, fallbackCreatedOrder) * MINUTE_IN_MS).toISOString();',
  '};',
  '',
  'const formatTodoCreatedAt = (value: string, now = new Date()) => {',
  '  const parsed = parseCreatedAtValue(value, now);',
  '  if (!parsed) return value;',
  '  const diffMs = now.getTime() - parsed.getTime();',
  '  if (diffMs < 0) return formatCalendarDateTime(parsed);',
  "  if (diffMs < MINUTE_IN_MS) return '刚刚';",
  '  if (diffMs < HOUR_IN_MS) return `${Math.max(1, Math.floor(diffMs / MINUTE_IN_MS))} 分钟前`;',
  '  if (isSameCalendarDay(parsed, now)) return `${Math.max(1, Math.floor(diffMs / HOUR_IN_MS))} 小时前`;',
  '  const yesterday = new Date(now);',
  '  yesterday.setDate(yesterday.getDate() - 1);',
  '  if (diffMs < 2 * DAY_IN_MS && isSameCalendarDay(parsed, yesterday)) {',
  '    return `昨天 ${padDatePart(parsed.getHours())}:${padDatePart(parsed.getMinutes())}`;',
  '  }',
  '  if (parsed.getFullYear() === now.getFullYear()) return formatCalendarDateTime(parsed, false);',
  '  return formatCalendarDateTime(parsed);',
  '};',
  '',
  'const INITIAL_TODOS: TodoItem[] = [',
  "  { id: 1, title: '整理 Rue 3.0 示例文档结构', status: 'doing', archived: false, createdAt: new Date(Date.now() - 100 * MINUTE_IN_MS).toISOString(), createdOrder: 3 },",
  "  { id: 2, title: '补充 Todo App 的交互与视觉细节', status: 'todo', archived: false, createdAt: new Date(Date.now() - 35 * MINUTE_IN_MS).toISOString(), createdOrder: 4 },",
  "  { id: 3, title: '复查按钮、输入框与卡片层级样式', status: 'done', archived: false, createdAt: new Date(Date.now() - 26 * HOUR_IN_MS).toISOString(), createdOrder: 2 },",
  "  { id: 4, title: '归档旧版草稿设计', status: 'done', archived: true, createdAt: new Date(Date.now() - 40 * HOUR_IN_MS).toISOString(), createdOrder: 1 },",
  '',
  "const isTodoStatus = (value: unknown): value is TodoStatus => value === 'todo' || value === 'doing' || value === 'done';",
  '',
  "const isTodoFilter = (value: unknown): value is TodoFilter => value === 'all' || value === 'todo' || value === 'doing' || value === 'done' || value === 'archived';",
  '',
  'const getTodoStorage = () => {',
  "  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return null;",
  '  try {',
  '    return globalThis.localStorage;',
  '  } catch {',
  '    return null;',
  '  }',
  '};',
  '',
  'const parsePersistedTodoItem = (value: unknown, fallbackCreatedOrder: number): TodoItem | null => {',
  "  if (!value || typeof value !== 'object') return null;",
  '  const candidate = value as Partial<TodoItem>;',
  "  if (typeof candidate.id !== 'number' || typeof candidate.title !== 'string' || typeof candidate.archived !== 'boolean' || typeof candidate.createdAt !== 'string' || !isTodoStatus(candidate.status)) return null;",
  '  return {',
  '    id: candidate.id,',
  '    title: candidate.title,',
  '    archived: candidate.archived,',
  '    status: candidate.status,',
  '    createdAt: normalizeCreatedAt(candidate.createdAt, fallbackCreatedOrder),',
  "    createdOrder: typeof candidate.createdOrder === 'number' && Number.isFinite(candidate.createdOrder) ? candidate.createdOrder : fallbackCreatedOrder,",
  '  };',
  '};',
  '',
  'const loadPersistedTodoState = (): PersistedTodoState | null => {',
  '  const storage = getTodoStorage();',
  '  if (!storage) return null;',
  '  try {',
  '    const raw = storage.getItem(TODO_STORAGE_KEY);',
  '    if (!raw) return null;',
  '    const parsed = JSON.parse(raw) as { todos?: unknown; search?: unknown; activeFilter?: unknown };',
  '    let todos = INITIAL_TODOS;',
  '    if (Array.isArray(parsed.todos)) {',
  '      const persistedTodos = parsed.todos',
  '        .map((item, index, source) => parsePersistedTodoItem(item, source.length - index))',
  '        .filter((item): item is TodoItem => item !== null);',
  '      todos = parsed.todos.length === 0 || persistedTodos.length > 0 ? persistedTodos : INITIAL_TODOS;',
  '    }',
  '    return {',
  '      todos,',
  "      search: typeof parsed.search === 'string' ? parsed.search : '',",
  "      activeFilter: isTodoFilter(parsed.activeFilter) ? parsed.activeFilter : 'all',",
  '    };',
  '  } catch {',
  '    return null;',
  '  }',
  '};',
  '',
  'const persistTodoState = (state: PersistedTodoState) => {',
  '  const storage = getTodoStorage();',
  '  if (!storage) return;',
  '  try {',
  '    storage.setItem(TODO_STORAGE_KEY, JSON.stringify(state));',
  '  } catch {}',
  '};',
  '',
  'const STATUS_META = {',
  "  todo: { label: '待开始', badgeClass: 'badge badge-warning badge-outline', dotClass: 'bg-warning', cardClass: 'border-warning/30' },",
  "  doing: { label: '进行中', badgeClass: 'badge badge-info badge-outline', dotClass: 'bg-info', cardClass: 'border-info/30' },",
  "  done: { label: '已完成', badgeClass: 'badge badge-success badge-outline', dotClass: 'bg-success', cardClass: 'border-success/30' },",
  '};',
  '',
  'const PreviewPanel: FC = () => {',
  '  const persistedState = loadPersistedTodoState();',
  '  const initialTodos = persistedState?.todos ?? INITIAL_TODOS;',
  '  const todos = ref<TodoItem[]>(initialTodos);',
  "  const draft = ref('');",
  "  const search = ref(persistedState?.search ?? '');",
  "  const activeFilter = ref<TodoFilter>(persistedState?.activeFilter ?? 'all');",
  '  const editingId = ref<number | null>(null);',
  "  const editingTitle = ref('');",
  '  const nextId = ref(initialTodos.reduce((max, item) => Math.max(max, item.id), 0) + 1);',
  '  const nextCreatedOrder = ref(initialTodos.reduce((max, item) => Math.max(max, item.createdOrder), 0) + 1);',
  '',
  '  watchEffect(() => {',
  '    persistTodoState({',
  '      todos: todos.value,',
  '      search: search.value,',
  '      activeFilter: activeFilter.value,',
  '    });',
  '  });',
  '',
  '  const counts = computed(() => ({',
  '    total: todos.value.filter(item => !item.archived).length,',
  "    todo: todos.value.filter(item => !item.archived && item.status === 'todo').length,",
  "    doing: todos.value.filter(item => !item.archived && item.status === 'doing').length,",
  "    done: todos.value.filter(item => !item.archived && item.status === 'done').length,",
  '    archived: todos.value.filter(item => item.archived).length,',
  '  }));',
  '',
  '  const overviewCards = computed(() => {',
  '    const snapshot = counts.get();',
  '    const cards = [',
  "      { key: 'todo' as const, label: '待开始', value: snapshot.todo, className: 'border-warning/30 bg-warning/10' },",
  "      { key: 'doing' as const, label: '进行中', value: snapshot.doing, className: 'border-info/30 bg-info/10' },",
  "      { key: 'done' as const, label: '已完成', value: snapshot.done, className: 'border-success/30 bg-success/10' },",
  '    ];',
  "    if (activeFilter.value === 'all') return cards;",
  "    if (activeFilter.value === 'archived') return [{ key: 'archived' as const, label: '已归档', value: snapshot.archived, className: 'border-secondary/30 bg-secondary/10' }];",
  '    return cards.filter(card => card.key === activeFilter.value);',
  '  });',
  '',
  '  const visibleTodos = computed(() => {',
  '    const keyword = search.value.trim().toLowerCase();',
  '    return todos.value',
  '      .filter(item => {',
  '        const matchesKeyword = !keyword || item.title.toLowerCase().includes(keyword);',
  '        if (!matchesKeyword) return false;',
  "        if (activeFilter.value === 'archived') return item.archived;",
  '        if (item.archived) return false;',
  "        if (activeFilter.value === 'all') return true;",
  '        return item.status === activeFilter.value;',
  '      })',
  '      .sort((left, right) => right.createdOrder - left.createdOrder);',
  '  });',
  '',
  '  const visibleTodoCards = computed(() => {',
  '    const currentEditingId = editingId.value;',
  '    const currentEditingTitle = editingTitle.value;',
  '    return visibleTodos.get().map(item => ({',
  '      item,',
  '      meta: STATUS_META[item.status],',
  '      isEditing: currentEditingId === item.id,',
  '      editingValue: currentEditingId === item.id ? currentEditingTitle : item.title,',
  '    }));',
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
  '        createdAt: new Date().toISOString(),',
  '        createdOrder: nextCreatedOrder.value++,',
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
  "                  onKeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addTodo(); } }}",
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
  '      <div className={`grid gap-4 ${overviewCards.get().length > 1 ? "md:grid-cols-3" : "md:grid-cols-1"}`}>',
  '        {overviewCards.get().map(card => (',
  '          <div key={card.key} className={`rounded-2xl border p-5 ${card.className}`}>',
  '            <p className="text-sm text-base-content/70">{card.label}</p>',
  '            <p className="mt-2 text-3xl font-semibold">{card.value}</p>',
  '          </div>',
  '        ))}',
  '      </div>',
  '',
  '      <div className="grid gap-4">',
  '        {visibleTodoCards.get().map(card => (',
  "          <div key={card.item.id} className={`card border bg-base-100 shadow-sm transition-all ${card.meta.cardClass} ${card.item.archived ? 'opacity-75' : 'hover:-translate-y-0.5 hover:shadow-md'}`}>",
  '            <div className="card-body gap-4">',
  '              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">',
  '                <div className="space-y-3 flex-1">',
  '                  <div className="flex flex-wrap items-center gap-2">',
  '                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${card.meta.dotClass}`}></span>',
  '                    <span className={card.meta.badgeClass}>{card.meta.label}</span>',
  '                    {card.item.archived && <span className="badge badge-secondary badge-outline">已归档</span>}',
  '                    <span className="text-xs text-base-content/50">创建于 {formatTodoCreatedAt(card.item.createdAt)}</span>',
  '                  </div>',
  '',
  '                  <h3',
  '                    className={`text-xl font-semibold ${',
  "                      card.isEditing ? 'hidden' : card.item.status === 'done' ? 'text-base-content/50 line-through' : 'text-base-content'",
  '                    }}`',
  '                  >',
  '                    {card.item.title}',
  '                  </h3>',
  '',
  '                  <div',
  '                    className={`flex flex-col gap-3 sm:flex-row ${card.isEditing ? "" : "hidden"}`}',
  '                  >',
  '                    <input',
  '                      className="input input-bordered w-full"',
  '                      value={card.editingValue}',
  '                      onInput={(e: any) => {',
  '                        editingTitle.value = (e.target as HTMLInputElement).value;',
  '                      }}',
  '                      onKeydown={(e: KeyboardEvent) => {',
  "                        if (e.key === 'Enter') saveEditing(card.item.id);",
  "                        if (e.key === 'Escape') cancelEditing();",
  '                      }}',
  '                    />',
  '                    <div className="flex gap-2">',
  '                      <button className="btn btn-primary btn-sm" onClick={() => saveEditing(card.item.id)}>保存</button>',
  '                      <button className="btn btn-ghost btn-sm" onClick={cancelEditing}>取消</button>',
  '                    </div>',
  '                  </div>',
  '',
  '                  <div className="flex flex-wrap gap-2">',
  '                    {STATUS_OPTIONS.map(option => (',
  '                      <button',
  '                        key={option.key}',
  "                        className={`btn btn-xs ${card.item.status === option.key ? 'btn-neutral' : 'btn-ghost border border-base-300'}`}",
  '                        onClick={() => updateStatus(card.item.id, option.key)}',
  '                      >',
  '                        {option.actionLabel}',
  '                      </button>',
  '                    ))}',
  '                  </div>',
  '                </div>',
  '',
  '                <div className="flex flex-wrap gap-2 lg:justify-end">',
  '                  {!card.isEditing && <button className="btn btn-sm btn-outline" onClick={() => startEditing(card.item)}>重命名</button>}',
  "                  <button className=\"btn btn-sm btn-outline btn-secondary\" onClick={() => toggleArchived(card.item.id)}>{card.item.archived ? '恢复' : '归档'}</button>",
  '                  <button className="btn btn-sm btn-outline btn-error" onClick={() => removeTodo(card.item.id)}>删除</button>',
  '                </div>',
  '              </div>',
  '            </div>',
  '          </div>',
  '        ))}',
  '        {!visibleTodos.get().length && (',
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
  const persistedState = loadPersistedTodoState()
  const initialTodos = persistedState?.todos ?? INITIAL_TODOS
  const initialActiveFilter: TodoFilter = persistedState?.activeFilter ?? 'all'
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState(persistedState?.search ?? '')
  const activeFilter = ref<TodoFilter>(initialActiveFilter)
  const setActiveFilter = (nextFilter: TodoFilter) => {
    activeFilter.value = nextFilter
  }
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const nextId = ref(initialTodos.reduce((max, item) => Math.max(max, item.id), 0) + 1)
  const nextCreatedOrder = ref(
    initialTodos.reduce((max, item) => Math.max(max, item.createdOrder), 0) + 1,
  )

  watchEffect(() => {
    persistTodoState({
      todos,
      search,
      activeFilter: activeFilter.value,
    })
  })

  const counts = computed(() => ({
    total: todos.filter(item => !item.archived).length,
    todo: todos.filter(item => !item.archived && item.status === 'todo').length,
    doing: todos.filter(item => !item.archived && item.status === 'doing').length,
    done: todos.filter(item => !item.archived && item.status === 'done').length,
    archived: todos.filter(item => item.archived).length,
  }))

  const overviewCards = computed(() => {
    const snapshot = counts.get()
    const cards = [
      {
        key: 'todo' as const,
        label: '待开始',
        value: snapshot.todo,
        className: 'border-warning/30 bg-warning/10',
      },
      {
        key: 'doing' as const,
        label: '进行中',
        value: snapshot.doing,
        className: 'border-info/30 bg-info/10',
      },
      {
        key: 'done' as const,
        label: '已完成',
        value: snapshot.done,
        className: 'border-success/30 bg-success/10',
      },
    ]

    if (activeFilter.value === 'all') {
      return cards
    }

    if (activeFilter.value === 'archived') {
      return [
        {
          key: 'archived' as const,
          label: '已归档',
          value: snapshot.archived,
          className: 'border-secondary/30 bg-secondary/10',
        },
      ]
    }

    return cards.filter(card => card.key === activeFilter.value)
  })

  const visibleTodos = computed(() => {
    const keyword = `${search}`.trim().toLowerCase()

    return todos
      .filter(item => {
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
      .sort((left, right) => right.createdOrder - left.createdOrder)
  })

  const addTodo = () => {
    const title = draft.trim()
    if (!title) {
      return
    }

    const nextTodo: TodoItem = {
      id: nextId.value++,
      title,
      status: 'todo',
      archived: false,
      createdAt: new Date().toISOString(),
      createdOrder: nextCreatedOrder.value++,
    }

    setTodos(current => [nextTodo, ...current])
    setDraft('')
  }

  const removeTodo = (id: number) => {
    setTodos(current => current.filter(item => item.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setEditingTitle('')
    }
  }

  const updateStatus = (id: number, status: TodoStatus) => {
    setTodos(current =>
      current.map(item => (item.id === id ? { ...item, status, archived: false } : item)),
    )
  }

  const toggleArchived = (id: number) => {
    setTodos(current =>
      current.map(item => (item.id === id ? { ...item, archived: !item.archived } : item)),
    )
  }

  const startEditing = (item: TodoItem) => {
    setEditingId(item.id)
    setEditingTitle(item.title)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const saveEditing = (id: number, titleOverride?: string) => {
    const title = (titleOverride ?? editingTitle).trim()

    if (!title) {
      return
    }

    setTodos(current => current.map(item => (item.id === id ? { ...item, title } : item)))
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
                  value={draft}
                  placeholder="例如：实现 Todo 应用的归档功能"
                  onInput={(e: any) => {
                    setDraft((e.target as HTMLInputElement).value)
                  }}
                  onKeydown={(e: KeyboardEvent) => {
                    if (e.key === 'Enter' && !e.isComposing) {
                      e.preventDefault()
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
                value={search}
                placeholder="按标题筛选任务"
                onInput={(e: any) => {
                  setSearch((e.target as HTMLInputElement).value)
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
                  setActiveFilter(filter.key)
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`grid gap-4 ${overviewCards.get().length > 1 ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}
      >
        {overviewCards.get().map(card => (
          <div key={card.key} className={`rounded-2xl border p-5 ${card.className}`}>
            <p className="text-sm text-base-content/70">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        {visibleTodos.get().map(item => {
          const isEditing = editingId === item.id
          const editingValue = isEditing ? editingTitle : item.title
          const meta = STATUS_META[item.status]

          const commitEditing = (latestValue: string) => {
            setEditingTitle(latestValue)
            saveEditing(item.id, latestValue)
          }

          return (
            <div
              key={`${item.id}-${item.title}-${item.status}-${item.archived ? 'archived' : 'active'}-${isEditing ? 'editing' : 'view'}`}
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
                        创建于 {formatTodoCreatedAt(item.createdAt)}
                      </span>
                    </div>

                    <h3
                      className={`text-xl font-semibold ${
                        isEditing
                          ? 'hidden'
                          : item.status === 'done'
                            ? 'text-base-content/50 line-through'
                            : 'text-base-content'
                      }`}
                    >
                      {item.title}
                    </h3>

                    <div
                      data-todo-edit-row="true"
                      className={`flex flex-col gap-3 sm:flex-row ${isEditing ? '' : 'hidden'}`}
                    >
                      <input
                        className="input input-bordered w-full"
                        value={editingValue}
                        onInput={(e: any) => {
                          setEditingTitle((e.target as HTMLInputElement).value)
                        }}
                        onKeydown={(e: KeyboardEvent) => {
                          if (e.key === 'Enter') {
                            commitEditing((e.target as HTMLInputElement).value)
                          }
                          if (e.key === 'Escape') {
                            cancelEditing()
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => commitEditing(editingValue)}
                        >
                          保存
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={cancelEditing}>
                          取消
                        </button>
                      </div>
                    </div>

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
                          {option.actionLabel}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {!isEditing && (
                      <button className="btn btn-sm btn-outline" onClick={() => startEditing(item)}>
                        重命名
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
        })}
        {!visibleTodos.get().length && (
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
