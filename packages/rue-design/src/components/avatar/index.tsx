/*
Avatar 组件概述
- 在保留 daisyUI 原子组合能力的前提下，补齐图片、图标、文字、尺寸、形状与失败回退等语义化 API。
- Avatar.Group 支持 children 或 items 两种组织方式，并提供 max 溢出聚合能力。
*/
import { ref, type FC } from '@rue-js/rue'

/** AvatarStatus 状态类型。 */
export type AvatarStatus = 'online' | 'offline' | 'placeholder'
/** AvatarShape 类型。 */
export type AvatarShape = 'circle' | 'square'
/** AvatarImageFit 类型。 */
export type AvatarImageFit = 'cover' | 'contain'
/** AvatarColor 语义色类型。 */
export type AvatarColor =
  | 'base'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
/** AvatarSize 尺寸类型。 */
export type AvatarSize =
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
  | number

interface AvatarSizeConfig {
  className?: string
  pixels: number
  style?: Record<string, string>
}

/** AvatarProps 组件属性。 */
export interface AvatarProps {
  /** 组件状态。 */
  status?: AvatarStatus
  /** 根节点附加类名。 */
  className?: string
  /** bodyClassName 附加类名。 */
  bodyClassName?: string
  /** imgClassName 附加类名。 */
  imgClassName?: string
  /** 组件子内容。 */
  children?: any
  /** src 配置项。 */
  src?: string
  /** srcSet 配置项。 */
  srcSet?: string
  /** alt 配置项。 */
  alt?: string
  /** 图标内容。 */
  icon?: any
  /** text 区域配置。 */
  text?: string
  /** 组件形状。 */
  shape?: AvatarShape
  /** 组件尺寸。 */
  size?: AvatarSize
  /** 元素间距。 */
  gap?: number
  /** 组件语义色。 */
  color?: AvatarColor
  /** fit 配置项。 */
  fit?: AvatarImageFit
  /** draggable 配置项。 */
  draggable?: boolean | 'true' | 'false'
  /** crossOrigin 配置项。 */
  crossOrigin?: 'anonymous' | 'use-credentials' | ''
  /** onError 事件回调。 */
  onError?: (event: Event) => boolean | void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** AvatarGroupItem 数据项结构。 */
export interface AvatarGroupItem extends AvatarProps {
  /** 数据项唯一标识。 */
  key?: string | number
}

/** AvatarGroupMaxConfig 配置对象。 */
export interface AvatarGroupMaxConfig {
  /** count 配置项。 */
  count?: number
  /** 占位内容。 */
  placeholder?: any
  /** 根节点附加类名。 */
  className?: string
  /** bodyClassName 附加类名。 */
  bodyClassName?: string
}

/** AvatarGroupProps 组件属性。 */
export interface AvatarGroupProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<AvatarGroupItem>
  /** 组件尺寸。 */
  size?: AvatarSize
  /** 组件形状。 */
  shape?: AvatarShape
  /** max 配置项。 */
  max?: number | AvatarGroupMaxConfig
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 归一化 Size 的内部工具函数。 */
const normalizeSize = (size?: AvatarSize): AvatarSize => {
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

/** 解析 Size Config 的内部工具函数。 */
const resolveSizeConfig = (size?: AvatarSize): AvatarSizeConfig => {
  const normalized = normalizeSize(size)
  if (typeof normalized === 'number') {
    return {
      pixels: normalized,
      style: {
        width: `${normalized}px`,
        height: `${normalized}px`,
      },
    }
  }

  switch (normalized) {
    case 'xs':
      return { className: 'h-6 w-6 text-[10px]', pixels: 24 }
    case 'sm':
      return { className: 'h-8 w-8 text-xs', pixels: 32 }
    case 'lg':
      return { className: 'h-12 w-12 text-base', pixels: 48 }
    case 'xl':
      return { className: 'h-16 w-16 text-lg', pixels: 64 }
    default:
      return { className: 'h-10 w-10 text-sm', pixels: 40 }
  }
}

/** 解析 Shape Class 的内部工具函数。 */
const resolveShapeClass = (shape?: AvatarShape) => {
  return shape === 'square' ? 'rounded-2xl' : 'rounded-full'
}

/** 解析 Fit Class 的内部工具函数。 */
const resolveFitClass = (fit?: AvatarImageFit) => {
  return fit === 'contain' ? 'object-contain' : 'object-cover'
}

/** 解析 Color Classes 的内部工具函数。 */
const resolveColorClasses = (color?: AvatarColor, preferPlaceholder?: boolean) => {
  switch (color) {
    case 'base':
      return 'bg-base-200 text-base-content'
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
    default:
      return preferPlaceholder ? 'bg-neutral text-neutral-content' : 'bg-base-300 text-base-content'
  }
}

/** 转换为 Primitive Text 的内部工具函数。 */
const toPrimitiveText = (value: any) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }
  return undefined
}

/** 解析 Text Font Size 的内部工具函数。 */
const resolveTextFontSize = (content: string, avatarPixels: number, gap: number) => {
  const safeGap = Math.max(gap, 0)
  const estimated = (avatarPixels - safeGap * 2) / Math.max(content.length * 0.62, 1)
  return Math.max(10, Math.min(avatarPixels * 0.42, estimated))
}

/** flatten Children 的内部工具函数。 */

/** 归一化 Max 的内部工具函数。 */
const normalizeMax = (max?: number | AvatarGroupMaxConfig) => {
  if (typeof max === 'number') {
    return { count: max }
  }
  return max
}

