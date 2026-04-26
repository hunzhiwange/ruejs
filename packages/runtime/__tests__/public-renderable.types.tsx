import type { BlockInstance, FC, Renderable, RenderableInput, RenderableOutput } from '../src'
import { render, renderAnchor, renderBetween, renderStatic, vapor } from '../src'
import * as runtimeNamespace from '../src'
import type { DomElementLike, DomNodeLike } from '../src/dom'

const removedOutputAlias = '\u0056Node' as const
const removedCloneHelper = `clone${removedOutputAlias}` as const
const removedPredicateHelper = `is${removedOutputAlias}` as const

// @ts-expect-error removed legacy render-object alias is no longer exported from the default runtime entry
type RemovedLegacyOutputAlias = (typeof runtimeNamespace)[typeof removedOutputAlias]
// @ts-expect-error removed clone helper is no longer exported from the default runtime entry
void runtimeNamespace[removedCloneHelper]
// @ts-expect-error removed predicate helper is no longer exported from the default runtime entry
void runtimeNamespace[removedPredicateHelper]

declare const container: DomElementLike
declare const start: DomNodeLike
declare const end: DomNodeLike
declare const anchor: DomNodeLike
declare const domNode: HTMLElement

const block: BlockInstance = {
  kind: 'block',
  mount() {},
}

const legacyCompatShape = {
  type: 'div',
  props: { id: 'legacy' },
  children: [],
}

const DomComponent: FC = () => domNode
const BlockComponent: FC = () => block
const TextComponent: FC<{ label: string }> = props => props.label
const MixedComponent: FC = () => ['head', domNode, block]

const renderable: Renderable = ['text', domNode, block]
const vnodeFromJsx: RenderableOutput = (
  <section>
    <DomComponent />
    <BlockComponent />
    <TextComponent label="tail" />
  </section>
)
const renderableHandle: RenderableInput = vapor(() => domNode)
const vaporDirectRoot: RenderableOutput = vapor(() => domNode)

render(domNode, container)
render(block, container)
render(renderableHandle, container)
render(['tail', domNode, block], container)
renderBetween([domNode, 'tail'], container, start, end)
renderAnchor(block, container, anchor)

// @ts-expect-error legacy compat vnode protocol has been removed from the default entry
render(legacyCompatShape, container)
// @ts-expect-error default anchor rendering no longer accepts legacy compat vnode inputs
renderAnchor(legacyCompatShape, container, anchor)
// @ts-expect-error default range rendering no longer accepts legacy compat vnode arrays
renderBetween([domNode, legacyCompatShape], container, start, end)
// @ts-expect-error default static rendering no longer accepts legacy compat vnode inputs
renderStatic(legacyCompatShape, container, anchor)

void renderable
void renderableHandle
void vnodeFromJsx
void vaporDirectRoot
void MixedComponent
void (0 as unknown as RemovedLegacyOutputAlias)