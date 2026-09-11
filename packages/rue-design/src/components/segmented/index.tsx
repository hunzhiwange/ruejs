/*
Segmented 模块概述
- 汇总分段控制组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'
import { computed, onMounted, onUnmounted, onUpdated, ref, useRef, watch } from '@rue-js/rue'

let segmentedNameSeed = 0
/** SEGMENTED_THUMB_TRANSITION_MS 内部常量。 */
const SEGMENTED_THUMB_TRANSITION_MS = 420
/** SEGMENTED_THUMB_TRANSITION_EASING 内部常量。 */
const SEGMENTED_THUMB_TRANSITION_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

/** SegmentedValue 值类型。 */
export type SegmentedValue = string | number
/** SegmentedOrientation 类型。 */
export type SegmentedOrientation = 'horizontal' | 'vertical'
/** SegmentedShape 类型。 */
export type SegmentedShape = 'default' | 'round'
/** SegmentedSize 尺寸类型。 */
export type SegmentedSize = 'small' | 'default' | 'middle' | 'medium' | 'large' | 'sm' | 'md' | 'lg'

/** SegmentedSemanticClassNames 局部类名配置。 */
export interface SegmentedSemanticClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** item 区域配置。 */
  item?: string
  /** 图标内容。 */
  icon?: string
  /** 展示标签。 */
  label?: string
}

/** SegmentedSemanticStyles 局部样式配置。 */
export interface SegmentedSemanticStyles {
  /** 根节点区域配置。 */
  root?: any
  /** item 区域配置。 */
  item?: any
  /** 图标内容。 */
  icon?: string
  /** 展示标签。 */
  label?: string | number
}

/** SegmentedLabeledOption 选项配置。 */
export interface SegmentedLabeledOption<ValueType = SegmentedValue> {
  /** 受控值。 */
  value: ValueType
  /** 展示标签。 */
  label?: string | number
  /** 图标内容。 */
  icon?: string
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 标题内容。 */
  title?: string
  /** tooltip 配置项。 */
  tooltip?: string | { title?: any }
  /** ariaLabel 标签内容。 */
  wrapLabel?: boolean
  ariaLabel?: string
}

/** SegmentedOptions 类型。 */
export type SegmentedOptions<ValueType = SegmentedValue> = Array<
  ValueType | SegmentedLabeledOption<ValueType>
>

type SegmentedSemanticInput<T> = T | ((info: { props: SegmentedProps<any> }) => T)

