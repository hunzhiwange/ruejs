/**
 * onActivated 示例页。
 *
 * 展示 KeepAlive 缓存组件重新进入活动 DOM 区间时的 activated 生命周期。
 */
import { Component, KeepAlive, onActivated, onDeactivated, ref, type FC } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

type ViewKey = 'profile' | 'settings'

const panelMeta: Record<ViewKey, { title: string; tone: string; description: string }> = {
  profile: {
    title: '资料面板',
    tone: 'primary',
    description: '切走后输入框和本地计数会被 KeepAlive 保留。',
  },
  settings: {
    title: '设置面板',
    tone: 'secondary',
    description: '再次切回来时会触发 onActivated，而不是重新创建组件。',
  },
}

/** KeepAlive 缓存面板，切换回来时记录 activated/deactivated 事件。 */
const LifecyclePanel: FC<{
  name: ViewKey
  onEvent: (message: string) => void
}> = props => {
  const clicks = ref(0)
  const meta = panelMeta[props.name]

  onActivated(() => {
    props.onEvent(`${meta.title} onActivated`)
  })

  onDeactivated(() => {
    props.onEvent(`${meta.title} onDeactivated`)
  })

  return (
    <section className="card bg-base-100 shadow">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="card-title">{meta.title}</h2>
            <p className="text-sm opacity-70">{meta.description}</p>
          </div>
          <span className={`badge badge-${meta.tone}`}>cached</span>
        </div>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">本地输入状态</span>
          </div>
          <input className="input input-bordered" placeholder={`写点 ${meta.title} 的内容`} />
        </label>

        <div className="flex items-center gap-3">
          <button
            className={`btn btn-${meta.tone}`}
            onClick={() => {
              clicks.value += 1
            }}
          >
            本地计数 +1
          </button>
          <span className="stat-value text-2xl">{clicks.value}</span>
        </div>
      </div>
    </section>
  )
}

const views: Record<ViewKey, FC<{ onEvent: (message: string) => void }>> = {
  profile: props => <LifecyclePanel name="profile" onEvent={props.onEvent} />,
  settings: props => <LifecyclePanel name="settings" onEvent={props.onEvent} />,
}

const demoCode = `import { Component, KeepAlive, onActivated, onDeactivated, ref, type FC } from '@rue-js/rue'

const Profile: FC = () => {
  onActivated(() => console.log('profile activated'))
  onDeactivated(() => console.log('profile deactivated'))
  return <section>Profile</section>
}

const Settings: FC = () => <section>Settings</section>

const App: FC = () => {
  const active = ref<'profile' | 'settings'>('profile')
  return (
    <KeepAlive>
      <Component
        is={active.value}
        registry={{ profile: Profile, settings: Settings }}
        key={active.value}
      />
    </KeepAlive>
  )
}
`

const KeepAliveViewport: FC<{
  activeView: { value: ViewKey }
  onEvent: (message: string) => void
}> = props => {
  return (
    <KeepAlive>
      <Component
        is={views[props.activeView.value]}
        key={props.activeView.value}
        onEvent={props.onEvent}
      />
    </KeepAlive>
  )
}

/** onActivated / onDeactivated KeepAlive 示例入口。 */
const OnActivatedDemo: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')
  const activeView = ref<ViewKey>('profile')
  const events = ref<string[]>([])

  const pushEvent = (message: string) => {
    const time = new Date().toLocaleTimeString()
    events.value = [`${time} · ${message}`, ...events.value].slice(0, 8)
  }

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">onActivated 缓存生命周期</h1>
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
              <Code className="h-full" lang="tsx" code={demoCode} />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-start">
            <div className="space-y-4">
              <div className="join">
                {(['profile', 'settings'] as ViewKey[]).map(view => (
                  <button
                    className={`btn join-item ${
                      activeView.value === view ? `btn-${panelMeta[view].tone}` : 'btn-outline'
                    }`}
                    onClick={() => {
                      activeView.value = view
                    }}
                  >
                    {panelMeta[view].title}
                  </button>
                ))}
              </div>

              <KeepAliveViewport activeView={activeView} onEvent={pushEvent} />
            </div>

            <aside className="card bg-base-100 shadow">
              <div className="card-body">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="card-title">生命周期日志</h2>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      events.value = []
                    }}
                  >
                    清空
                  </button>
                </div>
                <ul className="timeline timeline-vertical">
                  {events.value.length === 0 && <li className="text-sm opacity-60">暂无事件</li>}
                  {events.value.map((event, index) => (
                    <li>
                      {index > 0 && <hr />}
                      <div className="timeline-start text-xs opacity-60">
                        #{events.value.length - index}
                      </div>
                      <div className="timeline-middle">
                        <div className="badge badge-outline badge-sm" />
                      </div>
                      <div className="timeline-end text-sm">{event}</div>
                      {index < events.value.length - 1 && <hr />}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default OnActivatedDemo
