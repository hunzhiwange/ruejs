import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Alert, Button, Tabs } from '@rue-js/design'

const AlertDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabInfo = ref<'preview' | 'code'>('preview')
  const tabSuccess = ref<'preview' | 'code'>('preview')
  const tabWarning = ref<'preview' | 'code'>('preview')
  const tabError = ref<'preview' | 'code'>('preview')
  const tabSoft = ref<'preview' | 'code'>('preview')
  const tabOutline = ref<'preview' | 'code'>('preview')
  const tabDash = ref<'preview' | 'code'>('preview')
  const tabResponsive = ref<'preview' | 'code'>('preview')
  const tabTitleDesc = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Alert 警告</h1>
        <p className="text-sm mt-3 mb-3">警告（Alert）用于向用户传达重要的系统事件或状态信息。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/alert/" target="_blank">
            查看 Alert 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Alert</h2>
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
                <Alert className="w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="stroke-info shrink-0 w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span>12 unread messages. Tap to see.</span>
                </Alert>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Alert } from '@rue-js/design';
<Alert className="w-full">
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
  <span>12 unread messages. Tap to see.</span>
</Alert>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Info color</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabInfo.value}
            onChange={k => (tabInfo.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabInfo.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Alert variant="info" className="w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="stroke-current shrink-0 w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>New software update available.</span>
                </Alert>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Alert variant="info" className="w-full">
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  <span>New software update available.</span>
</Alert>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Success color
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSuccess.value}
            onChange={k => (tabSuccess.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSuccess.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Alert variant="success" className="w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Your purchase has been confirmed!</span>
                </Alert>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Alert variant="success" className="w-full">
  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  <span>Your purchase has been confirmed!</span>
</Alert>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Warning color
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabWarning.value}
            onChange={k => (tabWarning.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabWarning.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Alert variant="warning" className="w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>Warning: Invalid email address!</span>
                </Alert>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Alert variant="warning" className="w-full">
  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
  <span>Warning: Invalid email address!</span>
</Alert>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Error color</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabError.value}
            onChange={k => (tabError.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabError.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Alert variant="error" className="w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Error! Task failed successfully.</span>
                </Alert>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Alert variant="error" className="w-full">
  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  <span>Error! Task failed successfully.</span>
</Alert>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Alert soft style
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
              <div className="card-body grid gap-3">
                <Alert variant="info" soft className="w-full">
                  <span>12 unread messages. Tap to see.</span>
                </Alert>
                <Alert variant="success" soft className="w-full">
                  <span>Your purchase has been confirmed!</span>
                </Alert>
                <Alert variant="warning" soft className="w-full">
                  <span>Warning: Invalid email address!</span>
                </Alert>
                <Alert variant="error" soft className="w-full">
                  <span>Error! Task failed successfully.</span>
                </Alert>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Alert variant="info" soft className="w-full"><span>12 unread messages. Tap to see.</span></Alert>
<Alert variant="success" soft className="w-full"><span>Your purchase has been confirmed!</span></Alert>
<Alert variant="warning" soft className="w-full"><span>Warning: Invalid email address!</span></Alert>
<Alert variant="error" soft className="w-full"><span>Error! Task failed successfully.</span></Alert>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Alert outline style
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
              <div className="card-body grid gap-3">
                <Alert variant="info" outline className="w-full">
                  <span>12 unread messages. Tap to see.</span>
                </Alert>
                <Alert variant="success" outline className="w-full">
                  <span>Your purchase has been confirmed!</span>
                </Alert>
                <Alert variant="warning" outline className="w-full">
                  <span>Warning: Invalid email address!</span>
                </Alert>
                <Alert variant="error" outline className="w-full">
                  <span>Error! Task failed successfully.</span>
                </Alert>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Alert variant="info" outline className="w-full"><span>12 unread messages. Tap to see.</span></Alert>
<Alert variant="success" outline className="w-full"><span>Your purchase has been confirmed!</span></Alert>
<Alert variant="warning" outline className="w-full"><span>Warning: Invalid email address!</span></Alert>
<Alert variant="error" outline className="w-full"><span>Error! Task failed successfully.</span></Alert>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Alert dash style
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
              <div className="card-body grid gap-3">
                <Alert variant="info" dash className="w-full">
                  <span>12 unread messages. Tap to see.</span>
                </Alert>
                <Alert variant="success" dash className="w-full">
                  <span>Your purchase has been confirmed!</span>
                </Alert>
                <Alert variant="warning" dash className="w-full">
                  <span>Warning: Invalid email address!</span>
                </Alert>
                <Alert variant="error" dash className="w-full">
                  <span>Error! Task failed successfully.</span>
                </Alert>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Alert variant="info" dash className="w-full"><span>12 unread messages. Tap to see.</span></Alert>
<Alert variant="success" dash className="w-full"><span>Your purchase has been confirmed!</span></Alert>
<Alert variant="warning" dash className="w-full"><span>Warning: Invalid email address!</span></Alert>
<Alert variant="error" dash className="w-full"><span>Error! Task failed successfully.</span></Alert>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Alert with buttons + responsive
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
                <Alert direction="vertical" className="w-full sm:alert-horizontal">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="stroke-info shrink-0 w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span>we use cookies for no reason.</span>
                  <div>
                    <Button size="sm">Deny</Button>
                    <Button size="sm" variant="primary">
                      Accept
                    </Button>
                  </div>
                </Alert>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Alert direction="vertical" className="w-full sm:alert-horizontal">
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  <span>we use cookies for no reason.</span>
  <div>
    <Button size="sm">Deny</Button>
    <Button size="sm" variant="primary">Accept</Button>
  </div>
</Alert>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Alert with title and description
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabTitleDesc.value}
            onChange={k => (tabTitleDesc.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabTitleDesc.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Alert direction="vertical" className="w-full sm:alert-horizontal">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="stroke-info shrink-0 w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <div>
                    <h3 className="font-bold">New message!</h3>
                    <div className="text-xs">You have 1 unread message</div>
                  </div>
                  <Button size="sm">See</Button>
                </Alert>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Alert direction="vertical" className="w-full sm:alert-horizontal">
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  <div>
    <h3 className="font-bold">New message!</h3>
    <div className="text-xs">You have 1 unread message</div>
  </div>
  <Button size="sm">See</Button>
</Alert>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default AlertDemo
