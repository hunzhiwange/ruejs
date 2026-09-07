// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  createContext,
  mount,
  render,
  setReactiveScheduling,
  useContext,
  useState,
} from '@rue-js/rue'
import { _$createComponent } from '@rue-js/rue/internal'
import { hydrateRoot } from '@rue-js/rue/island'
import { deleteContextRuntime, setContextRuntime } from '../src/shims/context-runtime-global.js'
import { renderSlotElement } from '../src/shims/slot-core.js'
import { normalizeAppClientReferences } from '../src/server/app-client-reference-normalization.js'

function createCompiledTestElement(
  type: unknown,
  props: Record<string, unknown> | null = null,
  ...children: unknown[]
) {
  const componentProps = { ...props }
  if (children.length === 1) componentProps.children = children[0]
  else if (children.length > 1) componentProps.children = children
  return _$createComponent(type as never, componentProps)
}

afterEach(() => {
  deleteContextRuntime()
  delete (globalThis as typeof globalThis & { __rue_rsc_client_require__?: unknown })
    .__rue_rsc_client_require__
  document.body.innerHTML = ''
})

describe('slot browser hydration', () => {
  function createTransportClientPage(referenceKey = '/components/LikeButton.tsx') {
    return {
      $rue: 'element',
      key: null,
      props: {
        children: {
          $rue: 'element',
          key: null,
          props: { initialLikes: 16 },
          type: {
            $rue: 'clientReference',
            exportName: 'default',
            referenceKey,
          },
        },
      },
      type: { $rue: 'fragment' },
    }
  }

  function createDecodedClientReference(referenceKey = '/components/LikeButton.tsx') {
    return Object.defineProperties(
      () => {
        throw new Error("Unexpectedly client reference export 'default' is called on server")
      },
      {
        $$exportName: { value: 'default' },
        $$id: { value: `${referenceKey}#default` },
        $$referenceKey: { value: referenceKey },
        $$typeof: { value: Symbol.for('rue.client.reference') },
      },
    )
  }

  function createDecodedClientPage(referenceKey = '/components/LikeButton.tsx') {
    return {
      $rue: 'element',
      key: null,
      props: {
        children: {
          $rue: 'element',
          key: null,
          props: { initialLikes: 16 },
          type: createDecodedClientReference(referenceKey),
        },
      },
      type: { $rue: 'fragment' },
    }
  }

  it('directly renders interactive Rue components in the test runtime', async () => {
    setReactiveScheduling('sync')
    let clicks = 0

    function Counter() {
      const [count, setCount] = useState(0)
      return createCompiledTestElement(
        'button',
        {
          onClick: () => {
            clicks += 1
            setCount(previous => previous + 1)
          },
          type: 'button',
        },
        `Count ${count}`,
      )
    }

    const root = document.createElement('div')
    document.body.append(root)
    render(_$createComponent(Counter, null), root)

    const button = root.querySelector('button')
    expect(button?.textContent).toBe('Count 0')
    button?.click()

    expect(clicks).toBe(1)
  })

  it('renders transport client references as interactive Rue components', async () => {
    setReactiveScheduling('sync')
    let clicks = 0

    function LikeButton({ initialLikes = 12 }: { initialLikes?: number }) {
      const [liked, setLiked] = useState(false)
      const [likes, setLikes] = useState(initialLikes)

      function handleClick() {
        clicks += 1
        const nextLiked = !liked
        setLiked(nextLiked)
        setLikes(previous => previous + (nextLiked ? 1 : -1))
      }

      return createCompiledTestElement(
        'button',
        {
          className: liked ? 'like-button liked' : 'like-button',
          onClick: handleClick,
          type: 'button',
        },
        `${liked ? 'Liked' : 'Like'} · ${likes}`,
      )
    }

    const clientRequire = vi.fn(() => ({ default: LikeButton }))
    ;(
      globalThis as typeof globalThis & { __rue_rsc_client_require__?: unknown }
    ).__rue_rsc_client_require__ = clientRequire
    setContextRuntime({
      createContext,
      createElement: createCompiledTestElement,
      useContext,
    })

    const element = renderSlotElement({
      elements: {
        'route:/client': createTransportClientPage(),
      },
      id: 'route:/client',
    })
    const root = document.createElement('div')
    document.body.append(root)

    render(element as never, root)
    const button = root.querySelector('button')
    expect(button?.textContent).toBe('Like · 16')

    button?.click()
    await Promise.resolve()

    expect(clicks).toBe(1)
    expect(clientRequire).toHaveBeenCalledWith('/components/LikeButton.tsx')
  })

  it('mounts transport client references from a BrowserRoot-style component', async () => {
    setReactiveScheduling('sync')
    let clicks = 0

    function LikeButton() {
      return createCompiledTestElement(
        'button',
        {
          onClick: () => {
            clicks += 1
          },
          type: 'button',
        },
        'Like',
      )
    }

    ;(
      globalThis as typeof globalThis & { __rue_rsc_client_require__?: unknown }
    ).__rue_rsc_client_require__ = vi.fn(() => ({ default: LikeButton }))
    setContextRuntime({
      createContext,
      createElement: createCompiledTestElement,
      useContext,
    })

    function BrowserRootLike() {
      return renderSlotElement({
        elements: {
          'page:/client': createTransportClientPage('/components/MountLikeButton.tsx'),
        },
        id: 'page:/client',
      })
    }

    const root = document.createElement('div')
    document.body.append(root)
    mount(() => _$createComponent(BrowserRootLike, null), root)

    const button = root.querySelector('button')
    expect(button?.textContent).toBe('Like')
    button?.click()

    expect(clicks).toBe(1)
  })

  it('keeps decoded RSC client references materializable after BrowserRoot ref state', async () => {
    setReactiveScheduling('sync')
    let clicks = 0

    function LikeButton() {
      return createCompiledTestElement(
        'button',
        {
          onClick: () => {
            clicks += 1
          },
          type: 'button',
        },
        'Like',
      )
    }

    ;(
      globalThis as typeof globalThis & { __rue_rsc_client_require__?: unknown }
    ).__rue_rsc_client_require__ = vi.fn(() => ({ default: LikeButton }))
    setContextRuntime({
      createContext,
      createElement: createCompiledTestElement,
      useContext,
    })

    const elements = normalizeAppClientReferences({
      'page:/client': createDecodedClientPage('/components/DecodedLikeButton.tsx'),
    })

    function BrowserRootLike() {
      const [state] = useState(() => ({ elements }))
      return renderSlotElement({
        elements: state.elements as never,
        id: 'page:/client',
      })
    }

    const root = document.createElement('div')
    document.body.append(root)
    mount(() => _$createComponent(BrowserRootLike, null), root)

    const button = root.querySelector('button')
    expect(button?.textContent).toBe('Like')
    button?.click()

    expect(clicks).toBe(1)
  })

  it('hydrates transport client references over existing SSR markup', async () => {
    setReactiveScheduling('sync')
    let renders = 0
    let clicks = 0

    function LikeButton() {
      renders += 1
      return createCompiledTestElement(
        'button',
        {
          className: 'like-button',
          onClick: () => {
            clicks += 1
          },
          type: 'button',
        },
        'Like · 16',
      )
    }

    ;(
      globalThis as typeof globalThis & { __rue_rsc_client_require__?: unknown }
    ).__rue_rsc_client_require__ = vi.fn(() => ({ default: LikeButton }))
    setContextRuntime({
      createContext,
      createElement: createCompiledTestElement,
      useContext,
    })

    function BrowserRootLike() {
      return renderSlotElement({
        elements: {
          'page:/client': createTransportClientPage('/components/SsrLikeButton.tsx'),
        },
        id: 'page:/client',
      })
    }

    const root = document.createElement('div')
    root.innerHTML = '<button class="like-button" type="button">Like · 16</button>'
    document.body.append(root)
    const serverButton = root.querySelector('button')
    const onMismatch = vi.fn()
    const hydrated = hydrateRoot(root, _$createComponent(BrowserRootLike, null), {
      adoptComponents: true,
      onMismatch,
      replace: false,
    })

    const button = root.querySelector('button')
    expect(renders).toBe(1)
    expect(onMismatch).not.toHaveBeenCalled()
    expect(button).toBe(serverButton)
    expect(root.querySelectorAll('button')).toHaveLength(1)
    button?.click()

    expect(clicks).toBe(1)
    expect(root.querySelector('button')).toBe(serverButton)
    expect(root.querySelectorAll('button')).toHaveLength(1)

    hydrated.unmount()
    expect(root.childNodes).toHaveLength(0)
  })

  it('mounts transport client references into document.body with SSR fragment markup', async () => {
    setReactiveScheduling('sync')
    let renders = 0
    let clicks = 0

    function LikeButton() {
      renders += 1
      return createCompiledTestElement(
        'button',
        {
          className: 'like-button',
          onClick: () => {
            clicks += 1
          },
          type: 'button',
        },
        'Like · 16',
      )
    }

    ;(
      globalThis as typeof globalThis & { __rue_rsc_client_require__?: unknown }
    ).__rue_rsc_client_require__ = vi.fn(() => ({ default: LikeButton }))
    setContextRuntime({
      createContext,
      createElement: createCompiledTestElement,
      useContext,
    })

    function BrowserRootLike() {
      return renderSlotElement({
        elements: {
          'page:/client': createTransportClientPage('/components/BodyLikeButton.tsx'),
        },
        id: 'page:/client',
      })
    }

    document.body.innerHTML =
      '<fragment><main><article><button class="like-button" type="button">Like · 16</button></article></main></fragment>'
    mount(() => _$createComponent(BrowserRootLike, null), document.body)

    const button = document.body.querySelector('button')
    expect(renders).toBe(1)
    button?.click()

    expect(clicks).toBe(1)
  })
})
