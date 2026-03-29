import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Kbd, Tabs } from '@rue-js/design'

const KbdDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabSizes = ref<'preview' | 'code'>('preview')
  const tabInText = ref<'preview' | 'code'>('preview')
  const tabComb = ref<'preview' | 'code'>('preview')
  const tabFunc = ref<'preview' | 'code'>('preview')
  const tabKeyboard = ref<'preview' | 'code'>('preview')
  const tabArrows = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Kbd 键盘提示</h1>
        <p className="text-sm mt-3 mb-3">用于展示键盘快捷键或按键标识。</p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/kbd/" target="_blank">
            查看 Kbd 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Kbd</h2>
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
            <Kbd>K</Kbd>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`import { Kbd } from '@rue-js/design';\n<Kbd>K</Kbd>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Kbd sizes</h2>
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
            <div className="flex gap-2 items-center">
              <Kbd size="xs">Xsmall</Kbd>
              <Kbd size="sm">Small</Kbd>
              <Kbd size="md">Medium</Kbd>
              <Kbd size="lg">Large</Kbd>
              <Kbd size="xl">Xlarge</Kbd>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Kbd size="xs">Xsmall</Kbd>\n<Kbd size="sm">Small</Kbd>\n<Kbd size="md">Medium</Kbd>\n<Kbd size="lg">Large</Kbd>\n<Kbd size="xl">Xlarge</Kbd>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># In text</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabInText.value}
            onChange={k => (tabInText.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabInText.value === 'preview' ? (
            <span>
              Press <Kbd size="sm">F</Kbd> to pay respects.
            </span>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<span>Press <Kbd size="sm">F</Kbd> to pay respects.</span>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Key combination
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabComb.value}
            onChange={k => (tabComb.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabComb.value === 'preview' ? (
            <div className="flex items-center gap-2">
              <Kbd>ctrl</Kbd> + <Kbd>shift</Kbd> + <Kbd>del</Kbd>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Kbd>ctrl</Kbd> + <Kbd>shift</Kbd> + <Kbd>del</Kbd>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Function Keys
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabFunc.value}
            onChange={k => (tabFunc.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabFunc.value === 'preview' ? (
            <div className="flex gap-2 items-center">
              <Kbd>⌘</Kbd>
              <Kbd>⌥</Kbd>
              <Kbd>⇧</Kbd>
              <Kbd>⌃</Kbd>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<Kbd>⌘</Kbd>\n<Kbd>⌥</Kbd>\n<Kbd>⇧</Kbd>\n<Kbd>⌃</Kbd>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # A full keyboard
          </h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabKeyboard.value}
            onChange={k => (tabKeyboard.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabKeyboard.value === 'preview' ? (
            <div className="overflow-x-auto">
              <div className="flex justify-center gap-1 w-full mb-1">
                <Kbd>q</Kbd>
                <Kbd>w</Kbd>
                <Kbd>e</Kbd>
                <Kbd>r</Kbd>
                <Kbd>t</Kbd>
                <Kbd>y</Kbd>
                <Kbd>u</Kbd>
                <Kbd>i</Kbd>
                <Kbd>o</Kbd>
                <Kbd>p</Kbd>
              </div>
              <div className="flex justify-center gap-1 w-full mb-1">
                <Kbd>a</Kbd>
                <Kbd>s</Kbd>
                <Kbd>d</Kbd>
                <Kbd>f</Kbd>
                <Kbd>g</Kbd>
                <Kbd>h</Kbd>
                <Kbd>j</Kbd>
                <Kbd>k</Kbd>
                <Kbd>l</Kbd>
              </div>
              <div className="flex justify-center gap-1 w-full mb-1">
                <Kbd>z</Kbd>
                <Kbd>x</Kbd>
                <Kbd>c</Kbd>
                <Kbd>v</Kbd>
                <Kbd>b</Kbd>
                <Kbd>n</Kbd>
                <Kbd>m</Kbd>
                <Kbd>/</Kbd>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="overflow-x-auto">\n  <div className="flex justify-center gap-1 w-full mb-1">\n    <Kbd>q</Kbd><Kbd>w</Kbd><Kbd>e</Kbd><Kbd>r</Kbd><Kbd>t</Kbd><Kbd>y</Kbd><Kbd>u</Kbd><Kbd>i</Kbd><Kbd>o</Kbd><Kbd>p</Kbd>\n  </div>\n  <div className="flex justify-center gap-1 w-full mb-1">\n    <Kbd>a</Kbd><Kbd>s</Kbd><Kbd>d</Kbd><Kbd>f</Kbd><Kbd>g</Kbd><Kbd>h</Kbd><Kbd>j</Kbd><Kbd>k</Kbd><Kbd>l</Kbd>\n  </div>\n  <div className="flex justify-center gap-1 w-full mb-1">\n    <Kbd>z</Kbd><Kbd>x</Kbd><Kbd>c</Kbd><Kbd>v</Kbd><Kbd>b</Kbd><Kbd>n</Kbd><Kbd>m</Kbd><Kbd>/</Kbd>\n  </div>\n</div>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Arrow Keys</h2>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabArrows.value}
            onChange={k => (tabArrows.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabArrows.value === 'preview' ? (
            <div>
              <div className="flex justify-center w-full">
                <Kbd>▲</Kbd>
              </div>
              <div className="flex justify-center gap-12 w-full">
                <Kbd>◀︎</Kbd>
                <Kbd>▶︎</Kbd>
              </div>
              <div className="flex justify-center w-full">
                <Kbd>▼</Kbd>
              </div>
            </div>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<div className="flex justify-center w-full"><Kbd>▲</Kbd></div>\n<div className="flex justify-center gap-12 w-full"><Kbd>◀︎</Kbd><Kbd>▶︎</Kbd></div>\n<div className="flex justify-center w-full"><Kbd>▼</Kbd></div>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default KbdDemo