/** Default Avatar Icon 的内部工具函数。 */
const DefaultAvatarIcon: FC = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-[55%] w-[55%]"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

/**
 * 语义模式负责生成可复用的头像骨架；纯 children 模式则继续兼容旧版 daisyUI 写法。
 */
const Avatar: FC<AvatarProps> = ({
  status,
  className,
  bodyClassName,
  imgClassName,
  children,
  src,
  srcSet,
  alt,
  icon,
  text,
  shape,
  size,
  gap = 4,
  color,
  fit,
  draggable,
  crossOrigin,
  onError,
  ...rest
}) => {
  const primitiveChildText = toPrimitiveText(children)
  const hasSemanticProps =
    src != null ||
    icon != null ||
    text != null ||
    shape != null ||
    size != null ||
    bodyClassName != null ||
    imgClassName != null ||
    alt != null ||
    srcSet != null ||
    color != null ||
    fit != null ||
    draggable !== undefined ||
    crossOrigin !== undefined ||
    onError != null
  const customBodyMode = !hasSemanticProps && primitiveChildText == null && children != null
  const sizeConfig = resolveSizeConfig(size)
  const textContent = text ?? primitiveChildText
  const FallbackContent = () =>
    icon != null ? <>{icon}</> : children ? <>{children}</> : <DefaultAvatarIcon />
  const rootClassName = mergeClassName(
    status ? `avatar not-prose avatar-${status}` : 'avatar not-prose',
    className,
  )

  if (customBodyMode) {
    return (
      <div {...rest} className={rootClassName} data-rue-avatar-root="true">
        {children}
      </div>
    )
  }

  const hasStringImage = typeof src === 'string' && src.length > 0

  const fallbackVisible = !hasStringImage
  const bodyClassNames = mergeClassName(
    mergeClassName(
      `relative inline-flex shrink-0 items-center justify-center overflow-hidden ${resolveShapeClass(shape)} ${resolveColorClasses(color, status === 'placeholder')}`,
      sizeConfig.className,
    ),
    bodyClassName,
  )
  const fallbackTextStyle =
    textContent != null
      ? {
          fontSize: `${resolveTextFontSize(textContent, sizeConfig.pixels, gap)}px`,
          lineHeight: '1',
        }
      : undefined

  const imageFailed = ref(false)
  const handleImageError = (event: Event) => {
    const shouldContinue = onError ? onError(event) : undefined
    if (shouldContinue === false) {
      return
    }

    imageFailed.value = true
  }

  return (
    <div {...rest} className={rootClassName} data-rue-avatar-root="true">
      <div className={bodyClassNames} data-rue-avatar-body="true" style={sizeConfig.style}>
        {hasStringImage ? (
          <img
            data-rue-avatar-image="true"
            className={mergeClassName(
              `h-full w-full ${resolveFitClass(fit)}`,
              mergeClassName(imageFailed.value ? 'hidden' : '', imgClassName),
            )}
            src={src}
            srcSet={srcSet}
            alt={alt ?? textContent ?? 'Avatar'}
            draggable={draggable ?? true}
            crossOrigin={crossOrigin}
            onError={handleImageError}
          />
        ) : null}

        <span
          className={
            fallbackVisible || imageFailed.value
              ? 'flex h-full w-full items-center justify-center'
              : 'hidden h-full w-full items-center justify-center'
          }
          data-rue-avatar-fallback="true"
        >
          {textContent ? (
            <span
              className="inline-flex max-w-full items-center justify-center px-[0.08em] font-semibold uppercase tracking-[0.02em]"
              style={fallbackTextStyle}
            >
              {String(textContent)}
            </span>
          ) : (
            <FallbackContent />
          )}
        </span>
      </div>
    </div>
  )
}

/** Group 的内部工具函数。 */
const Group: FC<AvatarGroupProps> = ({ className, children, items, size, shape, max }) => {
  const maxConfig = normalizeMax(max)
  const maxCount =
    maxConfig && typeof maxConfig.count === 'number' && maxConfig.count >= 0
      ? Math.floor(maxConfig.count)
      : undefined
  const rootClassName = mergeClassName('avatar-group', className)

  if (items && items.length) {
    const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
      const item = rowArg0
      const index = rowArg1

      const { key, ...itemProps } = item
      return (
        <Avatar
          key={key ?? index}
          size={item.size ?? size}
          shape={item.shape ?? shape}
          {...itemProps}
        />
      )
    }

    const hiddenCount =
      maxCount !== undefined && items.length > maxCount ? items.length - maxCount : 0
    const visibleItems =
      hiddenCount > 0 && maxCount !== undefined ? items.slice(0, maxCount) : items

    return (
      <div className={rootClassName} data-rue-avatar-group="true">
        {visibleItems.map((rowArg0: any, rowArg1: number) => (
          <CompiledRow1 rowArg0={rowArg0} rowArg1={rowArg1} />
        ))}
        {hiddenCount > 0 ? (
          <Avatar
            status="placeholder"
            size={size}
            shape={shape}
            className={maxConfig?.className}
            bodyClassName={maxConfig?.bodyClassName}
            text={String(maxConfig?.placeholder ?? `+${hiddenCount}`)}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className={rootClassName} data-rue-avatar-group="true">
      {children}
    </div>
  )
}

type AvatarCompound = FC<AvatarProps> & {
  Group: FC<AvatarGroupProps>
}

const AvatarCompound: AvatarCompound = /*#__PURE__*/ Object.assign(Avatar, {
  Group,
})

/** 默认导出头像组件。 */
export default AvatarCompound
