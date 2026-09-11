import { type FC, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'
import { businessScenarios, retainedScenarios, type NextTickScenario } from './next-tick-demos'
import ChatScrollDemo from './next-tick-demos/ChatScrollDemo'
import DomReadDemo from './next-tick-demos/DomReadDemo'
import FilterFocusDemo from './next-tick-demos/FilterFocusDemo'
import FocusErrorFieldDemo from './next-tick-demos/FocusErrorFieldDemo'
import ModalMeasureListDemo from './next-tick-demos/ModalMeasureListDemo'
import PanelMeasureDemo from './next-tick-demos/PanelMeasureDemo'
import TableFilterScrollDemo from './next-tick-demos/TableFilterScrollDemo'

type DemoTab = 'preview' | 'code'

type ScenarioSectionProps = {
  scenario: NextTickScenario
  eyebrow: string
  activeTab: { value: DemoTab }
}

const ScenarioPreview: FC<{ title: string }> = ({ title }) =>
  title === '读取最新 DOM 文本' ? (
    <DomReadDemo />
  ) : title === '消息流自动滚动' ? (
    <ChatScrollDemo />
  ) : title === '打开面板后自动聚焦' ? (
    <FilterFocusDemo />
  ) : title === '展开后测量高度' ? (
    <PanelMeasureDemo />
  ) : title === '表格筛选后滚到首条结果' ? (
    <TableFilterScrollDemo />
  ) : title === '提交后聚焦错误字段' ? (
    <FocusErrorFieldDemo />
  ) : (
    <ModalMeasureListDemo />
  )

const ScenarioSection: FC<ScenarioSectionProps> = props => {
  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-5">
      <div className="text-sm uppercase tracking-[0.24em] text-base-content/50">
        {props.eyebrow}
      </div>
      <div className="mt-2 text-2xl font-semibold">{props.scenario.title}</div>
      <p className="mt-2 text-base-content/70 leading-7">{props.scenario.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {props.scenario.businessCases.map(item => (
          <span key={item} className="badge badge-outline">
            {item}
          </span>
        ))}
      </div>

      <div className="mt-4">
        {props.activeTab.value === 'preview' ? (
          <ScenarioPreview title={props.scenario.title} />
        ) : (
          <div className="card bg-base-100 shadow overflow-auto">
            <div className="card-body p-0">
              <Code className="h-full" lang="tsx" code={props.scenario.source} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

const NextTickDemo: FC = () => {
  const activeTab = ref<DemoTab>('preview')

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">nextTick 真实业务场景</h1>
      <p className="max-w-4xl text-base-content/70 leading-7">
        现在这个页面只负责组织展示：原来的基础 demo 还在，同时把业务 demo
        全拆成了独立组件，并补了表格筛选、提交校验、弹窗测量这类更偏数据流的 nextTick 场景。
      </p>

      <div role="tablist" className="tabs tabs-box mt-6">
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

      <div className="mt-4 grid gap-6">
        {retainedScenarios.map(scenario => (
          <ScenarioSection
            key={scenario.title}
            scenario={scenario}
            eyebrow="保留原始 demo"
            activeTab={activeTab}
          />
        ))}

        <section className="rounded-box border border-base-300 bg-base-100 p-5">
          <div className="text-sm uppercase tracking-[0.24em] text-base-content/50">
            新增业务 demo
          </div>
          <div className="mt-2 text-2xl font-semibold">真实业务里 nextTick 怎么用</div>
          <p className="mt-2 text-base-content/70 leading-7">
            这里除了原来的 3
            个业务场景，还新增了“表格筛选后滚到首条结果”“提交后聚焦错误字段”“弹窗打开后测量列表高度”3
            个更偏数据流和表单流的真实例子。
          </p>
        </section>

        {businessScenarios.map((scenario, index) => (
          <ScenarioSection
            key={scenario.title}
            scenario={scenario}
            eyebrow={`业务场景 ${index + 1}`}
            activeTab={activeTab}
          />
        ))}
      </div>
    </SidebarPlayground>
  )
}

export default NextTickDemo
