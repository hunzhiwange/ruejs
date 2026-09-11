import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import Skeleton from '../../../packages/rue-design/src/components/skeleton/index'
import Tabs from '../../../packages/rue-design/src/components/tabs/index'
import { renderDesignPreview } from './preview-test-gate'

type PreviewTabMode = 'preview' | 'code'

interface ExampleBlockProps {
  title: string
  summary?: string
  tab: { value: PreviewTabMode }
  preview: () => any
  code: string
}

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

type ElementSize = 'sm' | 'md' | 'lg'
type ButtonShape = 'default' | 'square' | 'round' | 'circle'
type ImageAspect = 'video' | 'square'

interface FeedItem {
  id: string
  title: string
  summary: string
  meta: string
  badge: string
}

const elementSizes: ElementSize[] = ['sm', 'md', 'lg']
const buttonShapes: ButtonShape[] = ['default', 'square', 'round', 'circle']

const rootApiRows: ApiRow[] = [
  {
    prop: 'active',
    description: '开启 pulse 动画，用在组合骨架和独立元素上。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'as',
    description: '基础骨架根节点标签，仅原子模式下生效。',
    type: 'any',
    defaultValue: `'div'`,
  },
  {
    prop: 'avatar',
    description: '显示头像占位；传对象时可继续设置 size、shape、className、style。',
    type: 'boolean | SkeletonAvatarProps',
    defaultValue: 'false',
  },
  {
    prop: 'title',
    description: '显示标题占位；传对象时可设置 width、className、style。',
    type: 'boolean | SkeletonTitleProps',
    defaultValue: 'true',
  },
  {
    prop: 'paragraph',
    description: '显示段落占位；传对象时可设置 rows、width、rowClassName。',
    type: 'boolean | SkeletonParagraphProps',
    defaultValue: 'true',
  },
  {
    prop: 'loading',
    description: '为 false 时直接渲染 children；适合首屏加载切换。',
    type: 'boolean',
    defaultValue: '-',
  },
  {
    prop: 'round',
    description: '让 title 与 paragraph 的占位条使用圆角胶囊样式。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'rootClassName',
    description: '组合骨架根节点的附加 className。',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'classNames',
    description: '按 root/header/section/avatar/title/paragraph 精细注入类名。',
    type: 'SkeletonClassNames',
    defaultValue: '-',
  },
  {
    prop: 'styles',
    description: '按 root/header/section/avatar/title/paragraph 精细注入内联样式。',
    type: 'SkeletonStyles',
    defaultValue: '-',
  },
]

const textApiRows: ApiRow[] = [
  {
    prop: 'SkeletonTitleProps.width',
    description: '设置标题宽度，支持数字和字符串。',
    type: 'number | string',
    defaultValue: '-',
  },
  {
    prop: 'SkeletonParagraphProps.rows',
    description: '设置段落行数。',
    type: 'number',
    defaultValue: '2 或 3（按布局推断）',
  },
  {
    prop: 'SkeletonParagraphProps.width',
    description: '设置最后一行宽度，或传数组分别控制每一行宽度。',
    type: 'number | string | Array<number | string>',
    defaultValue: '-',
  },
  {
    prop: 'SkeletonParagraphProps.rowClassName',
    description: '给每一行骨架条追加类名。',
    type: 'string',
    defaultValue: '-',
  },
]

const elementApiRows: ApiRow[] = [
  {
    prop: 'Skeleton.Avatar',
    description: '支持 active、shape、size；适合头像、徽章、卡片头部占位。',
    type: 'shape: circle | square; size: number | xs | sm | md | lg | xl',
    defaultValue: 'shape=circle, size=md',
  },
  {
    prop: 'Skeleton.Button',
    description: '支持 active、block、shape、size；覆盖按钮宽度和外形演示。',
    type: 'shape: default | square | round | circle; size: number | xs | sm | md | lg | xl',
    defaultValue: 'shape=default, size=md',
  },
  {
    prop: 'Skeleton.Input',
    description: '支持 active、block、size；适合表单行和搜索框占位。',
    type: 'size: number | xs | sm | md | lg | xl; block?: boolean',
    defaultValue: 'size=md, block=false',
  },
  {
    prop: 'Skeleton.Image',
    description: '支持 active、aspect 与 children；默认提供图片占位图标。',
    type: 'aspect: square | video',
    defaultValue: 'aspect=video',
  },
  {
    prop: 'Skeleton.Node',
    description: '自定义节点骨架；可用 as、children、className、style 拼任意占位。',
    type: 'as?: any; children?: any',
    defaultValue: `as='div'`,
  },
]

