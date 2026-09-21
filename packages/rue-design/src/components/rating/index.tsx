/*
Rating 组件概述
- 默认提供语义化评分 API，支持受控/非受控、清除、半星、悬停反馈与自定义字符。
- 保留 Rating.Item 复合写法，兼容现有基于 daisyUI `rating` 结构的老 demo。
- 自动模式使用字符双层填充实现分数显示，既能保留 Rue 当前轻量视觉，也能承载自定义字符。
*/
import type { FC } from '@rue-js/rue'
import { computed, createContext, ref, useContext, useSetup } from '@rue-js/rue'
import { provideContext } from '@rue-js/rue/internal/app'

let ratingSeed = 0

/** RatingSize 尺寸类型。 */
export type RatingSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'small'
  | 'default'
  | 'medium'
  | 'middle'
  | 'large'

/** RatingTooltipItem 数据项结构。 */
export interface RatingTooltipItem {
  /** 标题内容。 */
  title?: any
}

/** RatingCharacterRenderContext 事件或渲染上下文。 */
export interface RatingCharacterRenderContext {
  /** index 配置项。 */
  index: number
  /** 受控值。 */
  value: number
  /** fill 配置项。 */
  fill: number
  /** 受控选中状态。 */
  checked: boolean
  /** hovered 配置项。 */
  hovered: boolean
  /** half 配置项。 */
  half: boolean
}

