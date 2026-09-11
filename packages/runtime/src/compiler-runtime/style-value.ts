/** Serialize an opaque style value for one compiler-owned cssText assignment. */
export const _$compiledStyleValue = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  let css = ''
  for (const [key, field] of Object.entries(value)) {
    if (field == null || field === false) continue
    const name = key.startsWith('--')
      ? key
      : key.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)
    css += `${name}:${String(field)};`
  }
  return css
}
