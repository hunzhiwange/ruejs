import type { FC } from '@rue-js/rue'
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, useRef, vapor, watchEffect } from '@rue-js/rue'
import { useRoute } from '@rue-js/router'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Tabs } from '@rue-js/design'

type LiveCountdownItem =
  | {
      value: number
      digits?: number
      ariaLabel?: string
      className?: string
    }
  | {
      content: string
      className?: string
    }

const LiveCountdown: FC<{ className?: string; getItems: () => ReadonlyArray<LiveCountdownItem> }> =
  props =>
    vapor(() => {
      const root = document.createElement('span')

      watchEffect(() => {
        root.className = props.className ? `countdown ${props.className}` : 'countdown'

        const nodes = props.getItems().map<Node>(item => {
          if ('value' in item) {
            const span = document.createElement('span')
            if (item.className) span.className = item.className
            span.setAttribute('aria-live', 'polite')
            span.setAttribute('aria-label', item.ariaLabel ?? String(item.value))
            span.style.setProperty('--value', String(item.value))
            if (item.digits != null) span.style.setProperty('--digits', String(item.digits))
            span.textContent = String(item.value)
            return span
          }

          // daisyUI countdown expects separators like "h" or ":" to be plain text nodes.
          return document.createTextNode(item.content)
        })

        root.replaceChildren(...nodes)
      })

      return root
    })

