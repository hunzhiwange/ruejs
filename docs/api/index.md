# API 参考 {#api-reference}

本部分包含 Rue 所有 API 的参考文档。

## 全局 API {#global-api}

### 应用创建 {#application-creation}

- [useApp()](/api/api/application#useapp)

### 通用 {#general}

- [version](/api/api/general#version)
- [nextTick()](/api/api/general#nexttick)
- [useComponent()](/api/api/general#usecomponent)

### 组件实例 {#component-instance}

- [ComponentInstance](/api/api/component-instance#componentinstance)
- [getCurrentInstance()](/api/api/component-instance#getcurrentinstance)

## 组合式 API {#composition-api}

### 响应式：核心 {#reactivity-core}

- [signal()](/api/api/reactivity-core#signal)
- [ref()](/api/api/reactivity-core#ref)
- [computed()](/api/api/reactivity-core#computed)
- [watchEffect()](/api/api/reactivity-core#watcheffect)
- [watchPostEffect()](/api/api/reactivity-core#watchposteffect)
- [watchSyncEffect()](/api/api/reactivity-core#watchsynceffect)
- [watch()](/api/api/reactivity-core#watch)

### 响应式：工具 {#reactivity-utilities}

- [isRef()](/api/api/reactivity-utilities#isref)
- [unref()](/api/api/reactivity-utilities#unref)
- [toValue()](/api/api/reactivity-utilities#tovalue)

### 响应式：进阶 {#reactivity-advanced}

- [shallowRef()](/api/api/reactivity-advanced#shallowref)
- [triggerRef()](/api/api/reactivity-advanced#triggerref)
- [customRef()](/api/api/reactivity-advanced#customref)
- [effectScope()](/api/api/reactivity-advanced#effectscope)
- [getCurrentScope()](/api/api/reactivity-advanced#getcurrentscope)
- [onScopeDispose()](/api/api/reactivity-advanced#onscopedispose)

### 生命周期钩子 {#lifecycle-hooks}

- [onMounted()](/api/api/composition-api-lifecycle#onmounted)
- [onUpdated()](/api/api/composition-api-lifecycle#onupdated)
- [onUnmounted()](/api/api/composition-api-lifecycle#onunmounted)
- [onBeforeMount()](/api/api/composition-api-lifecycle#onbeforemount)
- [onBeforeUpdate()](/api/api/composition-api-lifecycle#onbeforeupdate)
- [onBeforeUnmount()](/api/api/composition-api-lifecycle#onbeforeunmount)
- [onErrorCaptured()](/api/api/composition-api-lifecycle#onerrorcaptured)
- [onRenderTracked()](/api/api/composition-api-lifecycle#onrendertracked)
- [onRenderTriggered()](/api/api/composition-api-lifecycle#onrendertriggered)
- [onActivated()](/api/api/composition-api-lifecycle#onactivated)
- [onDeactivated()](/api/api/composition-api-lifecycle#ondeactivated)
- [onServerPrefetch()](/api/api/composition-api-lifecycle#onserverprefetch)

## 内置组件 {#built-in-components}

- [Transition](/api/api/built-in-components#transition)
- [TransitionGroup](/api/api/built-in-components#transitiongroup)
- [KeepAlive](/api/api/built-in-components#keepalive)
- [Teleport](/api/api/built-in-components#teleport)
- [Suspense](/api/api/built-in-components#suspense)

## 内置指令 {#built-in-directives}

- [v-text](/api/api/built-in-directives#v-text)
- [v-html](/api/api/built-in-directives#v-html)
- [v-show](/api/api/built-in-directives#v-show)
- [v-if](/api/api/built-in-directives#v-if)
- [v-else](/api/api/built-in-directives#v-else)
- [v-else-if](/api/api/built-in-directives#v-else-if)
- [v-for](/api/api/built-in-directives#v-for)
- [v-on](/api/api/built-in-directives#v-on)
- [v-model](/api/api/built-in-directives#v-model)
- [v-slot](/api/api/built-in-directives#v-slot)
- [v-pre](/api/api/built-in-directives#v-pre)
- [v-once](/api/api/built-in-directives#v-once)
- [v-memo](/api/api/built-in-directives#v-memo)

## 高级 API {#advanced-apis}

- [渲染函数](/api/api/render-function)
- [自定义元素](/api/api/custom-elements)
