/*
Radio 组件概述
- 保留 Rue 当前 radio 视觉类，同时补齐受控/非受控、标签包装、Radio.Group、Radio.Button 与 options 配置能力。
- Group 优先通过 JSX props 管理 options 配置写法，并用 callback ref 兼容 children 直出。
*/
import type { FC } from '@rue-js/rue'
import { ref, useSetup, watchEffect } from '@rue-js/rue'

/** RadioColor 语义色类型。 */
export type RadioColor =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'info'
  | 'error'

/** RadioSize 尺寸类型。 */
export type RadioSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'middle' | 'large'
/** RadioValue 值类型。 */
export type RadioValue = string | number | boolean
/** RadioOptionType 视觉或语义变体类型。 */
export type RadioOptionType = 'default' | 'button'
/** RadioButtonStyle 样式值类型。 */
export type RadioButtonStyle = 'outline' | 'solid'
/** RadioOrientation 类型。 */
export type RadioOrientation = 'horizontal' | 'vertical'

const RADIO_COLOR_CLASS_NAMES: Record<RadioColor, string> = {
  neutral: 'radio-neutral',
  primary: 'radio-primary',
  secondary: 'radio-secondary',
  accent: 'radio-accent',
  success: 'radio-success',
  warning: 'radio-warning',
  info: 'radio-info',
  error: 'radio-error',
}

/** RadioChangeMeta 接口。 */
export interface RadioChangeMeta {
  /** 受控选中状态。 */
  checked: boolean
  /** 受控值。 */
  value?: RadioValue
  /** optionType 配置项。 */
  optionType: RadioOptionType
}

