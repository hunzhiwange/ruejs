import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Status, Tabs } from '@rue-js/design'

const StatusDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabSizes = ref<'preview' | 'code'>('preview')
  const tabColors = ref<'preview' | 'code'>('preview')
  const tabPing = ref<'preview' | 'code'>('preview')
  const tabBounce = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Status</h1>
        <p className="text-sm mt-3 mb-3">
          Status is a really small icon to visually show the current status of an element, like
          online, offline, error, etc.
        </p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/status/" target="_blank">
            View Status classnames
          </a>
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Status</h2>
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
            <div class="preview">
              <Status as="span" />
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Status as="span" />`} />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Status sizes
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
            <div class="preview">
              <Status ariaLabel="status" size="xs" />
              <Status ariaLabel="status" size="sm" />
              <Status ariaLabel="status" size="md" />
              <Status ariaLabel="status" size="lg" />
              <Status ariaLabel="status" size="xl" />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Status ariaLabel="status" size="xs" />
<Status ariaLabel="status" size="sm" />
<Status ariaLabel="status" size="md" />
<Status ariaLabel="status" size="lg" />
<Status ariaLabel="status" size="xl" />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Status with colors
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
            <div className="mt-2 preview">
              <Status ariaLabel="status" color="primary" />
              <Status ariaLabel="status" color="secondary" />
              <Status ariaLabel="status" color="accent" />
              <Status ariaLabel="status" color="neutral" />
              <Status ariaLabel="info" color="info" />
              <Status ariaLabel="success" color="success" />
              <Status ariaLabel="warning" color="warning" />
              <Status ariaLabel="error" color="error" />
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Status ariaLabel="status" color="primary" />
<Status ariaLabel="status" color="secondary" />
<Status ariaLabel="status" color="accent" />
<Status ariaLabel="status" color="neutral" />
<Status ariaLabel="info" color="info" />
<Status ariaLabel="success" color="success" />
<Status ariaLabel="warning" color="warning" />
<Status ariaLabel="error" color="error" />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Status with ping animation
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPing.value}
            onChange={k => (tabPing.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPing.value === 'preview' ? (
            <div className="mt-2 preview">
              <div className="inline-grid *:[grid-area:1/1]">
                <div className="status status-error animate-ping"></div>
                <Status color="error" className="animate-ping" />
                <Status color="error" />
              </div>{' '}
              Server is down
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="relative inline-block">
  <Status color="error" className="absolute inset-0 animate-ping" />
  <Status color="error" />
</div>
<div className="ms-2">Server is down</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Status with bounce animation
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBounce.value}
            onChange={k => (tabBounce.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBounce.value === 'preview' ? (
            <div className="preview">
              <Status color="info" className="animate-bounce" />
              <span>Unread messages</span>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Status color="info" className="animate-bounce" /> Unread messages`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default StatusDemo
