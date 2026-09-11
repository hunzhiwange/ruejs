import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Badge, Button, Result, Tabs } from '@rue-js/design'
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

const RocketIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-10"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.5 4.5c-3 0-6 2.6-7.4 6.2l2.2 2.2c3.6-1.4 6.2-4.4 6.2-7.4Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.3 5.7 18.2 10.6" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m10.6 13.4-3.4 3.4a2.2 2.2 0 0 1-3.1 0l-.9-.9a2.2 2.2 0 0 1 0-3.1l3.4-3.4"
    />
    <circle cx="14.6" cy="9.4" r="1.3" />
  </svg>
)

const CompassIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-10"
  >
    <circle cx="12" cy="12" r="8.5" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m15.7 8.3-2.8 6.3-6.3 2.8 2.8-6.3 6.3-2.8Z"
    />
  </svg>
)

const ShieldWaveIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-10"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3 5 6v5c0 4.3 2.6 8.3 7 10 4.4-1.7 7-5.7 7-10V6l-7-3Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.5 12.5c1.2-1 2.3-1.5 3.5-1.5s2.3.5 3.5 1.5"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.5 9.8c1.2-1 2.3-1.5 3.5-1.5s2.3.5 3.5 1.5"
    />
  </svg>
)

const rocketIconCode = `const RocketIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-10"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 4.5c-3 0-6 2.6-7.4 6.2l2.2 2.2c3.6-1.4 6.2-4.4 6.2-7.4Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.3 5.7 18.2 10.6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m10.6 13.4-3.4 3.4a2.2 2.2 0 0 1-3.1 0l-.9-.9a2.2 2.2 0 0 1 0-3.1l3.4-3.4" />
    <circle cx="14.6" cy="9.4" r="1.3" />
  </svg>
)`

const compassIconCode = `const CompassIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-10"
  >
    <circle cx="12" cy="12" r="8.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.7 8.3-2.8 6.3-6.3 2.8 2.8-6.3 6.3-2.8Z" />
  </svg>
)`

const shieldWaveIconCode = `const ShieldWaveIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-10"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.3 2.6 8.3 7 10 4.4-1.7 7-5.7 7-10V6l-7-3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5c1.2-1 2.3-1.5 3.5-1.5s2.3.5 3.5 1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 9.8c1.2-1 2.3-1.5 3.5-1.5s2.3.5 3.5 1.5" />
  </svg>
)`

const basicTab = ref<TabMode>('preview')
const exceptionTab = ref<TabMode>('preview')
const extraTab = ref<TabMode>('preview')
const customTab = ref<TabMode>('preview')
const variantTab = ref<TabMode>('preview')
const presentedImageTab = ref<TabMode>('preview')

const apiRows: ApiRow[] = [
  {
    prop: 'align',
    description: '内容对齐方式，支持居中展示或左对齐的流程详情布局',
    type: "'center' | 'start'",
    defaultValue: 'center',
  },
  {
    prop: 'bodyClassName / bodyStyle',
    description: 'children 内容面板的类名与样式',
    type: 'string / any',
    defaultValue: '-',
  },
  {
    prop: 'bordered',
    description: '是否显示边框；outline 变体会强制保持边框视觉',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'children',
    description: '结果页下方的扩展说明区域，可放详情、表单或下一步信息',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'contentClassName / contentStyle',
    description: '内部纵向布局容器的类名与样式',
    type: 'string / any',
    defaultValue: '-',
  },
  {
    prop: 'extra',
    description: '操作区，可传单个节点或按钮数组',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'icon',
    description: '自定义图标或插画；传 null / false 可隐藏图标区',
    type: 'any',
    defaultValue: '按 status 自动生成',
  },
  {
    prop: 'showIcon',
    description: '显式控制默认图标区显隐',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'size',
    description: '控制标题、图标和异常插画尺寸',
    type: "'sm' | 'md' | 'lg'",
    defaultValue: 'md',
  },
  {
    prop: 'status',
    description: '语义状态，支持操作结果与 403/404/500 异常页',
    type: "'success' | 'info' | 'warning' | 'error' | 403 | 404 | 500 | '403' | '404' | '500'",
    defaultValue: 'info',
  },
  {
    prop: 'subTitle',
    description: '辅助说明文案；403/404/500 未传时会自动补默认副标题',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'title',
    description: '主标题；403/404/500 未传时会自动补默认标题',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'variant',
    description: 'Rue 风格外观，适配仪表盘、表单完成态与空页面',
    type: "'surface' | 'soft' | 'outline'",
    defaultValue: 'surface',
  },
]

