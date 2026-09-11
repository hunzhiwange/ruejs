// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'

it('captures a compiled child setup failure and resets only its boundary', async () => {
  const source = `import {signal,onErrorCaptured} from '@rue-js/rue';
    let fail=true;
    const Child=()=>{if(fail)throw new Error('child failed');return <p>recovered</p>};
    export const View=props=>{const error=signal(null);onErrorCaptured(value=>{error.set(value);return false});return error.get()?<button onClick={()=>{fail=false;error.set(null)}}>retry</button>:<Child/>};`
  const browser = compileNodePlan(source, 'hydrate')
  const root = document.createElement('div')
  const handle = browser.mountClaimRoot(root, browser.View)
  await handle.ready
  await expect.poll(() => root.textContent).toBe('retry')
  root.querySelector('button')!.click()
  await expect.poll(() => root.textContent).toBe('recovered')
  handle.unmount()
  expect(root.textContent).toBe('')
})

it('does not let a business boundary swallow a hydration mismatch', () => {
  const browser = compileNodePlan(
    `import {onErrorCaptured} from '@rue-js/rue'; const Child=()=> <p>expected</p>; export const View=()=>{onErrorCaptured(()=>false);return <Child/>}`,
    'hydrate',
  )
  const root = document.createElement('div')
  root.innerHTML = '<p>wrong markers</p>'
  expect(() => browser.hydrateRoot(root, browser.View)).toThrow('hydration mismatch')
  expect(root.textContent).toBe('wrong markers')
})

it('mounts an explicit compiled document error page with a working reset action', async () => {
  const original = document.documentElement
  const browser = compileNodePlan(
    `export {mountDocumentRoot} from '@rue-js/runtime/internal/hydrate'; export const View=props=> <html lang="en"><body><p>{props.error.message}</p><button onClick={props.reset}>retry</button></body></html>`,
    'hydrate',
  )
  let resets = 0
  const root = await browser.mountDocumentRoot(browser.View, {
    props: { error: new Error('document failure'), reset: () => resets++ },
  })
  try {
    expect(document.body.textContent).toContain('document failure')
    document.querySelector('button')!.click()
    expect(resets).toBe(1)
  } finally {
    root.unmount()
    document.replaceChild(original, document.documentElement)
  }
})

it('discards a stale document error page while a navigation has already recovered', async () => {
  const original = document.documentElement
  const browser = compileNodePlan(
    `export {mountDocumentRoot} from '@rue-js/runtime/internal/hydrate'; export const View=async props=>{await props.gate;return <html><body>stale error</body></html>}`,
    'hydrate',
  )
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  const abort = new AbortController()
  const pending = browser.mountDocumentRoot(browser.View, { props: { gate }, signal: abort.signal })
  abort.abort()
  release()
  const root = await pending
  expect(root.disposed).toBe(true)
  expect(document.documentElement).toBe(original)
})
