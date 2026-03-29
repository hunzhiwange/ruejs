/*
应用入口概述
- 错误处理：useError 启用控制台与覆盖层，便于开发定位。
- 根组件：RootApp 组合站点布局与路由视图。
- 启动流程：useApp 创建应用，挂载到 #app，并安装路由插件。
*/
import { type FC, useError, useApp } from 'rue-js'
import { RouterView, useRoute } from 'rue-router'
import router from './router'
import SiteLayout from './pages/site/components/Layout'
import { createPlugin } from '@rue-js/plugin'

// 开发阶段错误可视化与控制台输出
useError({ overlay: true, console: true })

/** 根应用组件：提供布局与路由视图 */
const RootApp: FC = () => {
  const route = useRoute()

  const isRustLayers = route.get()?.path === '/rust-layers'

  if (isRustLayers) {
    return <RouterView />
  }

  return (
    <SiteLayout>
      <RouterView />
    </SiteLayout>
  )
}

// 创建并挂载应用，安装路由
const rustPlugin = createPlugin()
useApp(RootApp)
  .use(router)
  .use(rustPlugin, [{ name: 'demo' }])
  .mount('#app')
