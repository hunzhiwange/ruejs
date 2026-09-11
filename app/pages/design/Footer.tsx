import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Footer, Tabs } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'

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

interface SectionConfig {
  key: string
  title: string
  items?: Array<{ label: string; href?: string }>
  as?: any
  content?: any
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

const BrandGlyph: FC<{ size?: number; className?: string }> = ({ size = 40, className }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className ?? 'fill-current'}>
      <path d="M22.672 15.226l-2.432.811.841 2.515c.33 1.019-.209 2.127-1.23 2.456-1.15.325-2.148-.321-2.463-1.226l-.84-2.518-5.013 1.677.84 2.517c.391 1.203-.434 2.542-1.831 2.542-.88 0-1.601-.564-1.86-1.314l-.842-2.516-2.431.809c-1.135.328-2.145-.317-2.463-1.229-.329-1.018.211-2.127 1.231-2.456l2.432-.809-1.621-4.823-2.432.808c-1.355.384-2.558-.59-2.558-1.839 0-.817.509-1.582 1.327-1.846l2.433-.809-.842-2.515c-.33-1.02.211-2.129 1.232-2.458 1.02-.329 2.13.209 2.461 1.229l.842 2.515 5.011-1.677-.839-2.517c-.403-1.238.484-2.553 1.843-2.553.819 0 1.585.509 1.85 1.326l.841 2.517 2.431-.81c1.02-.33 2.131.211 2.461 1.229.332 1.018-.21 2.126-1.23 2.456l-2.433.809 1.622 4.823 2.433-.809c1.242-.401 2.557.484 2.557 1.838 0 .819-.51 1.583-1.328 1.847m-8.992-6.428l-5.01 1.675 1.619 4.828 5.011-1.674-1.62-4.829z"></path>
    </svg>
  )
}

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    className="fill-current"
  >
    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
  </svg>
)

const VideoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    className="fill-current"
  >
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
  </svg>
)

const CommunityIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    className="fill-current"
  >
    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
  </svg>
)

const socialButtons = [
  { key: 'x', Icon: XIcon },
  { key: 'video', Icon: VideoIcon },
  { key: 'community', Icon: CommunityIcon },
] as const

const SocialIcon: FC<{ kind: (typeof socialButtons)[number]['key'] }> = props =>
  props.kind === 'x' ? <XIcon /> : props.kind === 'video' ? <VideoIcon /> : <CommunityIcon />

const serviceLinks = [
  { label: 'Branding' },
  { label: 'Design' },
  { label: 'Marketing' },
  { label: 'Advertisement' },
]

const companyLinks = [
  { label: 'About us' },
  { label: 'Contact' },
  { label: 'Jobs' },
  { label: 'Press kit' },
]

const legalLinks = [
  { label: 'Terms of use' },
  { label: 'Privacy policy' },
  { label: 'Cookie policy' },
]

const socialLinks = [
  { label: 'Twitter' },
  { label: 'Instagram' },
  { label: 'Facebook' },
  { label: 'GitHub' },
]

const exploreLinks = [
  { label: 'Features' },
  { label: 'Enterprise' },
  { label: 'Security' },
  { label: 'Pricing' },
]

const appLinks = [{ label: 'Mac' }, { label: 'Windows' }, { label: 'Linux' }, { label: 'Android' }]

const baseSections: SectionConfig[] = [
  { key: 'services', title: 'Services', items: serviceLinks },
  { key: 'company', title: 'Company', items: companyLinks },
  { key: 'legal', title: 'Legal', items: legalLinks },
]

const twoRowSections: SectionConfig[] = [
  ...baseSections,
  { key: 'social', title: 'Social', items: socialLinks },
  { key: 'explore', title: 'Explore', items: exploreLinks },
  { key: 'apps', title: 'Apps', items: appLinks },
]

const rootApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '指定根节点标签，默认输出 footer',
    type: 'any',
    defaultValue: `'footer'`,
  },
  {
    prop: 'brand',
    description: '结构化品牌区内容，不传 children 时会渲染为 Footer.Brand',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'bordered',
    description: '追加顶部边线，适合双层页脚的下半部分',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'center',
    description: '追加 footer-center 居中类',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'direction',
    description: '控制 footer-horizontal / footer-vertical',
    type: `'horizontal' | 'vertical'`,
    defaultValue: '-',
  },
  {
    prop: 'sections',
    description: '结构化列数据，可混合文本链接、自定义内容和表单区',
    type: 'FooterSection[]',
    defaultValue: '[]',
  },
  {
    prop: 'wrap',
    description: '为多行布局补充垂直间距',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'children',
    description: '传入后使用基础自定义结构，保持对基础写法的支持',
    type: 'any',
    defaultValue: '-',
  },
]

const sectionApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '列容器标签，默认 nav，也可改成 form / div / aside',
    type: 'any',
    defaultValue: `'nav'`,
  },
  {
    prop: 'title',
    description: '列标题，内部复用 Footer.Title 的 footer-title 样式',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'items',
    description: '快速渲染一组 Footer.Link 文本链接',
    type: 'Array<FooterItem>',
    defaultValue: '[]',
  },
  {
    prop: 'content',
    description: '自定义列内容，适合表单、图标区等复杂结构',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'inline',
    description: '把 items 包装成横向图标或标签流',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'titleClassName',
    description: '自定义标题类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'contentClassName',
    description: 'inline 模式下自定义内容容器类名',
    type: 'string',
    defaultValue: '-',
  },
]

