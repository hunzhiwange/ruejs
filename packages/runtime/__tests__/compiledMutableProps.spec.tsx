// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { _$createComponent } from '../src/compiled-component-call'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})

it.each(['sync', 'microtask'] as const)(
  'propagates in-place state mutations through computed SVG props (%s)',
  async mode => {
    setReactiveScheduling(mode)
    const { exports: app } = evaluateComponent(`
      import { useState, computed } from '@rue-js/rue';
      export const actions = {};
      const Label = props => <text>{props.stat.label}:{props.stat.value}/{props.total}</text>;
      const Graph = props => {
        const points = computed(() => props.stats.map(stat => stat.value).join(' '));
        return <g><polygon points={points.get()} />{props.stats.map((stat, index) =>
          <Label key={stat.label} stat={stat} total={props.stats.length} />
        )}</g>;
      };
      export const View = () => {
        const [stats] = useState([{ label: 'A', value: 100 }]);
        actions.add = () => stats.push({ label: 'B', value: 80 });
        actions.change = () => { stats[0].value = 50; };
        actions.remove = () => stats.splice(1, 1);
        return <svg><Graph stats={stats} /></svg>;
      };
    `)
    const root = _$createComponent(app.View, {})
    disposals.push(() => root.dispose())
    root.__rue_compiled_mount(document.body)
    const first = document.querySelector('text')!
    app.actions.add()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(document.querySelector('polygon')?.getAttribute('points')).toBe('100 80')
    expect(document.querySelector('svg')?.textContent).toBe('A:100/2B:80/2')
    app.actions.change()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(document.querySelector('polygon')?.getAttribute('points')).toBe('50 80')
    expect(document.querySelector('svg')?.textContent).toBe('A:50/2B:80/2')
    app.actions.remove()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(document.querySelector('svg')?.textContent).toBe('A:50/1')
    expect(document.querySelector('text')).toBe(first)
  },
)
