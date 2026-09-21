/*
Textarea 组件概述
- 保留 Rue 当前 textarea 视觉类，并补齐更顺手的语义 API：status、allowClear、showCount、autoSize、resize。
- 继续兼容原有 color / size / ghost 用法，避免设计页和业务代码回退。
*/
import type { FC } from '@rue-js/rue'
import { onMounted, ref, useRef, watch } from '@rue-js/rue'

/** TextareaTone 语义色类型。 */
export type TextareaTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** TextareaColor 语义色类型。 */
export type TextareaColor = 'default' | TextareaTone
/** TextareaSize 尺寸类型。 */
export type TextareaSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'small'
  | 'middle'
  | 'medium'
  | 'large'
/** TextareaStatus 状态类型。 */
export type TextareaStatus = 'warning' | 'error'
/** TextareaVariant 视觉或语义变体类型。 */
export type TextareaVariant = 'outlined' | 'filled' | 'ghost'
/** TextareaResize 类型。 */
export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both'

/** TextareaAutoSizeConfig 配置对象。 */
export interface TextareaAutoSizeConfig {
  /** minRows 配置项。 */
  minRows?: number
  /** maxRows 配置项。 */
  maxRows?: number
}

/** TextareaShowCountInfo 接口。 */
export interface TextareaShowCountInfo {
  /** count 配置项。 */
  count: number
  /** maxLength 配置项。 */
  maxLength?: number
}

/** TextareaShowCountConfig 配置对象。 */
export interface TextareaShowCountConfig {
  /** formatter 配置项。 */
  formatter?: (info: TextareaShowCountInfo) => string | number
}

/** TextareaAllowClearConfig 配置对象。 */
export interface TextareaAllowClearConfig {
  /** 清空图标。 */
  clearIcon?: any
}

