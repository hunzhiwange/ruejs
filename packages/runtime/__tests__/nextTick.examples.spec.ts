// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { compileComponent } from './compiled-component-test-utils'
import { resolveCompilerCapability } from './compiler-capability-test-runtime'
import { _$createComponent } from '../src/compiled-component-call'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

import { nextTick } from '../src/runtime-core/reactive.browser'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})
function mount(name: string) {
  const source = readFileSync(`app/pages/examples/next-tick-demos/${name}.tsx`, 'utf8').replace(
    `export default ${name}`,
    `
const Preview = ({ title }) => title === 'demo' ? <${name} /> : null;
const Section = props => <section>{props.active.value ? <Preview title={props.title} /> : null}</section>;
const Page = () => { const active = ref(true); return <main>{['demo'].map(title => <Section key={title} title={title} active={active} />)}</main> };
export default Page;`,
  )
  const code = compileComponent(source, `${name}.tsx`)
  const module = { exports: {} as any }
  new Function('require', 'module', 'exports', code)(
    (id: string) => (id === '@rue-js/rue' ? { nextTick } : resolveCompilerCapability(id)),
    module,
    module.exports,
  )
  const root = _$createComponent(module.exports.default, {})
  root.__rue_compiled_mount(document.body)
  disposals.push(() => root.dispose())
}
async function click(label: string) {
  const button = [...document.querySelectorAll('button')].find(
    el => el.textContent?.trim() === label,
  )!
  button.click()
  await nextTick()
  await nextTick()
}
it('appends chat messages through the compiled event and flushes the list', async () => {
  mount('ChatScrollDemo')
  await click('追加通知并滚动到底部')
  expect(document.body.textContent).toContain('5 条消息')
})
it('refreshes a helper-derived table before nextTick reads the first row', async () => {
  const scrollIntoView = vi.fn()
  const previous = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  })
  disposals.push(() => {
    if (previous) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', previous)
    else delete (HTMLElement.prototype as any).scrollIntoView
  })
  mount('TableFilterScrollDemo')
  await click('待风控')
  expect(document.querySelector('tbody')?.textContent).not.toContain('A-1024')
  expect(document.body.textContent).toContain('nextTick() 后首条结果：A-1026')
  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
})
it('focuses the input on repeated panel opens', async () => {
  mount('FilterFocusDemo')
  for (let i = 0; i < 2; i++) {
    await click('打开高级筛选')
    expect(document.activeElement).toBe(document.querySelector('input'))
    await click('关闭并重置')
    expect(document.querySelector('input')).toBeNull()
  }
})
it('reads updated DOM text after the flush', async () => {
  mount('DomReadDemo')
  await click('自增并读取 DOM')
  expect(document.body.textContent).toContain('同步读取 DOM：0')
  expect(document.body.textContent).toContain('nextTick() 后读取 DOM：1')
  expect(document.body.textContent).not.toContain('尚未读取')
})
it('focuses errors and accepts valid form data', async () => {
  mount('FocusErrorFieldDemo')
  await click('提交并定位错误字段')
  expect(document.activeElement).toBe(document.querySelector('input[name="receiver"]'))
  await click('填入合法示例')
  await click('提交并定位错误字段')
  expect(document.body.textContent).toContain('校验通过，无需聚焦')
})
it('expands and resets the measured panel', async () => {
  mount('PanelMeasureDemo')
  await click('展开详情区并测量')
  expect(document.body.textContent).toContain('已展开')
  expect(document.body.textContent).not.toContain('等待 flush...')
  await click('重置')
  expect(document.body.textContent).toContain('已收起')
})
it('mounts and closes the measured recipient list repeatedly', async () => {
  mount('ModalMeasureListDemo')
  for (let i = 0; i < 2; i++) {
    await click('打开批量发送弹窗')
    expect(document.body.textContent).toContain('高晴')
    expect(document.body.textContent).not.toContain('等待 flush...')
    await click('关闭并重置')
    expect(document.body.textContent).not.toContain('高晴')
  }
})
