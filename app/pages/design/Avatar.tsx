import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Avatar, Tabs } from '@rue-js/design'
type TabMode = 'preview' | 'code'

interface ExampleBlockProps {
  title: string
  summary?: string
  tab: { value: TabMode }
  preview: () => any
  code: string
}

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const photos = {
  averagebulk: 'https://img.daisyui.com/images/profile/demo/averagebulk@192.webp',
  batperson: 'https://img.daisyui.com/images/profile/demo/batperson@192.webp',
  distracted1: 'https://img.daisyui.com/images/profile/demo/distracted1@192.webp',
  distracted2: 'https://img.daisyui.com/images/profile/demo/distracted2@192.webp',
  distracted3: 'https://img.daisyui.com/images/profile/demo/distracted3@192.webp',
  gordon: 'https://img.daisyui.com/images/profile/demo/gordon@192.webp',
  idiotsandwich: 'https://img.daisyui.com/images/profile/demo/idiotsandwich@192.webp',
  spiderperson: 'https://img.daisyui.com/images/profile/demo/spiderperson@192.webp',
  superperson: 'https://img.daisyui.com/images/profile/demo/superperson@192.webp',
  wonderperson: 'https://img.daisyui.com/images/profile/demo/wonderperson@192.webp',
  yellingcat: 'https://img.daisyui.com/images/profile/demo/yellingcat@192.webp',
  yellingwoman: 'https://img.daisyui.com/images/profile/demo/yellingwoman@192.webp',
} as const

const ExampleBlock: FC<ExampleBlockProps> = ({ title, summary, tab, preview, code }) => {
  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {title}</h2>
          {summary ? <p className="m-0 text-sm opacity-70">{summary}</p> : null}
        </div>
      </div>
      <Tabs
        style="box"
        items={[
          { key: 'preview', label: '预览' },
          { key: 'code', label: 'JSX代码' },
        ]}
        activeKey={tab.value}
        onChange={key => (tab.value = key as TabMode)}
        className="mb-3 mt-4"
      />
      {tab.value === 'preview' ? preview() : <Code className="mt-2" lang="tsx" code={code} />}
    </div>
  )
}

const ApiTable: FC<{ rows: ApiRow[] }> = ({ rows }) => {
  return (
    <div className="not-prose overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>属性</th>
            <th>说明</th>
            <th>类型</th>
            <th>默认值</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.prop}>
              <td>
                <code>{row.prop}</code>
              </td>
              <td>{row.description}</td>
              <td>
                <code>{row.type}</code>
              </td>
              <td>
                <code>{row.defaultValue}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-[1.2em]"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
)

const SparkIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-[1.2em]"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 18h.01M19 18h.01M12 21h.01" />
  </svg>
)

const TeamIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-[1.2em]"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 20a4.5 4.5 0 0 1 8 0" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 20a5.5 5.5 0 0 1 8 0" />
  </svg>
)