const FooterDemo: FC = () => {
  const tabRecommended = ref<TabMode>('preview')
  const tabCompound = ref<TabMode>('preview')
  const tabBasic = ref<TabMode>('preview')
  const tabLogo = ref<TabMode>('preview')
  const tabForm = ref<TabMode>('preview')
  const tabSocial = ref<TabMode>('preview')
  const tabLinks = ref<TabMode>('preview')
  const tabLinks2 = ref<TabMode>('preview')
  const tabCenteredBrand = ref<TabMode>('preview')
  const tabCentered = ref<TabMode>('preview')
  const tabTwo = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Footer 页脚</h1>
        <p className="text-sm mt-3 mb-3">
          Footer 现在同时支持两种组织方式：可以继续像直接写 <code>nav</code>、<code>aside</code> 和
          自定义 class，也可以改用 <code>brand</code>、<code>sections</code> 与{' '}
          <code>Footer.Section</code>
          这组结构化 API，把品牌区、链接列和表单区拆开表达。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要组织品牌信息、导航链接、社交入口或版权声明。</li>
          <li>希望使用 Rue 当前的 footer 视觉风格，同时减少重复的页脚模板代码。</li>
        </ul>

        <ExampleBlock
          title="推荐：结构化列布局"
          summary="把最常见的三列 footer 改成 sections 数据驱动，仍然提供当前视觉类名和响应式方向。"
          tab={tabRecommended}
          preview={() => (
            <Footer
              className="p-10 bg-neutral text-neutral-content rounded sm:footer-horizontal"
              sections={baseSections}
            />
          )}
          code={`const sections = [
  {
    key: 'services',
    title: 'Services',
    items: [
      { label: 'Branding' },
      { label: 'Design' },
      { label: 'Marketing' },
      { label: 'Advertisement' },
    ],
  },
  {
    key: 'company',
    title: 'Company',
    items: [
      { label: 'About us' },
      { label: 'Contact' },
      { label: 'Jobs' },
      { label: 'Press kit' },
    ],
  },
  {
    key: 'legal',
    title: 'Legal',
    items: [{ label: 'Terms of use' }, { label: 'Privacy policy' }, { label: 'Cookie policy' }],
  },
]

<Footer className="p-10 bg-neutral text-neutral-content rounded sm:footer-horizontal" sections={sections} />`}
        />

        <ExampleBlock
          title="推荐：复合子组件写法"
          summary="当某一列需要自己控制内容结构时，可以直接组合 Footer.Brand、Footer.Section、Footer.Link。"
          tab={tabCompound}
          preview={() => (
            <Footer className="p-10 bg-base-100 border border-base-300 rounded sm:footer-horizontal">
              <Footer.Brand>
                <BrandGlyph />
                <p className="text-sm mt-3 mb-3">
                  Rue Design System
                  <br />
                  Ship consistent experiences.
                </p>
              </Footer.Brand>
              <Footer.Section title="Product">
                <Footer.Link>Overview</Footer.Link>
                <Footer.Link>Pricing</Footer.Link>
                <Footer.Link>Changelog</Footer.Link>
              </Footer.Section>
              <Footer.Section
                title="Community"
                content={
                  <div className="grid grid-flow-col gap-4">
                    {socialButtons.map(({ key }) => (
                      <button key={key} type="button" aria-label={key}>
                        <SocialIcon kind={key} />
                      </button>
                    ))}
                  </div>
                }
              />
            </Footer>
          )}
          code={`<Footer className="p-10 bg-base-100 border border-base-300 rounded sm:footer-horizontal">
  <Footer.Brand>
    <BrandGlyph />
    <p className="text-sm mt-3 mb-3">
      Rue Design System
      <br />
      Ship consistent experiences.
    </p>
  </Footer.Brand>

  <Footer.Section title="Product">
    <Footer.Link>Overview</Footer.Link>
    <Footer.Link>Pricing</Footer.Link>
    <Footer.Link>Changelog</Footer.Link>
  </Footer.Section>

  <Footer.Section
    title="Community"
    content={
      <div className="grid grid-flow-col gap-4">
        <button type="button"><XIcon /></button>
        <button type="button"><VideoIcon /></button>
        <button type="button"><CommunityIcon /></button>
      </div>
    }
  />
</Footer>`}
        />

        <ExampleBlock
          title="Footer（默认纵向，sm 起横向）"
          summary="基础示例 展示，这里改用 sections 表达同一个场景。"
          tab={tabBasic}
          preview={() => (
            <Footer
              className="p-10 bg-neutral text-neutral-content rounded sm:footer-horizontal"
              sections={baseSections}
            />
          )}
          code={`<Footer className="p-10 bg-neutral text-neutral-content rounded sm:footer-horizontal" sections={sections} />`}
        />

        <ExampleBlock
          title="Footer with a logo section"
          summary="展示品牌区场景；推荐用 brand + sections，把品牌说明和导航列拆开。"
          tab={tabLogo}
          preview={() => (
            <Footer
              className="p-10 bg-base-200 text-base-content rounded sm:footer-horizontal"
              brand={
                <div>
                  <BrandGlyph />
                  <p className="text-sm mt-3 mb-3">
                    ACME Industries Ltd.
                    <br />
                    Providing reliable tech since 1992
                  </p>
                </div>
              }
              sections={baseSections}
            />
          )}
          code={`<Footer
  className="p-10 bg-base-200 text-base-content rounded sm:footer-horizontal"
  brand={
    <div>
      <BrandGlyph />
      <p className="text-sm mt-3 mb-3">
        ACME Industries Ltd.
        <br />
        Providing reliable tech since 1992
      </p>
    </div>
  }
  sections={sections}
/>`}
        />

        <ExampleBlock
          title="Footer with a form"
          summary="展示订阅表单场景；自定义 section 可直接切换成 form 根节点。"
          tab={tabForm}
          preview={() => (
            <Footer
              className="p-10 bg-base-200 text-base-content rounded sm:footer-horizontal"
              sections={[
                ...baseSections,
                {
                  key: 'newsletter',
                  title: 'Newsletter',
                  as: 'form',
                  content: (
                    <fieldset className="w-80">
                      <label>Enter your email address</label>
                      <div className="join">
                        <input
                          type="text"
                          placeholder="username@site.com"
                          className="input input-bordered join-item"
                        />
                        <button type="button" className="join-item btn btn-primary">
                          Subscribe
                        </button>
                      </div>
                    </fieldset>
                  ),
                },
              ]}
            />
          )}
          code={`<Footer
  className="p-10 bg-base-200 text-base-content rounded sm:footer-horizontal"
  sections={[
    ...sections,
    {
      key: 'newsletter',
      title: 'Newsletter',
      as: 'form',
      content: (
        <fieldset className="w-80">
          <label>Enter your email address</label>
          <div className="join">
            <input type="text" placeholder="username@site.com" className="input input-bordered join-item" />
            <button type="button" className="join-item btn btn-primary">Subscribe</button>
          </div>
        </fieldset>
      ),
    },
  ]}
/>`}
        />

        <ExampleBlock
          title="Footer with logo and social icons"
          summary="展示品牌加社交图标场景；图标区适合通过 content 自定义。"
          tab={tabSocial}
          preview={() => (
            <Footer
              className="p-10 bg-neutral text-neutral-content rounded sm:footer-horizontal"
              brand={
                <div>
                  <BrandGlyph />
                  <p className="text-sm mt-3 mb-3">
                    ACME Industries Ltd.
                    <br />
                    Providing reliable tech since 1992
                  </p>
                </div>
              }
              sections={[
                {
                  key: 'social',
                  title: 'Social',
                  content: (
                    <div className="grid grid-flow-col gap-4">
                      {socialButtons.map(({ key }) => (
                        <button key={key} type="button" aria-label={key}>
                          <SocialIcon kind={key} />
                        </button>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          )}
          code={`<Footer
  className="p-10 bg-neutral text-neutral-content rounded sm:footer-horizontal"
  brand={
    <div>
      <BrandGlyph />
      <p className="text-sm mt-3 mb-3">ACME Industries Ltd.<br />Providing reliable tech since 1992</p>
    </div>
  }
  sections={[
    {
      key: 'social',
      title: 'Social',
      content: (
        <div className="grid grid-flow-col gap-4">
          <button type="button"><XIcon /></button>
          <button type="button"><VideoIcon /></button>
          <button type="button"><CommunityIcon /></button>
        </div>
      ),
    },
  ]}
/>`}
        />

        <ExampleBlock
          title="Footer with links and social icons"
          summary="展示混合场景；这里可以用 children 自由拼装，展示组合分支。"
          tab={tabLinks}
          preview={() => (
            <Footer className="p-10 bg-base-300 text-base-content rounded sm:footer-horizontal">
              <nav>
                <h6 className="footer-title">Services</h6>
                <button className="link link-hover">Branding</button>
                <button className="link link-hover">Design</button>
                <button className="link link-hover">Marketing</button>
                <button className="link link-hover">Advertisement</button>
              </nav>
              <nav>
                <h6 className="footer-title">Company</h6>
                <button className="link link-hover">About us</button>
                <button className="link link-hover">Contact</button>
                <button className="link link-hover">Jobs</button>
                <button className="link link-hover">Press kit</button>
              </nav>
              <nav>
                <h6 className="footer-title">Social</h6>
                <div className="grid grid-flow-col gap-4">
                  {socialButtons.map(({ key }) => (
                    <button key={key} type="button" aria-label={key}>
                      <SocialIcon kind={key} />
                    </button>
                  ))}
                </div>
              </nav>
            </Footer>
          )}
          code={`<Footer className="p-10 bg-base-300 text-base-content rounded sm:footer-horizontal">
  <nav>
    <h6 className="footer-title">Services</h6>
    <button className="link link-hover">Branding</button>
    <button className="link link-hover">Design</button>
    <button className="link link-hover">Marketing</button>
    <button className="link link-hover">Advertisement</button>
  </nav>
  <nav>
    <h6 className="footer-title">Company</h6>
    <button className="link link-hover">About us</button>
    <button className="link link-hover">Contact</button>
    <button className="link link-hover">Jobs</button>
    <button className="link link-hover">Press kit</button>
  </nav>
  <nav>
    <h6 className="footer-title">Social</h6>
    <div className="grid grid-flow-col gap-4">
      <button type="button"><XIcon /></button>
      <button type="button"><VideoIcon /></button>
      <button type="button"><CommunityIcon /></button>
    </div>
  </nav>
</Footer>`}
        />

        <ExampleBlock
          title="Links and social icons (two rows)"
          summary="展示两行链接矩阵；用 sections 组合数据，继续交给 className 控制布局。"
          tab={tabLinks2}
          preview={() => (
            <Footer
              className="p-10 bg-neutral text-neutral-content rounded sm:grid-rows-2 sm:footer-horizontal"
              sections={twoRowSections}
            />
          )}
          code={`<Footer
  className="p-10 bg-neutral text-neutral-content rounded sm:grid-rows-2 sm:footer-horizontal"
  sections={[
    ...sections,
    { key: 'social', title: 'Social', items: [{ label: 'Twitter' }, { label: 'Instagram' }, { label: 'Facebook' }, { label: 'GitHub' }] },
    { key: 'explore', title: 'Explore', items: [{ label: 'Features' }, { label: 'Enterprise' }, { label: 'Security' }, { label: 'Pricing' }] },
    { key: 'apps', title: 'Apps', items: [{ label: 'Mac' }, { label: 'Windows' }, { label: 'Linux' }, { label: 'Android' }] },
  ]}
/>`}
        />

        <ExampleBlock
          title="Centered footer with logo and social icons"
          summary="展示居中品牌场景；这里演示 center + 复合内容的组合。"
          tab={tabCenteredBrand}
          preview={() => (
            <Footer
              className="bg-primary text-primary-content p-10 rounded footer-horizontal"
              center
            >
              <aside>
                <BrandGlyph size={50} className="inline-block fill-current" />
                <p className="font-bold">
                  ACME Industries Ltd.
                  <br />
                  Providing reliable tech since 1992
                </p>
                <p className="text-sm mt-3 mb-3">
                  Copyright © {new Date().getFullYear()} - All right reserved
                </p>
              </aside>
              <nav>
                <div className="grid grid-flow-col gap-4">
                  {socialButtons.map(({ key }) => (
                    <a key={key} aria-label={key}>
                      <SocialIcon kind={key} />
                    </a>
                  ))}
                </div>
              </nav>
            </Footer>
          )}
          code={`<Footer className="bg-primary text-primary-content p-10 rounded footer-horizontal" center>
  <aside>
    <BrandGlyph size={50} className="inline-block fill-current" />
    <p className="font-bold">
      ACME Industries Ltd.
      <br />
      Providing reliable tech since 1992
    </p>
    <p className="text-sm mt-3 mb-3">Copyright © {new Date().getFullYear()} - All right reserved</p>
  </aside>
  <nav>
    <div className="grid grid-flow-col gap-4">
      <a><XIcon /></a>
      <a><VideoIcon /></a>
      <a><CommunityIcon /></a>
    </div>
  </nav>
</Footer>`}
        />

        <ExampleBlock
          title="Centered footer with social icons"
          summary="展示居中导航与版权场景；展示基础的 children 写法。"
          tab={tabCentered}
          preview={() => (
            <Footer className="p-10 bg-base-200 text-base-content rounded footer-horizontal" center>
              <nav className="grid grid-flow-col gap-4">
                <button className="link link-hover">About us</button>
                <button className="link link-hover">Contact</button>
                <button className="link link-hover">Jobs</button>
                <button className="link link-hover">Press kit</button>
              </nav>
              <nav>
                <div className="grid grid-flow-col gap-4">
                  {socialButtons.map(({ key }) => (
                    <button key={key} type="button" aria-label={key}>
                      <SocialIcon kind={key} />
                    </button>
                  ))}
                </div>
              </nav>
              <aside>
                <p className="text-sm mt-3 mb-3">
                  Copyright © {new Date().getFullYear()} - All right reserved by ACME Industries Ltd
                </p>
              </aside>
            </Footer>
          )}
          code={`<Footer className="p-10 bg-base-200 text-base-content rounded footer-horizontal" center>
  <nav className="grid grid-flow-col gap-4">
    <button className="link link-hover">About us</button>
    <button className="link link-hover">Contact</button>
    <button className="link link-hover">Jobs</button>
    <button className="link link-hover">Press kit</button>
  </nav>
  <nav>
    <div className="grid grid-flow-col gap-4">
      <button type="button"><XIcon /></button>
      <button type="button"><VideoIcon /></button>
      <button type="button"><CommunityIcon /></button>
    </div>
  </nav>
  <aside>
    <p className="text-sm mt-3 mb-3">Copyright © {new Date().getFullYear()} - All right reserved by ACME Industries Ltd</p>
  </aside>
</Footer>`}
        />

        <ExampleBlock
          title="Two footer"
          summary="双层 footer 场景展示；下半部分可配合 bordered 或直接使用原类名。"
          tab={tabTwo}
          preview={() => (
            <div className="w-full">
              <Footer
                className="bg-base-200 text-base-content p-10 sm:footer-horizontal"
                sections={baseSections}
              />
              <Footer className="bg-base-200 text-base-content px-10 py-4 border-t border-base-300">
                <aside className="grid-flow-col items-center">
                  <BrandGlyph size={24} />
                  <p className="text-sm mt-3 mb-3">
                    ACME Industries Ltd.
                    <br />
                    Providing reliable tech since 1992
                  </p>
                </aside>
                <nav className="md:place-self-center md:justify-self-end">
                  <div className="grid grid-flow-col gap-4">
                    {socialButtons.map(({ key }) => (
                      <a key={key} aria-label={key}>
                        <SocialIcon kind={key} />
                      </a>
                    ))}
                  </div>
                </nav>
              </Footer>
            </div>
          )}
          code={`<div className="w-full">
  <Footer className="bg-base-200 text-base-content p-10 sm:footer-horizontal" sections={sections} />

  <Footer className="bg-base-200 text-base-content px-10 py-4 border-t border-base-300">
    <aside className="grid-flow-col items-center">
      <BrandGlyph size={24} />
      <p className="text-sm mt-3 mb-3">
        ACME Industries Ltd.
        <br />
        Providing reliable tech since 1992
      </p>
    </aside>
    <nav className="md:place-self-center md:justify-self-end">
      <div className="grid grid-flow-col gap-4">
        <a><XIcon /></a>
        <a><VideoIcon /></a>
        <a><CommunityIcon /></a>
      </div>
    </nav>
  </Footer>
</div>`}
        />

        <h2 id="footer-api">API</h2>
        <p>当前页展示的是语义化的 Footer API，基础的 children 写法仍然可用。</p>

        <h3>Footer</h3>
        <ApiTable rows={rootApiRows} />

        <h3 className="mt-8">Footer.Section</h3>
        <ApiTable rows={sectionApiRows} />

        <div className="not-prose mt-6 rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="mt-0 mb-3 text-base font-semibold">复合子组件</h3>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <code>Footer.Brand</code>：品牌或版权信息容器，默认渲染 <code>aside</code>
            </div>
            <div>
              <code>Footer.Title</code>：带 <code>footer-title</code> 类名的标题节点
            </div>
            <div>
              <code>Footer.Link</code>：默认输出带 <code>link link-hover</code> 的文本链接
            </div>
            <div>
              <code>Footer.Section</code>：单列容器，支持 <code>title</code>、<code>items</code>、
              <code>content</code>
            </div>
          </div>
        </div>

        <h2>FAQ</h2>

        <h3>什么时候用 sections，什么时候可以写 children？</h3>
        <p>
          列结构比较规则时，优先用 <code>sections</code>
          ，维护成本更低；如果某一列需要完全自定义布局，或者你已经有现成的
          <code>nav</code>/<code>aside</code> 模板，也可以继续直接写 <code>children</code>。
        </p>

        <h3>社交图标和订阅表单怎么放进去？</h3>
        <p>
          这类内容更适合放到 <code>Footer.Section</code> 的 <code>content</code>{' '}
          里；如果只是普通文本链接，再用
          <code>items</code> 会更省代码。
        </p>

        <h3>direction 和 center 还需要保持吗？</h3>
        <p>
          需要。它们仍然是最轻量的布局开关，适合和当前的 <code>sm:footer-horizontal</code>、
          <code>footer-center</code>
          类名习惯一起工作，不会破坏项目页面的视觉结果。
        </p>
      </div>
    </SidebarPlayground>
  )
}

export default FooterDemo
