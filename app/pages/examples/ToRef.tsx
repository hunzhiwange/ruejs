import { signal, computed, type FC } from '@rue-js/rue'
import ExamplePlayground from './ExamplePlayground'

const source = `import { signal, computed } from '@rue-js/rue'

export default function Demo() {
  const profile = signal({ name: 'Rue', visits: 1 })
  const doubled = computed(() => profile.get().visits * 2)
  return <div>
      <p>姓名：{profile.get().name}</p>
      <p>访问次数：{profile.get().visits}，两倍：{doubled.get()}</p>
      <button className="btn" onClick={() => profile.update(value => ({ ...value, visits: value.visits + 1 }))}>访问 + 1</button>
      <button className="btn" onClick={() => profile.update(value => ({ ...value, name: 'Signal' }))}>更新姓名</button>
  </div>
}`

const ToRef: FC = () => {
  const profile = signal({ name: 'Rue', visits: 1 })
  const doubled = computed(() => profile.get().visits * 2)
  return (
    <ExamplePlayground title="Signal 路径读写" source={source}>
      <p className="my-4">
        使用 get 读取根值，并通过 update 不可变地替换对象。普通对象成员赋值不会自动触发更新。
      </p>
      <div className="card bg-base-100 p-6 space-y-4">
        <p>姓名：{profile.get().name}</p>
        <p>
          访问次数：{profile.get().visits}，两倍：{doubled.get()}
        </p>
        <button
          className="btn"
          onClick={() => profile.update(value => ({ ...value, visits: value.visits + 1 }))}
        >
          访问 + 1
        </button>
        <button
          className="btn"
          onClick={() => profile.update(value => ({ ...value, name: 'Signal' }))}
        >
          更新姓名
        </button>
      </div>
    </ExamplePlayground>
  )
}

export default ToRef
