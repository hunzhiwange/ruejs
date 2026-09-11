import { afterEach, expect, it, vi } from 'vite-plus/test'
import { onErrorCaptured } from '@rue-js/rue'
import { mountClaimRoot } from '@rue-js/runtime/internal/hydrate'
import { unstable_catchError, type ErrorInfo } from '../src/shims/error.js'
import { appRouterInstance } from '../src/shims/navigation.js'
const roots: Array<{ unmount(): void }> = []
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount()
  vi.restoreAllMocks()
})
async function mount(View: () => any) {
  const stage = document.createElement('div')
  const root = mountClaimRoot(stage, View)
  roots.push(root)
  await root.ready
  return stage
}
it('renders compiled children and forwards user props to the fallback', async () => {
  const Boundary = unstable_catchError<{ label: string }>((props, info) => (
    <p>
      {props.label}:{String(info.error)}
    </p>
  ))
  const Child = () => (
    <button
      onClick={() => {
        throw 'failure'
      }}
    >
      child
    </button>
  )
  const View = () => (
    <Boundary label="forwarded">
      <Child />
    </Boundary>
  )
  const stage = await mount(View)
  expect(stage.textContent).toBe('child')
  stage.querySelector('button')!.click()
  await expect.poll(() => stage.textContent).toBe('forwarded:failure')
})
it.each([new Error('failure'), null])(
  'captures the thrown value %s and resets interactively',
  async thrown => {
    let received: unknown
    const Boundary = unstable_catchError((_props, info) => {
      received = info.error
      return <button onClick={info.reset}>reset</button>
    })
    const Child = () => (
      <button
        onClick={() => {
          throw thrown
        }}
      >
        child
      </button>
    )
    const View = () => (
      <Boundary>
        <Child />
      </Boundary>
    )
    const stage = await mount(View)
    stage.querySelector('button')!.click()
    await expect.poll(() => stage.textContent).toBe('reset')
    expect(received).toBe(thrown)
    stage.querySelector('button')!.click()
    await expect.poll(() => stage.textContent).toBe('child')
  },
)
it.each(['TEXT_REDIRECT;replace;/target;307;', 'TEXT_HTTP_ERROR_FALLBACK;404'])(
  'propagates router signal %s to the enclosing owner',
  async digest => {
    const error = Object.assign(new Error('router'), { digest }),
      seen: unknown[] = []
    const Boundary = unstable_catchError(() => <p>unexpected fallback</p>)
    const Child = () => (
      <button
        onClick={() => {
          throw error
        }}
      >
        child
      </button>
    )
    const View = () => {
      onErrorCaptured(value => {
        seen.push(value)
        return false
      })
      return (
        <Boundary>
          <Child />
        </Boundary>
      )
    }
    const stage = await mount(View)
    stage.querySelector('button')!.click()
    await expect.poll(() => seen.length).toBe(1)
    expect(seen[0]).toBe(error)
    expect(stage.textContent).not.toContain('unexpected fallback')
  },
)
it('propagates errors thrown by its own fallback', async () => {
  const failure = new Error('fallback failed'),
    seen: unknown[] = []
  const Boundary = unstable_catchError(() => {
    throw failure
  })
  const Child = () => (
    <button
      onClick={() => {
        throw new Error('child')
      }}
    >
      child
    </button>
  )
  const View = () => {
    onErrorCaptured(error => {
      seen.push(error)
      return false
    })
    return (
      <Boundary>
        <Child />
      </Boundary>
    )
  }
  const stage = await mount(View)
  stage.querySelector('button')!.click()
  await expect.poll(() => seen.includes(failure)).toBe(true)
})
it('rejects retry when there is no App Router runtime', async () => {
  let info: ErrorInfo | undefined
  const Boundary = unstable_catchError((_props, value) => {
    info = value
    return <p>fallback</p>
  })
  const Child = () => (
    <button
      onClick={() => {
        throw new Error('child')
      }}
    >
      child
    </button>
  )
  const View = () => (
    <Boundary>
      <Child />
    </Boundary>
  )
  const stage = await mount(View)
  stage.querySelector('button')!.click()
  await expect.poll(() => info).toBeDefined()
  expect(() => info!.unstable_retry()).toThrow('can only be used on the client')
})
it('refreshes the App Router and resets on retry', async () => {
  const key = Symbol.for('text.navigationRuntime'),
    previous = (window as any)[key]
  ;(window as any)[key] = { bootstrap: { routeManifest: null }, functions: { navigate: vi.fn() } }
  try {
    const refresh = vi.spyOn(appRouterInstance, 'refresh').mockImplementation(() => {})
    const Boundary = unstable_catchError((_props, info) => (
      <button onClick={info.unstable_retry}>retry</button>
    ))
    const Child = () => (
      <button
        onClick={() => {
          throw new Error('child')
        }}
      >
        child
      </button>
    )
    const View = () => (
      <Boundary>
        <Child />
      </Boundary>
    )
    const stage = await mount(View)
    stage.querySelector('button')!.click()
    await expect.poll(() => stage.textContent).toBe('retry')
    stage.querySelector('button')!.click()
    await expect.poll(() => stage.textContent).toBe('child')
    expect(refresh).toHaveBeenCalledTimes(1)
  } finally {
    if (previous === undefined) delete (window as any)[key]
    else (window as any)[key] = previous
  }
})
