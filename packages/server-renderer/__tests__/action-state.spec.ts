// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'

it('restores progressive action state and claims it without resetting before interactive submissions', async () => {
  const client = `import {useActionState} from '@rue-js/runtime/internal/reactive';
    const action = Object.assign(async (state, data) => ({count: state.count + Number(data.get('step'))}), {$$id: 'counter#increment'});
    export const View = () => {const [state, submit, pending] = useActionState(action, {count: 0});
      return <form action={submit}><p>{state.count}</p><button name="step" value="1" disabled={pending}>add</button></form>};`
  const server = compileNodePlan(
    `import Client from './reference.js'; export {View as Counter} from './counter.js'; export {renderServerFrame} from '@rue-js/runtime/internal/ssr'; export const View=()=> <Client/>`,
    'server',
    false,
    {
      './counter.js': client,
      './reference.js': `import {createClientReference} from '@rue-js/rsc/core/rsc'; export default createClientReference(null,'counter','View')`,
    },
  )
  const initial = await server.renderServerFrame(server.View, { resolve: () => server.Counter })
  const container = document.createElement('div')
  document.body.append(container)
  container.innerHTML = initial.html
  const submitted = JSON.parse(
    (container.querySelector('[name="$RUE_ACTION_STATE"]') as HTMLInputElement).value,
  )
  expect(submitted).toMatchObject({
    version: 1,
    actionId: 'counter#increment',
    state: { count: 0 },
  })
  const frame = await server.renderServerFrame(server.View, {
    resolve: () => server.Counter,
    formState: { ...submitted, state: { count: 1 } },
  })
  container.innerHTML = frame.html
  expect(container.querySelector('p')!.textContent).toBe('1')
  const browser = compileNodePlan(
    client + `export {hydrateServerFrame} from '@rue-js/runtime/internal/hydrate'`,
    'hydrate',
  )
  const root = await browser.hydrateServerFrame(container, frame, () => browser.View)
  try {
    container.querySelector('form')!.dispatchEvent(
      new SubmitEvent('submit', {
        bubbles: true,
        cancelable: true,
        submitter: container.querySelector('button'),
      }),
    )
    await expect.poll(() => container.querySelector('p')!.textContent).toBe('2')
    container.querySelector('form')!.dispatchEvent(
      new SubmitEvent('submit', {
        bubbles: true,
        cancelable: true,
        submitter: container.querySelector('button'),
      }),
    )
    await expect.poll(() => container.querySelector('p')!.textContent).toBe('3')
  } finally {
    root.unmount()
    container.remove()
  }
})
