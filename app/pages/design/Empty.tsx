import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Button, Empty } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
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

const SVG_NEUTRAL_CLASS = 'text-base-content'
const SVG_ACCENT_CLASS = 'text-primary'

const svgFillMixStyle = (strength: number) => ({
  fill: `color-mix(in oklab, currentColor ${strength}%, transparent)`,
})

const svgStrokeMixStyle = (strength: number) => ({
  stroke: `color-mix(in oklab, currentColor ${strength}%, transparent)`,
})

const SyncRackIllustration = () => (
  <svg
    viewBox="0 0 180 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-[12rem] max-w-full"
  >
    <rect
      x="18"
      y="22"
      width="144"
      height="96"
      rx="24"
      className={SVG_NEUTRAL_CLASS}
      style={svgFillMixStyle(8)}
    />
    <rect
      x="18.75"
      y="22.75"
      width="142.5"
      height="94.5"
      rx="23.25"
      className={SVG_NEUTRAL_CLASS}
      style={svgStrokeMixStyle(18)}
      strokeWidth="1.5"
    />
    <rect
      x="34"
      y="36"
      width="112"
      height="14"
      rx="7"
      className={SVG_NEUTRAL_CLASS}
      style={svgFillMixStyle(14)}
    />
    <rect
      x="38"
      y="62"
      width="34"
      height="34"
      rx="12"
      className={SVG_ACCENT_CLASS}
      style={svgFillMixStyle(14)}
    />
    <rect
      x="46"
      y="70"
      width="18"
      height="18"
      rx="9"
      className={SVG_ACCENT_CLASS}
      style={svgFillMixStyle(34)}
    />
    <rect
      x="79"
      y="62"
      width="62"
      height="10"
      rx="5"
      className={SVG_NEUTRAL_CLASS}
      style={svgFillMixStyle(14)}
    />
    <rect
      x="79"
      y="82"
      width="48"
      height="10"
      rx="5"
      className={SVG_ACCENT_CLASS}
      style={svgFillMixStyle(14)}
    />
    <path
      d="M52 108c8.4-8.2 16.3-12.3 23.8-12.3 7.8 0 15.7 4.1 23.7 12.3"
      className={SVG_NEUTRAL_CLASS}
      style={svgStrokeMixStyle(16)}
      strokeWidth="5"
      strokeLinecap="round"
    />
    <circle cx="132" cy="54" r="10" className={SVG_NEUTRAL_CLASS} style={svgFillMixStyle(14)} />
    <path
      d="M128 54h8M132 50v8"
      className={SVG_ACCENT_CLASS}
      style={svgStrokeMixStyle(66)}
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
)

const basicTab = ref<PreviewTabMode>('preview')
const presetTab = ref<PreviewTabMode>('preview')
const customTab = ref<PreviewTabMode>('preview')
const embeddedTab = ref<PreviewTabMode>('preview')

const apiRows: ApiRow[] = [
  {
    prop: 'image',
    description: '空状态插画，支持字符串地址、预设插画组件函数或任意 JSX 节点。',
    type: 'string | FC | any',
    defaultValue: 'Empty.PRESENTED_IMAGE_DEFAULT',
  },
  {
    prop: 'description',
    description: '文案区，可传字符串、富文本节点；显式传 false / null 可隐藏。',
    type: 'any',
    defaultValue: '暂无数据',
  },
  {
    prop: 'children',
    description: '底部动作区，适合放按钮、链接、过滤器重置等后续动作。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'imageStyle / imageAlt',
    description: '控制插画容器样式与 img 的 alt 文案，支持字符串图片场景。',
    type: 'any / string',
    defaultValue: '- / empty',
  },
  {
    prop: 'size',
    description:
      '统一调整容器、插画与文案尺度，支持 sm / md / lg 及 small / default / large 别名。',
    type: "'sm' | 'md' | 'lg' | 'small' | 'default' | 'large'",
    defaultValue: 'md',
  },
  {
    prop: 'align',
    description: '内容布局方向，支持居中空态和左对齐嵌入式空态。',
    type: "'center' | 'start'",
    defaultValue: 'center',
  },
  {
    prop: 'variant',
    description: 'Rue 风格表面层级，适合页面主空态、嵌入卡片与轻量占位区。',
    type: "'surface' | 'soft' | 'outline'",
    defaultValue: 'surface',
  },
  {
    prop: 'className / rootClassName / style',
    description: '根节点扩展类名和样式，rootClassName 便于支持项目代码中的根节点类名分工。',
    type: 'string / string / any',
    defaultValue: '-',
  },
  {
    prop: 'classNames / styles',
    description: '语义插槽扩展，覆盖 root、image、description、footer 四个区域。',
    type: 'object / object',
    defaultValue: '-',
  },
  {
    prop: 'role',
    description: '根节点无障碍角色，默认以 status 暴露空状态反馈。',
    type: 'string',
    defaultValue: 'status',
  },
]

