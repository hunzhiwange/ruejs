/*
运行时公共出口概述
- 统一导出 Rue 核心 API 与内置组件、reactivity 工具。
- 对 DOM/Vapor 运行时方法进行别名导出（带 _$ 前缀），便于编译产物按需引用。
- 保持与 @rue-js/runtime-vapor 的接口兼容性，便于替换底层实现。
*/
export * from './rue'

// 内置组件
export { Teleport, type TeleportProps } from './components/Teleport'
export { createTransitionRunner, type BaseTransitionProps } from './components/BaseTransition'
export * as TransitionUtils from './components/transitionUtils'

export {
  createComment as _$createComment,
  createTextNode as _$createTextNode,
  createElement as _$createElement,
  createTextWrapper as _$createTextWrapper,
  setStyle as _$setStyle,
  settextContent as _$settextContent,
  createDocumentFragment as _$createDocumentFragment,
  appendChild as _$appendChild,
} from './dom'

export {
  removeChild as _$removeChild,
  insertBefore as _$insertBefore,
  replaceChild as _$replaceChild,
  querySelector as _$querySelector,
  setAttribute as _$setAttribute,
  removeAttribute as _$removeAttribute,
  addEventListener as _$addEventListener,
  removeEventListener as _$removeEventListener,
  setClassName as _$setClassName,
  setInnerHTML as _$setInnerHTML,
  setValue as _$setValue,
  setChecked as _$setChecked,
  setDisabled as _$setDisabled,
  getTagName as _$getTagName,
} from './dom'
export type { VaporListItemRange } from './vapor-runtime'
export {
  vaporKeyedList as _$vaporKeyedList,
  vaporCreateVNode as _$vaporCreateVNode,
  vaporBindUseRef as _$vaporBindUseRef,
  vaporShowStyle as _$vaporShowStyle,
} from './vapor-runtime'
export { vaporWithHookId as _$vaporWithHookId } from '@rue-js/runtime-vapor'

export { Transition, type TransitionProps } from './components/Transition'
export { TransitionGroup, type TransitionGroupProps } from './components/TransitionGroup'

export * from './reactivity'

// Hooks
export { useApp } from './hooks/useApp'
export { useError } from './hooks/useError'
export { useComponent } from './hooks/useComponent'

// Vapor hooks passthrough
export { useMemo, useCallback, useSetup, useRef, toRaw, unref } from '@rue-js/runtime-vapor'
export { createRue, setReactiveScheduling } from '@rue-js/runtime-vapor'
