import { Component, type FC, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

type SurfaceTone = 'primary' | 'accent'
type RenderTarget = 'native' | 'card' | 'notice'
type RegistryTarget = 'metric' | 'notice'

const cardToneClassNames: Record<SurfaceTone, string> = {
  primary: 'border-primary/25 bg-primary/10',
  accent: 'border-accent/25 bg-accent/10',
}

const SalesCard: FC<{
  title: string
  value: string
  detail: string
  tone?: SurfaceTone
}> = props => (
  <article
    className={`rounded-box border p-4 shadow-sm ${cardToneClassNames[props.tone ?? 'primary']}`}
  >
    <div className="text-xs uppercase tracking-[0.22em] opacity-60">{props.title}</div>
    <div className="mt-2 text-3xl font-semibold">{props.value}</div>
    <div className="mt-1 text-sm opacity-75">{props.detail}</div>
    <div className="mt-4">{props.children}</div>
  </article>
)

const StatusStrip: FC<{ title: string; detail: string }> = props => (
  <section className="rounded-box border border-info/25 bg-info/10 p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="font-semibold">{props.title}</div>
        <div className="text-sm opacity-75">{props.detail}</div>
      </div>
      <span className="status status-info status-lg"></span>
    </div>
    <div className="mt-4">{props.children}</div>
  </section>
)

const RegisteredMetric: FC<{ title: string; value?: string; detail: string }> = props => (
  <article className="rounded-box border border-secondary/25 bg-secondary/10 p-4 shadow-sm">
    <div className="text-xs uppercase tracking-[0.22em] opacity-60">{props.title}</div>
    <div className="mt-2 text-2xl font-semibold">{props.value ?? 'Registered'}</div>
    <div className="mt-1 text-sm opacity-75">{props.detail}</div>
    <div className="mt-4">{props.children}</div>
  </article>
)

const RegisteredNotice: FC<{ title: string; detail: string }> = props => (
  <section className="rounded-box border border-warning/35 bg-warning/15 p-4 shadow-sm">
    <div className="font-semibold">{props.title}</div>
    <div className="mt-1 text-sm opacity-75">{props.detail}</div>
    <div className="mt-4">{props.children}</div>
  </section>
)

const NativeArticle: FC<{ className?: string }> = props => (
  <article className={props.className}>{props.children}</article>
)

const demoCode = `import {
  Component,
  type FC,
  ref,
} from '@rue-js/rue';

const SalesCard: FC<{ title: string; value: string; detail: string }> = (props) => (
  <article className="rounded-box border border-primary/25 bg-primary/10 p-4">
    <div className="text-xs uppercase tracking-[0.22em] opacity-60">{props.title}</div>
    <div className="mt-2 text-3xl font-semibold">{props.value}</div>
    <div className="mt-1 text-sm opacity-75">{props.detail}</div>
    <div className="mt-4">{props.children}</div>
  </article>
);

const StatusStrip: FC<{ title: string; detail: string }> = (props) => (
  <section className="rounded-box border border-info/25 bg-info/10 p-4">
    <div className="font-semibold">{props.title}</div>
    <div className="text-sm opacity-75">{props.detail}</div>
    <div className="mt-4">{props.children}</div>
  </section>
);

const RegisteredMetric: FC<{ title: string; value?: string; detail: string }> = (props) => (
  <article className="rounded-box border border-secondary/25 bg-secondary/10 p-4">
    <div className="text-xs uppercase tracking-[0.22em] opacity-60">{props.title}</div>
    <div className="mt-2 text-2xl font-semibold">{props.value ?? 'Registered'}</div>
    <div className="mt-1 text-sm opacity-75">{props.detail}</div>
    <div className="mt-4">{props.children}</div>
  </article>
);

const RegisteredNotice: FC<{ title: string; detail: string }> = (props) => (
  <section className="rounded-box border border-warning/35 bg-warning/15 p-4">
    <div className="font-semibold">{props.title}</div>
    <div className="mt-1 text-sm opacity-75">{props.detail}</div>
    <div className="mt-4">{props.children}</div>
  </section>
);

const Demo: FC = () => {
  const shell = ref<'native' | 'card' | 'notice'>('native');
  const registryMode = ref<'metric' | 'notice'>('metric');

  const resolveProps = () =>
    shell.value === 'native'
      ? {
          className: 'rounded-box border border-base-300 bg-base-100 p-4 shadow-sm',
        }
      : shell.value === 'card'
        ? {
            title: '今日成交额',
            value: '¥ 128,400',
            detail: '比昨日 +8.2%',
          }
        : {
            title: '状态切换',
            detail: '当前目标由 is 决定',
          };

  return (
    <div className="grid gap-6">
      <Component
        is={shell.value}
        registry={{ native: NativeArticle, card: SalesCard, notice: StatusStrip }}
        {...resolveProps()}
      >
        <span className="badge badge-outline badge-sm">children 已透传</span>
      </Component>

      <Component
        is={registryMode.value}
        registry={{ metric: RegisteredMetric, notice: RegisteredNotice }}
        title="运行时注册"
        value="CardView"
        detail="通过字符串名解析到已注册组件"
      >
        <span className="badge badge-outline badge-sm">children 一样会透传</span>
      </Component>
    </div>
  );
};

export default Demo;`

const DynamicComponent: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')
  const renderTarget = ref<RenderTarget>('native')
  const tone = ref<SurfaceTone>('primary')
  const registryTarget = ref<RegistryTarget>('metric')

  const resolveDynamicProps = () => {
    if (renderTarget.value === 'native') {
      return {
        className: 'rounded-box border border-base-300 bg-base-100 p-4 shadow-sm',
      }
    }

    if (renderTarget.value === 'card') {
      return {
        title: '今日成交额',
        value: '¥ 128,400',
        detail: '比昨日 +8.2%，这里直接把函数组件塞进 is',
        tone: tone.value,
      }
    }

    return {
      title: '状态切换',
      detail: '这里的 is 已从原生标签切到另一个组件定义',
    }
  }
  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">动态组件（Component）</h1>

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

      <div
        className={`mt-4 grid md:grid-cols-1 gap-6 items-start ${activeTab.value === 'preview' ? '' : 'hidden'}`}
      >
        <div className="card bg-base-100 shadow">
          <div className="card-body gap-6">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">1. 直接切换原生标签和组件定义</h2>
                  <p className="text-sm opacity-75">
                    这里显式导入并使用 {'<Component>'}，is
                    可以在字符串标签名和函数组件之间来回切换。
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="join">
                    <button
                      className={`btn btn-sm join-item ${renderTarget.value === 'native' ? 'btn-primary' : ''}`}
                      onClick={() => {
                        renderTarget.value = 'native'
                      }}
                    >
                      原生 article
                    </button>
                    <button
                      className={`btn btn-sm join-item ${renderTarget.value === 'card' ? 'btn-primary' : ''}`}
                      onClick={() => {
                        renderTarget.value = 'card'
                      }}
                    >
                      SalesCard
                    </button>
                    <button
                      className={`btn btn-sm join-item ${renderTarget.value === 'notice' ? 'btn-primary' : ''}`}
                      onClick={() => {
                        renderTarget.value = 'notice'
                      }}
                    >
                      StatusStrip
                    </button>
                  </div>

                  <div className="join">
                    <button
                      className={`btn btn-sm join-item ${tone.value === 'primary' ? 'btn-secondary' : ''}`}
                      onClick={() => {
                        tone.value = 'primary'
                      }}
                    >
                      primary
                    </button>
                    <button
                      className={`btn btn-sm join-item ${tone.value === 'accent' ? 'btn-secondary' : ''}`}
                      onClick={() => {
                        tone.value = 'accent'
                      }}
                    >
                      accent
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="rounded-box border border-dashed border-base-300 p-4 min-h-44">
                  <Component
                    is={renderTarget.value}
                    registry={{
                      native: NativeArticle,
                      card: SalesCard,
                      notice: StatusStrip,
                    }}
                    {...resolveDynamicProps()}
                  >
                    <span className="badge badge-outline badge-sm">children 已透传</span>
                  </Component>
                </div>

                <div className="rounded-box border border-base-300 bg-base-200 p-4 text-sm space-y-2">
                  <div>
                    <strong>当前 is</strong>：
                    {renderTarget.value === 'native'
                      ? 'article'
                      : renderTarget.value === 'card'
                        ? 'SalesCard'
                        : 'StatusStrip'}
                  </div>
                  <div>
                    <strong>验证点</strong>：native element、直接组件定义、children 透传。
                  </div>
                  <div>
                    <strong>说明</strong>：切到 SalesCard 时，tone 也会跟着透传给目标组件。
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">2. 编译期有限组件注册表</h2>
                  <p className="text-sm opacity-75">
                    下面这个小区域为 {'<Component>'} 显式提供有限 registry，编译器可以提前确定所有
                    可能的组件工厂。
                  </p>
                </div>

                <div className="join">
                  <button
                    className={`btn btn-sm join-item ${registryTarget.value === 'metric' ? 'btn-primary' : ''}`}
                    onClick={() => {
                      registryTarget.value = 'metric'
                    }}
                  >
                    RegisteredMetric
                  </button>
                  <button
                    className={`btn btn-sm join-item ${registryTarget.value === 'notice' ? 'btn-primary' : ''}`}
                    onClick={() => {
                      registryTarget.value = 'notice'
                    }}
                  >
                    RegisteredNotice
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="rounded-box border border-dashed border-base-300 p-4 min-h-40">
                  <Component
                    is={registryTarget.value}
                    registry={{ metric: RegisteredMetric, notice: RegisteredNotice }}
                    title="运行时注册"
                    value="CardView"
                    detail={
                      registryTarget.value === 'metric'
                        ? 'metric 键在有限 registry 中解析到 RegisteredMetric'
                        : 'notice 键在同一个有限 registry 中解析到 RegisteredNotice'
                    }
                  >
                    <span className="badge badge-outline badge-sm">children 一样会透传</span>
                  </Component>
                </div>

                <div className="rounded-box border border-base-300 bg-base-200 p-4 text-sm space-y-2">
                  <div>
                    registry 直接写在 {'<Component>'} 上，不依赖全局字符串注册或运行时工厂查找。
                  </div>
                  <div>编译器会把 registry 降为有限分支，再决定最终渲染哪个组件。</div>
                  <div>这也顺带验证了字符串名路径下的 children 透传。</div>
                </div>
              </div>
            </section>

            <div role="alert" className="alert alert-warning alert-soft">
              <span>
                注意：如果 is 最终解析成原生 input、select、textarea 之类的节点，写在{' '}
                {'<Component>'} 上的 v-model / r-model
                不能像静态原生标签那样在编译期展开，应该在最终原生节点处处理。
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`mt-4 grid md:grid-cols-1 gap-6 items-start ${activeTab.value === 'code' ? '' : 'hidden'}`}
      >
        <div className="card bg-base-100 shadow overflow-auto">
          <div className="card-body p-0">
            <Code className="h-full" lang="tsx" code={demoCode} />
          </div>
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default DynamicComponent