/** RadioProps 组件属性。 */
export interface RadioProps {
  /** 组件语义色。 */
  color?: RadioColor
  /** 组件尺寸。 */
  size?: RadioSize
  /** 受控选中状态。 */
  checked?: boolean
  /** 非受控初始选中状态。 */
  defaultChecked?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 受控值。 */
  value?: RadioValue
  /** 根节点附加类名。 */
  className?: string
  /** 根节点附加类名。 */
  rootClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** 根节点内联样式。 */
  style?: any
  /** 根节点内联样式。 */
  rootStyle?: any
  /** 组件子内容。 */
  children?: any
  /** 标题内容。 */
  title?: string
  /** 元素或数据项标识。 */
  id?: string
  /** 表单 name 属性或分组名称。 */
  name?: string
  /** optionType 配置项。 */
  optionType?: RadioOptionType
  /** buttonStyle 内联样式。 */
  buttonStyle?: RadioButtonStyle
  /** block 配置项。 */
  block?: boolean
  /** 值或状态变化时触发的回调。 */
  onChange?: (event: Event, meta: RadioChangeMeta) => void
  /** onCheckedChange 事件回调。 */
  onCheckedChange?: (checked: boolean, event: Event) => void
  /** Group 内部受控值。 */
  __rueRadioGroupValue?: RadioValue
  /** Group 内部禁用态。 */
  __rueRadioGroupDisabled?: boolean
  /** Group 内部是否为受控模式。 */
  __rueRadioGroupControlled?: boolean
  /** Group 内部变更回调。 */
  __rueRadioGroupOnChange?: (
    value: RadioValue | undefined,
    event: Event,
    option?: RadioOption,
  ) => void
  /** Group 内部选项数据。 */
  __rueRadioOption?: RadioOption
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** RadioOption 选项配置。 */
export interface RadioOption {
  /** 展示标签。 */
  label: any
  /** 受控值。 */
  value: RadioValue
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 标题内容。 */
  title?: string
  /** 元素或数据项标识。 */
  id?: string
  /** required 配置项。 */
  required?: boolean
  /** 组件语义色。 */
  color?: RadioColor
  /** 组件尺寸。 */
  size?: RadioSize
  /** 值或状态变化时触发的回调。 */
  onChange?: (event: Event, meta: RadioChangeMeta) => void
}

/** RadioGroupChangeMeta 接口。 */
export interface RadioGroupChangeMeta extends RadioChangeMeta {
  /** previousValue 值。 */
  previousValue?: RadioValue
  /** option 配置项。 */
  option?: RadioOption
}

/** RadioGroupProps 组件属性。 */
export interface RadioGroupProps {
  /** 受控值。 */
  value?: RadioValue
  /** 非受控初始值。 */
  defaultValue?: RadioValue
  /** 可选项数据。 */
  options?: ReadonlyArray<RadioOption | RadioValue>
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 表单 name 属性或分组名称。 */
  name?: string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** optionType 配置项。 */
  optionType?: RadioOptionType
  /** buttonStyle 内联样式。 */
  buttonStyle?: RadioButtonStyle
  /** 组件尺寸。 */
  size?: RadioSize
  /** 组件语义色。 */
  color?: RadioColor
  /** block 配置项。 */
  block?: boolean
  /** orientation 配置项。 */
  orientation?: RadioOrientation
  /** vertical 配置项。 */
  vertical?: boolean
  /** 值或状态变化时触发的回调。 */
  onChange?: (value: RadioValue | undefined, event: Event, meta: RadioGroupChangeMeta) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedRadioOption extends RadioOption {}

let radioGroupNameSeed = 0

const RADIO_GROUP_CHANGE_HANDLED = '__rueRadioGroupChangeHandled'

/** append Class Name 的内部工具函数。 */
const appendClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 解析 Size Token 的内部工具函数。 */
const resolveSizeToken = (size?: RadioSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'medium':
    case 'middle':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** 构建 Input Class Name 的内部工具函数。 */
const buildInputClassName = (color?: RadioColor, size?: RadioSize, className?: string) => {
  let cls = 'radio'
  const resolvedSize = resolveSizeToken(size)

  if (color) cls += ` ${RADIO_COLOR_CLASS_NAMES[color]}`
  if (resolvedSize) cls += ` radio-${resolvedSize}`
  if (className) cls += ` ${className}`

  return cls
}

/** 构建 Default Root Class Name 的内部工具函数。 */
const buildDefaultRootClassName = (disabled?: boolean, rootClassName?: string, block?: boolean) => {
  let cls = 'inline-flex items-start gap-3 text-sm leading-5 text-base-content'

  if (block) cls += ' w-full'
  if (disabled) cls += ' cursor-not-allowed opacity-60'
  else cls += ' cursor-pointer'
  if (rootClassName) cls += ` ${rootClassName}`

  return cls
}

/** 构建 Button Root Class Name 的内部工具函数。 */
const buildButtonRootClassName = (disabled?: boolean, rootClassName?: string, block?: boolean) => {
  let cls = 'inline-flex'

  if (block) cls += ' w-full'
  if (disabled) cls += ' cursor-not-allowed opacity-60'
  else cls += ' cursor-pointer'
  if (rootClassName) cls += ` ${rootClassName}`

  return cls
}

/** 构建 Content Class Name 的内部工具函数。 */
const buildContentClassName = (contentClassName?: string) => {
  return appendClassName('min-w-0 flex-1', contentClassName)
}

/** 解析 Button Size Class 的内部工具函数。 */
const resolveButtonSizeClass = (size?: RadioSize) => {
  switch (resolveSizeToken(size)) {
    case 'xs':
      return 'btn-xs'
    case 'sm':
      return 'btn-sm'
    case 'lg':
      return 'btn-lg'
    case 'xl':
      return 'btn-xl'
    default:
      return 'btn-md'
  }
}

/** 解析 Outline Selected Classes 的内部工具函数。 */
const resolveOutlineSelectedClasses = (color?: RadioColor) => {
  switch (color ?? 'primary') {
    case 'neutral':
      return 'peer-checked:border-neutral peer-checked:bg-neutral/10 peer-checked:text-neutral'
    case 'secondary':
      return 'peer-checked:border-secondary peer-checked:bg-secondary/10 peer-checked:text-secondary'
    case 'accent':
      return 'peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-accent'
    case 'success':
      return 'peer-checked:border-success peer-checked:bg-success/10 peer-checked:text-success'
    case 'warning':
      return 'peer-checked:border-warning peer-checked:bg-warning/10 peer-checked:text-warning'
    case 'info':
      return 'peer-checked:border-info peer-checked:bg-info/10 peer-checked:text-info'
    case 'error':
      return 'peer-checked:border-error peer-checked:bg-error/10 peer-checked:text-error'
    default:
      return 'peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary'
  }
}

/** 解析 Solid Selected Classes 的内部工具函数。 */
const resolveSolidSelectedClasses = (color?: RadioColor) => {
  switch (color ?? 'primary') {
    case 'neutral':
      return 'peer-checked:border-neutral peer-checked:bg-neutral peer-checked:text-neutral-content'
    case 'secondary':
      return 'peer-checked:border-secondary peer-checked:bg-secondary peer-checked:text-secondary-content'
    case 'accent':
      return 'peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-content'
    case 'success':
      return 'peer-checked:border-success peer-checked:bg-success peer-checked:text-success-content'
    case 'warning':
      return 'peer-checked:border-warning peer-checked:bg-warning peer-checked:text-warning-content'
    case 'info':
      return 'peer-checked:border-info peer-checked:bg-info peer-checked:text-info-content'
    case 'error':
      return 'peer-checked:border-error peer-checked:bg-error peer-checked:text-error-content'
    default:
      return 'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-content'
  }
}

/** 构建 Button Surface Class Name 的内部工具函数。 */
const buildButtonSurfaceClassName = ({
  color,
  size,
  buttonStyle,
  className,
  block,
}: {
  color?: RadioColor
  size?: RadioSize
  buttonStyle?: RadioButtonStyle
  className?: string
  block?: boolean
}) => {
  let cls =
    'btn min-h-0 border-base-300 bg-base-100 text-base-content shadow-none transition-colors duration-200 peer-disabled:pointer-events-none peer-disabled:opacity-60 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary/20 peer-checked:shadow-sm'

  cls += ` ${resolveButtonSizeClass(size)}`
  cls += block ? ' w-full justify-center' : ' justify-center'

  if (buttonStyle === 'solid') {
    cls += ' hover:bg-base-200'
    cls += ` ${resolveSolidSelectedClasses(color)}`
  } else {
    cls += ' btn-outline hover:bg-base-200'
    cls += ` ${resolveOutlineSelectedClasses(color)}`
  }

  if (className) cls += ` ${className}`

  return cls
}

/** 解析 Group Class Name 的内部工具函数。 */
const resolveGroupClassName = ({
  optionType,
  orientation,
  className,
  block,
}: {
  optionType: RadioOptionType
  orientation: RadioOrientation
  className?: string
  block?: boolean
}) => {
  let cls =
    optionType === 'button'
      ? orientation === 'vertical'
        ? 'flex flex-col gap-2'
        : 'flex flex-wrap items-start gap-2'
      : orientation === 'vertical'
        ? 'flex flex-col gap-3'
        : 'flex flex-wrap items-center gap-4'

  if (block) cls += ' w-full'
  if (className) cls += ` ${className}`

  return cls
}

/** serialize Value 的内部工具函数。 */
const serializeValue = (value: RadioValue) => {
  switch (typeof value) {
    case 'number':
      return `number:${value}`
    case 'boolean':
      return `boolean:${value ? 'true' : 'false'}`
    default:
      return `string:${value}`
  }
}

/** deserialize Value 的内部工具函数。 */
const deserializeValue = (serialized?: string): RadioValue | undefined => {
  if (!serialized) return undefined

  const separatorIndex = serialized.indexOf(':')
  if (separatorIndex === -1) return serialized

  const type = serialized.slice(0, separatorIndex)
  const rawValue = serialized.slice(separatorIndex + 1)

  if (type === 'number') return Number(rawValue)
  if (type === 'boolean') return rawValue === 'true'

  return rawValue
}

/** 归一化 Options 的内部工具函数。 */
const normalizeOptions = (options?: ReadonlyArray<RadioOption | RadioValue>) => {
  return (options ?? []).map<NormalizedRadioOption>(option => {
    if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
      return {
        label: String(option),
        value: option,
      }
    }

    return option
  })
}

/** 解析 Orientation 的内部工具函数。 */
const resolveOrientation = (
  orientation?: RadioOrientation,
  vertical?: boolean,
): RadioOrientation => {
  return orientation ?? (vertical ? 'vertical' : 'horizontal')
}

/** 判断 Renderable Node 的内部工具函数。 */

/** 判断组件类型是否匹配的内部工具函数。 */

type RadioGroupInjectedProps = Pick<
  RadioProps,
  | '__rueRadioGroupValue'
  | '__rueRadioGroupDisabled'
  | '__rueRadioGroupControlled'
  | '__rueRadioGroupOnChange'
  | 'name'
  | 'optionType'
  | 'buttonStyle'
  | 'size'
  | 'color'
  | 'block'
>

/** Radio Root 的内部工具函数。 */
const RadioRoot: FC<RadioProps> = ({
  color,
  size,
  checked,
  defaultChecked,
  disabled,
  value,
  className,
  rootClassName,
  contentClassName,
  style,
  rootStyle,
  children,
  title,
  id,
  name,
  optionType,
  buttonStyle,
  block,
  onChange,
  onCheckedChange,
  __rueRadioGroupValue,
  __rueRadioGroupDisabled,
  __rueRadioGroupControlled,
  __rueRadioGroupOnChange,
  __rueRadioOption,
  ...rest
}) => {
  const uncontrolledChecked = ref(checked ?? !!defaultChecked)
  const readGroupChecked = () =>
    __rueRadioGroupOnChange && value !== undefined ? __rueRadioGroupValue === value : undefined
  const readControlledChecked = () => {
    if (typeof checked === 'boolean') return checked
    return readGroupChecked()
  }
  const readChecked = () => readControlledChecked() ?? uncontrolledChecked.value
  const mergedOptionType = optionType ?? 'default'
  const mergedButtonStyle = buttonStyle ?? 'outline'
  const mergedSize = size
  const mergedColor = color
  const mergedBlock = block ?? false
  const mergedDisabled = !!(disabled || __rueRadioGroupDisabled)
  const mergedName = name
  const isButton = mergedOptionType === 'button'

  const handleChange = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    const nextChecked = target?.checked === true
    const controlledChecked = readControlledChecked()

    if (__rueRadioGroupOnChange && nextChecked) {
      ;(event as unknown as Record<string, boolean>)[RADIO_GROUP_CHANGE_HANDLED] = true
      __rueRadioGroupOnChange(value, event, __rueRadioOption)
    } else if (controlledChecked === undefined) {
      uncontrolledChecked.value = nextChecked
    }

    if (onChange) {
      onChange(event, {
        checked: nextChecked,
        value,
        optionType: mergedOptionType,
      })
    }

    if (onCheckedChange) {
      onCheckedChange(nextChecked, event)
    }

    const resolvedChecked = readControlledChecked()
    if (
      resolvedChecked !== undefined &&
      target &&
      (!__rueRadioGroupOnChange || __rueRadioGroupControlled)
    ) {
      target.checked = resolvedChecked
    }
  }

