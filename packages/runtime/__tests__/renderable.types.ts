import type { ChildInput, FC, RenderInput, RenderOutput } from '../src/runtime-types'
import type { CompiledRootHandle } from '../src/compiled-root'
import { ref } from '../src/reactivity'

declare const node: Node
declare const root: CompiledRootHandle

const input: RenderInput = ['text', 1, false, null, undefined, node, root]
const output: RenderOutput = input
const displayRef = ref('ref child')
const refChild: ChildInput = displayRef
const nestedRefChild: ChildInput = [displayRef, ref([displayRef])]
const component: FC = () => 'render output'

// @ts-expect-error Ref is accepted only at a JSX children input boundary.
const invalidOutput: RenderOutput = displayRef
// @ts-expect-error A component must not return a Ref directly.
const invalidComponent: FC = () => displayRef

void input
void output
void refChild
void nestedRefChild
void component
void invalidOutput
void invalidComponent
