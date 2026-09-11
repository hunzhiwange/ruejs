'use client'
import { signal } from '@rue-js/rue'
export default function SlotCounter() {
  const count = signal(0)
  return (
    <button data-testid="team-slot-counter" onClick={() => count.set(count.get() + 1)}>
      {count.get()}
    </button>
  )
}
