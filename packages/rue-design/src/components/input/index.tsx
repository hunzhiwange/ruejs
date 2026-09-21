/*
Input 组件概述
- 在 Rue 现有 input 视觉基座上补齐更高层的语义 API：prefix/suffix、allowClear、showCount、状态与变体。
- 通过命名空间挂载 Search、Password、TextArea。
- 保留当前 Shell 入口，兼容文档里直接把 input 当作壳层容器使用的写法。
*/
import type { FC } from '@rue-js/rue'
import { Template, computed, ref, watch } from '@rue-js/rue'
import Textarea, { type TextareaProps } from '../textarea'

/** InputTone 语义色类型。 */
export type InputTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** InputColor 语义色类型。 */
export type InputColor = 'default' | InputTone
/** InputSize 尺寸类型。 */
export type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'
/** InputStatus 状态类型。 */
export type InputStatus = 'warning' | 'error'
/** InputVariant 视觉或语义变体类型。 */
export type InputVariant = 'outlined' | 'filled' | 'ghost' | 'borderless'

/** InputShowCountInfo 接口。 */
export interface InputShowCountInfo {
  /** 受控值。 */
  value: string
  /** count 配置项。 */
  count: number
  /** maxLength 配置项。 */
  maxLength?: number
}

/** InputShowCountConfig 配置对象。 */
export interface InputShowCountConfig {
  /** formatter 配置项。 */
  formatter?: (info: InputShowCountInfo) => string | number
}

/** InputAllowClearConfig 配置对象。 */
export interface InputAllowClearConfig {
  /** 清空图标。 */
  clearIcon?: any
}

