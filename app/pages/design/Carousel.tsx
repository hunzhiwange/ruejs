import { type FC, ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Button, Carousel, Tabs } from '@rue-js/design'

const CarouselDemo: FC = () => {
  const tabStart = ref<'preview' | 'code'>('preview')
  const tabCenter = ref<'preview' | 'code'>('preview')
  const tabEnd = ref<'preview' | 'code'>('preview')
  const tabFullWidth = ref<'preview' | 'code'>('preview')
  const tabVertical = ref<'preview' | 'code'>('preview')
  const tabHalfWidth = ref<'preview' | 'code'>('preview')
  const tabFullBleed = ref<'preview' | 'code'>('preview')
  const tabIndicators = ref<'preview' | 'code'>('preview')
  const tabNextPrev = ref<'preview' | 'code'>('preview')
  const tabNextPrevLeft = ref<'preview' | 'code'>('preview')
  const indicatorIndex = ref(0)
  const nextPrevIndex = ref(0)
  const nextPrevIndexLeft = ref(0)

  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabVertical2 = ref<'preview' | 'code'>('preview')
  const tabControlled = ref<'preview' | 'code'>('preview')
  const tabAuto = ref<'preview' | 'code'>('preview')
  const tabArrayInternal = ref<'preview' | 'code'>('preview')
  const controlledIndex = ref(0)

  const items = [
    { content: <img alt="1" src="https://picsum.photos/id/1011/600/300" />, className: 'relative' },
    { content: <img alt="2" src="https://picsum.photos/id/1015/600/300" />, className: 'relative' },
    { content: <img alt="3" src="https://picsum.photos/id/1016/600/300" />, className: 'relative' },
  ]

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Carousel 跑马灯</h1>
        <p className="text-sm mt-3 mb-3">
          Carousel 在可滚动区域内展示图片或内容，支持自动滚动与代码控制。
        </p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/carousel/" target="_blank">
            查看 Carousel 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Snap to start (default)
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabStart.value}
            onChange={k => (tabStart.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabStart.value === 'preview' ? (
            <Carousel align="start" className="rounded-box" auto interval={1000}>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
                  alt="Carousel slider"
                />
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Carousel align="start" className="rounded-box" auto interval={1000}>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp" alt="Carousel slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp" alt="Carousel slider" /></Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Snap to center
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCenter.value}
            onChange={k => (tabCenter.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCenter.value === 'preview' ? (
            <Carousel align="center" className="rounded-box" auto interval={1500}>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
                  alt="Tailwind CSS slider"
                />
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Carousel align="center" className="rounded-box" auto interval={1500}>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp" alt="Tailwind CSS slider" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp" alt="Tailwind CSS slider" /></Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Snap to end</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabEnd.value}
            onChange={k => (tabEnd.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabEnd.value === 'preview' ? (
            <Carousel align="end" className="rounded-box" auto interval={1500}>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
                  alt="Tailwind CSS slide component"
                />
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Carousel align="end" className="rounded-box" auto interval={1500}>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
  <Carousel.Item><img src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp" alt="Tailwind CSS slide component" /></Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Carousel with full width items
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabFullWidth.value}
            onChange={k => (tabFullWidth.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabFullWidth.value === 'preview' ? (
            <Carousel className="w-64 rounded-box" auto interval={1500}>
              <Carousel.Item className="w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
                  alt="Tailwind CSS carousel component"
                />
              </Carousel.Item>
              <Carousel.Item className="w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
                  alt="Tailwind CSS carousel component"
                />
              </Carousel.Item>
              <Carousel.Item className="w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
                  alt="Tailwind CSS carousel component"
                />
              </Carousel.Item>
              <Carousel.Item className="w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
                  alt="Tailwind CSS carousel component"
                />
              </Carousel.Item>
              <Carousel.Item className="w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
                  alt="Tailwind CSS carousel component"
                />
              </Carousel.Item>
              <Carousel.Item className="w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
                  alt="Tailwind CSS carousel component"
                />
              </Carousel.Item>
              <Carousel.Item className="w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
                  alt="Tailwind CSS carousel component"
                />
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Carousel className="w-64 rounded-box" auto interval={1500}>
  <Carousel.Item className="w-full"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" alt="Tailwind CSS carousel component" /></Carousel.Item>
  <Carousel.Item className="w-full"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp" alt="Tailwind CSS carousel component" /></Carousel.Item>
  <Carousel.Item className="w-full"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp" alt="Tailwind CSS carousel component" /></Carousel.Item>
  <Carousel.Item className="w-full"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp" alt="Tailwind CSS carousel component" /></Carousel.Item>
  <Carousel.Item className="w-full"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp" alt="Tailwind CSS carousel component" /></Carousel.Item>
  <Carousel.Item className="w-full"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp" alt="Tailwind CSS carousel component" /></Carousel.Item>
  <Carousel.Item className="w-full"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp" alt="Tailwind CSS carousel component" /></Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Vertical carousel
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabVertical.value}
            onChange={k => (tabVertical.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabVertical.value === 'preview' ? (
            <Carousel direction="vertical" className="h-96 rounded-box" auto interval={1500}>
              <Carousel.Item className="h-full">
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
                  alt="Free Tailwind CSS Slider"
                />
              </Carousel.Item>
              <Carousel.Item className="h-full">
                <img
                  src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
                  alt="Free Tailwind CSS Slider"
                />
              </Carousel.Item>
              <Carousel.Item className="h-full">
                <img
                  src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
                  alt="Free Tailwind CSS Slider"
                />
              </Carousel.Item>
              <Carousel.Item className="h-full">
                <img
                  src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
                  alt="Free Tailwind CSS Slider"
                />
              </Carousel.Item>
              <Carousel.Item className="h-full">
                <img
                  src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
                  alt="Free Tailwind CSS Slider"
                />
              </Carousel.Item>
              <Carousel.Item className="h-full">
                <img
                  src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
                  alt="Free Tailwind CSS Slider"
                />
              </Carousel.Item>
              <Carousel.Item className="h-full">
                <img
                  src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
                  alt="Free Tailwind CSS Slider"
                />
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Carousel direction="vertical" className="h-96 rounded-box" auto interval={1500}>
  <Carousel.Item className="h-full"><img src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" alt="Free Tailwind CSS Slider" /></Carousel.Item>
  <Carousel.Item className="h-full"><img src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp" alt="Free Tailwind CSS Slider" /></Carousel.Item>
  <Carousel.Item className="h-full"><img src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp" alt="Free Tailwind CSS Slider" /></Carousel.Item>
  <Carousel.Item className="h-full"><img src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp" alt="Free Tailwind CSS Slider" /></Carousel.Item>
  <Carousel.Item className="h-full"><img src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp" alt="Free Tailwind CSS Slider" /></Carousel.Item>
  <Carousel.Item className="h-full"><img src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp" alt="Free Tailwind CSS Slider" /></Carousel.Item>
  <Carousel.Item className="h-full"><img src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp" alt="Free Tailwind CSS Slider" /></Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Carousel with half width items
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabHalfWidth.value}
            onChange={k => (tabHalfWidth.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabHalfWidth.value === 'preview' ? (
            <Carousel className="w-96 rounded-box" auto interval={1500}>
              <Carousel.Item className="w-1/2">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
                  alt="Tailwind CSS slide plugin"
                />
              </Carousel.Item>
              <Carousel.Item className="w-1/2">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
                  alt="Tailwind CSS slide plugin"
                />
              </Carousel.Item>
              <Carousel.Item className="w-1/2">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
                  alt="Tailwind CSS slide plugin"
                />
              </Carousel.Item>
              <Carousel.Item className="w-1/2">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
                  alt="Tailwind CSS slide plugin"
                />
              </Carousel.Item>
              <Carousel.Item className="w-1/2">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
                  alt="Tailwind CSS slide plugin"
                />
              </Carousel.Item>
              <Carousel.Item className="w-1/2">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
                  alt="Tailwind CSS slide plugin"
                />
              </Carousel.Item>
              <Carousel.Item className="w-1/2">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
                  alt="Tailwind CSS slide plugin"
                />
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Carousel className="w-96 rounded-box" auto interval={1500}>
  <Carousel.Item className="w-1/2"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" alt="Tailwind CSS slide plugin" /></Carousel.Item>
  <Carousel.Item className="w-1/2"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp" alt="Tailwind CSS slide plugin" /></Carousel.Item>
  <Carousel.Item className="w-1/2"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp" alt="Tailwind CSS slide plugin" /></Carousel.Item>
  <Carousel.Item className="w-1/2"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp" alt="Tailwind CSS slide plugin" /></Carousel.Item>
  <Carousel.Item className="w-1/2"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp" alt="Tailwind CSS slide plugin" /></Carousel.Item>
  <Carousel.Item className="w-1/2"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp" alt="Tailwind CSS slide plugin" /></Carousel.Item>
  <Carousel.Item className="w-1/2"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp" alt="Tailwind CSS slide plugin" /></Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Full-bleed carousel
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabFullBleed.value}
            onChange={k => (tabFullBleed.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabFullBleed.value === 'preview' ? (
            <Carousel
              align="center"
              className="max-w-md p-4 space-x-4 bg-neutral rounded-box"
              auto
              interval={1500}
            >
              <Carousel.Item>
                <img
                  className="rounded-box"
                  src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
                  alt="Tailwind CSS component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  className="rounded-box"
                  src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
                  alt="Tailwind CSS component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  className="rounded-box"
                  src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
                  alt="Tailwind CSS component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  className="rounded-box"
                  src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
                  alt="Tailwind CSS component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  className="rounded-box"
                  src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
                  alt="Tailwind CSS component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  className="rounded-box"
                  src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
                  alt="Tailwind CSS component"
                />
              </Carousel.Item>
              <Carousel.Item>
                <img
                  className="rounded-box"
                  src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
                  alt="Tailwind CSS component"
                />
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Carousel align="center" className="max-w-md p-4 space-x-4 bg-neutral rounded-box" auto interval={1500}>
  <Carousel.Item><img className="rounded-box" src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" alt="Tailwind CSS component" /></Carousel.Item>
  <Carousel.Item><img className="rounded-box" src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp" alt="Tailwind CSS component" /></Carousel.Item>
  <Carousel.Item><img className="rounded-box" src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp" alt="Tailwind CSS component" /></Carousel.Item>
  <Carousel.Item><img className="rounded-box" src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp" alt="Tailwind CSS component" /></Carousel.Item>
  <Carousel.Item><img className="rounded-box" src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp" alt="Tailwind CSS component" /></Carousel.Item>
  <Carousel.Item><img className="rounded-box" src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp" alt="Tailwind CSS component" /></Carousel.Item>
  <Carousel.Item><img className="rounded-box" src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp" alt="Tailwind CSS component" /></Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Carousel with next/prev buttons
          </h2>
          <p className="text-sm text-base-content/70">
            上一/下一按钮控制索引，自动右滚且循环（默认）。
          </p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabNextPrev.value}
            onChange={k => (tabNextPrev.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabNextPrev.value === 'preview' ? (
            <Carousel
              className="w-full rounded-box"
              activeIndex={nextPrevIndex.value}
              auto
              interval={1500}
              loop
              autoDirection="forward"
            >
              <Carousel.Item className="relative w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1625726411847-8cbb60cc71e6.webp"
                  alt="Tailwind CSS slider with prev/next"
                />
                <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
                  <Button
                    circle
                    onClick={() => (nextPrevIndexLeft.value = (nextPrevIndexLeft.value + 3) % 4)}
                  >
                    ❮
                  </Button>
                  <Button
                    circle
                    onClick={() => (nextPrevIndexLeft.value = (nextPrevIndexLeft.value + 1) % 4)}
                  >
                    ❯
                  </Button>
                </div>
              </Carousel.Item>
              <Carousel.Item className="relative w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1609621838510-5ad474b7d25d.webp"
                  alt="Tailwind CSS slider with prev/next"
                />
                <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
                  <Button
                    circle
                    onClick={() => (nextPrevIndexLeft.value = (nextPrevIndexLeft.value + 3) % 4)}
                  >
                    ❮
                  </Button>
                  <Button
                    circle
                    onClick={() => (nextPrevIndexLeft.value = (nextPrevIndexLeft.value + 1) % 4)}
                  >
                    ❯
                  </Button>
                </div>
              </Carousel.Item>
              <Carousel.Item className="relative w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1414694762283-acccc27bca85.webp"
                  alt="Tailwind CSS slider with prev/next"
                />
                <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
                  <Button
                    circle
                    onClick={() => (nextPrevIndexLeft.value = (nextPrevIndexLeft.value + 3) % 4)}
                  >
                    ❮
                  </Button>
                  <Button
                    circle
                    onClick={() => (nextPrevIndexLeft.value = (nextPrevIndexLeft.value + 1) % 4)}
                  >
                    ❯
                  </Button>
                </div>
              </Carousel.Item>
              <Carousel.Item className="relative w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1665553365602-b2fb8e5d1707.webp"
                  alt="Tailwind CSS slider with prev/next"
                />
                <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
                  <Button
                    circle
                    onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}
                  >
                    ❮
                  </Button>
                  <Button
                    circle
                    onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}
                  >
                    ❯
                  </Button>
                </div>
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const nextPrevIndex = ref(0);
<Carousel className="w-full rounded-box" activeIndex={nextPrevIndex.value} auto interval={1500} loop autoDirection="forward">
  <Carousel.Item className="relative w-full">
    <img className="w-full" src="https://img.daisyui.com/images/stock/photo-1625726411847-8cbb60cc71e6.webp" />
    <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}>❮</Button>
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}>❯</Button>
    </div>
  </Carousel.Item>
  <Carousel.Item className="relative w-full">
    <img className="w-full" src="https://img.daisyui.com/images/stock/photo-1609621838510-5ad474b7d25d.webp" />
    <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}>❮</Button>
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}>❯</Button>
    </div>
  </Carousel.Item>
  <Carousel.Item className="relative w-full">
    <img className="w-full" src="https://img.daisyui.com/images/stock/photo-1414694762283-acccc27bca85.webp" />
    <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}>❮</Button>
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}>❯</Button>
    </div>
  </Carousel.Item>
  <Carousel.Item className="relative w-full">
    <img className="w-full" src="https://img.daisyui.com/images/stock/photo-1665553365602-b2fb8e5d1707.webp" />
    <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}>❮</Button>
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}>❯</Button>
    </div>
  </Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Carousel with next/prev buttons (auto left)
          </h2>
          <p className="text-sm text-base-content/70">上一/下一按钮控制索引，自动左滚且循环。</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabNextPrevLeft.value}
            onChange={k => (tabNextPrevLeft.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabNextPrevLeft.value === 'preview' ? (
            <Carousel
              className="w-full rounded-box"
              activeIndex={nextPrevIndexLeft.value}
              auto
              interval={1500}
              loop
              autoDirection="backward"
            >
              <Carousel.Item className="relative w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1625726411847-8cbb60cc71e6.webp"
                  alt="Tailwind CSS slider with prev/next"
                />
                <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
                  <Button
                    circle
                    onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}
                  >
                    ❮
                  </Button>
                  <Button
                    circle
                    onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}
                  >
                    ❯
                  </Button>
                </div>
              </Carousel.Item>
              <Carousel.Item className="relative w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1609621838510-5ad474b7d25d.webp"
                  alt="Tailwind CSS slider with prev/next"
                />
                <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
                  <Button
                    circle
                    onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}
                  >
                    ❮
                  </Button>
                  <Button
                    circle
                    onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}
                  >
                    ❯
                  </Button>
                </div>
              </Carousel.Item>
              <Carousel.Item className="relative w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1414694762283-acccc27bca85.webp"
                  alt="Tailwind CSS slider with prev/next"
                />
                <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
                  <Button
                    circle
                    onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}
                  >
                    ❮
                  </Button>
                  <Button
                    circle
                    onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}
                  >
                    ❯
                  </Button>
                </div>
              </Carousel.Item>
              <Carousel.Item className="relative w-full">
                <img
                  className="w-full"
                  src="https://img.daisyui.com/images/stock/photo-1665553365602-b2fb8e5d1707.webp"
                  alt="Tailwind CSS slider with prev/next"
                />
                <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
                  <Button
                    circle
                    onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}
                  >
                    ❮
                  </Button>
                  <Button
                    circle
                    onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}
                  >
                    ❯
                  </Button>
                </div>
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const nextPrevIndex = ref(0);
<Carousel className="w-full rounded-box" activeIndex={nextPrevIndex.value} auto interval={1500} loop autoDirection="backward">
  <Carousel.Item className="relative w-full">
    <img className="w-full" src="https://img.daisyui.com/images/stock/photo-1625726411847-8cbb60cc71e6.webp" />
    <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}>❮</Button>
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}>❯</Button>
    </div>
  </Carousel.Item>
  <Carousel.Item className="relative w-full">
    <img className="w-full" src="https://img.daisyui.com/images/stock/photo-1609621838510-5ad474b7d25d.webp" />
    <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}>❮</Button>
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}>❯</Button>
    </div>
  </Carousel.Item>
  <Carousel.Item className="relative w-full">
    <img className="w-full" src="https://img.daisyui.com/images/stock/photo-1414694762283-acccc27bca85.webp" />
    <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}>❮</Button>
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}>❯</Button>
    </div>
  </Carousel.Item>
  <Carousel.Item className="relative w-full">
    <img className="w-full" src="https://img.daisyui.com/images/stock/photo-1665553365602-b2fb8e5d1707.webp" />
    <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 3) % 4)}>❮</Button>
      <Button circle onClick={() => (nextPrevIndex.value = (nextPrevIndex.value + 1) % 4)}>❯</Button>
    </div>
  </Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Carousel with indicator buttons
          </h2>
          <p className="text-sm text-base-content/70">使用代码控制索引，不依赖锚链。</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabIndicators.value}
            onChange={k => (tabIndicators.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabIndicators.value === 'preview' ? (
            <>
              <Carousel className="w-full rounded-box" activeIndex={indicatorIndex.value}>
                <Carousel.Item className="w-full">
                  <img
                    className="w-full"
                    src="https://img.daisyui.com/images/stock/photo-1625726411847-8cbb60cc71e6.webp"
                    alt="Tailwind CSS gallery"
                  />
                </Carousel.Item>
                <Carousel.Item className="w-full">
                  <img
                    className="w-full"
                    src="https://img.daisyui.com/images/stock/photo-1609621838510-5ad474b7d25d.webp"
                    alt="Tailwind CSS gallery"
                  />
                </Carousel.Item>
                <Carousel.Item className="w-full">
                  <img
                    className="w-full"
                    src="https://img.daisyui.com/images/stock/photo-1414694762283-acccc27bca85.webp"
                    alt="Tailwind CSS gallery"
                  />
                </Carousel.Item>
                <Carousel.Item className="w-full">
                  <img
                    className="w-full"
                    src="https://img.daisyui.com/images/stock/photo-1665553365602-b2fb8e5d1707.webp"
                    alt="Tailwind CSS gallery"
                  />
                </Carousel.Item>
              </Carousel>
              <div className="flex justify-center w-full py-2 gap-2">
                <Button size="xs" onClick={() => (indicatorIndex.value = 0)}>
                  1
                </Button>
                <Button size="xs" onClick={() => (indicatorIndex.value = 1)}>
                  2
                </Button>
                <Button size="xs" onClick={() => (indicatorIndex.value = 2)}>
                  3
                </Button>
                <Button size="xs" onClick={() => (indicatorIndex.value = 3)}>
                  4
                </Button>
              </div>
            </>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const indicatorIndex = ref(0);
<Carousel className="w-full rounded-box" activeIndex={indicatorIndex.value}>
  <Carousel.Item className="w-full"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1625726411847-8cbb60cc71e6.webp" /></Carousel.Item>
  <Carousel.Item className="w-full"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1609621838510-5ad474b7d25d.webp" /></Carousel.Item>
  <Carousel.Item className="w-full"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1414694762283-acccc27bca85.webp" /></Carousel.Item>
  <Carousel.Item className="w-full"><img className="w-full" src="https://img.daisyui.com/images/stock/photo-1665553365602-b2fb8e5d1707.webp" /></Carousel.Item>
</Carousel>
<div className="flex justify-center w-full py-2 gap-2">
  <Button size="xs" onClick={() => (indicatorIndex.value = 0)}>1</Button>
  <Button size="xs" onClick={() => (indicatorIndex.value = 1)}>2</Button>
  <Button size="xs" onClick={() => (indicatorIndex.value = 2)}>3</Button>
  <Button size="xs" onClick={() => (indicatorIndex.value = 3)}>4</Button>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 基础（水平居中）
          </h2>
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
            <Carousel align="center" className="rounded-box w-full">
              <Carousel.Item>
                <img alt="1" src="https://picsum.photos/id/1011/600/300" />
              </Carousel.Item>
              <Carousel.Item>
                <img alt="2" src="https://picsum.photos/id/1015/600/300" />
              </Carousel.Item>
              <Carousel.Item>
                <img alt="3" src="https://picsum.photos/id/1016/600/300" />
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Carousel align="center" className="rounded-box w-full">
  <Carousel.Item>
    <img alt="1" src="https://picsum.photos/id/1011/600/300" />
  </Carousel.Item>
  <Carousel.Item>
    <img alt="2" src="https://picsum.photos/id/1015/600/300" />
  </Carousel.Item>
  <Carousel.Item>
    <img alt="3" src="https://picsum.photos/id/1016/600/300" />
  </Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 垂直方向</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabVertical2.value}
            onChange={k => (tabVertical2.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabVertical2.value === 'preview' ? (
            <Carousel direction="vertical" className="rounded-box w-80 h-64">
              <Carousel.Item>
                <img alt="1" src="https://picsum.photos/id/1005/320/200" />
              </Carousel.Item>
              <Carousel.Item>
                <img alt="2" src="https://picsum.photos/id/1018/320/200" />
              </Carousel.Item>
              <Carousel.Item>
                <img alt="3" src="https://picsum.photos/id/1025/320/200" />
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Carousel direction="vertical" className="rounded-box w-80 h-64">
  <Carousel.Item>
    <img alt="1" src="https://picsum.photos/id/1005/320/200" />
  </Carousel.Item>
  <Carousel.Item>
    <img alt="2" src="https://picsum.photos/id/1018/320/200" />
  </Carousel.Item>
  <Carousel.Item>
    <img alt="3" src="https://picsum.photos/id/1025/320/200" />
  </Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 受控切换（activeIndex）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabControlled.value}
            onChange={k => (tabControlled.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabControlled.value === 'preview' ? (
            <div className="prose prose-sm md:prose-basese">
              <div className="mb-2 flex gap-2">
                <button
                  className="btn btn-sm"
                  onClick={() => (controlledIndex.value = Math.max(0, controlledIndex.value - 1))}
                >
                  Prev
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => (controlledIndex.value = Math.min(2, controlledIndex.value + 1))}
                >
                  Next
                </button>
                <span className="text-sm opacity-60">index: {controlledIndex.value}</span>
              </div>
              <Carousel
                align="center"
                activeIndex={controlledIndex.value}
                onIndexChange={i => (controlledIndex.value = i)}
                className="rounded-box w-full"
              >
                <Carousel.Item>
                  <img alt="1" src="https://picsum.photos/id/1011/600/300" />
                </Carousel.Item>
                <Carousel.Item>
                  <img alt="2" src="https://picsum.photos/id/1015/600/300" />
                </Carousel.Item>
                <Carousel.Item>
                  <img alt="3" src="https://picsum.photos/id/1016/600/300" />
                </Carousel.Item>
              </Carousel>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`const controlledIndex = ref(0)
<div>
  <button className="btn btn-sm" onClick={() => (controlledIndex.value = Math.max(0, controlledIndex.value - 1))}>Prev</button>
  <button className="btn btn-sm" onClick={() => (controlledIndex.value = Math.min(2, controlledIndex.value + 1))}>Next</button>
  <Carousel align="center" activeIndex={controlledIndex.value} onIndexChange={i => (controlledIndex.value = i)} className="rounded-box w-full">
    <Carousel.Item>
      <img alt="1" src="https://picsum.photos/id/1011/600/300" />
    </Carousel.Item>
    <Carousel.Item>
      <img alt="2" src="https://picsum.photos/id/1015/600/300" />
    </Carousel.Item>
    <Carousel.Item>
      <img alt="3" src="https://picsum.photos/id/1016/600/300" />
    </Carousel.Item>
  </Carousel>
</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 自动播放（循环）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabAuto.value}
            onChange={k => (tabAuto.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabAuto.value === 'preview' ? (
            <Carousel align="center" auto loop interval={2500} className="rounded-box w-full">
              <Carousel.Item>
                <img alt="1" src="https://picsum.photos/id/1011/600/300" />
              </Carousel.Item>
              <Carousel.Item>
                <img alt="2" src="https://picsum.photos/id/1015/600/300" />
              </Carousel.Item>
              <Carousel.Item>
                <img alt="3" src="https://picsum.photos/id/1016/600/300" />
              </Carousel.Item>
            </Carousel>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Carousel align="center" auto loop interval={2500} className="rounded-box w-full">
  <Carousel.Item>
    <img alt="1" src="https://picsum.photos/id/1011/600/300" />
  </Carousel.Item>
  <Carousel.Item>
    <img alt="2" src="https://picsum.photos/id/1015/600/300" />
  </Carousel.Item>
  <Carousel.Item>
    <img alt="3" src="https://picsum.photos/id/1016/600/300" />
  </Carousel.Item>
</Carousel>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Carousel 通过数据渲染（数组，组件内部）
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabArrayInternal.value}
            onChange={k => (tabArrayInternal.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabArrayInternal.value === 'preview' ? (
            <Carousel className="rounded-box w-full" align="center" items={items} />
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Carousel } from '@rue-js/design';
const items = [
  { content: <img alt="1" src="https://picsum.photos/id/1011/600/300" />, className: 'relative' },
  { content: <img alt="2" src="https://picsum.photos/id/1015/600/300" />, className: 'relative' },
  { content: <img alt="3" src="https://picsum.photos/id/1016/600/300" />, className: 'relative' },
];
<Carousel className="rounded-box w-full" align="center" items={items} />`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default CarouselDemo
