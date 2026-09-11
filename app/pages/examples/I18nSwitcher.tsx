import HomeSplitExamplePage from './createHomeSplitExamplePage'
import I18nLocaleSwitcherDemo from './home-demos/I18nLocaleSwitcherDemo'
import source from './home-demos/I18nLocaleSwitcherDemo.tsx?raw'

const I18nSwitcher = () => (
  <HomeSplitExamplePage
    options={{
      title: '语言切换（_ 模型）',
      source,
      codeCardClassName: 'h-[420px] md:h-[1080px]',
    }}
  >
    <I18nLocaleSwitcherDemo />
  </HomeSplitExamplePage>
)

export default I18nSwitcher