const semanticApiRows: ApiRow[] = [
  {
    prop: 'classNames.root / styles.root',
    description: '控制整个组合骨架容器。',
    type: 'string / Record<string, any>',
    defaultValue: '-',
  },
  {
    prop: 'classNames.header / styles.header',
    description: '控制头像外层区域。',
    type: 'string / Record<string, any>',
    defaultValue: '-',
  },
  {
    prop: 'classNames.section / styles.section',
    description: '控制标题与段落所在内容区。',
    type: 'string / Record<string, any>',
    defaultValue: '-',
  },
  {
    prop: 'classNames.avatar / styles.avatar',
    description: '控制头像骨架本体。',
    type: 'string / Record<string, any>',
    defaultValue: '-',
  },
  {
    prop: 'classNames.title / styles.title',
    description: '控制标题骨架条。',
    type: 'string / Record<string, any>',
    defaultValue: '-',
  },
  {
    prop: 'classNames.paragraph / styles.paragraph',
    description: '控制段落骨架容器。单行样式仍通过 rowClassName 处理。',
    type: 'string / Record<string, any>',
    defaultValue: '-',
  },
]

const feedItems: FeedItem[] = [
  {
    id: 'ops',
    title: 'Ops broadcast draft',
    summary: '列表骨架保持卡片高度稳定，适合消息流、运营位和控制台概览。',
    meta: '2 分钟前更新',
    badge: 'ops',
  },
  {
    id: 'metrics',
    title: 'North star metrics',
    summary: '先用标题 + 两行段落锁定节奏，再在 loading=false 时切到真实内容。',
    meta: '刚刚同步',
    badge: 'metrics',
  },
  {
    id: 'docs',
    title: 'Skeleton API notes',
    summary: '当页面要连续渲染多张卡片时，批量骨架比单一 spinner 更稳，也更接近最终排版。',
    meta: '今晚 20:00 发布',
    badge: 'docs',
  },
]

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

const ExampleBlock: FC<ExampleBlockProps> = ({ title, summary, tab, preview, code }) => {
  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      {summary ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {title}</h2>
            <p className="m-0 text-sm opacity-70">{summary}</p>
          </div>
        </div>
      ) : (
        <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {title}</h2>
      )}
      <Tabs
        style="box"
        items={[
          { key: 'preview', label: '预览' },
          { key: 'code', label: 'JSX代码' },
        ]}
        activeKey={tab.value}
        onChange={key => (tab.value = key as PreviewTabMode)}
        className={summary ? 'mb-3 mt-4' : 'mb-3'}
      />
      {tab.value === 'preview' ? (
        renderDesignPreview(title, preview)
      ) : (
        <Code className="mt-2" lang="tsx" code={code} />
      )}
    </div>
  )
}

const DemoCard: FC<{ children?: any }> = ({ children }) => {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">{children}</div>
    </div>
  )
}

const SpreadChildren: FC<{ children?: any; [key: string]: any }> = ({ children, ...rest }) => {
  return <div {...rest}>{children}</div>
}

type DemoToggleButtonActive = boolean | (() => boolean)

const readDemoToggleActive = (active: DemoToggleButtonActive | undefined) =>
  typeof active === 'function' ? active() : !!active

