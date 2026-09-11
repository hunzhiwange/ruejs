/*
Loading 组件概述
- 保留 daisyUI loading 的 spinner / dots / ring 等 Rue 视觉语言。
- 补齐 Spin 常用能力：spinning、嵌套包裹、description、delay、indicator、fullscreen、percent。
- 继续兼容旧版 style="spinner" 写法；当 style 传入对象时作为根元素内联样式使用。
*/
import { onMounted, onUnmounted, ref, watch, type FC } from '@rue-js/rue'

/** LoadingStyle 样式值类型。 */
export type LoadingStyle = 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity'
/** LoadingSize 尺寸类型。 */
export type LoadingSize =
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
/** LoadingPercent 类型。 */
export type LoadingPercent = number | 'auto'

/** LoadingIndicatorRenderProps 组件属性。 */
export interface LoadingIndicatorRenderProps {
  /** percent 配置项。 */
  percent?: number
  /** 组件尺寸。 */
  size: Exclude<LoadingSize, 'small' | 'default' | 'medium' | 'middle' | 'large'>
  /** 根节点内联样式。 */
  style: LoadingStyle
  /** spinning 配置项。 */
  spinning: boolean
}

/** LoadingClassNames 局部类名配置。 */
export interface LoadingClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** section 配置项。 */
  section?: string
  /** indicator 配置项。 */
  indicator?: string
  /** 描述内容。 */
  description?: string
  /** 内容容器区域配置。 */
  container?: string
}

/** LoadingStyles 局部样式配置。 */
export interface LoadingStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** section 配置项。 */
  section?: Record<string, any>
  /** indicator 配置项。 */
  indicator?: Record<string, any>
  /** 描述内容。 */
  description?: Record<string, any>
  /** 内容容器区域配置。 */
  container?: Record<string, any>
}

type InlineStyle = string | Record<string, any>

/** LoadingProps 组件属性。 */
export interface LoadingProps {
  /** 自定义渲染的宿主元素。 */
  as?: string
  /** 根节点内联样式。 */
  style?: LoadingStyle | InlineStyle
  /** indicatorStyle 内联样式。 */
  indicatorStyle?: LoadingStyle
  /** 组件视觉变体。 */
  variant?: LoadingStyle
  /** 组件类型或语义类型。 */
  type?: LoadingStyle
  /** 组件尺寸。 */
  size?: LoadingSize
  /** spinning 配置项。 */
  spinning?: boolean
  /** delay 配置项。 */
  delay?: number
  /** indicator 配置项。 */
  indicator?: string | object | ((props: LoadingIndicatorRenderProps) => any)
  /** 描述内容。 */
  description?: string
  /** tip 配置项。 */
  tip?: string
  /** fullscreen 配置项。 */
  fullscreen?: boolean
  /** percent 配置项。 */
  percent?: LoadingPercent
  /** 根节点附加类名。 */
  rootClassName?: string
  /** wrapperClassName 附加类名。 */
  wrapperClassName?: string
  /** 按局部区域覆盖的类名集合。 */
  classNames?: LoadingClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: LoadingStyles
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

type LoadingComponent = FC<LoadingProps> & {
  setDefaultIndicator: (indicator: string | undefined) => void
}

/** LOADING_STYLES 内部常量。 */
const LOADING_STYLES: LoadingStyle[] = ['spinner', 'dots', 'ring', 'ball', 'bars', 'infinity']
/** DEFAULT_PERCENT_LABEL 内部常量。 */
const DEFAULT_PERCENT_LABEL = 'Loading'

let defaultIndicator: string | undefined

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | false | null | undefined>) => {
  return parts.filter(Boolean).join(' ')
}

/** merge Styles 的内部工具函数。 */
const mergeStyles = (...parts: Array<Record<string, any> | undefined>) => {
  const merged: Record<string, any> = {}
  parts.forEach(part => {
    if (part) Object.assign(merged, part)
  })
  return Object.keys(merged).length > 0 ? merged : undefined
}

/** 判断 Loading Style 的内部工具函数。 */
const isLoadingStyle = (value: any): value is LoadingStyle => {
  return typeof value === 'string' && LOADING_STYLES.includes(value as LoadingStyle)
}

