/* eslint-disable @typescript-eslint/ban-ts-comment */
// global JSX namespace registration
// somehow we have to copy=pase the jsx-runtime types here to make TypeScript happy
import type { RenderableOutput } from '@rue-js/runtime'

declare global {
  namespace JSX {
    export type Element = RenderableOutput
    export interface ElementClass {
      $props: {}
    }
    export interface ElementAttributesProperty {
      $props: {}
    }
    export interface IntrinsicElements {
      // allow arbitrary elements
      // @ts-ignore suppress ts:2374 = Duplicate string index signature.
      [name: string]: any
    }
    export interface IntrinsicAttributes {
      key?: string | number
    }
  }
}
