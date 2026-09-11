type PreviewFactory = (() => any) | any

type PreviewGateGlobal = typeof globalThis & {
  __RUE_TEST_ENABLED_DESIGN_PREVIEWS__?: Set<string> | string[]
}

const isTestEnvironment = () => {
  return (
    import.meta.env?.MODE === 'test' ||
    import.meta.env?.VITEST === true ||
    import.meta.env?.VITEST === 'true' ||
    !!(globalThis as any).vitest
  )
}

const isPreviewEnabled = (title: string) => {
  if (!isTestEnvironment()) {
    return true
  }

  const enabled = (globalThis as PreviewGateGlobal).__RUE_TEST_ENABLED_DESIGN_PREVIEWS__
  if (!enabled) {
    return true
  }

  if (enabled instanceof Set) {
    return enabled.has(title)
  }

  if (Array.isArray(enabled)) {
    return enabled.includes(title)
  }

  return true
}

export const renderDesignPreview = (title: string, preview: PreviewFactory) => {
  if (!isPreviewEnabled(title)) {
    return null
  }

  if (typeof preview === 'function') {
    return preview()
  }

  return preview ?? null
}
