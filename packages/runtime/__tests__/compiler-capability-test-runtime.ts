import * as teleport from '../src/compiler-runtime/entries/teleport'
import * as transition from '../src/compiler-runtime/entries/transition'
import * as transitiongroup from '../src/compiler-runtime/entries/transitiongroup'
import * as keepalive from '../src/compiler-runtime/entries/keepalive'
import * as suspense from '../src/compiler-runtime/entries/suspense'
import * as dom from '../src/compiler-runtime/entries/dom'
import * as reactive from '../src/compiler-runtime/entries/reactive'
import * as block from '../src/compiler-runtime/entries/block'
import * as component from '../src/compiler-runtime/entries/component'
import * as list from '../src/compiler-runtime/entries/list'
import * as events from '../src/compiler-runtime/entries/events'
import * as builtin from '../src/compiler-runtime/entries/builtin'
import * as hydrate from '../src/compiler-runtime/entries/hydrate'
import * as ssr from '../src/compiler-runtime/entries/ssr'

export const compilerCapabilities = {
  teleport,
  transition,
  transitiongroup,
  keepalive,
  suspense,
  dom,
  reactive,
  block,
  component,
  list,
  events,
  builtin,
  hydrate,
  ssr,
}

/** Resolve generated imports to the real capability implementation, without a facade fallback. */
export const resolveCompilerCapability = (id: string): unknown => {
  const prefix = '@rue-js/rue/internal/'
  if (!id.startsWith(prefix)) return undefined
  const category = id.slice(prefix.length)
  return Object.hasOwn(compilerCapabilities, category)
    ? compilerCapabilities[category as keyof typeof compilerCapabilities]
    : undefined
}

/** Keep the test mount driver outside JSX compilation; only the fixture is transformed. */
export const mountCompiledTestComponent = (
  compiled: { Example(): import('../src/compiler-runtime/block').BlockRecord },
  host: HTMLElement,
): (() => void) => {
  const owner = reactive.createOwner()
  const root = reactive.runWithOwner(owner, () => compiled.Example())!
  reactive.runWithOwner(owner, () => root.__rue_compiled_mount(host))
  return () => {
    root.dispose()
    reactive.disposeOwner(owner)
  }
}
