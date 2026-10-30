import { expect, it } from 'vitest'

it('keeps inline select values and option selected bindings across row updates', async () => {
  document.body.innerHTML = '<div id="app"></div>'
  await import('./fixtures/select-list/entry')
  const api = (globalThis as any).selectList
  const values = () => Array.from(document.querySelectorAll('select'), select => select.value)
  try {
    expect(values()).toEqual(['MYSQL', 'MYSQL', 'POSTGRESQL', 'POSTGRESQL'])
    api.replace(['POSTGRESQL', 'MYSQL', 'MYSQL'])
    await expect
      .poll(values)
      .toEqual(['POSTGRESQL', 'POSTGRESQL', 'MYSQL', 'MYSQL', 'MYSQL', 'MYSQL'])
    api.replace(['MYSQL'])
    await expect.poll(values).toEqual(['MYSQL', 'MYSQL'])
  } finally {
    api.app.dispose()
    delete (globalThis as any).selectList
  }
})
