/*
Empty 模块概述
- 汇总空状态组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import { type FC } from '@rue-js/rue'

/** EmptySize 尺寸类型。 */
export type EmptySize = 'sm' | 'md' | 'lg' | 'small' | 'default' | 'large'
/** EmptyAlign 对齐方式类型。 */
export type EmptyAlign = 'center' | 'start'
/** EmptyVariant 视觉或语义变体类型。 */
export type EmptyVariant = 'surface' | 'soft' | 'outline'

/** EmptyClassNames 局部类名配置。 */
export interface EmptyClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** image 区域配置。 */
  image?: string
  /** 描述内容。 */
  description?: string
  /** 底部区域内容。 */
  footer?: string
}

/** EmptyStyles 局部样式配置。 */
export interface EmptyStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** image 区域配置。 */
  image?: Record<string, any>
  /** 描述内容。 */
  description?: Record<string, any>
  /** 底部区域内容。 */
  footer?: Record<string, any>
}

/** EmptyPresentedImageProps 组件属性。 */
export interface EmptyPresentedImageProps {
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件尺寸。 */
  size?: EmptySize
}

/** EmptyProps 组件属性。 */
export interface EmptyProps {
  /** image 区域配置。 */
  image?: any
  /** 描述内容。 */
  description?: any
  /** imageStyle 内联样式。 */
  imageStyle?: any
  /** imageAlt 配置项。 */
  imageAlt?: string
  /** 组件子内容。 */
  children?: any
  /** 组件尺寸。 */
  size?: EmptySize
  /** 交叉轴或内容对齐方式。 */
  align?: EmptyAlign
  /** 组件视觉变体。 */
  variant?: EmptyVariant
  /** 根节点附加类名。 */
  className?: string
  /** 根节点附加类名。 */
  rootClassName?: string
  /** 根节点内联样式。 */
  style?: any
  /** 按局部区域覆盖的类名集合。 */
  classNames?: EmptyClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: EmptyStyles
  /** role 配置项。 */
  role?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** EmptyType 接口。 */
export interface EmptyType extends FC<EmptyProps> {
  /** PRESENTED_IMAGE_DEFAULT 配置项。 */
  PRESENTED_IMAGE_DEFAULT: FC<EmptyPresentedImageProps>
  /** PRESENTED_IMAGE_SIMPLE 配置项。 */
  PRESENTED_IMAGE_SIMPLE: FC<EmptyPresentedImageProps>
}

/** DEFAULT_DESCRIPTION 内部常量。 */
const DEFAULT_DESCRIPTION = '暂无数据'

/** append Class Name 的内部工具函数。 */
const appendClassName = (base?: string, className?: string) => {
  if (!base) return className ?? ''
  return className ? `${base} ${className}` : base
}

/** merge Styles 的内部工具函数。 */
const mergeStyles = (...styles: Array<Record<string, any> | undefined>) => {
  return Object.assign({}, ...styles.filter(Boolean))
}

/** SVG_NEUTRAL_CLASS 内部常量。 */
const SVG_NEUTRAL_CLASS = 'text-base-content'
/** SVG_ACCENT_CLASS 内部常量。 */
const SVG_ACCENT_CLASS = 'text-primary'

/** svg Fill Mix Style 的内部工具函数。 */
const svgFillMixStyle = (strength: number) => ({
  fill: `color-mix(in oklab, currentColor ${strength}%, transparent)`,
})

/** svg Stroke Mix Style 的内部工具函数。 */
const svgStrokeMixStyle = (strength: number) => ({
  stroke: `color-mix(in oklab, currentColor ${strength}%, transparent)`,
})

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** 归一化 Size 的内部工具函数。 */
const normalizeSize = (size?: EmptySize): 'sm' | 'md' | 'lg' => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'large':
      return 'lg'
    case 'default':
      return 'md'
    case 'sm':
    case 'lg':
      return size
    default:
      return 'md'
  }
}

/** 解析 Variant Class 的内部工具函数。 */
const resolveVariantClass = (variant: EmptyVariant) => {
  switch (variant) {
    case 'soft':
      return 'border border-base-300/60 bg-base-200/55 shadow-inner'
    case 'outline':
      return 'border border-dashed border-base-300/75 bg-base-100/45 shadow-none'
    default:
      return 'border border-base-300/70 bg-base-100 shadow-[0_28px_70px_-48px_hsl(var(--bc)/0.24)]'
  }
}

/** 解析 Root Spacing Class 的内部工具函数。 */
const resolveRootSpacingClass = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return 'rounded-[1.5rem] px-4 py-5'
    case 'lg':
      return 'rounded-[2rem] px-8 py-9'
    default:
      return 'rounded-[1.75rem] px-6 py-7'
  }
}

/** 解析 Content Gap Class 的内部工具函数。 */
const resolveContentGapClass = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return 'gap-3'
    case 'lg':
      return 'gap-5'
    default:
      return 'gap-4'
  }
}

