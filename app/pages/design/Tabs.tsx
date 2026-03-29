import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Tabs } from '@rue-js/design'

const TabsDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabBorder = ref<'preview' | 'code'>('preview')
  const tabLift = ref<'preview' | 'code'>('preview')
  const tabBox = ref<'preview' | 'code'>('preview')
  const tabSizes = ref<'preview' | 'code'>('preview')
  const tabPlacement = ref<'preview' | 'code'>('preview')
  const tabDisabled = ref<'preview' | 'code'>('preview')
  const tabCustomColor = ref<'preview' | 'code'>('preview')

  const active1 = ref('tab2')
  const active2 = ref('tab2')
  const active3 = ref('tab2')
  const active4 = ref('tab2')
  const active5xs = ref('xs2')
  const active5sm = ref('sm2')
  const active5md = ref('md2')
  const active5lg = ref('lg2')
  const active5xl = ref('xl2')
  const activeBottom = ref('b2')
  const activeDisabled = ref('d1')
  const activeCustom = ref('c2')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Tabs 选项卡</h1>
        <p className="text-sm mt-3 mb-3">
          选项卡（Tabs）用于在有限空间中组织内容分组，用户可在同一层级间切换。
        </p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/tab/" target="_blank">
            查看 Tabs 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># tabs</h2>
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
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Tabs
                  items={[
                    { key: 'tab1', label: 'Tab 1' },
                    { key: 'tab2', label: 'Tab 2' },
                    { key: 'tab3', label: 'Tab 3' },
                  ]}
                  activeKey={active1.value}
                  onChange={k => (active1.value = k)}
                />
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Tabs } from '@rue-js/design';
<Tabs
  items={[
    { key: 'tab1', label: 'Tab 1' },
    { key: 'tab2', label: 'Tab 2' },
    { key: 'tab3', label: 'Tab 3' },
  ]}
  activeKey="tab2"
  onChange={k => console.log(k)}
