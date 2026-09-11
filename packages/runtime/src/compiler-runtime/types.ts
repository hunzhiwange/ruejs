import type { CompiledOwner } from '../runtime-core/compiled'

export interface CompiledTarget {
  parent: ParentNode
  before: Node | null
  batch?: true
}

export interface CompiledBlock {
  readonly first: Node
  readonly last: Node
  readonly owner: CompiledOwner
  dispose(): void
}

export type CompiledGetterProps<Props extends object> = {
  readonly [Key in keyof Props]: () => Props[Key]
}

export type { CompiledComponentFactory as CompiledComponent } from './component'

export interface CompiledRange {
  readonly first: Node
  readonly last: Node
}