const CountdownDemo: FC = () => {
  const route = useRoute()
  const counter = ref(59)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = () => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startTimer = () => {
    if (timerRef.current != null) {
      return
    }

    timerRef.current = setInterval(() => {
      counter.value = counter.value > 0 ? counter.value - 1 : 59
    }, 1000)
  }

  onMounted(startTimer)
  onBeforeUnmount(stopTimer)
  onUnmounted(stopTimer)

  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabLarge2 = ref<'preview' | 'code'>('preview')
  const tabClock = ref<'preview' | 'code'>('preview')
  const tabClockColon = ref<'preview' | 'code'>('preview')
  const tabLabels = ref<'preview' | 'code'>('preview')
  const tabLabelsUnder = ref<'preview' | 'code'>('preview')
  const tabInBoxes = ref<'preview' | 'code'>('preview')
  const tabArrayInternal = ref<'preview' | 'code'>('preview')

  const countdownItems = computed(() => [
    { value: 10 },
    { content: 'h' },
    { value: 24, digits: 2 },
    { content: 'm' },
    { value: counter.value, digits: 2 },
    { content: 's' },
  ])

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Countdown 倒计时</h1>
        <p className="text-sm mt-3 mb-3">在 0 到 999 之间变化数字时提供过渡动效。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/countdown/" target="_blank">
            查看 Countdown 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Countdown</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBasic.value}
            onChange={k => (tabBasic.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBasic.value === 'preview' ? (
            <LiveCountdown getItems={() => [{ value: counter.value, ariaLabel: String(counter.value) }]} />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Countdown } from '@rue-js/design';
<Countdown>
  <Countdown.Value value={59} ariaLabel={String(59)} />
</Countdown>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Large text with 2 digits
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLarge2.value}
            onChange={k => (tabLarge2.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLarge2.value === 'preview' ? (
            <LiveCountdown
              className="font-mono text-6xl"
              getItems={() => [{ value: counter.value, digits: 2, ariaLabel: String(counter.value) }]}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Countdown className="font-mono text-6xl">
  <Countdown.Value value={59} digits={2} ariaLabel={String(59)} />
</Countdown>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Clock countdown
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabClock.value}
            onChange={k => (tabClock.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabClock.value === 'preview' ? (
            <LiveCountdown
              className="font-mono text-2xl"
              getItems={() => [
                { value: 10, ariaLabel: '10' },
                { content: 'h' },
                { value: 24, ariaLabel: '24' },
                { content: 'm' },
                { value: counter.value, ariaLabel: String(counter.value) },
                { content: 's' },
              ]}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Countdown className="font-mono text-2xl">
  <Countdown.Value value={10} ariaLabel="10" />h
  <Countdown.Value value={24} ariaLabel="24" />m
  <Countdown.Value value={59} ariaLabel={String(59)} />s
</Countdown>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Countdown 通过数据渲染（数组，组件内部）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabArrayInternal.value}
            onChange={k => (tabArrayInternal.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabArrayInternal.value === 'preview' ? (
            <LiveCountdown className="font-mono text-2xl" getItems={() => countdownItems.get()} />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Countdown } from '@rue-js/design';
const items = [
  { value: 10 },
  { content: 'h' },
  { value: 24, digits: 2 },
  { content: 'm' },
  { value: 59, digits: 2 },
  { content: 's' },
];
<Countdown className="font-mono text-2xl" items={items} />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Clock countdown with colons
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabClockColon.value}
            onChange={k => (tabClockColon.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabClockColon.value === 'preview' ? (
            <LiveCountdown
              className="font-mono text-2xl"
              getItems={() => [
                { value: 10, ariaLabel: '10' },
                { content: ':' },
                { value: 24, digits: 2, ariaLabel: '24' },
                { content: ':' },
                { value: counter.value, digits: 2, ariaLabel: String(counter.value) },
              ]}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Countdown className="font-mono text-2xl">
  <Countdown.Value value={10} ariaLabel="10" />:
  <Countdown.Value value={24} digits={2} ariaLabel="24" />:
  <Countdown.Value value={59} digits={2} ariaLabel={String(59)} />
</Countdown>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Large text with labels
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLabels.value}
            onChange={k => (tabLabels.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLabels.value === 'preview' ? (
            <div className="flex gap-5">
              <div>
                <LiveCountdown className="font-mono text-4xl" getItems={() => [{ value: 15, ariaLabel: '15' }]} />
                days
              </div>
              <div>
                <LiveCountdown className="font-mono text-4xl" getItems={() => [{ value: 10, ariaLabel: '10' }]} />
                hours
              </div>
              <div>
                <LiveCountdown className="font-mono text-4xl" getItems={() => [{ value: 24, ariaLabel: '24' }]} />
                minutes
              </div>
              <div>
                <LiveCountdown
                  className="font-mono text-4xl"
                  getItems={() => [{ value: counter.value, ariaLabel: String(counter.value) }]}
                />
                sec
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
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
      <Countdown.Value value={59} ariaLabel={String(59)} />
    </Countdown>
    sec
  </div>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Large text with labels under
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLabelsUnder.value}
            onChange={k => (tabLabelsUnder.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLabelsUnder.value === 'preview' ? (
            <div className="grid grid-flow-col gap-5 text-center auto-cols-max">
              <div className="flex flex-col">
                <LiveCountdown className="font-mono text-5xl" getItems={() => [{ value: 15, ariaLabel: '15' }]} />
                days
              </div>
              <div className="flex flex-col">
                <LiveCountdown className="font-mono text-5xl" getItems={() => [{ value: 10, ariaLabel: '10' }]} />
                hours
              </div>
              <div className="flex flex-col">
                <LiveCountdown className="font-mono text-5xl" getItems={() => [{ value: 24, ariaLabel: '24' }]} />
                min
              </div>
              <div className="flex flex-col">
                <LiveCountdown
                  className="font-mono text-5xl"
                  getItems={() => [{ value: counter.value, ariaLabel: String(counter.value) }]}
                />
                sec
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
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
      <Countdown.Value value={59} ariaLabel={String(59)} />
    </Countdown>
    sec
  </div>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># In boxes</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabInBoxes.value}
            onChange={k => (tabInBoxes.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabInBoxes.value === 'preview' ? (
            <div className="grid grid-flow-col gap-5 text-center auto-cols-max">
              <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
                <LiveCountdown className="font-mono text-5xl" getItems={() => [{ value: 15, ariaLabel: '15' }]} />
                days
              </div>
              <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
                <LiveCountdown className="font-mono text-5xl" getItems={() => [{ value: 10, ariaLabel: '10' }]} />
                hours
              </div>
              <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
                <LiveCountdown className="font-mono text-5xl" getItems={() => [{ value: 24, ariaLabel: '24' }]} />
                min
              </div>
              <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
                <LiveCountdown
                  className="font-mono text-5xl"
                  getItems={() => [{ value: counter.value, ariaLabel: String(counter.value) }]}
                />
                sec
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
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
      <Countdown.Value value={59} ariaLabel={String(59)} />
    </Countdown>
    sec
  </div>
</div>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default CountdownDemo