/>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># tabs-border</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBorder.value}
            onChange={k => (tabBorder.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBorder.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Tabs
                  style="border"
                  items={[
                    { key: 'tab1', label: 'Tab 1' },
                    { key: 'tab2', label: 'Tab 2' },
                    { key: 'tab3', label: 'Tab 3' },
                  ]}
                  activeKey={active2.value}
                  onChange={k => (active2.value = k)}
                />
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Tabs style="border" items={[{ key: 'tab1', label: 'Tab 1' }, { key: 'tab2', label: 'Tab 2' }, { key: 'tab3', label: 'Tab 3' }]} activeKey="tab2" />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># tabs-lift</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLift.value}
            onChange={k => (tabLift.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLift.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Tabs
                  style="lift"
                  items={[
                    { key: 'tab1', label: 'Tab 1' },
                    { key: 'tab2', label: 'Tab 2' },
                    { key: 'tab3', label: 'Tab 3' },
                  ]}
                  activeKey={active3.value}
                  onChange={k => (active3.value = k)}
                />
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Tabs style="lift" items={[{ key: 'tab1', label: 'Tab 1' }, { key: 'tab2', label: 'Tab 2' }, { key: 'tab3', label: 'Tab 3' }]} activeKey="tab2" />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># tabs-box</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabBox.value}
            onChange={k => (tabBox.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabBox.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Tabs
                  style="box"
                  items={[
                    { key: 'tab1', label: 'Tab 1' },
                    { key: 'tab2', label: 'Tab 2' },
                    { key: 'tab3', label: 'Tab 3' },
                  ]}
                  activeKey={active4.value}
                  onChange={k => (active4.value = k)}
                />
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Tabs style="box" items={[{ key: 'tab1', label: 'Tab 1' }, { key: 'tab2', label: 'Tab 2' }, { key: 'tab3', label: 'Tab 3' }]} activeKey="tab2" />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Sizes</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSizes.value}
            onChange={k => (tabSizes.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSizes.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body flex flex-col items-center gap-6">
                <Tabs
                  style="lift"
                  size="xs"
                  items={[
                    { key: 'xs1', label: 'Xsmall' },
                    { key: 'xs2', label: 'Xsmall' },
                    { key: 'xs3', label: 'Xsmall' },
                  ]}
                  activeKey={active5xs.value}
                  onChange={k => (active5xs.value = k)}
                />
                <Tabs
                  style="lift"
                  size="sm"
                  items={[
                    { key: 'sm1', label: 'Small' },
                    { key: 'sm2', label: 'Small' },
                    { key: 'sm3', label: 'Small' },
                  ]}
                  activeKey={active5sm.value}
                  onChange={k => (active5sm.value = k)}
                />
                <Tabs
                  style="lift"
                  items={[
                    { key: 'md1', label: 'Medium' },
                    { key: 'md2', label: 'Medium' },
                    { key: 'md3', label: 'Medium' },
                  ]}
                  activeKey={active5md.value}
                  onChange={k => (active5md.value = k)}
                />
                <Tabs
                  style="lift"
                  size="lg"
                  items={[
                    { key: 'lg1', label: 'Large' },
                    { key: 'lg2', label: 'Large' },
                    { key: 'lg3', label: 'Large' },
                  ]}
                  activeKey={active5lg.value}
                  onChange={k => (active5lg.value = k)}
                />
                <Tabs
                  style="lift"
                  size="xl"
                  items={[
                    { key: 'xl1', label: 'Xlarge' },
                    { key: 'xl2', label: 'Xlarge' },
                    { key: 'xl3', label: 'Xlarge' },
                  ]}
                  activeKey={active5xl.value}
                  onChange={k => (active5xl.value = k)}
                />
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Tabs style="lift" size="xs" items={[{ key: 'xs1', label: 'Xsmall' }, { key: 'xs2', label: 'Xsmall' }, { key: 'xs3', label: 'Xsmall' }]} activeKey="xs2" />
<Tabs style="lift" size="sm" items={[{ key: 'sm1', label: 'Small' }, { key: 'sm2', label: 'Small' }, { key: 'sm3', label: 'Small' }]} activeKey="sm2" />
<Tabs style="lift" items={[{ key: 'md1', label: 'Medium' }, { key: 'md2', label: 'Medium' }, { key: 'md3', label: 'Medium' }]} activeKey="md2" />
<Tabs style="lift" size="lg" items={[{ key: 'lg1', label: 'Large' }, { key: 'lg2', label: 'Large' }, { key: 'lg3', label: 'Large' }]} activeKey="lg2" />
<Tabs style="lift" size="xl" items={[{ key: 'xl1', label: 'Xlarge' }, { key: 'xl2', label: 'Xlarge' }, { key: 'xl3', label: 'Xlarge' }]} activeKey="xl2" />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># tabs-bottom</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPlacement.value}
            onChange={k => (tabPlacement.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPlacement.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Tabs
                  style="lift"
                  placement="bottom"
                  items={[
                    { key: 'b1', label: 'Tab 1' },
                    { key: 'b2', label: 'Tab 2' },
                    { key: 'b3', label: 'Tab 3' },
                  ]}
                  activeKey={activeBottom.value}
                  onChange={k => (activeBottom.value = k)}
                />
                <div className="tab-content border-base-300 bg-base-100 p-6 mt-2">
                  Tab content{' '}
                  {(activeBottom.value === 'b1' && 1) || (activeBottom.value === 'b2' && 2) || 3}
                </div>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Tabs style="lift" placement="bottom" items={[{ key: 'b1', label: 'Tab 1' }, { key: 'b2', label: 'Tab 2' }, { key: 'b3', label: 'Tab 3' }]} activeKey="b2" />
<div className="tab-content border-base-300 bg-base-100 p-6">Tab content 2</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # tab-disabled
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabDisabled.value}
            onChange={k => (tabDisabled.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabDisabled.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Tabs
                  items={[
                    { key: 'd1', label: 'Disabled', disabled: true },
                    { key: 'd2', label: 'Active' },
                    { key: 'd3', label: 'Tab' },
                  ]}
                  activeKey={activeDisabled.value}
                  onChange={k => (activeDisabled.value = k)}
                />
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Tabs items={[{ key: 'd1', label: 'Disabled', disabled: true }, { key: 'd2', label: 'Active' }, { key: 'd3', label: 'Tab' }]} activeKey="d1" />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Tabs with custom color
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCustomColor.value}
            onChange={k => (tabCustomColor.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCustomColor.value === 'preview' ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Tabs
                  style="lift"
                  items={[
                    { key: 'c1', label: 'Tab 1' },
                    {
                      key: 'c2',
                      label: 'Tab 2',
                      className:
                        'tab-active text-primary [--tab-bg:orange] [--tab-border-color:red]',
                    },
                    { key: 'c3', label: 'Tab 3' },
                  ]}
                  activeKey={activeCustom.value}
                  onChange={k => (activeCustom.value = k)}
                />
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Tabs style="lift" items={[{ key: 'c1', label: 'Tab 1' }, { key: 'c2', label: 'Tab 2', className: 'tab-active text-primary [--tab-bg:orange] [--tab-border-color:red]' }, { key: 'c3', label: 'Tab 3' }]} activeKey="c2" />`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default TabsDemo
