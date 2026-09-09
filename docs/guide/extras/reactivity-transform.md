# 编译期响应式状态 {#reactivity-transform}

Rue 通过 SWC 编译 `useState` 成员读写。旧版 `$ref`、`$()`、`$$()` 转换草案不是当前稳定语法；不再使用已删除的 `toRef` 作为编译目标。

```tsx
import { useState } from '@rue-js/rue'

export default function Profile() {
  const [profile] = useState({ name: 'Rue', visits: 0 })
  return (
    <button
      onClick={() => {
        profile.visits++
      }}
    >
      {profile.name}: {profile.visits}
    </button>
  )
}
```

编译器将可追踪路径转换为 Signal 读写。对象快照与未知函数调用不会获得隐式响应式能力；严格编译会诊断不支持的状态逃逸。模块级共享状态使用显式 `signal` API。

## Props 读取 {#reactive-props-destructure}

在组件渲染表达式、`computed` 或 `watch` getter 内读取 props，使编译器能够保留读取关系。动态枚举和交给外部代码的数据应复制为显式快照。不要把一次性解构快照当成持续更新的状态。

详见[深入响应式系统](/guide/guide/extras/reactivity-in-depth)。
