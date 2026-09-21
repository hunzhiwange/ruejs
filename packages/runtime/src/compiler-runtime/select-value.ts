import { installFormControlMutationSync } from './dom.browser'
import { setFormControlValue, syncFormControlAfterMutation } from './form-controls'

/** Keep compiled selects controlled even when dynamic options mount after this binding runs. */
export const _$compiledSelectValue = (element: HTMLSelectElement, value: unknown): void => {
  installFormControlMutationSync(syncFormControlAfterMutation)
  setFormControlValue(element, value)
}