/** SegmentedProps 组件属性。 */
export interface SegmentedProps<ValueType = SegmentedValue> {
  /** 可选项数据。 */
  options?: SegmentedOptions<ValueType>
  /** 受控值。 */
  value?: ValueType
  /** 非受控初始值。 */
  defaultValue?: ValueType
  /** 是否禁用交互。 */
  disabled?: boolean
  /** block 配置项。 */
  block?: boolean
  /** 组件尺寸。 */
  size?: SegmentedSize
  /** vertical 配置项。 */
  vertical?: boolean
  /** orientation 配置项。 */
  orientation?: SegmentedOrientation
  /** 组件形状。 */
  shape?: SegmentedShape
  /** 表单 name 属性或分组名称。 */
  name?: string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 按局部区域覆盖的类名集合。 */
  classNames?: SegmentedSemanticInput<SegmentedSemanticClassNames>
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: SegmentedSemanticInput<SegmentedSemanticStyles>
  /** 值或状态变化时触发的回调。 */
  onChange?: (value: ValueType) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedSegmentedOption<ValueType = SegmentedValue> {
  value: ValueType
  label: string | number | null
  icon?: string
  disabled: boolean
  className?: string
  style?: any
  title?: string
  tooltip?: string | { title?: any }
  wrapLabel?: boolean
  ariaLabel?: string
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base?: string, className?: string) => {
  if (!base) return className ?? ''
  return className ? `${base} ${className}` : base
}

/** merge Styles 的内部工具函数。 */
const mergeStyles = (...styles: any[]) => {
  const resolved = styles.filter(Boolean)
  if (!resolved.length) return undefined
  return Object.assign({}, ...resolved)
}

/** serialize Value 的内部工具函数。 */
const serializeValue = (value: unknown) => {
  if (value === undefined) return '__undefined__'
  if (value === null) return '__null__'
  return `${typeof value}:${String(value)}`
}

const isServerRendering = () => {
  const count = (globalThis as Record<string, unknown>).__rue_is_server_rendering__
  return typeof count === 'number' && count > 0
}

/** 判断 Option Object 的内部工具函数。 */
const isOptionObject = <ValueType,>(
  option: unknown,
): option is SegmentedLabeledOption<ValueType> => {
  return !!option && typeof option === 'object' && !Array.isArray(option) && 'value' in option
}

/** 解析 Tooltip Title 的内部工具函数。 */
const resolveTooltipTitle = (tooltip?: string | { title?: any }) => {
  if (typeof tooltip === 'string') return tooltip
  if (tooltip && typeof tooltip === 'object' && tooltip.title != null) {
    return String(tooltip.title)
  }
  return undefined
}

/** 解析 Orientation 的内部工具函数。 */
const resolveOrientation = (
  orientation?: SegmentedOrientation,
  vertical?: boolean,
): SegmentedOrientation => {
  if (orientation === 'horizontal' || orientation === 'vertical') return orientation
  return vertical ? 'vertical' : 'horizontal'
}

/** 解析 Size Config 的内部工具函数。 */
const resolveSizeConfig = (size?: SegmentedSize) => {
  switch (size) {
    case 'small':
    case 'sm':
      return {
        trackClassName: 'gap-1 p-1',
        itemClassName: 'min-h-8 px-3 text-xs',
        iconClassName: 'size-3.5',
      }
    case 'large':
    case 'lg':
      return {
        trackClassName: 'gap-1.5 p-1.5',
        itemClassName: 'min-h-12 px-5 text-base',
        iconClassName: 'size-5',
      }
    default:
      return {
        trackClassName: 'gap-1.5 p-1.5',
        itemClassName: 'min-h-10 px-4 text-sm',
        iconClassName: 'size-4',
      }
  }
}

/** 解析 Shape Class Name 的内部工具函数。 */
const resolveShapeClassName = (shape?: SegmentedShape) => {
  if (shape === 'round') {
    return {
      root: 'rounded-[999px]',
      item: 'rounded-[999px]',
    }
  }

  return {
    root: 'rounded-[1.35rem]',
    item: 'rounded-[1rem]',
  }
}

/** 归一化 Options 的内部工具函数。 */
const normalizeOptions = <ValueType,>(options?: SegmentedOptions<ValueType>) => {
  return (options ?? []).map<NormalizedSegmentedOption<ValueType>>(option => {
    if (!isOptionObject<ValueType>(option)) {
      return {
        value: option,
        label: String(option),
        disabled: false,
      }
    }

    const hasExplicitLabel = Object.prototype.hasOwnProperty.call(option, 'label')

    return {
      value: option.value,
      label: hasExplicitLabel
        ? (option.label ?? null)
        : option.icon != null
          ? null
          : String(option.value),
      icon: option.icon,
      disabled: !!option.disabled,
      className: option.className,
      style: option.style,
      title: option.title,
      tooltip: option.tooltip,
      ariaLabel: option.ariaLabel,
      wrapLabel: option.wrapLabel,
    }
  })
}

/** find Option 的内部工具函数。 */
const findOption = <ValueType,>(
  options: NormalizedSegmentedOption<ValueType>[],
  value: unknown,
): NormalizedSegmentedOption<ValueType> | undefined => {
  const serialized = serializeValue(value)
  return options.find(option => serializeValue(option.value) === serialized)
}

/** 解析 Fallback Option 的内部工具函数。 */
const resolveFallbackOption = <ValueType,>(options: NormalizedSegmentedOption<ValueType>[]) => {
  return options.find(option => !option.disabled) ?? options[0]
}

/** 解析 Uncontrolled Value 的内部工具函数。 */
const resolveUncontrolledValue = <ValueType,>(
  currentValue: unknown,
  options: NormalizedSegmentedOption<ValueType>[],
  defaultValue: unknown,
) => {
  return (
    findOption(options, currentValue)?.value ??
    findOption(options, defaultValue)?.value ??
    resolveFallbackOption(options)?.value
  )
}

/** 解析 Semantic Config 的内部工具函数。 */
const resolveSemanticConfig = <T,>(
  input: SegmentedSemanticInput<T> | undefined,
  props: SegmentedProps<any>,
) => {
  if (!input) return undefined
  if (typeof input === 'function') {
    return (input as (info: { props: SegmentedProps<any> }) => T)({ props })
  }
  return input
}

/** 解析 Accessible Label 的内部工具函数。 */
const resolveAccessibleLabel = <ValueType,>(option: NormalizedSegmentedOption<ValueType>) => {
  if (option.ariaLabel) return option.ariaLabel
  if (typeof option.label === 'string' || typeof option.label === 'number')
    return String(option.label)
  if (option.title) return option.title
  return String(option.value)
}

/** Segmented 的内部工具函数。 */
const Segmented: FC<SegmentedProps<any>> = props => {
  const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const option = rowArg0
    const index = rowArg1

    const checked = computed(
      () => serializeValue(option.value) === serializeValue(uncontrolledValueRef.value),
    )
    const optionDisabled = disabled || option.disabled
    const tooltipTitle = resolveTooltipTitle(option.tooltip) ?? option.title
    const fallbackLabel = option.label ?? String(option.value)
    const hasVisibleLabel = option.label != null
    const isIconOnly = option.icon != null && !hasVisibleLabel

    let itemClassName = appendClassName(
      'relative z-[1] inline-flex w-full select-none items-center justify-center gap-2 overflow-hidden border font-medium leading-tight transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/25',
      sizeConfig.itemClassName,
    )

    itemClassName = appendClassName(itemClassName, shapeConfig.item)
    itemClassName = appendClassName(
      itemClassName,
      mergedOrientation === 'vertical' ? 'justify-start text-left' : 'text-center',
    )
    itemClassName = appendClassName(itemClassName, isIconOnly ? 'gap-0' : undefined)
    itemClassName = appendClassName(
      itemClassName,
      block || mergedOrientation === 'vertical' ? 'w-full' : 'min-w-[3.5rem]',
    )
    if (block && mergedOrientation !== 'vertical') {
      itemClassName = appendClassName(itemClassName, 'flex-1')
    }
    itemClassName = appendClassName(
      itemClassName,
      'data-[state=checked]:border-base-100/90 data-[state=checked]:bg-base-100 data-[state=checked]:text-base-content data-[state=checked]:shadow-[0_14px_30px_-22px_rgba(15,23,42,0.7),0_1px_0_rgba(255,255,255,0.75)_inset] data-[state=unchecked]:border-transparent data-[state=unchecked]:text-base-content/70 data-[state=unchecked]:hover:border-base-100/70 data-[state=unchecked]:hover:bg-base-100/65 data-[state=unchecked]:hover:text-base-content',
    )
    itemClassName = appendClassName(
      itemClassName,
      'data-[disabled=false]:cursor-pointer data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-40',
    )
    itemClassName = appendClassName(itemClassName, semanticClassNames.item)
    itemClassName = appendClassName(itemClassName, option.className)

    const iconClassName = appendClassName(
      'inline-flex shrink-0 items-center justify-center opacity-85',
      sizeConfig.iconClassName,
    )
    const plainTextLabel = typeof option.label === 'string' || typeof option.label === 'number'
    let labelClassName = appendClassName(
      mergedOrientation === 'vertical' || option.icon == null ? 'min-w-0 flex-1' : 'min-w-0',
      mergedOrientation === 'vertical' ? 'text-left' : 'text-center',
    )
    labelClassName = appendClassName(
      labelClassName,
      !option.wrapLabel && plainTextLabel && mergedOrientation !== 'vertical'
        ? 'whitespace-nowrap'
        : 'whitespace-normal',
    )

    return (
      <button
        key={serializeValue(option.value) || `segmented-option-${index}`}
        type="button"
        role="radio"
        aria-checked={checked.get() ? 'true' : 'false'}
        aria-disabled={optionDisabled ? 'true' : undefined}
        aria-label={resolveAccessibleLabel(option)}
        title={tooltipTitle}
        className={itemClassName}
        style={mergeStyles(semanticStyles.item, option.style)}
        data-state={checked.get() ? 'checked' : 'unchecked'}
        data-disabled={optionDisabled ? 'true' : 'false'}
        data-rue-segmented-value={serializeValue(option.value)}
        data-rue-segmented-option-disabled={option.disabled ? 'true' : 'false'}
        onClick={() => {
          handleSelect(option.value, optionDisabled)
        }}
      >
        {option.icon != null ? (
          <span
            className={appendClassName(iconClassName, semanticClassNames.icon)}
            style={semanticStyles.icon}
            data-rue-segmented-icon-host="true"
            data-rue-segmented-managed-kind="icon"
          >
            {String(option.icon)}
          </span>
        ) : null}
        {hasVisibleLabel ? (
          <span
            className={appendClassName(labelClassName, semanticClassNames.label)}
            style={semanticStyles.label}
            data-rue-segmented-label-host="true"
            data-rue-segmented-managed-kind="label"
          >
            {String(option.label)}
          </span>
        ) : (
          <span className="sr-only">{String(fallbackLabel)}</span>
        )}
      </button>
    )
  }

