/// <reference types="vite/client" />
/// <reference types="vitest" />
declare namespace JSX {
  type Element = import('rue').VNode
  interface IntrinsicElements {
    [elemName: string]: any
  }
  interface IntrinsicAttributes {
    key?: string | number
  }
  interface ElementChildrenAttribute {
    children: {}
  }
}
