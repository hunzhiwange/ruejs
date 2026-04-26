import { type FC, onBeforeUnmount, ref, vapor, watchEffect } from '@rue-js/rue'

const count = ref(0)

export const VaporCounter: FC = () =>
  vapor(() => {
    const root = globalThis.document.createElement('div')
    const btn = globalThis.document.createElement('button')
    const span = globalThis.document.createElement('span')
    root.className = 'max-w-sm mx-auto p-6 card bg-base-100 shadow flex items-center gap-3'
    btn.className = 'btn btn-primary btn-sm'
    span.className = 'text-2xl font-bold text-primary'
    btn.textContent = '加1'
    btn.onclick = () => {
      count.value++
    }
    root.appendChild(btn)
    root.appendChild(span)

    const update = () => {
      span.textContent = String(count.value)
    }

    const stop = watchEffect(update)
    onBeforeUnmount(() => {
      stop.dispose()
    })
    return root
  })

export default VaporCounter