const staticRows: ApiRow[] = [
  {
    prop: 'Empty.PRESENTED_IMAGE_DEFAULT',
    description: '默认插画，适合页面级空状态。可直接作为 image 传入，或单独渲染。',
    type: 'FC<EmptyPresentedImageProps>',
    defaultValue: '-',
  },
  {
    prop: 'Empty.PRESENTED_IMAGE_SIMPLE',
    description: '简洁插画，适合表格、筛选区和紧凑卡片。',
    type: 'FC<EmptyPresentedImageProps>',
    defaultValue: '-',
  },
]

const basicCode = `import { Button, Empty } from '@rue-js/design'<div className="rounded-[2rem] border border-base-300/70 bg-base-100 p-4 sm:p-6">
  <Empty description="当前筛选条件下还没有上线中的条目。你可以放宽条件，或者直接创建新内容。">
    <Button color="primary" size="sm">
      创建条目
    </Button>
    <Button type="outlined" size="sm">
      重置筛选
    </Button>
  </Empty>
</div>
`

const presetCode = `import { Button, Empty } from '@rue-js/design'<div className="grid gap-4 xl:grid-cols-3">
  <Empty size="sm" description="默认插画适合页面主体空态。" />

  <Empty
    size="sm"
    variant="soft"
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description="简洁插画适合表格、筛选或紧凑容器。"
  />

  <Empty
    size="sm"
    align="start"
    variant="outline"
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description="outline 更适合嵌入次级区域。"
  >
    <Button type="outlined" size="sm">
      查看模板
    </Button>
  </Empty>
</div>
`

const customCode = `import { Button, Empty } from '@rue-js/design'
const SVG_NEUTRAL_CLASS = 'text-base-content'
const SVG_ACCENT_CLASS = 'text-primary'

const svgFillMixStyle = (strength: number) => ({
  fill: \`color-mix(in oklab, currentColor ${'${strength}'}%, transparent)\`,
})

const svgStrokeMixStyle = (strength: number) => ({
  stroke: \`color-mix(in oklab, currentColor ${'${strength}'}%, transparent)\`,
})

const SyncRackIllustration = () => (
  <svg
    viewBox="0 0 180 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-[12rem] max-w-full"
  >
    <rect
      x="18"
      y="22"
      width="144"
      height="96"
      rx="24"
      className={SVG_NEUTRAL_CLASS}
      style={svgFillMixStyle(8)}
    />
    <rect
      x="18.75"
      y="22.75"
      width="142.5"
      height="94.5"
      rx="23.25"
      className={SVG_NEUTRAL_CLASS}
      style={svgStrokeMixStyle(18)}
      strokeWidth="1.5"
    />
    <rect x="34" y="36" width="112" height="14" rx="7" className={SVG_NEUTRAL_CLASS} style={svgFillMixStyle(14)} />
    <rect x="38" y="62" width="34" height="34" rx="12" className={SVG_ACCENT_CLASS} style={svgFillMixStyle(14)} />
    <rect x="46" y="70" width="18" height="18" rx="9" className={SVG_ACCENT_CLASS} style={svgFillMixStyle(34)} />
    <rect x="79" y="62" width="62" height="10" rx="5" className={SVG_NEUTRAL_CLASS} style={svgFillMixStyle(14)} />
    <rect x="79" y="82" width="48" height="10" rx="5" className={SVG_ACCENT_CLASS} style={svgFillMixStyle(14)} />
    <path
      d="M52 108c8.4-8.2 16.3-12.3 23.8-12.3 7.8 0 15.7 4.1 23.7 12.3"
      className={SVG_NEUTRAL_CLASS}
      style={svgStrokeMixStyle(16)}
      strokeWidth="5"
      strokeLinecap="round"
    />
    <circle cx="132" cy="54" r="10" className={SVG_NEUTRAL_CLASS} style={svgFillMixStyle(14)} />
    <path
      d="M128 54h8M132 50v8"
      className={SVG_ACCENT_CLASS}
      style={svgStrokeMixStyle(66)}
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
)

<div className="rounded-[2rem] border border-base-300/70 bg-base-100 p-6">
  <Empty
    align="start"
    size="large"
    image={<SyncRackIllustration />}
    description={
      <div className="space-y-2">
        <div className="text-base font-semibold text-base-content">同步队列还是空的</div>
        <div>把素材从个人工作台加入同步清单后，这里会自动生成批次并持续追踪状态。</div>
      </div>
    }
    classNames={{ footer: 'justify-start' }}
  >
    <Button color="primary">添加首批素材</Button>
    <Button type="outlined">查看同步规则</Button>
  </Empty>
</div>
`

