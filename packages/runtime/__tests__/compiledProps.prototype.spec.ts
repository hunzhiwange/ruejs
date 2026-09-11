// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import { createCompiledProps } from '../src/compiled-props'
import {
  _$compiledBranch,
  _$mountCompiledComponent,
  _$withCompiledPropsUpdater,
} from '../src/compiled-component'
import { _$compiledRoot } from '../src/compiled-root'
import { useSetup as useCompiledSetup } from '../src/compiler-runtime/hooks'
import {
  _$compiledSetup,
  createOwner,
  disposeOwner,
  effect,
  onCleanup,
  runWithOwner,
  setReactiveScheduling,
  signal,
} from '../src/internal-reactive'

afterEach(() => {
  setReactiveScheduling('frame')
  document.body.innerHTML = ''
})

describe('createCompiledProps prototype', () => {
  it('does not collect public compiled useSetup reads into a render effect', () => {
    setReactiveScheduling('sync')
    const setupSource = signal(0)
    let renderRuns = 0

    const renderEffect = effect(() => {
      renderRuns += 1
      useCompiledSetup(() => setupSource.get())
    })

    setupSource.set(1)
    expect(renderRuns).toBe(1)
    renderEffect.dispose()
  })

  it('does not collect setup-only reads into the enclosing render effect', () => {
    setReactiveScheduling('sync')
    const setupSource = signal(0)
    const owner = createOwner()
    let renderRuns = 0

    runWithOwner(owner, () => {
      effect(() => {
        renderRuns += 1
        _$compiledSetup('stable-state', () => setupSource.get())
      })
    })

    setupSource.set(1)
    expect(renderRuns).toBe(1)
    disposeOwner(owner)
  })

  it('tracks branch selection without leaking child setup reads into the branch effect', () => {
    setReactiveScheduling('sync')
    const selection = signal('visible')
    const childState = signal(0)
    let childCreates = 0
    const host = document.createElement('div')
    const branch = _$compiledBranch(() => {
      const key = selection.get()
      return {
        __rue_compiled_branch_key: key,
        create: () => {
          childCreates += 1
          childState.get()
          return _$compiledRoot(() => {
            const __blockNode = document.createElement('span')
            return [__blockNode, __blockNode] as const
          })
        },
      }
    })

    branch.__rue_compiled_mount(host)
    expect(childCreates).toBe(1)

    childState.set(1)
    expect(childCreates).toBe(1)

    selection.set('hidden')
    expect(childCreates).toBe(2)
    branch.dispose()
  })

  it('does not leak compiled child setup reads into a parent render effect', () => {
    setReactiveScheduling('sync')
    const childState = signal(0)
    let parentRuns = 0

    const parentEffect = effect(() => {
      parentRuns += 1
      const host = document.createElement('div')
      _$mountCompiledComponent(
        host,
        () => {
          childState.get()
          return _$withCompiledPropsUpdater(
            _$compiledRoot(() => {
              const __blockNode = document.createElement('span')
              return [__blockNode, __blockNode] as const
            }),
            () => {},
          )
        },
        () => ({}),
      )
    })

    childState.set(1)

    expect(parentRuns).toBe(1)
    parentEffect.dispose()
  })

  it('disposes children before parents and rolls back failed child mounts once', () => {
    setReactiveScheduling('sync')
    const host = document.createElement('div')
    const trace: string[] = []
    const childFactory = () => {
      onCleanup(() => trace.push('child'))
      return _$withCompiledPropsUpdater(
        _$compiledRoot(() => {
          const __blockNode = document.createElement('span')
          return [__blockNode, __blockNode] as const
        }),
        () => {},
      )
    }
    const parent = _$compiledRoot(mountParent => {
      if (mountParent == null) throw new Error('missing parent')
      _$mountCompiledComponent(mountParent, childFactory, () => ({}))
      onCleanup(() => trace.push('parent'))
      return [null, null] as const
    })

    parent.__rue_compiled_mount(host)
    parent.dispose()
    expect(trace).toEqual(['child', 'parent'])

    const brokenFactory = () => {
      onCleanup(() => trace.push('rollback'))
      return _$withCompiledPropsUpdater(
        _$compiledRoot(() => {
          throw new Error('mount failed')
        }),
        () => {},
      )
    }
    expect(() => _$mountCompiledComponent(host, brokenFactory, () => ({}))).toThrow('mount failed')
    expect(trace).toEqual(['child', 'parent', 'rollback'])
    expect(host.childNodes).toHaveLength(0)
  })

  it('publishes shallow prop replacement, addition, removal, and key changes atomically', () => {
    setReactiveScheduling('sync')
    const source = { title: 'first', count: 1, removable: 'present' as string | undefined }
    const controller = createCompiledProps(source)
    const snapshots: string[] = []

    const handle = effect(() => {
      snapshots.push(
        JSON.stringify({
          title: controller.get('title'),
          count: controller.get('count'),
          removable: controller.get('removable'),
          hasRemovable: controller.has('removable'),
          keys: controller.keys(),
        }),
      )
    })

    source.title = 'mutated in place'
    source.count = 2
    delete source.removable
    controller.update(source)

    expect(snapshots).toEqual([
      JSON.stringify({
        title: 'first',
        count: 1,
        removable: 'present',
        hasRemovable: true,
        keys: ['title', 'count', 'removable'],
      }),
      JSON.stringify({
        title: 'mutated in place',
        count: 2,
        hasRemovable: false,
        keys: ['title', 'count'],
      }),
    ])

    handle.dispose()
    controller.dispose()
  })

  it('keeps controllers isolated and rejects updates after disposal', () => {
    setReactiveScheduling('sync')
    const first = createCompiledProps({ label: 'first' })
    const second = createCompiledProps({ label: 'second' })
    const seen: string[] = []
    const firstEffect = effect(() => seen.push(`first:${first.props.label}`))
    const secondEffect = effect(() => seen.push(`second:${second.props.label}`))

    first.update({ label: 'updated' })

    expect(seen).toEqual(['first:first', 'second:second', 'first:updated'])

    first.dispose()
    expect(() => first.update({ label: 'late' })).toThrowError(
      'Cannot update disposed compiled props',
    )
    expect(first.props.label).toBe('updated')

    firstEffect.dispose()
    secondEffect.dispose()
    second.dispose()
  })

  it('drives a handwritten setup-once component through complex prop and branch updates', () => {
    setReactiveScheduling('sync')
    const actions: string[] = []
    let setupRuns = 0
    let lazySetupRuns = 0
    let branchCleanups = 0

    type DemoProps = {
      title: string
      primary: boolean
      secondary?: boolean
      onAction: (title: string) => void
    }

    const createDemo = (initialProps: DemoProps) => {
      setupRuns += 1
      const controller = createCompiledProps(initialProps)
      const local = signal(1)
      let lazySecondary: ReturnType<typeof signal<number>> | undefined
      const getLazySecondary = () => {
        if (lazySecondary === undefined) {
          lazySetupRuns += 1
          lazySecondary = signal(3)
        }
        return lazySecondary
      }

      const root = _$compiledRoot(() => {
        const section = document.createElement('section')
        const heading = document.createElement('h1')
        const action = document.createElement('button')
        const branchAnchor = document.createComment('branch')
        action.textContent = 'action'
        section.append(heading, action, branchAnchor)

        const click = () => controller.props.onAction(controller.props.title)
        action.addEventListener('click', click)
        onCleanup(() => action.removeEventListener('click', click))

        effect(() => {
          heading.className = controller.props.primary ? 'primary' : 'fallback'
          heading.textContent = `${controller.props.title}:${local.get()}`
        })

        effect(() => {
          const branch = document.createElement(
            controller.props.primary
              ? 'div'
              : controller.props.secondary && getLazySecondary().get()
                ? 'span'
                : 'p',
          )
          branch.dataset.branch = controller.props.primary
            ? 'primary'
            : controller.props.secondary && getLazySecondary().get()
              ? 'secondary'
              : 'empty'
          branch.textContent = `${branch.dataset.branch}:${controller.props.title}`
          section.insertBefore(branch, branchAnchor)
          onCleanup(() => {
            branchCleanups += 1
            branch.remove()
          })
        })

        return [section, section] as const
      })

      return {
        ...root,
        local,
        updateProps: controller.update,
        dispose() {
          root.dispose()
          controller.dispose()
        },
      }
    }

    const demo = createDemo({
      title: 'one',
      primary: true,
      onAction: title => actions.push(`old:${title}`),
    })
    const container = document.createElement('main')
    document.body.appendChild(container)
    const mounted = demo.__rue_compiled_mount(container)
    if (mounted == null) throw new Error('Expected demo root')
    container.appendChild(mounted)

    expect(setupRuns).toBe(1)
    expect(lazySetupRuns).toBe(0)
    expect(container.querySelector('[data-branch]')?.getAttribute('data-branch')).toBe('primary')

    demo.updateProps({
      title: 'two',
      primary: false,
      secondary: true,
      onAction: title => actions.push(`new:${title}`),
    })
    expect(setupRuns).toBe(1)
    expect(lazySetupRuns).toBe(1)
    expect(container.querySelector('[data-branch]')?.getAttribute('data-branch')).toBe('secondary')
    expect(container.textContent).toContain('secondary:two')

    demo.local.set(2)
    expect(container.querySelector('h1')?.textContent).toBe('two:2')
    ;(container.querySelector('button') as HTMLButtonElement).click()
    expect(actions).toEqual(['new:two'])

    demo.updateProps({
      title: 'three',
      primary: true,
      onAction: title => actions.push(`latest:${title}`),
    })
    demo.updateProps({
      title: 'four',
      primary: false,
      secondary: true,
      onAction: title => actions.push(`latest:${title}`),
    })

    expect(setupRuns).toBe(1)
    expect(lazySetupRuns).toBe(1)
    expect(container.textContent).toContain('secondary:four')
    expect(branchCleanups).toBe(3)

    demo.dispose()
    expect(container.innerHTML).toBe('')
    expect(branchCleanups).toBe(4)
  })
})
