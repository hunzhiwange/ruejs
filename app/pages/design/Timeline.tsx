import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Tabs, Timeline } from '@rue-js/design'

const TimelineDemo: FC = () => {
  const tabBothSides = ref<'preview' | 'code'>('preview')
  const tabBottomOnly = ref<'preview' | 'code'>('preview')
  const tabDifferentSides = ref<'preview' | 'code'>('preview')
  const tabColorfulLines = ref<'preview' | 'code'>('preview')
  const tabNoIcons = ref<'preview' | 'code'>('preview')
  const tabVBothSides = ref<'preview' | 'code'>('preview')
  const tabVRightOnly = ref<'preview' | 'code'>('preview')
  const tabVDifferentSides = ref<'preview' | 'code'>('preview')
  const tabVColorfulLines = ref<'preview' | 'code'>('preview')
  const tabSnapStart = ref<'preview' | 'code'>('preview')
  const tabArray = ref<'preview' | 'code'>('preview')
  const tabArrayInternal = ref<'preview' | 'code'>('preview')

  const timelineData = [
    {
      beforeLine: false,
      start: 'First Macintosh computer',
      middleIcon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd"
          />
        </svg>
      ),
      end: 'iMac',
      afterLine: true,
    },
    {
      beforeLine: true,
      start: 'iPod',
      middleIcon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd"
          />
        </svg>
      ),
      end: 'iPhone',
      afterLine: true,
    },
    {
      beforeLine: true,
      start: 'Apple Watch',
      middleIcon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd"
          />
        </svg>
      ),
      afterLine: false,
    },
  ]

  const timelineItems = [
    {
      beforeLine: true,
      start: { box: true, content: <span>First Macintosh computer</span> },
      middle: {
        content: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clip-rule="evenodd"
            />
          </svg>
        ),
      },
      end: { box: true, content: <span>iMac</span> },
      afterLine: true,
    },
    {
      beforeLine: true,
      middle: { content: <span>Milestone</span> },
      afterLine: true,
    },
  ] as const

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Timeline 时间线</h1>
        <p className="text-sm mt-3 mb-3">时间线用于按时间顺序展示一系列事件或进程节点。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/timeline/" target="_blank">
            查看 Timeline 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Timeline 通过数据渲染（数组）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabArray.value}
            onChange={k => (tabArray.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabArray.value === 'preview' ? (
            <Timeline>
              {timelineData.map((m, i) => (
                <li key={i}>
                  {m.beforeLine ? <hr /> : null}
                  {m.start ? <Timeline.Start box>{m.start}</Timeline.Start> : null}
                  {m.middleIcon ? <Timeline.Middle>{m.middleIcon}</Timeline.Middle> : null}
                  {m.end ? <Timeline.End box>{m.end}</Timeline.End> : null}
                  {m.afterLine ? <hr /> : null}
                </li>
              ))}
            </Timeline>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { ref } from 'rue-js'
import { Timeline } from '@rue-js/design'
const tabArray = ref<'preview' | 'code'>('preview')
const timelineData = [
  {
    beforeLine: false,
    start: 'First Macintosh computer',
    middleIcon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    ),
    end: 'iMac',
    afterLine: true,
  },
  {
    beforeLine: true,
    start: 'iPod',
    middleIcon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    ),
    end: 'iPhone',
    afterLine: true,
  },
  {
    beforeLine: true,
    start: 'Apple Watch',
    middleIcon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    ),
    afterLine: false,
  },
]
<Timeline>
  {timelineData.map((m, i) => (
    <li key={i}>
      {m.beforeLine ? <hr /> : null}
      {m.start ? <Timeline.Start box>{m.start}</Timeline.Start> : null}
      {m.middleIcon ? <Timeline.Middle>{m.middleIcon}</Timeline.Middle> : null}
      {m.end ? <Timeline.End box>{m.end}</Timeline.End> : null}
      {m.afterLine ? <hr /> : null}
    </li>
  ))}
</Timeline>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Timeline 通过数据渲染（数组，组件内部）
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
            <Timeline items={timelineItems} />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Timeline } from '@rue-js/design'
