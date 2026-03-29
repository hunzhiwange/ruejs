import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Divider, Tabs } from '@rue-js/design'

const DividerDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabHorizontal = ref<'preview' | 'code'>('preview')
  const tabNoText = ref<'preview' | 'code'>('preview')
  const tabResponsive = ref<'preview' | 'code'>('preview')
  const tabColors = ref<'preview' | 'code'>('preview')
  const tabPositionsV = ref<'preview' | 'code'>('preview')
  const tabPositionsH = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Divider 分隔线</h1>
        <p className="text-sm mt-3 mb-3">分隔线（Divider）用于在垂直或水平布局中分隔内容。</p>

        <div className="text-sm">
          <a href="https://daisyui.com/components/divider/" target="_blank">
            查看 Divider 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Divider</h2>
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
            <div className="flex w-full flex-col">
              <div className="grid h-20 card bg-base-300 rounded-box place-items-center">
                content
              </div>
              <Divider>OR</Divider>
              <div className="grid h-20 card bg-base-300 rounded-box place-items-center">
                content
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Divider } from '@rue-js/design';
<div className="flex w-full flex-col">
  <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
  <Divider>OR</Divider>
  <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Divider horizontal
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabHorizontal.value}
            onChange={k => (tabHorizontal.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabHorizontal.value === 'preview' ? (
            <div className="flex w-full">
              <div className="grid h-20 grow card bg-base-300 rounded-box place-items-center">
                content
              </div>
              <Divider direction="horizontal">OR</Divider>
              <div className="grid h-20 grow card bg-base-300 rounded-box place-items-center">
                content
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="flex w-full">
  <div className="card bg-base-300 rounded-box grid h-20 grow place-items-center">content</div>
  <Divider direction="horizontal">OR</Divider>
  <div className="card bg-base-300 rounded-box grid h-20 grow place-items-center">content</div>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Divider with no text
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabNoText.value}
            onChange={k => (tabNoText.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabNoText.value === 'preview' ? (
            <div className="flex w-full flex-col">
              <div className="grid h-20 card bg-base-300 rounded-box place-items-center">
                content
              </div>
              <Divider />
              <div className="grid h-20 card bg-base-300 rounded-box place-items-center">
                content
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="flex w-full flex-col">
  <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
  <Divider />
  <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # responsive (lg:divider-horizontal)
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
            <div className="flex w-full flex-col lg:flex-row">
              <div className="grid grow h-32 card bg-base-300 rounded-box place-items-center">
                content
              </div>
              <Divider className="lg:divider-horizontal">OR</Divider>
              <div className="grid grow h-32 card bg-base-300 rounded-box place-items-center">
                content
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="flex w-full flex-col lg:flex-row">
  <div className="card bg-base-300 rounded-box grid h-32 grow place-items-center">content</div>
  <Divider className="lg:divider-horizontal">OR</Divider>
  <div className="card bg-base-300 rounded-box grid h-32 grow place-items-center">content</div>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Divider with colors
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabColors.value}
            onChange={k => (tabColors.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabColors.value === 'preview' ? (
            <div className="flex w-full flex-col">
              <Divider>Default</Divider>
              <Divider variant="neutral">Neutral</Divider>
              <Divider variant="primary">Primary</Divider>
              <Divider variant="secondary">Secondary</Divider>
              <Divider variant="accent">Accent</Divider>
              <Divider variant="success">Success</Divider>
              <Divider variant="warning">Warning</Divider>
              <Divider variant="info">Info</Divider>
              <Divider variant="error">Error</Divider>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="flex w-full flex-col">
  <Divider>Default</Divider>
  <Divider variant="neutral">Neutral</Divider>
  <Divider variant="primary">Primary</Divider>
  <Divider variant="secondary">Secondary</Divider>
  <Divider variant="accent">Accent</Divider>
  <Divider variant="success">Success</Divider>
  <Divider variant="warning">Warning</Divider>
  <Divider variant="info">Info</Divider>
  <Divider variant="error">Error</Divider>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Divider in different positions
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPositionsV.value}
            onChange={k => (tabPositionsV.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPositionsV.value === 'preview' ? (
            <div className="flex w-full flex-col">
              <Divider placement="start">Start</Divider>
              <Divider>Default</Divider>
              <Divider placement="end">End</Divider>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="flex w-full flex-col">
  <Divider placement="start">Start</Divider>
  <Divider>Default</Divider>
  <Divider placement="end">End</Divider>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Divider in different positions (horizontal)
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPositionsH.value}
            onChange={k => (tabPositionsH.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPositionsH.value === 'preview' ? (
            <div className="flex w-full justify-center h-52">
              <Divider direction="horizontal" placement="start">
                Start
              </Divider>
              <Divider direction="horizontal">Default</Divider>
              <Divider direction="horizontal" placement="end">
                End
              </Divider>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="flex w-full justify-center h-52">
  <Divider direction="horizontal" placement="start">Start</Divider>
  <Divider direction="horizontal">Default</Divider>
  <Divider direction="horizontal" placement="end">End</Divider>
</div>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default DividerDemo