const DemoToggleButton: FC<{
  active?: DemoToggleButtonActive
  onClick?: () => void
  children?: any
}> = props => {
  const active = () => readDemoToggleActive(props.active)

  return (
    <button
      className={`btn btn-xs ${active() ? 'btn-primary' : 'btn-outline'}`.trim()}
      type="button"
      aria-pressed={active() ? 'true' : 'false'}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

const ArticleContent: FC = () => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="avatar placeholder">
          <div className="flex w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
            <span className="block leading-none">R</span>
          </div>
        </div>
        <div>
          <div className="font-semibold">Rue Design Skeleton</div>
          <div className="text-sm opacity-70">让加载占位和最终内容保持同一版式节奏</div>
        </div>
      </div>
      <p className="text-sm leading-6 opacity-80">
        Skeleton
        适合先稳定布局，再逐步替换真实内容。主组件支持组合式占位，子组件用于拼装头像、按钮、输入框、图片与自定义节点。
      </p>
      <div className="flex flex-wrap gap-2">
        <span className="badge badge-primary badge-soft">loading</span>
        <span className="badge badge-secondary badge-soft">compound</span>
        <span className="badge badge-accent badge-soft">demo-ready</span>
      </div>
    </div>
  )
}

const FeedCard: FC<{ item: FeedItem }> = ({ item }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{item.title}</div>
          <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">
            {item.meta}
          </div>
        </div>
        <span className="badge badge-primary badge-soft">{item.badge}</span>
      </div>
      <p className="text-sm leading-6 text-base-content/75">{item.summary}</p>
    </div>
  )
}

const LoadingSwitchPreview: FC = () => {
  const contentLoading = ref(true)

  return (
    <DemoCard>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => (contentLoading.value = !contentLoading.value)}
          >
            {contentLoading.value ? '显示内容' : '重新加载'}
          </button>
          <span className="text-sm opacity-70">
            当前状态：{contentLoading.value ? '加载中' : '内容已展示'}
          </span>
        </div>
        <Skeleton
          loading={contentLoading.value}
          active
          avatar
          title={{ width: '46%' }}
          paragraph={{ rows: 3, width: ['100%', '100%', '68%'] }}
        >
          <ArticleContent />
        </Skeleton>
      </div>
    </DemoCard>
  )
}

const ListLayoutPreview: FC = () => {
  const listLoading = ref(true)

  return (
    <DemoCard>
      <div className="space-y-4" data-testid="skeleton-list-demo">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => (listLoading.value = !listLoading.value)}
          >
            {listLoading.value ? '显示列表' : '重新加载列表'}
          </button>
          <span className="text-sm opacity-70">批量骨架比单一 loading 更接近最终列表密度。</span>
        </div>

        <SpreadChildren className="space-y-3">
          {feedItems.map(item => (
            <div key={item.id} className="rounded-2xl border border-base-300 bg-base-100/70 p-4">
              <Skeleton
                loading={listLoading.value}
                active
                avatar
                title={{ width: '36%' }}
                paragraph={{ rows: 2, width: ['100%', '78%'] }}
              >
                <FeedCard item={item} />
              </Skeleton>
            </div>
          ))}
        </SpreadChildren>
      </div>
    </DemoCard>
  )
}

const SkeletonNodeDemoIcon: FC = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-6 w-6 fill-current opacity-70"
    aria-hidden="true"
    data-testid="skeleton-elements-node-icon"
  >
    <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v6A2.5 2.5 0 0 1 16.5 14H14v2.25h1.75a.75.75 0 0 1 0 1.5H14V19a.75.75 0 0 1-1.5 0v-1.25h-1V19a.75.75 0 0 1-1.5 0v-1.25H8.25a.75.75 0 0 1 0-1.5H10V14H7.5A2.5 2.5 0 0 1 5 11.5v-6Zm2.5-1A1 1 0 0 0 6.5 5.5v6a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-9Zm1.25 2.25a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5H9.5a.75.75 0 0 1-.75-.75Z" />
  </svg>
)

const SkeletonNodeDemoContent: FC = () => (
  <div className="flex items-center gap-3">
    <SkeletonNodeDemoIcon />
    <span>Node</span>
  </div>
)