/** InputProps 组件属性。 */
export interface InputProps {
  /** 组件语义色。 */
  color?: InputColor
  /** 组件尺寸。 */
  size?: InputSize
  /** 组件状态。 */
  status?: InputStatus
  /** 组件视觉变体。 */
  variant?: InputVariant
  /** ghost 配置项。 */
  ghost?: boolean
  /** 组件类型或语义类型。 */
  type?: string
  /** 前缀内容。 */
  prefix?: any
  /** 后缀内容。 */
  suffix?: any
  /** 输入前置附加内容。 */
  addonBefore?: any
  /** 输入后置附加内容。 */
  addonAfter?: any
  /** addonBeforeBare 配置项。 */
  addonBeforeBare?: boolean
  /** addonAfterBare 配置项。 */
  addonAfterBare?: boolean
  /** showCount 配置项。 */
  showCount?: boolean | InputShowCountConfig
  /** 是否允许一键清空。 */
  allowClear?: boolean | InputAllowClearConfig
  /** 根节点附加类名。 */
  rootClassName?: string
  /** inputClassName 附加类名。 */
  inputClassName?: string
  /** countClassName 附加类名。 */
  countClassName?: string
  /** clearButtonClassName 附加类名。 */
  clearButtonClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 是否禁用交互。 */
  disabled?: boolean
  /** readOnly 配置项。 */
  readOnly?: boolean
  /** 受控值。 */
  value?: string | number
  /** 非受控初始值。 */
  defaultValue?: string | number
  /** 清空时触发的回调。 */
  onClear?: (event: MouseEvent) => void
  /** onInput 事件回调。 */
  onInput?: (event: Event) => void
  /** 值或状态变化时触发的回调。 */
  onChange?: (event: Event) => void
  /** onKeyDown 事件回调。 */
  onKeyDown?: (event: KeyboardEvent) => void
  /** onPressEnter 事件回调。 */
  onPressEnter?: (event: KeyboardEvent) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** InputShellProps 组件属性。 */
export interface InputShellProps {
  /** 自定义渲染的宿主元素。 */
  as?: string
  /** 组件语义色。 */
  color?: InputColor
  /** 组件状态。 */
  status?: InputStatus
  /** 组件尺寸。 */
  size?: InputSize
  /** 组件视觉变体。 */
  variant?: InputVariant
  /** ghost 配置项。 */
  ghost?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** SearchInfo 接口。 */
export interface SearchInfo {
  /** source 配置项。 */
  source: 'input' | 'clear'
}

/** SearchProps 组件属性。 */
export interface SearchProps extends InputProps {
  /** enterButton 配置项。 */
  enterButton?: boolean | any
  /** 是否展示加载态。 */
  loading?: boolean
  /** buttonClassName 附加类名。 */
  buttonClassName?: string
  /** 搜索文本变化时触发的回调。 */
  onSearch?: (value: string, event: MouseEvent | KeyboardEvent, info: SearchInfo) => void
}

/** PasswordVisibilityToggle 接口。 */
export interface PasswordVisibilityToggle {
  /** visible 配置项。 */
  visible?: boolean
  /** onVisibleChange 事件回调。 */
  onVisibleChange?: (visible: boolean) => void
}

/** PasswordProps 组件属性。 */
export interface PasswordProps extends Omit<InputProps, 'type'> {
  /** iconRender 自定义渲染函数。 */
  iconFormatter?: (visible: boolean) => string
  /** visibilityToggle 配置项。 */
  visibilityToggle?: boolean | PasswordVisibilityToggle
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (...classNames: Array<string | undefined | false | null>) => {
  return classNames.filter(Boolean).join(' ')
}

/** 解析 Input Value 的内部工具函数。 */
const resolveInputValue = (value?: string | number) => {
  if (value == null) return ''
  return String(value)
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: InputSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'middle':
    case 'medium':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** 解析 Status Tone 的内部工具函数。 */
const resolveStatusTone = (status?: InputStatus) => {
  switch (status) {
    case 'warning':
      return 'warning' as InputTone
    case 'error':
      return 'error' as InputTone
    default:
      return undefined
  }
}

/** 解析 Variant Class Name 的内部工具函数。 */
const resolveVariantClassName = (variant?: InputVariant, ghost?: boolean) => {
  const resolvedVariant = ghost ? 'ghost' : variant
  switch (resolvedVariant) {
    case 'filled':
      return 'border-transparent bg-base-200/70 shadow-none focus-within:bg-base-100'
    case 'borderless':
      return 'input-ghost bg-transparent border-transparent shadow-none'
    case 'ghost':
      return 'input-ghost'
    default:
      return undefined
  }
}

/** 构建 Class Name 的内部工具函数。 */
const buildClassName = ({
  color,
  status,
  size,
  variant,
  ghost,
  className,
  shell,
}: {
  color?: InputColor
  status?: InputStatus
  size?: InputSize
  variant?: InputVariant
  ghost?: boolean
  className?: string
  shell?: boolean
}) => {
  let cls = 'input'
  const resolvedTone = color && color !== 'default' ? color : resolveStatusTone(status)
  const resolvedSize = resolveSizeClass(size)
  const variantClassName = resolveVariantClassName(variant, ghost)

  if (resolvedTone) cls += ` input-${resolvedTone}`
  if (resolvedSize) cls += ` input-${resolvedSize}`
  if (variantClassName) cls += ` ${variantClassName}`
  if (shell) cls += ' flex items-center gap-2'
  if (className) cls += ` ${className}`
  return cls
}

/** 渲染 Count Content 的内部工具函数。 */
const renderCountContent = (
  showCount: boolean | InputShowCountConfig | undefined,
  info: InputShowCountInfo,
) => {
  if (showCount && typeof showCount === 'object' && typeof showCount.formatter === 'function') {
    return showCount.formatter(info)
  }
  if (typeof info.maxLength === 'number') {
    return `${info.count} / ${info.maxLength}`
  }
  return String(info.count)
}

/** stringify Content 的内部工具函数。 */
const stringifyContent = (content: any) => {
  if (content == null) return ''
  return typeof content === 'string' ? content : String(content)
}

/** read Max Length 的内部工具函数。 */
const readMaxLength = (props: Record<string, any>) => {
  if (typeof props.maxLength === 'number') return props.maxLength
  if (typeof props.maxlength === 'number') return props.maxlength
  return undefined
}

/** Addon 的内部工具函数。 */
const Addon: FC<{ children: any; className?: string }> = ({ children, className }) => {
  return (
    <span
      className={mergeClassName(
        'join-item inline-flex items-center border border-base-300 bg-base-200 px-3 text-sm text-base-content/65',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Default Clear Icon 的内部工具函数。 */
const DefaultClearIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 7 10 10M17 7 7 17" />
    </svg>
  )
}

/** Default Search Icon 的内部工具函数。 */
const DefaultSearchIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" />
    </svg>
  )
}

/** Eye Open Icon 的内部工具函数。 */
const EyeOpenIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** Eye Closed Icon 的内部工具函数。 */
const EyeClosedIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className="size-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
      />
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 4 16 16" />
    </svg>
  )
}

let passwordVisibilitySyncSeed = 0
const passwordVisibilityIntent = /*#__PURE__*/ new Map<string, boolean>()

/** Input Root 的内部工具函数。 */
const InputRoot: FC<InputProps> = (
  {
    color,
    size,
    status,
    variant,
    ghost,
    type = 'text',
    prefix,
    suffix,
    addonBefore,
    addonAfter,
    addonBeforeBare,
    addonAfterBare,
    showCount,
    allowClear,
    rootClassName,
    inputClassName,
    countClassName,
    clearButtonClassName,
    className,
    disabled,
    readOnly,
    value,
    defaultValue,
    onClear,
    onInput,
    onChange,
    onKeyDown,
    onPressEnter,
    ...rest
  },
  slots: Record<string, any> = {},
) => {
  let inputElement: HTMLInputElement | null = null
  const forwardedRef = rest.ref
  const nativeRest = { ...rest }
  const isControlled = value !== undefined
  const hasCount = !!showCount
  const clearable = !!allowClear
  const clearConfig = allowClear && typeof allowClear === 'object' ? allowClear : undefined
  const usesShell =
    prefix !== undefined || suffix !== undefined || slots.suffix != null || clearable
  const usesAddonGroup =
    addonBefore !== undefined || addonAfter !== undefined || slots.addonAfter != null
  const currentValue = ref(resolveInputValue(isControlled ? value : defaultValue))

  if ('ref' in nativeRest) {
    delete nativeRest.ref
  }

  const assignRefs = (element: HTMLInputElement | null) => {
    inputElement = element
    if (typeof forwardedRef === 'function') {
      forwardedRef(element)
      return
    }
    if (forwardedRef && typeof forwardedRef === 'object') {
      ;(forwardedRef as any).current = element ?? undefined
    }
  }

  const triggerNativeChangeEvents = (element: HTMLInputElement) => {
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    const nextValue = target?.value ?? ''
    if (onInput) onInput(event)
    if (!isControlled) currentValue.value = nextValue
  }

  const handleChange = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    if (!isControlled) currentValue.value = target?.value ?? ''
    if (onChange) onChange(event)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (onKeyDown) onKeyDown(event)
    if ((event as any).key === 'Enter' && onPressEnter) {
      onPressEnter(event)
    }
  }

