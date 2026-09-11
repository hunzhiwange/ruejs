/** Development JSX also requires the Rue compiler; no runtime factory exists. */
export { Fragment } from './jsx-runtime'
export declare function jsx(
  type: unknown,
  props: Record<string, unknown> | null,
  key?: unknown,
): JSX.Element
export declare const jsxs: typeof jsx
export declare const jsxDEV: typeof jsx