/** 解析 Indicator Style 的内部工具函数。 */
const resolveIndicatorStyle = (
  style?: LoadingStyle | InlineStyle,
  indicatorStyle?: LoadingStyle,
  variant?: LoadingStyle,
  type?: LoadingStyle,
) => {
  if (indicatorStyle) return indicatorStyle
  if (variant) return variant
  if (type) return type
  if (isLoadingStyle(style)) return style
  return 'spinner'
}

/** 解析 Root Style 的内部工具函数。 */
const resolveRootStyle = (style?: LoadingStyle | InlineStyle) => {
  if (isLoadingStyle(style)) return undefined
  return style as InlineStyle | undefined
}

/** 归一化 Size 的内部工具函数。 */
const normalizeSize = (
  size?: LoadingSize,
): Exclude<LoadingSize, 'small' | 'default' | 'medium' | 'middle' | 'large'> => {
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
      return size ?? 'md'
  }
}

/** clamp Percent 的内部工具函数。 */
const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

/** should Delay 的内部工具函数。 */
const shouldDelay = (spinning: boolean, delay?: number) => {
  return spinning && typeof delay === 'number' && delay > 0 && Number.isFinite(delay)
}

/** 获取 delay 等待阶段 class 的内部工具函数。 */
const getDelayHiddenClass = (spinning: boolean, delay: number | undefined, ready: boolean) => {
  return shouldDelay(spinning, delay) && !ready
    ? 'opacity-0 transition-opacity duration-200'
    : undefined
}

/** 转换为 Child Array 的内部工具函数。 */

/** 提取原生透传属性的内部工具函数。 */
const getRestProps = (props: LoadingProps) => {
  const rest: Record<string, any> = { ...props }
  delete rest.as
  delete rest.style
  delete rest.indicatorStyle
  delete rest.variant
  delete rest.type
  delete rest.size
  delete rest.spinning
  delete rest.delay
  delete rest.indicator
  delete rest.description
  delete rest.tip
  delete rest.fullscreen
  delete rest.percent
  delete rest.rootClassName
  delete rest.wrapperClassName
  delete rest.classNames
  delete rest.styles
  delete rest.className
  delete rest.children
  return rest
}

/** 读取 Loading props 快照，避免复杂 JSX 分支反复触发 props phase 拆分。 */
const getLoadingSnapshot = (props: LoadingProps) => ({
  as: props.as,
  style: props.style,
  indicatorStyle: props.indicatorStyle,
  variant: props.variant,
  type: props.type,
  size: props.size,
  spinning: props.spinning ?? true,
  delay: props.delay ?? 0,
  indicator: props.indicator,
  description: props.description,
  tip: props.tip,
  fullscreen: props.fullscreen ?? false,
  percent: props.percent,
  rootClassName: props.rootClassName,
  wrapperClassName: props.wrapperClassName,
  classNames: props.classNames,
  styles: props.styles,
  className: props.className,
  children: props.children,
  rest: getRestProps(props),
})

/** 读取当前 spinning，供受控场景在深编译后继续响应父级更新。 */
const readCurrentSpinning = (props: LoadingProps) => props.spinning ?? true

/** 读取当前 delay，供受控场景在深编译后继续响应父级更新。 */
const readCurrentDelay = (props: LoadingProps) => props.delay ?? 0

/** 构建 Indicator Class Name 的内部工具函数。 */
const buildIndicatorClassName = (
  style: LoadingStyle,
  size: ReturnType<typeof normalizeSize>,
  className?: string,
) => {
  return mergeClassNames('loading', `loading-${style}`, `loading-${size}`, className)
}