  const {
    options = [],
    value,
    defaultValue,
    disabled = false,
    block = false,
    size = 'middle',
    vertical,
    orientation,
    shape = 'default',
    name,
    className,
    style,
    classNames,
    styles,
    onChange,
    ...rest
  } = props

  const generatedNameRef = ref(`rue-segmented-${++segmentedNameSeed}`)
  const rootRef = useRef<HTMLDivElement>()
  const resizeObserverRef = useRef<ResizeObserver>()
  const thumbHideTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const thumbFrameRef = useRef<number>()
  const normalizedOptions = normalizeOptions(options)
  const normalizedOptionsRef = ref(normalizedOptions)
  const uncontrolledValueRef = ref<any>(
    resolveUncontrolledValue(undefined, normalizedOptionsRef.value, defaultValue ?? value),
  )
  const controlledValueSignatureRef = ref(
    value !== undefined ? serializeValue(value) : '__uncontrolled__',
  )
  const thumbVisibleRef = ref(false)
  const thumbAnimatingRef = ref(false)
  const semanticClassNames = resolveSemanticConfig(classNames, props) ?? {}
  const semanticStyles = resolveSemanticConfig(styles, props) ?? {}
  const sizeConfig = resolveSizeConfig(size)
  const shapeConfig = resolveShapeClassName(shape)
  const mergedOrientation = resolveOrientation(orientation, vertical)

