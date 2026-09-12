// global JSX namespace registration
// somehow we have to copy=pase the jsx-runtime types here to make TypeScript happy
import type { RenderOutput } from '@rue-js/runtime'

declare global {
  namespace JSX {
    export type Element = RenderOutput
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
      'server:defer'?: boolean | ''
      'client:load'?: boolean | ''
      'client:idle'?: boolean | '' | { timeout: number }
      'client:visible'?: boolean | '' | { rootMargin: string }
      'client:media'?: string | boolean
      'client:interaction'?: string | string[] | boolean
      'client:none'?: boolean | ''
      'client:only'?: boolean | ''
      fallback?: any
    }
  }
}