/** Loading Root 的内部工具函数。 */
const LoadingRoot: FC<LoadingProps> = (props, slots: Record<string, any> = {}) => {
  const {
    as,
    style,
    indicatorStyle,
    variant,
    type,
    size,
    indicator,
    description,
    tip,
    fullscreen,
    percent,
    rootClassName,
    wrapperClassName,
    classNames,
    styles,
    className,
    children,
    rest,
  } = getLoadingSnapshot(props)
  const resolvedStyle = resolveIndicatorStyle(style, indicatorStyle, variant, type)
  const normalizedSize = normalizeSize(size)
  const rootStyle = resolveRootStyle(style)
  const descriptionNode = description ?? tip
  const hasChildren = children != null
  const hasDescription = descriptionNode != null
  const hasPercent = percent !== undefined
  const hasCustomIndicator =
    slots.indicator != null || indicator != null || defaultIndicator != null
  const isEnhancedStandalone = hasDescription || hasPercent || hasCustomIndicator
  const isNested = hasChildren || fullscreen
  const visible = ref(readCurrentSpinning(props))
  const delayReady = ref(!shouldDelay(readCurrentSpinning(props), readCurrentDelay(props)))
  let delayTimer: ReturnType<typeof setTimeout> | null = null
  let delayTargetElement: HTMLElement | null = null

  const clearDelayTimer = () => {
    if (delayTimer != null) {
      clearTimeout(delayTimer)
      delayTimer = null
    }
  }

  const syncVisible = () => {
    clearDelayTimer()
    const currentSpinning = readCurrentSpinning(props)
    const currentDelay = readCurrentDelay(props)

    if (!currentSpinning) {
      visible.value = false
      delayReady.value = false
      return
    }

    visible.value = true

    if (shouldDelay(currentSpinning, currentDelay)) {
      delayReady.value = false
      delayTimer = setTimeout(() => {
        delayTimer = null
        delayReady.value = true
      }, currentDelay)
      return
    }

    delayReady.value = true
  }

  onMounted(() => {
    syncVisible()
  })

  onUnmounted(() => {
    clearDelayTimer()
  })

  watch(() => readCurrentSpinning(props), syncVisible, { immediate: true })
  watch(() => readCurrentDelay(props), syncVisible)

  const mergedPercent =
    percent === undefined ? undefined : percent === 'auto' ? undefined : clampPercent(percent)
  const progressValue = typeof mergedPercent === 'number' ? Math.round(mergedPercent) : undefined

  const indicatorClassName = buildIndicatorClassName(
    resolvedStyle,
    normalizedSize,
    mergeClassNames(classNames?.indicator, styles?.indicator ? 'inline-flex' : undefined),
  )
  const ProgressNodeView = () =>
    hasPercent ? (
      <div
        className="flex w-full min-w-24 flex-col items-center gap-1.5"
        data-rue-loading-percent="true"
      >
        <progress className="progress progress-primary h-1 w-24" max="100" value={progressValue} />
        <span className="text-[0.68rem] leading-none tabular-nums opacity-70">
          {String(percent === 'auto' ? DEFAULT_PERCENT_LABEL : `${progressValue ?? 0}%`)}
        </span>
      </div>
    ) : (
      <></>
    )

  const sectionClassName = mergeClassNames(
    fullscreen
      ? 'pointer-events-auto flex min-w-36 flex-col items-center justify-center gap-3 rounded-box border border-base-300 bg-base-100/95 p-6 text-center text-base-content shadow-2xl'
      : isNested
        ? 'pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-box bg-base-100/70 text-center text-base-content backdrop-blur-[1px]'
        : 'inline-flex flex-col items-center justify-center gap-2 text-center align-middle',
    classNames?.section,
  )
  const descriptionClassName = mergeClassNames(
    'text-sm leading-5 opacity-80',
    classNames?.description,
  )
  const containerClassName = mergeClassNames(
    'transition duration-200',
    visible.value && 'opacity-40 saturate-75',
    classNames?.container,
  )
  const rootClass = mergeClassNames(
    fullscreen
      ? 'fixed inset-0 z-50 grid place-items-center bg-base-100/55 p-6 text-base-content backdrop-blur-sm'
      : isNested
        ? 'relative block text-base-content'
        : 'inline-flex items-center text-base-content',
    visible.value && 'rue-loading-spinning',
    rootClassName,
    wrapperClassName,
    classNames?.root,
    className,
  )
  const mergedRootStyle = mergeStyles(
    typeof rootStyle === 'string' ? undefined : rootStyle,
    styles?.root,
  )
  const rootStyleValue = typeof rootStyle === 'string' ? rootStyle : mergedRootStyle

  const SectionContentView = () => (
    <>
      {hasCustomIndicator ? (
        <span
          className={mergeClassNames(
            'inline-flex items-center justify-center',
            classNames?.indicator,
          )}
          style={styles?.indicator}
        >
          {slots.indicator ? (
            slots.indicator
          ) : (
            <span>{String(indicator ?? defaultIndicator ?? '')}</span>
          )}
        </span>
      ) : (
        <span
          className={indicatorClassName}
          style={styles?.indicator}
          aria-hidden={hasDescription || hasPercent ? 'true' : undefined}
        />
      )}
      {hasDescription ? (
        <div className={descriptionClassName} style={styles?.description}>
          {String(descriptionNode ?? '')}
        </div>
      ) : null}
      <ProgressNodeView />
    </>
  )
  const SectionNodeView = () =>
    visible.value ? (
      !fullscreen && !isNested ? (
        <span
          className={mergeClassNames(
            sectionClassName,
            getDelayHiddenClass(
              readCurrentSpinning(props),
              readCurrentDelay(props),
              delayReady.value,
            ),
          )}
          style={styles?.section}
          data-rue-loading-section="true"
        >
          <SectionContentView />
        </span>
      ) : (
        <div
          className={mergeClassNames(
            sectionClassName,
            getDelayHiddenClass(
              readCurrentSpinning(props),
              readCurrentDelay(props),
              delayReady.value,
            ),
          )}
          style={styles?.section}
          data-rue-loading-section="true"
        >
          <SectionContentView />
        </div>
      )
    ) : (
      <></>
    )

  if (fullscreen) {
    if (!visible.value) return <></>
    return (
      <div
        {...rest}
        className={rootClass}
        style={rootStyleValue}
        role={rest.role ?? 'status'}
        aria-live={rest['aria-live'] ?? 'polite'}
        aria-busy="true"
      >
        <SectionNodeView />
      </div>
    )
  }

  if (hasChildren) {
    const rootTag = as ?? 'div'
    const NestedContentView = () => (
      <>
        <SectionNodeView />
        <div
          className={containerClassName}
          style={styles?.container}
          data-rue-loading-container="true"
        >
          {children}
        </div>
      </>
    )

    if (rootTag === 'span') {
      return (
        <span
          {...rest}
          className={rootClass}
          style={rootStyleValue}
          role={rest.role ?? 'status'}
          aria-live={rest['aria-live'] ?? 'polite'}
          aria-busy={visible.value ? 'true' : 'false'}
        >
          <NestedContentView />
        </span>
      )
    }

    if (rootTag === 'section') {
      return (
        <section
          {...rest}
          className={rootClass}
          style={rootStyleValue}
          role={rest.role ?? 'status'}
          aria-live={rest['aria-live'] ?? 'polite'}
          aria-busy={visible.value ? 'true' : 'false'}
        >
          <NestedContentView />
        </section>
      )
    }

    if (rootTag === 'article') {
      return (
        <article
          {...rest}
          className={rootClass}
          style={rootStyleValue}
          role={rest.role ?? 'status'}
          aria-live={rest['aria-live'] ?? 'polite'}
          aria-busy={visible.value ? 'true' : 'false'}
        >
          <NestedContentView />
        </article>
      )
    }

    if (rootTag === 'main') {
      return (
        <main
          {...rest}
          className={rootClass}
          style={rootStyleValue}
          role={rest.role ?? 'status'}
          aria-live={rest['aria-live'] ?? 'polite'}
          aria-busy={visible.value ? 'true' : 'false'}
        >
          <NestedContentView />
        </main>
      )
    }

    return (
      <div
        {...rest}
        className={rootClass}
        style={rootStyleValue}
        role={rest.role ?? 'status'}
        aria-live={rest['aria-live'] ?? 'polite'}
        aria-busy={visible.value ? 'true' : 'false'}
      >
        <NestedContentView />
      </div>
    )
  }

  if (!visible.value) return <></>

  if (!isEnhancedStandalone) {
    const rootTag = as ?? 'span'
    const standaloneStyle =
      typeof rootStyleValue === 'string'
        ? rootStyleValue
        : mergeStyles(rootStyleValue, styles?.indicator)
    if (rootTag === 'div') {
      return (
        <div
          {...rest}
          className={mergeClassNames(
            indicatorClassName,
            getDelayHiddenClass(
              readCurrentSpinning(props),
              readCurrentDelay(props),
              delayReady.value,
            ),
            rootClassName,
            classNames?.root,
            className,
          )}
          style={standaloneStyle}
          role={rest.role ?? 'status'}
          aria-live={rest['aria-live'] ?? 'polite'}
          aria-busy="true"
        />
      )
    }

    if (rootTag === 'section') {
      return (
        <section
          {...rest}
          className={mergeClassNames(
            indicatorClassName,
            getDelayHiddenClass(
              readCurrentSpinning(props),
              readCurrentDelay(props),
              delayReady.value,
            ),
            rootClassName,
            classNames?.root,
            className,
          )}
          style={standaloneStyle}
          role={rest.role ?? 'status'}
          aria-live={rest['aria-live'] ?? 'polite'}
          aria-busy="true"
        />
      )
    }

    if (rootTag === 'article') {
      return (
        <article
          {...rest}
          className={mergeClassNames(
            indicatorClassName,
            getDelayHiddenClass(
              readCurrentSpinning(props),
              readCurrentDelay(props),
              delayReady.value,
            ),
            rootClassName,
            classNames?.root,
            className,
          )}
          style={standaloneStyle}
          role={rest.role ?? 'status'}
          aria-live={rest['aria-live'] ?? 'polite'}
          aria-busy="true"
        />
      )
    }

    if (rootTag === 'main') {
      return (
        <main
          {...rest}
          className={mergeClassNames(
            indicatorClassName,
            getDelayHiddenClass(
              readCurrentSpinning(props),
              readCurrentDelay(props),
              delayReady.value,
            ),
            rootClassName,
            classNames?.root,
            className,
          )}
          style={standaloneStyle}
          role={rest.role ?? 'status'}
          aria-live={rest['aria-live'] ?? 'polite'}
          aria-busy="true"
        />
      )
    }

    return (
      <span
        {...rest}
        className={mergeClassNames(
          indicatorClassName,
          getDelayHiddenClass(
            readCurrentSpinning(props),
            readCurrentDelay(props),
            delayReady.value,
          ),
          rootClassName,
          classNames?.root,
          className,
        )}
        style={standaloneStyle}
        role={rest.role ?? 'status'}
        aria-live={rest['aria-live'] ?? 'polite'}
        aria-busy="true"
      />
    )
  }

  const rootTag = as ?? 'span'
  if (rootTag === 'div') {
    return (
      <div
        {...rest}
        className={rootClass}
        style={rootStyleValue}
        role={rest.role ?? 'status'}
        aria-live={rest['aria-live'] ?? 'polite'}
        aria-busy="true"
      >
        <SectionNodeView />
      </div>
    )
  }

  if (rootTag === 'section') {
    return (
      <section
        {...rest}
        className={rootClass}
        style={rootStyleValue}
        role={rest.role ?? 'status'}
        aria-live={rest['aria-live'] ?? 'polite'}
        aria-busy="true"
      >
        <SectionNodeView />
      </section>
    )
  }

  if (rootTag === 'article') {
    return (
      <article
        {...rest}
        className={rootClass}
        style={rootStyleValue}
        role={rest.role ?? 'status'}
        aria-live={rest['aria-live'] ?? 'polite'}
        aria-busy="true"
      >
        <SectionNodeView />
      </article>
    )
  }

  if (rootTag === 'main') {
    return (
      <main
        {...rest}
        className={rootClass}
        style={rootStyleValue}
        role={rest.role ?? 'status'}
        aria-live={rest['aria-live'] ?? 'polite'}
        aria-busy="true"
      >
        <SectionNodeView />
      </main>
    )
  }

  return (
    <span
      {...rest}
      className={rootClass}
      style={rootStyleValue}
      role={rest.role ?? 'status'}
      aria-live={rest['aria-live'] ?? 'polite'}
      aria-busy="true"
    >
      <SectionNodeView />
    </span>
  )
}

const Loading = LoadingRoot as LoadingComponent

Loading.setDefaultIndicator = (indicator: string | undefined) => {
  defaultIndicator = indicator
}

/** 默认导出加载组件。 */
export default Loading
