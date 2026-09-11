/*
Diff 模块概述
- 汇总差异对比组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'
import { onMounted, onUnmounted, ref, useRef, watch } from '@rue-js/rue'

type StyleValue = string | number | null | undefined

interface StyleObject {
  [key: string]: StyleValue
}

type DiffStyle = string | StyleObject

interface PendingDiffChange {
  value: number
  event: Event
}

/** DiffProps 组件属性。 */
export interface DiffProps {
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: DiffStyle
  /** tabIndex 配置项。 */
  tabIndex?: number
  /** 受控值。 */
  value?: number
  /** 非受控初始值。 */
  defaultValue?: number
  /** min 配置项。 */
  min?: number
  /** max 配置项。 */
  max?: number
  /** step 配置项。 */
  step?: number
  /** 是否禁用交互。 */
  disabled?: boolean
  /** item1 配置项。 */
  item1?: any
  /** item2 配置项。 */
  item2?: any
  /** item1Label 标签内容。 */
  item1Label?: any
  /** item2Label 标签内容。 */
  item2Label?: any
  /** resizerContent 配置项。 */
  resizerContent?: any
  /** 组件子内容。 */
  children?: any
  /** 值或状态变化时触发的回调。 */
  onChange?: (value: number, event: Event) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** DiffItemProps 组件属性。 */
export interface DiffItemProps {
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: DiffStyle
  /** role 配置项。 */
  role?: string
  /** tabIndex 配置项。 */
  tabIndex?: number
  /** 展示标签。 */
  label?: any
  /** labelClassName 附加类名。 */
  labelClassName?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** DiffResizerProps 组件属性。 */
export interface DiffResizerProps {
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: DiffStyle
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** 转换为 Kebab Case 的内部工具函数。 */
const toKebabCase = (value: string) => value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)

/** serialize Style 的内部工具函数。 */
const serializeStyle = (style?: DiffStyle) => {
  if (!style) {
    return ''
  }
  if (typeof style === 'string') {
    return style.trim()
  }

  return Object.entries(style)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key.startsWith('--') ? key : toKebabCase(key)}:${String(value)}`)
    .join('; ')
}

/** merge Style 的内部工具函数。 */
const mergeStyle = (...styles: Array<DiffStyle | undefined>) => {
  return styles
    .map(style => serializeStyle(style))
    .filter(Boolean)
    .join('; ')
}

/** 解析 Style Attr 的内部工具函数。 */
const resolveStyleAttr = (style?: DiffStyle) => {
  return serializeStyle(style) || undefined
}

const diffRootLayoutStyle: StyleObject = {
  display: 'grid',
  justifyContent: 'normal',
  alignItems: 'stretch',
}

/** clamp 的内部工具函数。 */
const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min
  if (value > max) return max
  return value
}

/** 转换为 Finite Number 的内部工具函数。 */
const toFiniteNumber = (value: any, fallback: number) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

/** 解析 Bounds 的内部工具函数。 */
const resolveBounds = (min?: number, max?: number) => {
  const resolvedMin = toFiniteNumber(min, 0)
  const resolvedMax = toFiniteNumber(max, 100)
  if (resolvedMax <= resolvedMin) {
    return { min: resolvedMin, max: resolvedMin + 1 }
  }
  return { min: resolvedMin, max: resolvedMax }
}

/** 解析 Step 的内部工具函数。 */
const resolveStep = (step?: number) => {
  const resolvedStep = toFiniteNumber(step, 1)
  return resolvedStep > 0 ? resolvedStep : 1
}

/** 解析 Value 的内部工具函数。 */
const resolveValue = (value: any, min: number, max: number, fallback: number) => {
  return clamp(toFiniteNumber(value, fallback), min, max)
}

/** 解析 Percent 的内部工具函数。 */
const resolvePercent = (value: number, min: number, max: number) => {
  return ((value - min) / (max - min)) * 100
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 渲染 Quick Item Content 的内部工具函数。 */
const RenderQuickItemContent = ({ arg0: content }: { arg0: any }) => {
  return <div className="relative h-full [&>*]:h-full [&>*]:w-full [&>*]:max-w-none">{content}</div>
}

/** 判断是否存在 Renderable Children 的内部工具函数。 */
const hasRenderableChildren = (children: any) =>
  children != null && children !== false && children !== ''

/** assign Forwarded Ref 的内部工具函数。 */
const assignForwardedRef = (forwardedRef: any, element: HTMLElement | null) => {
  if (typeof forwardedRef === 'function') {
    forwardedRef(element)
    return
  }
  if (forwardedRef && typeof forwardedRef === 'object') {
    forwardedRef.current = element ?? undefined
  }
}

/** 获取 Quick Position 样式的内部工具函数。 */
const getQuickPositionStyle = (percent: number) => {
  return serializeStyle({
    '--rue-diff-position': `${percent}%`,
  })
}

/** 获取 Quick Item1 样式的内部工具函数。 */
const getQuickItem1Style = () => {
  return serializeStyle({
    clipPath: 'inset(0 calc(100% - var(--rue-diff-position, 50%)) 0 0)',
  })
}

/** 获取 Quick Item2 样式的内部工具函数。 */
const getQuickItem2Style = () => {
  return serializeStyle({
    clipPath: 'inset(0 0 0 var(--rue-diff-position, 50%))',
  })
}

/** 获取 Quick Resizer 样式的内部工具函数。 */
const getQuickResizerStyle = () => {
  return serializeStyle({
    left: 'var(--rue-diff-position, 50%)',
    width: 0,
    minWidth: 0,
    maxWidth: 0,
    clipPath: 'none',
    overflow: 'visible',
    opacity: 1,
    resize: 'none',
    transform: 'translateX(-50%)',
  })
}

/** 获取 Quick Resizer Content 样式的内部工具函数。 */
const getQuickResizerContentStyle = () => {
  return serializeStyle({
    left: 'var(--rue-diff-position, 50%)',
  })
}

/** Item1 的内部工具函数。 */
const Item1: FC<DiffItemProps> = ({
  className,
  style,
  role,
  tabIndex,
  label,
  labelClassName,
  children,
  ...rest
}) => {
  const forwardedRef = rest.ref
  if ('ref' in rest) {
    delete rest.ref
  }

  return (
    <div
      {...rest}
      ref={(element: HTMLDivElement | null) => assignForwardedRef(forwardedRef, element)}
      className={mergeClassName('diff-item-1 relative', className)}
      style={resolveStyleAttr(style)}
      role={role}
      tabIndex={tabIndex}
    >
      {label != null ? (
        <span
          className={mergeClassName(
            'pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-base-100/80 px-3 py-1 text-xs font-medium text-base-content shadow-sm backdrop-blur',
            labelClassName,
          )}
        >
          {label}
        </span>
      ) : null}
      {children}
    </div>
  )
}

/** Item2 的内部工具函数。 */
const Item2: FC<DiffItemProps> = ({
  className,
  style,
  role,
  tabIndex,
  label,
  labelClassName,
  children,
  ...rest
}) => {
  const forwardedRef = rest.ref
  if ('ref' in rest) {
    delete rest.ref
  }

  return (
    <div
      {...rest}
      ref={(element: HTMLDivElement | null) => assignForwardedRef(forwardedRef, element)}
      className={mergeClassName('diff-item-2 relative', className)}
      style={resolveStyleAttr(style)}
      role={role}
      tabIndex={tabIndex}
    >
      {label != null ? (
        <span
          className={mergeClassName(
            'pointer-events-none absolute right-4 top-4 z-10 rounded-full bg-base-100/80 px-3 py-1 text-xs font-medium text-base-content shadow-sm backdrop-blur',
            labelClassName,
          )}
        >
          {label}
        </span>
      ) : null}
      {children}
    </div>
  )
}

/** Resizer 的内部工具函数。 */
const Resizer: FC<DiffResizerProps> = ({ className, style, children, ...rest }) => {
  const forwardedRef = rest.ref
  if ('ref' in rest) {
    delete rest.ref
  }

  return (
    <div
      {...rest}
      ref={(element: HTMLDivElement | null) => assignForwardedRef(forwardedRef, element)}
      className={mergeClassName('diff-resizer', className)}
      style={resolveStyleAttr(style)}
    >
      {children}
    </div>
  )
}

/** Diff 的内部工具函数。 */
const Diff: FC<DiffProps> = ({
  className,
  style,
  tabIndex,
  value,
  defaultValue,
  min,
  max,
  step,
  disabled,
  item1,
  item2,
  item1Label,
  item2Label,
  resizerContent,
  children,
  onChange,
  ...rest
}) => {
  const rootRef = useRef<HTMLElement>()
  const inputRef = useRef<HTMLInputElement>()
  const changeFrameRef = useRef<number>()
  const pendingChangeRef = useRef<PendingDiffChange>()
  const forwardedRef = rest.ref
  if ('ref' in rest) {
    delete rest.ref
  }
  const bounds = resolveBounds(min, max)
  const rangeStep = resolveStep(step)
  const uncontrolledValue = ref(
    resolveValue(defaultValue ?? value ?? 50, bounds.min, bounds.max, 50),
  )
  const controlled = value !== undefined
  const currentValue = controlled
    ? resolveValue(value, bounds.min, bounds.max, uncontrolledValue.value)
    : resolveValue(uncontrolledValue.value, bounds.min, bounds.max, 50)
  const percent = resolvePercent(currentValue, bounds.min, bounds.max)
  const quickMode = !hasRenderableChildren(children) && (item1 !== undefined || item2 !== undefined)
  const rootClassName = quickMode
    ? mergeClassName('diff relative isolate overflow-hidden select-none', className)
    : mergeClassName('diff', className)
  const rootStyle = mergeStyle(
    style,
    diffRootLayoutStyle,
    quickMode ? getQuickPositionStyle(percent) : undefined,
  )

  const assignRootRef = (element: HTMLElement | null) => {
    rootRef.current = element ?? undefined
    assignForwardedRef(forwardedRef, element)
  }

  const syncQuickModeStyles = (nextValue: number) => {
    const nextPercent = resolvePercent(nextValue, bounds.min, bounds.max)
    if (rootRef.current) {
      rootRef.current.style.setProperty('--rue-diff-position', `${nextPercent}%`)
    }
    if (inputRef.current) {
      inputRef.current.setAttribute('aria-valuenow', String(nextValue))
      inputRef.current.value = String(nextValue)
    }
  }

  const flushPendingChange = () => {
    const pendingChange = pendingChangeRef.current
    changeFrameRef.current = undefined
    pendingChangeRef.current = undefined
    if (pendingChange && onChange) {
      onChange(pendingChange.value, pendingChange.event)
    }
  }

  const emitChange = (nextValue: number, event: Event) => {
    if (!onChange) return
    if (
      controlled &&
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function'
    ) {
      pendingChangeRef.current = { value: nextValue, event }
      if (changeFrameRef.current === undefined) {
        changeFrameRef.current = window.requestAnimationFrame(flushPendingChange)
      }
      return
    }
    onChange(nextValue, event)
  }

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    const nextValue = resolveValue(target?.value, bounds.min, bounds.max, currentValue)
    if (!controlled) {
      emitChange(nextValue, event)
    }
    syncQuickModeStyles(nextValue)
    const liveRoot = target?.closest('[data-rue-diff-root="true"]') as HTMLElement | null
    liveRoot?.style.setProperty(
      '--rue-diff-position',
      `${resolvePercent(nextValue, bounds.min, bounds.max)}%`,
    )
  }

  const handleChange = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    const nextValue = resolveValue(target?.value, bounds.min, bounds.max, currentValue)
    syncQuickModeStyles(nextValue)
    if (controlled) {
      emitChange(nextValue, event)
    }
  }

  onMounted(() => {
    if (quickMode) {
      syncQuickModeStyles(currentValue)
    }
  })

  watch(
    () => value,
    nextValue => {
      if (quickMode && controlled) {
        syncQuickModeStyles(
          resolveValue(nextValue, bounds.min, bounds.max, uncontrolledValue.value),
        )
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (
      changeFrameRef.current !== undefined &&
      typeof window !== 'undefined' &&
      typeof window.cancelAnimationFrame === 'function'
    ) {
      window.cancelAnimationFrame(changeFrameRef.current)
    }
    changeFrameRef.current = undefined
    pendingChangeRef.current = undefined
  })

  if (!quickMode) {
    return (
      <figure
        {...rest}
        ref={assignRootRef}
        className={rootClassName}
        style={rootStyle}
        tabIndex={tabIndex}
        aria-disabled={disabled ? 'true' : undefined}
      >
        {children}
      </figure>
    )
  }

  const rangeAriaLabel = rest['aria-label'] ?? 'Diff position'

  return (
    <figure
      {...rest}
      ref={assignRootRef}
      className={rootClassName}
      style={rootStyle}
      tabIndex={undefined}
      aria-disabled={disabled ? 'true' : undefined}
      data-rue-diff-root="true"
    >
      <Item1
        className="absolute inset-0 z-10 overflow-hidden"
        role="img"
        style={getQuickItem1Style()}
        data-rue-diff-item="1"
      >
        <RenderQuickItemContent arg0={item1} />
      </Item1>
      <Item2
        className="absolute inset-0 overflow-hidden after:hidden"
        role="img"
        style={getQuickItem2Style()}
        data-rue-diff-item="2"
      >
        <RenderQuickItemContent arg0={item2} />
      </Item2>
      {item1Label != null ? (
        <span className="pointer-events-none absolute left-4 top-4 z-30 rounded-full bg-base-100/80 px-3 py-1 text-xs font-medium text-base-content shadow-sm backdrop-blur">
          {item1Label}
        </span>
      ) : null}
      {item2Label != null ? (
        <span className="pointer-events-none absolute right-4 top-4 z-30 rounded-full bg-base-100/80 px-3 py-1 text-xs font-medium text-base-content shadow-sm backdrop-blur">
          {item2Label}
        </span>
      ) : null}
      <Resizer
        className="pointer-events-none absolute inset-y-0 z-20"
        style={getQuickResizerStyle()}
        data-rue-diff-resizer="true"
      >
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-base-100 shadow-sm" />
      </Resizer>
      {resizerContent != null ? (
        <span
          className="pointer-events-none absolute top-1/2 z-30 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-base-300 bg-base-100/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-base-content shadow-sm backdrop-blur"
          style={getQuickResizerContentStyle()}
          data-rue-diff-resizer-content="true"
        >
          {resizerContent}
        </span>
      ) : null}
      <input
        type="range"
        className="absolute inset-0 z-30 h-full w-full cursor-col-resize opacity-0 disabled:cursor-not-allowed"
        ref={(element: HTMLInputElement | null) => {
          inputRef.current = element ?? undefined
          if (element) {
            element.oninput = handleInput
            element.onchange = handleChange
          }
        }}
        data-rue-diff-input="true"
        min={String(bounds.min)}
        max={String(bounds.max)}
        step={String(rangeStep)}
        value={String(currentValue)}
        disabled={disabled}
        tabIndex={tabIndex}
        aria-label={rangeAriaLabel}
        aria-valuemin={String(bounds.min)}
        aria-valuemax={String(bounds.max)}
        aria-valuenow={String(currentValue)}
      />
    </figure>
  )
}

type DiffCompound = FC<DiffProps> & {
  Item1: FC<DiffItemProps>
  Item2: FC<DiffItemProps>
  Resizer: FC<DiffResizerProps>
}

const DiffCompound: DiffCompound = /*#__PURE__*/ Object.assign(Diff, {
  Item1,
  Item2,
  Resizer,
})

/** 默认导出差异对比组件。 */
export default DiffCompound