  const activeValue = computed(() => uncontrolledValueRef.value)
  const activeSerializedValue = serializeValue(activeValue.get())
  const mergedName = name ?? generatedNameRef.value

  const setRootRef = (element: HTMLDivElement | null) => {
    if (element) {
      rootRef.current = element
    }
  }

  const clearThumbMotion = () => {
    if (thumbHideTimerRef.current !== undefined) {
      clearTimeout(thumbHideTimerRef.current)
      thumbHideTimerRef.current = undefined
    }

    if (thumbFrameRef.current !== undefined && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(thumbFrameRef.current)
      thumbFrameRef.current = undefined
    }
  }

  const flushManagedDomSync = () => {
    syncDom()
  }

  const scheduleSyncDom = () => {
    if (isServerRendering()) return
    if (typeof queueMicrotask === 'function') queueMicrotask(flushManagedDomSync)
    else Promise.resolve().then(flushManagedDomSync)
  }

  const syncControlledStateFromProps = () => {
    const currentOptions = normalizedOptionsRef.value

    if (props.value !== undefined) {
      controlledValueSignatureRef.value = serializeValue(props.value)
      uncontrolledValueRef.value =
        findOption(currentOptions, props.value)?.value ??
        resolveFallbackOption(currentOptions)?.value
      return
    }

    controlledValueSignatureRef.value = '__uncontrolled__'
    uncontrolledValueRef.value = resolveUncontrolledValue(
      uncontrolledValueRef.value,
      currentOptions,
      props.defaultValue,
    )
  }

