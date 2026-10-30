import { signal, type FC } from '@rue-js/rue'

type DatabaseType = 'POSTGRESQL' | 'MYSQL'
type Datasource = { id: number; name: string; type: DatabaseType }
const initialRows = (): Datasource[] => [
  { id: 1, name: '订单数据库', type: 'MYSQL' },
  { id: 2, name: '分析数据库', type: 'POSTGRESQL' },
]

const InlineSelectListDemo: FC = () => {
  const rows = signal(initialRows())
  let nextId = 3
  const changeType = (id: number, event: Event) => {
    const type = (event.target as HTMLSelectElement).value as DatabaseType
    rows.set(rows.get().map(row => (row.id === id ? { ...row, type } : row)))
  }
  const add = (type: DatabaseType) => {
    const id = nextId++
    rows.set([...rows.get(), { id, name: `数据源 ${id}`, type }])
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-base-300 bg-base-100 p-5">
        <h2 className="text-xl font-semibold">数据源类型选择</h2>
        <p className="mt-2 text-sm text-base-content/70">
          每行的两个下拉框共享同一份状态：左侧绑定 select.value，右侧绑定 option.selected。
          修改任意一侧，另一侧和当前类型会一起更新。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-sm btn-primary" onClick={() => add('MYSQL')}>
            添加 MySQL
          </button>
          <button className="btn btn-sm" onClick={() => add('POSTGRESQL')}>
            添加 PostgreSQL
          </button>
          <button className="btn btn-sm" onClick={() => rows.set([...rows.get()].reverse())}>
            反转顺序
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              rows.set(initialRows())
              nextId = 3
            }}
          >
            重置
          </button>
        </div>
      </div>
      {rows.get().map(row => (
        <section
          key={row.id}
          className="rounded-xl border border-base-300 bg-base-100 p-5"
          data-datasource={row.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">{row.name}</h3>
            <span className="badge badge-outline">{row.type}</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              select.value
              <select
                className="select select-bordered w-full"
                value={row.type}
                onChange={(event: Event) => changeType(row.id, event)}
              >
                <option value="POSTGRESQL">PostgreSQL</option>
                <option value="MYSQL">MySQL</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              option.selected
              <select
                className="select select-bordered w-full"
                onChange={(event: Event) => changeType(row.id, event)}
              >
                <option value="POSTGRESQL" selected={row.type === 'POSTGRESQL'}>
                  PostgreSQL
                </option>
                <option value="MYSQL" selected={row.type === 'MYSQL'}>
                  MySQL
                </option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-base-content/70">
              当前类型：{row.type === 'MYSQL' ? 'MySQL' : 'PostgreSQL'}
            </p>
            <button
              className="btn btn-sm btn-ghost text-error"
              onClick={() => rows.set(rows.get().filter(item => item.id !== row.id))}
            >
              删除
            </button>
          </div>
        </section>
      ))}
      {rows.get().length === 0 ? (
        <p className="rounded-xl border border-dashed border-base-300 p-6 text-center text-base-content/60">
          暂无数据源，点击上方按钮添加。
        </p>
      ) : null}
    </div>
  )
}

export default InlineSelectListDemo
