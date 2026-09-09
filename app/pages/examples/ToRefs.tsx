import { signal, computed, type FC } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

const source = `import { signal, computed } from '@rue-js/rue'

export default function Demo() {
  const count = signal(1)
  const label = signal('Rue')
  const doubled = computed(() => count.get() * 2)
  return <div>
      <h2>{label.get()}: {count.get()}</h2>
      <p>两倍：{doubled.get()}</p>
      <button className="btn" onClick={() => count.update(n => n + 1)}>count + 1</button>
      <button className="btn" onClick={() => label.update(v => v === 'Rue' ? 'Signal' : 'Rue')}>切换 label</button>
  </div>
}`

const ToRefs: FC = () => {
  const count = signal(1)
  const label = signal('Rue')
  const doubled = computed(() => count.get() * 2)
  return (
    <SidebarPlayground>
      <h1 className="text-4xl font-semibold">独立 Signal 与派生值</h1>
      <p className="my-4">
        返回包含 Signal 句柄的普通对象，可以安全解构句柄；解构 get() 的结果只得到当前值。
      </p>
      <div className="card bg-base-100 p-6 space-y-4">
        <h2>
          {label.get()}: {count.get()}
        </h2>
        <p>两倍：{doubled.get()}</p>
        <button className="btn" onClick={() => count.update(n => n + 1)}>
          count + 1
        </button>
        <button className="btn" onClick={() => label.update(v => (v === 'Rue' ? 'Signal' : 'Rue'))}>
          切换 label
        </button>
      </div>
      <Code lang="tsx" code={source} />
    </SidebarPlayground>
  )
}

export default ToRefs
