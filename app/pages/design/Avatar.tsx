import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Avatar, Tabs } from '@rue-js/design'

const AvatarDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabSizes = ref<'preview' | 'code'>('preview')
  const tabRounded = ref<'preview' | 'code'>('preview')
  const tabMask = ref<'preview' | 'code'>('preview')
  const tabGroup = ref<'preview' | 'code'>('preview')
  const tabGroupCounter = ref<'preview' | 'code'>('preview')
  const tabGroupArray = ref<'preview' | 'code'>('preview')
  const tabRing = ref<'preview' | 'code'>('preview')
  const tabPresence = ref<'preview' | 'code'>('preview')
  const tabPlaceholder = ref<'preview' | 'code'>('preview')

  const groupItems = [
    {
      children: (
        <div className="w-12 bg-base-300">
          <img
            className="h-full w-full object-cover"
            src="https://img.daisyui.com/images/profile/demo/batperson@192.webp"
            alt="Tailwind-CSS-Avatar-component"
          />
        </div>
      ),
    },
    {
      children: (
        <div className="w-12 bg-base-300">
          <img
            className="h-full w-full object-cover"
            src="https://img.daisyui.com/images/profile/demo/spiderperson@192.webp"
            alt="Tailwind-CSS-Avatar-component"
          />
        </div>
      ),
    },
    {
      children: (
        <div className="w-12 bg-base-300">
          <img
            className="h-full w-full object-cover"
            src="https://img.daisyui.com/images/profile/demo/averagebulk@192.webp"
            alt="Tailwind-CSS-Avatar-component"
          />
        </div>
      ),
    },
    {
      status: 'placeholder',
      children: (
        <div className="w-12 bg-neutral text-neutral-content">
          <span>+99</span>
        </div>
      ),
    },
  ] as const

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Avatar 头像</h1>
        <p className="text-sm mt-3 mb-3">头像用于在界面中展示个人或企业的缩略图。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/avatar/" target="_blank">
            查看 Avatar 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Avatar</h2>
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
            <Avatar>
              <div className="w-24 rounded bg-base-300">
                <img
                  className="h-full w-full object-cover"
                  src="https://img.daisyui.com/images/profile/demo/batperson@192.webp"
                  alt="Tailwind-CSS-Avatar-component"
                />
              </div>
            </Avatar>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Avatar } from '@rue-js/design';
<Avatar>
  <div className="w-24 rounded">
    <img src="https://img.daisyui.com/images/profile/demo/batperson@192.webp" />
  </div>
</Avatar>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Avatar in custom sizes
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
            <div className="grid gap-3">
              <Avatar>
                <div className="w-24 rounded bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/superperson@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-16 rounded bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/superperson@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 rounded bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/superperson@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-8 rounded bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/superperson@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Avatar><div className="w-24 rounded"><img src="https://img.daisyui.com/images/profile/demo/superperson@192.webp" /></div></Avatar>
