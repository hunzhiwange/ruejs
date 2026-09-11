export type TextNode =
  | string
  | number
  | boolean
  | null
  | undefined
  | TextElement
  | readonly TextNode[]
  | Record<PropertyKey, unknown>
export type TextElement<P = unknown> = Record<PropertyKey, unknown> & {
  props?: P | null
}
export type TextRenderable = TextNode | TextComponentType | readonly TextNode[]
export type TextComponentType<P = {}> = ((props: P) => TextNode) & {
  displayName?: string
}
export type TextClassComponentType<P = {}> = new (props: P) => {
  render: () => TextNode
}
export type TextPropsWithChildren<P = {}> = P & {
  children?: TextNode
}
export type TextElementType<P = {}> = string | TextComponentType<P> | TextClassComponentType<P>
export type TextElementProps = Record<string, unknown> & {
  children?: TextNode
}