  const handleClear = (event: MouseEvent) => {
    const trigger = event.currentTarget as HTMLElement | null
    const shellElement = trigger?.closest('[data-rue-input-shell="true"]') as HTMLElement | null
    const element =
      inputElement ?? (shellElement?.querySelector('input') as HTMLInputElement | null)
    if (!element || disabled || readOnly) return

    if (typeof (event as any).preventDefault === 'function') {
      ;(event as any).preventDefault()
    }
    if (typeof (event as any).stopPropagation === 'function') {
      ;(event as any).stopPropagation()
    }

    element.value = ''
    currentValue.value = ''
    element.focus()
    triggerNativeChangeEvents(element)
    if (onClear) onClear(event)
  }

  watch(
    () => value,
    () => {
      if (isControlled) {
        const nextValue = resolveInputValue(value)
        currentValue.value = nextValue
        if (inputElement && inputElement.value !== nextValue) {
          inputElement.value = nextValue
        }
      }
    },
    { immediate: true },
  )

  const nativeValueProps: Record<string, any> = {}
  if (value !== undefined) {
    nativeValueProps.value = resolveInputValue(value)
  }
  if (defaultValue !== undefined) {
    nativeValueProps.defaultValue = resolveInputValue(defaultValue)
  }
  const nativeReadOnlyProps: Record<string, any> = {}
  if (readOnly !== undefined) {
    nativeReadOnlyProps.readOnly = readOnly
  }
  const ariaInvalid = status === 'error' ? 'true' : nativeRest['aria-invalid']
  if ('aria-invalid' in nativeRest) {
    delete nativeRest['aria-invalid']
  }
  const nativeAriaInvalidProps: Record<string, any> = {}
  if (ariaInvalid !== undefined && ariaInvalid !== null) {
    nativeAriaInvalidProps['aria-invalid'] = ariaInvalid
  }
  const addonControlClassName = usesAddonGroup ? 'join-item min-w-0 flex-1' : undefined
  const rawInputClassName = buildClassName({
    color,
    status,
    size,
    variant,
    ghost,
    className: mergeClassName(className, addonControlClassName),
  })
  const shellClassName = buildClassName({
    color,
    status,
    size,
    variant,
    ghost,
    shell: true,
    className: mergeClassName(className, addonControlClassName),
  })
  const clearButtonClass = mergeClassName(
    'btn btn-ghost btn-xs btn-circle h-7 min-h-0 w-7 shrink-0 p-0 text-base-content/55 hover:text-base-content',
    currentValue.value.length > 0 && !disabled && !readOnly ? undefined : 'hidden',
    clearButtonClassName,
  )
  const countContent = stringifyContent(
    renderCountContent(showCount, {
      value: currentValue.value,
      count: currentValue.value.length,
      maxLength: readMaxLength(nativeRest),
    }),
  )

