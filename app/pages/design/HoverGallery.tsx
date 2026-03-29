import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { HoverGallery, Tabs } from '@rue-js/design'

const HoverGalleryDemo: FC = () => {
  const tabHow = ref<'preview' | 'code'>('preview')
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabInCard = ref<'preview' | 'code'>('preview')
  const tabArray = ref<'preview' | 'code'>('preview')
  const galleryItems = [
    'https://img.daisyui.com/images/stock/daisyui-hat-1.webp',
    {
      src: 'https://img.daisyui.com/images/stock/daisyui-hat-2.webp',
      alt: 'Tailwind CSS image hover gallery',
    },
    {
      node: (
        <img
          src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp"
          alt="Tailwind CSS image hover gallery"
        />
      ),
    },
    'https://img.daisyui.com/images/stock/daisyui-hat-4.webp',
  ]

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Hover Gallery 悬浮画廊</h1>
        <p className="text-sm mt-3 mb-3">
          容器包含多张图片，默认显示第一张，水平悬停时显示其它图片。
        </p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/hover-gallery/" target="_blank">
            查看 Hover Gallery 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # How it works
          </h2>
          <p className="text-sm mt-3 mb-3">
            第一张图片默认可见，其余图片通过不可见列覆盖，悬停到每列时显示对应图片。
          </p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabHow.value}
            onChange={k => (tabHow.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabHow.value === 'preview' ? (
            <div className="flex justify-center">
              <div className="grid *:[grid-area:1/1] rounded-box overflow-hidden">
                <HoverGallery as="figure" className="max-w-60">
                  <img
                    src="https://img.daisyui.com/images/stock/daisyui-hat-1.webp"
                    alt="Tailwind CSS image hover gallery"
                  />
                  <img
                    src="https://img.daisyui.com/images/stock/daisyui-hat-2.webp"
                    alt="Tailwind CSS image hover gallery"
                  />
                  <img
                    src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp"
                    alt="Tailwind CSS image hover gallery"
                  />
                  <img
                    src="https://img.daisyui.com/images/stock/daisyui-hat-4.webp"
                    alt="Tailwind CSS image hover gallery"
                  />
                </HoverGallery>
                <div className="grid grid-cols-3 pointer-events-none font-mono *:to-black/10 *:via-transparent *:from-white/10 *:bg-linear-80 *:grid *:place-content-center text-white text-shadow-lg">
                  <div>2</div>
                  <div>3</div>
                  <div>4</div>
                </div>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="flex justify-center">
  <div className="grid *:[grid-area:1/1] rounded-box overflow-hidden">
    <HoverGallery as="figure" className="max-w-60">
      <img src="https://img.daisyui.com/images/stock/daisyui-hat-1.webp" />
      <img src="https://img.daisyui.com/images/stock/daisyui-hat-2.webp" />
      <img src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp" />
      <img src="https://img.daisyui.com/images/stock/daisyui-hat-4.webp" />
    </HoverGallery>
    <div className="grid grid-cols-3 pointer-events-none font-mono *:to-black/10 *:via-transparent *:from-white/10 *:bg-linear-80 *:grid *:place-content-center text-white text-shadow-lg">
      <div>2</div>
      <div>3</div>
      <div>4</div>
    </div>
  </div>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Hover Gallery
          </h2>
          <p className="text-sm mt-3 mb-3">将鼠标水平移动到图片上。</p>
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
            <HoverGallery as="figure" className="max-w-60">
              <img
                src="https://img.daisyui.com/images/stock/daisyui-hat-1.webp"
                alt="Tailwind CSS image hover gallery"
              />
              <img
                src="https://img.daisyui.com/images/stock/daisyui-hat-2.webp"
                alt="Tailwind CSS image hover gallery"
              />
              <img
                src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp"
                alt="Tailwind CSS image hover gallery"
              />
              <img
                src="https://img.daisyui.com/images/stock/daisyui-hat-4.webp"
                alt="Tailwind CSS image hover gallery"
              />
            </HoverGallery>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<HoverGallery as="figure" className="max-w-60">
  <img src="https://img.daisyui.com/images/stock/daisyui-hat-1.webp" />
  <img src="https://img.daisyui.com/images/stock/daisyui-hat-2.webp" />
  <img src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp" />
  <img src="https://img.daisyui.com/images/stock/daisyui-hat-4.webp" />
</HoverGallery>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Hover Gallery 通过数据渲染（数组）
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
            <HoverGallery as="figure" className="max-w-60" items={galleryItems} />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { HoverGallery } from '@rue-js/design';
const galleryItems = [
  'https://img.daisyui.com/images/stock/daisyui-hat-1.webp',
  { src: 'https://img.daisyui.com/images/stock/daisyui-hat-2.webp', alt: 'Tailwind CSS image hover gallery' },
  { node: (
    <img
      src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp"
      alt="Tailwind CSS image hover gallery"
    />
  ) },
  'https://img.daisyui.com/images/stock/daisyui-hat-4.webp',
];
<HoverGallery as="figure" className="max-w-60" items={galleryItems} />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Hover Gallery in a card
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabInCard.value}
            onChange={k => (tabInCard.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabInCard.value === 'preview' ? (
            <div className="card card-sm bg-base-200 max-w-60 shadow">
              <HoverGallery as="figure">
                <img
                  src="https://img.daisyui.com/images/stock/daisyui-hat-1.webp"
                  alt="Tailwind CSS image hover gallery"
                />
                <img
                  src="https://img.daisyui.com/images/stock/daisyui-hat-2.webp"
                  alt="Tailwind CSS image hover gallery"
                />
                <img
                  src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp"
                  alt="Tailwind CSS image hover gallery"
                />
                <img
                  src="https://img.daisyui.com/images/stock/daisyui-hat-4.webp"
                  alt="Tailwind CSS image hover gallery"
                />
              </HoverGallery>
              <div className="card-body">
                <h2 className="card-title flex justify-between">
                  daisyUI Hat
                  <span className="font-normal">$25</span>
                </h2>
                <p className="text-sm mt-3 mb-3">High Quality classic cap hat with stitch logo</p>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="card card-sm bg-base-200 max-w-60 shadow">
  <HoverGallery as="figure">
    <img src="https://img.daisyui.com/images/stock/daisyui-hat-1.webp" />
    <img src="https://img.daisyui.com/images/stock/daisyui-hat-2.webp" />
    <img src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp" />
    <img src="https://img.daisyui.com/images/stock/daisyui-hat-4.webp" />
  </HoverGallery>
  <div className="card-body">
    <h2 className="card-title flex justify-between">
      daisyUI Hat
      <span className="font-normal">$25</span>
    </h2>
    <p className="text-sm mt-3 mb-3">High Quality classic cap hat with stitch logo</p>
  </div>
</div>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default HoverGalleryDemo