  if (isButton) {
    const buttonLabel = children ?? (value !== undefined ? String(value) : null)

    return (
      <label
        className={buildButtonRootClassName(mergedDisabled, rootClassName, mergedBlock)}
        style={rootStyle}
        title={title}
        data-rue-radio-root="true"
        data-rue-radio-option-type="button"
      >
        <input
          {...rest}
          id={id}
          name={mergedName}
          title={title}
          type="radio"
          value={value as any}
          checked={readChecked()}
          defaultChecked={defaultChecked ?? readChecked()}
          disabled={mergedDisabled}
          className="peer sr-only"
          data-rue-radio-input="true"
          data-rue-radio-disabled={mergedDisabled ? 'true' : 'false'}
          data-rue-radio-option-type={mergedOptionType}
          data-rue-radio-value={value !== undefined ? serializeValue(value) : undefined}
          onChange={handleChange}
        />
        <span
          className={buildButtonSurfaceClassName({
            color: mergedColor,
            size: mergedSize,
            buttonStyle: mergedButtonStyle,
            className,
            block: mergedBlock,
          })}
          style={style}
        >
          {buttonLabel}
        </span>
      </label>
    )
  }

  if (children == null && !rootClassName && !rootStyle && !contentClassName) {
    return (
      <input
        {...rest}
        id={id}
        name={mergedName}
        title={title}
        type="radio"
        value={value as any}
        checked={readChecked()}
        defaultChecked={defaultChecked ?? readChecked()}
        disabled={mergedDisabled}
        style={style}
        className={buildInputClassName(mergedColor, mergedSize, className)}
        data-rue-radio-input="true"
        data-rue-radio-disabled={mergedDisabled ? 'true' : 'false'}
        data-rue-radio-option-type={mergedOptionType}
        data-rue-radio-value={value !== undefined ? serializeValue(value) : undefined}
        onChange={handleChange}
      />
    )
  }