/** TextareaProps 组件属性。 */
export interface TextareaProps {
  /** 组件语义色。 */
  color?: TextareaColor
  /** 组件尺寸。 */
  size?: TextareaSize
  /** 组件状态。 */
  status?: TextareaStatus
  /** 组件视觉变体。 */
  variant?: TextareaVariant
  /** resize 配置项。 */
  resize?: TextareaResize
  /** ghost 配置项。 */
  ghost?: boolean
  /** showCount 配置项。 */
  showCount?: boolean | TextareaShowCountConfig
  /** 是否允许一键清空。 */
  allowClear?: boolean | TextareaAllowClearConfig
  /** autoSize 尺寸。 */
  autoSize?: boolean | TextareaAutoSizeConfig
  /** 根节点附加类名。 */
  rootClassName?: string
  /** countClassName 附加类名。 */
  countClassName?: string
  /** clearButtonClassName 附加类名。 */
  clearButtonClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 是否禁用交互。 */
  disabled?: boolean
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
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 解析 Text Value 的内部工具函数。 */
const resolveTextValue = (value?: string | number) => {
  if (value == null) return ''
  return String(value)
}

/** 解析 Color Class，并让样式构建器能够静态发现所有主题色。 */
const resolveColorClass = (color?: TextareaTone) => {
  switch (color) {
    case 'neutral':
      return 'textarea-neutral'
    case 'primary':
      return 'textarea-primary'
    case 'secondary':
      return 'textarea-secondary'
    case 'accent':
      return 'textarea-accent'
    case 'info':
      return 'textarea-info'
    case 'success':
      return 'textarea-success'
    case 'warning':
      return 'textarea-warning'
    case 'error':
      return 'textarea-error'
    default:
      return ''
  }
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: TextareaSize) => {
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
const resolveStatusTone = (status?: TextareaStatus) => {
  switch (status) {
    case 'warning':
      return 'warning' as TextareaTone
    case 'error':
      return 'error' as TextareaTone
    default:
      return undefined
  }
}

/** 解析 Resize Class 的内部工具函数。 */
const resolveResizeClass = (resize?: TextareaResize) => {
  switch (resize) {
    case 'none':
      return 'resize-none'
    case 'vertical':
      return 'resize-y'
    case 'horizontal':
      return 'resize-x'
    case 'both':
      return 'resize'
    default:
      return ''
  }
}

/** 构建 Textarea Class Name 的内部工具函数。 */
const buildTextareaClassName = ({
  color,
  status,
  size,
  variant,
  ghost,
  className,
  allowClear,
}: Pick<
  TextareaProps,
  'color' | 'status' | 'size' | 'variant' | 'ghost' | 'className' | 'allowClear'
>) => {
  let cls = 'textarea w-full'
  const resolvedColor = color && color !== 'default' ? color : resolveStatusTone(status)
  const resolvedSize = resolveSizeClass(size)
  const isGhost = ghost || variant === 'ghost'

  const colorClass = resolveColorClass(resolvedColor)
  if (colorClass) cls += ` ${colorClass}`
  if (resolvedSize) cls += ` textarea-${resolvedSize}`
  if (isGhost) cls += ' textarea-ghost'
  if (variant === 'filled') cls += ' border-transparent bg-base-200/70 focus:bg-base-100'
  if (allowClear) cls += ' pr-10'
  if (className) cls += ` ${className}`

  return cls
}

/** 渲染 Count Content 的内部工具函数。 */
const renderCountContent = (
  showCount: boolean | TextareaShowCountConfig | undefined,
  info: TextareaShowCountInfo,
) => {
  if (showCount && typeof showCount === 'object' && typeof showCount.formatter === 'function') {
    return showCount.formatter(info)
  }
  if (typeof info.maxLength === 'number') {
    return `${info.count} / ${info.maxLength}`
  }
  return String(info.count)
}

/** stringify Count Content 的内部工具函数。 */
const stringifyCountContent = (content: any) => {
  if (content == null) return ''
  return typeof content === 'string' ? content : String(content)
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

/** Textarea 的内部工具函数。 */
const Textarea: FC<TextareaProps> = ({
  color,
  size,
  status,
  variant,
  resize,
  ghost,
  showCount,
  allowClear,
  autoSize,
  rootClassName,
  countClassName,
  clearButtonClassName,
  className,
  disabled,
  value,
  defaultValue,
  onClear,
  onInput,
  onChange,
  ...rest
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>()
  const countElementRef = useRef<HTMLDivElement>()
  const clearButtonElementRef = useRef<HTMLButtonElement>()
  const forwardedRef = rest.ref
  const nativeRest = { ...rest }
  const isControlled = value !== undefined
  const initialTextValue = resolveTextValue(isControlled ? value : defaultValue)
  const currentValue = ref(initialTextValue)
  const currentLength = () => currentValue.value.length
  const hasCount = !!showCount
  const clearConfig = allowClear && typeof allowClear === 'object' ? allowClear : undefined
  const clearable = !!allowClear
  const resolvedResize = resize ?? (autoSize ? 'none' : undefined)
  const nativeRows =
    typeof nativeRest.rows === 'number'
      ? nativeRest.rows
      : typeof nativeRest.rows === 'string'
        ? Number.parseInt(nativeRest.rows, 10)
        : undefined
  const maxLength =
    typeof nativeRest.maxLength === 'number'
      ? nativeRest.maxLength
      : typeof nativeRest.maxlength === 'number'
        ? nativeRest.maxlength
        : undefined

  if ('ref' in nativeRest) {
    delete nativeRest.ref
  }

  const syncValueState = () => {
    currentValue.value = resolveTextValue(
      isControlled ? value : (textareaRef.current?.value ?? defaultValue),
    )
  }

  const syncAutoSize = () => {
    const element = textareaRef.current
    if (!element) return

    if (!autoSize) {
      element.style.height = ''
      element.style.overflowY = ''
      return
    }

    const config = typeof autoSize === 'object' ? autoSize : undefined
    const computedStyle = window.getComputedStyle(element)
    const lineHeightValue = Number.parseFloat(computedStyle.lineHeight)
    const fontSizeValue = Number.parseFloat(computedStyle.fontSize)
    const lineHeight = Number.isFinite(lineHeightValue)
      ? lineHeightValue
      : Number.isFinite(fontSizeValue)
        ? fontSizeValue * 1.5
        : 24
    const borderHeight =
      Number.parseFloat(computedStyle.borderTopWidth || '0') +
      Number.parseFloat(computedStyle.borderBottomWidth || '0')
    const paddingHeight =
      Number.parseFloat(computedStyle.paddingTop || '0') +
      Number.parseFloat(computedStyle.paddingBottom || '0')
    const minRows =
      typeof config?.minRows === 'number' && config.minRows > 0
        ? config.minRows
        : typeof nativeRows === 'number' && Number.isFinite(nativeRows) && nativeRows > 0
          ? nativeRows
          : undefined
    const maxRows =
      typeof config?.maxRows === 'number' && config.maxRows > 0
        ? Math.max(config.maxRows, minRows ?? 1)
        : undefined

    element.style.height = 'auto'
    let nextHeight = element.scrollHeight

    if (typeof minRows === 'number') {
      nextHeight = Math.max(nextHeight, minRows * lineHeight + borderHeight + paddingHeight)
    }

    if (typeof maxRows === 'number') {
      const maxHeight = maxRows * lineHeight + borderHeight + paddingHeight
      element.style.overflowY = nextHeight > maxHeight ? 'auto' : 'hidden'
      nextHeight = Math.min(nextHeight, maxHeight)
    } else {
      element.style.overflowY = 'hidden'
    }

    element.style.height = `${nextHeight}px`
  }

  const assignRefs = (element: HTMLTextAreaElement | null) => {
    textareaRef.current = element ?? undefined
    if (element && element.value !== currentValue.value) {
      element.value = currentValue.value
    }
    if (typeof forwardedRef === 'function') {
      forwardedRef(element)
      return
    }
    if (forwardedRef && typeof forwardedRef === 'object') {
      ;(forwardedRef as any).current = element ?? undefined
    }
  }

  const triggerNativeChangeEvents = (element: HTMLTextAreaElement) => {
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const handleInput = (event: Event) => {
    const target = event.target as HTMLTextAreaElement | null
    currentValue.value = target?.value ?? ''
    syncAutoSize()

    if (onInput) onInput(event)
  }

  const handleChange = (event: Event) => {
    const target = event.target as HTMLTextAreaElement | null
    currentValue.value = target?.value ?? ''
    syncAutoSize()

    if (onChange) onChange(event)
  }

  const handleClear = (event: MouseEvent) => {
    const element = textareaRef.current
    if (!element || disabled) return

    if (typeof (event as any).preventDefault === 'function') {
      ;(event as any).preventDefault()
    }
    if (typeof (event as any).stopPropagation === 'function') {
      ;(event as any).stopPropagation()
    }

    element.value = ''
    currentValue.value = ''
    syncAutoSize()

    element.focus()
    triggerNativeChangeEvents(element)
    if (onClear) onClear(event)
  }

  onMounted(() => {
    syncValueState()
    syncAutoSize()
  })

  watch(
    () => value,
    () => {
      if (isControlled && textareaRef.current) {
        textareaRef.current.value = resolveTextValue(value)
      }
      syncValueState()
      syncAutoSize()
    },
    { immediate: true },
  )

  watch(
    () => autoSize,
    () => {
      syncAutoSize()
    },
    { immediate: true },
  )

  if (nativeRest.rows !== undefined && nativeRest.rows !== null) {
    nativeRest.rows = String(nativeRest.rows)
  }

  if (autoSize && (nativeRest.rows === undefined || nativeRest.rows === null)) {
    const minRows =
      typeof autoSize === 'object' && typeof autoSize.minRows === 'number'
        ? autoSize.minRows
        : undefined
    if (minRows) {
      nativeRest.rows = String(minRows)
    }
  }

  const nativeValueProps: Record<string, any> = {}
  if (value !== undefined) {
    nativeValueProps.value = value
  }
  if (defaultValue !== undefined) {
    nativeValueProps.defaultValue = defaultValue
  }

  if (!clearable && !hasCount && !rootClassName) {
    return (
      <textarea
        {...nativeRest}
        {...nativeValueProps}
        ref={assignRefs}
        disabled={disabled}
        aria-invalid={status === 'error' ? 'true' : nativeRest['aria-invalid']}
        data-rue-textarea-input="true"
        className={appendClassName(
          buildTextareaClassName({
            color,
            status,
            size,
            variant,
            ghost,
            className,
            allowClear: clearable,
          }),
          resolveResizeClass(resolvedResize),
        )}
        onInput={handleInput}
        onChange={handleChange}
      />
    )
  }

  return (
    <div
      className={appendClassName('flex w-full flex-col gap-2', rootClassName)}
      data-rue-textarea-root="true"
    >
      <div className="relative w-full">
        <textarea
          {...nativeRest}
          {...nativeValueProps}
          ref={assignRefs}
          disabled={disabled}
          aria-invalid={status === 'error' ? 'true' : nativeRest['aria-invalid']}
          data-rue-textarea-input="true"
          className={appendClassName(
            buildTextareaClassName({
              color,
              status,
              size,
              variant,
              ghost,
              className,
              allowClear: clearable,
            }),
            resolveResizeClass(resolvedResize),
          )}
          onInput={handleInput}
          onChange={handleChange}
        />
        {clearable && !disabled ? (
          <button
            ref={(element: HTMLButtonElement | null) => {
              clearButtonElementRef.current = element ?? undefined
            }}
            type="button"
            tabIndex={-1}
            aria-label="Clear text"
            className={appendClassName(
              appendClassName(
                'btn btn-ghost btn-xs absolute right-2 top-2 h-7 min-h-0 w-7 rounded-full p-0 text-base-content/55 hover:text-base-content',
                currentLength() > 0 ? undefined : 'hidden',
              ),
              clearButtonClassName,
            )}
            onClick={handleClear}
          >
            {clearConfig?.clearIcon ? (
              <span>{String(clearConfig.clearIcon)}</span>
            ) : (
              <DefaultClearIcon />
            )}
          </button>
        ) : null}
      </div>
      {hasCount ? (
        <div
          ref={(element: HTMLDivElement | null) => {
            countElementRef.current = element ?? undefined
          }}
          className={appendClassName(
            'flex justify-end text-xs leading-5 text-base-content/60',
            countClassName,
          )}
          data-rue-textarea-count="true"
        >
          {String(
            stringifyCountContent(
              renderCountContent(showCount, { count: currentLength(), maxLength }),
            ),
          )}
        </div>
      ) : null}
    </div>
  )
}

/** 默认导出多行输入组件。 */
export default Textarea
