import { useApp } from '@rue-js/rue'
import { App } from './App'
import { createApp } from './main'
import './style.css'

const { router } = createApp()

router.isReady().then(() => {
  const target = document.querySelector('#app')
  if (!target) throw new Error('Missing #app mount target')

  target.replaceChildren()
  useApp(App).use(router).mount(target)
})
