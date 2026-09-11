// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'

it('writes a progressive action and claims existing inputs before handling client submissions', async () => {
  const source = `export const View=props=><form action={props.action}><input name="name" defaultValue="initial"/><button type="submit">Send</button></form>`
  const server = compileNodePlan(source, 'server')
  const browser = compileNodePlan(source, 'hydrate')
  const action = Object.assign(vi.fn(), {
    $$typeof: Symbol.for('rue.server.reference'),
    $$id: 'test-action',
  })
  const container = document.createElement('div')
  container.innerHTML = await server.renderToString(server.View, { props: { action } })
  const form = container.querySelector('form')!
  const input = container.querySelector<HTMLInputElement>('input[name=name]')!
  expect(form.method).toBe('post')
  expect(form.enctype).toBe('multipart/form-data')
  expect(new FormData(form).has('$RUE_ACTION_ID_test-action')).toBe(true)
  input.value = 'typed before hydration'
  const root = browser.hydrateRoot(container, browser.View, { props: { action } })
  await root.ready
  expect(container.querySelector('input[name=name]')).toBe(input)
  expect(input.value).toBe('typed before hydration')
  const event = new SubmitEvent('submit', {
    bubbles: true,
    cancelable: true,
    submitter: form.querySelector('button'),
  })
  form.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  expect(action).toHaveBeenCalledTimes(1)
  expect(Array.from((action.mock.calls[0]![0] as FormData).entries())).toEqual([
    ['name', 'typed before hydration'],
  ])
  root.unmount()
})

it('honors submitter actions and user cancellation', async () => {
  const source = `export {nextTick} from '@rue-js/rue';export const View=props=><form action={props.action} onSubmit={props.onSubmit}><input name="message" value="hello"/><button type="submit" formAction={props.override}>Send</button></form>`
  const browser = compileNodePlan(source, 'hydrate')
  const action = vi.fn(),
    override = vi.fn()
  const container = document.createElement('div')
  const root = browser.mountClaimRoot(container, browser.View, { props: { action, override } })
  await root.ready
  const form = container.querySelector('form')!
  const submit = () =>
    form.dispatchEvent(
      new SubmitEvent('submit', {
        bubbles: true,
        cancelable: true,
        submitter: form.querySelector('button'),
      }),
    )
  submit()
  expect(override).toHaveBeenCalledTimes(1)
  expect(action).not.toHaveBeenCalled()
  root.updateProps({ action, override, onSubmit: (event: Event) => event.preventDefault() })
  await browser.nextTick()
  submit()
  expect(override).toHaveBeenCalledTimes(1)
  root.unmount()
})
