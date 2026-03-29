import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Badge, Button, Tabs } from '@rue-js/design'

const BadgeDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabSizes = ref<'preview' | 'code'>('preview')
  const tabColors = ref<'preview' | 'code'>('preview')
  const tabSoft = ref<'preview' | 'code'>('preview')
  const tabOutline = ref<'preview' | 'code'>('preview')
  const tabDash = ref<'preview' | 'code'>('preview')
  const tabNeutral = ref<'preview' | 'code'>('preview')
  const tabGhost = ref<'preview' | 'code'>('preview')
  const tabEmpty = ref<'preview' | 'code'>('preview')
  const tabIcon = ref<'preview' | 'code'>('preview')
  const tabInText = ref<'preview' | 'code'>('preview')
  const tabInButton = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Badge 徽标</h1>
        <p className="text-sm mt-3 mb-3">徽标用于告知用户特定数据的状态。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/badge/" target="_blank">
            查看 Badge 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Badge</h2>
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
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Badge>Badge</Badge>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Badge } from '@rue-js/design';
<Badge>Badge</Badge>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Badge sizes</h2>
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
                <Badge size="xs">Xsmall</Badge>
                <Badge size="sm">Small</Badge>
                <Badge size="md">Medium</Badge>
                <Badge size="lg">Large</Badge>
                <Badge size="xl">Xlarge</Badge>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Badge size="xs">Xsmall</Badge>
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>
<Badge size="xl">Xlarge</Badge>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Badge with colors
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
                <Badge variant="primary">Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="accent">Accent</Badge>
                <Badge variant="neutral">Neutral</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Badge variant="primary">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="accent">Accent</Badge>
<Badge variant="neutral">Neutral</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Badge with soft style
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
                <Badge soft variant="primary">
                  Primary
                </Badge>
                <Badge soft variant="secondary">
                  Secondary
                </Badge>
                <Badge soft variant="accent">
                  Accent
                </Badge>
                <Badge soft variant="info">
                  Info
                </Badge>
                <Badge soft variant="success">
                  Success
                </Badge>
                <Badge soft variant="warning">
                  Warning
                </Badge>
                <Badge soft variant="error">
                  Error
                </Badge>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Badge soft variant="primary">Primary</Badge>
<Badge soft variant="secondary">Secondary</Badge>
<Badge soft variant="accent">Accent</Badge>
<Badge soft variant="info">Info</Badge>
<Badge soft variant="success">Success</Badge>
<Badge soft variant="warning">Warning</Badge>
<Badge soft variant="error">Error</Badge>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Badge with outline style
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
                <Badge outline variant="primary">
                  Primary
                </Badge>
                <Badge outline variant="secondary">
                  Secondary
                </Badge>
                <Badge outline variant="accent">
                  Accent
                </Badge>
                <Badge outline variant="info">
                  Info
                </Badge>
                <Badge outline variant="success">
                  Success
                </Badge>
                <Badge outline variant="warning">
                  Warning
                </Badge>
                <Badge outline variant="error">
                  Error
                </Badge>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Badge outline variant="primary">Primary</Badge>
<Badge outline variant="secondary">Secondary</Badge>
<Badge outline variant="accent">Accent</Badge>
<Badge outline variant="info">Info</Badge>
<Badge outline variant="success">Success</Badge>
<Badge outline variant="warning">Warning</Badge>
<Badge outline variant="error">Error</Badge>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Badge with dash style
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
                <Badge dash variant="primary">
                  Primary
                </Badge>
                <Badge dash variant="secondary">
                  Secondary
                </Badge>
                <Badge dash variant="accent">
                  Accent
                </Badge>
                <Badge dash variant="info">
                  Info
                </Badge>
                <Badge dash variant="success">
                  Success
                </Badge>
                <Badge dash variant="warning">
                  Warning
                </Badge>
                <Badge dash variant="error">
                  Error
                </Badge>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Badge dash variant="primary">Primary</Badge>
