'use client'

import { useEffect, useState } from '@rue-js/rue'

export function ThrowingComponent() {
  const [shouldThrow, setShouldThrow] = useState(false)

  useEffect(() => {
    if (shouldThrow) throw new Error('Test error from client component')
  }, [shouldThrow])

  return (
    <button data-testid="trigger-error" onClick={() => setShouldThrow(true)}>
      Trigger Error
    </button>
  )
}