/** 解析 Description Class 的内部工具函数。 */
const resolveDescriptionClass = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return 'text-sm leading-6'
    case 'lg':
      return 'text-base leading-7'
    default:
      return 'text-sm leading-6 sm:text-[0.95rem]'
  }
}

/** 解析 Footer Class 的内部工具函数。 */
const resolveFooterClass = (align: EmptyAlign) => {
  return align === 'start'
    ? 'flex flex-wrap items-center justify-start gap-3'
    : 'flex flex-wrap items-center justify-center gap-3'
}

/** 解析 Image Shell Width Class 的内部工具函数。 */
const resolveImageShellWidthClass = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return 'w-[9.5rem]'
    case 'lg':
      return 'w-[16rem]'
    default:
      return 'w-[12rem]'
  }
}

/** 解析 Presented Image Width Class 的内部工具函数。 */
const resolvePresentedImageWidthClass = (size: 'sm' | 'md' | 'lg', kind: 'default' | 'simple') => {
  if (kind === 'simple') {
    switch (size) {
      case 'sm':
        return 'w-[6.5rem]'
      case 'lg':
        return 'w-[9.5rem]'
      default:
        return 'w-[8rem]'
    }
  }

  switch (size) {
    case 'sm':
      return 'w-[9rem]'
    case 'lg':
      return 'w-[14rem]'
    default:
      return 'w-[11rem]'
  }
}

/** 解析 Alt Text 的内部工具函数。 */
const resolveAltText = (description: any, imageAlt?: string) => {
  if (typeof imageAlt === 'string' && imageAlt.trim()) return imageAlt
  if (typeof description === 'string' || typeof description === 'number') return String(description)
  return 'empty'
}

