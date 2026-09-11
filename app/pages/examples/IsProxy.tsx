import { signal, computed, type FC } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

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
    <SidebarPlayground>
      <h1 className="text-4xl font-semibold">无代理状态模型</h1>
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
      <Code lang="tsx" code={source} />
    </SidebarPlayground>
  )
}

export default IsProxy
