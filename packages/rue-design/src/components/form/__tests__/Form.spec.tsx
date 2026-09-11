import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, nextTick, setReactiveScheduling } from '@rue-js/rue'
import Form, { createForm, createFormList, useWatch } from '../index'
import { mountTestApp } from '../../__tests__/app-lifecycle'

setReactiveScheduling('sync')
afterEach(() => {
  document.body.innerHTML = ''
})
const host = () => {
  const node = document.createElement('div')
  document.body.append(node)
  return node
}
const flush = async () => {
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe('Form compiler-only fields', () => {
  it('collects field values and submits successfully', async () => {
    const form = createForm(),
      finish = vi.fn(),
      container = host()
    mountTestApp(container, () =>
      render(
        <Form form={form} initialValues={{ profile: { name: 'Rue' } }} onFinish={finish}>
          <Form.Item
            name={['profile', 'name']}
            label="名称"
            control="input"
            rules={[{ required: true }]}
          />
        </Form>,
        container,
      ),
    )
    expect(container.querySelector('input')?.value).toBe('Rue')
    const input = container.querySelector('input')!
    input.value = 'Compiler'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    form.submit()
    await flush()
    expect(finish).toHaveBeenCalledWith({ profile: { name: 'Compiler' } })
  })
  it('prevents native submit navigation for submit buttons', async () => {
    const form = createForm(),
      finish = vi.fn(),
      container = host()
    mountTestApp(container, () =>
      render(
        <Form form={form} onFinish={finish}>
          <button type="submit">Submit</button>
        </Form>,
        container,
      ),
    )
    const event = new Event('submit', { bubbles: true, cancelable: true })
    container.querySelector('form')!.dispatchEvent(event)
    await flush()
    expect(event.defaultPrevented).toBe(true)
    expect(finish).toHaveBeenCalledTimes(1)
  })
  it('does not duplicate item content or errors after repeated failed submits', async () => {
    const form = createForm(),
      container = host()
    mountTestApp(container, () =>
      render(
        <Form form={form}>
          <Form.Item
            name="name"
            label="名称"
            control="input"
            rules={[{ required: true, message: 'Required' }]}
          />
        </Form>,
        container,
      ),
    )
    for (let i = 0; i < 3; i++) {
      form.submit()
      await flush()
      expect(container.querySelectorAll('input')).toHaveLength(1)
      expect(container.querySelectorAll('li.text-error')).toHaveLength(1)
    }
  })
  it('scrolls named forms to fields with generated item ids', async () => {
    const form = createForm(),
      container = host()
    mountTestApp(container, () =>
      render(
        <Form form={form} name="profile">
          <Form.Item name={['profile', 'name']} control="input" />
        </Form>,
        container,
      ),
    )
    const input = container.querySelector('input')!
    const scroll = vi.fn()
    input.scrollIntoView = scroll
    form.scrollToField(['profile', 'name'], { focus: true })
    await flush()
    expect(input.id).toBe('profile__name')
    expect(scroll).toHaveBeenCalled()
    expect(document.activeElement).toBe(input)
  })
  it('shows validation errors and emits finish failed info', async () => {
    const form = createForm(),
      container = host(),
      failed = vi.fn()
    mountTestApp(container, () =>
      render(
        <Form form={form} onFinishFailed={failed}>
          <Form.Item
            name="email"
            control="input"
            rules={[{ required: true, message: 'Email required' }]}
          />
        </Form>,
        container,
      ),
    )
    form.submit()
    await flush()
    expect(failed).toHaveBeenCalled()
    expect(form.getFieldError('email')).toEqual(['Email required'])
    expect(container.textContent).toContain('Email required')
  })
  it('supports checkbox binding through an explicit checkbox control', async () => {
    const form = createForm(),
      container = host()
    mountTestApp(container, () =>
      render(
        <Form form={form} initialValues={{ agreed: true }}>
          <Form.Item name="agreed" control="checkbox" />
        </Form>,
        container,
      ),
    )
    const checkbox = container.querySelector('input')!
    expect(checkbox.checked).toBe(true)
    checkbox.click()
    await flush()
    expect(form.getFieldValue('agreed')).toBe(false)
  })
  it('exposes form methods and updates watched values without replacing controls', async () => {
    const form = createForm(),
      container = host()
    const Watched = () => {
      const value = useWatch('name', form)
      return <output>{String(value.value ?? '')}</output>
    }
    mountTestApp(container, () =>
      render(
        <Form form={form} initialValues={{ name: 'Rue' }}>
          <Form.Item name="name" control="input" />
          <Watched />
        </Form>,
        container,
      ),
    )
    const input = container.querySelector('input')!
    form.setFieldsValue({ name: 'Updated' })
    await flush()
    expect(container.querySelector('input')).toBe(input)
    expect(input.value).toBe('Updated')
    expect(container.querySelector('output')?.textContent).toBe('Updated')
    form.resetFields()
    await flush()
    expect(input.value).toBe('Rue')
  })
  it('supports dynamic list add, remove and move using explicit field data', async () => {
    const form = createForm(),
      container = host(),
      operations = createFormList(form, 'users')
    mountTestApp(container, () =>
      render(
        <Form form={form} initialValues={{ users: [{ name: 'A' }, { name: 'B' }] }}>
          <Form.List name="users" fields={[{ name: 'name', control: 'input' }]} />
        </Form>,
        container,
      ),
    )
    const values = () => Array.from(container.querySelectorAll('input')).map(input => input.value)
    expect(values()).toEqual(['A', 'B'])
    operations.add({ name: 'C' })
    await flush()
    expect(values()).toEqual(['A', 'B', 'C'])
    operations.move(2, 0)
    await flush()
    expect(values()).toEqual(['C', 'A', 'B'])
    operations.remove(1)
    await flush()
    expect(values()).toEqual(['C', 'B'])
  })
})
