import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Tabs, TextRotate } from '@rue-js/design'
type DemoTabKey = 'preview' | 'code'

interface DemoBlockProps {
  title: string
  description: string
  activeKey: { value: DemoTabKey }
  preview: any
  code: string
}

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const DemoBlock: FC<DemoBlockProps> = ({ title, description, activeKey, preview, code }) => {
  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">{title}</h2>
      <p className="text-sm mt-3 mb-3">{description}</p>
      <Tabs
        style="box"
        items={[
          { key: 'preview', label: '预览' },
          { key: 'code', label: 'JSX代码' },
        ]}
        activeKey={activeKey.value}
        onChange={k => (activeKey.value = k as DemoTabKey)}
        className="mb-3"
      />
      {activeKey.value === 'preview' ? preview : <Code className="mt-2" lang="tsx" code={code} />}
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

const basicCode = `<TextRotate>
  <span>
    <span>ONE</span>
    <span>TWO</span>
    <span>THREE</span>
  </span>
</TextRotate>`

const itemsCode = `<TextRotate
  className="max-md:text-3xl text-7xl font-title"
  innerClassName="justify-items-center"
  items={[
    { text: 'DESIGN' },
    { text: 'DEVELOP' },
    { text: 'DEPLOY' },
    { text: 'SCALE' },
    { text: 'MAINTAIN' },
    { text: 'REPEAT' },
  ]}
/>`

const sixWordsCode = `<TextRotate className="max-md:text-3xl text-7xl font-title">
  <span className="justify-items-center">
    <span>DESIGN</span>
    <span>DEVELOP</span>
    <span>DEPLOY</span>
    <span>SCALE</span>
    <span>MAINTAIN</span>
    <span>REPEAT</span>
  </span>
</TextRotate>`

const sentenceCode = `<span>
  Providing AI Agents for{' '}
  <TextRotate>
    <span>
      <span className="bg-teal-400 text-teal-800 px-2">Designers</span>
      <span className="bg-red-400 text-red-800 px-2">Developers</span>
      <span className="bg-blue-400 text-blue-800 px-2">Managers</span>
    </span>
  </TextRotate>
</span>`

const durationCode = `<TextRotate className="max-md:text-3xl text-7xl font-title duration-6000">
  <span className="justify-items-center">
    <span>BLAZING</span>
    <span className="font-bold italic px-2">FAST ▶︎▶︎</span>
  </span>
</TextRotate>`

const lineHeightCode = `<TextRotate className="max-md:text-3xl text-7xl font-title leading-[2]">
  <span className="justify-items-center">
    <span>📐 DESIGN</span>
    <span>⌨️ DEVELOP</span>
    <span>🌎 DEPLOY</span>
    <span>🌱 SCALE</span>
    <span>🔧 MAINTAIN</span>
    <span>♻️ REPEAT</span>
  </span>
</TextRotate>`

const semanticItemsCode = `<div className="space-y-4">
  <TextRotate
    className="text-2xl font-title"
    innerClassName="justify-items-start"
    items={[
      { text: 'Readable', strong: true },
      { text: 'Reviewable', type: 'secondary', underline: true },
      { text: 'Deployable', href: 'https://rue.dev', type: 'danger' },
    ]}
  />

  <p className="text-sm text-base-content/70">
    items 会自动复用 Typography.Text / Typography.Link 的语义属性。
  </p>
</div>`

const rootApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '根节点标签，可在 inline 的 span 和 block 的 div 之间切换。',
    type: `'span' | 'div'`,
    defaultValue: `'span'`,
  },
  {
    prop: 'children',
    description: '直接传入 daisyUI 原生 text-rotate 结构。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'items',
    description: '通过数据项数组生成轮播内容；传入后优先于 children。',
    type: 'ReadonlyArray<TextRotateItem>',
    defaultValue: '-',
  },
  {
    prop: 'innerClassName / innerStyle',
    description: '作用于内部包裹层，常用于设置对齐方式与局部样式。',
    type: 'string / any',
    defaultValue: '-',
  },
  {
    prop: 'itemClassName / itemStyle',
    description: '为 items 渲染出的每一项补充统一类名和样式。',
    type: 'string / any',
    defaultValue: '-',
  },
  {
    prop: 'className / style',
    description: '补充根节点样式，常用于字号、颜色和 duration 类。',
    type: 'string / any',
    defaultValue: '-',
  },
]

const itemApiRows: ApiRow[] = [
  {
    prop: 'key',
    description: '自定义列表 key，未传时回退为当前索引。',
    type: 'string | number',
    defaultValue: '-',
  },
  {
    prop: 'text / children',
    description: '单项内容，优先读取 children，再回退到 text。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'href / target / rel',
    description: '声明后会按 Typography.Link 渲染该项。',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'as',
    description: '非链接项输出标签，适合在行内文本和块级文本之间切换。',
    type: `'span' | 'div' | 'p'`,
    defaultValue: `'span'`,
  },
  {
    prop: 'type',
    description: '语义色调，支持 default、secondary、success、warning、danger。',
    type: 'TextRotateTone',
    defaultValue: `'default'`,
  },
  {
    prop: 'disabled / mark / code / keyboard / underline / delete / strong / italic',
    description: '单项文本修饰能力，与 Typography.Text / Typography.Link 的布尔语义属性保持一致。',
    type: 'boolean',
    defaultValue: 'false',
  },
]