/** Default Presented Image 的内部工具函数。 */
const DefaultPresentedImage: FC<EmptyPresentedImageProps> = ({ className, style, size }) => {
  const normalizedSize = normalizeSize(size)
  const widthClass = resolvePresentedImageWidthClass(normalizedSize, 'default')

  return (
    <svg
      viewBox="0 0 220 164"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={appendClassName(`${widthClass} h-auto`, className)}
      style={style}
      data-rue-empty-illustration="default"
      aria-hidden="true"
    >
      <rect
        x="18"
        y="38"
        width="184"
        height="98"
        rx="26"
        className={SVG_NEUTRAL_CLASS}
        style={svgFillMixStyle(6)}
      />
      <rect
        x="18.75"
        y="38.75"
        width="182.5"
        height="96.5"
        rx="25.25"
        className={SVG_NEUTRAL_CLASS}
        style={svgStrokeMixStyle(14)}
        strokeWidth="1.5"
      />
      <rect
        x="49"
        y="24"
        width="122"
        height="18"
        rx="9"
        className={SVG_NEUTRAL_CLASS}
        style={svgFillMixStyle(10)}
      />
      <rect
        x="52"
        y="63"
        width="48"
        height="48"
        rx="18"
        className={SVG_ACCENT_CLASS}
        style={svgFillMixStyle(14)}
      />
      <circle cx="82" cy="77.5" r="8" className={SVG_ACCENT_CLASS} style={svgFillMixStyle(36)} />
      <path
        d="M67 96.5c8.4-11.5 15.7-17.2 22-17.2 6.6 0 14.4 6 23.4 18"
        className={SVG_NEUTRAL_CLASS}
        style={svgStrokeMixStyle(16)}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect
        x="116"
        y="70"
        width="56"
        height="10"
        rx="5"
        className={SVG_NEUTRAL_CLASS}
        style={svgFillMixStyle(16)}
      />
      <rect
        x="116"
        y="90"
        width="40"
        height="10"
        rx="5"
        className={SVG_NEUTRAL_CLASS}
        style={svgFillMixStyle(10)}
      />
      <rect
        x="122"
        y="116"
        width="54"
        height="8"
        rx="4"
        className={SVG_ACCENT_CLASS}
        style={svgFillMixStyle(14)}
      />
      <circle cx="180" cy="54" r="10" className={SVG_NEUTRAL_CLASS} style={svgFillMixStyle(10)} />
      <path
        d="M176 54h8M180 50v8"
        className={SVG_ACCENT_CLASS}
        style={svgStrokeMixStyle(66)}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M38 124c12.2-7.3 22.4-11 30.6-11 8.5 0 19.6 4.6 33.4 13.8"
        className={SVG_NEUTRAL_CLASS}
        style={svgStrokeMixStyle(10)}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Simple Presented Image 的内部工具函数。 */
const SimplePresentedImage: FC<EmptyPresentedImageProps> = ({ className, style, size }) => {
  const normalizedSize = normalizeSize(size)
  const widthClass = resolvePresentedImageWidthClass(normalizedSize, 'simple')

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={appendClassName(`${widthClass} h-auto`, className)}
      style={style}
      data-rue-empty-illustration="simple"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="34" className={SVG_NEUTRAL_CLASS} style={svgFillMixStyle(6)} />
      <circle
        cx="60"
        cy="60"
        r="34"
        className={SVG_NEUTRAL_CLASS}
        style={svgStrokeMixStyle(14)}
        strokeWidth="1.5"
      />
      <circle
        cx="60"
        cy="60"
        r="23"
        className={SVG_ACCENT_CLASS}
        style={svgStrokeMixStyle(36)}
        strokeWidth="8"
      />
      <circle cx="60" cy="60" r="6" className={SVG_ACCENT_CLASS} style={svgFillMixStyle(66)} />
      <path
        d="M43 60h34"
        className={SVG_NEUTRAL_CLASS}
        style={svgStrokeMixStyle(16)}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="32" cy="45" r="4" className={SVG_ACCENT_CLASS} style={svgFillMixStyle(36)} />
      <circle cx="90" cy="78" r="4" className={SVG_ACCENT_CLASS} style={svgFillMixStyle(36)} />
    </svg>
  )
}

const Empty = (({
  image,
  description,
  imageStyle,
  imageAlt,
  children,
  size,
  align = 'center',
  variant = 'surface',
  className,
  rootClassName,
  style,
  classNames,
  styles,
  role = 'status',
  ...rest
}: EmptyProps) => {
  const normalizedSize = normalizeSize(size)
  const mergedDescription = description === undefined ? DEFAULT_DESCRIPTION : description
  const mergedImage = image === undefined ? DefaultPresentedImage : image
  const hasImage = hasRenderableContent(mergedImage)
  const hasDescription = hasRenderableContent(mergedDescription)
  const hasFooter = hasRenderableContent(children)

  const rootCls = appendClassName(
    appendClassName(
      `rue-empty relative isolate overflow-hidden ${resolveVariantClass(variant)} ${resolveRootSpacingClass(normalizedSize)}`,
      align === 'start' ? 'text-left' : 'text-center',
    ),
    appendClassName(appendClassName(rootClassName, classNames?.root), className),
  )

  const imageShellCls = appendClassName(
    `${resolveImageShellWidthClass(normalizedSize)} max-w-full shrink-0`,
    classNames?.image,
  )

  const descriptionCls = appendClassName(
    `max-w-[34rem] text-base-content/68 ${resolveDescriptionClass(normalizedSize)}`,
    classNames?.description,
  )

  const footerCls = appendClassName(resolveFooterClass(align), classNames?.footer)
  const rootStyle = mergeStyles(styles?.root, style)
  const imageShellStyle = mergeStyles(styles?.image, imageStyle)
  const descriptionStyle = mergeStyles(styles?.description)
  const footerStyle = mergeStyles(styles?.footer)
  return (
    <div
      {...rest}
      role={role}
      className={rootCls}
      style={rootStyle}
      data-rue-empty="true"
      data-rue-empty-align={align}
      data-rue-empty-size={normalizedSize}
      data-rue-empty-variant={variant}
    >
      <>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-20 rounded-full bg-primary/10 blur-3xl"
        />

        <div
          className={appendClassName(
            `relative z-[1] flex ${resolveContentGapClass(normalizedSize)} w-full flex-col`,
            align === 'start' ? 'items-start' : 'items-center',
          )}
        >
          {hasImage ? (
            <div data-rue-empty-image="true" className={imageShellCls} style={imageShellStyle}>
              {typeof mergedImage === 'string' ? (
                <img
                  src={mergedImage}
                  alt={resolveAltText(mergedDescription, imageAlt)}
                  draggable="false"
                  className="block h-auto w-full object-contain"
                />
              ) : mergedImage === SimplePresentedImage ? (
                <SimplePresentedImage size={normalizedSize} />
              ) : mergedImage === DefaultPresentedImage ? (
                <DefaultPresentedImage size={normalizedSize} />
              ) : (
                mergedImage
              )}
            </div>
          ) : null}

          {hasDescription ? (
            <div
              data-rue-empty-description="true"
              className={descriptionCls}
              style={descriptionStyle}
            >
              {mergedDescription}
            </div>
          ) : null}

          {hasFooter ? (
            <div data-rue-empty-footer="true" className={footerCls} style={footerStyle}>
              <>{children}</>
            </div>
          ) : null}
        </div>
      </>
    </div>
  )
}) as EmptyType

Empty.PRESENTED_IMAGE_DEFAULT = DefaultPresentedImage
Empty.PRESENTED_IMAGE_SIMPLE = SimplePresentedImage

/** 导出 Empty 内置展示图资源，便于按需复用。 */
export {
  DefaultPresentedImage as PRESENTED_IMAGE_DEFAULT,
  SimplePresentedImage as PRESENTED_IMAGE_SIMPLE,
}

/** 默认导出空状态组件。 */
export default Empty
