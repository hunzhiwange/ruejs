type AppBrowserCaughtErrorHandler = (error: unknown, info: { componentStack?: string }) => void
type AppBrowserUncaughtErrorHandler = AppBrowserCaughtErrorHandler
import { batch } from '@rue-js/rue'
export type RueStateSetter<T> = (value: T | ((previous: T) => T)) => void
export type AppBrowserFormState = unknown
export type AppBrowserRootOptions = {
  formState: AppBrowserFormState | null
  onCaughtError?: AppBrowserCaughtErrorHandler
  onUncaughtError: AppBrowserUncaughtErrorHandler
}
import { RSC_FORM_STATE_GLOBAL } from './app-browser-form-state.js'
export { RSC_FORM_STATE_GLOBAL }

type FormStateGlobal = {
  [RSC_FORM_STATE_GLOBAL]?: AppBrowserFormState
}

type ThenableRecord<T> =
  | { status: 'pending'; value: PromiseLike<T> }
  | { status: 'fulfilled'; value: T }
  | { reason: unknown; status: 'rejected' }

const thenableRecords = new WeakMap<PromiseLike<unknown>, ThenableRecord<unknown>>()
export function runRueTransition(action: () => void): void {
  batch(action)
}
export function consumeInitialFormState(global: FormStateGlobal): AppBrowserFormState | null {
  const formState = global[RSC_FORM_STATE_GLOBAL] ?? null
  delete global[RSC_FORM_STATE_GLOBAL]
  return formState
}

export function createTextRueRootOptions(options: {
  formState: AppBrowserFormState | null
  onCaughtError?: AppBrowserCaughtErrorHandler
  onUncaughtError: AppBrowserUncaughtErrorHandler
}): AppBrowserRootOptions {
  const rootOptions = {
    formState: options.formState,
    onUncaughtError: options.onUncaughtError,
  }

  if (options.onCaughtError) {
    return {
      ...rootOptions,
      onCaughtError: options.onCaughtError,
    }
  }

  return rootOptions
}

export function readRueThenable<T>(thenable: PromiseLike<T>): T {
  const existing = thenableRecords.get(thenable as PromiseLike<unknown>) as
    | ThenableRecord<T>
    | undefined
  if (existing) {
    if (existing.status === 'fulfilled') return existing.value
    if (existing.status === 'rejected') throw existing.reason
    throw existing.value
  }

  const record: ThenableRecord<T> = {
    status: 'pending',
    value: thenable,
  }
  thenableRecords.set(thenable as PromiseLike<unknown>, record as ThenableRecord<unknown>)

  Promise.resolve(thenable).then(
    value => {
      thenableRecords.set(
        thenable as PromiseLike<unknown>,
        {
          status: 'fulfilled',
          value,
        } as ThenableRecord<unknown>,
      )
    },
    reason => {
      thenableRecords.set(thenable as PromiseLike<unknown>, {
        reason,
        status: 'rejected',
      })
    },
  )

  throw thenable
}