/** RatingProps 组件属性。 */
export interface RatingProps {
  /** 组件尺寸。 */
  size?: RatingSize
  /** half 配置项。 */
  half?: boolean
  /** allowHalf 配置项。 */
  allowHalf?: boolean
  /** count 配置项。 */
  count?: number
  /** 受控值。 */
  value?: number
  /** 非受控初始值。 */
  defaultValue?: number
  /** 是否允许一键清空。 */
  allowClear?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** readOnly 配置项。 */
  readOnly?: boolean
  /** 表单 name 属性或分组名称。 */
  name?: string
  /** character 配置项。 */
  character?: string | ((context: RatingCharacterRenderContext) => string)
  /** tooltips 配置项。 */
  tooltips?: Array<string | number | RatingTooltipItem>
  /** 根节点附加类名。 */
  className?: string
  /** itemClassName 附加类名。 */
  itemClassName?: string
  /** characterClassName 附加类名。 */
  characterClassName?: string
  /** activeCharacterClassName 附加类名。 */
  activeCharacterClassName?: string
  /** inactiveCharacterClassName 附加类名。 */
  inactiveCharacterClassName?: string
  /** clearLabel 标签内容。 */
  clearLabel?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** 值或状态变化时触发的回调。 */
  onChange?: (value: number) => void
  /** onHoverChange 事件回调。 */
  onHoverChange?: (value: number) => void
  /** 失去焦点时触发的回调。 */
  onBlur?: (event: Event) => void
  /** 获得焦点时触发的回调。 */
  onFocus?: (event: Event) => void
  /** onKeyDown 事件回调。 */
  onKeyDown?: (event: Event) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** RatingItemProps 组件属性。 */
export interface RatingItemProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** hidden 配置项。 */
  hidden?: boolean
  /** checked 配置项。 */
  checked?: boolean
  /** 组件类型或语义类型。 */
  type?: string
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface RatingCompositionContextValue {
  managed: boolean
  disabled: boolean
  readOnly: boolean
  name: string
  readValue: () => number
  commitValue: (value: number) => void
}

const RatingCompositionContext = createContext<RatingCompositionContextValue | null>(null)

/** append Class Name 的内部工具函数。 */
const appendClassName = (base?: string, className?: string) => {
  if (!base) return className ?? ''
  return className ? `${base} ${className}` : base
}

/** 判断是否存在 Renderable Children 的内部工具函数。 */
const hasRenderableChildren = (children: any) =>
  children != null && children !== false && children !== ''

/** clamp 的内部工具函数。 */
const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: RatingSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'default':
    case 'medium':
    case 'middle':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** 解析 Character Size Class 的内部工具函数。 */
const resolveCharacterSizeClass = (size?: RatingSize) => {
  switch (resolveSizeClass(size)) {
    case 'xs':
      return 'text-lg'
    case 'sm':
      return 'text-xl'
    case 'lg':
      return 'text-3xl'
    case 'xl':
      return 'text-4xl'
    default:
      return 'text-2xl'
  }
}

/** 归一化 Count 的内部工具函数。 */
const normalizeCount = (count?: number) => {
  if (typeof count !== 'number' || Number.isNaN(count)) return 5
  return Math.max(1, Math.round(count))
}

/** 归一化 Rating Value 的内部工具函数。 */
const normalizeRatingValue = (value: unknown, allowHalf: boolean, count: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  const bounded = clamp(value, 0, count)
  const stepped = allowHalf ? Math.round(bounded * 2) / 2 : Math.round(bounded)
  return Number(stepped.toFixed(1))
}

/** LEGACY_EMPTY_OPACITY 内部常量。 */
const LEGACY_EMPTY_OPACITY = '0.35'
/** LEGACY_FILLED_OPACITY 内部常量。 */
const LEGACY_FILLED_OPACITY = '1'
/** LEGACY_DISABLED_OPACITY 内部常量。 */
const LEGACY_DISABLED_OPACITY = '0.45'
/** LEGACY_ACTIVE_BACKGROUND_CLASS 内部常量。 */
const LEGACY_ACTIVE_BACKGROUND_CLASS = 'bg-orange-400'
/** LEGACY_INACTIVE_BACKGROUND_CLASS 内部常量。 */
const LEGACY_INACTIVE_BACKGROUND_CLASS = 'bg-base-content'

/** 构建 Manual Root Class Name 的内部工具函数。 */
const buildManualRootClassName = (size?: RatingSize, half?: boolean, className?: string) => {
  let cls = 'rating'
  const resolvedSize = resolveSizeClass(size)
  if (resolvedSize) cls += ` rating-${resolvedSize}`
  if (half) cls += ' rating-half'
  if (className) cls += ` ${className}`
  return cls
}

/** 构建 Auto Root Class Name 的内部工具函数。 */
const buildAutoRootClassName = (
  size: RatingSize | undefined,
  disabled: boolean,
  readOnly: boolean,
  useLegacyMaskDefault: boolean,
  className?: string,
) => {
  let cls = useLegacyMaskDefault
    ? buildManualRootClassName(size, false, 'rue-rating align-middle select-none')
    : appendClassName(
        'rue-rating inline-flex flex-wrap items-center gap-1 align-middle select-none',
        resolveCharacterSizeClass(size),
      )
  if (disabled) cls = appendClassName(cls, 'cursor-not-allowed opacity-50')
  else if (readOnly) cls = appendClassName(cls, 'cursor-default opacity-85')
  else cls = appendClassName(cls, 'cursor-pointer')
  return appendClassName(cls, className)
}

/** 构建 Auto Button Class Name 的内部工具函数。 */
const buildAutoButtonClassName = (
  interactive: boolean,
  useLegacyMaskDefault: boolean,
  itemClassName?: string,
) => {
  let cls = useLegacyMaskDefault
    ? 'group relative inline-flex shrink-0 items-center justify-center border-0 bg-transparent p-0 leading-none opacity-100 transition duration-150'
    : 'group relative inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0.5 leading-none transition duration-150'
  if (interactive)
    cls = appendClassName(
      cls,
      'hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
    )
  else cls = appendClassName(cls, 'focus:outline-none')
  return appendClassName(cls, itemClassName)
}

/** 构建 Character Wrapper Class Name 的内部工具函数。 */
const buildCharacterWrapperClassName = (size?: RatingSize, characterClassName?: string) => {
  return appendClassName(
    'relative inline-flex items-center justify-center leading-none',
    appendClassName(resolveCharacterSizeClass(size), characterClassName),
  )
}

/** 构建 Legacy Mask Class Name 的内部工具函数。 */
const buildLegacyMaskClassName = (fill: number, disabled: boolean, characterClassName?: string) => {
  return appendClassName(
    appendClassName(
      'mask mask-star inline-block size-[1em] transition-colors duration-150',
      disabled
        ? `${LEGACY_INACTIVE_BACKGROUND_CLASS} opacity-45`
        : fill > 0
          ? `${LEGACY_ACTIVE_BACKGROUND_CLASS} opacity-100`
          : `${LEGACY_INACTIVE_BACKGROUND_CLASS} opacity-[0.35]`,
    ),
    characterClassName,
  )
}

/** 解析 Legacy Mask Opacity 的内部工具函数。 */
const resolveLegacyMaskOpacity = (fill: number, disabled: boolean) => {
  if (disabled) return LEGACY_DISABLED_OPACITY
  return fill > 0 ? LEGACY_FILLED_OPACITY : LEGACY_EMPTY_OPACITY
}

/** 解析 Tooltip Title 的内部工具函数。 */
const resolveTooltipTitle = (tooltips: RatingProps['tooltips'], index: number) => {
  const tooltip = tooltips?.[index]
  if (tooltip == null) return undefined
  if (typeof tooltip === 'string' || typeof tooltip === 'number') return String(tooltip)
  if (typeof tooltip === 'object' && 'title' in tooltip && tooltip.title != null) {
    return String(tooltip.title)
  }
  return undefined
}

/** 解析 Pointer Value 的内部工具函数。 */
const resolvePointerValue = (event: MouseEvent, index: number, allowHalf: boolean) => {
  const fullValue = index + 1
  if (!allowHalf) return fullValue
  const target = event.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect?.()
  if (!rect || !rect.width) return fullValue
  return event.clientX - rect.left <= rect.width / 2 ? index + 0.5 : fullValue
}

/** Default Star Icon 的内部工具函数。 */
const DefaultStarIcon: FC = () => {
  return <span aria-hidden="true" className="mask mask-star inline-block size-[1em] bg-current" />
}

/** 解析 Character Node 的内部工具函数。 */
/** Item 的内部工具函数。 */
const Item: FC<RatingItemProps> = ({
  as = 'input',
  hidden,
  checked,
  type,
  className,
  children,
  value,
  name,
  disabled,
  onChange,
  onClick,
  onKeyDown,
  ...rest
}) => {
  // Keep the host branch keyed only by `as`. Reactive rating state lives in setup so
  // a value update patches the existing item instead of recreating the branch node.
  const instance = useSetup(() => {
    const composition = useContext(RatingCompositionContext)
    const Component = computed(() => as as any)
    const numericValue = computed(() => (typeof value === 'number' ? value : Number(value)))
    const managed = computed(() => !!composition?.managed && Number.isFinite(numericValue.get()))
    const mergedDisabled = computed(() => !!disabled || !!composition?.disabled)
    const mergedChecked = computed(() =>
      managed.get() ? composition?.readValue() === numericValue.get() : checked,
    )
    const mergedActive = computed(
      () =>
        managed.get() &&
        numericValue.get() > 0 &&
        (composition?.readValue() ?? 0) >= numericValue.get(),
    )
    const mergedName = computed(() => name ?? (managed.get() ? composition?.name : undefined))
    const resolvedClassName = () => {
      let resolved = appendClassName(hidden ? 'rating-hidden' : undefined, className)
      if (managed.get()) {
        resolved = appendClassName(resolved, mergedActive.get() ? 'opacity-100' : 'opacity-[0.35]')
      }
      return resolved.trim() || undefined
    }

    const commitManagedValue = () => {
      if (!managed.get() || mergedDisabled.get() || composition?.readOnly) return
      composition?.commitValue(numericValue.get())
    }

    const handleChange = (event: Event) => {
      if (onChange) onChange(event)
    }

    const handleClick = (event: MouseEvent) => {
      if (managed.get() && (mergedDisabled.get() || composition?.readOnly)) {
        event.preventDefault?.()
      } else {
        commitManagedValue()
      }
      if (onClick) onClick(event)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (managed.get() && !mergedDisabled.get() && !composition?.readOnly) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault?.()
          composition?.commitValue(numericValue.get())
        }
      }
      if (onKeyDown) onKeyDown(event)
    }

    const interactiveProps = computed(() =>
      managed.get()
        ? {
            role: rest.role ?? 'radio',
            tabIndex: rest.tabIndex ?? (mergedDisabled.get() || composition?.readOnly ? -1 : 0),
            'aria-checked': mergedChecked.get() ? 'true' : 'false',
            'aria-disabled': mergedDisabled.get() ? 'true' : undefined,
            'data-rating-item': 'true',
            'data-rating-item-value': String(numericValue.get()),
            'data-rating-active': mergedActive.get() ? 'true' : 'false',
            onClick: handleClick,
            onKeyDown: handleKeyDown,
          }
        : {
            'data-rating-item': 'true',
            onClick,
            onKeyDown,
          },
    )

    return {
      Component,
      numericValue,
      managed,
      mergedDisabled,
      mergedChecked,
      mergedActive,
      mergedName,
      resolvedClassName,
      handleChange,
      handleClick,
      interactiveProps,
    }
  })

  if (instance.Component.get() === 'input') {
    return (
      <input
        {...rest}
        type={type ?? 'radio'}
        value={value}
        name={instance.mergedName.get()}
        checked={instance.mergedChecked.get()}
        disabled={instance.mergedDisabled.get()}
        className={instance.resolvedClassName()}
        data-rating-item="true"
        data-rating-active={
          instance.managed.get() ? (instance.mergedActive.get() ? 'true' : 'false') : undefined
        }
        onChange={instance.handleChange}
        onClick={instance.handleClick}
      />
    )
  }

  if (instance.Component.get() === 'div') {
    return (
      <div {...rest} {...instance.interactiveProps.get()} className={instance.resolvedClassName()}>
        {children}
      </div>
    )
  }

  if (instance.Component.get() === 'span') {
    return (
      <span {...rest} {...instance.interactiveProps.get()} className={instance.resolvedClassName()}>
        {children}
      </span>
    )
  }

  if (instance.Component.get() === 'button') {
    return (
      <button
        {...rest}
        {...instance.interactiveProps.get()}
        type={type ?? 'button'}
        disabled={instance.mergedDisabled.get()}
        className={instance.resolvedClassName()}
      >
        {children}
      </button>
    )
  }

  if (instance.Component.get() === 'label') {
    return (
      <label
        {...rest}
        {...instance.interactiveProps.get()}
        className={instance.resolvedClassName()}
      >
        {children}
      </label>
    )
  }

  if (instance.Component.get() === 'a') {
    return (
      <a {...rest} {...instance.interactiveProps.get()} className={instance.resolvedClassName()}>
        {children}
      </a>
    )
  }

  return instance.Component.get() === 'div' ? (
    <div {...rest} className={instance.resolvedClassName()}>
      {children}
    </div>
  ) : instance.Component.get() === 'span' ? (
    <span {...rest} className={instance.resolvedClassName()}>
      {children}
    </span>
  ) : instance.Component.get() === 'button' ? (
    <button {...rest} className={instance.resolvedClassName()}>
      {children}
    </button>
  ) : instance.Component.get() === 'label' ? (
    <label {...rest} className={instance.resolvedClassName()}>
      {children}
    </label>
  ) : instance.Component.get() === 'a' ? (
    <a {...rest} className={instance.resolvedClassName()}>
      {children}
    </a>
  ) : (
    <></>
  )
}

