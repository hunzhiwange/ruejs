import { expect, it } from 'vitest'
import { render } from '@rue-js/rue'
import InlineSelectListDemo from '../../../app/pages/examples/home-demos/InlineSelectListDemo'

it('keeps keyed inline selects synchronized when adding, reversing and deleting rows', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const app = render(<InlineSelectListDemo />, container)
  const values = () => Array.from(container.querySelectorAll('select'), select => select.value)
  const click = (label: string) => {
    const button = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent?.trim() === label,
    )!
    button.click()
  }
  try {
    expect(values()).toEqual(['MYSQL', 'MYSQL', 'POSTGRESQL', 'POSTGRESQL'])
    const select = container.querySelectorAll('select')[1]
    select.value = 'POSTGRESQL'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await expect.poll(values).toEqual(['POSTGRESQL', 'POSTGRESQL', 'POSTGRESQL', 'POSTGRESQL'])
    click('添加 MySQL')
    await expect
      .poll(values)
      .toEqual(['POSTGRESQL', 'POSTGRESQL', 'POSTGRESQL', 'POSTGRESQL', 'MYSQL', 'MYSQL'])
    click('反转顺序')
    await expect
      .poll(values)
      .toEqual(['MYSQL', 'MYSQL', 'POSTGRESQL', 'POSTGRESQL', 'POSTGRESQL', 'POSTGRESQL'])
    click('删除')
    await expect.poll(values).toEqual(['POSTGRESQL', 'POSTGRESQL', 'POSTGRESQL', 'POSTGRESQL'])
    click('重置')
    await expect.poll(values).toEqual(['MYSQL', 'MYSQL', 'POSTGRESQL', 'POSTGRESQL'])
  } finally {
    app.dispose()
    container.remove()
  }
})
