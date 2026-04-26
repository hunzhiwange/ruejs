import type { BlockFactory, BlockInstance, RenderTarget, Renderable } from '../src'
import type { DomElementLike, DomNodeLike } from '../src/dom'

declare const container: DomElementLike
declare const start: DomNodeLike
declare const end: DomNodeLike
declare const anchor: DomNodeLike

const containerTarget: RenderTarget = {
  kind: 'container',
  container,
}

const betweenTarget: RenderTarget = {
  kind: 'between',
  parent: container,
  start,
  end,
}

const anchorTarget: RenderTarget = {
  kind: 'anchor',
  parent: container,
  anchor,
}

const staticTarget: RenderTarget = {
  kind: 'static',
  parent: container,
  anchor,
}

const block: BlockInstance = {
  kind: 'block',
  mount(target) {
    void target
  },
}

const factory: BlockFactory = Object.assign(() => block, {
  kind: 'block-factory' as const,
})

const renderables: ReadonlyArray<Renderable> = [
  'text',
  1,
  false,
  null,
  undefined,
  anchor,
  block,
  factory,
  [start],
]

void containerTarget
void betweenTarget
void anchorTarget
void staticTarget
void renderables
