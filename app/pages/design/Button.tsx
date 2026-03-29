import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Button, Tabs } from '@rue-js/design'

const ButtonDemo: FC = () => {
  const tabButton = ref<'preview' | 'code'>('preview')
  const tabSizes = ref<'preview' | 'code'>('preview')
  const tabColors = ref<'preview' | 'code'>('preview')
  const tabSoft = ref<'preview' | 'code'>('preview')
  const tabOutline = ref<'preview' | 'code'>('preview')
  const tabDash = ref<'preview' | 'code'>('preview')
  const tabNeutralStyle = ref<'preview' | 'code'>('preview')
  const tabActive = ref<'preview' | 'code'>('preview')
  const tabGhostLink = ref<'preview' | 'code'>('preview')
  const tabWide = ref<'preview' | 'code'>('preview')
  const tabResponsive = ref<'preview' | 'code'>('preview')
  const tabAnyTags = ref<'preview' | 'code'>('preview')
  const tabDisabled = ref<'preview' | 'code'>('preview')
  const tabSquareCircle = ref<'preview' | 'code'>('preview')
  const tabWithIcon = ref<'preview' | 'code'>('preview')
  const tabBlock = ref<'preview' | 'code'>('preview')
  const tabLoading = ref<'preview' | 'code'>('preview')
  const tabLogin = ref<'preview' | 'code'>('preview')
  const tabEvents = ref<'preview' | 'code'>('preview')
  const clickCount = ref<number>(0)

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Button 按钮</h1>
        <p className="text-sm mt-3 mb-3">按钮（Button）允许用户执行操作或做出选择。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/button/" target="_blank">
            查看 Button 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Button</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabButton.value}
            onChange={k => (tabButton.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabButton.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button>Default</Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Button } from '@rue-js/design';
export default () => <Button>Default</Button>;`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Button sizes
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSizes.value}
            onChange={k => (tabSizes.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSizes.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button size="xs">Xsmall</Button>
                <Button size="sm">Small</Button>
                <Button>Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Xlarge</Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Button } from '@rue-js/design';
export default () => (
  <>
    <Button size="xs">Xsmall</Button>
    <Button size="sm">Small</Button>
    <Button>Medium</Button>
    <Button size="lg">Large</Button>
    <Button size="xl">Xlarge</Button>
  </>
);`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Responsive button
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
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Button size="xs" className="sm:btn-sm md:btn-md lg:btn-lg xl:btn-xl">
                  Responsive
                </Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button size="xs" className="sm:btn-sm md:btn-md lg:btn-lg xl:btn-xl">Responsive</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Button events
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabEvents.value}
            onChange={k => (tabEvents.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabEvents.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap items-center gap-3">
                <div>count: {clickCount.value}</div>
                <Button onClick={() => (clickCount.value = clickCount.value + 1)}>Click Me</Button>
                <Button loading onClick={() => (clickCount.value = clickCount.value + 1)}>
                  <span className="loading loading-spinner"></span>
                  Loading (disabled)
                </Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const count = ref(0)
<div>count: {count.value}</div>
<Button onClick={() => (count.value = count.value + 1)}>Click Me</Button>
<Button loading onClick={() => (count.value = count.value + 1)}>
  <span className="loading loading-spinner"></span>
  Loading (disabled)
</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Buttons colors
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
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button variant="neutral">Neutral</Button>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="accent">Accent</Button>
                <Button variant="info">Info</Button>
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="error">Error</Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button variant="neutral">Neutral</Button>
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="accent">Accent</Button>
<Button variant="info">Info</Button>
<Button variant="success">Success</Button>
<Button variant="warning">Warning</Button>
<Button variant="error">Error</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Soft buttons
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSoft.value}
            onChange={k => (tabSoft.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSoft.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button soft>Default</Button>
                <Button soft variant="primary">
                  Primary
                </Button>
                <Button soft variant="secondary">
                  Secondary
                </Button>
                <Button soft variant="accent">
                  Accent
                </Button>
                <Button soft variant="info">
                  Info
                </Button>
                <Button soft variant="success">
                  Success
                </Button>
                <Button soft variant="warning">
                  Warning
                </Button>
                <Button soft variant="error">
                  Error
                </Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button soft>Default</Button>
<Button soft variant="primary">Primary</Button>
<Button soft variant="secondary">Secondary</Button>
<Button soft variant="accent">Accent</Button>
<Button soft variant="info">Info</Button>
<Button soft variant="success">Success</Button>
<Button soft variant="warning">Warning</Button>
<Button soft variant="error">Error</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Outline buttons
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabOutline.value}
            onChange={k => (tabOutline.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabOutline.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button outline>Default</Button>
                <Button outline variant="primary">
                  Primary
                </Button>
                <Button outline variant="secondary">
                  Secondary
                </Button>
                <Button outline variant="accent">
                  Accent
                </Button>
                <Button outline variant="info">
                  Info
                </Button>
                <Button outline variant="success">
                  Success
                </Button>
                <Button outline variant="warning">
                  Warning
                </Button>
                <Button outline variant="error">
                  Error
                </Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button outline>Default</Button>
<Button outline variant="primary">Primary</Button>
<Button outline variant="secondary">Secondary</Button>
<Button outline variant="accent">Accent</Button>
<Button outline variant="info">Info</Button>
<Button outline variant="success">Success</Button>
<Button outline variant="warning">Warning</Button>
<Button outline variant="error">Error</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Dash buttons
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabDash.value}
            onChange={k => (tabDash.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabDash.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button dash>Default</Button>
                <Button dash variant="primary">
                  Primary
                </Button>
                <Button dash variant="secondary">
                  Secondary
                </Button>
                <Button dash variant="accent">
                  Accent
                </Button>
                <Button dash variant="info">
                  Info
                </Button>
                <Button dash variant="success">
                  Success
                </Button>
                <Button dash variant="warning">
                  Warning
                </Button>
                <Button dash variant="error">
                  Error
                </Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button dash>Default</Button>
<Button dash variant="primary">Primary</Button>
<Button dash variant="secondary">Secondary</Button>
<Button dash variant="accent">Accent</Button>
<Button dash variant="info">Info</Button>
<Button dash variant="success">Success</Button>
<Button dash variant="warning">Warning</Button>
<Button dash variant="error">Error</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # neutral button with outline or dash style
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabNeutralStyle.value}
            onChange={k => (tabNeutralStyle.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabNeutralStyle.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex gap-2 justify-center">
                <Button variant="neutral" outline>
                  Outline
                </Button>
                <Button variant="neutral" dash>
                  Dash
                </Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button variant="neutral" outline>Outline</Button>
<Button variant="neutral" dash>Dash</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Active buttons
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabActive.value}
            onChange={k => (tabActive.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabActive.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button active>Default</Button>
                <Button active variant="primary">
                  Primary
                </Button>
                <Button active variant="secondary">
                  Secondary
                </Button>
                <Button active variant="accent">
                  Accent
                </Button>
                <Button active variant="info">
                  Info
                </Button>
                <Button active variant="success">
                  Success
                </Button>
                <Button active variant="warning">
                  Warning
                </Button>
                <Button active variant="error">
                  Error
                </Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button active>Default</Button>
<Button active variant="primary">Primary</Button>
<Button active variant="secondary">Secondary</Button>
<Button active variant="accent">Accent</Button>
<Button active variant="info">Info</Button>
<Button active variant="success">Success</Button>
<Button active variant="warning">Warning</Button>
<Button active variant="error">Error</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Buttons ghost and button link
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabGhostLink.value}
            onChange={k => (tabGhostLink.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabGhostLink.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button ghost>Ghost</Button>
                <Button link>Link</Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button ghost>Ghost</Button>
<Button link>Link</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Wide button</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabWide.value}
            onChange={k => (tabWide.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabWide.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Button wide>Wide</Button>
              </div>
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Button wide>Wide</Button>`} />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Buttons with any HTML tags
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'HTML代码' },
            ]}
            activeKey={tabAnyTags.value}
            onChange={k => (tabAnyTags.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabAnyTags.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body grid gap-2">
                <a role="button" className="btn">
                  Link
                </a>
                <button type="submit" className="btn">
                  Button
                </button>
                <input type="button" value="Input" className="btn" />
                <input type="submit" value="Submit" className="btn" />
                <input type="radio" aria-label="Radio" className="btn" />
                <input type="checkbox" aria-label="Checkbox" className="btn" />
                <input type="reset" value="Reset" className="btn" />
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="html"
              code={`<a role="button" class="btn">Link</a>
<button type="submit" class="btn">Button</button>
<input type="button" value="Input" class="btn" />
<input type="submit" value="Submit" class="btn" />
<input type="radio" aria-label="Radio" class="btn" />
<input type="checkbox" aria-label="Checkbox" class="btn" />
<input type="reset" value="Reset" class="btn" />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Disabled buttons
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabDisabled.value}
            onChange={k => (tabDisabled.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabDisabled.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button disabled>Disabled using attribute</Button>
                <Button disabledClass>Disabled using class name</Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button disabled>Disabled using attribute</Button>
<Button disabledClass>Disabled using class name</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Square button and circle button
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSquareCircle.value}
            onChange={k => (tabSquareCircle.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSquareCircle.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button square>■</Button>
                <Button circle>●</Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button square>■</Button>
<Button circle>●</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Button with Icon
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabWithIcon.value}
            onChange={k => (tabWithIcon.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabWithIcon.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="size-[1.2em]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                    />
                  </svg>
                  Like
                </Button>
                <Button>
                  Like
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="size-[1.2em]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-[1.2em]" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
  Like
</Button>
<Button>
  Like
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-[1.2em]" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Button block
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBlock.value}
            onChange={k => (tabBlock.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBlock.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Button block>block</Button>
              </div>
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Button block>block</Button>`} />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Button with loading spinner
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLoading.value}
            onChange={k => (tabLoading.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLoading.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Button square>
                  <span className="loading loading-spinner"></span>
                </Button>
                <Button>
                  <span className="loading loading-spinner"></span>
                  loading
                </Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button square>
  <span className="loading loading-spinner"></span>
</Button>
<Button>
  <span className="loading loading-spinner"></span>
  loading
</Button>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Login buttons
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLogin.value}
            onChange={k => (tabLogin.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLogin.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body grid gap-3">
                <Button className="bg-white text-black border-[#e5e5e5]">
                  <svg
                    aria-label="Email icon"
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g
                      stroke-linejoin="round"
                      stroke-linecap="round"
                      stroke-width="2"
                      fill="none"
                      stroke="black"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </g>
                  </svg>
                  Login with Email
                </Button>
                <Button className="bg-black text-white border-[#e5e5e5]">
                  <svg
                    aria-label="GitHub logo"
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="white"
                      d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"
                    ></path>
                  </svg>
                  Login with GitHub
                </Button>
                <Button className="bg-white text-black border-[#e5e5e5]">
                  <svg
                    aria-label="Google logo"
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                  >
                    <g>
                      <path d="m0 0H512V512H0" fill="#fff"></path>
                      <path
                        fill="#34a853"
                        d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"
                      ></path>
                      <path
                        fill="#4285f4"
                        d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"
                      ></path>
                      <path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path>
                      <path
                        fill="#ea4335"
                        d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"
                      ></path>
                    </g>
                  </svg>
                  Login with Google
                </Button>
                <Button className="bg-[#1A77F2] text-white border-[#005fd8]">
                  <svg
                    aria-label="Facebook logo"
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 32 32"
                  >
                    <path
                      fill="white"
                      d="M8 12h5V8c0-6 4-7 11-6v5c-4 0-5 0-5 3v2h5l-1 6h-4v12h-6V18H8z"
                    ></path>
                  </svg>
                  Login with Facebook
                </Button>
                <Button className="bg-black text-white border-[#e5e5e5]">
                  <svg
                    aria-label="Apple logo"
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 1195 1195"
                  >
                    <path
                      fill="white"
                      d="M1006.933 812.8c-32 153.6-115.2 211.2-147.2 249.6-32 25.6-121.6 25.6-153.6 6.4-38.4-25.6-134.4-25.6-166.4 0-44.8 32-115.2 19.2-128 12.8-256-179.2-352-716.8 12.8-774.4 64-12.8 134.4 32 134.4 32 51.2 25.6 70.4 12.8 115.2-6.4 96-44.8 243.2-44.8 313.6 76.8-147.2 96-153.6 294.4 19.2 403.2zM802.133 64c12.8 70.4-64 224-204.8 230.4-12.8-38.4 32-217.6 204.8-230.4z"
                    ></path>
                  </svg>
                  Login with Apple
                </Button>
                <Button className="bg-[#FF9900] text-black border-[#e17d00]">
                  <svg
                    aria-label="Amazon logo"
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                  >
                    <g fill="black">
                      <path d="M14.463 13.831c-1.753 1.294-4.291 1.981-6.478 1.981-3.066 0-5.825-1.131-7.912-3.019-.163-.147-.019-.35.178-.234 2.253 1.313 5.041 2.1 7.919 2.1 1.941 0 4.075-.403 6.041-1.238.294-.125.544.197.253.409z"></path>
                      <path d="M15.191 13c-.225-.287-1.481-.137-2.047-.069-.172.019-.197-.128-.044-.238 1.003-.703 2.647-.5 2.838-.266.194.238-.05 1.884-.991 2.672-.144.122-.281.056-.219-.103.216-.528.688-1.709.463-1.997zM11.053 11.838l.003.003c.387-.341 1.084-.95 1.478-1.278.156-.125.128-.334.006-.509-.353-.488-.728-.884-.728-1.784v-3c0-1.272.088-2.438-.847-3.313-.738-.706-1.963-.956-2.9-.956-1.831 0-3.875.684-4.303 2.947-.047.241.131.369.287.403l1.866.203c.175-.009.3-.181.334-.356.159-.778.813-1.156 1.547-1.156.397 0 .847.144 1.081.5.269.397.234.938.234 1.397v.25c-1.116.125-2.575.206-3.619.666-1.206.522-2.053 1.584-2.053 3.147 0 2 1.259 3 2.881 3 1.369 0 2.116-.322 3.172-1.403.35.506.463.753 1.103 1.284a.395.395 0 0 0 .456-.044zm-1.94-4.694c0 .75.019 1.375-.359 2.041-.306.544-.791.875-1.331.875-.737 0-1.169-.563-1.169-1.394 0-1.641 1.472-1.938 2.863-1.938v.416z"></path>
                    </g>
                  </svg>
                  Login with Amazon
                </Button>
                <Button className="bg-[#2F2F2F] text-white border-[#e5e5e5]">
                  <svg
                    aria-label="Microsoft logo"
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                  >
                    <path d="M96 96H247V247H96" fill="#f24f23"></path>
                    <path d="M265 96V247H416V96" fill="#7eba03"></path>
                    <path d="M96 265H247V416H96" fill="#3ca4ef"></path>
                    <path d="M265 265H416V416H265" fill="#f9ba00"></path>
                  </svg>
                  Login with Microsoft
                </Button>
                <Button className="bg-[#03C755] text-white border-[#00b544]">
                  <svg
                    aria-label="Line logo"
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                  >
                    <g fill-rule="evenodd" stroke-linejoin="round" fill="white">
                      <path
                        fill-rule="nonzero"
                        d="M12.91 6.57c.232 0 .42.19.42.42 0 .23-.188.42-.42.42h-1.17v.75h1.17a.42.42 0 1 1 0 .84h-1.59a.42.42 0 0 1-.418-.42V5.4c0-.23.188-.42.42-.42h1.59a.42.42 0 0 1-.002.84h-1.17v.75h1.17zm-2.57 2.01a.421.421 0 0 1-.757.251l-1.63-2.217V8.58a.42.42 0 0 1-.42.42.42.42 0 0 1-.418-.42V5.4a.418.418 0 0 1 .755-.249L9.5 7.366V5.4c0-.23.188-.42.42-.42.23 0 .42.19.42.42v3.18zm-3.828 0c0 .23-.188.42-.42.42a.42.42 0 0 1-.418-.42V5.4c0-.23.188-.42.42-.42.23 0 .418.19.418.42v3.18zM4.868 9h-1.59c-.23 0-.42-.19-.42-.42V5.4c0-.23.19-.42.42-.42.232 0 .42.19.42.42v2.76h1.17a.42.42 0 1 1 0 .84M16 6.87C16 3.29 12.41.376 8 .376S0 3.29 0 6.87c0 3.208 2.846 5.896 6.69 6.405.26.056.615.172.705.394.08.2.053.518.026.722 0 0-.092.565-.113.685-.035.203-.16.79.693.432.854-.36 4.607-2.714 6.285-4.646C15.445 9.594 16 8.302 16 6.87"
                      ></path>
                    </g>
                  </svg>
                  Login with LINE
                </Button>
                <Button className="bg-[#0967C2] text-white border-[#0059b3]">
                  <svg
                    aria-label="LinkedIn logo"
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 32 32"
                  >
                    <path
                      fill="white"
                      d="M26.111,3H5.889c-1.595,0-2.889,1.293-2.889,2.889V26.111c0,1.595,1.293,2.889,2.889,2.889H26.111c1.595,0,2.889-1.293,2.889-2.889V5.889c0-1.595-1.293-2.889-2.889-2.889ZM10.861,25.389h-3.877V12.87h3.877v12.519Zm-1.957-14.158c-1.267,0-2.293-1.034-2.293-2.31s1.026-2.31,2.293-2.31,2.292,1.034,2.292,2.31-1.026,2.31-2.292,2.31Zm16.485,14.158h-3.858v-6.571c0-1.802-.685-2.809-2.111-2.809-1.551,0-2.362,1.048-2.362,2.809v6.571h-3.718V12.87h3.718v1.686s1.118-2.069,3.775-2.069,4.556,1.621,4.556,4.975v7.926Z"
                      fill-rule="evenodd"
                    ></path>
                  </svg>
                  Login with LinkedIn
                </Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button className="bg-white text-black border-[#e5e5e5]">
  <svg aria-label="Email icon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="black"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></g></svg>
  Login with Email
</Button>
<Button className="bg-black text-white border-[#e5e5e5]">
  <svg aria-label="GitHub logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"></path></svg>
  Login with GitHub
</Button>
<Button className="bg-white text-black border-[#e5e5e5]">
  <svg aria-label="Google logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g><path d="m0 0H512V512H0" fill="#fff"></path><path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path><path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path><path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path><path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path></g></svg>
  Login with Google
</Button>
<Button className="bg-[#1A77F2] text-white border-[#005fd8]">
  <svg aria-label="Facebook logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="white" d="M8 12h5V8c0-6 4-7 11-6v5c-4 0-5 0-5 3v2h5l-1 6h-4v12h-6V18H8z"></path></svg>
  Login with Facebook
</Button>
<Button className="bg-black text-white border-[#e5e5e5]">
  <svg aria-label="Apple logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1195 1195"><path fill="white" d="M1006.933 812.8c-32 153.6-115.2 211.2-147.2 249.6-32 25.6-121.6 25.6-153.6 6.4-38.4-25.6-134.4-25.6-166.4 0-44.8 32-115.2 19.2-128 12.8-256-179.2-352-716.8 12.8-774.4 64-12.8 134.4 32 134.4 32 51.2 25.6 70.4 12.8 115.2-6.4 96-44.8 243.2-44.8 313.6 76.8-147.2 96-153.6 294.4 19.2 403.2zM802.133 64c12.8 70.4-64 224-204.8 230.4-12.8-38.4 32-217.6 204.8-230.4z"></path></svg>
  Login with Apple
</Button>
<Button className="bg-[#FF9900] text-black border-[#e17d00]">
  <svg aria-label="Amazon logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="black"><path d="M14.463 13.831c-1.753 1.294-4.291 1.981-6.478 1.981-3.066 0-5.825-1.131-7.912-3.019-.163-.147-.019-.35.178-.234 2.253 1.313 5.041 2.1 7.919 2.1 1.941 0 4.075-.403 6.041-1.238.294-.125.544.197.253.409z"></path><path d="M15.191 13c-.225-.287-1.481-.137-2.047-.069-.172.019-.197-.128-.044-.238 1.003-.703 2.647-.5 2.838-.266.194.238-.05 1.884-.991 2.672-.144.122-.281.056-.219-.103.216-.528.688-1.709.463-1.997zM11.053 11.838l.003.003c.387-.341 1.084-.95 1.478-1.278.156-.125.128-.334.006-.509-.353-.488-.728-.884-.728-1.784v-3c0-1.272.088-2.438-.847-3.313-.738-.706-1.963-.956-2.9-.956-1.831 0-3.875.684-4.303 2.947-.047.241.131.369.287.403l1.866.203c.175-.009.3-.181.334-.356.159-.778.813-1.156 1.547-1.156.397 0 .847.144 1.081.5.269.397.234.938.234 1.397v.25c-1.116.125-2.575.206-3.619.666-1.206.522-2.053 1.584-2.053 3.147 0 2 1.259 3 2.881 3 1.369 0 2.116-.322 3.172-1.403.35.506.463.753 1.103 1.284a.395.395 0 0 0 .456-.044zm-1.94-4.694c0 .75.019 1.375-.359 2.041-.306.544-.791.875-1.331.875-.737 0-1.169-.563-1.169-1.394 0-1.641 1.472-1.938 2.863-1.938v.416z"></path></g></svg>
  Login with Amazon
</Button>
<Button className="bg-[#2F2F2F] text-white border-[#e5e5e5]">
  <svg aria-label="Microsoft logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M96 96H247V247H96" fill="#f24f23"></path><path d="M265 96V247H416V96" fill="#7eba03"></path><path d="M96 265H247V416H96" fill="#3ca4ef"></path><path d="M265 265H416V416H265" fill="#f9ba00"></path></svg>
  Login with Microsoft
</Button>
<Button className="bg-[#03C755] text-white border-[#00b544]">
  <svg aria-label="Line logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill-rule="evenodd" stroke-linejoin="round" fill="white"><path fill-rule="nonzero" d="M12.91 6.57c.232 0 .42.19.42.42 0 .23-.188.42-.42.42h-1.17v.75h1.17a.42.42 0 1 1 0 .84h-1.59a.42.42 0 0 1-.418-.42V5.4c0-.23.188-.42.42-.42h1.59a.42.42 0 0 1-.002.84h-1.17v.75h1.17zm-2.57 2.01a.421.421 0 0 1-.757.251l-1.63-2.217V8.58a.42.42 0 0 1-.42.42.42.42 0 0 1-.418-.42V5.4a.418.418 0 0 1 .755-.249L9.5 7.366V5.4c0-.23.188-.42.42-.42.23 0 .42.19.42.42v3.18zm-3.828 0c0 .23-.188.42-.42.42a.42.42 0 0 1-.418-.42V5.4c0-.23.188-.42.42-.42.23 0 .418.19.418.42v3.18zM4.868 9h-1.59c-.23 0-.42-.19-.42-.42V5.4c0-.23.19-.42.42-.42.232 0 .42.19.42.42v2.76h1.17a.42.42 0 1 1 0 .84M16 6.87C16 3.29 12.41.376 8 .376S0 3.29 0 6.87c0 3.208 2.846 5.896 6.69 6.405.26.056.615.172.705.394.08.2.053.518.026.722 0 0-.092.565-.113.685-.035.203-.16.79.693.432.854-.36 4.607-2.714 6.285-4.646C15.445 9.594 16 8.302 16 6.87"></path></g></svg>
  Login with LINE
</Button>
<Button className="bg-[#0967C2] text-white border-[#0059b3]">
  <svg aria-label="LinkedIn logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="white" d="M26.111,3H5.889c-1.595,0-2.889,1.293-2.889,2.889V26.111c0,1.595,1.293,2.889,2.889,2.889H26.111c1.595,0,2.889-1.293,2.889-2.889V5.889c0-1.595-1.293-2.889-2.889-2.889ZM10.861,25.389h-3.877V12.87h3.877v12.519Zm-1.957-14.158c-1.267,0-2.293-1.034-2.293-2.31s1.026-2.31,2.293-2.31,2.292,1.034,2.292,2.31-1.026,2.31-2.292,2.31Zm16.485,14.158h-3.858v-6.571c0-1.802-.685-2.809-2.111-2.809-1.551,0-2.362,1.048-2.362,2.809v6.571h-3.718V12.87h3.718v1.686s1.118-2.069,3.775-2.069,4.556,1.621,4.556,4.975v7.926Z" fill-rule="evenodd"></path></svg>
  Login with LinkedIn
</Button>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default ButtonDemo
