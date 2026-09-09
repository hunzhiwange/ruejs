import { clickByText, defineSplitHomeExampleActualSpec } from './splitHomeExampleTestUtils'

defineSplitHomeExampleActualSpec({
  name: 'ShallowRef',
  route: '/examples/shallow-ref',
  importPage: () => import('../../../app/pages/examples/ShallowRef'),
  expectedTexts: [
    'shallowRef 浅层 ref',
    'shallowRef 只追踪 .value',
    '当前渲染值：0',
    '最近操作：等待操作',
    '内部对象保持普通对象；替换根值触发更新。',
    '仅修改内部对象',
    '整体替换 .value',
  ],
  interaction: async container => {
    await clickByText(container, '仅修改内部对象')
    await clickByText(container, '整体替换 .value')
  },
  interactionExpectedTexts: [
    '当前渲染值：2',
    '最近操作：整体替换 .value',
    '内部对象保持普通对象；替换根值触发更新。',
  ],
})