<Avatar><div className="w-16 rounded"><img src="https://img.daisyui.com/images/profile/demo/superperson@192.webp" /></div></Avatar>
<Avatar><div className="w-12 rounded"><img src="https://img.daisyui.com/images/profile/demo/superperson@192.webp" /></div></Avatar>
<Avatar><div className="w-8 rounded"><img src="https://img.daisyui.com/images/profile/demo/superperson@192.webp" /></div></Avatar>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Avatar rounded
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabRounded.value}
            onChange={k => (tabRounded.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabRounded.value === 'preview' ? (
            <div className="grid gap-3">
              <Avatar>
                <div className="w-24 rounded-xl bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/yellingwoman@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-24 rounded-full bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/yellingcat@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Avatar><div className="w-24 rounded-xl"><img src="https://img.daisyui.com/images/profile/demo/yellingwoman@192.webp" /></div></Avatar>
<Avatar><div className="w-24 rounded-full"><img src="https://img.daisyui.com/images/profile/demo/yellingcat@192.webp" /></div></Avatar>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Avatar with mask
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabMask.value}
            onChange={k => (tabMask.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabMask.value === 'preview' ? (
            <div className="grid gap-3">
              <Avatar>
                <div className="mask mask-heart w-24 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/distracted3@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="mask mask-squircle w-24 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/distracted1@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="mask mask-hexagon-2 w-24 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/distracted2@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Avatar><div className="mask mask-heart w-24"><img src="https://img.daisyui.com/images/profile/demo/distracted3@192.webp" /></div></Avatar>
<Avatar><div className="mask mask-squircle w-24"><img src="https://img.daisyui.com/images/profile/demo/distracted1@192.webp" /></div></Avatar>
<Avatar><div className="mask mask-hexagon-2 w-24"><img src="https://img.daisyui.com/images/profile/demo/distracted2@192.webp" /></div></Avatar>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Avatar group
          </h2>
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
            <Avatar.Group className="-space-x-6">
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/batperson@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/spiderperson@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/averagebulk@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/wonderperson@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
            </Avatar.Group>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Avatar.Group className="-space-x-6">
  <Avatar><div className="w-12"><img src="https://img.daisyui.com/images/profile/demo/batperson@192.webp" /></div></Avatar>
  <Avatar><div className="w-12"><img src="https://img.daisyui.com/images/profile/demo/spiderperson@192.webp" /></div></Avatar>
  <Avatar><div className="w-12"><img src="https://img.daisyui.com/images/profile/demo/averagebulk@192.webp" /></div></Avatar>
  <Avatar><div className="w-12"><img src="https://img.daisyui.com/images/profile/demo/wonderperson@192.webp" /></div></Avatar>
</Avatar.Group>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Avatar group 通过数据渲染（数组，组件内部）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabGroupArray.value}
            onChange={k => (tabGroupArray.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabGroupArray.value === 'preview' ? (
            <Avatar.Group items={groupItems as any} className="-space-x-6" />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Avatar } from '@rue-js/design';
const groupItems = [
  {
    children: (
      <div className="w-12">
        <img src="https://img.daisyui.com/images/profile/demo/batperson@192.webp" />
      </div>
    ),
  },
  {
    children: (
      <div className="w-12">
        <img src="https://img.daisyui.com/images/profile/demo/spiderperson@192.webp" />
      </div>
    ),
  },
  {
    children: (
      <div className="w-12">
        <img src="https://img.daisyui.com/images/profile/demo/averagebulk@192.webp" />
      </div>
    ),
  },
  { status: 'placeholder', children: (<div className="w-12 bg-neutral text-neutral-content"><span>+99</span></div>) },
];
<Avatar.Group items={groupItems} className="-space-x-6" />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Avatar group with counter
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabGroupCounter.value}
            onChange={k => (tabGroupCounter.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabGroupCounter.value === 'preview' ? (
            <Avatar.Group className="-space-x-6">
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/batperson@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/spiderperson@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/averagebulk@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar status="placeholder">
                <div className="w-12 bg-neutral text-neutral-content">
                  <span>+99</span>
                </div>
              </Avatar>
            </Avatar.Group>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Avatar.Group className="-space-x-6">
  <Avatar><div className="w-12"><img src="https://img.daisyui.com/images/profile/demo/batperson@192.webp" /></div></Avatar>
  <Avatar><div className="w-12"><img src="https://img.daisyui.com/images/profile/demo/spiderperson@192.webp" /></div></Avatar>
  <Avatar><div className="w-12"><img src="https://img.daisyui.com/images/profile/demo/averagebulk@192.webp" /></div></Avatar>
  <Avatar status="placeholder"><div className="w-12 bg-neutral text-neutral-content"><span>+99</span></div></Avatar>
</Avatar.Group>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Avatar with ring
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabRing.value}
            onChange={k => (tabRing.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabRing.value === 'preview' ? (
            <Avatar>
              <div className="w-24 rounded-full ring-2 ring-primary ring-offset-base-100 ring-offset-2">
                <img
                  className="h-full w-full object-cover"
                  src="https://img.daisyui.com/images/profile/demo/spiderperson@192.webp"
                  alt="Tailwind-CSS-Avatar-component"
                />
              </div>
            </Avatar>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Avatar><div className="ring-primary ring-offset-base-100 w-24 rounded-full ring-2 ring-offset-2"><img src="https://img.daisyui.com/images/profile/demo/spiderperson@192.webp" /></div></Avatar>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Avatar with presence indicator
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPresence.value}
            onChange={k => (tabPresence.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPresence.value === 'preview' ? (
            <div className="grid gap-3 bg-base-100 relative flex min-h-[6rem] max-w-4xl min-w-[18rem] flex-wrap items-center justify-center gap-2 overflow-x-hidden bg-cover bg-top p-4 xl:py-10">
              <Avatar status="online">
                <div className="w-24 rounded-full bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/gordon@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar status="offline">
                <div className="w-24 rounded-full bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src="https://img.daisyui.com/images/profile/demo/idiotsandwich@192.webp"
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Avatar status="online"><div className="w-24 rounded-full"><img src="https://img.daisyui.com/images/profile/demo/gordon@192.webp" /></div></Avatar>
<Avatar status="offline"><div className="w-24 rounded-full"><img src="https://img.daisyui.com/images/profile/demo/idiotsandwich@192.webp" /></div></Avatar>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Avatar placeholder
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPlaceholder.value}
            onChange={k => (tabPlaceholder.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPlaceholder.value === 'preview' ? (
            <div className="grid gap-3 bg-base-100 relative flex min-h-[6rem] max-w-4xl min-w-[18rem] flex-wrap items-center justify-center gap-2 overflow-x-hidden bg-cover bg-top p-4 xl:py-10 ">
              <Avatar status="placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-24">
                  <span className="text-3xl">D</span>
                </div>
              </Avatar>
              <Avatar status="online">
                <Avatar status="placeholder">
                  <div className="bg-neutral text-neutral-content rounded-full w-16">
                    <span className="text-xl">AI</span>
                  </div>
                </Avatar>
              </Avatar>
              <Avatar status="placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-12">
                  <span>SY</span>
                </div>
              </Avatar>
              <Avatar status="placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-8">
                  <span className="text-xs">UI</span>
                </div>
              </Avatar>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Avatar status="placeholder"><div className="bg-neutral text-neutral-content w-24 rounded-full"><span className="text-3xl">D</span></div></Avatar>
<Avatar status="online"><Avatar status="placeholder"><div className="bg-neutral text-neutral-content w-16 rounded-full"><span className="text-xl">AI</span></div></Avatar></Avatar>
<Avatar status="placeholder"><div className="bg-neutral text-neutral-content w-12 rounded-full"><span>SY</span></div></Avatar>
<Avatar status="placeholder"><div className="bg-neutral text-neutral-content w-8 rounded-full"><span className="text-xs">UI</span></div></Avatar>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default AvatarDemo
