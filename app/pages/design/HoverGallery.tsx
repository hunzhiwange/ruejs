import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { HoverGallery, Tabs } from '@rue-js/design'
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

const classicGalleryItems = [
  {
    src: 'https://img.daisyui.com/images/stock/daisyui-hat-1.webp',
    alt: '帽子正面',
  },
  {
    src: 'https://img.daisyui.com/images/stock/daisyui-hat-2.webp',
    alt: '帽子侧面',
    label: '2',
  },
  {
    node: <img src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp" alt="帽子背面" />,
    label: '3',
  },
  {
    src: 'https://img.daisyui.com/images/stock/daisyui-hat-4.webp',
    alt: '帽子细节',
    label: '4',
  },
]

const labeledGalleryItems = [
  {
    src: 'https://img.daisyui.com/images/stock/daisyui-hat-1.webp',
    alt: '基础款帽子正面',
  },
  {
    src: 'https://img.daisyui.com/images/stock/daisyui-hat-2.webp',
    alt: '基础款帽子侧面',
  },
  {
    src: 'https://img.daisyui.com/images/stock/daisyui-hat-3.webp',
    alt: '基础款帽子背面',
  },
  {
    src: 'https://img.daisyui.com/images/stock/daisyui-hat-4.webp',
    alt: '基础款帽子细节',
  },
]

const apiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '指定根节点标签，可选 figure 或 div',
    type: `'figure' | 'div'`,
    defaultValue: `'figure'`,
  },
  {
    prop: 'children',
    description: '直接传入图片节点；当 items 为空时作为渲染源',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '追加到 hover-gallery 根节点的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'fit',
    description: '统一控制 items 生成图片的 object-fit',
    type: `'cover' | 'contain' | 'fill' | 'none' | 'scale-down'`,
    defaultValue: '-',
  },
  {
    prop: 'guideClassName',
    description: '追加到导览遮罩容器的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'guideItemClassName',
    description: '追加到每个导览分栏的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'guideLabels',
    description: '覆盖导览遮罩文案；长度通常为图片数量减一',
    type: 'ReadonlyArray<any>',
    defaultValue: '-',
  },
  {
    prop: 'imageClassName',
    description: '统一追加到 items 生成图片上的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'items',
    description: '数据驱动模式，支持字符串 src、对象项或自定义 node',
    type: 'ReadonlyArray<string | HoverGalleryItem | any>',
    defaultValue: '-',
  },
  {
    prop: 'showGuide',
    description: '显示与 hover 区域对齐的导览遮罩',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'wrapperClassName',
    description: 'showGuide 开启时追加到外层叠放容器的类名',
    type: 'string',
    defaultValue: '-',
  },
]

const howItWorksCode = `<HoverGallery
  className="max-w-60"
  wrapperClassName="max-w-60 rounded-box overflow-hidden shadow"
  showGuide={true}
  items={[
    { src: 'https://img.daisyui.com/images/stock/daisyui-hat-1.webp', alt: 'Hat front' },
    { src: 'https://img.daisyui.com/images/stock/daisyui-hat-2.webp', alt: 'Hat side' },
    { src: 'https://img.daisyui.com/images/stock/daisyui-hat-3.webp', alt: 'Hat back' },
    { src: 'https://img.daisyui.com/images/stock/daisyui-hat-4.webp', alt: 'Hat detail' },
  ]}
/>
`

const basicCode = `<HoverGallery as="figure" className="max-w-60">
  <img src="https://img.daisyui.com/images/stock/daisyui-hat-1.webp" alt="Hat front" />
  <img src="https://img.daisyui.com/images/stock/daisyui-hat-2.webp" alt="Hat side" />
  <img src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp" alt="Hat back" />
  <img src="https://img.daisyui.com/images/stock/daisyui-hat-4.webp" alt="Hat detail" />
</HoverGallery>
`

const itemsCode = `const galleryItems = [
  'https://img.daisyui.com/images/stock/daisyui-hat-1.webp',
  {
    src: 'https://img.daisyui.com/images/stock/daisyui-hat-2.webp',
    alt: 'Hat side',
  },
  {
    node: <img src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp" alt="Hat back" />,
  },
  {
    src: 'https://img.daisyui.com/images/stock/daisyui-hat-4.webp',
    alt: 'Hat detail',
  },
]

<HoverGallery as="figure" className="max-w-60" items={galleryItems} />
`

const guideCode = `<HoverGallery
  className="max-w-sm bg-base-100"
  wrapperClassName="max-w-sm rounded-box overflow-hidden border border-base-300 shadow-lg"
  imageClassName="aspect-[4/3] w-full bg-base-200"
  fit="contain"
  showGuide={true}
  guideLabels={['侧面', '背面', '细节']}
  guideClassName="text-xs font-semibold text-base-content"
  guideItemClassName="from-base-100/70 via-transparent to-base-content/10"
  items={[
    { src: 'https://img.daisyui.com/images/stock/daisyui-hat-1.webp', alt: 'Hat front' },
    { src: 'https://img.daisyui.com/images/stock/daisyui-hat-2.webp', alt: 'Hat side' },
    { src: 'https://img.daisyui.com/images/stock/daisyui-hat-3.webp', alt: 'Hat back' },
    { src: 'https://img.daisyui.com/images/stock/daisyui-hat-4.webp', alt: 'Hat detail' },
  ]}
/>
`

