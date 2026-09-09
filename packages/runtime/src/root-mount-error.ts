const retainedRootMountErrors = new WeakSet<object>()

export const isWeakKey = (value: unknown): value is Record<string, unknown> =>
  Object(value) === value

/** Mark a failed root render so its container keeps the original error. */
export const retainRootMountError = (error: unknown): void => {
  if (isWeakKey(error)) retainedRootMountErrors.add(error)
}

export const shouldRetainRootMountError = (error: unknown): boolean =>
  retainedRootMountErrors.has(error as object)
