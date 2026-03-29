import type { FC } from 'rue-js'
import { ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Tabs, TextRotate } from '@rue-js/design'

const TextRotateDemo: FC = () => {
  const tabBasic = ref<'preview' | 'code'>('preview')
  const tabSix = ref<'preview' | 'code'>('preview')
  const tabSentence = ref<'preview' | 'code'>('preview')
  const tabDuration = ref<'preview' | 'code'>('preview')
  const tabLineHeight = ref<'preview' | 'code'>('preview')
  const tabArray = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Text Rotate 文本轮播</h1>
        <p className="text-sm mt-3 mb-3">
          Text Rotate 可以在同一位置轮播最多 6 行文本，默认时长 10s，悬浮时暂停动画。
        </p>
        <div className="text-sm">
          <a href="https://daisyui.com/components/text-rotate/" target="_blank">
            查看 Text Rotate 静态样式
          </a>
        </div>

        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># Text Rotate</h2>
          <p className="text-sm mt-3 mb-3">Rotates through 3 words, in 10 seconds</p>
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
            <TextRotate>
              <span>
                <span>ONE</span>
                <span>TWO</span>
                <span>THREE</span>
              </span>
            </TextRotate>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<TextRotate><span><span>ONE</span><span>TWO</span><span>THREE</span></span></TextRotate>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Using items array
          </h2>
          <p className="text-sm mt-3 mb-3">Pass an array of items, each item can be text or JSX</p>
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
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<TextRotate className="text-7xl" innerClassName="justify-items-center" items={[{ text: 'DESIGN' }, { text: 'DEVELOP' }, { text: 'DEPLOY' }, { text: 'SCALE' }, { text: 'MAINTAIN' }, { text: 'REPEAT' }]} />`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Rotating 6 words
          </h2>
          <p className="text-sm mt-3 mb-3">Big font size, horizontally centered</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSix.value}
            onChange={k => (tabSix.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSix.value === 'preview' ? (
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
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<TextRotate className="text-7xl"><span className="justify-items-center"><span>DESIGN</span><span>DEVELOP</span><span>DEPLOY</span><span>SCALE</span><span>MAINTAIN</span><span>REPEAT</span></span></TextRotate>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Rotating words in a sentence
          </h2>
          <p className="text-sm mt-3 mb-3">Different colors for each word</p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabSentence.value}
            onChange={k => (tabSentence.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabSentence.value === 'preview' ? (
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
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<span>Providing AI Agents for <TextRotate><span><span className="bg-teal-400 text-teal-800 px-2">Designers</span><span className="bg-red-400 text-red-800 px-2">Developers</span><span className="bg-blue-400 text-blue-800 px-2">Managers</span></span></TextRotate></span>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Rotating 3 words with custom duration
          </h2>
          <p className="text-sm mt-3 mb-3">
            Big font size, horizontally centered, 6 seconds duration instead of 10 seconds
          </p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabDuration.value}
            onChange={k => (tabDuration.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabDuration.value === 'preview' ? (
            <TextRotate className="max-md:text-3xl text-7xl font-title duration-6000">
              <span className="justify-items-center">
                <span>BLAZING</span>
                <span className="font-bold italic px-2">FAST ▶︎▶︎</span>
              </span>
            </TextRotate>
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<TextRotate className="text-7xl duration-6000"><span className="justify-items-center"><span>BLAZING</span><span className="font-bold italic px-2">FAST ▶︎▶︎</span></span></TextRotate>`}
            />
          )}
        </div>
        <div className="component-preview not-prose text-base-content my-6 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
            # Custom line height
          </h2>
          <p className="text-sm mt-3 mb-3">
            In case you have a tall font or need more vertical spacing between lines
          </p>
          <Tabs
            style="box"
            items={[
              { key: 'preview', label: '预览' },
              { key: 'code', label: 'JSX代码' },
            ]}
            activeKey={tabLineHeight.value}
            onChange={k => (tabLineHeight.value = k as 'preview' | 'code')}
            className="mb-3"
          />
          {tabLineHeight.value === 'preview' ? (
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
          ) : (
            <Code
              className="mt-2"
              lang="tsx"
              code={`<TextRotate className="text-7xl leading-[2]"><span className="justify-items-center"><span>📐 DESIGN</span><span>⌨️ DEVELOP</span><span>🌎 DEPLOY</span><span>🌱 SCALE</span><span>🔧 MAINTAIN</span><span>♻️ REPEAT</span></span></TextRotate>`}
            />
          )}
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default TextRotateDemo
