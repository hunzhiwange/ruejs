import { signal, computed, type FC } from '@rue-js/rue'
import ExamplePlayground from './ExamplePlayground'

const source = `import { signal, computed } from '@rue-js/rue'

export default function Demo() {
  const count = signal(1)
  const doubled = computed(() => count.get() * 2)
  return <div>
      <p>源值：{count.get()}，只读派生值：{doubled.get()}</p>
      <button className="btn" onClick={() => count.update(n => n + 1)}>源值 + 1</button>
  </div>
}`

const IsReadonly: FC = () => {
  const count = signal(1)
  const doubled = computed(() => count.get() * 2)
  return (
    <ExamplePlayground title="只读派生值" source={source}>
      <p className="my-4">
        不带 setter 的 computed 只提供派生读取。对象的 TypeScript Readonly
        类型只约束类型检查，不会创建运行时只读代理。
      </p>
      <div className="card bg-base-100 p-6 space-y-4">
        <p>
          源值：{count.get()}，只读派生值：{doubled.get()}
        </p>
        <button className="btn" onClick={() => count.update(n => n + 1)}>
          源值 + 1
        </button>
      </div>
    </ExamplePlayground>
  )
}

export default IsReadonly