  return (
    <label
      className={buildDefaultRootClassName(mergedDisabled, rootClassName, mergedBlock)}
      style={rootStyle}
      title={title}
      data-rue-radio-root="true"
      data-rue-radio-option-type="default"
    >
      <span className="shrink-0 pt-0.5">
        <input
          {...rest}
          id={id}
          name={mergedName}
          title={title}
          type="radio"
          value={value as any}
          checked={readChecked()}
          defaultChecked={defaultChecked ?? readChecked()}
          disabled={mergedDisabled}
          style={style}
          className={buildInputClassName(mergedColor, mergedSize, className)}
          data-rue-radio-input="true"
          data-rue-radio-disabled={mergedDisabled ? 'true' : 'false'}
          data-rue-radio-option-type={mergedOptionType}
          data-rue-radio-value={value !== undefined ? serializeValue(value) : undefined}
          onChange={handleChange}
        />
      </span>
      {children != null ? (
        <span className={buildContentClassName(contentClassName)}>{children}</span>
      ) : null}
    </label>
  )
}

/** inject Radio Group Props 的内部工具函数。 */

/** Group 的内部工具函数。 */
const Group: FC<RadioGroupProps> = ({
  value,
  defaultValue,
  options,
  disabled,
  name,
  className,
  style,
  children,
  optionType = 'default',
  buttonStyle = 'outline',
  size,
  color,
  block,
  orientation,
  vertical,
  onChange,
  ...rest
}) => {
  const instance = useSetup(() => ({
    generatedName: `rue-radio-group-${++radioGroupNameSeed}`,
    root: undefined as HTMLDivElement | undefined,
  }))
  const selectedValue = ref<RadioValue | undefined>(value ?? defaultValue)
  const normalizedOptions = normalizeOptions(options)

  const mergedName = name ?? instance.generatedName
  const mergedOrientation = resolveOrientation(orientation, vertical)

  const readCurrentValue = () => (value !== undefined ? value : selectedValue.value)

  const syncChildInputs = () => {
    const root = instance.root
    if (!root || typeof root.querySelectorAll !== 'function') return

    const selectedSerializedValue =
      readCurrentValue() !== undefined
        ? serializeValue(readCurrentValue() as RadioValue)
        : undefined
    const inputs = Array.from(
      root.querySelectorAll<HTMLInputElement>('input[type="radio"][data-rue-radio-input="true"]'),
    )

    inputs.forEach(input => {
      const serializedValue = input.dataset.rueRadioValue
      if (serializedValue) {
        input.checked =
          selectedSerializedValue !== undefined && serializedValue === selectedSerializedValue
      }
      input.name = mergedName
      input.disabled = disabled ? true : input.dataset.rueRadioDisabled === 'true'
    })
  }

  const bindGroupRoot = (root: HTMLDivElement | null) => {
    instance.root = root ?? undefined
    syncChildInputs()
    Promise.resolve().then(() => {
      syncChildInputs()
    })
  }

  const commitValue = (
    nextValue: RadioValue | undefined,
    event: Event,
    option?: NormalizedRadioOption,
  ) => {
    const controlled = value !== undefined
    const previousValue = controlled ? value : selectedValue.value

    if (!controlled) {
      selectedValue.value = nextValue
    }

    if (nextValue !== previousValue && onChange) {
      onChange(nextValue, event, {
        checked: true,
        value: nextValue,
        previousValue,
        optionType,
        option,
      })
    }

    if (nextValue !== previousValue && option?.onChange) {
      option.onChange(event, {
        checked: true,
        value: nextValue,
        optionType,
      })
    }
  }

  const handleRadioChange = (
    nextValue: RadioValue | undefined,
    event: Event,
    providedOption?: RadioOption,
  ) => {
    const resolvedValue =
      nextValue !== undefined
        ? nextValue
        : deserializeValue((event.target as HTMLElement | null)?.dataset.rueRadioValue)
    const serializedValue = resolvedValue !== undefined ? serializeValue(resolvedValue) : undefined
    const matchedOption = normalizedOptions.find(
      option => serializeValue(option.value) === serializedValue,
    )

    if (resolvedValue === undefined) {
      return
    }

    commitValue(
      resolvedValue,
      event,
      (providedOption ?? matchedOption) as NormalizedRadioOption | undefined,
    )
    syncChildInputs()
  }

  const handleChildrenChange = (event: Event) => {
    if ((event as unknown as Record<string, boolean>)[RADIO_GROUP_CHANGE_HANDLED]) {
      return
    }

    const target = event.target as HTMLInputElement | null

    if (!target || target.type !== 'radio' || target.dataset.rueRadioInput !== 'true') {
      return
    }

    handleRadioChange(deserializeValue(target.dataset.rueRadioValue), event)
  }

  watchEffect(() => {
    syncChildInputs()
  })

  return (
    <div
      {...rest}
      ref={bindGroupRoot}
      role={rest.role ?? 'radiogroup'}
      className={resolveGroupClassName({
        optionType,
        orientation: mergedOrientation,
        className,
        block,
      })}
      style={style}
      data-rue-radio-group="true"
      data-rue-radio-group-block={block ? 'true' : 'false'}
      data-rue-radio-group-button-style={buttonStyle}
      data-rue-radio-group-color={color}
      data-rue-radio-group-option-type={optionType}
      data-rue-radio-group-size={resolveSizeToken(size)}
      onChange={normalizedOptions.length ? undefined : handleChildrenChange}
    >
      {normalizedOptions.length ? (
        <>
          {' '}
          {normalizedOptions.map(option => (
            <RadioRoot
              key={serializeValue(option.value)}
              value={option.value}
              checked={readCurrentValue() === option.value}
              disabled={option.disabled}
              name={mergedName}
              title={option.title}
              id={option.id}
              required={option.required}
              optionType={optionType}
              buttonStyle={buttonStyle}
              size={option.size ?? size}
              color={option.color ?? color}
              block={block}
              rootClassName={option.className}
              rootStyle={option.style}
              __rueRadioGroupValue={readCurrentValue()}
              __rueRadioGroupDisabled={disabled}
              __rueRadioGroupControlled={value !== undefined}
              __rueRadioGroupOnChange={handleRadioChange}
              __rueRadioOption={option}
            >
              {option.label}
            </RadioRoot>
          ))}{' '}
        </>
      ) : (
        children
      )}
    </div>
  )
}

/** Radio Button 的内部工具函数。 */
const RadioButton: FC<RadioProps> = props => {
  return <RadioRoot {...props} optionType="button" />
}

type RadioCompound = FC<RadioProps> & {
  Group: FC<RadioGroupProps>
  Button: FC<RadioProps>
}

const Radio: RadioCompound = /*#__PURE__*/ Object.assign(RadioRoot, {
  Group,
  Button: RadioButton,
})

/** 默认导出单选框组件。 */
export default Radio
