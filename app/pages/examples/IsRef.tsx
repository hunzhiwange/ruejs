/**
 * isRef 示例页。
 *
 * 对比 ref、shallowRef、computed、Signal 路径派生值 与普通对象的 ref 判定结果。
 */
import { computed, isRef, signal, ref, shallowRef, type FC } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

const demoSource = `import {
  computed,
  isRef,
  signal,
  ref,
  shallowRef,
  type FC,
} from '@rue-js/rue'

const IsRefDemo: FC = () => {
  const count = ref(1)
  const shallow = shallowRef({ label: 'shallow' })
  const state = signal({ name: 'Rue' })
  const nameRef = computed(() => state.get().name)
  const doubled = computed(() => count.value * 2)
  const plain = { value: 'looks like a ref' }

  return (
    <div>
      <button onClick={() => count.value++}>count + 1</button>
      <button onClick={() => state.update(value => ({ ...value, name: value.name === 'Rue' ? 'Signal' : 'Rue' }))}>
        toggle name
      </button>

      <ul>
        <li>ref: {String(isRef(count))}, count = {count.value}</li>
        <li>shallowRef: {String(isRef(shallow))}, label = {shallow.value.label}</li>
        <li>computed: {String(isRef(doubled))}, doubled = {doubled.get()}</li>
        <li>路径 computed: {String(isRef(nameRef))}, name = {nameRef.get()}</li>
        <li>plain object: {String(isRef(plain))}</li>
      </ul>
    </div>
  )
}

export default IsRefDemo`

/** isRef 交互示例入口。 */
const IsRef: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')
  const count = ref(1)
  const shallow = shallowRef({ label: 'shallow' })
  const state = signal({ name: 'Rue' })
  const nameRef = computed(() => state.get().name)
  const doubled = computed(() => count.value * 2)
  const plain = { value: 'looks like a ref' }
  const rows = computed(() => [
    {
      name: 'ref(count)',
      kind: '可写 ref',
      result: isRef(count),
      value: count.value,
    },
    {
      name: 'shallowRef({ label })',
      kind: '浅层 ref',
      result: isRef(shallow),
      value: shallow.value.label,
    },
    {
      name: 'computed(() => count * 2)',
      kind: '计算 ref',
      result: isRef(doubled),
      value: doubled.get(),
    },
    {
      name: "computed(() => state.getPath('name'))",
      kind: '路径派生值',
      result: isRef(nameRef),
      value: nameRef.get(),
    },
    {
      name: '{ value: ... }',
      kind: '普通对象',
      result: isRef(plain),
      value: plain.value,
    },
    {
      name: 'signal({ name })',
      kind: 'Signal 句柄',
      result: isRef(state),
      value: state.get().name,
    },
  ])

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">isRef 判定示例</h1>
      <div role="tablist" className="tabs tabs-box">
        <button
          role="tab"
          className={`tab ${activeTab.value === 'preview' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'preview'
          }}
        >
          效果
        </button>
        <button
          role="tab"
          className={`tab ${activeTab.value === 'code' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'code'
          }}
        >
          代码
        </button>
      </div>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'code' && (
          <div className="card bg-base-100 shadow overflow-auto">
            <div className="card-body p-0">
              <Code className="h-full" lang="tsx" code={demoSource} />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body gap-5">
              <div className="flex flex-wrap gap-3">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    count.value += 1
                  }}
                >
                  count + 1
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    state.update(value => ({
                      ...value,
                      name: value.name === 'Rue' ? 'Signal' : 'Rue',
                    }))
                  }}
                >
                  切换 name
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    shallow.value = {
                      label: shallow.value.label === 'shallow' ? 'changed' : 'shallow',
                    }
                  }}
                >
                  替换 shallowRef.value
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>表达式</th>
                      <th>类型</th>
                      <th>isRef</th>
                      <th>当前值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.get().map(row => (
                      <tr>
                        <td>
                          <code>{row.name}</code>
                        </td>
                        <td>{row.kind}</td>
                        <td>
                          <span className={`badge ${row.result ? 'badge-success' : 'badge-ghost'}`}>
                            {String(row.result)}
                          </span>
                        </td>
                        <td>{String(row.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default IsRef
