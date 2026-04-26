import type { DomElementLike, DomNodeLike } from './dom'

export type RenderTarget =
  | {
      kind: 'container'
      container: DomElementLike
    }
  | {
      kind: 'between'
      parent: DomElementLike
      start: DomNodeLike
      end: DomNodeLike
    }
  | {
      kind: 'anchor'
      parent: DomElementLike
      anchor: DomNodeLike
    }
  | {
      kind: 'static'
      parent: DomElementLike
      anchor: DomNodeLike
    }

export interface BlockInstance {
  readonly kind: 'block'
  mount(target: RenderTarget): void
  cleanupBucket?: Array<() => void>
  unmount?(): void
}

export interface BlockFactory {
  (): BlockInstance
  readonly kind: 'block-factory'
}

export type NormalizedRenderable =
  | DomNodeLike
  | BlockFactory
  | BlockInstance
  | ReadonlyArray<NormalizedRenderable>

export type NormalizeRenderableResult =
  | {
      kind: 'renderable'
      value: NormalizedRenderable
    }
  | {
      kind: 'unsupported-object'
      value: unknown
    }

export type Renderable =
  | string
  | number
  | boolean
  | null
  | undefined
  | DomNodeLike
  | BlockFactory
  | BlockInstance
  | ReadonlyArray<Renderable>
