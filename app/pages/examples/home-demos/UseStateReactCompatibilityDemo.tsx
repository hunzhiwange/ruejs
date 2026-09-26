import { type FC, useState } from '@rue-js/rue'

type Item = { id: number; label: string }

const initialItems: Item[] = [{ id: 1, label: '第一项' }]

const UseStateReactCompatibilityDemo: FC = () => {
  const [items, setItems] = useState<Item[]>(initialItems)
  const localRows = items.map(item => <li key={item.id}>{item.label}</li>)
  const localCount = items.length
  const localAttributes = { title: `局部属性：${items.length} 项` }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-4">
        <h2 className="text-2xl font-semibold">React useState 兼容性验证</h2>
        <p>点击“添加一项”，观察直接 JSX 读取、局部派生变量和展开属性如何同步更新。</p>
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
              {items.map(item => <li key={item.id}>{item.label}</li>)}
            </ul>
          </section>
          <section className="rounded-lg border p-3">
            <h3 className="font-semibold">② 局部派生变量</h3>
            <p>数量：{localCount}</p>
            <ul className="list-disc pl-6">{localRows}</ul>
          </section>
          <section className="rounded-lg border p-3">
            <h3 className="font-semibold">③ 局部展开属性</h3>
            <p {...localAttributes}>{localAttributes.title}</p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default UseStateReactCompatibilityDemo