const ElementVariantsPreview: FC = () => {
  const elementActive = ref(true)
  const elementBlock = ref(false)
  const elementSize = ref<ElementSize>('md')
  const avatarShape = ref<'circle' | 'square'>('circle')
  const buttonShape = ref<ButtonShape>('default')
  const imageAspect = ref<ImageAspect>('video')

  return (
    <DemoCard>
      <div className="space-y-5" data-testid="skeleton-elements-demo">
        <div className="flex flex-wrap items-center gap-2">
          <DemoToggleButton
            active={() => elementActive.value}
            onClick={() => (elementActive.value = !elementActive.value)}
          >
            {elementActive.value ? '关闭 active' : '开启 active'}
          </DemoToggleButton>
          <DemoToggleButton
            active={() => elementBlock.value}
            onClick={() => (elementBlock.value = !elementBlock.value)}
          >
            {elementBlock.value ? '关闭 block' : '开启 block'}
          </DemoToggleButton>
          <DemoToggleButton
            active={() => avatarShape.value === 'circle'}
            onClick={() =>
              (avatarShape.value = avatarShape.value === 'circle' ? 'square' : 'circle')
            }
          >
            {`Avatar: ${avatarShape.value}`}
          </DemoToggleButton>
          <DemoToggleButton
            active={() => imageAspect.value === 'video'}
            onClick={() => (imageAspect.value = imageAspect.value === 'video' ? 'square' : 'video')}
          >
            {`Image: ${imageAspect.value}`}
          </DemoToggleButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SpreadChildren className="flex flex-wrap items-center gap-2">
            {elementSizes
              .map(size => ({ size, active: elementSize.value === size }))
              .map(option => (
                <DemoToggleButton
                  key={`${option.size}-${option.active}`}
                  active={option.active}
                  onClick={() => (elementSize.value = option.size)}
                >
                  {`size: ${option.size}`}
                </DemoToggleButton>
              ))}
          </SpreadChildren>
          <SpreadChildren className="flex flex-wrap items-center gap-2">
            {buttonShapes
              .map(shape => ({ shape, active: buttonShape.value === shape }))
              .map(option => (
                <DemoToggleButton
                  key={`${option.shape}-${option.active}`}
                  active={option.active}
                  onClick={() => (buttonShape.value = option.shape)}
                >
                  {`button: ${option.shape}`}
                </DemoToggleButton>
              ))}
          </SpreadChildren>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton.Avatar
                active={elementActive.value}
                size={elementSize.value}
                shape={avatarShape.value}
              />
              <Skeleton.Avatar active={elementActive.value} size="xl" shape={avatarShape.value} />
              <Skeleton.Button
                active={elementActive.value}
                size={elementSize.value}
                shape={buttonShape.value}
              />
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
                Button / Input block
              </div>
              <div className="mt-3 space-y-3">
                <Skeleton.Button
                  active={elementActive.value}
                  size={elementSize.value}
                  shape={buttonShape.value}
                  block={elementBlock.value}
                />
                <Skeleton.Input
                  active={elementActive.value}
                  size={elementSize.value}
                  block={elementBlock.value}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div data-testid="skeleton-elements-image-wrap">
              <Skeleton.Image
                active={() => elementActive.value}
                aspect={() => imageAspect.value}
                className="w-full"
                data-testid="skeleton-elements-image"
              />
            </div>
            <div data-testid="skeleton-elements-node-wrap">
              <Skeleton.Node
                active={() => elementActive.value}
                className="h-28 text-xs font-semibold uppercase tracking-[0.24em] text-base-content/45"
                data-testid="skeleton-elements-node"
              >
                <SkeletonNodeDemoContent />
              </Skeleton.Node>
            </div>
          </div>
        </div>
      </div>
    </DemoCard>
  )
}

