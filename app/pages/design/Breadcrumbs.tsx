import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Breadcrumbs, Tabs } from '@rue-js/design'

const BreadcrumbsDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabIcons = ref<'preview' | 'code'>('preview')
  const tabMaxWidth = ref<'preview' | 'code'>('preview')
  const tabArray = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Breadcrumbs 面包屑</h1>
        <p className="text-sm mt-3 mb-3">面包屑用于帮助用户在网站中导航。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/breadcrumbs/" target="_blank">
            查看 Breadcrumbs 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Breadcrumbs</h2>
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
            <Breadcrumbs className="text-sm">
              <Breadcrumbs.Item>
                <span className="hover:underline cursor-pointer inline-flex gap-2 items-center">
                  Home
                </span>
              </Breadcrumbs.Item>
              <Breadcrumbs.Item>
                <span className="hover:underline cursor-pointer inline-flex gap-2 items-center">
                  Documents
                </span>
              </Breadcrumbs.Item>
              <Breadcrumbs.Item>Add Document</Breadcrumbs.Item>
            </Breadcrumbs>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Breadcrumbs } from '@rue-js/design';
<Breadcrumbs className="text-sm">
  <Breadcrumbs.Item>
    <span className="hover:underline cursor-pointer inline-flex gap-2 items-center">Home</span>
  </Breadcrumbs.Item>
  <Breadcrumbs.Item>
    <span className="hover:underline cursor-pointer inline-flex gap-2 items-center">Documents</span>
  </Breadcrumbs.Item>
  <Breadcrumbs.Item> Add Document </Breadcrumbs.Item>
</Breadcrumbs>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Breadcrumbs with icons
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabIcons.value}
            onChange={k => (tabIcons.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabIcons.value === 'preview' ? (
            <Breadcrumbs className="text-sm">
              <Breadcrumbs.Item>
                <span className="hover:underline cursor-pointer inline-flex gap-2 items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 stroke-current"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    ></path>
                  </svg>
                  Home
                </span>
              </Breadcrumbs.Item>
              <Breadcrumbs.Item>
                <span className="hover:underline cursor-pointer inline-flex gap-2 items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 stroke-current"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    ></path>
                  </svg>
                  Documents
                </span>
              </Breadcrumbs.Item>
              <Breadcrumbs.Item>
                <span className="inline-flex gap-2 items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 stroke-current"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  Add Document
                </span>
              </Breadcrumbs.Item>
            </Breadcrumbs>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Breadcrumbs className="text-sm">
  <Breadcrumbs.Item>
    <span className="hover:underline cursor-pointer inline-flex gap-2 items-center">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
      Home
    </span>
  </Breadcrumbs.Item>
  <Breadcrumbs.Item>
    <span className="hover:underline cursor-pointer inline-flex gap-2 items-center">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
      Documents
    </span>
  </Breadcrumbs.Item>
  <Breadcrumbs.Item>
    <span className="inline-flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a 2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
      Add Document
    </span>
  </Breadcrumbs.Item>
</Breadcrumbs>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Breadcrumbs from items
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
            <Breadcrumbs
              className="text-sm"
              items={[
                {
                  label: 'Home',
                  href: '/home',
                  linkClassName: 'hover:underline cursor-pointer inline-flex gap-2 items-center',
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="w-4 h-4 stroke-current"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      ></path>
                    </svg>
                  ),
                },
                {
                  label: 'Documents',
                  href: '/docs',
                  linkClassName: 'hover:underline cursor-pointer inline-flex gap-2 items-center',
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="w-4 h-4 stroke-current"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      ></path>
                    </svg>
                  ),
                },
                {
                  label: 'Add Document',
                  linkClassName: 'inline-flex gap-2 items-center',
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="w-4 h-4 stroke-current"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                  ),
                },
              ]}
            />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Breadcrumbs className="text-sm" items={[
  {
    label: 'Home',
    href: '/home',
    linkClassName: 'hover:underline cursor-pointer inline-flex gap-2 items-center',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
      </svg>
    ),
  },
  {
    label: 'Documents',
    href: '/docs',
    linkClassName: 'hover:underline cursor-pointer inline-flex gap-2 items-center',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
      </svg>
    ),
  },
  {
    label: 'Add Document',
    linkClassName: 'inline-flex items-center gap-2',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a 2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
    ),
  },
]} />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Breadcrumbs with max-width
          </h2>
          <p className="text-sm mt-3 mb-3">
            如果设置了 max-width 或列表超出容器宽度，将会出现滚动。
          </p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabMaxWidth.value}
            onChange={k => (tabMaxWidth.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabMaxWidth.value === 'preview' ? (
            <Breadcrumbs className="max-w-xs text-sm">
              <Breadcrumbs.Item>Long text 1</Breadcrumbs.Item>
              <Breadcrumbs.Item>Long text 2</Breadcrumbs.Item>
              <Breadcrumbs.Item>Long text 3</Breadcrumbs.Item>
              <Breadcrumbs.Item>Long text 4</Breadcrumbs.Item>
              <Breadcrumbs.Item>Long text 5</Breadcrumbs.Item>
            </Breadcrumbs>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Breadcrumbs className="max-w-xs text-sm">
  <Breadcrumbs.Item>Long text 1</Breadcrumbs.Item>
  <Breadcrumbs.Item>Long text 2</Breadcrumbs.Item>
  <Breadcrumbs.Item>Long text 3</Breadcrumbs.Item>
  <Breadcrumbs.Item>Long text 4</Breadcrumbs.Item>
  <Breadcrumbs.Item>Long text 5</Breadcrumbs.Item>
</Breadcrumbs>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default BreadcrumbsDemo