const timelineItems = [
  {
    beforeLine: true,
    start: { box: true, content: <span>First Macintosh computer</span> },
    middle: {
      content: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd"
          />
        </svg>
      ),
    },
    end: { box: true, content: <span>iMac</span> },
    afterLine: true,
  },
  {
    beforeLine: true,
    middle: { content: <span>Milestone</span> },
    afterLine: true,
  },
] as const
<Timeline items={timelineItems} />`}
            />
          )}

          <div className="alert my-3">
            <p className="text-sm mt-3 mb-3">
              <svg
                class="size-4 ms-2 inline-block text-info"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <g fill="currentColor" stroke-linejoin="miter" stroke-linecap="butt">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="square"
                    stroke-miterlimit="10"
                    stroke-width="2"
                  ></circle>
                  <path
                    d="m12,17v-5.5c0-.276-.224-.5-.5-.5h-1.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="square"
                    stroke-miterlimit="10"
                    stroke-width="2"
                  ></path>
                  <circle cx="12" cy="7.25" r="1.25" fill="currentColor" stroke-width="2"></circle>
                </g>
              </svg>
              <span className="ms-2">
                每个时间线项的开头或结尾的 <code>hr</code> 标签用于显示连接各项的线条。
              </span>
            </p>
          </div>
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 两侧文字与图标
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBothSides.value}
            onChange={k => (tabBothSides.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBothSides.value === 'preview' ? (
            <Timeline>
              <li>
                <Timeline.Start box>First Macintosh computer</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iMac</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Start box>iPod</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iPhone</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Start box>Apple Watch</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
              </li>
            </Timeline>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Timeline>
  <li>
    <Timeline.Start box>First Macintosh computer</Timeline.Start>
    <Timeline.Middle>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
    </Timeline.Middle>
    <Timeline.End box>iMac</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Start box>iPod</Timeline.Start>
    <Timeline.Middle>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
    </Timeline.Middle>
    <Timeline.End box>iPhone</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Start box>Apple Watch</Timeline.Start>
    <Timeline.Middle>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
    </Timeline.Middle>
  </li>
</Timeline>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 仅底部一侧</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBottomOnly.value}
            onChange={k => (tabBottomOnly.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBottomOnly.value === 'preview' ? (
            <Timeline>
              <li>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>First Macintosh computer</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iMac</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iPod</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iPhone</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>Apple Watch</Timeline.End>
              </li>
            </Timeline>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Timeline>
  <li>
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>First Macintosh computer</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>iMac</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>iPod</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>iPhone</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>Apple Watch</Timeline.End>
  </li>
</Timeline>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 不同侧交替</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabDifferentSides.value}
            onChange={k => (tabDifferentSides.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabDifferentSides.value === 'preview' ? (
            <Timeline>
              <li>
                <Timeline.Start box>First Macintosh computer</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iMac</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Start box>iPod</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>Apple Watch</Timeline.End>
              </li>
            </Timeline>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Timeline>
  <li>
    <Timeline.Start box>First Macintosh computer</Timeline.Start>
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>iMac</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Start box>iPod</Timeline.Start>
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>Apple Watch</Timeline.End>
  </li>
</Timeline>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 彩色线条</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabColorfulLines.value}
            onChange={k => (tabColorfulLines.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabColorfulLines.value === 'preview' ? (
            <Timeline>
              <li>
                <Timeline.Start box>First Macintosh computer</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5 text-primary"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <hr className="bg-primary" />
              </li>
              <li>
                <hr className="bg-primary" />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5 text-primary"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iMac</Timeline.End>
                <hr className="bg-primary" />
              </li>
              <li>
                <hr className="bg-primary" />
                <Timeline.Start box>iPod</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5 text-primary"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5 text-primary"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>Apple Watch</Timeline.End>
              </li>
            </Timeline>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Timeline>
  <li>
    <Timeline.Start box>First Macintosh computer</Timeline.Start>
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5 text-primary"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <hr className="bg-primary" />
  </li>
  <li>
    <hr className="bg-primary" />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5 text-primary"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>iMac</Timeline.End>
    <hr className="bg-primary" />
  </li>
  <li>
    <hr className="bg-primary" />
    <Timeline.Start box>iPod</Timeline.Start>
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5 text-primary"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5 text-primary"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>Apple Watch</Timeline.End>
  </li>
</Timeline>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 无图标</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabNoIcons.value}
            onChange={k => (tabNoIcons.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabNoIcons.value === 'preview' ? (
            <Timeline>
              <li>
                <Timeline.Start box>First Macintosh computer</Timeline.Start>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.End box>iMac</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Start box>iPod</Timeline.Start>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.End box>iPhone</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Start box>Apple Watch</Timeline.Start>
              </li>
            </Timeline>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Timeline>
  <li>
    <Timeline.Start box>First Macintosh computer</Timeline.Start>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.End box>iMac</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Start box>iPod</Timeline.Start>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.End box>iPhone</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Start box>Apple Watch</Timeline.Start>
  </li>    
</Timeline>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 纵向：两侧文字与图标
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabVBothSides.value}
            onChange={k => (tabVBothSides.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabVBothSides.value === 'preview' ? (
            <Timeline direction="vertical">
              <li>
                <Timeline.Start box>First Macintosh computer</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iMac</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Start box>iPod</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.Start box>Apple Watch</Timeline.Start>
              </li>
            </Timeline>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Timeline direction="vertical">
  <li>
    <Timeline.Start box>First Macintosh computer</Timeline.Start>
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>iMac</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Start box>iPod</Timeline.Start>
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.Start box>Apple Watch</Timeline.Start>
  </li>
</Timeline>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 纵向：仅右侧
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabVRightOnly.value}
            onChange={k => (tabVRightOnly.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabVRightOnly.value === 'preview' ? (
            <Timeline direction="vertical">
              <li>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>First Macintosh computer</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iMac</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iPod</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iPhone</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>Apple Watch</Timeline.End>
              </li>
            </Timeline>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Timeline direction="vertical">
  <li>
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>First Macintosh computer</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>iMac</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>iPod</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>iPhone</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>Apple Watch</Timeline.End>
  </li>
</Timeline>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 纵向：不同侧交替
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabVDifferentSides.value}
            onChange={k => (tabVDifferentSides.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabVDifferentSides.value === 'preview' ? (
            <Timeline direction="vertical">
              <li>
                <Timeline.Start box>First Macintosh computer</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iMac</Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Start box>iPod</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>Apple Watch</Timeline.End>
              </li>
            </Timeline>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Timeline direction="vertical">
  <li>
    <Timeline.Start box>First Macintosh computer</Timeline.Start>
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>iMac</Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Start box>iPod</Timeline.Start>
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End box>Apple Watch</Timeline.End>
  </li>
</Timeline>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 纵向：彩色线条
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabVColorfulLines.value}
            onChange={k => (tabVColorfulLines.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabVColorfulLines.value === 'preview' ? (
            <Timeline direction="vertical">
              <li>
                <Timeline.Start box>First Macintosh computer</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5 text-primary"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <hr className="bg-primary" />
              </li>
              <li>
                <hr className="bg-primary" />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5 text-primary"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>iMac</Timeline.End>
                <hr className="bg-primary" />
              </li>
              <li>
                <hr className="bg-primary" />
                <Timeline.Start box>iPod</Timeline.Start>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5 text-primary"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5 text-primary"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End box>Apple Watch</Timeline.End>
              </li>
            </Timeline>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Timeline direction="vertical">
<li>
  <Timeline.Start box>First Macintosh computer</Timeline.Start>
  <Timeline.Middle>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-5 h-5 text-primary"
    >
      <path
        fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clip-rule="evenodd"
      />
    </svg>
  </Timeline.Middle>
  <hr className="bg-primary" />
</li>
<li>
  <hr className="bg-primary" />
  <Timeline.Middle>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-5 h-5 text-primary"
    >
      <path
        fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clip-rule="evenodd"
      />
    </svg>
  </Timeline.Middle>
  <Timeline.End box>iMac</Timeline.End>
  <hr className="bg-primary" />
</li>
<li>
  <hr className="bg-primary" />
  <Timeline.Start box>iPod</Timeline.Start>
  <Timeline.Middle>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-5 h-5 text-primary"
    >
      <path
        fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clip-rule="evenodd"
      />
    </svg>
  </Timeline.Middle>
  <hr />
</li>
<li>
  <hr />
  <Timeline.Middle>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-5 h-5 text-primary"
    >
      <path
        fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clip-rule="evenodd"
      />
    </svg>
  </Timeline.Middle>
  <Timeline.End box>Apple Watch</Timeline.End>
</li>
</Timeline>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 图标吸附到起始侧（snap to start）
          </h2>
          <p className="text-sm mt-3 mb-3">
            结合响应式紧凑模式 <code>max-md:timeline-compact</code>。
          </p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSnapStart.value}
            onChange={k => (tabSnapStart.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSnapStart.value === 'preview' ? (
            <Timeline direction="vertical" snapIcon className="max-md:timeline-compact">
              <li>
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.Start className="md:text-end mb-10">
                  <time className="font-mono italic">1984</time>
                  <div className="text-lg font-black">First Macintosh computer</div>
                  The Apple Macintosh—later rebranded as the Macintosh 128K—is the original Apple
                  Macintosh personal computer. It played a pivotal role in establishing desktop
                  publishing as a general office function. The motherboard, a 9 in (23 cm) CRT
                  monitor, and a floppy drive were housed in a beige case with integrated carrying
                  handle; it came with a keyboard and single-button mouse.
                </Timeline.Start>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End className="mb-10">
                  <time className="font-mono italic">1998</time>
                  <div className="text-lg font-black">iMac</div>
                  iMac is a family of all-in-one Macintosh desktop computers designed and built by
                  Apple Inc. It has been the primary part of Apple’s consumer desktop offerings
                  since its introduction in August 1998 and has evolved through seven distinct
                  forms.
                </Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.End className="mb-10">
                  <time className="font-mono italic">2007</time>
                  <div className="text-lg font-black">iPhone</div>
                  iPhone is a line of smartphones produced by Apple Inc. that use Apple's own iOS
                  mobile operating system. The first-generation iPhone was announced by then-Apple
                  CEO Steve Jobs on January 9, 2007. Since then, Apple has annually released new
                  iPhone models and iOS updates. As of November 1, 2018, more than 2.2 billion
                  iPhones had been sold. As of 2022, the iPhone accounts for 15.6% of global
                  smartphone market share
                </Timeline.End>
                <hr />
              </li>
              <li>
                <hr />
                <Timeline.Middle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </Timeline.Middle>
                <Timeline.Start className="mb-10 md:text-end">
                  <time className="font-mono italic">2015</time>
                  <div className="text-lg font-black">Apple Watch</div>
                  The Apple Watch is a line of smartwatches produced by Apple Inc. It incorporates
                  fitness tracking, health-oriented capabilities, and wireless telecommunication,
                  and integrates with iOS and other Apple products and services
                </Timeline.Start>
              </li>
            </Timeline>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Timeline direction="vertical" snapIcon className="max-md:timeline-compact">
  <li>
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.Start className="md:text-end mb-10">
      <time className="font-mono italic">1984</time>
      <div className="text-lg font-black">First Macintosh computer</div>
      The Apple Macintosh—later rebranded as the Macintosh 128K—is the original Apple
      Macintosh personal computer. It played a pivotal role in establishing desktop
      publishing as a general office function. The motherboard, a 9 in (23 cm) CRT
      monitor, and a floppy drive were housed in a beige case with integrated carrying
      handle; it came with a keyboard and single-button mouse.
    </Timeline.Start>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End className="mb-10">
      <time className="font-mono italic">1998</time>
      <div className="text-lg font-black">iMac</div>
      iMac is a family of all-in-one Macintosh desktop computers designed and built by
      Apple Inc. It has been the primary part of Apple’s consumer desktop offerings since
      its introduction in August 1998 and has evolved through seven distinct forms.
    </Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.End className="mb-10">
      <time className="font-mono italic">2007</time>
      <div className="text-lg font-black">iPhone</div>
      iPhone is a line of smartphones produced by Apple Inc. that use Apple's own iOS
      mobile operating system. The first-generation iPhone was announced by then-Apple CEO
      Steve Jobs on January 9, 2007. Since then, Apple has annually released new iPhone
      models and iOS updates. As of November 1, 2018, more than 2.2 billion iPhones had
      been sold. As of 2022, the iPhone accounts for 15.6% of global smartphone market
      share
    </Timeline.End>
    <hr />
  </li>
  <li>
    <hr />
    <Timeline.Middle>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clip-rule="evenodd"
        />
      </svg>
    </Timeline.Middle>
    <Timeline.Start className="mb-10 md:text-end">
      <time className="font-mono italic">2015</time>
      <div className="text-lg font-black">Apple Watch</div>
      The Apple Watch is a line of smartwatches produced by Apple Inc. It incorporates
      fitness tracking, health-oriented capabilities, and wireless telecommunication, and
      integrates with iOS and other Apple products and services
    </Timeline.Start>
  </li>
</Timeline>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default TimelineDemo
