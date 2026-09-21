/**
 * onErrorCaptured 示例页。
 *
 * 展示父组件捕获子组件 render 错误并通过返回 false 阻止继续冒泡。
 */
import { type FC, onErrorCaptured, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

/** 可控抛错的子组件，用于演示 onErrorCaptured 捕获链。 */
const BrokenPanel: FC<{ crash: boolean }> = props => {
  if (props.crash) {
    throw new Error('BrokenPanel 在渲染时故意抛出的错误')
  }

  return (
    <div className="rounded-lg border border-success/30 bg-success/10 p-4 min-h-28">
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge badge-success badge-outline">子组件</span>
        <span className="font-mono text-sm">BrokenPanel</span>
      </div>
      <h2 className="mt-3 text-lg font-semibold text-success">当前正常渲染</h2>
      <p className="mt-2 text-sm opacity-80">
        当父组件传入 <span className="font-mono">crash=true</span> 时，这里会故意 throw。
      </p>
    </div>
  )
}

type CaptureLog = {
  id: number
  message: string
  result: string
  source: string
}

const captureFlow = [
  {
    title: '1. 触发',
    body: '按钮只做一件事：把 shouldCrash 设为 true。',
  },
  {
    title: '2. 抛错',
    body: 'BrokenPanel 看到 crash=true 后主动 throw。',
  },
  {
    title: '3. 捕获',
    body: '父组件 onErrorCaptured 先关闭 crash，再记录错误。',
  },
]

/** onErrorCaptured 交互示例入口。 */
const OnErrorCaptured: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')
  const shouldCrash = ref(false)
  const isTriggering = ref(false)
  const errorMessage = ref('')
  const capturedCount = ref(0)
  const statusText = ref('等待触发：BrokenPanel 现在正常渲染。')
  const latestCapture = ref<CaptureLog | null>(null)

  const triggerChildError = () => {
    if (isTriggering.value) {
      return
    }

    isTriggering.value = true
    errorMessage.value = ''
    statusText.value = '准备触发：下一次渲染会让 BrokenPanel 抛错。'
    shouldCrash.value = true
  }

  const resetDemo = () => {
    shouldCrash.value = false
    isTriggering.value = false
    errorMessage.value = ''
    capturedCount.value = 0
    statusText.value = '等待触发：BrokenPanel 现在正常渲染。'
    latestCapture.value = null
  }

  onErrorCaptured(error => {
    const message = error instanceof Error ? error.message : String(error)
    const nextCount = capturedCount.value + 1

    // 等当前渲染 effect 完成后再恢复状态，避免渲染期间重新挂载同一错误分支。
    queueMicrotask(() => {
      shouldCrash.value = false
      isTriggering.value = false
      errorMessage.value = message
      capturedCount.value = nextCount
      statusText.value = '已捕获：父组件返回 false，错误不会继续向上冒泡。'
      latestCapture.value = {
        id: nextCount,
        message,
        source: 'BrokenPanel',
        result: 'return false，停止冒泡',
      }
    })
    return false
  })

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">onErrorCaptured 错误捕获</h1>
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
                code={`import { type FC, onErrorCaptured, ref } from '@rue-js/rue';

const BrokenPanel: FC<{ crash: boolean }> = props => {
  if (props.crash) {
    throw new Error('BrokenPanel 在渲染时故意抛出的错误');
  }

  return <div>子组件正常渲染</div>;
};

const ErrorBoundaryDemo: FC = () => {
  const shouldCrash = ref(false);
  const errorMessage = ref('');
  const capturedCount = ref(0);

  onErrorCaptured(error => {
    const message = error instanceof Error ? error.message : String(error);

    // 关键点：先关闭会抛错的状态，再记录错误信息。
    // 否则记录日志这类响应式更新可能让 crash=true 的子组件再次渲染。
    shouldCrash.value = false;
    errorMessage.value = message;
    capturedCount.value += 1;

    // 返回 false 表示这个错误已经处理，不再继续向上冒泡。
    return false;
  });

  return (
    <section>
      <button onClick={() => {
        errorMessage.value = '';
        shouldCrash.value = true;
      }}>
        故意触发一次子组件错误
      </button>
      <p>已捕获 {capturedCount.value} 次</p>
      {errorMessage.value && <p>父组件已捕获：{errorMessage.value}</p>}
      {shouldCrash.value ? <BrokenPanel crash={true} /> : <BrokenPanel crash={false} />}
    </section>
  );
};

export default ErrorBoundaryDemo;`}
              />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body gap-5">
              <div className="rounded-lg border border-base-300 bg-base-200/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">这个示例会故意制造一次子组件错误</p>
                    <p className="mt-1 text-sm opacity-70">
                      错误来源是 <span className="font-mono">BrokenPanel</span>
                      ，捕获者是当前父组件。
                    </p>
                  </div>
                  <span className="badge badge-outline">已捕获 {capturedCount.value} 次</span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {captureFlow.map(step => (
                  <div className="rounded-lg border border-base-300 p-4" key={step.title}>
                    <h2 className="text-sm font-semibold">{step.title}</h2>
                    <p className="mt-2 text-sm leading-6 opacity-70">{step.body}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="btn btn-primary"
                  disabled={isTriggering.value}
                  onClick={triggerChildError}
                >
                  故意触发一次错误
                </button>
                <button className="btn btn-ghost" onClick={resetDemo}>
                  清空记录
                </button>
              </div>

              <div className="rounded-lg border border-base-300 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-info badge-outline">当前状态</span>
                  <span className="text-sm">{statusText.value}</span>
                </div>
                {errorMessage.value && (
                  <div className="alert alert-warning mt-4">
                    <span>
                      父组件已捕获 <span className="font-mono">BrokenPanel</span> 的错误：
                      {errorMessage.value}
                    </span>
                  </div>
                )}
              </div>

              {shouldCrash.value ? <BrokenPanel crash={true} /> : <BrokenPanel crash={false} />}

              <div className="rounded-lg border border-base-300 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
                  最近一次捕获
                </h2>
                <div className="mt-3 space-y-2">
                  {!latestCapture.value ? (
                    <p className="text-sm opacity-60">
                      还没有捕获到错误。点击按钮后，这里会显示最近一次捕获。
                    </p>
                  ) : (
                    (() => {
                      const item = latestCapture.value
                      return (
                        <div className="rounded-md bg-base-200 px-3 py-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="badge badge-warning badge-outline">
                              第 {item.id} 次
                            </span>
                            <span>来源：{item.source}</span>
                          </div>
                          <p className="mt-2">错误：{item.message}</p>
                          <p className="mt-1 opacity-70">处理：{item.result}</p>
                        </div>
                      )
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default OnErrorCaptured
