/**
 * getCurrentScope 示例页。
 *
 * 展示 Vapor setup、watchEffect 与 scope.run 中 active effect scope 的读取差异。
 */
import { type EffectScope, type FC, getCurrentScope, onScopeDispose, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

type RefValue<T> = {
  value: T
}

type ScopeProbeProps = {
  count: RefValue<number>
  scopeRef: RefValue<EffectScope | undefined>
  report: (message: string) => void
}

/** 在 Vapor 子树中捕获当前 scope，并用 watchEffect 验证重跑时的 scope 归属。 */
const ScopeProbe: FC<ScopeProbeProps> = props => {
  const scope = getCurrentScope()
  props.scopeRef.value = scope
  onScopeDispose(() => {
    props.report('onScopeDispose: probe 卸载，scope 清理回调已执行')
  })
  return (
    <section className="rounded-lg border border-base-300 bg-base-200/60 p-5 space-y-3">
      <h2 className="text-xl font-semibold">Compiled scope probe</h2>
      <p className="text-sm text-base-content/70">
        {scope?.active === true ? 'probe scope 处于 active 状态' : 'probe scope 已停止'}
      </p>
      <p className="font-mono text-sm">count = {props.count.value}</p>
    </section>
  )
}

/** getCurrentScope 交互示例入口。 */
const GetCurrentScope: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')
  const count = ref(0)
  const mounted = ref(true)
  const scopeRef = ref<EffectScope | undefined>(undefined)
  const sequence = ref(0)
  const logs = ref<string[]>(['等待操作：点击按钮观察当前 effect scope'])

  const report = (message: string) => {
    sequence.value += 1
    logs.value = [
      `${sequence.value}. ${message}`,
      ...logs.value.filter(item => !item.startsWith('等待操作')),
    ].slice(0, 6)
  }

  const checkOutsideScope = () => {
    report(
      getCurrentScope()
        ? '事件处理器中意外读到了 active scope'
        : '事件处理器默认没有 active scope，getCurrentScope() 返回 undefined',
    )
  }

  const runInsideCapturedScope = () => {
    const scope = scopeRef.value
    if (!scope?.active) {
      report('没有可用的 active scope，请先挂载 probe')
      return
    }

    scope.run(() => {
      report(
        getCurrentScope() === scope
          ? 'scope.run(): 临时恢复了 probe 的 active scope'
          : 'scope.run(): 当前 scope 与 probe 不一致',
      )
    })
  }

  const toggleProbe = () => {
    mounted.value = !mounted.value
    report(mounted.value ? 'probe 已重新挂载' : 'probe 已卸载')
  }

  const scopeLabel = !scopeRef.value ? '未捕获' : scopeRef.value.active ? 'active' : 'stopped'

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">getCurrentScope 作用域探针</h1>
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
                code={`import {
  type EffectScope,
  type FC,
  getCurrentScope,
  onScopeDispose,
  ref,
  watchEffect,
} from '@rue-js/rue';
import { _$compiledRoot } from '@rue-js/rue/internal';

const ScopeProbe: FC<{
  count: { value: number };
  scopeRef: { value: EffectScope | undefined };
  report: (message: string) => void;
}> = props => {
  return _$compiledRoot(() => {
    const scope = getCurrentScope();
    props.scopeRef.value = scope;

    const root = document.createElement('section');
    const status = document.createElement('p');
    const countText = document.createElement('p');
    root.append(status, countText);

    onScopeDispose(() => {
      props.report('scope disposed');
    });

    watchEffect(() => {
      status.textContent =
        getCurrentScope() === scope ? 'same active scope' : 'missing scope';
      countText.textContent = \`count = \${props.count.value}\`;
    });

    return root;
  });
};

const GetCurrentScopeDemo: FC = () => {
  const count = ref(0);
  const scopeRef = ref<EffectScope | undefined>(undefined);

  return (
    <div>
      <button onClick={() => count.value++}>更新 count</button>
      <button
        onClick={() => {
          scopeRef.value?.run(() => {
            console.log(getCurrentScope() === scopeRef.value);
          });
        }}
      >
        scope.run()
      </button>
      <ScopeProbe count={count} scopeRef={scopeRef} report={console.log} />
    </div>
  );
};`}
              />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body gap-5">
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn btn-primary" onClick={() => count.value++}>
                  更新 count
                </button>
                <button className="btn" onClick={runInsideCapturedScope}>
                  scope.run()
                </button>
                <button className="btn" onClick={checkOutsideScope}>
                  事件中读取
                </button>
                <button className="btn btn-outline" onClick={toggleProbe}>
                  {mounted.value ? '卸载 probe' : '重新挂载 probe'}
                </button>
                <span className="badge badge-soft">scope: {scopeLabel}</span>
              </div>

              {mounted.value ? (
                <ScopeProbe count={count} scopeRef={scopeRef} report={report} />
              ) : (
                <section className="rounded-lg border border-dashed border-base-300 bg-base-200/50 p-5 text-sm text-base-content/70">
                  probe 已卸载。重新挂载后会创建新的 effect scope。
                </section>
              )}

              <div className="rounded-lg border border-base-300 bg-base-200/50 p-4">
                <h2 className="text-lg font-semibold mb-3">运行记录</h2>
                <ul className="space-y-2 text-sm">
                  {logs.value.map(item => (
                    <li className="font-mono" key={item}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default GetCurrentScope