const avatarApiRows: ApiRow[] = [
  { prop: 'alt', description: '图片头像的替代文本', type: 'string', defaultValue: '`Avatar`' },
  {
    prop: 'bodyClassName',
    description: '头像主体容器类名，适合加 ring 或 mask',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'children',
    description: '文字、图标、fallback，或基础自定义内容插槽',
    type: 'RenderOutput',
    defaultValue: '-',
  },
  { prop: 'className', description: '头像根节点类名', type: 'string', defaultValue: '-' },
  {
    prop: 'color',
    description: '语义化背景色，主要作用于文字或图标头像',
    type: '`base` | `neutral` | `primary` | `secondary` | `accent` | `info` | `success` | `warning` | `error`',
    defaultValue: '根据场景自动决定',
  },
  {
    prop: 'crossOrigin',
    description: '图片跨域属性',
    type: '`anonymous` | `use-credentials` | ``',
    defaultValue: '-',
  },
  {
    prop: 'fit',
    description: '图片填充模式',
    type: '`cover` | `contain`',
    defaultValue: '`cover`',
  },
  {
    prop: 'gap',
    description: '文字头像左右预留间距，用于自动缩放',
    type: 'number',
    defaultValue: '4',
  },
  {
    prop: 'icon',
    description: '图标头像内容；图片失败后也会优先回退到这里',
    type: 'RenderOutput',
    defaultValue: '-',
  },
  { prop: 'imgClassName', description: 'img 节点类名', type: 'string', defaultValue: '-' },
  {
    prop: 'onError',
    description: '图片加载失败回调；返回 false 可阻止默认回退',
    type: '(event: Event) => boolean | void',
    defaultValue: '-',
  },
  { prop: 'shape', description: '头像形状', type: '`circle` | `square`', defaultValue: '`circle`' },
  {
    prop: 'size',
    description: '头像尺寸，支持数字像素和语义尺寸别名',
    type: 'number | `xs` | `sm` | `md` | `lg` | `xl` | `small` | `default` | `medium` | `middle` | `large`',
    defaultValue: '`md`',
  },
  {
    prop: 'src',
    description: '图片地址或自定义媒体节点',
    type: 'string | RenderOutput',
    defaultValue: '-',
  },
  { prop: 'srcSet', description: '图片多分辨率资源集合', type: 'string', defaultValue: '-' },
  {
    prop: 'status',
    description: '在线、离线、占位三种状态标记',
    type: '`online` | `offline` | `placeholder`',
    defaultValue: '-',
  },
  { prop: 'text', description: '显式指定文字头像内容', type: 'string', defaultValue: '-' },
]

const avatarGroupApiRows: ApiRow[] = [
  {
    prop: 'children',
    description: '手写 Avatar 子节点，展示基础组合方式',
    type: 'RenderOutput',
    defaultValue: '-',
  },
  { prop: 'className', description: '群组容器类名', type: 'string', defaultValue: '-' },
  {
    prop: 'items',
    description: '数据驱动渲染头像列表，单项可复用 AvatarProps',
    type: 'AvatarGroupItem[]',
    defaultValue: '-',
  },
  {
    prop: 'max',
    description: '最多显示多少个头像，超出后自动合并成 +N',
    type: 'number | { count?: number; placeholder?: RenderOutput; className?: string; bodyClassName?: string }',
    defaultValue: '-',
  },
  {
    prop: 'shape',
    description: '为 items 模式和聚合头像提供默认形状',
    type: '`circle` | `square`',
    defaultValue: '-',
  },
  {
    prop: 'size',
    description: '为 items 模式和聚合头像提供默认尺寸',
    type: 'AvatarProps[`size`]',
    defaultValue: '-',
  },
]

const legacyGroupItems = [
  {
    children: (
      <div className="w-12 bg-base-300">
        <img
          className="h-full w-full object-cover"
          src={photos.batperson}
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
          src={photos.spiderperson}
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
          src={photos.averagebulk}
          alt="Tailwind-CSS-Avatar-component"
        />
      </div>
    ),
  },
  {
    status: 'placeholder' as const,
    children: (
      <div className="w-12 bg-neutral text-neutral-content">
        <span>+99</span>
      </div>
    ),
  },
] as const

const semanticGroupItems = [
  { src: photos.batperson, alt: 'Bat Person' },
  { text: 'JS', color: 'primary' as const },
  { icon: <SparkIcon />, color: 'secondary' as const },
  { text: 'OPS', color: 'accent' as const },
  { icon: <TeamIcon />, color: 'neutral' as const },
] as const

