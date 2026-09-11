/**
 * text/document shim
 *
 * Provides Html, Head, Main, TextScript components for custom _document.tsx.
 * During SSR these render placeholder markers that the dev server replaces
 * with actual content.
 */
import {
  type TextCompatComponentType,
  type TextCompatElement,
  type TextCompatNode,
} from './component-adapter.js'
import type { RueElementProps } from './rue-shim-types.js'

export function Html({
  children,
  lang,
  ...props
}: RueElementProps<HTMLHtmlElement> & { lang?: string }): TextCompatNode {
  return (
    <html lang={lang} {...props}>
      {children}
    </html>
  )
}

/**
 * Document Head - renders <head> with children.
 * The dev server injects meta tags, styles, etc.
 */
export function Head({ children }: { children?: TextCompatNode }): TextCompatNode {
  return (
    <head>
      <meta {...{ charSet: 'utf-8' }} />
      <meta
        {...{
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        }}
      />
      {children}
    </head>
  )
}

/**
 * Main - renders the page content container.
 */
export function Main(): TextCompatNode {
  return (
    <div
      {...{
        id: '__text',
        dangerouslySetInnerHTML: { __html: getTextMainHtml() },
      }}
    />
  )
}

/**
 * TextScript - renders a placeholder that the dev-server replaces with
 * actual hydration scripts (__TEXT_DATA__ + entry module).
 * Uses dangerouslySetInnerHTML so the HTML comment survives renderToString.
 */
export function TextScript(): TextCompatNode {
  return (
    <span
      {...{
        dangerouslySetInnerHTML: { __html: getTextScriptsHtml() },
      }}
    />
  )
}

export function getTextMainHtml(): string {
  return '__TEXT_MAIN__'
}

export function getTextScriptsHtml(): string {
  return '<!-- __TEXT_SCRIPTS__ -->'
}

/**
 * Loose stand-ins for Text.js's `DocumentContext` / `DocumentInitialProps`.
 * The shim doesn't currently invoke `getInitialProps` on user `_document.tsx`
 * files (separate gap), but the signatures here match Text.js's so subclasses
 * that delegate via `await Document.getInitialProps(ctx)` typecheck against
 * the same shape they'd see under real Text.js.
 *
 * @see https://github.com/vercel/next.js/blob/canary/packages/text/src/shared/lib/utils.ts
 */
export type DocumentContext = {
  // The full `DocumentContext` includes `renderPage`, `defaultGetInitialProps`,
  // and the inherited `TextPageContext` (`pathname`, `query`, `req`, `res`,
  // `err`, `asPath`, ...). They're declared as optional here because text
  // does not yet plumb them through; widening to optional avoids forcing user
  // code to assert their presence.
  renderPage?: (options?: {
    enhanceApp?: (App: TextCompatComponentType<{ children?: TextCompatNode }>) => unknown
    enhanceComponent?: (Comp: TextCompatComponentType<unknown>) => unknown
  }) => { html: string; head?: ReadonlyArray<TextCompatElement> }
  defaultGetInitialProps?: (
    ctx: DocumentContext,
    options?: { nonce?: string },
  ) => Promise<DocumentInitialProps>
  pathname?: string
  query?: Record<string, string | string[] | undefined>
  asPath?: string
  // oxlint-disable-text-line @typescript-eslint/no-explicit-any
  err?: any
}

export type DocumentInitialProps = {
  html: string
  head?: ReadonlyArray<TextCompatElement>
  styles?: TextCompatElement[] | Iterable<TextCompatNode> | TextCompatElement
}

type DocumentInstance = {
  render(): TextCompatNode
}

type DocumentConstructor = {
  (_props?: { children?: TextCompatNode }): TextCompatNode
  new (_props?: { children?: TextCompatNode }): DocumentInstance
  prototype: DocumentInstance
  getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps>
}

/** Default document is callable by Rue and constructable by custom subclasses. */
const Document = function (this: DocumentInstance | undefined): TextCompatNode | void {
  if (new.target) return
  return Document.prototype.render.call(this)
} as DocumentConstructor

Document.prototype.render = function (): TextCompatNode {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <TextScript />
      </body>
    </Html>
  )
}

Document.getInitialProps = async function (_ctx: DocumentContext): Promise<DocumentInitialProps> {
  return { html: '' }
}

export default Document