const SkeletonPage: FC = () => {
  const tabs = {
    basic: ref<PreviewTabMode>('preview'),
    circle: ref<PreviewTabMode>('preview'),
    rectangle: ref<PreviewTabMode>('preview'),
    text: ref<PreviewTabMode>('preview'),
    composition: ref<PreviewTabMode>('preview'),
    loading: ref<PreviewTabMode>('preview'),
    list: ref<PreviewTabMode>('preview'),
    elements: ref<PreviewTabMode>('preview'),
    semantic: ref<PreviewTabMode>('preview'),
    round: ref<PreviewTabMode>('preview'),
  }

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Skeleton 骨架屏</h1>
        <p className="mt-3 mb-3 text-sm">
          Skeleton 用于展示加载中的占位内容。组件使用 Rue 当前的原子骨架视觉，同时补充更接近
          成熟业务骨架屏的组合 API、元素级用法和更细的语义定制入口。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>接口返回前需要先锁定卡片、列表、详情页等最终布局。</li>
          <li>首屏信息量较多，比单一 loading 更需要可预期的内容节奏。</li>
          <li>需要在组合骨架和原子骨架之间切换，用同一套视觉语言拼出不同页面。</li>
        </ul>

        <div className="not-prose mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              整合基础示例
            </div>
            <div className="mt-2 text-sm font-medium">基础方块、圆形内容、文本行都还在</div>
            <p className="mt-2 text-sm opacity-70">
              基础 Rue 示例不删除，只是按“原子骨架 / 组合骨架 / 元素 API”重组。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-secondary">
              语义 API
            </div>
            <div className="mt-2 text-sm font-medium">组合骨架、独立元素、列表加载一套打通</div>
            <p className="mt-2 text-sm opacity-70">
              使用 avatar/title/paragraph/loading/round，并补上语义槽位 classNames/styles。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-accent">
              保持 Rue 风格
            </div>
            <p className="mt-2 text-sm opacity-70">
              仍然用 Rue 当前 daisyUI 底色，只做布局能力和示例 丰富度增强。
            </p>
          </div>
        </div>

        <div className="not-prose mt-8 space-y-2">
          <h2 className="text-2xl font-semibold">原子骨架</h2>
          <p className="text-sm text-base-content/70">
            这些用法保持当前示例，适合直接拼局部占位或自定义布局骨架。
          </p>
        </div>

        <ExampleBlock
          title="Skeleton"
          tab={tabs.basic}
          preview={() => (
            <DemoCard>
              <Skeleton className="h-32 w-32" data-testid="skeleton-basic" />
            </DemoCard>
          )}
          code={`<Skeleton className="h-32 w-32" />`}
        />

        <ExampleBlock
          title="Skeleton circle with content"
          tab={tabs.circle}
          preview={() => (
            <DemoCard>
              <div className="flex w-52 flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
                  <div className="flex flex-col gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
                <Skeleton className="h-32 w-full" />
              </div>
            </DemoCard>
          )}
          code={`<div className="flex w-52 flex-col gap-4">
  <div className="flex items-center gap-4">
    <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-28" />
    </div>
  </div>
  <Skeleton className="h-32 w-full" />
</div>`}
        />

        <ExampleBlock
          title="Skeleton rectangle with content"
          tab={tabs.rectangle}
          preview={() => (
            <DemoCard>
              <div className="flex w-52 flex-col gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </DemoCard>
          )}
          code={`<div className="flex w-52 flex-col gap-4">
  <Skeleton className="h-32 w-full" />
  <Skeleton className="h-4 w-28" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-full" />
</div>`}
        />

        <ExampleBlock
          title="Skeleton text"
          tab={tabs.text}
          preview={() => (
            <DemoCard>
              <Skeleton as="span" text data-testid="skeleton-text-demo">
                AI is thinking harder...
              </Skeleton>
            </DemoCard>
          )}
          code={`<Skeleton as="span" text>
  AI is thinking harder...
</Skeleton>`}
        />

        <div className="not-prose mt-10 space-y-2">
          <h2 className="text-2xl font-semibold">组合骨架</h2>
          <p className="text-sm text-base-content/70">
            主要场景：复杂内容组合、children 切换、列表加载，以及圆角行样式。
          </p>
        </div>

        <ExampleBlock
          title="Composition API"
          tab={tabs.composition}
          preview={() => (
            <DemoCard>
              <div className="space-y-6">
                <Skeleton
                  avatar
                  active
                  paragraph={{ rows: 4 }}
                  data-testid="skeleton-composition-default"
                />
                <Skeleton
                  avatar={{ shape: 'square', size: 'xl' }}
                  title={{ width: '42%' }}
                  paragraph={{ rows: 3, width: ['100%', '100%', '72%'] }}
                />
              </div>
            </DemoCard>
          )}
          code={`<div className="space-y-6">
  <Skeleton avatar active paragraph={{ rows: 4 }} />

  <Skeleton
    avatar={{ shape: 'square', size: 'xl' }}
    title={{ width: '42%' }}
    paragraph={{ rows: 3, width: ['100%', '100%', '72%'] }}
  />
</div>`}
        />

        <ExampleBlock
          title="Loading Switch"
          tab={tabs.loading}
          preview={() => <LoadingSwitchPreview />}
          code={`const loading = ref(true)

<button type="button" className="btn btn-sm btn-primary" onClick={() => (loading.value = !loading.value)}>
  {loading.value ? '显示内容' : '重新加载'}
</button>

<Skeleton
  loading={loading.value}
  active
  avatar
  title={{ width: '46%' }}
  paragraph={{ rows: 3, width: ['100%', '100%', '68%'] }}
>
  <ArticleContent />
</Skeleton>`}
        />

        <ExampleBlock
          title="List Layout"
          tab={tabs.list}
          preview={() => <ListLayoutPreview />}
          code={`const SpreadChildren: FC<{ children?: any; [key: string]: any }> = ({ children, ...rest }) => (
  <div {...rest}>{children}</div>
)

const listLoading = ref(true)

<SpreadChildren className="space-y-3">
  {feedItems.map(item => (
    <div key={item.id} className="rounded-2xl border border-base-300 bg-base-100/70 p-4">
      <Skeleton
        loading={listLoading.value}
        active
        avatar
        title={{ width: '36%' }}
        paragraph={{ rows: 2, width: ['100%', '78%'] }}
      >
        <FeedCard item={item} />
      </Skeleton>
    </div>
  ))}
</SpreadChildren>`}
        />

        <ExampleBlock
          title="Rounded Rows"
          tab={tabs.round}
          preview={() => (
            <DemoCard>
              <div className="space-y-6">
                <Skeleton
                  round
                  title={{ width: '36%' }}
                  paragraph={{ rows: 4, width: ['100%', '100%', '92%', '58%'] }}
                />
                <Skeleton
                  round
                  avatar={{ size: 'xl' }}
                  title={{ width: 180 }}
                  paragraph={{ rows: 2, width: [260, 180] }}
                />
              </div>
            </DemoCard>
          )}
          code={`<div className="space-y-6">
  <Skeleton
    round
    title={{ width: '36%' }}
    paragraph={{ rows: 4, width: ['100%', '100%', '92%', '58%'] }}
  />

  <Skeleton
    round
    avatar={{ size: 'xl' }}
    title={{ width: 180 }}
    paragraph={{ rows: 2, width: [260, 180] }}
  />
</div>`}
        />

        <ExampleBlock
          title="Semantic slots"
          tab={tabs.semantic}
          preview={() => (
            <DemoCard>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem] xl:items-start">
                <Skeleton
                  active
                  avatar={{ size: 'xl' }}
                  title={{ width: '40%' }}
                  paragraph={{ rows: 3, width: ['100%', '92%', '68%'] }}
                  rootClassName="overflow-hidden"
                  classNames={{
                    root: 'rounded-[1.75rem] border border-primary/10 bg-linear-to-br from-primary/6 via-base-100 to-secondary/10 p-5',
                    header: 'pt-1',
                    section: 'gap-4',
                    avatar: 'ring-1 ring-primary/10',
                    title: 'h-5 rounded-full bg-primary/20',
                    paragraph: 'gap-2.5',
                  }}
                  styles={{
                    title: { boxShadow: 'inset 0 0 0 1px rgb(14 116 144 / 0.08)' },
                    paragraph: { paddingTop: '0.125rem' },
                  }}
                  data-testid="skeleton-semantic-demo"
                />

                <ul className="list rounded-2xl border border-base-300 bg-base-200/40 p-4 text-sm">
                  <li className="list-row">
                    <span className="font-medium">语义槽位</span>
                    <span className="list-col-grow text-base-content/70">
                      只改 root/header/section/avatar/title/paragraph，不必重写组件结构。
                    </span>
                  </li>
                  <li className="list-row">
                    <span className="font-medium">适合</span>
                    <span className="list-col-grow text-base-content/70">
                      营销页首屏、品牌卡片、仪表盘重点模块。
                    </span>
                  </li>
                </ul>
              </div>
            </DemoCard>
          )}
          code={`<Skeleton
  active
  avatar={{ size: 'xl' }}
  title={{ width: '40%' }}
  paragraph={{ rows: 3, width: ['100%', '92%', '68%'] }}
  rootClassName="overflow-hidden"
  classNames={{
    root: 'rounded-[1.75rem] border border-primary/10 bg-linear-to-br from-primary/6 via-base-100 to-secondary/10 p-5',
    header: 'pt-1',
    section: 'gap-4',
    avatar: 'ring-1 ring-primary/10',
    title: 'h-5 rounded-full bg-primary/20',
    paragraph: 'gap-2.5',
  }}
  styles={{
    title: { boxShadow: 'inset 0 0 0 1px rgb(14 116 144 / 0.08)' },
    paragraph: { paddingTop: '0.125rem' },
  }}
/>`}
        />

        <div className="not-prose mt-10 space-y-2">
          <h2 className="text-2xl font-semibold">元素 API</h2>
          <p className="text-sm text-base-content/70">
            提供一组 Button / Avatar / Input / Image / Node 示范，但使用 Rue 自己的视觉基底。
          </p>
        </div>

        <ExampleBlock
          title="Element Variants"
          tab={tabs.elements}
          preview={() => <ElementVariantsPreview />}
          code={`const active = ref(true)
const block = ref(false)
const size = ref<'sm' | 'md' | 'lg'>('md')
const buttonShape = ref<'default' | 'square' | 'round' | 'circle'>('default')
const avatarShape = ref<'circle' | 'square'>('circle')
const imageAspect = ref<'video' | 'square'>('video')

const NodeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current opacity-70" aria-hidden="true">
    <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v6A2.5 2.5 0 0 1 16.5 14H14v2.25h1.75a.75.75 0 0 1 0 1.5H14V19a.75.75 0 0 1-1.5 0v-1.25h-1V19a.75.75 0 0 1-1.5 0v-1.25H8.25a.75.75 0 0 1 0-1.5H10V14H7.5A2.5 2.5 0 0 1 5 11.5v-6Zm2.5-1A1 1 0 0 0 6.5 5.5v6a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-9Zm1.25 2.25a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5H9.5a.75.75 0 0 1-.75-.75Z" />
  </svg>
)

<Skeleton.Avatar active={active.value} size={size.value} shape={avatarShape.value} />
<Skeleton.Button active={active.value} size={size.value} shape={buttonShape.value} block={block.value} />
<Skeleton.Input active={active.value} size={size.value} block={block.value} />
<div>
  <Skeleton.Image active={() => active.value} aspect={() => imageAspect.value} className="w-full" />
</div>
<div>
  <Skeleton.Node active={() => active.value} className="h-28 text-xs font-semibold uppercase tracking-[0.24em] text-base-content/45">
    <NodeIcon />
  </Skeleton.Node>
</div>`}
        />

        <div className="not-prose mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">API</h2>
          <p className="text-sm text-base-content/70">
            根组件提供常见的组合式参数，同时支持 Rue 基础的原子骨架写法。
            <code>rootClassName</code>、<code>classNames</code> 和 <code>styles</code>{' '}
            可用于只改局部槽位，不影响整棵骨架的默认结构。
          </p>
        </div>

        <h3>Skeleton</h3>
        <ApiTable rows={rootApiRows} />

        <h3>Title / Paragraph</h3>
        <ApiTable rows={textApiRows} />

        <h3>Avatar / Button / Input / Image / Node</h3>
        <ApiTable rows={elementApiRows} />

        <h3>Semantic Slots</h3>
        <ApiTable rows={semanticApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default SkeletonPage
