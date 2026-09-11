/*
Toggle 组件概述
- 保留 Rue 当前的 toggle 视觉类，同时补齐 Switch 常见的受控/非受控、loading、状态文案能力。
- 当传入 checkedChildren / unCheckedChildren 或 children 时，组件会自动包一层语义容器，便于构建设置项一类的场景。
- `value` 与 `defaultValue` 在传入 boolean 时分别作为 `checked` 与 `defaultChecked` 的别名；传入 string / number 时仍保留原生 input 值语义。
*/
import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'

/** ToggleColor 语义色类型。 */
export type ToggleColor =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'info'
  | 'error'

/** ToggleSize 尺寸类型。 */
export type ToggleSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'default' | 'medium'

/** ToggleValue 值类型。 */
export type ToggleValue = boolean | string | number

/** ToggleProps 组件属性。 */
export interface ToggleProps {
  /** 组件语义色。 */
  color?: ToggleColor
  /** 组件尺寸。 */
  size?: ToggleSize
  /** 受控选中状态。 */
  checked?: boolean
  /** 非受控初始选中状态。 */
  defaultChecked?: boolean
  /** 受控值。 */
  value?: ToggleValue
  /** 非受控初始值。 */
  defaultValue?: ToggleValue
  /** checkedChildren 配置项。 */
  checkedChildren?: any
  /** unCheckedChildren 配置项。 */
  unCheckedChildren?: any
  /** 是否展示加载态。 */
  loading?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点附加类名。 */
  rootClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** stateClassName 附加类名。 */
  stateClassName?: string
  /** 根节点内联样式。 */
  style?: any
  /** 根节点内联样式。 */
  rootStyle?: any
  /** 组件子内容。 */
  children?: any
  /** 值或状态变化时触发的回调。 */
  onChange?: (checked: boolean, event: Event) => void
  /** onCheckedChange 事件回调。 */
  onCheckedChange?: (checked: boolean, event: Event) => void
  /** 点击时触发的回调。 */
  onClick?: (checked: boolean, event: Event) => void
  /** onNativeChange 事件回调。 */
  onNativeChange?: (event: Event) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: ToggleSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'default':
    case 'medium':
      return 'md'
    default:
      return size
  }
}

/** 解析 Loading Size Class 的内部工具函数。 */
const resolveLoadingSizeClass = (size?: ToggleSize) => {
  switch (resolveSizeClass(size)) {
    case 'xs':
    case 'sm':
      return 'loading-xs'
    case 'lg':
      return 'loading-md'
    case 'xl':
      return 'loading-lg'
    default:
      return 'loading-sm'
  }
}

/** 解析 Controlled Checked 的内部工具函数。 */
const resolveControlledChecked = (checked?: boolean, value?: ToggleValue) => {
  if (typeof checked === 'boolean') return checked
  if (typeof value === 'boolean') return value
  return undefined
}

/** 解析 Default Checked 的内部工具函数。 */
const resolveDefaultChecked = (
  defaultChecked?: boolean,
  defaultValue?: ToggleValue,
  fallback = false,
) => {
  if (typeof defaultChecked === 'boolean') return defaultChecked
  if (typeof defaultValue === 'boolean') return defaultValue
  return fallback
}

/** 解析 Native Value 的内部工具函数。 */
const resolveNativeValue = (value?: ToggleValue) => {
  return typeof value === 'boolean' ? undefined : value
}

/** 解析 Native Default Value 的内部工具函数。 */
const resolveNativeDefaultValue = (defaultValue?: ToggleValue) => {
  return typeof defaultValue === 'boolean' ? undefined : defaultValue
}

/** 构建 Input Class Name 的内部工具函数。 */
const buildInputClassName = (color?: ToggleColor, size?: ToggleSize, className?: string) => {
  let cls = 'toggle'
  if (color) cls += ` toggle-${color}`
  const resolvedSize = resolveSizeClass(size)
  if (resolvedSize) cls += ` toggle-${resolvedSize}`
  if (className) cls += ` ${className}`
  return cls
}

/** 构建 Root Class Name 的内部工具函数。 */
const buildRootClassName = (disabled?: boolean, rootClassName?: string) => {
  let cls = 'inline-flex max-w-full items-start gap-3 align-top text-base-content'
  if (disabled) cls += ' cursor-not-allowed opacity-65'
  else cls += ' cursor-pointer'
  if (rootClassName) cls += ` ${rootClassName}`
  return cls
}