const embeddedCode = `import { Button, Empty } from '@rue-js/design'<div className="grid gap-4 xl:grid-cols-2">
  <div className="rounded-[1.75rem] border border-base-300/70 bg-base-100 p-4">
    <div className="mb-3 flex items-center justify-between text-sm text-base-content/65">
      <span>成员视图</span>
      <span className="badge badge-ghost badge-sm">0 records</span>
    </div>
    <Empty
      align="start"
      size="sm"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="筛选结果为空，先移除状态过滤器再试一次。"
      styles={{
        root: { paddingTop: '1.25rem', paddingBottom: '1.25rem' },
        description: { maxWidth: '18rem' },
      }}
      classNames={{ footer: 'justify-start' }}
    >
      <Button size="sm" type="outlined">
        清空筛选
      </Button>
    </Empty>
  </div>

  <div className="rounded-[1.75rem] border border-base-300/70 bg-base-100 p-4">
    <div className="mb-3 flex items-center justify-between text-sm text-base-content/65">
      <span>素材库</span>
      <span className="badge badge-outline badge-sm">草稿区</span>
    </div>
    <Empty
      size="sm"
      variant="soft"
      image={false}
      description="这里也可以只保持文案与动作区，不一定强制带插画。"
      classNames={{
        root: 'border-0 bg-transparent px-0 py-2 shadow-none',
        footer: 'justify-start',
      }}
    >
      <Button size="sm" color="primary">
        上传文件
      </Button>
      <Button size="sm" type="outlined">
        从模板创建
      </Button>
    </Empty>
  </div>
</div>
`