  const RenderRawInputNode = () => {
    return (
      <input
        {...nativeRest}
        {...nativeValueProps}
        {...nativeReadOnlyProps}
        {...nativeAriaInvalidProps}
        ref={assignRefs}
        type={type}
        disabled={disabled}
        className={rawInputClassName}
        onInput={handleInput}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    )
  }

  const RenderShellNode = () => {
    return (
      <label
        className={shellClassName}
        aria-disabled={disabled ? 'true' : undefined}
        data-rue-input-shell="true"
      >
        {prefix !== undefined ? (
          <span className="shrink-0 text-sm text-base-content/60">{String(prefix)}</span>
        ) : null}
        <input
          {...nativeRest}
          {...nativeValueProps}
          {...nativeReadOnlyProps}
          {...nativeAriaInvalidProps}
          ref={assignRefs}
          type={type}
          disabled={disabled}
          className={mergeClassName(
            'min-w-0 grow border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-base-content/40',
            inputClassName,
          )}
          onInput={handleInput}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {clearable && !disabled && !readOnly ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear text"
            className={clearButtonClass}
            onClick={handleClear}
          >
            {clearConfig?.clearIcon ? (
              <span>{String(clearConfig.clearIcon)}</span>
            ) : (
              <DefaultClearIcon />
            )}
          </button>
        ) : null}
        {suffix !== undefined || slots.suffix != null ? (
          <span className="shrink-0 text-sm text-base-content/60">
            {slots.suffix ? slots.suffix : String(suffix ?? '')}
          </span>
        ) : null}
      </label>
    )
  }

  const RenderControlNode = () => {
    return usesShell ? <RenderShellNode /> : <RenderRawInputNode />
  }

  const RenderGroupedControlNode = () => {
    if (!usesAddonGroup) return <RenderControlNode />
    return (
      <div className="join w-full items-stretch">
        {addonBefore !== undefined ? (
          addonBeforeBare ? (
            addonBefore
          ) : (
            <Addon>{addonBefore}</Addon>
          )
        ) : null}
        <RenderControlNode />
        {slots.addonAfter ? (
          slots.addonAfter
        ) : addonAfter !== undefined ? (
          <Addon>{String(addonAfter)}</Addon>
        ) : null}
      </div>
    )
  }

  if (!hasCount && !rootClassName) {
    return <RenderGroupedControlNode />
  }

  return (
    <div
      className={mergeClassName(hasCount ? 'flex flex-col gap-2' : undefined, rootClassName)}
      data-rue-input-root="true"
    >
      <RenderGroupedControlNode />
      {hasCount ? (
        <div
          className={mergeClassName(
            'flex justify-end text-xs leading-5 text-base-content/60',
            countClassName,
          )}
          data-rue-input-count="true"
        >
          {String(countContent)}
        </div>
      ) : null}
    </div>
  )
}

/** Shell 的内部工具函数。 */
const Shell: FC<InputShellProps> = ({
  as = 'label',
  color,
  status,
  size,
  variant,
  ghost,
  className,
  children,
  ...rest
}) => {
  const Component = as as any
  return Component === 'div' ? (
    <div
      {...rest}
      className={buildClassName({
        color,
        status,
        size,
        variant,
        ghost,
        shell: true,
        className,
      })}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={buildClassName({
        color,
        status,
        size,
        variant,
        ghost,
        shell: true,
        className,
      })}
    >
      {children}
    </span>
  ) : Component === 'button' ? (
    <button
      {...rest}
      className={buildClassName({
        color,
        status,
        size,
        variant,
        ghost,
        shell: true,
        className,
      })}
    >
      {children}
    </button>
  ) : Component === 'label' ? (
    <label
      {...rest}
      className={buildClassName({
        color,
        status,
        size,
        variant,
        ghost,
        shell: true,
        className,
      })}
    >
      {children}
    </label>
  ) : (
    <></>
  )
}

