import { afterEach, expect, it } from 'vite-plus/test'
import { signal } from '@rue-js/rue'
import { mountClaimRoot } from '@rue-js/runtime/internal/hydrate'
import Head, { _clientHeadChildren } from '../src/shims/head.js'
let unmount: (() => void) | undefined
afterEach(() => {
  unmount?.()
  unmount = undefined
  _clientHeadChildren.clear()
  document.head.querySelectorAll('[data-text-head]').forEach(node => node.remove())
})
it('updates compiled Head text and restores the previous owner after cleanup', async () => {
  const title = signal('initial')
  const show = signal(true)
  const View = () => (
    <>
      <Head>
        <title>parent</title>
        <meta name="description" content="parent description" />
      </Head>
      {show.get() && (
        <Head>
          <title>{title.get()}</title>
          <meta name="description" content={title.get()} />
        </Head>
      )}
    </>
  )
  const stage = document.createElement('div')
  const root = mountClaimRoot(stage, View)
  unmount = () => root.unmount()
  await root.ready
  await expect.poll(() => document.title).toBe('initial')
  expect(document.head.querySelectorAll('meta[name="description"][data-text-head]')).toHaveLength(1)
  title.set('updated')
  await expect.poll(() => document.title).toBe('updated')
  await expect
    .poll(() =>
      document.head
        .querySelector('meta[name="description"][data-text-head]')
        ?.getAttribute('content'),
    )
    .toBe('updated')
  show.set(false)
  await expect.poll(() => document.title).toBe('parent')
  expect(stage.querySelector('title')).toBeNull()
})
it('preserves explicit deduplication keys from compiler props metadata', async () => {
  const View = () => (
    <>
      <Head>
        <meta key="social" property="og:title" content="old" />
      </Head>
      <Head>
        <meta key="social" property="og:title" content="new" />
      </Head>
    </>
  )
  const root = mountClaimRoot(document.createElement('div'), View)
  unmount = () => root.unmount()
  await root.ready
  await expect
    .poll(() => document.head.querySelectorAll('meta[property="og:title"][data-text-head]').length)
    .toBe(1)
  expect(
    document.head
      .querySelector('meta[property="og:title"][data-text-head]')
      ?.getAttribute('content'),
  ).toBe('new')
})
