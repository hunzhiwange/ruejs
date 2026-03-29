import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Card, Hover3D, Tabs } from '@rue-js/design'

const Hover3DDemo: FC = () => {
  const tabImage = ref<'preview' | 'code'>('preview')
  const tabCard = ref<'preview' | 'code'>('preview')
  const tabGallery = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Hover 3D 悬浮 3D</h1>
        <p className="text-sm mt-3 mb-3">
          Hover 3D 是一个包裹组件，在悬浮时根据鼠标位置产生倾斜与旋转的 3D 效果。
        </p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/hover-3d/" target="_blank">
            查看 Hover-3D 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 3D image hover effect
          </h2>
          <p className="text-sm mt-3 mb-3">Hover to see the 3D effect</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabImage.value}
            onChange={k => (tabImage.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabImage.value === 'preview' ? (
            <Hover3D className="my-12 mx-2">
              <figure className="max-w-100 rounded-2xl">
                <img
                  src="https://img.daisyui.com/images/stock/creditcard.webp"
                  alt="Tailwind CSS 3D card"
                />
              </figure>
            </Hover3D>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Hover3D>
  <figure className="max-w-100 rounded-2xl">
    <img src="https://img.daisyui.com/images/stock/creditcard.webp" alt="3D card" />
  </figure>
</Hover3D>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 3D card hover effect
          </h2>
          <p className="text-sm mt-3 mb-3">The whole card can be a link</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCard.value}
            onChange={k => (tabCard.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCard.value === 'preview' ? (
            <Hover3D as="a" href="#" className="my-12 mx-2 cursor-pointer">
              <Card className="w-96 bg-black text-white bg-[radial-gradient(circle_at_bottom_left,#ffffff04_35%,transparent_36%),radial-gradient(circle_at_top_right,#ffffff04_35%,transparent_36%)] bg-size-[4.95em_4.95em]">
                <div className="card-body font-mono">
                  <div className="flex justify-between mb-10">
                    <div className="font-bold">BANK OF LATVERIA</div>
                    <div className="text-5xl opacity-10">❁</div>
                  </div>
                  <div className="text-lg mb-4 opacity-40">0210 8820 1150 0222</div>
                  <div className="flex justify-between">
                    <div>
                      <div className="text-xs opacity-20">CARD HOLDER</div>
                      <div>VICTOR VON D.</div>
                    </div>
                    <div>
                      <div className="text-xs opacity-20">EXPIRES</div>
                      <div>29/08</div>
                    </div>
                  </div>
                </div>
              </Card>
            </Hover3D>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Hover3D as="a" href="#" className="my-12 mx-2 cursor-pointer">
  <Card className="w-96 bg-black text-white bg-[radial-gradient(circle_at_bottom_left,#ffffff04_35%,transparent_36%),radial-gradient(circle_at_top_right,#ffffff04_35%,transparent_36%)] bg-size-[4.95em_4.95em]">
    <div className="card-body font-mono">
      <div className="flex justify-between mb-10">
        <div className="font-bold">BANK OF LATVERIA</div>
        <div className="text-5xl opacity-10">❁</div>
      </div>
      <div className="text-lg mb-4 opacity-40">0210 8820 1150 0222</div>
      <div className="flex justify-between">
        <div>
          <div className="text-xs opacity-20">CARD HOLDER</div>
          <div>VICTOR VON D.</div>
        </div>
        <div>
          <div className="text-xs opacity-20">EXPIRES</div>
          <div>29/08</div>
        </div>
      </div>
    </div>
  </Card>
</Hover3D>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # 3D hover effect for image gallery
          </h2>
          <p className="text-sm mt-3 mb-3">Hover to see the 3D effect</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabGallery.value}
            onChange={k => (tabGallery.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabGallery.value === 'preview' ? (
            <div className="flex max-sm:flex-col gap-10 p-10 max-sm:w-70">
              <Hover3D>
                <figure className="rounded-xl">
                  <img
                    src="https://img.daisyui.com/images/stock/card-1.webp?x"
                    alt="Tailwind CSS 3D card"
                  />
                </figure>
              </Hover3D>
              <Hover3D>
                <figure className="rounded-xl">
                  <img
                    src="https://img.daisyui.com/images/stock/card-2.webp?x"
                    alt="Tailwind CSS 3D hover"
                  />
                </figure>
              </Hover3D>
              <Hover3D>
                <figure className="rounded-xl">
                  <img
                    src="https://img.daisyui.com/images/stock/card-3.webp?x"
                    alt="Tailwind CSS Card 3D effect"
                  />
                </figure>
              </Hover3D>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="flex max-sm:flex-col gap-10 p-10 max-sm:w-70">
  <Hover3D>
    <figure className="rounded-2xl w-60">
      <img src="https://img.daisyui.com/images/stock/card-1.webp?x" alt="Tailwind CSS 3D card" />
    </figure>
  </Hover3D>
  <Hover3D>
    <figure className="rounded-2xl w-60">
      <img src="https://img.daisyui.com/images/stock/card-2.webp?x" alt="Tailwind CSS 3D hover" />
    </figure>
  </Hover3D>
  <Hover3D>
    <figure className="rounded-2xl w-60">
      <img src="https://img.daisyui.com/images/stock/card-3.webp?x" alt="Tailwind CSS 3D hover" />
    </figure>
  </Hover3D>
</div>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default Hover3DDemo
