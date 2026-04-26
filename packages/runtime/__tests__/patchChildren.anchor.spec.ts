import { afterEach, describe, expect, it } from 'vitest'
import type { FC } from '../src'
import { h, ref, render } from '../src'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('patch_children_keyed anchor isolation', () => {
  it('keeps nested button text when sibling branches switch', async () => {
    const active = ref<'preview' | 'code'>('preview')

    const view = () =>
      h(
        'section',
        null,
        h(
          'div',
          { role: 'tablist', className: 'tabs tabs-box' },
          h(
            'button',
            {
              role: 'tab',
              className: active.value === 'preview' ? 'tab tab-active' : 'tab',
            },
            '预览',
          ),
          h(
            'button',
            {
              role: 'tab',
              className: active.value === 'code' ? 'tab tab-active' : 'tab',
            },
            'JSX代码',
          ),
        ),
        active.value === 'preview'
          ? h('div', { id: 'preview-panel' }, 'Preview panel')
          : h('div', { id: 'code-panel' }, 'Code panel'),
      )

    const container = document.createElement('div')
    document.body.appendChild(container)
    render(view(), container)
    await Promise.resolve()

    const initialTabs = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
    expect(initialTabs).toHaveLength(2)
    expect(initialTabs[0].textContent).toBe('预览')
    expect(initialTabs[1].textContent).toBe('JSX代码')

    active.value = 'code'
    render(view(), container)
    await Promise.resolve()

    const nextTabs = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
    expect(nextTabs).toHaveLength(2)
    expect(nextTabs[0].textContent).toBe('预览')
    expect(nextTabs[1].textContent).toBe('JSX代码')
    expect(container.querySelector('#preview-panel')).toBeNull()
    expect(container.querySelector('#code-panel')?.textContent).toBe('Code panel')
  })

  it('keeps preview/code branches exclusive for unkeyed vnode siblings', async () => {
    const active = ref<'preview' | 'code'>('preview')

    const CodePanel: FC<{ code: string }> = props =>
      h(
        'div',
        { className: 'mt-2' },
        h(
          'div',
          { className: 'relative group' },
          h('button', { 'aria-label': '复制代码' }, '复制'),
          h('div', {
            dangerouslySetInnerHTML: {
              __html: `<pre><code>${props.code}</code></pre>`,
            },
          }),
        ),
      )

    const view = () =>
      h(
        'section',
        null,
        h('h2', null, '# Button'),
        h(
          'div',
          { role: 'tablist', className: 'tabs tabs-box mb-3' },
          h(
            'button',
            {
              role: 'tab',
              className: active.value === 'preview' ? 'tab tab-active' : 'tab',
            },
            '预览',
          ),
          h(
            'button',
            {
              role: 'tab',
              className: active.value === 'code' ? 'tab tab-active' : 'tab',
            },
            'JSX代码',
          ),
        ),
        active.value === 'preview'
          ? h(
              'div',
              { className: 'card bg-base-100 shadow' },
              h(
                'div',
                { className: 'card-body flex flex-wrap gap-2' },
                h('button', { className: 'btn' }, 'Default'),
              ),
            )
          : h(CodePanel, {
              code: "import { Button } from '@rue-js/design';\nexport default () => <Button>Default</Button>;",
            }),
      )

    const container = document.createElement('div')
    document.body.appendChild(container)
    render(view(), container)
    await Promise.resolve()

    let tabs = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[]
    expect(tabs[0].textContent).toBe('预览')
    expect(tabs[1].textContent).toBe('JSX代码')
    expect(tabs[0].classList.contains('tab-active')).toBe(true)
    expect(tabs[1].classList.contains('tab-active')).toBe(false)
    expect(container.querySelector('.card .btn')?.textContent).toBe('Default')
    expect(container.querySelector('pre code')).toBeNull()

    active.value = 'code'
    render(view(), container)
    await Promise.resolve()

    tabs = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[]
    expect(tabs[0].textContent).toBe('预览')
    expect(tabs[1].textContent).toBe('JSX代码')
    expect(tabs[0].classList.contains('tab-active')).toBe(false)
    expect(tabs[1].classList.contains('tab-active')).toBe(true)
    expect(container.querySelector('.card .btn')).toBeNull()
    expect(container.querySelector('pre code')?.textContent).toContain('export default')

    active.value = 'preview'
    render(view(), container)
    await Promise.resolve()

    tabs = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[]
    expect(tabs[0].classList.contains('tab-active')).toBe(true)
    expect(tabs[1].classList.contains('tab-active')).toBe(false)
    expect(container.querySelector('.card .btn')?.textContent).toBe('Default')
    expect(container.querySelector('pre code')).toBeNull()
  })
})