const TextRotateDemo: FC = () => {
  const tabBasic = ref<DemoTabKey>('preview')
  const tabArray = ref<DemoTabKey>('preview')
  const tabSix = ref<DemoTabKey>('preview')
  const tabSentence = ref<DemoTabKey>('preview')
  const tabDuration = ref<DemoTabKey>('preview')
  const tabLineHeight = ref<DemoTabKey>('preview')
  const tabSemanticItems = ref<DemoTabKey>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Text Rotate 文本轮播</h1>
        <p className="text-sm mt-3 mb-3">
          Text Rotate 继续专注于轮播结构本身：使用 Rue 当前的视觉和 daisyUI 的 text-rotate class
          用法。
        </p>

        <DemoBlock
          title="# Text Rotate"
          description="Rotates through 3 words, in 10 seconds"
          activeKey={tabBasic}
          preview={
            <TextRotate>
              <span>
                <span>ONE</span>
                <span>TWO</span>
                <span>THREE</span>
              </span>
            </TextRotate>
          }
          code={basicCode}
        />

        <DemoBlock
          title="# Using items array"
          description="Pass an array of items and let TextRotate render the inner structure for you"
          activeKey={tabArray}
          preview={
            <TextRotate
              className="max-md:text-3xl text-7xl font-title"
              innerClassName="justify-items-center"
              items={[
                { text: 'DESIGN' },
                { text: 'DEVELOP' },
                { text: 'DEPLOY' },
                { text: 'SCALE' },
                { text: 'MAINTAIN' },
                { text: 'REPEAT' },
              ]}
            />
          }
          code={itemsCode}
        />

        <DemoBlock
          title="# Rotating 6 words"
          description="Big font size, horizontally centered"
          activeKey={tabSix}
          preview={
            <TextRotate className="max-md:text-3xl text-7xl font-title">
              <span className="justify-items-center">
                <span>DESIGN</span>
                <span>DEVELOP</span>
                <span>DEPLOY</span>
                <span>SCALE</span>
                <span>MAINTAIN</span>
                <span>REPEAT</span>
              </span>
            </TextRotate>
          }
          code={sixWordsCode}
        />

        <DemoBlock
          title="# Rotating words in a sentence"
          description="Different colors for each word"
          activeKey={tabSentence}
          preview={
            <span>
              Providing AI Agents for{' '}
              <TextRotate>
                <span>
                  <span className="bg-teal-400 text-teal-800 px-2">Designers</span>
                  <span className="bg-red-400 text-red-800 px-2">Developers</span>
                  <span className="bg-blue-400 text-blue-800 px-2">Managers</span>
                </span>
              </TextRotate>
            </span>
          }
          code={sentenceCode}
        />

        <DemoBlock
          title="# Rotating 3 words with custom duration"
          description="Big font size, horizontally centered, 6 seconds duration instead of 10 seconds"
          activeKey={tabDuration}
          preview={
            <TextRotate className="max-md:text-3xl text-7xl font-title duration-6000">
              <span className="justify-items-center">
                <span>BLAZING</span>
                <span className="font-bold italic px-2">FAST ▶︎▶︎</span>
              </span>
            </TextRotate>
          }
          code={durationCode}
        />

        <DemoBlock
          title="# Custom line height"
          description="In case you have a tall font or need more vertical spacing between lines"
          activeKey={tabLineHeight}
          preview={
            <TextRotate className="max-md:text-3xl text-7xl font-title leading-[2]">
              <span className="justify-items-center">
                <span>📐 DESIGN</span>
                <span>⌨️ DEVELOP</span>
                <span>🌎 DEPLOY</span>
                <span>🌱 SCALE</span>
                <span>🔧 MAINTAIN</span>
                <span>♻️ REPEAT</span>
              </span>
            </TextRotate>
          }
          code={lineHeightCode}
        />

        <DemoBlock
          title="# Semantic items"
          description="Items inherit Typography.Text / Typography.Link semantics, so tone and emphasis stay consistent"
          activeKey={tabSemanticItems}
          preview={
            <div className="space-y-4">
              <TextRotate
                className="text-2xl font-title"
                innerClassName="justify-items-start"
                items={[
                  { text: 'Readable', strong: true },
                  { text: 'Reviewable', type: 'secondary', underline: true },
                  { text: 'Deployable', href: 'https://rue.dev', type: 'danger' },
                ]}
              />

              <p className="m-0 text-sm text-base-content/70">
                items 会自动复用 Typography 的语义属性，所以轮播词条和正文排版可以保持同一套表达。
              </p>
            </div>
          }
          code={semanticItemsCode}
        />

        <h2>API</h2>
        <p className="text-sm opacity-80">
          Text Rotate 现在只保持和轮播结构直接相关的 API；排版语义统一由 Typography 组件承担。
        </p>
        <div className="not-prose mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-sm font-medium">TextRotate Root</div>
            <p className="mt-2 text-sm opacity-70">
              根组件负责 children 和 items 两种模式的切换，并承接根节点、内部包裹层和统一项样式。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-sm font-medium">TextRotateItem</div>
            <p className="mt-2 text-sm opacity-70">
              数据项负责单词条的内容和语义修饰；普通项走 Typography.Text，带 href 的项走
              Typography.Link。
            </p>
          </div>
        </div>

        <h3 className="mt-8">TextRotate</h3>
        <p className="text-sm opacity-70">
          根组件负责维持 daisyUI 的 text-rotate 结构，同时决定走基础 children 还是数据驱动的 items
          模式。
        </p>
        <ApiTable rows={rootApiRows} />

        <h3>TextRotateItem</h3>
        <p className="text-sm opacity-70">
          items 数组中的单项既可以是普通文本，也可以组织成带链接和语义修饰的轮播项。
        </p>
        <ApiTable rows={itemApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default TextRotateDemo
