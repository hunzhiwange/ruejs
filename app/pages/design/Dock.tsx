import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Dock, Tabs } from '@rue-js/design'

const DockDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabXs = ref<'preview' | 'code'>('preview')
  const tabSm = ref<'preview' | 'code'>('preview')
  const tabMd = ref<'preview' | 'code'>('preview')
  const tabLg = ref<'preview' | 'code'>('preview')
  const tabXl = ref<'preview' | 'code'>('preview')
  const tabCustom = ref<'preview' | 'code'>('preview')
  const tabAuto = ref<'preview' | 'code'>('preview')
  const activeBasic = ref(1)
  const activeXs = ref(1)
  const activeSm = ref(1)
  const activeMd = ref(1)
  const activeLg = ref(1)
  const activeXl = ref(1)
  const activeCustom = ref(1)
  const activeAuto = ref(1)

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Dock 底部栏</h1>
        <p className="text-sm mt-3 mb-3">Dock（也称为底部导航）用于为用户提供底部的导航操作。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/dock/" target="_blank">
            查看 Dock 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Dock</h2>
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
            <div className="bg-base-300 rounded-box w-full max-w-sm pt-32">
              <Dock
                className="relative border border-base-300"
                items={[
                  {
                    icon: (
                      <svg
                        className="size-[1.2em]"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                          <polyline
                            points="1 11 12 2 23 11"
                            fill="none"
                            stroke="currentColor"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></polyline>
                          <path
                            d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></path>
                          <line
                            x1="12"
                            y1="22"
                            x2="12"
                            y2="18"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></line>
                        </g>
                      </svg>
                    ),
                    label: 'Home',
                  },
                  {
                    icon: (
                      <svg
                        className="size-[1.2em]"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                          <polyline
                            points="3 14 9 14 9 17 15 17 15 14 21 14"
                            fill="none"
                            stroke="currentColor"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></polyline>
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></rect>
                        </g>
                      </svg>
                    ),
                    label: 'Inbox',
                  },
                  {
                    icon: (
                      <svg
                        className="size-[1.2em]"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                          <circle
                            cx="12"
                            cy="12"
                            r="3"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></circle>
                          <path
                            d="m22,13.25v-2.5l-2.318-.966c-.167-.581-.395-1.135-.682-1.654l.954-2.318-1.768-1.768-2.318.954c-.518-.287-1.073-.515-1.654-.682l-.966-2.318h-2.5l-.966,2.318c-.581.167-1.135.395-1.654.682l-2.318-.954-1.768,1.768.954,2.318c-.287.518-.515,1.073-.682,1.654l-2.318.966v2.5l2.318.966c.167.581.395,1.135.682,1.654l-.954,2.318,1.768,1.768,2.318-.954c.518.287,1.073.515,1.654.682l.966,2.318h2.5l.966-2.318c.581-.167,1.135-.395,1.654-.682l2.318.954,1.768-1.768-.954-2.318c.287-.518.515-1.073.682-1.654l2.318-.966Z"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></path>
                        </g>
                      </svg>
                    ),
                    label: 'Settings',
                  },
                ]}
                activeIndex={activeBasic.value}
                onChange={i => (activeBasic.value = i)}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Dock } from '@rue-js/design';
