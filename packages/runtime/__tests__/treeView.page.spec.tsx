import { afterEach, describe, expect, it } from 'vitest'

import { render, setReactiveScheduling } from '../src'
import { attachRouter, createRouter, createWebHashHistory } from '@rue-js/router'
import TreeView from '../../../app/pages/examples/TreeView'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const mount = () => {
  if (!window.location.hash) {
    window.location.hash = '#/examples/tree-view'
  }

  const router = createRouter({
    history: createWebHashHistory(),
    routes: [{ path: '/examples/tree-view', component: TreeView }],
  })
  attachRouter(router)

  const container = document.createElement('div')
  document.body.appendChild(container)
  render(<TreeView />, container)
  return container
}

const click = async (el: Element | null) => {
  expect(el).not.toBeNull()
  el!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flush()
}

const getRootList = (container: HTMLElement) =>
  container.querySelector(
    '.component-preview .card .card-body > ul > li > ul',
  ) as HTMLUListElement | null

const getRootAdd = (container: HTMLElement) => getRootList(container)?.lastElementChild ?? null

describe('TreeView page interactions', () => {
  it('keeps the root tree expanded after clicking the outer add button', async () => {
    const container = mount()

    await flush()
    await click(container.querySelector('[data-testid="label-root"]'))
    await click(getRootAdd(container))

    expect(getRootList(container)).not.toBeNull()
    expect(container.querySelector('[data-testid="label-root"]')?.textContent).toContain('[-]')
    expect(container.textContent).toContain('new stuff')
  })
})