/** Search 的内部工具函数。 */
const Search: FC<SearchProps> = ({
  enterButton,
  loading,
  buttonClassName,
  onSearch,
  onPressEnter,
  onClear,
  onInput,
  onChange,
  suffix,
  addonAfter,
  disabled,
  value,
  defaultValue,
  ...rest
}) => {
  const currentValue = ref(resolveInputValue(value !== undefined ? value : defaultValue))
  const actionContent = enterButton === true ? '搜索' : (enterButton ?? addonAfter)

  const readEventValue = (event: Event) => {
    return ((event.target as HTMLInputElement | null)?.value ?? currentValue.value) as string
  }

  watch(
    () => value,
    () => {
      if (value !== undefined) {
        currentValue.value = resolveInputValue(value)
      }
    },
    { immediate: true },
  )

  const triggerSearch = (event: MouseEvent | KeyboardEvent, source: SearchInfo['source']) => {
    if (disabled || loading) return
    if (onSearch) {
      onSearch(currentValue.value, event, { source })
    }
  }

  const RenderSearchButton = () => {
    if (actionContent !== undefined) {
      return (
        <button
          type="button"
          className={mergeClassName('btn btn-primary join-item', buttonClassName)}
          onClick={(event: MouseEvent) => triggerSearch(event, 'input')}
          disabled={disabled || loading}
          aria-busy={loading ? 'true' : undefined}
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm" aria-hidden="true" />
          ) : (
            String(actionContent)
          )}
        </button>
      )
    }
    return (
      <button
        type="button"
        aria-label="Search"
        className={mergeClassName('btn btn-ghost join-item', buttonClassName)}
        onClick={(event: MouseEvent) => triggerSearch(event, 'input')}
        disabled={disabled || loading}
      >
        {loading ? (
          <span className="loading loading-spinner loading-xs" aria-hidden="true" />
        ) : (
          <DefaultSearchIcon />
        )}
      </button>
    )
  }

  return (
    <InputRoot
      {...rest}
      value={value}
      defaultValue={defaultValue}
      type="text"
      disabled={disabled}
      suffix={suffix}
      onClear={(event: MouseEvent) => {
        currentValue.value = ''
        if (onClear) onClear(event)
        if (onSearch) {
          onSearch('', event, { source: 'clear' })
        }
      }}
      onPressEnter={event => {
        if (onPressEnter) onPressEnter(event)
        triggerSearch(event, 'input')
      }}
      onInput={(event: Event) => {
        currentValue.value = readEventValue(event)
        if (onInput) onInput(event)
      }}
      onChange={(event: Event) => {
        currentValue.value = readEventValue(event)
        if (onChange) onChange(event)
      }}
    >
      <Template slot="addonAfter">
        <RenderSearchButton />
      </Template>
    </InputRoot>
  )
}

/** Password 的内部工具函数。 */
const Password: FC<PasswordProps> = ({
  iconFormatter,
  visibilityToggle = true,
  className,
  ...rest
}) => {
  const uncontrolledVisible = ref(false)
  const visible = computed(() =>
    typeof visibilityToggle === 'object' && visibilityToggle.visible !== undefined
      ? visibilityToggle.visible
      : uncontrolledVisible.value,
  )
  const toggleVisibility = (event: MouseEvent) => {
    event.preventDefault()
    const next = !visible.get()
    if (typeof visibilityToggle !== 'object' || visibilityToggle.visible === undefined)
      uncontrolledVisible.value = next
    if (typeof visibilityToggle === 'object') visibilityToggle.onVisibleChange?.(next)
  }
  return (
    <span className="relative inline-flex items-center">
      <InputRoot
        {...rest}
        className={mergeClassName(className, visibilityToggle === false ? undefined : 'pr-10')}
        type={visible.get() ? 'text' : 'password'}
      />
      {visibilityToggle !== false ? (
        <button
          type="button"
          data-rue-password-toggle="true"
          className="btn btn-ghost btn-xs btn-circle absolute right-2 h-7 min-h-0 w-7 p-0"
          aria-label={visible.get() ? 'Hide password' : 'Show password'}
          onClick={toggleVisibility}
        >
          <span
            data-rue-password-visible-icon="true"
            style={{ display: visible.get() ? 'inline-flex' : 'none' }}
          >
            {iconFormatter ? <span>{String(iconFormatter(true))}</span> : <EyeOpenIcon />}
          </span>
          <span
            data-rue-password-hidden-icon="true"
            style={{ display: visible.get() ? 'none' : 'inline-flex' }}
          >
            {iconFormatter ? <span>{String(iconFormatter(false))}</span> : <EyeClosedIcon />}
          </span>
        </button>
      ) : null}
    </span>
  )
}

type InputCompound = FC<InputProps> & {
  Shell: FC<InputShellProps>
  Search: FC<SearchProps>
  Password: FC<PasswordProps>
  TextArea: FC<TextareaProps>
}

const InputCompound: InputCompound = /*#__PURE__*/ Object.assign(InputRoot, {
  Shell,
  Search,
  Password,
  TextArea: Textarea,
})

/** 默认导出输入框组件。 */
export default InputCompound