/** 构建 Content Class Name 的内部工具函数。 */
const buildContentClassName = (contentClassName?: string) => {
  return appendClassName('flex min-w-0 flex-col gap-1 pt-0.5', contentClassName)
}

/** 构建 State Class Name 的内部工具函数。 */
const buildStateClassName = (stateClassName?: string) => {
  return appendClassName(
    'inline-flex items-center gap-2 text-xs text-base-content/60',
    stateClassName,
  )
}

/** Toggle 的内部工具函数。 */
const Toggle: FC<ToggleProps> = ({
  color,
  size,
  checked,
  defaultChecked,
  value,
  defaultValue,
  checkedChildren,
  unCheckedChildren,
  loading,
  disabled,
  className,
  rootClassName,
  contentClassName,
  stateClassName,
  style,
  rootStyle,
  children,
  onChange,
  onCheckedChange,
  onClick,
  onNativeChange,
  ...rest
}) => {
  const readControlledChecked = () => resolveControlledChecked(checked, value)
  const readChecked = () => readControlledChecked() ?? uncontrolledChecked.value
  const uncontrolledChecked = ref(
    resolveDefaultChecked(defaultChecked, defaultValue, readControlledChecked() ?? false),
  )
  const mergedDisabled = !!disabled || !!loading
  const hasStateSlot = checkedChildren != null || unCheckedChildren != null
  const needsWrapper =
    !!loading ||
    children != null ||
    hasStateSlot ||
    !!rootClassName ||
    !!rootStyle ||
    !!contentClassName ||
    !!stateClassName

  const handleClick = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    onClick?.(target?.checked === true, event)
  }

  const handleChange = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    const nextChecked = target?.checked === true
    const controlledChecked = readControlledChecked()

    if (controlledChecked === undefined) {
      uncontrolledChecked.value = nextChecked
    } else if (target) {
      target.checked = controlledChecked
    }

    onNativeChange?.(event)
    onChange?.(nextChecked, event)
    onCheckedChange?.(nextChecked, event)
  }

  const InputNodeView = () => (
    <input
      {...rest}
      type="checkbox"
      checked={readChecked()}
      defaultChecked={resolveDefaultChecked(defaultChecked, defaultValue, readChecked())}
      value={resolveNativeValue(value) as any}
      defaultValue={resolveNativeDefaultValue(defaultValue) as any}
      disabled={mergedDisabled}
      style={style}
      autoComplete={rest.autoComplete ?? 'off'}
      className={buildInputClassName(color, size, className)}
      aria-busy={loading ? 'true' : undefined}
      data-rue-toggle-input="true"
      onClick={handleClick}
      onChange={handleChange}
    />
  )

  if (!needsWrapper) {
    return <InputNodeView />
  }

  const SwitchNodeView = () => (
    <span className="relative inline-flex shrink-0 items-center justify-center">
      <InputNodeView />
      {loading ? (
        <span className="pointer-events-none absolute inset-0 inline-flex items-center justify-center text-base-content/70">
          <span className={`loading loading-spinner ${resolveLoadingSizeClass(size)}`.trim()} />
        </span>
      ) : null}
    </span>
  )

  if (children == null && !hasStateSlot) {
    return (
      <span
        className={appendClassName('inline-flex align-middle', rootClassName)}
        style={rootStyle}
      >
        <SwitchNodeView />
      </span>
    )
  }

  return (
    <label className={buildRootClassName(mergedDisabled, rootClassName)} style={rootStyle}>
      <SwitchNodeView />
      <span className={buildContentClassName(contentClassName)}>
        {children != null ? (
          <span className="text-sm font-medium text-base-content">{children}</span>
        ) : null}
        {hasStateSlot ? (
          <span className={buildStateClassName(stateClassName)}>
            <span className="swap pointer-events-none min-h-0 min-w-0">
              <input
                type="checkbox"
                checked={readChecked()}
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
              />
              <span className="swap-on inline-flex items-center gap-2">{checkedChildren}</span>
              <span className="swap-off inline-flex items-center gap-2">{unCheckedChildren}</span>
            </span>
          </span>
        ) : null}
      </span>
    </label>
  )
}

/** 默认导出开关组件。 */
export default Toggle
