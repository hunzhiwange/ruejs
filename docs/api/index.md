# API 参考 {#api-reference}

本部分包含 Rue 所有 API 的参考文档。

## 全局 API {#global-api}

### 应用创建 {#application-creation}

- [createApp()](/api/application#createapp)
- [createSSRApp()](/api/application#createssrapp)

### 通用 {#general}

- [version](/api/general#version)
- [nextTick()](/api/general#nexttick)
- [defineComponent()](/api/general#definecomponent)
- [defineAsyncComponent()](/api/general#defineasynccomponent)

## 组合式 API {#composition-api}

### 响应式：核心 {#reactivity-core}

- [ref()](/api/reactivity-core#ref)
- [computed()](/api/reactivity-core#computed)
- [reactive()](/api/reactivity-core#reactive)
- [readonly()](/api/reactivity-core#readonly)
- [watchEffect()](/api/reactivity-core#watcheffect)
- [watchPostEffect()](/api/reactivity-core#watchposteffect)
- [watchSyncEffect()](/api/reactivity-core#watchsynceffect)
- [watch()](/api/reactivity-core#watch)

### 响应式：工具 {#reactivity-utilities}

- [isRef()](/api/reactivity-utilities#isref)
- [unref()](/api/reactivity-utilities#unref)
- [toRef()](/api/reactivity-utilities#toref)
- [toValue()](/api/reactivity-utilities#tovalue)
- [toRefs()](/api/reactivity-utilities#torefs)
- [isProxy()](/api/reactivity-utilities#isproxy)
- [isReactive()](/api/reactivity-utilities#isreactive)
- [isReadonly()](/api/reactivity-utilities#isreadonly)

### 响应式：进阶 {#reactivity-advanced}

- [shallowRef()](/api/reactivity-advanced#shallowref)
- [triggerRef()](/api/reactivity-advanced#triggerref)
- [customRef()](/api/reactivity-advanced#customref)
- [shallowReactive()](/api/reactivity-advanced#shallowreactive)
- [shallowReadonly()](/api/reactivity-advanced#shallowreadonly)
- [toRaw()](/api/reactivity-advanced#toraw)
- [markRaw()](/api/reactivity-advanced#markraw)
- [effectScope()](/api/reactivity-advanced#effectscope)
- [getCurrentScope()](/api/reactivity-advanced#getcurrentscope)
- [onScopeDispose()](/api/reactivity-advanced#onscopedispose)

### 生命周期钩子 {#lifecycle-hooks}

- [onMounted()](/api/composition-api-lifecycle#onmounted)
- [onUpdated()](/api/composition-api-lifecycle#onupdated)
- [onUnmounted()](/api/composition-api-lifecycle#onunmounted)
- [onBeforeMount()](/api/composition-api-lifecycle#onbeforemount)
- [onBeforeUpdate()](/api/composition-api-lifecycle#onbeforeupdate)
- [onBeforeUnmount()](/api/composition-api-lifecycle#onbeforeunmount)
- [onErrorCaptured()](/api/composition-api-lifecycle#onerrorcaptured)
- [onRenderTracked()](/api/composition-api-lifecycle#onrendertracked)
- [onRenderTriggered()](/api/composition-api-lifecycle#onrendertriggered)
- [onActivated()](/api/composition-api-lifecycle#onactivated)
- [onDeactivated()](/api/composition-api-lifecycle#ondeactivated)
- [onServerPrefetch()](/api/composition-api-lifecycle#onserverprefetch)

## 选项式 API {#options-api}

### 状态选项 {#state-options}

- [data](/api/options-state#data)
- [props](/api/options-state#props)
- [computed](/api/options-state#computed)
- [methods](/api/options-state#methods)
- [watch](/api/options-state#watch)
- [emits](/api/options-state#emits)
- [expose](/api/options-state#expose)

### 渲染选项 {#rendering-options}

- [template](/api/options-rendering#template)
- [render](/api/options-rendering#render)
- [compilerOptions](/api/options-rendering#compileroptions)
- [slots](/api/options-rendering#slots)

### 生命周期钩子 {#options-lifecycle-hooks}

- [beforeCreate](/api/options-lifecycle#beforecreate)
- [created](/api/options-lifecycle#created)
- [beforeMount](/api/options-lifecycle#beforemount)
- [mounted](/api/options-lifecycle#mounted)
- [beforeUpdate](/api/options-lifecycle#beforeupdate)
- [updated](/api/options-lifecycle#updated)
- [beforeUnmount](/api/options-lifecycle#beforeunmount)
- [unmounted](/api/options-lifecycle#unmounted)
- [errorCaptured](/api/options-lifecycle#errorcaptured)
- [renderTracked](/api/options-lifecycle#rendertracked)
- [renderTriggered](/api/options-lifecycle#rendertriggered)
- [activated](/api/options-lifecycle#activated)
- [deactivated](/api/options-lifecycle#deactivated)
- [serverPrefetch](/api/options-lifecycle#serverprefetch)

### 组合选项 {#composition-options}

- [provide](/api/options-composition#provide)
- [inject](/api/options-composition#inject)
- [mixins](/api/options-composition#mixins)
- [extends](/api/options-composition#extends)

### 其他选项 {#misc-options}

- [name](/api/options-misc#name)
- [inheritAttrs](/api/options-misc#inheritattrs)
- [components](/api/options-misc#components)
- [directives](/api/options-misc#directives)

## 组件实例 {#component-instance}

- [$data](/api/component-instance#data)
- [$props](/api/component-instance#props)
- [$el](/api/component-instance#el)
- [$options](/api/component-instance#options)
- [$parent](/api/component-instance#parent)
- [$root](/api/component-instance#root)
- [$slots](/api/component-instance#slots)
- [$refs](/api/component-instance#refs)
- [$attrs](/api/component-instance#attrs)
- [$watch()](/api/component-instance#watch)
- [$emit()](/api/component-instance#emit)
- [$forceUpdate()](/api/component-instance#forceupdate)
- [$nextTick()](/api/component-instance#nexttick)

## 内置组件 {#built-in-components}

- [Transition](/api/built-in-components#transition)
- [TransitionGroup](/api/built-in-components#transitiongroup)
- [KeepAlive](/api/built-in-components#keepalive)
- [Teleport](/api/built-in-components#teleport)
- [Suspense](/api/built-in-components#suspense)

## 内置指令 {#built-in-directives}

- [v-text](/api/built-in-directives#v-text)
- [v-html](/api/built-in-directives#v-html)
- [v-show](/api/built-in-directives#v-show)
- [v-if](/api/built-in-directives#v-if)
- [v-else](/api/built-in-directives#v-else)
- [v-else-if](/api/built-in-directives#v-else-if)
- [v-for](/api/built-in-directives#v-for)
- [v-on](/api/built-in-directives#v-on)
- [v-bind](/api/built-in-directives#v-bind)
- [v-model](/api/built-in-directives#v-model)
- [v-slot](/api/built-in-directives#v-slot)
- [v-pre](/api/built-in-directives#v-pre)
- [v-once](/api/built-in-directives#v-once)
- [v-memo](/api/built-in-directives#v-memo)
- [v-cloak](/api/built-in-directives#v-cloak)

## 高级 API {#advanced-apis}

- [渲染函数](/api/render-function)
- [TypeScript 工具类型](/api/utility-types)
- [自定义渲染器](/api/custom-renderer)
- [自定义元素](/api/custom-elements)
