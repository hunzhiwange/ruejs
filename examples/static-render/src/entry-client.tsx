import { useApp } from '@rue-js/rue'
import { App } from './App'
import { createApp } from './main'
import './style.css'

const { router } = createApp()

router.isReady().then(() => {
  useApp(App).use(router).mount('#app')
})