<Badge dash variant="secondary">Secondary</Badge>
<Badge dash variant="accent">Accent</Badge>
<Badge dash variant="info">Info</Badge>
<Badge dash variant="success">Success</Badge>
<Badge dash variant="warning">Warning</Badge>
<Badge dash variant="error">Error</Badge>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # neutral badge with outline or dash style
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabNeutral.value}
            onChange={k => (tabNeutral.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabNeutral.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <div className="p-6 w-full lg:-my-6 rounded-box flex gap-2 justify-center">
                  <Badge variant="neutral" outline>
                    Outline
                  </Badge>
                  <Badge variant="neutral" dash>
                    Dash
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="p-6 w-full lg:-my-6 rounded-box flex gap-2 justify-center">
  <Badge variant="neutral" outline>Outline</Badge>
  <Badge variant="neutral" dash>Dash</Badge>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Badge ghost</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabGhost.value}
            onChange={k => (tabGhost.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabGhost.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Badge ghost>ghost</Badge>
              </div>
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Badge ghost>ghost</Badge>`} />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Empty badge</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabEmpty.value}
            onChange={k => (tabEmpty.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabEmpty.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-2">
                <Badge variant="primary" size="lg" />
                <Badge variant="primary" size="md" />
                <Badge variant="primary" size="sm" />
                <Badge variant="primary" size="xs" />
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Badge variant="primary" size="lg" />
<Badge variant="primary" size="md" />
<Badge variant="primary" size="sm" />
<Badge variant="primary" size="xs" />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Badge with icon
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabIcon.value}
            onChange={k => (tabIcon.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabIcon.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-wrap gap-3">
                <Badge variant="info">
                  <svg
                    className="size-[1em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinejoin="miter" strokeLinecap="butt">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></circle>
                      <path
                        d="m12,17v-5.5c0-.276-.224-.5-.5-.5h-1.5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></path>
                      <circle
                        cx="12"
                        cy="7.25"
                        r="1.25"
                        fill="currentColor"
                        strokeWidth="2"
                      ></circle>
                    </g>
                  </svg>
                  Info
                </Badge>
                <Badge variant="success">
                  <svg
                    className="size-[1em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor" strokeLinejoin="miter" strokeLinecap="butt">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></circle>
                      <polyline
                        points="7 13 10 16 17 8"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="square"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                      ></polyline>
                    </g>
                  </svg>
                  Success
                </Badge>
                <Badge variant="warning">
                  <svg
                    className="size-[1em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 18 18"
                  >
                    <g fill="currentColor">
                      <path
                        d="M7.638,3.495L2.213,12.891c-.605,1.048,.151,2.359,1.362,2.359H14.425c1.211,0,1.967-1.31,1.362-2.359L10.362,3.495c-.605-1.048-2.119-1.048-2.724,0Z"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      ></path>
                      <line
                        x1="9"
                        y1="6.5"
                        x2="9"
                        y2="10"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      ></line>
                      <path
                        d="M9,13.569c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z"
                        fill="currentColor"
                        data-stroke="none"
                        stroke="none"
                      ></path>
                    </g>
                  </svg>
                  Warning
                </Badge>
                <Badge variant="error">
                  <svg
                    className="size-[1em]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor">
                      <rect
                        x="1.972"
                        y="11"
                        width="20.056"
                        height="2"
                        transform="translate(-4.971 12) rotate(-45)"
                        fill="currentColor"
                        strokeWidth="0"
                      ></rect>
                      <path
                        d="m12,23c-6.065,0-11-4.935-11-11S5.935,1,12,1s11,4.935,11,11-4.935,11-11,11Zm0-20C7.038,3,3,7.037,3,12s4.038,9,9,9,9-4.037,9-9S16.962,3,12,3Z"
                        strokeWidth="0"
                        fill="currentColor"
                      ></path>
                    </g>
                  </svg>
                  Error
                </Badge>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Badge variant="info">
  <svg className="size-[1em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" strokeLinejoin="miter" strokeLinecap="butt"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeLinecap="square" strokeMiterlimit="10" strokeWidth="2"></circle><path d="m12,17v-5.5c0-.276-.224-.5-.5-.5h-1.5" fill="none" stroke="currentColor" strokeLinecap="square" strokeMiterlimit="10" strokeWidth="2"></path><circle cx="12" cy="7.25" r="1.25" fill="currentColor" strokeWidth="2"></circle></g></svg>
  Info
</Badge>
<Badge variant="success">
  <svg className="size-[1em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor" strokeLinejoin="miter" strokeLinecap="butt"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeLinecap="square" strokeMiterlimit="10" strokeWidth="2"></circle><polyline points="7 13 10 16 17 8" fill="none" stroke="currentColor" strokeLinecap="square" strokeMiterlimit="10" strokeWidth="2"></polyline></g></svg>
  Success
</Badge>
<Badge variant="warning">
  <svg className="size-[1em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><g fill="currentColor"><path d="M7.638,3.495L2.213,12.891c-.605,1.048,.151,2.359,1.362,2.359H14.425c1.211,0,1.967-1.31,1.362-2.359L10.362,3.495c-.605-1.048-2.119-1.048-2.724,0Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path><line x1="9" y1="6.5" x2="9" y2="10" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></line><path d="M9,13.569c-.552,0-1-.449-1-1s.448-1,1-1,1,.449,1,1-.448,1-1,1Z" fill="currentColor" data-stroke="none" stroke="none"></path></g></svg>
  Warning
</Badge>
<Badge variant="error">
  <svg className="size-[1em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="currentColor"><rect x="1.972" y="11" width="20.056" height="2" transform="translate(-4.971 12) rotate(-45)" fill="currentColor" strokeWidth="0"></rect><path d="m12,23c-6.065,0-11-4.935-11-11S5.935,1,12,1s11,4.935,11,11-4.935,11-11,11Zm0-20C7.038,3,3,7.037,3,12s4.038,9,9,9,9-4.037,9-9S16.962,3,12,3Z" strokeWidth="0" fill="currentColor"></path></g></svg>
  Error
</Badge>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Badge in a text
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabInText.value}
            onChange={k => (tabInText.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabInText.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body grid gap-2">
                <span className="text-xl font-semibold">
                  Heading 1 <Badge size="xl">Badge</Badge>
                </span>
                <span className="text-lg font-semibold">
                  Heading 2 <Badge size="lg">Badge</Badge>
                </span>
                <span className="text-base font-semibold">
                  Heading 3 <Badge size="md">Badge</Badge>
                </span>
                <span className="text-sm font-semibold">
                  Heading 4 <Badge size="sm">Badge</Badge>
                </span>
                <span className="text-xs font-semibold">
                  Heading 5 <Badge size="xs">Badge</Badge>
                </span>
                <p className="text-xs">
                  Paragraph <Badge size="xs">Badge</Badge>
                </p>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<span className="text-xl font-semibold">
  Heading 1 <Badge size="xl">Badge</Badge>
</span>
<span className="text-lg font-semibold">
  Heading 2 <Badge size="lg">Badge</Badge>
</span>
<span className="text-base font-semibold">
  Heading 3 <Badge size="md">Badge</Badge>
</span>
<span className="text-sm font-semibold">
  Heading 4 <Badge size="sm">Badge</Badge>
</span>
<span className="text-xs font-semibold">
  Heading 5 <Badge size="xs">Badge</Badge>
</span>
<p className="text-xs">
  Paragraph <Badge size="xs">Badge</Badge>
</p>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Badge in a button
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabInButton.value}
            onChange={k => (tabInButton.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabInButton.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex gap-3">
                <Button>
                  Inbox <Badge size="sm">+99</Badge>
                </Button>
                <Button>
                  Inbox{' '}
                  <Badge size="sm" variant="secondary">
                    +99
                  </Badge>
                </Button>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Button>
  Inbox <Badge size="sm">+99</Badge>
</Button>
<Button>
  Inbox <Badge size="sm" variant="secondary">+99</Badge>
</Button>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default BadgeDemo
