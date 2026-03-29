import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Countdown, Tabs } from '@rue-js/design'

const CountdownDemo: FC = () => {
  const counter = ref(59)
  if ((window as any).__rue_countdown_timer__ == null) {
    ;(window as any).__rue_countdown_timer__ = setInterval(() => {
      counter.value = counter.value > 0 ? counter.value - 1 : 59
    }, 1000)
  }

  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabLarge2 = ref<'preview' | 'code'>('preview')
  const tabClock = ref<'preview' | 'code'>('preview')
  const tabClockColon = ref<'preview' | 'code'>('preview')
  const tabLabels = ref<'preview' | 'code'>('preview')
  const tabLabelsUnder = ref<'preview' | 'code'>('preview')
  const tabInBoxes = ref<'preview' | 'code'>('preview')
  const tabArrayInternal = ref<'preview' | 'code'>('preview')

  const countdownItems = [
    { value: 10 },
    { content: 'h' },
    { value: 24, digits: 2 },
    { content: 'm' },
    { value: counter.value, digits: 2 },
    { content: 's' },
  ]

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
            <Countdown>
              <Countdown.Value value={counter.value} ariaLabel={String(counter.value)} />
            </Countdown>
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
            <Countdown className="font-mono text-6xl">
              <Countdown.Value value={counter.value} digits={2} ariaLabel={String(counter.value)} />
            </Countdown>
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
            <Countdown className="font-mono text-2xl">
              <Countdown.Value value={10} ariaLabel="10" />h
              <Countdown.Value value={24} ariaLabel="24" />m
              <Countdown.Value value={counter.value} ariaLabel={String(counter.value)} />s
            </Countdown>
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
            <Countdown className="font-mono text-2xl" items={countdownItems} />
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
            <Countdown className="font-mono text-2xl">
              <Countdown.Value value={10} ariaLabel="10" />:
              <Countdown.Value value={24} digits={2} ariaLabel="24" />:
              <Countdown.Value value={counter.value} digits={2} ariaLabel={String(counter.value)} />
            </Countdown>
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
                minutes
              </div>
              <div>
                <Countdown className="font-mono text-4xl">
                  <Countdown.Value value={counter.value} ariaLabel={String(counter.value)} />
                </Countdown>
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
                  <Countdown.Value value={counter.value} ariaLabel={String(counter.value)} />
                </Countdown>
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
                  <Countdown.Value value={counter.value} ariaLabel={String(counter.value)} />
                </Countdown>
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
