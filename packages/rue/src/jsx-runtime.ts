/** JSX is source syntax only. Install @rue-js/vite-plugin-rue to compile it.
 * These declarations intentionally have no runtime exports: an automatic JSX
 * transform that bypasses Rue fails at module linking during the build.
 */
export const Fragment = Symbol.for('rue.jsx.fragment')
export declare function jsx(
  type: unknown,
  props: Record<string, unknown> | null,
  key?: unknown,
): JSX.Element
export declare const jsxs: typeof jsx
export declare const jsxDEV: typeof jsx
