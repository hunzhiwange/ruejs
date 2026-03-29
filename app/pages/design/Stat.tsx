import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Avatar, Button, Stat, Tabs } from '@rue-js/design'

const StatDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabWithIcons = ref<'preview' | 'code'>('preview')
  const tabGroup = ref<'preview' | 'code'>('preview')
  const tabCentered = ref<'preview' | 'code'>('preview')
  const tabVertical = ref<'preview' | 'code'>('preview')
  const tabResponsive = ref<'preview' | 'code'>('preview')
  const tabCustomColors = ref<'preview' | 'code'>('preview')
  const tabArray = ref<'preview' | 'code'>('preview')

  const statItems = [
    {
      figure: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="inline-block w-8 h-8 stroke-current"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
      ),
      figureClassName: 'text-secondary',
      title: 'Downloads',
      value: '31K',
      desc: 'Jan 1st - Feb 1st',
    },
    {
      center: true,
      title: 'Users',
      value: <span className="text-secondary">4,200</span>,
      desc: <span className="text-secondary">↗︎ 40 (2%)</span>,
    },
    {
      title: 'Account balance',
      value: '$89,400',
      actions: (
        <Button variant="success" size="xs">
          Add funds
        </Button>
      ),
    },
  ] as const

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Stat 统计</h1>
        <p className="text-sm mt-3 mb-3">Stat 用于在一个块中展示数字与数据。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/stat/" target="_blank">
            查看 Stat 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Stat</h2>
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
            <Stat className="shadow">
              <Stat.Item>
                <Stat.Title>Total Page Views</Stat.Title>
                <Stat.Value>89,400</Stat.Value>
                <Stat.Desc>21% more than last month</Stat.Desc>
              </Stat.Item>
            </Stat>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Stat className="shadow">
  <Stat.Item>
    <Stat.Title>Total Page Views</Stat.Title>
    <Stat.Value>89,400</Stat.Value>
    <Stat.Desc>21% more than last month</Stat.Desc>
  </Stat.Item>
</Stat>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Stat 通过数据渲染（数组，组件内部）
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
            <Stat items={statItems} className="shadow" />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Button, Stat } from '@rue-js/design';
