import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Diff, Tabs } from '@rue-js/design'

const DiffDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabText = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Diff 对比</h1>
        <p className="text-sm mt-3 mb-3">Diff 组件用于并排比较两项内容。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/diff/" target="_blank">
            查看 Diff 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Diff</h2>
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
            <Diff className="rounded-field aspect-16/9" tabIndex={0}>
              <Diff.Item1 role="img" tabIndex={0}>
                <img
                  alt="daisy"
                  src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a.webp"
                />
              </Diff.Item1>
              <Diff.Item2 role="img">
                <img
                  alt="daisy"
                  src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a-blur.webp"
                />
              </Diff.Item2>
              <Diff.Resizer />
            </Diff>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Diff className="aspect-16/9" tabIndex={0}>
  <Diff.Item1 role="img" tabIndex={0}>
    <img alt="daisy" src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a.webp" />
  </Diff.Item1>
  <Diff.Item2 role="img">
    <img alt="daisy" src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a-blur.webp" />
  </Diff.Item2>
  <Diff.Resizer />
</Diff>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Diff text</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabText.value}
            onChange={k => (tabText.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabText.value === 'preview' ? (
            <Diff className="rounded-field aspect-16/9" tabIndex={0}>
              <Diff.Item1 role="img" tabIndex={0}>
                <div className="bg-primary text-primary-content text-4xl lg:text-9xl font-black grid place-content-center">
                  DAISY
                </div>
              </Diff.Item1>
              <Diff.Item2 role="img">
                <div className="bg-base-200 text-4xl lg:text-9xl font-black grid place-content-center">
                  DAISY
                </div>
              </Diff.Item2>
              <Diff.Resizer />
            </Diff>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Diff className="aspect-16/9" tabIndex={0}>
  <Diff.Item1 role="img" tabIndex={0}>
    <div className="bg-primary text-primary-content grid place-content-center text-9xl font-black">
      DAISY
    </div>
  </Diff.Item1>
  <Diff.Item2 role="img">
    <div className="bg-base-200 grid place-content-center text-9xl font-black">DAISY</div>
  </Diff.Item2>
  <Diff.Resizer />
</Diff>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default DiffDemo
