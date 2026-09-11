import { describe, expect, it } from 'vitest'

import { unwrapDisplayRef } from '../src/display-value'
import { computed, ref, signal } from '../src/reactivity'

describe('display value', () => {
  it('unwraps only branded Rue refs for display', () => {
    const source = ref(2)
    const derived = computed(() => source.value * 2)
    const refArray = ref([source])
    const plainValueObject = { value: 'plain' }
    const bareSignal = signal('signal')

    expect(unwrapDisplayRef(source)).toBe(2)
    expect(unwrapDisplayRef(derived)).toBe(4)
    const displayedArray = unwrapDisplayRef(refArray)
    expect(displayedArray).toEqual(refArray.value)
    expect(displayedArray).toEqual([expect.objectContaining({ __rue_ref__: true })])
    expect(unwrapDisplayRef(plainValueObject)).toBe(plainValueObject)
    expect(unwrapDisplayRef(bareSignal)).toBe(bareSignal)
  })
})
