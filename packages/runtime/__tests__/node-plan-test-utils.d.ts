export declare function compileNodePlan(
  source: string,
  target: 'server' | 'hydrate',
  published?: boolean,
  dependencies?: Record<string, string>,
  sharedRuntime?: Record<string, unknown> | null,
): Record<string, any> & {
  code: any
  modules: any
}
