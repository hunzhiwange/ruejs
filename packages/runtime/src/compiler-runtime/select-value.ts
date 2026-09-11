/** The compiler calls this only for a select, after its options have been created. */
export const _$compiledSelectValue = (element: HTMLSelectElement, value: unknown): void => {
  if (element.multiple) {
    const values = new Set(
      (Array.isArray(value) ? value : value == null ? [] : [value]).map(String),
    )
    for (const option of element.options) option.selected = values.has(option.value)
  } else element.value = value == null ? '' : String(value)
}