const cardCode = `<div className="card card-sm bg-base-200 max-w-72 border border-base-300/60 shadow-lg">
  <HoverGallery
    as="figure"
    items={[
      { src: 'https://img.daisyui.com/images/stock/daisyui-hat-1.webp', alt: 'Hat front' },
      { src: 'https://img.daisyui.com/images/stock/daisyui-hat-2.webp', alt: 'Hat side' },
      { src: 'https://img.daisyui.com/images/stock/daisyui-hat-3.webp', alt: 'Hat back' },
      { src: 'https://img.daisyui.com/images/stock/daisyui-hat-4.webp', alt: 'Hat detail' },
    ]}
    imageClassName="aspect-[4/3] w-full object-cover"
  />
  <div className="card-body gap-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="card-title text-base">Rue Field Cap</h3>
        <p className="m-0 text-sm opacity-70">Cotton twill, matte buckle, small logo stitch.</p>
      </div>
      <span className="badge badge-primary badge-soft">New</span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <span className="opacity-70">4 angles preview</span>
      <strong>¥199</strong>
    </div>
  </div>
</div>
`

const HoverGalleryDemo: FC = () => {
  const tabHow = ref<TabMode>('preview')
  const tabBasic = ref<TabMode>('preview')
  const tabItems = ref<TabMode>('preview')
  const tabGuide = ref<TabMode>('preview')
  const tabCard = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Hover Gallery 悬浮画廊</h1>
        <p className="text-sm mt-3 mb-3">
          Hover Gallery 适合做商品多视角缩略图。组件把多图预览结构收口成稳定 API：既能直接写
          <code>children</code>，也能切到 <code>items</code>{' '}
          数据驱动，并把导览遮罩和图片层样式统一收口到组件里。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要在商品卡片、作品集卡片里，用最轻的结构承载多张预览图。</li>
          <li>想保持纯 CSS 的 hover 体验，但又不想在页面层重复写导览遮罩和图片映射逻辑。</li>
          <li>同一套页面里基础静态写法，也有列表数据驱动写法，希望 API 可以平滑共存。</li>
        </ul>

        <ExampleBlock
          title="How it works"
          summary="第一张图片默认可见，其余图片会对应到横向 hover 分栏。组件现在可以直接输出这层导览遮罩。"
          tab={tabHow}
          preview={() => (
            <div className="flex justify-center">
              <HoverGallery
                className="max-w-60"
                wrapperClassName="max-w-60 rounded-box overflow-hidden shadow"
                showGuide={true}
                items={classicGalleryItems}
              />
            </div>
          )}
          code={howItWorksCode}
        />

        <ExampleBlock
          title="基础用法"
          summary="展示 children 写法。适合已经手写好图片节点的场景。"
          tab={tabBasic}
          preview={() => (
            <div className="flex justify-center">
              <HoverGallery as="figure" className="max-w-60">
                <img src="https://img.daisyui.com/images/stock/daisyui-hat-1.webp" alt="帽子正面" />
                <img src="https://img.daisyui.com/images/stock/daisyui-hat-2.webp" alt="帽子侧面" />
                <img src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp" alt="帽子背面" />
                <img src="https://img.daisyui.com/images/stock/daisyui-hat-4.webp" alt="帽子细节" />
              </HoverGallery>
            </div>
          )}
          code={basicCode}
        />

        <ExampleBlock
          title="数据驱动"
          summary="items 支持字符串、对象项和自定义 node，方便从接口数据或内容配置直接渲染。"
          tab={tabItems}
          preview={() => (
            <div className="flex justify-center">
              <HoverGallery as="figure" className="max-w-60" items={classicGalleryItems} />
            </div>
          )}
          code={itemsCode}
        />

        <ExampleBlock
          title="自定义导览与图片层"
          summary="导览文案、导览样式和图片 object-fit 都能在组件层统一配置，不需要再在页面里手工叠 grid。"
          tab={tabGuide}
          preview={() => (
            <div className="flex justify-center">
              <div className="space-y-3">
                <HoverGallery
                  className="max-w-sm bg-base-100"
                  wrapperClassName="max-w-sm rounded-box overflow-hidden border border-base-300 shadow-lg"
                  imageClassName="aspect-[4/3] w-full bg-base-200"
                  fit="contain"
                  showGuide={true}
                  guideLabels={['侧面', '背面', '细节']}
                  guideClassName="text-xs font-semibold text-base-content"
                  guideItemClassName="from-base-100/70 via-transparent to-base-content/10"
                  items={labeledGalleryItems}
                />
                <p className="m-0 text-xs opacity-70">
                  这类组合更适合做详情页的角度预览，统一的 <code>fit</code> 和{' '}
                  <code>imageClassName</code> 可以把不同来源的图片先收敛到同一版式里。
                </p>
              </div>
            </div>
          )}
          code={guideCode}
        />

        <ExampleBlock
          title="商品卡片组合"
          summary="展示卡片场景，但把图片映射交给 HoverGallery 自己处理。"
          tab={tabCard}
          preview={() => (
            <div className="flex justify-center">
              <div className="card card-sm bg-base-200 max-w-72 border border-base-300/60 shadow-lg">
                <HoverGallery
                  as="figure"
                  items={labeledGalleryItems}
                  imageClassName="aspect-[4/3] w-full object-cover"
                />
                <div className="card-body gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="card-title text-base">Rue Field Cap</h3>
                      <p className="m-0 text-sm opacity-70">
                        Cotton twill, matte buckle, small logo stitch.
                      </p>
                    </div>
                    <span className="badge badge-primary badge-soft">New</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="opacity-70">4 angles preview</span>
                    <strong>¥199</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
          code={cardCode}
        />

        <h2 id="hover-gallery-api">API</h2>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default HoverGalleryDemo
