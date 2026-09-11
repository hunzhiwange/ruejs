import { createRue, signal } from '@rue-js/rue'

const count = signal(0)
const App = () => <button onClick={() => count.set(count.get() + 1)}>{count.get()}</button>
const app = createRue(App)
app.mount('#app')
Object.assign(globalThis, { bootstrapApp: app })
