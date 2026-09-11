export interface FormActionDescriptor {
  name: string
  action?: string
  method?: string
  encType?: string
  data?: FormData | null
}
export function formActionDescriptor(value: unknown): FormActionDescriptor | null {
  if (typeof value !== 'function') return null
  const reference = value as Function & {
    $$FORM_ACTION?: () => FormActionDescriptor | null
    $$typeof?: symbol
    $$id?: string
    $$bound?: unknown
  }
  if (reference.$$FORM_ACTION) return reference.$$FORM_ACTION()
  if (
    reference.$$typeof === Symbol.for('rue.server.reference') &&
    typeof reference.$$id === 'string' &&
    reference.$$bound == null
  )
    return {
      name: `$RUE_ACTION_ID_${reference.$$id}`,
      action: '',
      method: 'POST',
      encType: 'multipart/form-data',
      data: null,
    }
  return null
}