const statItems = [
  {
    figure: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ),
    figureClassName: 'text-secondary',
    title: 'Downloads',
    value: '31K',
    desc: 'Jan 1st - Feb 1st',
  },
  { center: true, title: 'Users', value: <span className="text-secondary">4,200</span>, desc: <span className="text-secondary">↗︎ 40 (2%)</span> },
  { title: 'Account balance', value: '$89,400', actions: <Button variant="success" size="xs">Add funds</Button> },
];
<Stat items={statItems} className="shadow" />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Stat with icons or image
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabWithIcons.value}
            onChange={k => (tabWithIcons.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabWithIcons.value === 'preview' ? (
            <Stat className="shadow">
              <Stat.Item>
                <Stat.Figure className="text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    ></path>
                  </svg>
                </Stat.Figure>
                <Stat.Title>Total Likes</Stat.Title>
                <Stat.Value className="text-primary">25.6K</Stat.Value>
                <Stat.Desc>21% more than last month</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Figure className="text-secondary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    ></path>
                  </svg>
                </Stat.Figure>
                <Stat.Title>Page Views</Stat.Title>
                <Stat.Value className="text-secondary">2.6M</Stat.Value>
                <Stat.Desc>21% more than last month</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Figure className="text-secondary">
                  <Avatar status="online">
                    <div className="w-16 rounded-full">
                      <img
                        alt="Tailwind CSS stat example component"
                        src="https://img.daisyui.com/images/profile/demo/anakeen@192.webp"
                      />
                    </div>
                  </Avatar>
                </Stat.Figure>
                <Stat.Value>86%</Stat.Value>
                <Stat.Title>Tasks done</Stat.Title>
                <Stat.Desc className="text-secondary">31 tasks remaining</Stat.Desc>
              </Stat.Item>
            </Stat>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Stat className="shadow">
  <Stat.Item>
    <Stat.Figure className="text-primary">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
    </Stat.Figure>
    <Stat.Title>Total Likes</Stat.Title>
    <Stat.Value className="text-primary">25.6K</Stat.Value>
    <Stat.Desc>21% more than last month</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Figure className="text-secondary">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
    </Stat.Figure>
    <Stat.Title>Page Views</Stat.Title>
    <Stat.Value className="text-secondary">2.6M</Stat.Value>
    <Stat.Desc>21% more than last month</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Figure className="text-secondary">
      <Avatar status="online">
        <div className="w-16 rounded-full">
          <img src="https://img.daisyui.com/images/profile/demo/anakeen@192.webp" />
        </div>
      </Avatar>
    </Stat.Figure>
    <Stat.Value>86%</Stat.Value>
    <Stat.Title>Tasks done</Stat.Title>
    <Stat.Desc className="text-secondary">31 tasks remaining</Stat.Desc>
  </Stat.Item>
</Stat>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Stat</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabGroup.value}
            onChange={k => (tabGroup.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabGroup.value === 'preview' ? (
            <Stat className="shadow">
              <Stat.Item>
                <Stat.Figure className="text-secondary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </Stat.Figure>
                <Stat.Title>Downloads</Stat.Title>
                <Stat.Value>31K</Stat.Value>
                <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Figure className="text-secondary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    ></path>
                  </svg>
                </Stat.Figure>
                <Stat.Title>New Users</Stat.Title>
                <Stat.Value>4,200</Stat.Value>
                <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Figure className="text-secondary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="inline-block w-8 h-8 stroke-current"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    ></path>
                  </svg>
                </Stat.Figure>
                <Stat.Title>New Registers</Stat.Title>
                <Stat.Value>1,200</Stat.Value>
                <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
              </Stat.Item>
            </Stat>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Stat className="shadow">
  <Stat.Item>
    <Stat.Figure className="text-secondary"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></Stat.Figure>
    <Stat.Title>Downloads</Stat.Title>
    <Stat.Value>31K</Stat.Value>
    <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Figure className="text-secondary"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg></Stat.Figure>
    <Stat.Title>New Users</Stat.Title>
    <Stat.Value>4,200</Stat.Value>
    <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Figure className="text-secondary"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg></Stat.Figure>
    <Stat.Title>New Registers</Stat.Title>
    <Stat.Value>1,200</Stat.Value>
    <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
  </Stat.Item>
</Stat>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Centered items
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCentered.value}
            onChange={k => (tabCentered.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCentered.value === 'preview' ? (
            <Stat className="shadow">
              <Stat.Item center>
                <Stat.Title>Downloads</Stat.Title>
                <Stat.Value>31K</Stat.Value>
                <Stat.Desc>From January 1st to February 1st</Stat.Desc>
              </Stat.Item>
              <Stat.Item center>
                <Stat.Title>Users</Stat.Title>
                <Stat.Value className="text-secondary">4,200</Stat.Value>
                <Stat.Desc className="text-secondary">↗︎ 40 (2%)</Stat.Desc>
              </Stat.Item>
              <Stat.Item center>
                <Stat.Title>New Registers</Stat.Title>
                <Stat.Value>1,200</Stat.Value>
                <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
              </Stat.Item>
            </Stat>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Stat className="shadow">
  <Stat.Item center>
    <Stat.Title>Downloads</Stat.Title>
    <Stat.Value>31K</Stat.Value>
    <Stat.Desc>From January 1st to February 1st</Stat.Desc>
  </Stat.Item>
  <Stat.Item center>
    <Stat.Title>Users</Stat.Title>
    <Stat.Value className="text-secondary">4,200</Stat.Value>
    <Stat.Desc className="text-secondary">↗︎ 40 (2%)</Stat.Desc>
  </Stat.Item>
  <Stat.Item center>
    <Stat.Title>New Registers</Stat.Title>
    <Stat.Value>1,200</Stat.Value>
    <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
  </Stat.Item>
</Stat>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Vertical</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabVertical.value}
            onChange={k => (tabVertical.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabVertical.value === 'preview' ? (
            <Stat direction="vertical" className="shadow">
              <Stat.Item>
                <Stat.Title>Downloads</Stat.Title>
                <Stat.Value>31K</Stat.Value>
                <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Title>New Users</Stat.Title>
                <Stat.Value>4,200</Stat.Value>
                <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Title>New Registers</Stat.Title>
                <Stat.Value>1,200</Stat.Value>
                <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
              </Stat.Item>
            </Stat>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Stat direction="vertical" className="shadow">
  <Stat.Item>
    <Stat.Title>Downloads</Stat.Title>
    <Stat.Value>31K</Stat.Value>
    <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Title>New Users</Stat.Title>
    <Stat.Value>4,200</Stat.Value>
    <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Title>New Registers</Stat.Title>
    <Stat.Value>1,200</Stat.Value>
    <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
  </Stat.Item>
</Stat>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Responsive (vertical on small screen, horizontal on large screen)
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabResponsive.value}
            onChange={k => (tabResponsive.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabResponsive.value === 'preview' ? (
            <Stat direction="vertical" className="shadow lg:stats-horizontal">
              <Stat.Item>
                <Stat.Title>Downloads</Stat.Title>
                <Stat.Value>31K</Stat.Value>
                <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Title>New Users</Stat.Title>
                <Stat.Value>4,200</Stat.Value>
                <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Title>New Registers</Stat.Title>
                <Stat.Value>1,200</Stat.Value>
                <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
              </Stat.Item>
            </Stat>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Stat direction="vertical" className="shadow lg:stats-horizontal">
  <Stat.Item>
    <Stat.Title>Downloads</Stat.Title>
    <Stat.Value>31K</Stat.Value>
    <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Title>New Users</Stat.Title>
    <Stat.Value>4,200</Stat.Value>
    <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Title>New Registers</Stat.Title>
    <Stat.Value>1,200</Stat.Value>
    <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
  </Stat.Item>
</Stat>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # With custom colors and button
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCustomColors.value}
            onChange={k => (tabCustomColors.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCustomColors.value === 'preview' ? (
            <Stat className="bg-base-100 border border-base-300">
              <Stat.Item>
                <Stat.Title>Account balance</Stat.Title>
                <Stat.Value>$89,400</Stat.Value>
                <Stat.Actions>
                  <Button variant="success" size="xs">
                    Add funds
                  </Button>
                </Stat.Actions>
              </Stat.Item>
              <Stat.Item>
                <Stat.Title>Current balance</Stat.Title>
                <Stat.Value>$89,400</Stat.Value>
                <Stat.Actions>
                  <Button size="xs">Withdrawal</Button>
                  <Button size="xs">Deposit</Button>
                </Stat.Actions>
              </Stat.Item>
            </Stat>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Stat className="bg-base-100 border border-base-300">
  <Stat.Item>
    <Stat.Title>Account balance</Stat.Title>
    <Stat.Value>$89,400</Stat.Value>
    <Stat.Actions>
      <Button variant="success" size="xs">Add funds</Button>
    </Stat.Actions>
  </Stat.Item>
  <Stat.Item>
    <Stat.Title>Current balance</Stat.Title>
    <Stat.Value>$89,400</Stat.Value>
    <Stat.Actions>
      <Button size="xs">Withdrawal</Button>
      <Button size="xs">Deposit</Button>
    </Stat.Actions>
  </Stat.Item>
</Stat>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default StatDemo