<div className="bg-base-300 rounded-box w-full max-w-sm pt-32">
  <Dock className="relative border border-base-300">
    <Dock.Item>
      <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>
      <Dock.Label>Home</Dock.Label>
    </Dock.Item>
    <Dock.Item active>
      <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>
      <Dock.Label>Inbox</Dock.Label>
    </Dock.Item>
    <Dock.Item>
      <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>
      <Dock.Label>Settings</Dock.Label>
    </Dock.Item>
  </Dock>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Dock Extra Small size
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabXs.value}
            onChange={k => (tabXs.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabXs.value === 'preview' ? (
            <div className="bg-base-300 rounded-box w-full max-w-sm pt-32">
              <Dock
                size="xs"
                className="relative border border-base-300"
                items={[
                  {
                    icon: (
                      <svg
                        className="size-[1.2em]"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                          <polyline
                            points="1 11 12 2 23 11"
                            fill="none"
                            stroke="currentColor"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></polyline>
                          <path
                            d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></path>
                          <line
                            x1="12"
                            y1="22"
                            x2="12"
                            y2="18"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></line>
                        </g>
                      </svg>
                    ),
                  },
                  {
                    icon: (
                      <svg
                        className="size-[1.2em]"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                          <polyline
                            points="3 14 9 14 9 17 15 17 15 14 21 14"
                            fill="none"
                            stroke="currentColor"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></polyline>
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></rect>
                        </g>
                      </svg>
                    ),
                  },
                  {
                    icon: (
                      <svg
                        className="size-[1.2em]"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                          <circle
                            cx="12"
                            cy="12"
                            r="3"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></circle>
                          <path
                            d="m22,13.25v-2.5l-2.318-.966c-.167-.581-.395-1.135-.682-1.654l.954-2.318-1.768-1.768-2.318.954c-.518-.287-1.073-.515-1.654-.682l-.966-2.318h-2.5l-.966,2.318c-.581.167-1.135.395-1.654.682l-2.318-.954-1.768,1.768.954,2.318c-.287.518-.515,1.073-.682,1.654l-2.318.966v2.5l2.318.966c.167.581.395,1.135.682,1.654l-.954,2.318,1.768,1.768,2.318-.954c.518.287,1.073.515,1.654.682l.966,2.318h2.5l.966-2.318c.581-.167,1.135-.395,1.654-.682l2.318.954,1.768-1.768-.954-2.318c.287-.518.515-1.073.682-1.654l2.318-.966Z"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></path>
                        </g>
                      </svg>
                    ),
                  },
                ]}
                activeIndex={activeXs.value}
                onChange={i => (activeXs.value = i)}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Dock size="xs" className="relative border border-base-300">
  <Dock.Item><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg></Dock.Item>
  <Dock.Item active><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg></Dock.Item>
  <Dock.Item><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg></Dock.Item>
</Dock>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Dock Small size
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSm.value}
            onChange={k => (tabSm.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSm.value === 'preview' ? (
            <div className="bg-base-300 rounded-box w-full max-w-sm pt-32">
              <Dock size="sm" className="relative border border-base-300">
                <Dock.Item active={activeSm.value === 0} onClick={() => (activeSm.value = 0)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <polyline
                        points="1 11 12 2 23 11"
                        fill="none"
                        stroke="currentColor"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></polyline>
                      <path
                        d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></path>
                      <line
                        x1="12"
                        y1="22"
                        x2="12"
                        y2="18"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></line>
                    </g>
                  </svg>
                </Dock.Item>
                <Dock.Item active={activeSm.value === 1} onClick={() => (activeSm.value = 1)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <polyline
                        points="3 14 9 14 9 17 15 17 15 14 21 14"
                        fill="none"
                        stroke="currentColor"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></polyline>
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></rect>
                    </g>
                  </svg>
                </Dock.Item>
                <Dock.Item active={activeSm.value === 2} onClick={() => (activeSm.value = 2)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></circle>
                      <path
                        d="m22,13.25v-2.5l-2.318-.966c-.167-.581-.395-1.135-.682-1.654l.954-2.318-1.768-1.768-2.318.954c-.518-.287-1.073-.515-1.654-.682l-.966-2.318h-2.5l-.966,2.318c-.581.167-1.135.395-1.654.682l-2.318-.954-1.768,1.768.954,2.318c-.287.518-.515,1.073-.682,1.654l-2.318.966v2.5l2.318.966c.167.581.395,1.135.682,1.654l-.954,2.318,1.768,1.768,2.318-.954c.518.287,1.073.515,1.654.682l.966,2.318h2.5l.966-2.318c.581-.167,1.135-.395,1.654-.682l2.318.954,1.768-1.768-.954-2.318c.287-.518.515-1.073.682-1.654l2.318-.966Z"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></path>
                    </g>
                  </svg>
                </Dock.Item>
              </Dock>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Dock size="sm" className="relative border border-base-300">
  <Dock.Item><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg></Dock.Item>
  <Dock.Item active><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg></Dock.Item>
  <Dock.Item><svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg></Dock.Item>
</Dock>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Dock Medium size
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabMd.value}
            onChange={k => (tabMd.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabMd.value === 'preview' ? (
            <div className="bg-base-300 rounded-box w-full max-w-sm pt-32">
              <Dock size="md" className="relative border border-base-300">
                <Dock.Item active={activeMd.value === 0} onClick={() => (activeMd.value = 0)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <polyline
                        points="1 11 12 2 23 11"
                        fill="none"
                        stroke="currentColor"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></polyline>
                      <path
                        d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></path>
                      <line
                        x1="12"
                        y1="22"
                        x2="12"
                        y2="18"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></line>
                    </g>
                  </svg>
                  <Dock.Label>Home</Dock.Label>
                </Dock.Item>
                <Dock.Item active={activeMd.value === 1} onClick={() => (activeMd.value = 1)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <polyline
                        points="3 14 9 14 9 17 15 17 15 14 21 14"
                        fill="none"
                        stroke="currentColor"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></polyline>
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></rect>
                    </g>
                  </svg>
                  <Dock.Label>Inbox</Dock.Label>
                </Dock.Item>
                <Dock.Item active={activeMd.value === 2} onClick={() => (activeMd.value = 2)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></circle>
                      <path
                        d="m22,13.25v-2.5l-2.318-.966c-.167-.581-.395-1.135-.682-1.654l.954-2.318-1.768-1.768-2.318.954c-.518-.287-1.073-.515-1.654-.682l-.966-2.318h-2.5l-.966,2.318c-.581.167-1.135.395-1.654.682l-2.318-.954-1.768,1.768.954,2.318c-.287.518-.515,1.073-.682,1.654l-2.318.966v2.5l2.318.966c.167.581.395,1.135.682,1.654l-.954,2.318,1.768,1.768,2.318-.954c.518.287,1.073.515,1.654.682l.966,2.318h2.5l.966-2.318c.581-.167,1.135-.395,1.654-.682l2.318.954,1.768-1.768-.954-2.318c.287-.518.515-1.073.682-1.654l2.318-.966Z"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></path>
                    </g>
                  </svg>
                  <Dock.Label>Settings</Dock.Label>
                </Dock.Item>
              </Dock>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Dock size="md" className="relative border border-base-300">
  <Dock.Item><svg className="size-[1.2em]" /><Dock.Label>Home</Dock.Label></Dock.Item>
  <Dock.Item active><svg className="size-[1.2em]" /><Dock.Label>Inbox</Dock.Label></Dock.Item>
  <Dock.Item><svg className="size-[1.2em]" /><Dock.Label>Settings</Dock.Label></Dock.Item>
</Dock>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Dock Large size
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLg.value}
            onChange={k => (tabLg.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLg.value === 'preview' ? (
            <div className="bg-base-300 rounded-box w-full max-w-sm pt-32">
              <Dock size="lg" className="relative border border-base-300">
                <Dock.Item active={activeLg.value === 0} onClick={() => (activeLg.value = 0)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <polyline
                        points="1 11 12 2 23 11"
                        fill="none"
                        stroke="currentColor"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></polyline>
                      <path
                        d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></path>
                      <line
                        x1="12"
                        y1="22"
                        x2="12"
                        y2="18"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></line>
                    </g>
                  </svg>
                  <Dock.Label>Home</Dock.Label>
                </Dock.Item>
                <Dock.Item active={activeLg.value === 1} onClick={() => (activeLg.value = 1)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <polyline
                        points="3 14 9 14 9 17 15 17 15 14 21 14"
                        fill="none"
                        stroke="currentColor"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></polyline>
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></rect>
                    </g>
                  </svg>
                  <Dock.Label>Inbox</Dock.Label>
                </Dock.Item>
                <Dock.Item active={activeLg.value === 2} onClick={() => (activeLg.value = 2)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></circle>
                      <path
                        d="m22,13.25v-2.5l-2.318-.966c-.167-.581-.395-1.135-.682-1.654l.954-2.318-1.768-1.768-2.318.954c-.518-.287-1.073-.515-1.654-.682l-.966-2.318h-2.5l-.966,2.318c-.581.167-1.135.395-1.654.682l-2.318-.954-1.768,1.768.954,2.318c-.287.518-.515,1.073-.682,1.654l-2.318.966v2.5l2.318.966c.167.581.395,1.135.682,1.654l-.954,2.318,1.768,1.768,2.318-.954c.518.287,1.073.515,1.654.682l.966,2.318h2.5l.966-2.318c.581-.167,1.135-.395,1.654-.682l2.318.954,1.768-1.768-.954-2.318c.287-.518.515-1.073.682-1.654l2.318-.966Z"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></path>
                    </g>
                  </svg>
                  <Dock.Label>Settings</Dock.Label>
                </Dock.Item>
              </Dock>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Dock size="lg" className="relative border border-base-300">
  <Dock.Item><svg className="size-[1.2em]" /><Dock.Label>Home</Dock.Label></Dock.Item>
  <Dock.Item active><svg className="size-[1.2em]" /><Dock.Label>Inbox</Dock.Label></Dock.Item>
  <Dock.Item><svg className="size-[1.2em]" /><Dock.Label>Settings</Dock.Label></Dock.Item>
</Dock>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Dock Extra Large size
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabXl.value}
            onChange={k => (tabXl.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabXl.value === 'preview' ? (
            <div className="bg-base-300 rounded-box w-full max-w-sm pt-32">
              <Dock size="xl" className="relative border border-base-300">
                <Dock.Item active={activeXl.value === 0} onClick={() => (activeXl.value = 0)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <polyline
                        points="1 11 12 2 23 11"
                        fill="none"
                        stroke="currentColor"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></polyline>
                      <path
                        d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></path>
                      <line
                        x1="12"
                        y1="22"
                        x2="12"
                        y2="18"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></line>
                    </g>
                  </svg>
                  <Dock.Label>Home</Dock.Label>
                </Dock.Item>
                <Dock.Item active={activeXl.value === 1} onClick={() => (activeXl.value = 1)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <polyline
                        points="3 14 9 14 9 17 15 17 15 14 21 14"
                        fill="none"
                        stroke="currentColor"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></polyline>
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></rect>
                    </g>
                  </svg>
                  <Dock.Label>Inbox</Dock.Label>
                </Dock.Item>
                <Dock.Item active={activeXl.value === 2} onClick={() => (activeXl.value = 2)}>
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></circle>
                      <path
                        d="m22,13.25v-2.5l-2.318-.966c-.167-.581-.395-1.135-.682-1.654l.954-2.318-1.768-1.768-2.318.954c-.518-.287-1.073-.515-1.654-.682l-.966-2.318h-2.5l-.966,2.318c-.581.167-1.135.395-1.654.682l-2.318-.954-1.768,1.768.954,2.318c-.287.518-.515,1.073-.682,1.654l-2.318.966v2.5l2.318.966c.167.581.395,1.135.682,1.654l-.954,2.318,1.768,1.768,2.318-.954c.518.287,1.073.515,1.654.682l.966,2.318h2.5l.966-2.318c.581-.167,1.135-.395,1.654-.682l2.318.954,1.768-1.768-.954-2.318c.287-.518.515-1.073.682-1.654l2.318-.966Z"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></path>
                    </g>
                  </svg>
                  <Dock.Label>Settings</Dock.Label>
                </Dock.Item>
              </Dock>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Dock size="xl" className="relative border border-base-300">
  <Dock.Item><svg className="size-[1.2em]" /><Dock.Label>Home</Dock.Label></Dock.Item>
  <Dock.Item active><svg className="size-[1.2em]" /><Dock.Label>Inbox</Dock.Label></Dock.Item>
  <Dock.Item><svg className="size-[1.2em]" /><Dock.Label>Settings</Dock.Label></Dock.Item>
</Dock>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Dock with custom colors
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCustom.value}
            onChange={k => (tabCustom.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCustom.value === 'preview' ? (
            <div className="bg-base-300 rounded-box w-full max-w-sm pt-32">
              <Dock className="relative bg-neutral text-neutral-content">
                <Dock.Item
                  active={activeCustom.value === 0}
                  onClick={() => (activeCustom.value = 0)}
                >
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <polyline
                        points="1 11 12 2 23 11"
                        fill="none"
                        stroke="currentColor"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></polyline>
                      <path
                        d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></path>
                      <line
                        x1="12"
                        y1="22"
                        x2="12"
                        y2="18"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></line>
                    </g>
                  </svg>
                  <Dock.Label>Home</Dock.Label>
                </Dock.Item>
                <Dock.Item
                  active={activeCustom.value === 1}
                  onClick={() => (activeCustom.value = 1)}
                >
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <polyline
                        points="3 14 9 14 9 17 15 17 15 14 21 14"
                        fill="none"
                        stroke="currentColor"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></polyline>
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></rect>
                    </g>
                  </svg>
                  <Dock.Label>Inbox</Dock.Label>
                </Dock.Item>
                <Dock.Item
                  active={activeCustom.value === 2}
                  onClick={() => (activeCustom.value = 2)}
                >
                  <svg
                    className="size-[1.2em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></circle>
                      <path
                        d="m22,13.25v-2.5l-2.318-.966c-.167-.581-.395-1.135-.682-1.654l.954-2.318-1.768-1.768-2.318.954c-.518-.287-1.073-.515-1.654-.682l-.966-2.318h-2.5l-.966,2.318c-.581.167-1.135.395-1.654.682l-2.318-.954-1.768,1.768.954,2.318c-.287.518-.515,1.073-.682,1.654l-2.318.966v2.5l2.318.966c.167.581.395,1.135.682,1.654l-.954,2.318,1.768,1.768,2.318-.954c.518.287,1.073.515,1.654.682l.966,2.318h2.5l.966-2.318c.581-.167,1.135-.395,1.654-.682l2.318.954,1.768-1.768-.954-2.318c.287-.518.515-1.073.682-1.654l2.318-.966Z"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></path>
                    </g>
                  </svg>
                  <Dock.Label>Settings</Dock.Label>
                </Dock.Item>
              </Dock>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Dock className="relative bg-neutral text-neutral-content">
  <Dock.Item><svg className="size-[1.2em]" /><Dock.Label>Home</Dock.Label></Dock.Item>
  <Dock.Item active><svg className="size-[1.2em]" /><Dock.Label>Inbox</Dock.Label></Dock.Item>
  <Dock.Item><svg className="size-[1.2em]" /><Dock.Label>Settings</Dock.Label></Dock.Item>
</Dock>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Dock 自动渲染（items 数组）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabAuto.value}
            onChange={k => (tabAuto.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabAuto.value === 'preview' ? (
            <div className="bg-base-300 rounded-box w-full max-w-sm pt-32">
              <Dock
                className="relative border border-base-300"
                items={[
                  {
                    icon: (
                      <svg
                        className="size-[1.2em]"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                          <polyline
                            points="1 11 12 2 23 11"
                            fill="none"
                            stroke="currentColor"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></polyline>
                          <path
                            d="m5,13v7c0,1.105.895,2,2,2h10c1.105,0,2-.895,2-2v-7"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></path>
                          <line
                            x1="12"
                            y1="22"
                            x2="12"
                            y2="18"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></line>
                        </g>
                      </svg>
                    ),
                    label: 'Home',
                  },
                  {
                    icon: (
                      <svg
                        className="size-[1.2em]"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                          <polyline
                            points="3 14 9 14 9 17 15 17 15 14 21 14"
                            fill="none"
                            stroke="currentColor"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></polyline>
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></rect>
                        </g>
                      </svg>
                    ),
                    label: 'Inbox',
                  },
                  {
                    icon: (
                      <svg
                        className="size-[1.2em]"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <g fill="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                          <circle
                            cx="12"
                            cy="12"
                            r="3"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></circle>
                          <path
                            d="m22,13.25v-2.5l-2.318-.966c-.167-.581-.395-1.135-.682-1.654l.954-2.318-1.768-1.768-2.318.954c-.518-.287-1.073-.515-1.654-.682l-.966-2.318h-2.5l-.966,2.318c-.581.167-1.135.395-1.654.682l-2.318-.954-1.768,1.768.954,2.318c-.287.518-.515,1.073-.682,1.654l-2.318.966v2.5l2.318.966c.167.581.395,1.135.682,1.654l-.954,2.318,1.768,1.768,2.318-.954c.518.287,1.073.515,1.654.682l.966,2.318h2.5l.966-2.318c.581-.167,1.135-.395,1.654-.682l2.318.954,1.768-1.768-.954-2.318c.287-.518.515-1.073.682-1.654l2.318-.966Z"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="square"
                            strokeMiterlimit="10"
                            strokeWidth="2"
                          ></path>
                        </g>
                      </svg>
                    ),
                    label: 'Settings',
                  },
                ]}
                activeIndex={activeAuto.value}
                onChange={i => (activeAuto.value = i)}
              />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { ref } from '@rue-js/rue';
import { Dock } from '@rue-js/design';
const activeAuto = ref(1);
<Dock
  className="relative border border-base-300"
  items={[
    { icon: (<svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>), label: 'Home' },
    { icon: (<svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>), label: 'Inbox' },
    { icon: (<svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>), label: 'Settings' },
  ]}
  activeIndex={activeAuto.value}
  onChange={(i) => (activeAuto.value = i)}
/>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default DockDemo
