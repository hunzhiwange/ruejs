import { type FC, useState } from '@rue-js/rue'

const JSXArrayChildrenDemo: FC = () => {
  const [state] = useState(() => ({
    count: 0,
    showDetails: true,
    items: [
      { id: 1, text: '第一项' },
      { id: 2, text: '第二项' },
    ],
  }))

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-4">
        <h2 className="text-2xl font-semibold">JSX 数组子节点</h2>
        <p>固定形状的数组和嵌套数组可以直接放在 JSX 子节点位置。</p>

        <div className="flex gap-2">
          <button
            className="btn btn-primary"
            onClick={() => {
              state.count += 1
            }}
          >
            计数 +1
          </button>
          <button
            className="btn"
            onClick={() => {
              state.showDetails = !state.showDetails
            }}
          >
            切换详情
          </button>
          <button
            className="btn"
            onClick={() => {
              state.items.push({ id: Date.now(), text: `新增第 ${state.items.length + 1} 项` })
            }}
          >
            添加列表项
          </button>
        </div>

        <div className="rounded-lg border p-3">
          {[
            <p key="count">当前计数：{state.count}</p>,
            [
              state.showDetails && <p key="detail">详情显示中</p>,
              state.showDetails ? <p key="branch">条件数组项</p> : null,
            ],
            0,
          ]}
        </div>

        <ul className="list-disc pl-6">
          {[
            state.items.map(item => <li key={item.id}>{item.text}</li>),
            <li key="footer">列表结尾</li>,
          ]}
        </ul>
      </div>
    </div>
  )
}

export default JSXArrayChildrenDemo
