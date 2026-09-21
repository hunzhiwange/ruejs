import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, nextTick, setReactiveScheduling } from '@rue-js/rue'
import Form, { createForm, createFormList, useWatch } from '../index'
import Input from '../../input'
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
  it('supports root, item, and list render props', async () => {
    const form = createForm(),
      container = host()
    mountTestApp(container, () =>
      render(
        <Form
          form={form}
          initialValues={{ name: 'Rue', users: [{ name: 'A' }] }}
          render={formInstance => (
            <>
              <Form.Item
                form={formInstance}
                name="name"
                render={control => <input data-rendered-item="true" {...control} />}
              />
              <Form.List
                form={formInstance}
                name="users"
                render={(fields, operation) => (
                  <section data-rendered-list="true">
                    {fields.map(field => (
                      <Form.Item
                        form={formInstance}
                        name={['users', field.name, 'name']}
                        render={control => <input {...control} />}
                      />
                    ))}
                    <button type="button" onClick={() => operation.add({ name: 'B' })}>
                      Add
                    </button>
                  </section>
                )}
              />
            </>
          )}
        />,
        container,
      ),
    )

    expect(container.querySelector('[data-rendered-item="true"]')).not.toBeNull()
    expect(container.querySelector('[data-rendered-list="true"]')).not.toBeNull()
    expect(Array.from(container.querySelectorAll('input')).map(input => input.value)).toEqual([
      'Rue',
      'A',
    ])
    container.querySelector('button')!.click()
    await flush()
    expect(Array.from(container.querySelectorAll('input')).map(input => input.value)).toEqual([
      'Rue',
      'A',
      'B',
    ])
  })
  it('keeps sibling nested render fields bound to their own values', async () => {
    setReactiveScheduling('frame')
    const form = createForm(),
      container = host()
    mountTestApp(container, () =>
      render(
        <Form
          form={form}
          initialValues={{ profile: { name: 'Rue', email: 'team@rue.dev' } }}
          render={formInstance => (
            <>
              <Form.Item
                form={formInstance}
                name={['profile', 'name']}
                render={control => <Input {...control} placeholder="name" />}
              />
              <Form.Item
                form={formInstance}
                name={['profile', 'email']}
                rules={[{ required: true }, { type: 'email' }]}
                hasFeedback={true}
                extra="feedback"
                render={control => <Input {...control} placeholder="team@rue.dev" />}
              />
            </>
          )}
        />,
        container,
      ),
    )

    await flush()

    expect(Array.from(container.querySelectorAll('input')).map(input => input.value)).toEqual([
      'Rue',
      'team@rue.dev',
    ])
    const feedback = container.querySelector('[data-rue-form-feedback="true"]')!
    expect(feedback.parentElement?.classList.contains('flex')).toBe(true)
    expect(
      feedback.parentElement?.contains(
        container.querySelector('input[placeholder="team@rue.dev"]'),
      ),
    ).toBe(true)
    setReactiveScheduling('sync')
  })
  it('writes rendered text controls back without moving the caret', async () => {
    const form = createForm(),
      container = host()
    mountTestApp(container, () =>
      render(
        <Form form={form} initialValues={{ keyword: 'runtime vapor' }}>
          <Form.Item
            form={form}
            name="keyword"
            render={control => <Input {...control} placeholder="keyword" />}
          />
        </Form>,
        container,
      ),
    )

    const input = container.querySelector('input')!
    input.focus()
    input.value = 'framework core'
    input.setSelectionRange(9, 9)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    const currentInput = container.querySelector('input')!
    expect(form.getFieldValue('keyword')).toBe('framework core')
    expect(document.activeElement).toBe(currentInput)
    expect(currentInput.value).toBe('framework core')
    expect(currentInput.selectionStart).toBe(9)
    expect(currentInput.selectionEnd).toBe(9)
  })
  it('keeps focus when a rendered dynamic list refreshes', async () => {
    const form = createForm(),
      container = host()
    mountTestApp(container, () =>
      render(
        <Form form={form} initialValues={{ users: [{ name: 'Rue' }, { name: 'Vapor' }] }}>
          <Form.List
            form={form}
            name="users"
            render={fields => (
              <div>
                {fields.map(field => (
                  <div key={field.key}>
                    <Form.Item
                      form={form}
                      name={['users', field.name, 'name']}
                      render={control => <Input {...control} />}
                    />
                  </div>
                ))}
              </div>
            )}
          />
        </Form>,
        container,
      ),
    )

    const input = container.querySelector('input')!
    input.focus()
    input.value = 'Rue compiler'
    input.setSelectionRange(4, 4)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    const currentInput = container.querySelector('input')!
    expect(form.getFieldValue(['users', 0, 'name'])).toBe('Rue compiler')
    expect(document.activeElement).toBe(currentInput)
    expect(currentInput.selectionStart).toBe(4)
    expect(currentInput.selectionEnd).toBe(4)
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