const AvatarDemo: FC = () => {
  const tabSemanticBasic = ref<TabMode>('preview')
  const tabSemanticTone = ref<TabMode>('preview')
  const tabSemanticAutosize = ref<TabMode>('preview')
  const tabSemanticFallback = ref<TabMode>('preview')
  const tabSemanticGroupMax = ref<TabMode>('preview')
  const tabBasic = ref<TabMode>('preview')
  const tabSizes = ref<TabMode>('preview')
  const tabRounded = ref<TabMode>('preview')
  const tabMask = ref<TabMode>('preview')
  const tabGroup = ref<TabMode>('preview')
  const tabGroupCounter = ref<TabMode>('preview')
  const tabGroupArray = ref<TabMode>('preview')
  const tabRing = ref<TabMode>('preview')
  const tabPresence = ref<TabMode>('preview')
  const tabPlaceholder = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Avatar 头像</h1>
        <p className="mt-3 mb-3 text-sm">
          头像用于在界面中展示个人、团队或品牌的缩略信息。Rue 版 Avatar 现在既支持
          <code>src / icon / text / size / shape / onError</code>
          这类语义 API，也展示基础基于 daisyUI 的自由组合方式。
        </p>

        <div className="not-prose mt-4 rounded-box border border-base-300 bg-base-100 p-4 text-sm leading-6 text-base-content">
          <div className="font-semibold">组件补了什么</div>
          <ul className="mt-2 list-disc pl-5">
            <li>语义化头像：图片、图标、文字、颜色、尺寸、形状都能直接声明。</li>
            <li>图片失败回退：默认回到 icon、text 或 children；返回 false 可阻止回退。</li>
            <li>Avatar.Group：支持数据驱动、默认 size/shape 和 max 溢出聚合。</li>
            <li>依赖 children 自由拼装的写法仍然可用。</li>
          </ul>
        </div>

        <ExampleBlock
          title="语义化基础头像"
          summary="直接通过 src、icon、text、size 渲染头像，不再需要先手写内层容器。"
          tab={tabSemanticBasic}
          preview={() => (
            <div className="flex flex-wrap items-end gap-4 rounded-box border border-base-300 bg-base-100 p-6">
              <Avatar src={photos.batperson} alt="Bat Person" size={72} />
              <Avatar size="lg" color="primary" icon={<UserIcon />} />
              <Avatar size="lg" color="secondary">
                JS
              </Avatar>
              <Avatar size="sm" color="accent" shape="square">
                AI
              </Avatar>
            </div>
          )}
          code={`import { Avatar } from '@rue-js/design'<div className="flex flex-wrap items-end gap-4">
  <Avatar src="${photos.batperson}" alt="Bat Person" size={72} />
  <Avatar size="lg" color="primary" icon={<UserIcon />} />
  <Avatar size="lg" color="secondary">JS</Avatar>
  <Avatar size="sm" color="accent" shape="square">AI</Avatar>
</div>`}
        />

        <ExampleBlock
          title="图标、文字与颜色"
          summary="文字头像会自动使用更适合阅读的字号，图标头像则保持更紧凑的视觉中心。"
          tab={tabSemanticTone}
          preview={() => (
            <div className="flex flex-wrap items-center gap-4 rounded-box border border-base-300 bg-base-100 p-6">
              <Avatar size="xl" color="neutral" icon={<TeamIcon />} />
              <Avatar size="xl" color="primary">
                Rue
              </Avatar>
              <Avatar size="lg" color="info">
                Dev
              </Avatar>
              <Avatar size="lg" color="success" icon={<SparkIcon />} />
              <Avatar size="md" color="warning" shape="square">
                PM
              </Avatar>
            </div>
          )}
          code={`<div className="flex flex-wrap items-center gap-4">
  <Avatar size="xl" color="neutral" icon={<TeamIcon />} />
  <Avatar size="xl" color="primary">Rue</Avatar>
  <Avatar size="lg" color="info">Dev</Avatar>
  <Avatar size="lg" color="success" icon={<SparkIcon />} />
  <Avatar size="md" color="warning" shape="square">PM</Avatar>
</div>`}
        />

        <ExampleBlock
          title="自动缩放文字"
          summary="gap 用来控制文字两侧留白，文本越长，Avatar 会收紧字号避免溢出。"
          tab={tabSemanticAutosize}
          preview={() => (
            <div className="flex flex-wrap items-center gap-4 rounded-box border border-base-300 bg-base-100 p-6">
              <Avatar size={88} color="secondary" gap={10}>
                U
              </Avatar>
              <Avatar size={88} color="secondary" gap={10}>
                Lucy
              </Avatar>
              <Avatar size={88} color="secondary" gap={10}>
                Edward
              </Avatar>
              <Avatar size={88} color="secondary" gap={2}>
                SYSTEM
              </Avatar>
            </div>
          )}
          code={`<div className="flex flex-wrap items-center gap-4">
  <Avatar size={88} color="secondary" gap={10}>U</Avatar>
  <Avatar size={88} color="secondary" gap={10}>Lucy</Avatar>
  <Avatar size={88} color="secondary" gap={10}>Edward</Avatar>
  <Avatar size={88} color="secondary" gap={2}>SYSTEM</Avatar>
</div>`}
        />

        <ExampleBlock
          title="图片失败回退"
          summary="当图片地址失效时，会优先回退到 icon，再回退到 text 或 children。"
          tab={tabSemanticFallback}
          preview={() => (
            <div className="flex flex-wrap items-center gap-4 rounded-box border border-base-300 bg-base-100 p-6">
              <Avatar
                src="https://example.com/not-found-avatar.png"
                size="xl"
                color="primary"
                icon={<UserIcon />}
              />
              <Avatar src="https://example.com/not-found-avatar-2.png" size="xl" color="neutral">
                AI
              </Avatar>
              <Avatar
                src="https://example.com/not-found-avatar-3.png"
                size="lg"
                color="accent"
                shape="square"
                text="Rue"
              />
            </div>
          )}
          code={`<div className="flex flex-wrap items-center gap-4">
  <Avatar src="https://example.com/not-found-avatar.png" size="xl" color="primary" icon={<UserIcon />} />
  <Avatar src="https://example.com/not-found-avatar-2.png" size="xl" color="neutral">AI</Avatar>
  <Avatar src="https://example.com/not-found-avatar-3.png" size="lg" color="accent" shape="square" text="Rue" />
</div>`}
        />

        <ExampleBlock
          title="Avatar.Group 聚合与溢出"
          summary="Group 可以直接消费 items 数组，并用 max 自动折叠超出的成员。"
          tab={tabSemanticGroupMax}
          preview={() => (
            <div className="rounded-box border border-base-300 bg-base-100 p-6">
              <Avatar.Group
                items={semanticGroupItems}
                size="lg"
                shape="square"
                className="-space-x-4"
                max={{ count: 3, bodyClassName: 'bg-warning text-warning-content' }}
              />
            </div>
          )}
          code={`const members = [
  { src: "${photos.batperson}", alt: 'Bat Person' },
  { text: 'JS', color: 'primary' },
  { icon: <SparkIcon />, color: 'secondary' },
  { text: 'OPS', color: 'accent' },
  { icon: <TeamIcon />, color: 'neutral' },
]

<Avatar.Group
  items={members}
  size="lg"
  shape="square"
  className="-space-x-4"
  max={{ count: 3, bodyClassName: 'bg-warning text-warning-content' }}
/>`}
        />

        <h2 className="mt-10">支持组合方式</h2>
        <p>
          下面这些示例 来自 Rue 之前的 Avatar 页面，保持了基础的 children
          插槽写法，用来说明升级后仍然可以继续拼 daisyUI 原子类。
        </p>

        <ExampleBlock
          title="Avatar"
          tab={tabBasic}
          preview={() => (
            <Avatar>
              <div className="w-24 rounded bg-base-300">
                <img
                  className="h-full w-full object-cover"
                  src={photos.batperson}
                  alt="Tailwind-CSS-Avatar-component"
                />
              </div>
            </Avatar>
          )}
          code={`<Avatar>
  <div className="w-24 rounded bg-base-300">
    <img src="${photos.batperson}" alt="Tailwind-CSS-Avatar-component" />
  </div>
</Avatar>`}
        />

        <ExampleBlock
          title="Avatar in custom sizes"
          tab={tabSizes}
          preview={() => (
            <div className="grid gap-3">
              <Avatar>
                <div className="w-24 rounded bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.superperson}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-16 rounded bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.superperson}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 rounded bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.superperson}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-8 rounded bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.superperson}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
            </div>
          )}
          code={`<Avatar><div className="w-24 rounded bg-base-300"><img src="${photos.superperson}" /></div></Avatar>
<Avatar><div className="w-16 rounded bg-base-300"><img src="${photos.superperson}" /></div></Avatar>
<Avatar><div className="w-12 rounded bg-base-300"><img src="${photos.superperson}" /></div></Avatar>
<Avatar><div className="w-8 rounded bg-base-300"><img src="${photos.superperson}" /></div></Avatar>`}
        />

        <ExampleBlock
          title="Avatar rounded"
          tab={tabRounded}
          preview={() => (
            <div className="grid gap-3">
              <Avatar>
                <div className="w-24 rounded-xl bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.yellingwoman}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-24 rounded-full bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.yellingcat}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
            </div>
          )}
          code={`<Avatar><div className="w-24 rounded-xl bg-base-300"><img src="${photos.yellingwoman}" /></div></Avatar>
<Avatar><div className="w-24 rounded-full bg-base-300"><img src="${photos.yellingcat}" /></div></Avatar>`}
        />

        <ExampleBlock
          title="Avatar with mask"
          tab={tabMask}
          preview={() => (
            <div className="grid gap-3">
              <Avatar>
                <div className="mask mask-heart w-24 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.distracted3}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="mask mask-squircle w-24 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.distracted1}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="mask mask-hexagon-2 w-24 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.distracted2}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
            </div>
          )}
          code={`<Avatar><div className="mask mask-heart w-24 bg-base-300"><img src="${photos.distracted3}" /></div></Avatar>
<Avatar><div className="mask mask-squircle w-24 bg-base-300"><img src="${photos.distracted1}" /></div></Avatar>
<Avatar><div className="mask mask-hexagon-2 w-24 bg-base-300"><img src="${photos.distracted2}" /></div></Avatar>`}
        />

        <ExampleBlock
          title="Avatar group"
          tab={tabGroup}
          preview={() => (
            <Avatar.Group className="-space-x-6">
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.batperson}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.spiderperson}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.averagebulk}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.wonderperson}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
            </Avatar.Group>
          )}
          code={`<Avatar.Group className="-space-x-6">
  <Avatar><div className="w-12 bg-base-300"><img src="${photos.batperson}" /></div></Avatar>
  <Avatar><div className="w-12 bg-base-300"><img src="${photos.spiderperson}" /></div></Avatar>
  <Avatar><div className="w-12 bg-base-300"><img src="${photos.averagebulk}" /></div></Avatar>
  <Avatar><div className="w-12 bg-base-300"><img src="${photos.wonderperson}" /></div></Avatar>
</Avatar.Group>`}
        />

        <ExampleBlock
          title="Avatar group 通过数据渲染（数组，组件内部）"
          tab={tabGroupArray}
          preview={() => <Avatar.Group items={legacyGroupItems} className="-space-x-6" />}
          code={`const groupItems = [
  {
    children: (
      <div className="w-12 bg-base-300">
        <img src="${photos.batperson}" />
      </div>
    ),
  },
  {
    children: (
      <div className="w-12 bg-base-300">
        <img src="${photos.spiderperson}" />
      </div>
    ),
  },
  {
    children: (
      <div className="w-12 bg-base-300">
        <img src="${photos.averagebulk}" />
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
]

<Avatar.Group items={groupItems} className="-space-x-6" />`}
        />

        <ExampleBlock
          title="Avatar group with counter"
          tab={tabGroupCounter}
          preview={() => (
            <Avatar.Group className="-space-x-6">
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.batperson}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.spiderperson}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar>
                <div className="w-12 bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.averagebulk}
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
          )}
          code={`<Avatar.Group className="-space-x-6">
  <Avatar><div className="w-12 bg-base-300"><img src="${photos.batperson}" /></div></Avatar>
  <Avatar><div className="w-12 bg-base-300"><img src="${photos.spiderperson}" /></div></Avatar>
  <Avatar><div className="w-12 bg-base-300"><img src="${photos.averagebulk}" /></div></Avatar>
  <Avatar status="placeholder"><div className="w-12 bg-neutral text-neutral-content"><span>+99</span></div></Avatar>
</Avatar.Group>`}
        />

        <ExampleBlock
          title="Avatar with ring"
          tab={tabRing}
          preview={() => (
            <Avatar>
              <div className="w-24 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-base-100">
                <img
                  className="h-full w-full object-cover"
                  src={photos.spiderperson}
                  alt="Tailwind-CSS-Avatar-component"
                />
              </div>
            </Avatar>
          )}
          code={`<Avatar>
  <div className="w-24 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-base-100">
    <img src="${photos.spiderperson}" />
  </div>
</Avatar>`}
        />

        <ExampleBlock
          title="Avatar with presence indicator"
          tab={tabPresence}
          preview={() => (
            <div className="flex min-h-[6rem] max-w-4xl min-w-[18rem] flex-wrap items-center justify-center gap-3 rounded-box bg-base-100 p-4 xl:py-10">
              <Avatar status="online">
                <div className="w-24 rounded-full bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.gordon}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
              <Avatar status="offline">
                <div className="w-24 rounded-full bg-base-300">
                  <img
                    className="h-full w-full object-cover"
                    src={photos.idiotsandwich}
                    alt="Tailwind-CSS-Avatar-component"
                  />
                </div>
              </Avatar>
            </div>
          )}
          code={`<Avatar status="online"><div className="w-24 rounded-full bg-base-300"><img src="${photos.gordon}" /></div></Avatar>
<Avatar status="offline"><div className="w-24 rounded-full bg-base-300"><img src="${photos.idiotsandwich}" /></div></Avatar>`}
        />

        <ExampleBlock
          title="Avatar placeholder"
          tab={tabPlaceholder}
          preview={() => (
            <div className="flex min-h-[6rem] max-w-4xl min-w-[18rem] flex-wrap items-center justify-center gap-3 rounded-box bg-base-100 p-4 xl:py-10">
              <Avatar status="placeholder">
                <div className="w-24 rounded-full bg-neutral text-neutral-content">
                  <span className="text-3xl">D</span>
                </div>
              </Avatar>
              <Avatar status="online">
                <Avatar status="placeholder">
                  <div className="w-16 rounded-full bg-neutral text-neutral-content">
                    <span className="text-xl">AI</span>
                  </div>
                </Avatar>
              </Avatar>
              <Avatar status="placeholder">
                <div className="w-12 rounded-full bg-neutral text-neutral-content">
                  <span>SY</span>
                </div>
              </Avatar>
              <Avatar status="placeholder">
                <div className="w-8 rounded-full bg-neutral text-neutral-content">
                  <span className="text-xs">UI</span>
                </div>
              </Avatar>
            </div>
          )}
          code={`<Avatar status="placeholder"><div className="w-24 rounded-full bg-neutral text-neutral-content"><span className="text-3xl">D</span></div></Avatar>
<Avatar status="online"><Avatar status="placeholder"><div className="w-16 rounded-full bg-neutral text-neutral-content"><span className="text-xl">AI</span></div></Avatar></Avatar>
<Avatar status="placeholder"><div className="w-12 rounded-full bg-neutral text-neutral-content"><span>SY</span></div></Avatar>
<Avatar status="placeholder"><div className="w-8 rounded-full bg-neutral text-neutral-content"><span className="text-xs">UI</span></div></Avatar>`}
        />

        <h2 className="mt-12">API</h2>
        <p>Avatar 现在既能作为语义化组件使用，也能继续承载基础 children 插槽。</p>
        <ApiTable rows={avatarApiRows} />

        <h3 className="mt-8">Avatar.Group</h3>
        <ApiTable rows={avatarGroupApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default AvatarDemo
