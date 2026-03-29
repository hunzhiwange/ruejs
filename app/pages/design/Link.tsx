import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Link, Tabs } from '@rue-js/design'

const LinkDemo: FC = () => {
  const tabBasic1 = ref<'preview' | 'code'>('preview')
  const tabBasic2 = ref<'preview' | 'code'>('preview')
  const tabPrimary = ref<'preview' | 'code'>('preview')
  const tabSecondary = ref<'preview' | 'code'>('preview')
  const tabAccent = ref<'preview' | 'code'>('preview')
  const tabSuccess = ref<'preview' | 'code'>('preview')
  const tabInfo = ref<'preview' | 'code'>('preview')
  const tabWarning = ref<'preview' | 'code'>('preview')
  const tabError = ref<'preview' | 'code'>('preview')
  const tabHover = ref<'preview' | 'code'>('preview')
  const tabHref = ref<'preview' | 'code'>('preview')
  const tabOnClick = ref<'preview' | 'code'>('preview')
  const tabPrevent = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Link 链接</h1>
        <p className="text-sm mt-3 mb-3">Link 为链接补充缺失的下划线样式，与 DaisyUI 保持一致。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/link/" target="_blank">
            查看 Link 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Link</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBasic1.value}
            onChange={k => (tabBasic1.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBasic1.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Link>Click me</Link>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Link } from '@rue-js/design';
<Link>Click me</Link>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Link router</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBasic1.value}
            onChange={k => (tabBasic1.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBasic1.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Link to="/examples/hello-world">跳转到 Hello World 页</Link>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Link } from '@rue-js/design';
<Link to="/examples/hello-world">跳转到 Hello World 页</Link>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Link href/target
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabHref.value}
            onChange={k => (tabHref.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabHref.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Link href="https://example.com" target="_blank" rel="noreferrer">
                  跳转到外部网站
                </Link>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Link } from '@rue-js/design';
<Link href="https://example.com" target="_blank" rel="noreferrer">跳转到外部网站</Link>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Link onClick
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabOnClick.value}
            onChange={k => (tabOnClick.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabOnClick.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Link onClick={() => alert('clicked')}>Click me</Link>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Link } from '@rue-js/design';
<Link onClick={() => alert('clicked')}>Click me</Link>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Link onClick 阻止跳转
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPrevent.value}
            onChange={k => (tabPrevent.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPrevent.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body space-y-2">
                <div>
                  <Link href="https://example.com" onClick={e => e.preventDefault()}>
                    阻止外链跳转
                  </Link>
                </div>
                <div>
                  <Link to="/examples/hello-world" onClick={e => e.preventDefault()}>
                    阻止路由跳转
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Link } from '@rue-js/design';
<Link href="https://example.com" onClick={e => e.preventDefault()}>阻止外链跳转</Link>
<Link to="/examples/hello-world" onClick={e => e.preventDefault()}>阻止路由跳转</Link>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Link</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBasic2.value}
            onChange={k => (tabBasic2.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBasic2.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <p className="text-sm mt-3 mb-3">
                  Tailwind CSS resets the style of links by default.
                  <br />
                  Add "link" class to make it look like a <Link>normal link</Link> again.
                </p>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<p className="text-sm mt-3 mb-3">
  Tailwind CSS resets the style of links by default.
  <br />
  Add "link" class to make it look like a
  <Link>normal link</Link>
  again.
</p>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Primary color
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPrimary.value}
            onChange={k => (tabPrimary.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPrimary.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Link variant="primary">Click me</Link>
              </div>
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Link variant="primary">Click me</Link>`} />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Secondary color
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSecondary.value}
            onChange={k => (tabSecondary.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSecondary.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Link variant="secondary">Click me</Link>
              </div>
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Link variant="secondary">Click me</Link>`} />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Accent color
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabAccent.value}
            onChange={k => (tabAccent.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabAccent.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Link variant="accent">Click me</Link>
              </div>
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Link variant="accent">Click me</Link>`} />
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
                <Link variant="success">Click me</Link>
              </div>
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Link variant="success">Click me</Link>`} />
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
                <Link variant="info">Click me</Link>
              </div>
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Link variant="info">Click me</Link>`} />
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
                <Link variant="warning">Click me</Link>
              </div>
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Link variant="warning">Click me</Link>`} />
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
                <Link variant="error">Click me</Link>
              </div>
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Link variant="error">Click me</Link>`} />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Show underline only on hover
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabHover.value}
            onChange={k => (tabHover.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabHover.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Link hover>Click me</Link>
              </div>
            </div>
          ) : (
            <Code className="mt-2" lang="tsx" code={`<Link hover>Click me</Link>`} />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default LinkDemo
