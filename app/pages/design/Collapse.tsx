import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Collapse, Tabs } from '@rue-js/design'

const CollapseDemo: FC = () => {
  const tabFocus = ref<'preview' | 'code'>('preview')
  const tabCheckbox = ref<'preview' | 'code'>('preview')
  const tabDetails = ref<'preview' | 'code'>('preview')
  const tabNoBorder = ref<'preview' | 'code'>('preview')
  const tabArrow = ref<'preview' | 'code'>('preview')
  const tabPlus = ref<'preview' | 'code'>('preview')
  const tabIconStart = ref<'preview' | 'code'>('preview')
  const tabOpen = ref<'preview' | 'code'>('preview')
  const tabClose = ref<'preview' | 'code'>('preview')
  const tabCustomFocus = ref<'preview' | 'code'>('preview')
  const tabCustomCheckbox = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Collapse 折叠面板</h1>
        <p className="text-sm mt-3 mb-3">用于展示与隐藏内容。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/collapse/" target="_blank">
            查看 Collapse 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Collapse with focus
          </h2>
          <p className="text-sm mt-3 mb-3">当元素失焦时会关闭。</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabFocus.value}
            onChange={k => (tabFocus.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabFocus.value === 'preview' ? (
            <Collapse tabIndex={0} className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Collapse } from '@rue-js/design';
<Collapse tabIndex={0} className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Collapse.Content>
</Collapse>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Collapse with checkbox
          </h2>
          <p className="text-sm mt-3 mb-3">使用复选框控制展开与关闭。</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCheckbox.value}
            onChange={k => (tabCheckbox.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCheckbox.value === 'preview' ? (
            <Collapse className="bg-base-100 border border-base-300">
              <input type="checkbox" />
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Collapse className="bg-base-100 border border-base-300">
  <input type="checkbox" />
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Collapse.Content>
</Collapse>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Collapse using details and summary tag
          </h2>
          <p className="text-sm mt-3 mb-3">使用 details/summary 标签。</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabDetails.value}
            onChange={k => (tabDetails.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabDetails.value === 'preview' ? (
            <Collapse tag="details" className="bg-base-100 border border-base-300">
              <Collapse.Title as="summary" className="font-semibold">
                How do I create an account?
              </Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Collapse tag="details" className="bg-base-100 border border-base-300">
  <Collapse.Title as="summary" className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Collapse.Content>
</Collapse>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Without border and background color
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabNoBorder.value}
            onChange={k => (tabNoBorder.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabNoBorder.value === 'preview' ? (
            <Collapse tabIndex={0}>
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Collapse tabIndex={0}>
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Collapse.Content>
</Collapse>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # With arrow icon
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabArrow.value}
            onChange={k => (tabArrow.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabArrow.value === 'preview' ? (
            <Collapse tabIndex={0} arrow className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Collapse tabIndex={0} arrow className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Collapse.Content>
</Collapse>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # With plus/minus icon
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabPlus.value}
            onChange={k => (tabPlus.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabPlus.value === 'preview' ? (
            <Collapse tabIndex={0} plus className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Collapse tabIndex={0} plus className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Collapse.Content>
</Collapse>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Moving collapse icon to the start
          </h2>
          <p className="text-sm mt-3 mb-3">通过 utility 类移动图标位置。</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabIconStart.value}
            onChange={k => (tabIconStart.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabIconStart.value === 'preview' ? (
            <Collapse tabIndex={0} arrow className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold after:start-5 after:end-auto pe-4 ps-12">
                How do I create an account?
              </Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Collapse tabIndex={0} arrow className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold after:start-5 after:end-auto pe-4 ps-12">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Collapse.Content>
</Collapse>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Force open</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabOpen.value}
            onChange={k => (tabOpen.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabOpen.value === 'preview' ? (
            <Collapse tabIndex={0} open className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Collapse tabIndex={0} open className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold">I have collapse-open class</Collapse.Title>
  <Collapse.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Collapse.Content>
</Collapse>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Force close</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabClose.value}
            onChange={k => (tabClose.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabClose.value === 'preview' ? (
            <Collapse tabIndex={0} close className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Collapse tabIndex={0} close className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold">I have collapse-open class</Collapse.Title>
  <Collapse.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Collapse.Content>
</Collapse>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Custom colors for collapse that works with focus
          </h2>
          <p className="text-sm mt-3 mb-3">通过 focus 触发颜色变化。</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCustomFocus.value}
            onChange={k => (tabCustomFocus.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCustomFocus.value === 'preview' ? (
            <Collapse
              tabIndex={0}
              className="bg-primary text-primary-content focus:bg-secondary focus:text-secondary-content"
            >
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Collapse tabIndex={0} className="bg-primary text-primary-content focus:bg-secondary focus:text-secondary-content">
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Collapse.Content>
</Collapse>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Custom colors for collapse that works with checkbox
          </h2>
          <p className="text-sm mt-3 mb-3">通过 peer/peer-checked 触发颜色变化。</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabCustomCheckbox.value}
            onChange={k => (tabCustomCheckbox.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabCustomCheckbox.value === 'preview' ? (
            <Collapse className="bg-base-100 border border-base-300">
              <input type="checkbox" className="peer" />
              <Collapse.Title className="bg-primary text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content font-semibold">
                How do I create an account?
              </Collapse.Title>
              <Collapse.Content className="bg-primary text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Collapse className="bg-base-100 border border-base-300">
  <input type="checkbox" className="peer" />
  <Collapse.Title className="bg-primary text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="bg-primary text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content text-sm">Click the "Sign Up" button in the top right corner and follow the registration process.</Collapse.Content>
</Collapse>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default CollapseDemo
