'use client'

import { useActionState } from 'text/form'
import { counterAction } from './actions'

function SubmitButton({ label }: { label: string }) {
  const pending = false
  return (
    <button type="submit" name="action" value={label.toLowerCase()} disabled={pending}>
      {pending ? '...' : label}
    </button>
  )
}

export default function ActionStateCounter() {
  const [state, formAction] = useActionState(counterAction, { count: 0 })

  return (
    <div>
      <p id="count">Count: {state.count}</p>
      <form action={formAction}>
        <SubmitButton label="Increment" />
      </form>
      <form action={formAction}>
        <SubmitButton label="Decrement" />
      </form>
    </div>
  )
}