const ResultDemo: FC = () => {
  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Result 结果页</h1>
        <p className="text-sm mt-3 mb-3">
          Result 用于承载关键操作后的反馈、异常页与阶段完成态。它比 Alert
          更完整，也比空状态更适合承接下一步动作。
        </p>
        <p className="text-sm opacity-75">
          Result 参考成熟结果页组件的能力面，视觉保持 Rue
          自己的圆角面板、柔和光晕和较轻的插画结构；除了 success、info、warning、error
          之外，也内置了 403、404、500 三种异常状态。
        </p>

        <ExampleBlock
          title="基础状态"
          summary="覆盖最常见的操作结果场景。四种语义状态共享一套 Result 布局，但通过图标与色彩建立清晰区分。"
          tab={basicTab}
          preview={() => (
            <div className="grid gap-4 xl:grid-cols-2">
              <Result
                size="sm"
                status="success"
                title="发布成功"
                subTitle="当前本已推送到 12 个边缘节点，预计 40 秒内完成全量刷新。"
              />
              <Result
                size="sm"
                status="info"
                title="等待同步"
                subTitle="任务已经入队，系统会在资源空闲时继续处理。"
              />
              <Result
                size="sm"
                status="warning"
                title="仍需人工确认"
                subTitle="检测到配置变更涉及生产环境，请由值班同学完成最终审核。"
              />
              <Result
                size="sm"
                status="error"
                title="校验失败"
                subTitle="依赖清单中存在 2 个未解决的版本冲突，请修正后重新提交。"
              />
            </div>
          )}
          code={`import { Result } from '@rue-js/design'<div className="grid gap-4 xl:grid-cols-2">
  <Result
    size="sm"
    status="success"
    title="发布成功"
    subTitle="当前本已推送到 12 个边缘节点，预计 40 秒内完成全量刷新。"
  />
  <Result
    size="sm"
    status="info"
    title="等待同步"
    subTitle="任务已经入队，系统会在资源空闲时继续处理。"
  />
  <Result
    size="sm"
    status="warning"
    title="仍需人工确认"
    subTitle="检测到配置变更涉及生产环境，请由值班同学完成最终审核。"
  />
  <Result
    size="sm"
    status="error"
    title="校验失败"
    subTitle="依赖清单中存在 2 个未解决的版本冲突，请修正后重新提交。"
  />
</div>
`}
        />

        <ExampleBlock
          title="异常状态页"
          summary="403、404、500 内置默认标题、副标题和插画，适合直接作为独立页面或路由兜底页使用。"
          tab={exceptionTab}
          preview={() => (
            <div className="grid gap-5">
              <Result
                status={403}
                extra={<Button color="primary">申请访问</Button>}
                className="min-h-[26rem]"
              />
              <div className="grid gap-5 xl:grid-cols-2">
                <Result
                  status={404}
                  size="sm"
                  extra={[
                    <Button color="primary" key="home">
                      返回首页
                    </Button>,
                    <Button type="outlined" key="search">
                      搜索文档
                    </Button>,
                  ]}
                />
                <Result
                  status={500}
                  size="sm"
                  extra={[
                    <Button color="primary" key="retry">
                      重试请求
                    </Button>,
                    <Button type="text" key="log">
                      查看日志
                    </Button>,
                  ]}
                />
              </div>
            </div>
          )}
          code={`import { Button, Result } from '@rue-js/design'<div className="grid gap-5">
  <Result
    status={403}
    extra={<Button color="primary">申请访问</Button>}
    className="min-h-[26rem]"
  />
  <div className="grid gap-5 xl:grid-cols-2">
    <Result
      status={404}
      size="sm"
      extra={[
        <Button color="primary" key="home">返回首页</Button>,
        <Button type="outlined" key="search">搜索文档</Button>,
      ]}
    />
    <Result
      status={500}
      size="sm"
      extra={[
        <Button color="primary" key="retry">重试请求</Button>,
        <Button type="text" key="log">查看日志</Button>,
      ]}
    />
  </div>
</div>
`}
        />

        <ExampleBlock
          title="操作区与扩展内容"
          summary="extra 负责下一步动作，children 负责补充上下文或明细面板，适合复杂业务流收尾页。"
          tab={extraTab}
          preview={() => (
            <Result
              status="success"
              title="云主机已开通"
              subTitle="订单号：RU20260510-0032。资源已完成基础检测，建议立即配置告警与自动快照策略。"
              extra={[
                <Button color="primary" key="console">
                  前往控制台
                </Button>,
                <Button type="outlined" key="snapshot">
                  配置快照
                </Button>,
              ]}
            >
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] opacity-55">实例规格</div>
                  <div className="mt-2 text-lg font-semibold">4C8G / 华东 2</div>
                  <div className="mt-1 text-sm opacity-65">自动扩容策略已启用</div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] opacity-55">公网访问</div>
                  <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
                    已开启
                    <Badge color="success">HTTPS</Badge>
                  </div>
                  <div className="mt-1 text-sm opacity-65">默认指向 preview.rue.dev</div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] opacity-55">提醒</div>
                  <ul className="mt-2 m-0 pl-5 text-sm leading-7 opacity-80">
                    <li>建议补充管理员手机号</li>
                    <li>七天后会触发成本周报</li>
                  </ul>
                </div>
              </div>
            </Result>
          )}
          code={`import { Badge, Button, Result } from '@rue-js/design'<Result
  status="success"
  title="云主机已开通"
  subTitle="订单号：RU20260510-0032。资源已完成基础检测，建议立即配置告警与自动快照策略。"
  extra={[
    <Button color="primary" key="console">前往控制台</Button>,
    <Button type="outlined" key="snapshot">配置快照</Button>,
  ]}
>
  <div className="grid gap-3 md:grid-cols-3">
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <div className="text-xs uppercase tracking-[0.22em] opacity-55">实例规格</div>
      <div className="mt-2 text-lg font-semibold">4C8G / 华东 2</div>
      <div className="mt-1 text-sm opacity-65">自动扩容策略已启用</div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <div className="text-xs uppercase tracking-[0.22em] opacity-55">公网访问</div>
      <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
        已开启
        <Badge color="success">HTTPS</Badge>
      </div>
      <div className="mt-1 text-sm opacity-65">默认指向 preview.rue.dev</div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
      <div className="text-xs uppercase tracking-[0.22em] opacity-55">提醒</div>
      <ul className="mt-2 m-0 pl-5 text-sm leading-7 opacity-80">
        <li>建议补充管理员手机号</li>
        <li>七天后会触发成本周报</li>
      </ul>
    </div>
  </div>
</Result>
`}
        />

        <ExampleBlock
          title="自定义图标与无图标模式"
          summary="你可以把 Result 用成更品牌化的完成态，也可以完全拿掉 icon，仅保持标题、动作和补充文案。"
          tab={customTab}
          preview={() => (
            <div className="grid gap-5 xl:grid-cols-2">
              <Result
                status="info"
                icon={<RocketIcon />}
                title="归档任务已排定"
                subTitle="冷数据会在凌晨窗口期分批归档到对象存储，预计耗时 18 分钟。"
                extra={<Button color="primary">查看任务看板</Button>}
                variant="soft"
              />
              <Result
                status="warning"
                showIcon={false}
                title="你正在使用只读副本"
                subTitle="当前环境不允许直接写入。若需要继续调试，请先切回可写分支或申请沙箱环境。"
                extra={[
                  <Button type="outlined" key="branch">
                    切换分支
                  </Button>,
                  <Button type="text" key="sandbox">
                    申请沙箱
                  </Button>,
                ]}
                variant="outline"
              />
            </div>
          )}
          code={`import { Button, Result } from '@rue-js/design'${rocketIconCode}

<div className="grid gap-5 xl:grid-cols-2">
  <Result
    status="info"
    icon={<RocketIcon />}
    title="归档任务已排定"
    subTitle="冷数据会在凌晨窗口期分批归档到对象存储，预计耗时 18 分钟。"
    extra={<Button color="primary">查看任务看板</Button>}
    variant="soft"
  />
  <Result
    status="warning"
    showIcon={false}
    title="你正在使用只读副本"
    subTitle="当前环境不允许直接写入。若需要继续调试，请先切回可写分支或申请沙箱环境。"
    extra={[
      <Button type="outlined" key="branch">切换分支</Button>,
      <Button type="text" key="sandbox">申请沙箱</Button>,
    ]}
    variant="outline"
  />
</div>
`}
        />

        <ExampleBlock
          title="视觉变体与流程排布"
          summary="surface、soft、outline 适合不同密度的页面；align=start 更适合承载表单结果、审核流和运维说明。"
          tab={variantTab}
          preview={() => (
            <div className="grid gap-5">
              <Result
                status="success"
                icon={<ShieldWaveIcon />}
                title="安全基线已更新"
                subTitle="所有高危项已完成修复，系统会在下一轮巡检中重新生成合规快照。"
                variant="surface"
              />
              <div className="grid gap-5 xl:grid-cols-2">
                <Result
                  status="info"
                  size="sm"
                  variant="soft"
                  icon={<CompassIcon />}
                  title="推荐下一步：整理路由入口"
                  subTitle="新组件已经落地，建议同步补一条导航入口和使用示例，降低首次发现成本。"
                  align="start"
                  extra={<Button color="primary">查看接入清单</Button>}
                />
                <Result
                  status="error"
                  size="sm"
                  variant="outline"
                  title="回滚未完成"
                  subTitle="2 个节点仍在回滚版本，建议先暂停流量切换，待日志完全一致后再继续。"
                  align="start"
                  extra={<Button type="outlined">打开故障时间线</Button>}
                >
                  <div className="grid gap-2 text-sm leading-7 opacity-80">
                    <div>node-sh-02: checksum mismatch</div>
                    <div>node-bj-05: waiting runtime restart</div>
                  </div>
                </Result>
              </div>
            </div>
          )}
          code={`import { Button, Result } from '@rue-js/design'${compassIconCode}

${shieldWaveIconCode}

<div className="grid gap-5">
  <Result
    status="success"
    icon={<ShieldWaveIcon />}
    title="安全基线已更新"
    subTitle="所有高危项已完成修复，系统会在下一轮巡检中重新生成合规快照。"
    variant="surface"
  />
  <div className="grid gap-5 xl:grid-cols-2">
    <Result
      status="info"
      size="sm"
      variant="soft"
      icon={<CompassIcon />}
      title="推荐下一步：整理路由入口"
      subTitle="新组件已经落地，建议同步补一条导航入口和使用示例，降低首次发现成本。"
      align="start"
      extra={<Button color="primary">查看接入清单</Button>}
    />
    <Result
      status="error"
      size="sm"
      variant="outline"
      title="回滚未完成"
      subTitle="2 个节点仍在回滚版本，建议先暂停流量切换，待日志完全一致后再继续。"
      align="start"
      extra={<Button type="outlined">打开故障时间线</Button>}
    >
      <div className="grid gap-2 text-sm leading-7 opacity-80">
        <div>node-sh-02: checksum mismatch</div>
        <div>node-bj-05: waiting runtime restart</div>
      </div>
    </Result>
  </div>
</div>
`}
        />

        <ExampleBlock
          title="预制异常插画"
          summary="Result 也暴露了可单独复用的异常插画，适合接到自定义页面或空状态外壳里。"
          tab={presentedImageTab}
          preview={() => (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-4 text-center">
                <Result.PRESENTED_IMAGE_403 size="sm" />
                <div className="mt-3 text-sm font-medium">Result.PRESENTED_IMAGE_403</div>
              </div>
              <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-4 text-center">
                <Result.PRESENTED_IMAGE_404 size="sm" />
                <div className="mt-3 text-sm font-medium">Result.PRESENTED_IMAGE_404</div>
              </div>
              <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-4 text-center">
                <Result.PRESENTED_IMAGE_500 size="sm" />
                <div className="mt-3 text-sm font-medium">Result.PRESENTED_IMAGE_500</div>
              </div>
            </div>
          )}
          code={`import { Result } from '@rue-js/design'<div className="grid gap-4 md:grid-cols-3">
  <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-4 text-center">
    <Result.PRESENTED_IMAGE_403 size="sm" />
    <div className="mt-3 text-sm font-medium">Result.PRESENTED_IMAGE_403</div>
  </div>
  <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-4 text-center">
    <Result.PRESENTED_IMAGE_404 size="sm" />
    <div className="mt-3 text-sm font-medium">Result.PRESENTED_IMAGE_404</div>
  </div>
  <div className="rounded-[1.75rem] border border-base-300 bg-base-100 p-4 text-center">
    <Result.PRESENTED_IMAGE_500 size="sm" />
    <div className="mt-3 text-sm font-medium">Result.PRESENTED_IMAGE_500</div>
  </div>
</div>
`}
        />

        <h2 className="mt-10">API</h2>
        <ApiTable rows={apiRows} />
        <p className="text-sm opacity-70 mt-4">
          除了上表 props，组件还暴露了 Result.PRESENTED_IMAGE_403、Result.PRESENTED_IMAGE_404 和
          Result.PRESENTED_IMAGE_500 三个静态插画组件，便于你在更复杂的空壳页面里单独复用。
        </p>
      </div>
    </SidebarPlayground>
  )
}

export default ResultDemo