const EmptyDemo: FC = () => {
  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Empty 空状态</h1>
        <p className="text-sm mt-3 mb-3">
          Empty 用来承接列表、筛选、面板和工作流中的无数据状态。它保持了 Rue
          一贯的轻量卡片语言，同时提供了空状态组件最核心的 image、description、children
          和预设插画能力。
        </p>
        <p className="text-sm opacity-75">
          组件提供可复用的空态表达：默认插画适合页面主体，simple
          插画适合嵌入式空态，语义插槽则方便你在卡片、筛选器、列表面板里继续细调样式。
        </p>

        <PreviewBlock
          title="基础空状态"
          summary="默认插画、文案和动作区已经能覆盖大多数页面级空态。"
          tab={basicTab}
          preview={() => (
            <div className="rounded-[2rem] border border-base-300/70 bg-base-100 p-4 sm:p-6">
              <Empty description="当前筛选条件下还没有上线中的条目。你可以放宽条件，或者直接创建新内容。">
                <Button color="primary" size="sm">
                  创建条目
                </Button>
                <Button type="outlined" size="sm">
                  重置筛选
                </Button>
              </Empty>
            </div>
          )}
          code={basicCode}
        />

        <PreviewBlock
          title="预设插画与变体"
          summary="default 与 simple 两套预设插画覆盖页面主空态和紧凑容器；surface、soft、outline 对应不同层级。"
          tab={presetTab}
          preview={() => (
            <div className="grid gap-4 xl:grid-cols-3">
              <Empty size="sm" description="默认插画适合页面主体空态。" />

              <Empty
                size="sm"
                variant="soft"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="简洁插画适合表格、筛选或紧凑容器。"
              />

              <Empty
                size="sm"
                align="start"
                variant="outline"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="outline 更适合嵌入次级区域。"
              >
                <Button type="outlined" size="sm">
                  查看模板
                </Button>
              </Empty>
            </div>
          )}
          code={presetCode}
        />

        <PreviewBlock
          title="自定义插画与左对齐布局"
          summary="需要更贴近业务语义时，可以直接传自定义节点，并切到 start 布局承接更多说明。"
          tab={customTab}
          preview={() => (
            <div className="rounded-[2rem] border border-base-300/70 bg-base-100 p-6">
              <Empty
                align="start"
                size="large"
                image={<SyncRackIllustration />}
                description={
                  <div className="space-y-2">
                    <div className="text-base font-semibold text-base-content">
                      同步队列还是空的
                    </div>
                    <div>把素材从个人工作台加入同步清单后，这里会自动生成批次并持续追踪状态。</div>
                  </div>
                }
                classNames={{ footer: 'justify-start' }}
              >
                <Button color="primary">添加首批素材</Button>
                <Button type="outlined">查看同步规则</Button>
              </Empty>
            </div>
          )}
          code={customCode}
        />

        <PreviewBlock
          title="嵌入式空态与语义插槽"
          summary="classNames 和 styles 让 empty 可以自然嵌进列表、筛选面板和卡片，而不需要额外包一层 if。"
          tab={embeddedTab}
          preview={() => (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1.75rem] border border-base-300/70 bg-base-100 p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-base-content/65">
                  <span>成员视图</span>
                  <span className="badge badge-ghost badge-sm">0 records</span>
                </div>
                <Empty
                  align="start"
                  size="sm"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="筛选结果为空，先移除状态过滤器再试一次。"
                  styles={{
                    root: { paddingTop: '1.25rem', paddingBottom: '1.25rem' },
                    description: { maxWidth: '18rem' },
                  }}
                  classNames={{ footer: 'justify-start' }}
                >
                  <Button size="sm" type="outlined">
                    清空筛选
                  </Button>
                </Empty>
              </div>

              <div className="rounded-[1.75rem] border border-base-300/70 bg-base-100 p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-base-content/65">
                  <span>素材库</span>
                  <span className="badge badge-outline badge-sm">草稿区</span>
                </div>
                <Empty
                  size="sm"
                  variant="soft"
                  image={false}
                  description="这里也可以只保持文案与动作区，不一定强制带插画。"
                  classNames={{
                    root: 'border-0 bg-transparent px-0 py-2 shadow-none',
                    footer: 'justify-start',
                  }}
                >
                  <Button size="sm" color="primary">
                    上传文件
                  </Button>
                  <Button size="sm" type="outlined">
                    从模板创建
                  </Button>
                </Empty>
              </div>
            </div>
          )}
          code={embeddedCode}
        />

        <h2>API</h2>
        <p className="text-sm opacity-75">
          保持易接入的属性组织方式，同时补一层更贴近 Rue 页面编排的尺寸、变体和语义插槽。
        </p>
        <ApiTable rows={apiRows} />

        <h2>静态成员</h2>
        <p className="text-sm opacity-75">
          预设插画可以直接作为 image 传入，也可以在别的容器里独立复用。
        </p>
        <ApiTable rows={staticRows} />
      </div>
    </SidebarPlayground>
  )
}

export default EmptyDemo
