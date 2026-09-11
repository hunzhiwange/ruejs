/** Shared wire grammar. IDs are assigned by the same compiler traversal for both targets. */
export const marker = (id: string, end = false) => `${end ? '/' : ''}r:${id}`
export const svgNamespace = 'http://www.w3.org/2000/svg'
export const htmlNamespace = 'http://www.w3.org/1999/xhtml'
export const voidTags = new Set(
  'area base br col embed hr img input link meta param source track wbr'.split(' '),
)
const booleans = new Set(
  'allowfullscreen async autofocus autoplay checked controls default defer disabled formnovalidate hidden inert ismap loop multiple muted nomodule novalidate open playsinline readonly required reversed selected'.split(
    ' ',
  ),
)
export const attributeName = (key: string) =>
  key === 'className' ? 'class' : key === 'htmlFor' ? 'for' : key
export const booleanAttribute = (key: string) => booleans.has(key.toLowerCase())
export const ignoredProp = (key: string) =>
  key === 'key' ||
  key === 'ref' ||
  key === 'children' ||
  key === '__rue_slots' ||
  key === 'innerHTML' ||
  key === 'dangerouslySetInnerHTML' ||
  /^on[:A-Z]/.test(key)
export const scalar = (value: unknown): string => {
  if (value == null || typeof value === 'boolean') return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint')
    return String(value)
  throw new TypeError(
    'Rue compiled text requires a scalar; compile components, lists and slots explicitly',
  )
}
export const escapeText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const escapeAttribute = (value: string) => escapeText(value).replace(/"/g, '&quot;')
export const styleValue = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return Object.entries(value as Record<string, unknown>)
    .filter(([, value]) => value != null)
    .map(
      ([key, value]) =>
        `${key.startsWith('--') ? key : key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}: ${String(value)}`,
    )
    .join('; ')
}
export const rawHTML = (props: Record<string, any>) =>
  props.innerHTML ?? props.dangerouslySetInnerHTML?.__html
/** Keys must survive a server/client boundary and cannot contain HTML comment delimiters. */
export const listMarker = (key: unknown): string => {
  if (key != null && !['string', 'number', 'bigint', 'boolean'].includes(typeof key))
    throw new TypeError('Rue SSR list keys must be serializable scalars')
  return `row:${typeof key}:${encodeURIComponent(String(key)).replace(/-/g, '%2D')}`
}