/** Rating Root 的内部工具函数。 */
const RatingRoot: FC<RatingProps> = ({
  size,
  half,
  allowHalf,
  count,
  value,
  defaultValue,
  allowClear = true,
  disabled,
  readOnly,
  name,
  character,
  tooltips,
  className,
  itemClassName,
  characterClassName,
  activeCharacterClassName,
  inactiveCharacterClassName,
  clearLabel = 'clear rating',
  style,
  children,
  onChange,
  onHoverChange,
  onBlur,
  onFocus,
  onKeyDown,
  ...rest
}) => {
  const CompiledRow1 = ({ rowArg0 }: { rowArg0: any }) => {
    const index = rowArg0

    const itemValue = index + 1
    const fill = clamp(displayValue.get() - index, 0, 1)
    const checked = mergedValue.get() >= itemValue
    const hovered = hoveredValue.value !== null && displayValue.get() >= itemValue
    const tooltipTitle = resolveTooltipTitle(tooltips, index)
    const characterContext = {
      index,
      value: itemValue,
      fill,
      checked,
      hovered,
      half: mergedAllowHalf.get(),
    }
    const wrapperClassName = buildCharacterWrapperClassName(size, characterClassName)
    const resolvedInactiveCharacterClassName = inactiveCharacterClassName ?? 'text-base-content/35'
    const resolvedActiveCharacterClassName = activeCharacterClassName ?? 'text-orange-400'
    const tabIndex = disabled
      ? -1
      : mergedValue.get() > 0
        ? Math.ceil(mergedValue.get()) - 1 === index
          ? 0
          : -1
        : index === 0
          ? 0
          : -1

    return (
      <button
        key={`${renderedName.get()}-${index}`}
        type="button"
        role="button"
        title={tooltipTitle}
        aria-label={tooltipTitle ?? `${itemValue} star`}
        aria-disabled={disabled ? 'true' : undefined}
        aria-pressed={fill > 0 ? 'true' : 'false'}
        tabIndex={tabIndex}
        disabled={disabled}
        className={buildAutoButtonClassName(
          interactive.get(),
          useLegacyMaskDefault.get(),
          itemClassName,
        )}
        data-rating-index={String(index)}
        data-rating-fill={String(fill)}
        data-rating-current={mergedValue.get() === itemValue ? 'true' : undefined}
        onFocus={(event: FocusEvent) => {
          if (onFocus) onFocus(event as any)
        }}
        onBlur={(event: FocusEvent) => {
          if (onBlur) onBlur(event as any)
        }}
        onMouseMove={(event: MouseEvent) => {
          if (!interactive.get()) return
          const nextValue = resolvePointerValue(event as any, index, mergedAllowHalf.get())
          if (hoverIntent !== nextValue) {
            hoverIntent = nextValue
            ;(event.currentTarget as HTMLElement | null)
              ?.closest('[data-rating-mode="auto"]')
              ?.setAttribute('data-rating-hover', String(nextValue))
            emitHoverChange(nextValue)
          }
        }}
        onClick={(event: MouseEvent) => {
          event.preventDefault?.()
          commitValue(resolvePointerValue(event as any, index, mergedAllowHalf.get()))
        }}
        onKeyDown={(event: KeyboardEvent) => handleKeyCommit(event as any, index)}
      >
        {useLegacyMaskDefault.get() ? (
          <span
            className={buildLegacyMaskClassName(fill, !!disabled, characterClassName)}
            style={{ opacity: resolveLegacyMaskOpacity(fill, !!disabled) }}
            aria-hidden="true"
            data-rating-legacy-mask="true"
          />
        ) : (
          <span className="relative inline-flex">
            <span
              className={appendClassName(
                wrapperClassName,
                disabled ? 'text-base-content/20' : resolvedInactiveCharacterClassName,
              )}
              aria-hidden="true"
            >
              {character != null ? (
                <span data-rating-character="custom">
                  {String(
                    typeof character === 'function' ? character(characterContext) : character,
                  )}
                </span>
              ) : (
                <DefaultStarIcon />
              )}
            </span>
            <span
              className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
              aria-hidden="true"
              data-rating-active-layer="true"
            >
              <span
                className={appendClassName(
                  wrapperClassName,
                  disabled ? 'text-base-content/45' : resolvedActiveCharacterClassName,
                )}
              >
                {character != null ? (
                  <span data-rating-character="custom">
                    {String(
                      typeof character === 'function' ? character(characterContext) : character,
                    )}
                  </span>
                ) : (
                  <DefaultStarIcon />
                )}
              </span>
            </span>
          </span>
        )}
        {allowClear &&
        interactive.get() &&
        mergedValue.get() > 0 &&
        mergedValue.get() === itemValue ? (
          <span className="sr-only">{clearLabel}</span>
        ) : null}
      </button>
    )
  }

  const generatedName = `rue-rating-${ratingSeed++}`
  const mergedAllowHalf = computed(() => allowHalf ?? half ?? false)
  const mergedCount = computed(() => normalizeCount(count))
  const controlledValue = computed(() =>
    typeof value === 'number'
      ? normalizeRatingValue(value, mergedAllowHalf.get(), mergedCount.get())
      : undefined,
  )
  const uncontrolledValue = ref(
    normalizeRatingValue(defaultValue ?? value ?? 0, mergedAllowHalf.get(), mergedCount.get()),
  )
  const hoveredValue = ref<number | null>(null)
  let hoverIntent: number | null = null
  const mergedValue = computed(() => {
    const nextControlledValue = controlledValue.get()
    if (nextControlledValue !== undefined) return nextControlledValue
    return normalizeRatingValue(uncontrolledValue.value, mergedAllowHalf.get(), mergedCount.get())
  })
  const displayValue = computed(() => hoveredValue.value ?? mergedValue.get())
  const interactive = computed(() => !disabled && !readOnly)
  const useLegacyMaskDefault = computed(() => character == null && !mergedAllowHalf.get())
  const renderedName = computed(() => name ?? generatedName)
  const buttonIndexes = computed(() =>
    Array.from({ length: mergedCount.get() }, (_, index) => index),
  )
  const { onMouseLeave: externalMouseLeave, ...restProps } = rest as {
    onMouseLeave?: (event: MouseEvent) => void
    [key: string]: any
  }

  const emitHoverChange = (nextValue: number) => {
    if (onHoverChange) onHoverChange(nextValue)
  }

  /**
   * hover 态只用于预览分值；离开根节点后统一回落到真实值，避免每个 item 自己做清理导致闪烁。
   */
  const clearHover = () => {
    if (hoverIntent !== null) {
      hoverIntent = null
      emitHoverChange(0)
    }
  }

  const commitValue = (rawValue: number) => {
    if (!interactive.get()) return
    const normalizedNext = normalizeRatingValue(rawValue, mergedAllowHalf.get(), mergedCount.get())
    const nextValue = allowClear && mergedValue.get() === normalizedNext ? 0 : normalizedNext

    if (controlledValue.get() === undefined) {
      uncontrolledValue.value = nextValue
    }
    hoveredValue.value = null
    emitHoverChange(0)
    if (onChange) onChange(nextValue)
  }

  provideContext(RatingCompositionContext, () => ({
    managed: typeof value === 'number' || typeof defaultValue === 'number' || !!onChange,
    disabled: !!disabled,
    readOnly: !!readOnly,
    name: renderedName.get(),
    readValue: () => mergedValue.get(),
    commitValue,
  }))

  const step = computed(() => (mergedAllowHalf.get() ? 0.5 : 1))

  const handleKeyCommit = (event: Event, index: number) => {
    const nativeEvent = event as KeyboardEvent
    const key = nativeEvent.key
    let nextValue: number | null = null

    if (key === 'ArrowRight' || key === 'ArrowUp') {
      nextValue = clamp(
        mergedValue.get() + step.get(),
        allowClear ? 0 : step.get(),
        mergedCount.get(),
      )
    } else if (key === 'ArrowLeft' || key === 'ArrowDown') {
      nextValue = clamp(
        mergedValue.get() - step.get(),
        allowClear ? 0 : step.get(),
        mergedCount.get(),
      )
    } else if (key === 'Home') {
      nextValue = allowClear ? 0 : step.get()
    } else if (key === 'End') {
      nextValue = mergedCount.get()
    } else if ((key === 'Backspace' || key === 'Delete') && allowClear) {
      nextValue = 0
    } else if (key === ' ' || key === 'Enter') {
      nextValue = index + 1
    }

    if (nextValue === null) {
      if (onKeyDown) onKeyDown(event)
      return
    }

    nativeEvent.preventDefault?.()
    if (nextValue === 0) {
      if (controlledValue.get() === undefined) {
        uncontrolledValue.value = 0
      }
      hoveredValue.value = null
      emitHoverChange(0)
      if (interactive.get() && onChange) onChange(0)
    } else {
      commitValue(nextValue)
    }

    if (onKeyDown) onKeyDown(event)
  }

  const compositionMode = hasRenderableChildren(children)

  return (
    <div
      {...restProps}
      style={style}
      className={
        compositionMode
          ? buildManualRootClassName(size, mergedAllowHalf.get(), className)
          : buildAutoRootClassName(
              size,
              !!disabled,
              !!readOnly,
              useLegacyMaskDefault.get(),
              className,
            )
      }
      data-rating-mode={compositionMode ? 'composition' : 'auto'}
      data-rating-value={String(mergedValue.get())}
      data-rating-hover={
        compositionMode ? undefined : hoveredValue.value == null ? '' : String(hoveredValue.value)
      }
      data-rating-name={renderedName.get()}
      onMouseLeave={(event: MouseEvent) => {
        if (!compositionMode) {
          clearHover()
          ;(event.currentTarget as HTMLElement | null)?.setAttribute('data-rating-hover', '')
        }
        if (externalMouseLeave) externalMouseLeave(event as any)
      }}
    >
      {compositionMode ? (
        children
      ) : (
        <>
          {name ? (
            <input
              type="hidden"
              name={name}
              value={mergedValue.get()}
              disabled={disabled}
              data-rating-hidden="true"
            />
          ) : null}
          {buttonIndexes.get().map((rowArg0: any, rowIndex: number) => (
            <CompiledRow1 rowArg0={rowArg0} />
          ))}
        </>
      )}
    </div>
  )
}

type RatingCompound = FC<RatingProps> & {
  Item: FC<RatingItemProps>
}

const RatingCompound: RatingCompound = /*#__PURE__*/ Object.assign(RatingRoot, {
  Item,
})

/** 默认导出评分组件。 */
export default RatingCompound
