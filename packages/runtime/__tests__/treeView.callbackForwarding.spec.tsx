// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { _$createComponent } from '../src/compiled-component-call'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

it.each(['sync', 'microtask'] as const)(
  'expands recursive tree nodes through forwarded callbacks (%s)',
  async mode => {
    setReactiveScheduling(mode)
    const example = readFileSync('app/pages/examples/TreeView.tsx', 'utf8')
    const tree = example.slice(
      example.indexOf('type Node ='),
      example.indexOf('  const activeTab ='),
    )
    const { exports: app } = evaluateComponent(`import { computed, ref } from '@rue-js/rue';
    ${tree}
    return <ul><TreeItem model={treeData.value} onChange={onChange}/></ul>;
    }; export const View = TreeView;`)
    const root = _$createComponent(app.View, {})
    const host = document.createElement('div')
    document.body.appendChild(host)
    root.__rue_compiled_mount(host)
    const click = async (id: string) => {
      const node = host.querySelector<HTMLElement>(`[data-testid="${id}"]`)
      expect(node, id).not.toBeNull()
      node!.click()
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    try {
      await click('label-root')
      await click('label-branch')
      await click('label-branch-deep-1')
      expect(host.querySelector('[data-testid="label-branch-deep-1-hello"]')).not.toBeNull()
      await click('add-branch-deep-1')
      expect(host.querySelector('[data-testid="label-branch-deep-1-new-2"]')?.textContent).toBe(
        'new stuff',
      )
      await click('label-branch')
      expect(host.querySelector('[data-testid="label-branch-deep-1"]')).toBeNull()
      await click('label-branch')
      expect(host.querySelector('[data-testid="label-branch-deep-1-new-2"]')).not.toBeNull()
    } finally {
      root.dispose()
      host.remove()
      setReactiveScheduling('frame')
    }
  },
)

it('forwards every argument and return value to the latest callback', () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { signal } from '@rue-js/rue';
    export const handler = signal((...args) => args);
    export let invoke;
    const Child = props => { invoke = (...args) => props.onChange(...args); return <i/>; };
    const Forward = props => <Child onChange={props.onChange}/>;
    export const View = () => <Forward onChange={handler.get()}/>;
  `)
  const root = _$createComponent(app.View, {})
  const host = document.createElement('div')
  root.__rue_compiled_mount(host)
  try {
    expect(app.invoke()).toEqual([])
    expect(app.invoke('id', { open: true }, 3)).toEqual(['id', { open: true }, 3])
    app.handler.set((...args: unknown[]) => ['updated', ...args])
    expect(app.invoke('next', false)).toEqual(['updated', 'next', false])
  } finally {
    root.dispose()
    app.handler.dispose()
    setReactiveScheduling('frame')
  }
})
