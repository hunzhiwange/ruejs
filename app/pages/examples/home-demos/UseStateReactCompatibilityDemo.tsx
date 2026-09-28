import { computed, type FC, useState } from '@rue-js/rue'

type Item = { id: number; label: string }

const initialItems: Item[] = [{ id: 1, label: '第一项' }]

const UseStateReactCompatibilityDemo: FC = () => {
  const [items, setItems] = useState<Item[]>(initialItems)
  const localRows = items.map(item => <li key={item.id}>{item.label}</li>)
  const localCount = items.length
  const localAttributes = { title: `局部属性：${items.length} 项` }
  const computedRows = computed(() => items.map(item => <li key={item.id}>{item.label}</li>))
  const computedCount = computed(() => items.length)
  const computedAttributes = computed(() => ({ title: `计算属性：${items.length} 项` }))

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-4">
        <h2 className="text-2xl font-semibold">useState 与局部快照</h2>
        <p>点击“添加一项”：普通局部变量保留首次计算的值；computed 派生值随状态更新。</p>
        <button
          className="btn btn-primary self-start"
          onClick={() =>
            setItems(previous => [
              ...previous,
              { id: previous.length + 1, label: `第 ${previous.length + 1} 项` },
            ])
          }
        >
          添加一项
        </button>

        <div className="grid gap-3 md:grid-cols-3">
          <section className="rounded-lg border p-3">
            <h3 className="font-semibold">① 直接 JSX 读取</h3>
            <p>数量：{items.length}</p>
            <ul className="list-disc pl-6">
              {items.map(item => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border p-3">
            <h3 className="font-semibold">② 局部变量（首次计算的快照）</h3>
            <p>数量：{localCount}</p>
            <ul className="list-disc pl-6">{localRows}</ul>
          </section>
          <section className="rounded-lg border p-3">
            <h3 className="font-semibold">③ 展开属性（首次计算的快照）</h3>
            <p {...localAttributes}>{localAttributes.title}</p>
          </section>
          <section className="rounded-lg border p-3">
            <h3 className="font-semibold">④ computed 列表</h3>
            <p>数量：{computedCount.value}</p>
            <ul className="list-disc pl-6">{computedRows.value}</ul>
          </section>
          <section className="rounded-lg border p-3">
            <h3 className="font-semibold">⑤ computed 展开属性</h3>
            <p {...computedAttributes.value}>{computedAttributes.value.title}</p>
          </section>
        </div>
        <p className="text-sm opacity-70">
          Rue 不会在 setter 更新后重新执行组件函数；需要持续更新的局部派生值可以用 computed。
        </p>
      </div>
    </div>
  )
}

export default UseStateReactCompatibilityDemo
