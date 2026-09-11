/*
Swap 组件概述
- 保留 Rue 当前 swap 视觉类与 compound 结构。
- 同时支持两类用法：手动放入 checkbox 的原始模式，以及通过 checked/defaultChecked 等 props 驱动的增强模式。
- 增强模式补齐 disabled、indeterminate、默认三态与变更回调，适合直接在业务里使用。
*/
import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'

/** SwapEffect 类型。 */
export type SwapEffect = 'rotate' | 'flip'

/** SwapChangeMeta 接口。 */
export interface SwapChangeMeta {
  /** 受控选中状态。 */
  checked: boolean
  /** indeterminate 配置项。 */
  indeterminate: boolean
  /** 是否处于激活态。 */
  active: boolean
  /** mode 配置项。 */
  mode: 'input' | 'class'
}

/** SwapProps 组件属性。 */
export interface SwapProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 是否处于激活态。 */
  active?: boolean
  /** 受控选中状态。 */
  checked?: boolean
  /** 非受控初始选中状态。 */
  defaultChecked?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** indeterminate 配置项。 */
  indeterminate?: boolean
  /** defaultIndeterminate 配置项。 */
  defaultIndeterminate?: boolean
  /** rotate 配置项。 */
  rotate?: boolean
  /** flip 配置项。 */
  flip?: boolean
  /** effect 配置项。 */
  effect?: SwapEffect
  /** 根节点附加类名。 */
  className?: string
  /** inputClassName 附加类名。 */
  inputClassName?: string
  /** inputProps 透传属性。 */
  inputProps?: Record<string, any>
  /** 组件子内容。 */
  children?: any
  /** 值或状态变化时触发的回调。 */
  onChange?: (event: Event, meta: SwapChangeMeta) => void
  /** onCheckedChange 事件回调。 */
  onCheckedChange?: (checked: boolean, event: Event) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** SwapPartProps 组件属性。 */
export interface SwapPartProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) =>
  className ? `${base} ${className}` : base

/** 构建 Root Class Name 的内部工具函数。 */
const buildRootClassName = (
  active?: boolean,
  rotate?: boolean,
  flip?: boolean,
  effect?: SwapEffect,
  disabled?: boolean,
  className?: string,
) => {
  let cls = 'swap'
  if (active) cls += ' swap-active'
  if (rotate || effect === 'rotate') cls += ' swap-rotate'
  if (flip || effect === 'flip') cls += ' swap-flip'
  if (disabled) cls += ' cursor-not-allowed opacity-60'
  if (className) cls += ` ${className}`
  return cls
}

