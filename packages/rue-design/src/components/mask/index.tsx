/*
Mask 模块概述
- 汇总遮罩组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'

/** MaskShape 类型。 */
export type MaskShape =
  | 'squircle'
  | 'heart'
  | 'hexagon'
  | 'hexagon-2'
  | 'decagon'
  | 'pentagon'
  | 'diamond'
  | 'square'
  | 'circle'
  | 'star'
  | 'star-2'
  | 'triangle'
  | 'triangle-2'
  | 'triangle-3'
  | 'triangle-4'

/** MaskHalf 类型。 */
export type MaskHalf = '1' | '2' | 'start' | 'end'
/** MaskSize 尺寸类型。 */
export type MaskSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | 'small'
  | 'middle'
  | 'medium'
  | 'large'
/** MaskFit 类型。 */
export type MaskFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
/** MaskPosition 位置或方向类型。 */
export type MaskPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
/** MaskTone 语义色类型。 */
export type MaskTone =
  | 'base'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** MaskProps 组件属性。 */
export interface MaskProps {
  /** 自定义渲染的宿主元素。 */
  as?: string
  /** 组件形状。 */
  shape?: MaskShape
  /** half 配置项。 */
  half?: MaskHalf
  /** 组件尺寸。 */
  size?: MaskSize
  /** fit 配置项。 */
  fit?: MaskFit
  /** position 配置项。 */
  position?: MaskPosition
  /** 组件语义色调。 */
  tone?: MaskTone
  /** bordered 配置项。 */
  bordered?: boolean
  /** ring 配置项。 */
  ring?: boolean
  /** shadow 配置项。 */
  shadow?: boolean
  /** interactive 配置项。 */
  interactive?: boolean
  /** src 配置项。 */
  src?: string
  /** alt 配置项。 */
  alt?: string
  /** imageProps 透传属性。 */
  imageProps?: Record<string, any>
  /** wrapperClassName 附加类名。 */
  wrapperClassName?: string
  /** imageClassName 附加类名。 */
  imageClassName?: string
  /** 主体内容。 */
  content?: string | number
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** caption 配置项。 */
  caption?: string
  /** captionClassName 附加类名。 */
  captionClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** 解析 Half 的内部工具函数。 */
const resolveHalf = (half?: MaskHalf) => {
  if (!half) return undefined
  return half === 'start' ? '1' : half === 'end' ? '2' : half
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: MaskSize) => {
  switch (size) {
    case 'xs':
      return 'size-12'
    case 'sm':
    case 'small':
      return 'size-16'
    case 'md':
    case 'middle':
    case 'medium':
      return 'size-24'
    case 'lg':
    case 'large':
      return 'size-32'
    case 'xl':
      return 'size-40'
    case '2xl':
      return 'size-52'
    case '3xl':
      return 'size-64'
    default:
      return undefined
  }
}

/** 解析 Position Class 的内部工具函数。 */
const resolvePositionClass = (position?: MaskPosition) => {
  switch (position) {
    case 'top':
      return 'object-top'
    case 'bottom':
      return 'object-bottom'
    case 'left':
      return 'object-left'
    case 'right':
      return 'object-right'
    case 'top-left':
      return 'object-left-top'
    case 'top-right':
      return 'object-right-top'
    case 'bottom-left':
      return 'object-left-bottom'
    case 'bottom-right':
      return 'object-right-bottom'
    case 'center':
    default:
      return position ? 'object-center' : undefined
  }
}

/** 解析 Fit Class 的内部工具函数。 */
const resolveFitClass = (fit?: MaskFit) => {
  switch (fit) {
    case 'contain':
      return 'object-contain'
    case 'fill':
      return 'object-fill'
    case 'none':
      return 'object-none'
    case 'scale-down':
      return 'object-scale-down'
    case 'cover':
    default:
      return fit ? 'object-cover' : undefined
  }
}

/** 解析 Tone Class 的内部工具函数。 */
const resolveToneClass = (tone?: MaskTone) => {
  switch (tone) {
    case 'neutral':
      return 'bg-neutral text-neutral-content'
    case 'primary':
      return 'bg-primary text-primary-content'
    case 'secondary':
      return 'bg-secondary text-secondary-content'
    case 'accent':
      return 'bg-accent text-accent-content'
    case 'info':
      return 'bg-info text-info-content'
    case 'success':
      return 'bg-success text-success-content'
    case 'warning':
      return 'bg-warning text-warning-content'
    case 'error':
      return 'bg-error text-error-content'
    case 'base':
      return 'bg-base-200 text-base-content'
    default:
      return undefined
  }
}

/** 解析 Ring Class 的内部工具函数。 */
const resolveRingClass = (tone?: MaskTone) => {
  switch (tone) {
    case 'neutral':
      return 'ring-neutral/35'
    case 'primary':
      return 'ring-primary/35'
    case 'secondary':
      return 'ring-secondary/35'
    case 'accent':
      return 'ring-accent/35'
    case 'info':
      return 'ring-info/35'
    case 'success':
      return 'ring-success/35'
    case 'warning':
      return 'ring-warning/35'
    case 'error':
      return 'ring-error/35'
    default:
      return 'ring-base-300'
  }
}

/** 构建 Mask Class Name 的内部工具函数。 */
const buildMaskClassName = ({
  shape,
  half,
  size,
  fit,
  position,
  tone,
  bordered,
  ring,
  shadow,
  interactive,
}: Pick<
  MaskProps,
  | 'shape'
  | 'half'
  | 'size'
  | 'fit'
  | 'position'
  | 'tone'
  | 'bordered'
  | 'ring'
  | 'shadow'
  | 'interactive'
>) => {
  let cls = `mask mask-${shape ?? 'squircle'}`
  const resolvedHalf = resolveHalf(half)
  const sizeClass = resolveSizeClass(size)
  const fitClass = resolveFitClass(fit as MaskFit | undefined)
  const positionClass = resolvePositionClass(position)
  const toneClass = resolveToneClass(tone)

  if (resolvedHalf) cls += ` mask-half-${resolvedHalf}`
  if (sizeClass) cls += ` ${sizeClass}`
  if (fitClass) cls += ` ${fitClass}`
  if (positionClass) cls += ` ${positionClass}`
  if (toneClass) cls += ` ${toneClass}`
  if (bordered) cls += ' ring-1 ring-inset ring-base-300/80'
  if (ring) cls += ` ring-2 ring-offset-2 ring-offset-base-100 ${resolveRingClass(tone)}`
  if (shadow) cls += ' shadow-xl shadow-base-content/10'
  if (interactive) cls += ' transition duration-200 ease-out hover:-translate-y-1 hover:shadow-2xl'

  return cls
}

/** Mask 的内部工具函数。 */
const Mask: FC<MaskProps> = ({
  as = 'img',
  shape = 'squircle',
  half,
  size,
  fit = 'cover',
  position,
  tone,
  bordered,
  ring,
  shadow,
  interactive,
  src,
  alt,
  imageProps,
  wrapperClassName,
  imageClassName,
  content,
  contentClassName,
  caption,
  captionClassName,
  className,
  children,
  ...rest
}) => {
  const cls = buildMaskClassName({
    shape,
    half,
    size,
    fit,
    position,
    tone,
    bordered,
    ring,
    shadow,
    interactive,
  })
  const contentNode = content ?? children
  const mediaMode =
    !!src &&
    (hasRenderableContent(contentNode) ||
      caption != null ||
      wrapperClassName != null ||
      imageClassName != null ||
      contentClassName != null ||
      captionClassName != null ||
      as === 'figure')

  if (mediaMode) {
    const wrapperClass = mergeClassName(
      'relative inline-flex flex-col items-center gap-3',
      wrapperClassName,
    )

    if (as === 'div') {
      return (
        <div {...rest} className={wrapperClass}>
          <div className="relative inline-flex">
            <img
              {...imageProps}
              src={src}
              alt={alt}
              className={mergeClassName(mergeClassName(cls, className), imageClassName)}
            />
            {hasRenderableContent(contentNode) ? (
              <div
                className={mergeClassName(
                  'absolute inset-0 grid place-items-center p-4 text-center',
                  contentClassName,
                )}
              >
                {content !== undefined ? <span>{String(content)}</span> : children}
              </div>
            ) : null}
          </div>
          {caption != null ? (
            <div className={mergeClassName('text-center text-sm opacity-70', captionClassName)}>
              {String(caption ?? '')}
            </div>
          ) : null}
        </div>
      )
    }

    return (
      <figure {...rest} className={wrapperClass}>
        <div className="relative inline-flex">
          <img
            {...imageProps}
            src={src}
            alt={alt}
            className={mergeClassName(mergeClassName(cls, className), imageClassName)}
          />
          {hasRenderableContent(contentNode) ? (
            <div
              className={mergeClassName(
                'absolute inset-0 grid place-items-center p-4 text-center',
                contentClassName,
              )}
            >
              {content !== undefined ? <span>{String(content)}</span> : children}
            </div>
          ) : null}
        </div>
        {caption != null ? (
          <figcaption
            className={mergeClassName('text-center text-sm opacity-70', captionClassName)}
          >
            {String(caption ?? '')}
          </figcaption>
        ) : null}
      </figure>
    )
  }

  const hostClassName = mergeClassName(cls, className)

  if (as === 'div') {
    return (
      <div {...rest} className={hostClassName}>
        {children}
      </div>
    )
  }

  if (as === 'span') {
    return (
      <span {...rest} className={hostClassName}>
        {children}
      </span>
    )
  }

  if (as === 'figure') {
    return (
      <figure {...rest} className={hostClassName}>
        {children}
      </figure>
    )
  }

  if (as === 'section') {
    return (
      <section {...rest} className={hostClassName}>
        {children}
      </section>
    )
  }

  if (as === 'article') {
    return (
      <article {...rest} className={hostClassName}>
        {children}
      </article>
    )
  }

  if (as === 'a') {
    return (
      <a {...rest} className={hostClassName}>
        {children}
      </a>
    )
  }

  if (as === 'button') {
    return (
      <button {...rest} className={hostClassName}>
        {children}
      </button>
    )
  }

  return <img {...rest} src={src} alt={alt} className={hostClassName} />
}

/** 默认导出遮罩组件。 */
export default Mask
