import { type FC, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

const VPreAndRPre: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')
  const phase = ref<'draft' | 'published'>('draft')
  const plan = ref<'pro' | 'basic'>('pro')

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">v-pre / r-pre</h1>

      <p className="mb-4 opacity-70">
        pre 区域原样显示 JSX 表达式，切换状态不会求值或更新；下方对照区域正常更新。
      </p>

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
              <Code
                className="h-full"
                lang="tsx"
                code={`import { type FC, ref } from '@rue-js/rue';

const VPreAndRPre: FC = () => {
  const phase = ref<'draft' | 'published'>('draft');
  const plan = ref<'pro' | 'basic'>('pro');

  return (
    <div className="grid gap-4">
      <div className="join">
        <button className="btn btn-sm join-item" onClick={() => { phase.value = 'draft'; }}>
          草稿
        </button>
        <button className="btn btn-sm join-item" onClick={() => { phase.value = 'published'; }}>
          发布
        </button>
        <button className="btn btn-sm join-item" onClick={() => { plan.value = 'pro'; }}>
          Pro
        </button>
        <button className="btn btn-sm join-item" onClick={() => { plan.value = 'basic'; }}>
          Basic
        </button>
      </div>

      <div v-pre className="rounded-box border border-dashed border-base-300 p-4">
        <span v-if={phase.value === 'draft'}>{phase.value}</span>
      </div>

      <div r-pre className="rounded-box border border-dashed border-base-300 p-4">
        <span r-if={plan.value === 'pro'}>{plan.value}</span>
      </div>

      <div className="rounded-box border border-base-300 p-4">
        <span v-if={phase.value === 'draft'}>当前阶段：{phase.value}</span>
        <span v-else>当前阶段：{phase.value}</span>
      </div>
    </div>
  );
};

export default VPreAndRPre;`}
              />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-6">
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">v-pre / r-pre</h2>
                  <div className="join">
                    <button
                      className="btn btn-sm join-item"
                      onClick={() => {
                        phase.value = 'draft'
                      }}
                    >
                      草稿
                    </button>
                    <button
                      className="btn btn-sm join-item"
                      onClick={() => {
                        phase.value = 'published'
                      }}
                    >
                      发布
                    </button>
                    <button
                      className="btn btn-sm join-item"
                      onClick={() => {
                        plan.value = 'pro'
                      }}
                    >
                      Pro
                    </button>
                    <button
                      className="btn btn-sm join-item"
                      onClick={() => {
                        plan.value = 'basic'
                      }}
                    >
                      Basic
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-sm opacity-70">当前阶段：{phase.value}</div>
                    <div v-pre className="rounded-box border border-dashed border-base-300 p-4">
                      <span v-if={phase.value === 'draft'}>{phase.value}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm opacity-70">当前套餐：{plan.value}</div>
                    <div r-pre className="rounded-box border border-dashed border-base-300 p-4">
                      <span r-if={plan.value === 'pro'}>{plan.value}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">对照渲染</h2>
                <div className="rounded-box border border-base-300 p-4">
                  <span v-if={phase.value === 'draft'}>当前阶段：{phase.value}</span>
                  <span v-else>当前阶段：{phase.value}</span>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default VPreAndRPre