/** Swap Root 的内部工具函数。 */
const SwapRoot: FC<SwapProps> = ({
  as = 'label',
  active,
  checked,
  defaultChecked,
  disabled,
  indeterminate,
  defaultIndeterminate,
  rotate,
  flip,
  effect,
  className,
  inputClassName,
  inputProps,
  children,
  onChange,
  onCheckedChange,
  ...rest
}) => {
  const uncontrolledIndeterminate = ref(!!defaultIndeterminate)
  const shouldRenderAutoInput =
    typeof checked === 'boolean' ||
    typeof defaultChecked === 'boolean' ||
    typeof disabled === 'boolean' ||
    typeof indeterminate === 'boolean' ||
    typeof defaultIndeterminate === 'boolean' ||
    !!inputClassName ||
    !!inputProps ||
    !!onChange ||
    !!onCheckedChange
  const mode: SwapChangeMeta['mode'] = shouldRenderAutoInput ? 'input' : 'class'
  const Component = as as any
  const isControlledChecked = typeof checked === 'boolean'
  const isIndeterminate =
    typeof indeterminate === 'boolean' ? indeterminate : uncontrolledIndeterminate.value
  const inputAriaChecked = isIndeterminate ? 'mixed' : inputProps?.['aria-checked']
  const applyIndeterminate = (element: HTMLInputElement | null, value: boolean) => {
    if (element) element.indeterminate = value
  }

  const handleChange = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    const nextChecked = target?.checked === true
    const nextIndeterminate = typeof indeterminate === 'boolean' ? indeterminate : false

    if (typeof indeterminate !== 'boolean') {
      uncontrolledIndeterminate.value = false
    }

    if (target) {
      if (isControlledChecked) target.checked = checked
      target.indeterminate = nextIndeterminate
    }

    if (onChange) {
      onChange(event, {
        checked: nextChecked,
        indeterminate: nextIndeterminate,
        active: !!active || nextChecked,
        mode,
      })
    }
    if (onCheckedChange) {
      onCheckedChange(nextChecked, event)
    }
  }

  return Component === 'div' ? (
    <div
      {...rest}
      className={buildRootClassName(active, rotate, flip, effect, disabled, className)}
      aria-disabled={disabled ? 'true' : rest['aria-disabled']}
      data-rue-swap-root="true"
      data-rue-swap-mode={mode}
      data-rue-swap-disabled={disabled ? 'true' : 'false'}
    >
      {shouldRenderAutoInput && isControlledChecked ? (
        <input
          {...inputProps}
          ref={(element: HTMLInputElement | null) => applyIndeterminate(element, isIndeterminate)}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          autoComplete={inputProps?.autoComplete ?? 'off'}
          className={inputClassName}
          aria-checked={inputAriaChecked}
          data-rue-swap-input="true"
          onChange={handleChange}
        />
      ) : shouldRenderAutoInput ? (
        <input
          {...inputProps}
          ref={(element: HTMLInputElement | null) => applyIndeterminate(element, isIndeterminate)}
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          autoComplete={inputProps?.autoComplete ?? 'off'}
          className={inputClassName}
          aria-checked={inputAriaChecked}
          data-rue-swap-input="true"
          onChange={handleChange}
        />
      ) : null}
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={buildRootClassName(active, rotate, flip, effect, disabled, className)}
      aria-disabled={disabled ? 'true' : rest['aria-disabled']}
      data-rue-swap-root="true"
      data-rue-swap-mode={mode}
      data-rue-swap-disabled={disabled ? 'true' : 'false'}
    >
      {shouldRenderAutoInput && isControlledChecked ? (
        <input
          {...inputProps}
          ref={(element: HTMLInputElement | null) => applyIndeterminate(element, isIndeterminate)}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          autoComplete={inputProps?.autoComplete ?? 'off'}
          className={inputClassName}
          aria-checked={inputAriaChecked}
          data-rue-swap-input="true"
          onChange={handleChange}
        />
      ) : shouldRenderAutoInput ? (
        <input
          {...inputProps}
          ref={(element: HTMLInputElement | null) => applyIndeterminate(element, isIndeterminate)}
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          autoComplete={inputProps?.autoComplete ?? 'off'}
          className={inputClassName}
          aria-checked={inputAriaChecked}
          data-rue-swap-input="true"
          onChange={handleChange}
        />
      ) : null}
      {children}
    </span>
  ) : Component === 'label' ? (
    <label
      {...rest}
      className={buildRootClassName(active, rotate, flip, effect, disabled, className)}
      aria-disabled={disabled ? 'true' : rest['aria-disabled']}
      data-rue-swap-root="true"
      data-rue-swap-mode={mode}
      data-rue-swap-disabled={disabled ? 'true' : 'false'}
    >
      {shouldRenderAutoInput && isControlledChecked ? (
        <input
          {...inputProps}
          ref={(element: HTMLInputElement | null) => applyIndeterminate(element, isIndeterminate)}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          autoComplete={inputProps?.autoComplete ?? 'off'}
          className={inputClassName}
          aria-checked={inputAriaChecked}
          data-rue-swap-input="true"
          onChange={handleChange}
        />
      ) : shouldRenderAutoInput ? (
        <input
          {...inputProps}
          ref={(element: HTMLInputElement | null) => applyIndeterminate(element, isIndeterminate)}
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          autoComplete={inputProps?.autoComplete ?? 'off'}
          className={inputClassName}
          aria-checked={inputAriaChecked}
          data-rue-swap-input="true"
          onChange={handleChange}
        />
      ) : null}
      {children}
    </label>
  ) : (
    <></>
  )
}

/** On 的内部工具函数。 */
const On: FC<SwapPartProps> = ({ as = 'div', className, children, ...rest }) => {
  const Component = as as any
  return Component === 'div' ? (
    <div {...rest} className={mergeClassName('swap-on', className)}>
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={mergeClassName('swap-on', className)}>
      {children}
    </span>
  ) : Component === 'label' ? (
    <label {...rest} className={mergeClassName('swap-on', className)}>
      {children}
    </label>
  ) : (
    <></>
  )
}

/** Off 的内部工具函数。 */
const Off: FC<SwapPartProps> = ({ as = 'div', className, children, ...rest }) => {
  const Component = as as any
  return Component === 'div' ? (
    <div {...rest} className={mergeClassName('swap-off', className)}>
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={mergeClassName('swap-off', className)}>
      {children}
    </span>
  ) : Component === 'label' ? (
    <label {...rest} className={mergeClassName('swap-off', className)}>
      {children}
    </label>
  ) : (
    <></>
  )
}

/** Indeterminate 的内部工具函数。 */
const Indeterminate: FC<SwapPartProps> = ({ as = 'div', className, children, ...rest }) => {
  const Component = as as any
  return Component === 'div' ? (
    <div {...rest} className={mergeClassName('swap-indeterminate', className)}>
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={mergeClassName('swap-indeterminate', className)}>
      {children}
    </span>
  ) : Component === 'label' ? (
    <label {...rest} className={mergeClassName('swap-indeterminate', className)}>
      {children}
    </label>
  ) : (
    <></>
  )
}

type SwapCompound = FC<SwapProps> & {
  On: FC<SwapPartProps>
  Off: FC<SwapPartProps>
  Indeterminate: FC<SwapPartProps>
}

const SwapCompound: SwapCompound = /*#__PURE__*/ Object.assign(SwapRoot, {
  On,
  Off,
  Indeterminate,
})

/** 默认导出切换组件。 */
export default SwapCompound