  const syncThumbFromElement = (element: HTMLElement | null) => {
    const root = rootRef.current

    if (!root) return

    const thumb = root.querySelector('[data-rue-segmented-thumb="true"]') as HTMLSpanElement | null

    if (!thumb || !element) {
      if (thumb) thumb.style.opacity = '0'
      return
    }

    const rootRect = root.getBoundingClientRect()
    const itemRect = element.getBoundingClientRect()
    const left = Math.max(0, itemRect.left - rootRect.left)
    const top = Math.max(0, itemRect.top - rootRect.top)

    thumb.style.opacity = '1'
    thumb.style.width = `${itemRect.width}px`
    thumb.style.height = `${itemRect.height}px`
    thumb.style.transform = `translate3d(${left}px, ${top}px, 0)`
  }

  const connectResizeObserver = (element: HTMLElement | null) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
      resizeObserverRef.current = undefined
    }

    if (!element || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      syncDom()
    })

    observer.observe(element)
    resizeObserverRef.current = observer
  }

  const syncDom = () => {
    const root = rootRef.current

    if (!root) return

    const selectedSerializedValue = serializeValue(uncontrolledValueRef.value)
    const checkedItem =
      Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-rue-segmented-value]')).find(
        item => item.dataset.rueSegmentedValue === selectedSerializedValue,
      ) ?? null

    if (!thumbVisibleRef.value) {
      syncThumbFromElement(null)
      return
    }

    if (!thumbAnimatingRef.value) {
      syncThumbFromElement(checkedItem)
    }
  }

  onMounted(() => {
    if (isServerRendering()) return
    connectResizeObserver(rootRef.current ?? null)
    scheduleSyncDom()
  })

  onUpdated(() => {
    scheduleSyncDom()
  })

  onUnmounted(() => {
    clearThumbMotion()
    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = undefined
    rootRef.current = undefined
  })

  watch(
    () => uncontrolledValueRef.value,
    () => {
      scheduleSyncDom()
    },
    { immediate: true },
  )

  watch(
    () => props.options,
    nextOptions => {
      normalizedOptionsRef.value = normalizeOptions(
        nextOptions as SegmentedOptions<any> | undefined,
      )
      syncControlledStateFromProps()
      scheduleSyncDom()
    },
    { immediate: true },
  )

  watch(
    () => props.value,
    () => {
      syncControlledStateFromProps()
      scheduleSyncDom()
    },
    { immediate: true },
  )

  watch(
    () => props.defaultValue,
    () => {
      if (props.value !== undefined) return

      syncControlledStateFromProps()
      scheduleSyncDom()
    },
    { immediate: true },
  )

  watch(
    () => props.disabled,
    () => {
      scheduleSyncDom()
    },
    { immediate: true },
  )

  watch(
    () => props.name,
    () => {
      scheduleSyncDom()
    },
    { immediate: true },
  )

  let rootClassName = appendClassName(
    'rue-segmented relative isolate inline-flex max-w-full overflow-hidden border border-base-300/70 bg-base-200/75 text-base-content shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm',
    sizeConfig.trackClassName,
  )

  rootClassName = appendClassName(rootClassName, shapeConfig.root)
  rootClassName = appendClassName(
    rootClassName,
    mergedOrientation === 'vertical' ? 'flex-col items-stretch' : 'flex-row items-stretch',
  )
  if (block) rootClassName = appendClassName(rootClassName, 'w-full')
  if (disabled) rootClassName = appendClassName(rootClassName, 'opacity-80')
  rootClassName = appendClassName(rootClassName, semanticClassNames.root)
  rootClassName = appendClassName(rootClassName, className)

  let thumbClassName =
    'pointer-events-none absolute left-0 top-0 opacity-0 border border-base-100/90 bg-base-100 shadow-[0_14px_30px_-22px_rgba(15,23,42,0.7),0_1px_0_rgba(255,255,255,0.75)_inset] transition-[transform,width,height,opacity] will-change-transform'
  thumbClassName = appendClassName(thumbClassName, shapeConfig.item)

  const handleSelect = (nextValue: any, optionDisabled: boolean) => {
    if (props.disabled || optionDisabled) return
    if (serializeValue(nextValue) === serializeValue(uncontrolledValueRef.value)) return

    const previousSerializedValue = serializeValue(uncontrolledValueRef.value)
    const nextSerializedValue = serializeValue(nextValue)
    const previousItem = rootRef.current?.querySelector(
      `button[data-rue-segmented-value="${previousSerializedValue}"]`,
    ) as HTMLButtonElement | null
    const nextItem = rootRef.current?.querySelector(
      `button[data-rue-segmented-value="${nextSerializedValue}"]`,
    ) as HTMLButtonElement | null

    clearThumbMotion()

    if (previousItem && nextItem && previousItem !== nextItem) {
      thumbVisibleRef.value = true
      thumbAnimatingRef.value = true
      syncThumbFromElement(previousItem)
    } else {
      thumbVisibleRef.value = false
      thumbAnimatingRef.value = false
    }

    uncontrolledValueRef.value = nextValue
    syncDom()
    if (onChange) onChange(nextValue)

    if (previousItem && nextItem && previousItem !== nextItem) {
      const moveThumb = () => {
        thumbFrameRef.current = undefined
        thumbAnimatingRef.value = false
        syncThumbFromElement(nextItem)
        thumbHideTimerRef.current = setTimeout(() => {
          thumbVisibleRef.value = false
          syncDom()
          thumbHideTimerRef.current = undefined
        }, SEGMENTED_THUMB_TRANSITION_MS)
      }

      if (typeof requestAnimationFrame === 'function') {
        thumbFrameRef.current = requestAnimationFrame(moveThumb)
      } else {
        thumbHideTimerRef.current = setTimeout(() => {
          thumbHideTimerRef.current = undefined
          moveThumb()
        }, 16)
      }
    }

    scheduleSyncDom()
  }

  return (
    <div
      {...rest}
      ref={setRootRef}
      className={rootClassName}
      style={mergeStyles(semanticStyles.root, style)}
      role="radiogroup"
      aria-disabled={disabled ? 'true' : undefined}
      data-orientation={mergedOrientation}
      data-shape={shape}
      data-size={size}
    >
      <span
        aria-hidden="true"
        className={thumbClassName}
        style={{
          transitionDuration: `${SEGMENTED_THUMB_TRANSITION_MS}ms`,
          transitionTimingFunction: SEGMENTED_THUMB_TRANSITION_EASING,
        }}
        data-rue-segmented-thumb="true"
      />
      {name ? (
        <input
          type="hidden"
          name={mergedName}
          value={activeValue.get() == null ? '' : String(activeValue.get())}
          disabled={disabled}
          data-rue-segmented-hidden="true"
        />
      ) : null}
      {normalizedOptions.map((rowArg0: any, rowArg1: number) => (
        <CompiledRow1 rowArg0={rowArg0} rowArg1={rowArg1} />
      ))}
    </div>
  )
}

/** 默认导出分段控制组件。 */
export default Segmented
