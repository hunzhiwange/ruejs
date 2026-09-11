import { isAppServerPlan } from '../src/server/app-server-tree.js'
import type { ServerComponent, ServerPlan } from '@rue-js/runtime/internal/ssr'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'

const plans = new WeakSet<ServerPlan>()
const nativeFactories = new WeakMap<object, Map<string, ServerComponent>>()
type TestChild = ServerPlan | string | number | boolean | null | undefined | readonly TestChild[]

async function nativeFactory(tag: string): Promise<ServerComponent> {
  const [ssr, component, server] = await Promise.all([
    import('@rue-js/runtime/internal/ssr'),
    import('@rue-js/runtime/internal/component'),
    import('@rue-js/runtime/server'),
  ])
  let cache = nativeFactories.get(ssr)
  if (!cache) nativeFactories.set(ssr, (cache = new Map()))
  let factory = cache.get(tag)
  if (!factory) {
    if (tag !== '#text' && !/^[a-z][a-z0-9-]*$/.test(tag))
      throw new Error(`Invalid fixture tag: ${tag}`)
    const jsx =
      tag === '#text'
        ? '<>{props.text}</>'
        : /^(title|textarea|script|style)$/.test(tag)
          ? `<${tag} {...props} fixtureText={undefined}>{props.fixtureText}</${tag}>`
          : `<${tag} {...props}>{props.children}</${tag}>`
    factory = compileNodePlan(
      `export const View=props=>${jsx}`,
      'server',
      false,
      {},
      {
        '@rue-js/rue/internal/ssr': ssr,
        '@rue-js/rue/internal/component': component,
        '@rue-js/runtime/server': server,
      },
    ).View
    cache.set(tag, factory!)
  }
  return factory!
}
async function writeChild(child: TestChild, writer: Parameters<ServerPlan>[0]): Promise<void> {
  if (child == null || typeof child === 'boolean') return
  if (Array.isArray(child)) {
    for (const entry of child) await writeChild(entry, writer)
    return
  }
  if (typeof child === 'function') {
    await child(writer)
    return
  }
  if (typeof child !== 'string' && typeof child !== 'number')
    throw new Error('Expected a compiled fixture slot')
  const plan = await (await nativeFactory('#text'))({ text: child })
  await plan(writer)
}

/** Native fixture tags are compiled to writer factories, never interpreted by a test renderer. */
export function createElement<P = Record<string, unknown>>(
  component: ServerComponent<P> | string,
  props?: P | null,
  ...children: TestChild[]
): ServerPlan {
  if (typeof component !== 'function' && typeof component !== 'string')
    throw new Error('Expected a compiled SSR factory')
  const plan: ServerPlan = async writer => {
    const { _$writeComponent } = await import('@rue-js/runtime/internal/ssr')
    const target = typeof component === 'string' ? await nativeFactory(component) : component
    const rawText =
      typeof component === 'string' && /^(title|textarea|script|style)$/.test(component)
    if (
      rawText &&
      children.some(
        child => child != null && typeof child !== 'string' && typeof child !== 'number',
      )
    )
      throw new Error('Raw text fixtures require scalar children')
    const input = rawText ? { ...props, fixtureText: children.join('') } : props
    const slot: ServerPlan | null =
      !rawText && children.length
        ? async context => {
            for (const child of children) await writeChild(child, context)
          }
        : null
    await _$writeComponent(writer, 'test-component', target, () => input ?? {}, slot)
  }
  plans.add(plan)
  return plan
}
export function asCompiledFactory(element: ServerPlan | ServerComponent): ServerComponent {
  return plans.has(element as ServerPlan) || isAppServerPlan(element)
    ? () => element as ServerPlan
    : (element as ServerComponent)
}
export async function renderToString(element: ServerPlan | ServerComponent): Promise<string> {
  const { renderToString } = await import('@rue-js/runtime/server')
  return renderToString(asCompiledFactory(element))
}

export async function compileServerFixture(source: string) {
  const [ssr, component, reactive, server] = await Promise.all([
    import('@rue-js/runtime/internal/ssr'),
    import('@rue-js/runtime/internal/component'),
    import('@rue-js/runtime/internal/reactive'),
    import('@rue-js/runtime/server'),
  ])
  return compileNodePlan(
    source,
    'server',
    false,
    {},
    {
      '@rue-js/rue/internal/ssr': ssr,
      '@rue-js/rue/internal/component': component,
      '@rue-js/rue/internal/reactive': reactive,
      '@rue-js/runtime/server': server,
    },
  )
}
