import { computed, ref } from 'rue-js'
import { extend } from 'rue-shared'

export type CartItem = { id: number; name: string; price: number; qty: number }

const items = ref<CartItem[]>([])
export const useCart = () => {
  const add = (p: { id: number; name: string; price: number }) => {
    const idx = items.value.findIndex(i => i.id === p.id)
    if (idx === -1) {
      items.value = [...items.value, extend(p, { qty: 1 })]
    } else {
      const next = items.value.slice()
      next[idx] = extend(next[idx], { qty: next[idx].qty + 1 })
      items.value = next
    }
  }
  const remove = (id: number) => {
    items.value = items.value.filter(i => i.id !== id)
  }
  const clear = () => {
    items.value = []
  }
  const total = computed(() => items.value.reduce((s, i) => s + i.price * i.qty, 0))
  return { items, add, remove, clear, total }
}
