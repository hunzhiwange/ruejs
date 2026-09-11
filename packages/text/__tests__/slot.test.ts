import { describe, expect, it, vi } from 'vite-plus/test'
import { UNMATCHED_SLOT } from '../src/server/app-elements.js'
import {
  Fragment,
  createElement,
  renderAppServerElementToHtmlAsync,
  type TestServerComponent,
  type TestServerNode,
} from './app-server-protocol-test-utils.js'

vi.mock('text/navigation', () => ({
  usePathname: () => '/',
}))

function createContextProvider<TValue>(
  context: {
    Provider: TestServerComponent<{
      value: TValue
      children?: TestServerNode
    }>
  },
  value: TValue,
  child: TestServerNode,
): TestServerNode {
  return createElement(context.Provider, { value }, child)
}

async function renderHtml(element: TestServerNode): Promise<string> {
  return (await renderAppServerElementToHtmlAsync(element)).replace(/<!--.*?-->/g, '')
}

describe('slot primitives', () => {
  it('exports the client primitives', async () => {
    const mod = await import('../src/shims/slot.js')

    expect(typeof mod.Slot).toBe('function')
    expect(typeof mod.Children).toBe('function')
    expect(typeof mod.ParallelSlot).toBe('function')
    expect(typeof mod.mergeElements).toBe('function')
    expect(mod.ElementsContext).toBeDefined()
    expect(mod.ChildrenContext).toBeDefined()
    expect(mod.ParallelSlotsContext).toBeDefined()
    expect(mod.UNMATCHED_SLOT).toBe(Symbol.for('text.unmatchedSlot'))
  })

  it('Children renders null outside a Slot provider', async () => {
    const { Children } = await import('../src/shims/slot.js')

    const html = await renderHtml(createElement(Children))
    expect(html).toBe('')
  })

  it('ParallelSlot renders null outside a Slot provider', async () => {
    const { ParallelSlot } = await import('../src/shims/slot.js')

    const html = await renderHtml(createElement(ParallelSlot, { name: 'modal' }))
    expect(html).toBe('')
  })

  it('Slot renders the matched element and provides children and parallel slots', async () => {
    const mod = await import('../src/shims/slot.js')

    const slotElement = createContextProvider(
      mod.ElementsContext,
      {
        'layout:/': createElement(
          'div',
          null,
          createElement('main', null, createElement(mod.Children)),
          createElement('aside', null, createElement(mod.ParallelSlot, { name: 'modal' })),
        ),
      },
      createElement(
        mod.Slot,
        {
          id: 'layout:/',
          parallelSlots: {
            modal: createElement('em', null, 'modal content'),
          },
        },
        createElement('span', null, 'child content'),
      ),
    )

    const html = await renderHtml(slotElement)
    expect(html).toContain('child content')
    expect(html).toContain('modal content')
  })

  it('Slot executes compiled fragments from app elements', async () => {
    const mod = await import('../src/shims/slot.js')

    const html = await renderHtml(
      createContextProvider(
        mod.ElementsContext,
        {
          'page:/': createElement(
            Fragment,
            null,
            createElement('header', null, 'nav'),
            createElement('main', null, 'body'),
          ),
        },
        createElement(mod.Slot, { id: 'page:/' }),
      ),
    )

    expect(html).toContain('<header>nav</header>')
    expect(html).toContain('<main>body</main>')
  })

  it.each([
    { $rue: 'element', type: { $rue: 'fragment' }, props: {} },
    { type: () => {}, props: {} },
  ])('rejects legacy UI object %j instead of interpreting it', async value => {
    const { renderSlotElement } = await import('../src/shims/slot-core.js')
    expect(() => renderSlotElement({ elements: { 'page:/': value } as any, id: 'page:/' })).toThrow(
      'requires a compiled plan',
    )
  })

  it('Slot returns null when the entry is absent', async () => {
    const mod = await import('../src/shims/slot.js')

    const html = await renderHtml(
      createContextProvider(
        mod.ElementsContext,
        {},
        createElement(mod.Slot, { id: 'slot:modal:/' }),
      ),
    )

    expect(html).toBe('')
  })

  it('Slot reads the current SSR payload reader when context elements miss the requested entry', async () => {
    const mod = await import('../src/shims/slot-core.js')

    function SsrRoot(): TestServerNode {
      const staleElements = {
        'route:/stale': createElement('section', null, 'stale route'),
      }
      mod.setCurrentSsrAppElements(staleElements)
      mod.setCurrentSsrAppElementsReader(() => ({
        ...staleElements,
        'page:/fresh': createElement('main', null, 'fresh page'),
      }))

      return createContextProvider(
        mod.ElementsContext,
        staleElements,
        createElement(mod.Slot, { id: 'page:/fresh' }),
      )
    }

    const html = await renderHtml(createElement(SsrRoot))

    expect(html).toContain('<main>fresh page</main>')
    expect(html).not.toContain('stale route')
  })

  it('Slot does not treat empty objects as transport metadata', async () => {
    const mod = await import('../src/shims/slot.js')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await expect(
        renderHtml(
          createContextProvider(
            mod.ElementsContext,
            { 'slot:modal:/': {} },
            createElement(mod.Slot, { id: 'slot:modal:/' }),
          ),
        ),
      ).rejects.toThrow('requires a compiled plan')
    } finally {
      consoleError.mockRestore()
    }
  })

  it('rejects transport metadata under a render entry', async () => {
    const mod = await import('../src/shims/slot.js')
    await expect(
      renderHtml(
        createContextProvider(
          mod.ElementsContext,
          { 'slot:metadata-warning:/': { 'layout:/': 's' } },
          createElement(mod.Slot, { id: 'slot:metadata-warning:/' }),
        ),
      ),
    ).rejects.toThrow('requires a compiled plan')
  })

  it('warns in development when a non-slot entry is absent', async () => {
    const mod = await import('../src/shims/slot.js')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const html = await renderHtml(
        createContextProvider(
          mod.ElementsContext,
          {},
          createElement(mod.Slot, { id: 'route:/missing' }),
        ),
      )

      expect(html).toBe('')
      expect(warn).toHaveBeenCalledWith(
        '[text] Missing App Router element entry during render: route:/missing',
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('does not warn when an absent parallel slot key is omitted on soft navigation', async () => {
    const mod = await import('../src/shims/slot.js')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const html = await renderHtml(
        createContextProvider(
          mod.ElementsContext,
          {},
          createElement(mod.Slot, { id: 'slot:modal:/' }),
        ),
      )

      expect(html).toBe('')
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('Slot throws the notFound signal for an unmatched slot sentinel', async () => {
    const mod = await import('../src/shims/slot.js')
    const renderPromise = renderHtml(
      createContextProvider(
        mod.ElementsContext,
        { 'slot:modal:/': mod.UNMATCHED_SLOT },
        createElement(mod.Slot, { id: 'slot:modal:/' }),
      ),
    )
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await expect(renderPromise).rejects.toMatchObject({ digest: 'TEXT_HTTP_ERROR_FALLBACK;404' })
    } finally {
      consoleError.mockRestore()
    }
  })

  it('Slot renders a present null entry without triggering notFound', async () => {
    const mod = await import('../src/shims/slot.js')

    const html = await renderHtml(
      createContextProvider(
        mod.ElementsContext,
        { 'slot:modal:/': null },
        createElement(mod.Slot, { id: 'slot:modal:/' }),
      ),
    )

    expect(html).toBe('')
  })

  it('normalizes the server unmatched-slot marker to the client sentinel', async () => {
    const { normalizeAppElements, APP_UNMATCHED_SLOT_WIRE_VALUE } =
      await import('../src/server/app-elements.js')
    const mod = await import('../src/shims/slot.js')

    const normalized = normalizeAppElements({
      __rootLayout: '/',
      __route: 'route:/dashboard',
      'slot:modal:/': APP_UNMATCHED_SLOT_WIRE_VALUE,
    })

    expect(normalized['slot:modal:/']).toBe(mod.UNMATCHED_SLOT)
  })

  it('mergeElements preserves approved non-slot elements', async () => {
    const { mergeElements } = await import('../src/shims/slot.js')

    const merged = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'slot:modal:/': createElement('div', null, 'previous slot'),
      },
      {
        'page:/blog/hello': createElement('div', null, 'page'),
        'slot:modal:/': createElement('div', null, 'text slot'),
      },
      { preserveElementIds: ['layout:/'] },
    )

    expect(Object.keys(merged).sort()).toEqual(['layout:/', 'page:/blog/hello', 'slot:modal:/'])
    expect(merged['layout:/']).toBeDefined()
    expect(merged['page:/blog/hello']).toBeDefined()
    expect(merged['slot:modal:/']).not.toBeNull()
  })

  it('mergeElements drops absent non-slot elements without approved persistence', async () => {
    const { mergeElements } = await import('../src/shims/slot.js')

    const merged = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'page:/dashboard': createElement('div', null, 'dashboard'),
      },
      {
        'page:/settings': createElement('div', null, 'settings'),
      },
    )

    expect(Object.hasOwn(merged, 'layout:/')).toBe(false)
    expect(Object.hasOwn(merged, 'page:/dashboard')).toBe(false)
    expect(Object.hasOwn(merged, 'page:/settings')).toBe(true)
  })

  it('mergeElements does not infer unmatched slot preservation from the wire marker', async () => {
    const { mergeElements } = await import('../src/shims/slot.js')

    const previousSlotContent = createElement('div', null, 'previous modal')
    const merged = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'slot:modal:/': previousSlotContent,
        'page:/dashboard': createElement('div', null, 'dashboard'),
      },
      {
        'page:/blog': createElement('div', null, 'blog page'),
        'slot:modal:/': UNMATCHED_SLOT,
      },
      { preserveElementIds: ['layout:/'] },
    )

    expect(merged['slot:modal:/']).toBe(UNMATCHED_SLOT)
    expect(merged['page:/blog']).toBeDefined()
    expect(merged['layout:/']).toBeDefined()
  })

  it('mergeElements preserves previous slot content for planner-approved default/unmatched slots', async () => {
    const { mergeElements } = await import('../src/shims/slot.js')

    const previousSlotContent = createElement('div', null, 'previous modal')
    const defaultSlotContent = createElement('div', null, 'default modal')
    const mergedFromUnmatched = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'slot:modal:/': previousSlotContent,
      },
      {
        'page:/blog': createElement('div', null, 'blog page'),
        'slot:modal:/': UNMATCHED_SLOT,
      },
      { preserveElementIds: ['layout:/'], preservePreviousSlotIds: ['slot:modal:/'] },
    )
    const mergedFromDefault = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'slot:modal:/': previousSlotContent,
      },
      {
        'page:/blog': createElement('div', null, 'blog page'),
        'slot:modal:/': defaultSlotContent,
      },
      { preserveElementIds: ['layout:/'], preservePreviousSlotIds: ['slot:modal:/'] },
    )

    expect(mergedFromUnmatched['slot:modal:/']).toBe(previousSlotContent)
    expect(mergedFromDefault['slot:modal:/']).toBe(previousSlotContent)
  })

  it('mergeElements preserves a present null default slot when the planner approves it', async () => {
    const { mergeElements } = await import('../src/shims/slot.js')

    const merged = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'slot:modal:/': null,
      },
      {
        'page:/blog': createElement('div', null, 'blog page'),
        'slot:modal:/': UNMATCHED_SLOT,
      },
      { preserveElementIds: ['layout:/'], preservePreviousSlotIds: ['slot:modal:/'] },
    )

    expect(Object.hasOwn(merged, 'slot:modal:/')).toBe(true)
    expect(merged['slot:modal:/']).toBeNull()
  })

  it('mergeElements allows UNMATCHED_SLOT for slots absent from previous state', async () => {
    const { mergeElements } = await import('../src/shims/slot.js')

    const merged = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'page:/': createElement('div', null, 'home'),
      },
      {
        'page:/blog': createElement('div', null, 'blog'),
        'slot:modal:/': UNMATCHED_SLOT,
      },
      { preserveElementIds: ['layout:/'] },
    )

    // No previous value to preserve — the sentinel passes through.
    expect(merged['slot:modal:/']).toBe(UNMATCHED_SLOT)
  })

  it('mergeElements clears stale slots absent from text when clearAbsentSlots is set', async () => {
    const { mergeElements } = await import('../src/shims/slot.js')

    const merged = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'page:/feed': createElement('div', null, 'feed'),
        'slot:modal:/feed': createElement('div', null, 'intercepted modal'),
      },
      {
        'layout:/': createElement('div', null, 'layout'),
        'page:/feed': createElement('div', null, 'feed'),
      },
      true,
    )

    expect(Object.hasOwn(merged, 'slot:modal:/feed')).toBe(false)
  })

  it('mergeElements keeps unmatched slot markers on traversal without planner approval', async () => {
    const { mergeElements, UNMATCHED_SLOT } = await import('../src/shims/slot.js')

    const realContent = createElement('div', null, 'modal content')
    const merged = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'page:/feed': createElement('div', null, 'feed'),
        'slot:modal:/feed': realContent,
      },
      {
        'layout:/': createElement('div', null, 'layout'),
        'page:/feed': createElement('div', null, 'feed'),
        // @ts-expect-error - typescript is not correctly inferring the type of the symbol
        'slot:modal:/feed': UNMATCHED_SLOT,
      },
      { clearAbsentSlots: true, preserveElementIds: ['layout:/'] },
    )

    expect(Object.hasOwn(merged, 'slot:modal:/feed')).toBe(true)
    expect(merged['slot:modal:/feed']).toBe(UNMATCHED_SLOT)
  })

  it('mergeElements preserves absent slots when clearAbsentSlots is not set', async () => {
    const { mergeElements } = await import('../src/shims/slot.js')

    const merged = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'page:/dashboard': createElement('div', null, 'dashboard'),
        'slot:team:/dashboard': createElement('div', null, 'team panel'),
      },
      {
        'page:/dashboard/settings': createElement('div', null, 'settings'),
      },
    )

    // Without clearAbsentSlots, absent slots survive (soft nav to child route)
    expect(Object.hasOwn(merged, 'slot:team:/dashboard')).toBe(true)
  })

  it('mergeElements drops absent slots when legacy absent-slot preservation is fenced', async () => {
    const { mergeElements } = await import('../src/shims/slot.js')

    const merged = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'page:/dashboard': createElement('div', null, 'dashboard'),
        'slot:team:/dashboard': createElement('div', null, 'team panel'),
      },
      {
        'page:/dashboard/settings': createElement('div', null, 'settings'),
      },
      { preserveAbsentSlots: false },
    )

    expect(Object.hasOwn(merged, 'slot:team:/dashboard')).toBe(false)
  })

  it('mergeElements preserves explicitly approved mounted slots without wire absence semantics', async () => {
    const { mergeElements } = await import('../src/shims/slot.js')

    const mountedSlot = createElement('div', null, 'team panel')
    const merged = mergeElements(
      {
        'layout:/': createElement('div', null, 'layout'),
        'layout:/dashboard': createElement('div', null, 'dashboard layout'),
        'page:/dashboard': createElement('div', null, 'dashboard'),
        'slot:team:/dashboard': mountedSlot,
      },
      {
        'page:/dashboard/settings': createElement('div', null, 'settings'),
      },
      {
        preserveAbsentSlots: false,
        preserveElementIds: ['layout:/', 'layout:/dashboard', 'slot:team:/dashboard'],
      },
    )

    expect(merged['slot:team:/dashboard']).toBe(mountedSlot)
  })

  it('Slot renders element from resolved context', async () => {
    const mod = await import('../src/shims/slot.js')

    const html = await renderHtml(
      createContextProvider(
        mod.ElementsContext,
        { 'layout:/': createElement('div', null, 'resolved slot') },
        createElement(mod.Slot, { id: 'layout:/' }),
      ),
    )

    expect(html).toContain('resolved slot')
  })
})
