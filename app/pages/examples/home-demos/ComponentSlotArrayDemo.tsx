import { type FC, useState } from '@rue-js/rue'

const SlotBox: FC<{ title: string }> = props => (
  <section className="rounded-lg border p-4">
    <h3 className="mb-2 font-semibold">{props.title}</h3>
    <div className="flex gap-3">{props.children}</div>
  </section>
)

const ComponentSlotArrayDemo: FC = () => {
  const [state] = useState(() => ({ count: 0 }))

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-4">
        <h2 className="text-2xl font-semibold">组件插槽中的 JSX 数组</h2>
        <p>数组作为 SlotBox 的 children 传入。两个节点都应显示，点击按钮后数字也应更新。</p>
        <button
          className="btn btn-primary self-start"
          onClick={() => {
            state.count += 1
          }}
        >
          计数 +1
        </button>
        <SlotBox title="数组传入组件 children">
          {[
            <span key="current">当前：{state.count}</span>,
            <strong key="next">下一个：{state.count + 1}</strong>,
          ]}
        </SlotBox>
      </div>
    </div>
  )
}

export default ComponentSlotArrayDemo
