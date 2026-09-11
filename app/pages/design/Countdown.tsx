import type { FC } from '@rue-js/rue'
import { computed, onMounted, onUnmounted, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Countdown, Tabs } from '@rue-js/design'
type TabMode = 'preview' | 'code'

interface ExampleBlockProps {
  title: string
  summary?: string
  tab: { value: TabMode }
  preview: () => any
  code: string
}

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const ExampleBlock: FC<ExampleBlockProps> = ({ title, summary, tab, preview, code }) => {
  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {title}</h2>
          {summary ? <p className="m-0 text-sm opacity-70">{summary}</p> : null}
        </div>
      </div>
      <Tabs
        style="box"
        items={[
          { key: 'preview', label: '预览' },
          { key: 'code', label: 'JSX代码' },
        ]}
        activeKey={tab.value}
        onChange={key => (tab.value = key as TabMode)}
        className="mb-3 mt-4"
      />
      {tab.value === 'preview' ? preview() : <Code className="mt-2" lang="tsx" code={code} />}
    </div>
  )
}

const ApiTable: FC<{ rows: ApiRow[] }> = ({ rows }) => {
  return (
    <div className="not-prose overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>属性</th>
            <th>说明</th>
            <th>类型</th>
            <th>默认值</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.prop}>
              <td>
                <code>{row.prop}</code>
              </td>
              <td>{row.description}</td>
              <td>
                <code>{row.type}</code>
              </td>
              <td>
                <code>{row.defaultValue}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const CountTile: FC<{
  className?: string
  label: string
  countdownClassName?: string
  children?: any
}> = ({ className, label, countdownClassName, children }) => {
  return (
    <div className={className}>
      <Countdown className={countdownClassName}>{children}</Countdown>
      {label}
    </div>
  )
}

const apiRows: ApiRow[] = [
  {
    prop: 'className',
    description: '追加到 Rue countdown 根节点的视觉类名。',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'value',
    description: '目标时间戳、Date 或可解析时间字符串；传入后启用自动倒计时模式。',
    type: 'number | string | Date',
    defaultValue: '-',
  },
  {
    prop: 'format',
    description: '按常见倒计时组件的格式拆分时间段，支持 `[]` 保持字面量。',
    type: 'string',
    defaultValue: 'HH:mm:ss',
  },
  {
    prop: 'interval',
    description: '自定义刷新间隔；含毫秒位时默认约 33ms，否则默认 1000ms。',
    type: 'number',
    defaultValue: 'auto',
  },
  {
    prop: 'ariaLive',
    description: '控制自动倒计时模式下每个数值段的播报策略。',
    type: "'polite' | 'off' | 'assertive'",
    defaultValue: '秒级 polite，毫秒 off',
  },
  {
    prop: 'onChange',
    description: '自动倒计时每次刷新时返回剩余毫秒数。',
    type: '(remaining?: number) => void',
    defaultValue: '-',
  },
  {
    prop: 'onFinish',
    description: '倒计时归零时触发一次。',
    type: '() => void',
    defaultValue: '-',
  },
  {
    prop: 'items',
    description: '数据驱动的文本/数值混合渲染，适合完全自定义排布。',
    type: 'CountdownItem[]',
    defaultValue: '-',
  },
]

const CountdownDemo: FC = () => {
  const counter = ref(59)
  let timer: ReturnType<typeof setInterval> | null = null
  const comboTarget = ref(Date.now() + 10 * 60 * 60 * 1000 + 24 * 60 * 1000 + 59 * 1000)
  const comboTotalSeconds = ref(Math.max(Math.floor((comboTarget.value - Date.now()) / 1000), 0))
  const comboHours = ref(Math.floor(comboTotalSeconds.value / (60 * 60)))
  const comboMinutes = ref(Math.floor((comboTotalSeconds.value % (60 * 60)) / 60))
  const comboSeconds = ref(comboTotalSeconds.value % 60)
  const basicTarget = ref(Date.now() + 1000 * 60 * 60 * 10 + 1000 * 60 * 24 + 1000 * 59)
  const millisecondTarget = ref(Date.now() + 10 * 1000)
  const dayLevelTarget = ref(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 45 * 1000)
  const callbackTarget = ref(Date.now() + 10 * 1000)
  const callbackStatus = ref('计时中')
  const callbackRemaining = ref(10_000)

  const syncComboCountdown = () => {
    const totalSeconds = Math.max(Math.floor((comboTarget.value - Date.now()) / 1000), 0)
    comboTotalSeconds.value = totalSeconds
    comboHours.value = Math.floor(totalSeconds / (60 * 60))
    comboMinutes.value = Math.floor((totalSeconds % (60 * 60)) / 60)
    comboSeconds.value = totalSeconds % 60
  }

  const stopTimer = () => {
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
  }

  const startTimer = () => {
    if (timer != null) {
      return
    }

    syncComboCountdown()
    timer = setInterval(() => {
      counter.value = counter.value > 0 ? counter.value - 1 : 59
      syncComboCountdown()
    }, 1000)
  }

  onMounted(() => {
    startTimer()
  })
  onUnmounted(stopTimer)

  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabLarge2 = ref<'preview' | 'code'>('preview')
  const tabClock = ref<'preview' | 'code'>('preview')
  const tabClockColon = ref<'preview' | 'code'>('preview')
  const tabLabels = ref<'preview' | 'code'>('preview')
  const tabLabelsUnder = ref<'preview' | 'code'>('preview')
  const tabInBoxes = ref<'preview' | 'code'>('preview')
  const tabArrayInternal = ref<'preview' | 'code'>('preview')
  const tabTarget = ref<'preview' | 'code'>('preview')
  const tabMillisecond = ref<'preview' | 'code'>('preview')
  const tabDayLevel = ref<'preview' | 'code'>('preview')
  const tabCallbacks = ref<'preview' | 'code'>('preview')

  const countdownItems = computed(() => [
    { value: 10 },
    { content: 'h' },
    { value: 24, digits: 2 },
    { content: 'm' },
    { value: counter.value, digits: 2 },
    { content: 's' },
  ])

  const restartTargetDemo = () => {
    basicTarget.value = Date.now() + 1000 * 60 * 60 * 10 + 1000 * 60 * 24 + 1000 * 59
  }

  const restartMillisecondDemo = () => {
    millisecondTarget.value = Date.now() + 10 * 1000
  }

  const restartDayLevelDemo = () => {
    dayLevelTarget.value = Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 45 * 1000
  }

  const restartCallbackDemo = () => {
    callbackStatus.value = '计时中'
    callbackRemaining.value = 10_000
    callbackTarget.value = Date.now() + 10 * 1000
  }

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Countdown 倒计时</h1>
        <p className="text-sm mt-3 mb-3">
          现在既能可以使用 `Countdown.Value` / `items` 进行静态拼装，也能直接传入目标时间并通过
          `format`、`onChange`、`onFinish` 驱动完整倒计时。
        </p>

        <ExampleBlock
          title="Target Time Countdown"
          summary="直接传入目标时间戳与 format，组件内部自动计算剩余时间。"
          tab={tabTarget}
          preview={() => (
            <div className="space-y-4">
              <Countdown
                key={basicTarget.value}
                className="font-mono text-4xl"
                value={basicTarget.value}
                format="HH:mm:ss"
              />
              <button className="btn btn-sm btn-outline ml-3" onClick={restartTargetDemo}>
                重新开始
              </button>
            </div>
          )}
          code={`const deadline = Date.now() + 1000 * 60 * 60 * 10 + 1000 * 60 * 24 + 1000 * 59

<Countdown
  className="font-mono text-4xl"
  value={deadline}
  format="HH:mm:ss"
/>`}
        />

        <ExampleBlock
          title="Millisecond Precision"
          summary="包含 S 时会自动切到更高频率刷新，适合展示毫秒级结尾。"
          tab={tabMillisecond}
          preview={() => (
            <div className="space-y-4">
              <Countdown
                key={millisecondTarget.value}
                className="font-mono text-3xl"
                value={millisecondTarget.value}
                format="HH:mm:ss:SSS"
                interval={250}
              />
              <button className="btn btn-sm btn-outline ml-3" onClick={restartMillisecondDemo}>
                再来 10 秒
              </button>
            </div>
          )}
          code={`const preciseDeadline = Date.now() + 10 * 1000

<Countdown
  className="font-mono text-3xl"
  value={preciseDeadline}
  format="HH:mm:ss:SSS"
  interval={250}
/>`}
        />

        <ExampleBlock
          title="Day Level Format"
          summary="支持把单位文字写进 format，并自动拆成数字段与纯文本分隔符。"
          tab={tabDayLevel}
          preview={() => (
            <div className="space-y-4">
              <Countdown
                key={dayLevelTarget.value}
                className="font-mono text-2xl"
                value={dayLevelTarget.value}
                format="D [days] H [hours] m [minutes] s [seconds]"
              />
              <button className="btn btn-sm btn-outline ml-3" onClick={restartDayLevelDemo}>
                重置长倒计时
              </button>
            </div>
          )}
          code={`const longDeadline =
  Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 45 * 1000

<Countdown
  className="font-mono text-2xl"
  value={longDeadline}
  format="D [days] H [hours] m [minutes] s [seconds]"
/>`}
        />

        <ExampleBlock
          title="Callbacks"
          summary="onChange 返回剩余毫秒数，onFinish 只在归零时触发一次。"
          tab={tabCallbacks}
          preview={() => (
            <div className="space-y-4">
              <Countdown
                key={callbackTarget.value}
                className="font-mono text-3xl"
                value={callbackTarget.value}
                format="s.SSS"
                interval={250}
                onChange={remaining => {
                  callbackRemaining.value = Math.max(Math.round(remaining ?? 0), 0)
                }}
                onFinish={() => {
                  callbackStatus.value = '已完成'
                }}
              />
              <div className="text-sm opacity-70">
                最近一次 onChange: {callbackRemaining.value} ms
              </div>
              <div className="text-sm opacity-70">onFinish 状态: {callbackStatus.value}</div>
              <button className="btn btn-sm btn-outline" onClick={restartCallbackDemo}>
                重置 10 秒示例
              </button>
            </div>
          )}
          code={`const target = Date.now() + 10 * 1000
const status = ref('计时中')
const lastRemaining = ref(10_000)

<Countdown
  className="font-mono text-3xl"
  value={target}
  format="s.SSS"
  interval={250}
  onChange={remaining => {
    lastRemaining.value = Math.max(Math.round(remaining ?? 0), 0)
  }}
  onFinish={() => {
    status.value = '已完成'
  }}
/>`}
        />

        <h2>组合方式</h2>
        <p className="text-sm">
          这组示例使用 Rue 组合式写法，用于展示 `Countdown.Value` 与 `items` 的自由排布能力。
        </p>

        <ExampleBlock
          title="Countdown"
          tab={tabBasic}
          preview={() => (
            <Countdown>
              <Countdown.Value
                value={comboTotalSeconds.value}
                ariaLabel={`${comboTotalSeconds.value} seconds remaining`}
              />
            </Countdown>
          )}
          code={`const remaining = ref(10 * 60 * 60 + 24 * 60 + 59)

<Countdown>
  <Countdown.Value value={remaining.value} ariaLabel={\`\${remaining.value} seconds remaining\`} />
</Countdown>`}
        />

        <ExampleBlock
          title="Large Text With 2 Digits"
          tab={tabLarge2}
          preview={() => (
            <Countdown className="font-mono text-6xl">
              <Countdown.Value
                value={comboSeconds.value}
                digits={2}
                ariaLabel={`${comboSeconds.value} seconds remaining`}
              />
            </Countdown>
          )}
          code={`const parts = computed(() => {
  const totalSeconds = Math.max(Math.floor(remaining.value), 0)
  return { seconds: totalSeconds % 60 }
})

<Countdown className="font-mono text-6xl">
  <Countdown.Value value={parts.get().seconds} digits={2} ariaLabel={\`\${parts.get().seconds} seconds remaining\`} />
</Countdown>`}
        />

        <ExampleBlock
          title="Clock Countdown"
          tab={tabClock}
          preview={() => (
            <Countdown className="font-mono text-2xl">
              <Countdown.Value value={comboHours.value} ariaLabel={`${comboHours.value} hours`} />
              h
              <Countdown.Value
                value={comboMinutes.value}
                digits={2}
                ariaLabel={`${comboMinutes.value} minutes`}
              />
              m
              <Countdown.Value
                value={comboSeconds.value}
                digits={2}
                ariaLabel={`${comboSeconds.value} seconds`}
              />
              s
            </Countdown>
          )}
          code={`const parts = computed(() => {
  const totalSeconds = Math.max(Math.floor(remaining.value), 0)

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
})

<Countdown className="font-mono text-2xl">
  <Countdown.Value value={parts.get().hours} ariaLabel={\`\${parts.get().hours} hours\`} />h
  <Countdown.Value value={parts.get().minutes} digits={2} ariaLabel={\`\${parts.get().minutes} minutes\`} />m
  <Countdown.Value value={parts.get().seconds} digits={2} ariaLabel={\`\${parts.get().seconds} seconds\`} />s
</Countdown>`}
        />

        <ExampleBlock
          title="Countdown 通过数据渲染（数组，组件内部）"
          summary="items 适合在业务层先拼好数字段与分隔符，再一次性交给 Countdown。"
          tab={tabArrayInternal}
          preview={() => <Countdown className="font-mono text-2xl" items={countdownItems.get()} />}
          code={`const items = [
  { value: 10 },
  { content: 'h' },
  { value: 24, digits: 2 },
  { content: 'm' },
  { value: 59, digits: 2 },
  { content: 's' },
]

<Countdown className="font-mono text-2xl" items={items} />`}
        />

        <ExampleBlock
          title="Clock Countdown With Colons"
          tab={tabClockColon}
          preview={() => (
            <Countdown className="font-mono text-2xl">
              <Countdown.Value value={10} ariaLabel="10" />:
              <Countdown.Value value={24} digits={2} ariaLabel="24" />:
              <Countdown.Value value={counter.value} digits={2} ariaLabel={String(counter.value)} />
            </Countdown>
          )}
          code={`<Countdown className="font-mono text-2xl">
  <Countdown.Value value={10} ariaLabel="10" />:
  <Countdown.Value value={24} digits={2} ariaLabel="24" />:
  <Countdown.Value value={59} digits={2} ariaLabel="59" />
</Countdown>`}
        />

        <ExampleBlock
          title="Large Text With Labels"
          tab={tabLabels}
          preview={() => (
            <div className="flex gap-5">
              <CountTile label="days" countdownClassName="font-mono text-4xl">
                <Countdown.Value value={15} ariaLabel="15" />
              </CountTile>
              <CountTile label="hours" countdownClassName="font-mono text-4xl">
                <Countdown.Value value={10} ariaLabel="10" />
              </CountTile>
              <CountTile label="min" countdownClassName="font-mono text-4xl">
                <Countdown.Value value={24} ariaLabel="24" />
              </CountTile>
              <CountTile label="sec" countdownClassName="font-mono text-4xl">
                <Countdown.Value value={counter.value} ariaLabel={String(counter.value)} />
              </CountTile>
            </div>
          )}
          code={`<div className="flex gap-5">
  <div>
    <Countdown className="font-mono text-4xl">
      <Countdown.Value value={15} ariaLabel="15" />
    </Countdown>
    days
  </div>
  <div>
    <Countdown className="font-mono text-4xl">
      <Countdown.Value value={10} ariaLabel="10" />
    </Countdown>
    hours
  </div>
  <div>
    <Countdown className="font-mono text-4xl">
      <Countdown.Value value={24} ariaLabel="24" />
    </Countdown>
    min
  </div>
  <div>
    <Countdown className="font-mono text-4xl">
      <Countdown.Value value={59} ariaLabel="59" />
    </Countdown>
    sec
  </div>
</div>`}
        />

        <ExampleBlock
          title="Large Text With Labels Under"
          tab={tabLabelsUnder}
          preview={() => (
            <div className="grid grid-flow-col gap-5 text-center auto-cols-max">
              <CountTile
                className="flex flex-col"
                label="days"
                countdownClassName="font-mono text-5xl"
              >
                <Countdown.Value value={15} ariaLabel="15" />
              </CountTile>
              <CountTile
                className="flex flex-col"
                label="hours"
                countdownClassName="font-mono text-5xl"
              >
                <Countdown.Value value={10} ariaLabel="10" />
              </CountTile>
              <CountTile
                className="flex flex-col"
                label="min"
                countdownClassName="font-mono text-5xl"
              >
                <Countdown.Value value={24} ariaLabel="24" />
              </CountTile>
              <CountTile
                className="flex flex-col"
                label="sec"
                countdownClassName="font-mono text-5xl"
              >
                <Countdown.Value value={counter.value} ariaLabel={String(counter.value)} />
              </CountTile>
            </div>
          )}
          code={`<div className="grid grid-flow-col gap-5 text-center auto-cols-max">
  <div className="flex flex-col">
    <Countdown className="font-mono text-5xl">
      <Countdown.Value value={15} ariaLabel="15" />
    </Countdown>
    days
  </div>
  <div className="flex flex-col">
    <Countdown className="font-mono text-5xl">
      <Countdown.Value value={10} ariaLabel="10" />
    </Countdown>
    hours
  </div>
  <div className="flex flex-col">
    <Countdown className="font-mono text-5xl">
      <Countdown.Value value={24} ariaLabel="24" />
    </Countdown>
    min
  </div>
  <div className="flex flex-col">
    <Countdown className="font-mono text-5xl">
      <Countdown.Value value={59} ariaLabel="59" />
    </Countdown>
    sec
  </div>
</div>`}
        />

        <ExampleBlock
          title="In Boxes"
          tab={tabInBoxes}
          preview={() => (
            <div className="grid grid-flow-col gap-5 text-center auto-cols-max">
              <CountTile
                className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content"
                label="days"
                countdownClassName="font-mono text-5xl"
              >
                <Countdown.Value value={15} ariaLabel="15" />
              </CountTile>
              <CountTile
                className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content"
                label="hours"
                countdownClassName="font-mono text-5xl"
              >
                <Countdown.Value value={10} ariaLabel="10" />
              </CountTile>
              <CountTile
                className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content"
                label="min"
                countdownClassName="font-mono text-5xl"
              >
                <Countdown.Value value={24} ariaLabel="24" />
              </CountTile>
              <CountTile
                className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content"
                label="sec"
                countdownClassName="font-mono text-5xl"
              >
                <Countdown.Value value={counter.value} ariaLabel={String(counter.value)} />
              </CountTile>
            </div>
          )}
          code={`<div className="grid grid-flow-col gap-5 text-center auto-cols-max">
  <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
    <Countdown className="font-mono text-5xl">
      <Countdown.Value value={15} ariaLabel="15" />
    </Countdown>
    days
  </div>
  <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
    <Countdown className="font-mono text-5xl">
      <Countdown.Value value={10} ariaLabel="10" />
    </Countdown>
    hours
  </div>
  <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
    <Countdown className="font-mono text-5xl">
      <Countdown.Value value={24} ariaLabel="24" />
    </Countdown>
    min
  </div>
  <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
    <Countdown className="font-mono text-5xl">
      <Countdown.Value value={59} ariaLabel="59" />
    </Countdown>
    sec
  </div>
</div>`}
        />

        <h2>API</h2>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default CountdownDemo
