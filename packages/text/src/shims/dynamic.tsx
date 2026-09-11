/** Lazy components use the same compiled component and Suspense plans as static imports. */
import { Suspense, signal, useEffect } from '@rue-js/rue'

type DynamicLoadingProps = {
  error?: Error | null
  isLoading?: boolean
  pastDelay?: boolean
  retry?: () => void
  timedOut?: boolean
}
type ComponentType<P> = ((props: P) => unknown) & { displayName?: string }
type ComponentModule<P> = { default: ComponentType<P> }
type LoaderResult<P> = Promise<ComponentModule<P> | ComponentType<P>>
type Loader<P> = (() => LoaderResult<P>) | LoaderResult<P>
type DynamicOptions<P> = {
  loading?: ComponentType<DynamicLoadingProps>
  loader?: Loader<P>
  ssr?: boolean
}
const preloads = new Set<Promise<void>>()

export async function flushPreloads(): Promise<void[]> {
  const pending = [...preloads]
  preloads.clear()
  return Promise.all(pending)
}

export default function dynamic<P extends object = object>(
  input: DynamicOptions<P> | Loader<P>,
  options?: DynamicOptions<P>,
): ComponentType<P> {
  const settings = {
    ...(typeof input === 'function' || input instanceof Promise ? { loader: input } : input),
    ...options,
  }
  const Loading = settings.loading
  let pending: Promise<ComponentType<P>> | undefined
  const load = () =>
    (pending ??= Promise.resolve().then(async () => {
      if (!settings.loader) throw new Error('text/dynamic requires a component loader')
      const module = await (typeof settings.loader === 'function'
        ? settings.loader()
        : settings.loader)
      const component = typeof module === 'function' ? module : module.default
      if (typeof component !== 'function')
        throw new Error('text/dynamic loader must resolve to a compiled component')
      return component
    }))
  if (settings.ssr !== false)
    preloads.add(
      load().then(
        () => {},
        () => {},
      ),
    )

  function DynamicComponent(props: P) {
    const mounted = signal(settings.ssr !== false)
    const attempt = signal(0)
    const retry = () => {
      pending = undefined
      attempt.set(attempt.peek() + 1)
    }
    useEffect(() => {
      mounted.set(true)
    }, [])
    async function Resolved() {
      try {
        const Component = await load()
        return <Component {...props} />
      } catch (cause) {
        if (!Loading) throw cause
        const error = cause instanceof Error ? cause : new Error(String(cause))
        return (
          <Loading
            error={error}
            isLoading={false}
            pastDelay={true}
            timedOut={false}
            retry={retry}
          />
        )
      }
    }
    return mounted.get() ? (
      <>
        {[attempt.get()].map(key => (
          <Suspense
            key={key}
            fallback={
              Loading ? (
                <Loading
                  error={null}
                  isLoading={true}
                  pastDelay={true}
                  timedOut={false}
                  retry={retry}
                />
              ) : null
            }
          >
            <Resolved />
          </Suspense>
        ))}
      </>
    ) : (
      <>
        {Loading ? (
          <Loading error={null} isLoading={true} pastDelay={false} timedOut={false} retry={retry} />
        ) : null}
      </>
    )
  }
  DynamicComponent.displayName = 'TextDynamic'
  return DynamicComponent
}
