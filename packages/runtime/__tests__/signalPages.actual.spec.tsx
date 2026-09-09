import { setReactiveScheduling } from '../src'
import { clickByText, defineSplitHomeExampleActualSpec } from './splitHomeExampleTestUtils'

setReactiveScheduling('sync')

defineSplitHomeExampleActualSpec({
  name: 'SignalPath',
  route: '/examples/signal-path',
  importPage: () => import('../../../app/pages/examples/ToRef'),
  expectedTexts: ['Signal 路径读写', '访问次数：1，两倍：2'],
  interaction: async container => {
    await clickByText(container, '访问 + 1')
  },
  interactionExpectedTexts: ['访问次数：2，两倍：4'],
})

defineSplitHomeExampleActualSpec({
  name: 'SignalValues',
  route: '/examples/signal-values',
  importPage: () => import('../../../app/pages/examples/ToRefs'),
  expectedTexts: ['独立 Signal 与派生值', 'Rue: 1'],
  interaction: async container => {
    await clickByText(container, 'count + 1')
  },
  interactionExpectedTexts: ['Rue: 2', '两倍：4'],
})

defineSplitHomeExampleActualSpec({
  name: 'ProxyFreeState',
  route: '/examples/proxy-free-state',
  importPage: () => import('../../../app/pages/examples/IsProxy'),
  expectedTexts: ['无代理状态模型', '路径值：1，两倍：2'],
  interaction: async container => {
    await clickByText(container, '路径 + 1')
  },
  interactionExpectedTexts: ['路径值：2，两倍：4'],
})

defineSplitHomeExampleActualSpec({
  name: 'ComputedReadonly',
  route: '/examples/computed-readonly',
  importPage: () => import('../../../app/pages/examples/IsReadonly'),
  expectedTexts: ['只读派生值', '源值：1，只读派生值：2'],
  interaction: async container => {
    await clickByText(container, '源值 + 1')
  },
  interactionExpectedTexts: ['源值：2，只读派生值：4'],
})
