import { signal, computed, type FC } from '@rue-js/rue'
import ExamplePlayground from './ExamplePlayground'

const source = `import { signal, computed } from '@rue-js/rue'

export default function Demo() {
  const state = signal({ count: 1 })
  const doubled = computed(() => state.get().count * 2)
  return <div>
      <p>根值：{state.get().count}，两倍：{doubled.get()}</p>
      <button className="btn" onClick={() => state.update(value => ({ ...value, count: value.count + 1 }))}>计数 + 1</button>
  </div>
}`

const IsProxy: FC = () => {
  const state = signal({ count: 1 })
  const doubled = computed(() => state.get().count * 2)
  return (
    <ExamplePlayground title="无代理状态模型" source={source}>
      <p className="my-4">
        状态容器维护路径依赖图，不创建响应式对象代理。需要给外部函数传数据时显式创建快照，并将结果写回
        Signal。
      </p>
      <div className="card bg-base-100 p-6 space-y-4">
        <p>
          根值：{state.get().count}，两倍：{doubled.get()}
        </p>
        <button
          className="btn"
          onClick={() => state.update(value => ({ ...value, count: value.count + 1 }))}
        >
          计数 + 1
        </button>
      </div>
    </ExamplePlayground>
  )
}

export default IsProxy
