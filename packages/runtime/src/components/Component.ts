/*
Component 组件概述
- 使用场景：根据 is prop 在运行时切换原生标签或已注册组件。
- 解析策略：函数值直接视为组件；字符串优先查当前 runtime 的注册表，未命中时回退为原生标签名。
- 属性语义：除 is 外的其他 props 和 children 原样透传给最终解析结果。
*/

import type { ComponentInstance, ComponentProps, FC, PropsWithChildren } from '../runtime-types'
import { withParentContextProps } from '../context'
import { _$createComponent } from '../compiled-component-call'
import { _$compiledBranch } from '../compiled-component'

/** <Component> 动态组件属性。 */
export interface DynamicComponentProps extends PropsWithChildren<Record<string, unknown>> {
  /** 目标标签名、已注册组件名或组件函数。 */
  is?: string | ComponentInstance<any> | null
  /** 可供严格编译器枚举、同时兼容普通运行时解析的局部组件注册表。 */
  registry?: Record<string, ComponentInstance<any> | null | undefined>
}

const BUILTIN_COMPONENT_TAG = 'component'

const resolveDynamicComponentType = (
  value: DynamicComponentProps['is'],
  registry: DynamicComponentProps['registry'],
) => {
  if (value == null) {
    return null
  }

  if (typeof value !== 'string') {
    return value
  }

  return registry?.[value] ?? value
}

type ForwardedComponentInput = {
  forwardedProps: ComponentProps
}

const splitForwardedProps = (props: DynamicComponentProps): ForwardedComponentInput => {
  const forwardedProps: ComponentProps = {}
  for (const [key, value] of Object.entries(props)) {
    if (key === 'is' || key === 'registry') {
      continue
    }
    if (key === '__rue_context_parent_instance__') {
      continue
    }
    if (key === 'children') {
      forwardedProps.children = value as ComponentProps['children']
      continue
    }
    forwardedProps[key] = value
  }

  return {
    forwardedProps,
  }
}

/** 根据 is 属性动态渲染原生标签或已注册组件。 */
export const Component: FC<DynamicComponentProps> = props => {
  return _$compiledBranch(() => {
    const resolvedType = resolveDynamicComponentType(props.is, props.registry)
    if (!resolvedType || resolvedType === BUILTIN_COMPONENT_TAG || resolvedType === Component) {
      return {
        __rue_compiled_branch_key: null,
        create: () => {
          throw new Error('[rue] dynamic components must be enumerated by the Rue compiler')
        },
      }
    }
    return {
      __rue_compiled_branch_key: resolvedType,
      create: () =>
        _$createComponent(resolvedType as any, () => {
          const { forwardedProps } = splitForwardedProps(props)
          return withParentContextProps(resolvedType as any, forwardedProps) as ComponentProps
        }),
    }
  }) as any
}
