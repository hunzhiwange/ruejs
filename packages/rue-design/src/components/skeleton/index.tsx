/*
Skeleton 模块概述
- 汇总骨架屏组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'

/** SkeletonSize 尺寸类型。 */
export type SkeletonSize =
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
/** SkeletonAvatarShape 类型。 */
export type SkeletonAvatarShape = 'circle' | 'square'
/** SkeletonButtonShape 类型。 */
export type SkeletonButtonShape = 'default' | 'square' | 'round' | 'circle'
/** SkeletonWidth 类型。 */
export type SkeletonWidth = string | number

/** SkeletonClassNames 局部类名配置。 */
export interface SkeletonClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** 头部区域内容。 */
  header?: string
  /** section 配置项。 */
  section?: string
  /** avatar 配置项。 */
  avatar?: string
  /** 标题内容。 */
  title?: string
  /** paragraph 配置项。 */
  paragraph?: string
}

/** SkeletonStyles 局部样式配置。 */
export interface SkeletonStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** 头部区域内容。 */
  header?: Record<string, any>
  /** section 配置项。 */
  section?: Record<string, any>
  /** avatar 配置项。 */
  avatar?: Record<string, any>
  /** 标题内容。 */
  title?: Record<string, any>
  /** paragraph 配置项。 */
  paragraph?: Record<string, any>
}

interface SkeletonBaseProps {
  active?: boolean
  className?: string
  style?: Record<string, any>
  children?: any
  [key: string]: any
}

type SkeletonReactiveValue<T> = T | (() => T) | { value?: T; get?: () => T }

/** SkeletonAvatarProps 组件属性。 */
export interface SkeletonAvatarProps extends SkeletonBaseProps {
  /** 组件尺寸。 */
  size?: SkeletonSize
  /** 组件形状。 */
  shape?: SkeletonAvatarShape
}

/** SkeletonButtonProps 组件属性。 */
export interface SkeletonButtonProps extends SkeletonBaseProps {
  /** 组件尺寸。 */
  size?: SkeletonSize
  /** 组件形状。 */
  shape?: SkeletonButtonShape
  /** block 配置项。 */
  block?: boolean
}

/** SkeletonInputProps 组件属性。 */
export interface SkeletonInputProps extends SkeletonBaseProps {
  /** 组件尺寸。 */
  size?: SkeletonSize
  /** block 配置项。 */
  block?: boolean
}

/** SkeletonNodeProps 组件属性。 */
export interface SkeletonNodeProps extends Omit<SkeletonBaseProps, 'active'> {
  /** 是否处于激活态。 */
  active?: SkeletonReactiveValue<boolean>
  /** 自定义渲染的宿主元素。 */
  as?: any
}

/** SkeletonImageProps 组件属性。 */
export interface SkeletonImageProps extends SkeletonNodeProps {
  /** aspect 配置项。 */
  aspect?: SkeletonReactiveValue<'square' | 'video'>
}

/** SkeletonTitleProps 组件属性。 */
export interface SkeletonTitleProps extends SkeletonBaseProps {
  /** width 配置项。 */
  width?: SkeletonWidth
}

/** SkeletonParagraphProps 组件属性。 */
export interface SkeletonParagraphProps extends SkeletonBaseProps {
  /** rows 配置项。 */
  rows?: number
  /** width 配置项。 */
  width?: SkeletonWidth | SkeletonWidth[]
  /** rowClassName 附加类名。 */
  rowClassName?: string
}

/** SkeletonProps 组件属性。 */
export interface SkeletonProps extends SkeletonBaseProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** text 区域配置。 */
  text?: boolean
  /** 是否展示加载态。 */
  loading?: boolean
  /** avatar 配置项。 */
  avatar?: boolean | SkeletonAvatarProps
  /** 标题内容。 */
  title?: boolean | SkeletonTitleProps
  /** paragraph 配置项。 */
  paragraph?: boolean | SkeletonParagraphProps
  /** round 配置项。 */
  round?: boolean
  /** 根节点附加类名。 */
  rootClassName?: string
  /** 按局部区域覆盖的类名集合。 */
  classNames?: SkeletonClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: SkeletonStyles
}

interface NormalizedToggleProps<T> {
  enabled: boolean
  props: Partial<T>
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (...values: Array<string | false | null | undefined>) => {
  return values.filter(Boolean).join(' ')
}

/** merge Style 的内部工具函数。 */
const mergeStyle = (...values: Array<Record<string, any> | undefined>) => {
  const merged: Record<string, any> = {}
  values.forEach(value => {
    if (value) {
      Object.assign(merged, value)
    }
  })
  return Object.keys(merged).length > 0 ? merged : undefined
}

/** 解析 Dimension 的内部工具函数。 */
const resolveDimension = (value?: SkeletonWidth) => {
  if (value == null) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

/** 归一化 Size 的内部工具函数。 */
const normalizeSize = (size?: SkeletonSize): Exclude<SkeletonSize, number> | number => {
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

/** 归一化 Toggle Props 的内部工具函数。 */
const normalizeToggleProps = <T extends Record<string, any>>(
  value: boolean | T | undefined,
  defaultEnabled: boolean,
) => {
  if (value === false) {
    return { enabled: false, props: {} } as NormalizedToggleProps<T>
  }
  if (value && typeof value === 'object') {
    return { enabled: true, props: value } as NormalizedToggleProps<T>
  }
  return { enabled: value === true || defaultEnabled, props: {} } as NormalizedToggleProps<T>
}

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (children: any): boolean =>
  children != null && children !== false && children !== ''

/** 解析 Reactive Value 的内部工具函数。 */
const resolveReactiveValue = <T,>(value: SkeletonReactiveValue<T> | undefined): T | undefined => {
  if (value == null) {
    return undefined
  }
  if (typeof value === 'function') {
    return (value as () => T)()
  }
  if (typeof value === 'object') {
    const reactiveValue = value as { value?: T; get?: () => T }
    if (typeof reactiveValue.get === 'function') {
      return reactiveValue.get()
    }
    if ('value' in reactiveValue) {
      return reactiveValue.value
    }
  }
  return value as T
}

/** 构建 Primitive Class Name 的内部工具函数。 */
const buildPrimitiveClassName = (className?: string, text?: boolean, active?: boolean) => {
  return mergeClassName('skeleton', text && 'skeleton-text', active && 'animate-pulse', className)
}

/** 构建 Avatar Size 的内部工具函数。 */
const buildAvatarSize = (size?: SkeletonSize) => {
  const normalized = normalizeSize(size)
  if (typeof normalized === 'number') {
    return {
      className: undefined,
      style: {
        width: `${normalized}px`,
        height: `${normalized}px`,
      },
    }
  }

  switch (normalized) {
    case 'xs':
      return { className: 'h-8 w-8', style: undefined }
    case 'sm':
      return { className: 'h-10 w-10', style: undefined }
    case 'lg':
      return { className: 'h-16 w-16', style: undefined }
    case 'xl':
      return { className: 'h-20 w-20', style: undefined }
    default:
      return { className: 'h-12 w-12', style: undefined }
  }
}

/** 构建 Control Height 的内部工具函数。 */
const buildControlHeight = (size?: SkeletonSize) => {
  const normalized = normalizeSize(size)
  if (typeof normalized === 'number') {
    return {
      className: undefined,
      style: {
        height: `${normalized}px`,
      },
    }
  }

  switch (normalized) {
    case 'xs':
      return { className: 'h-7', style: undefined }
    case 'sm':
      return { className: 'h-8', style: undefined }
    case 'lg':
      return { className: 'h-12', style: undefined }
    case 'xl':
      return { className: 'h-14', style: undefined }
    default:
      return { className: 'h-10', style: undefined }
  }
}

/** 构建 Skeleton Node Class Name 的内部工具函数。 */
const buildSkeletonNodeClassName = (className?: string, active?: boolean) =>
  buildPrimitiveClassName(
    mergeClassName(
      'flex min-h-24 w-full items-center justify-center rounded-2xl text-base-content/40',
      className,
    ),
    false,
    active,
  )

/** 构建 Skeleton Image Class Name 的内部工具函数。 */
const buildSkeletonImageClassName = (
  className?: string,
  aspect: 'square' | 'video' = 'video',
  active?: boolean,
) =>
  buildSkeletonNodeClassName(
    mergeClassName(aspect === 'square' ? 'aspect-square w-32' : 'aspect-video w-48', className),
    active,
  )

/** 读取 Avatar Basic Props 的内部工具函数。 */
const getAvatarBasicProps = (
  hasTitle: boolean,
  hasParagraph: boolean,
): Partial<SkeletonAvatarProps> => {
  if (hasTitle && !hasParagraph) {
    return { size: 'lg', shape: 'square' }
  }
  return { size: 'lg', shape: 'circle' }
}

/** 读取 Title Basic Props 的内部工具函数。 */
const getTitleBasicProps = (
  hasAvatar: boolean,
  hasParagraph: boolean,
): Partial<SkeletonTitleProps> => {
  if (!hasAvatar && hasParagraph) {
    return { width: '38%' }
  }
  if (hasAvatar && hasParagraph) {
    return { width: '50%' }
  }
  return {}
}

/** 读取 Paragraph Basic Props 的内部工具函数。 */
const getParagraphBasicProps = (
  hasAvatar: boolean,
  hasTitle: boolean,
): Partial<SkeletonParagraphProps> => {
  return {
    rows: !hasAvatar && hasTitle ? 3 : 2,
    width: !hasAvatar || !hasTitle ? '61%' : undefined,
  }
}

/** Primitive Skeleton 的内部工具函数。 */
const PrimitiveSkeleton: FC<SkeletonProps> = ({
  as = 'div',
  text,
  active,
  className,
  rootClassName,
  classNames,
  style,
  styles,
  children,
  ...rest
}) => {
  const Component = as as any
  return Component === 'div' ? (
    <div
      {...rest}
      className={buildPrimitiveClassName(
        mergeClassName(classNames?.root, className, rootClassName),
        text,
        active,
      )}
      style={mergeStyle(styles?.root, style)}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={buildPrimitiveClassName(
        mergeClassName(classNames?.root, className, rootClassName),
        text,
        active,
      )}
      style={mergeStyle(styles?.root, style)}
    >
      {children}
    </span>
  ) : (
    <></>
  )
}

/** Skeleton Avatar 的内部工具函数。 */
const SkeletonAvatar: FC<SkeletonAvatarProps> = ({
  active,
  className,
  style,
  size,
  shape = 'circle',
  ...rest
}) => {
  const sizeConfig = buildAvatarSize(size)
  return (
    <div
      {...rest}
      className={buildPrimitiveClassName(
        mergeClassName(
          sizeConfig.className,
          shape === 'square' ? 'rounded-2xl' : 'rounded-full',
          className,
        ),
        false,
        active,
      )}
      style={{ ...sizeConfig.style, ...style }}
    />
  )
}

/** Skeleton Button 的内部工具函数。 */
const SkeletonButton: FC<SkeletonButtonProps> = ({
  active,
  className,
  style,
  size,
  shape = 'default',
  block,
  ...rest
}) => {
  const heightConfig = buildControlHeight(size)
  const squareShape = shape === 'square' || shape === 'circle'
  return (
    <div
      {...rest}
      className={buildPrimitiveClassName(
        mergeClassName(
          heightConfig.className,
          block ? 'w-full' : squareShape ? 'w-10' : 'w-24',
          shape === 'circle' ? 'rounded-full' : shape === 'round' ? 'rounded-full' : 'rounded-xl',
          className,
        ),
        false,
        active,
      )}
      style={{
        ...heightConfig.style,
        ...(squareShape && heightConfig.style?.height ? { width: heightConfig.style.height } : {}),
        ...style,
      }}
    />
  )
}

/** Skeleton Input 的内部工具函数。 */
const SkeletonInput: FC<SkeletonInputProps> = ({
  active,
  className,
  style,
  size,
  block,
  ...rest
}) => {
  const heightConfig = buildControlHeight(size)
  return (
    <div
      {...rest}
      className={buildPrimitiveClassName(
        mergeClassName(heightConfig.className, block ? 'w-full' : 'w-56', 'rounded-xl', className),
        false,
        active,
      )}
      style={{ ...heightConfig.style, ...style }}
    />
  )
}

/** Skeleton Node 的内部工具函数。 */
const SkeletonNode: FC<SkeletonNodeProps> = ({
  as = 'div',
  active,
  className,
  style,
  children,
  ...rest
}) => {
  const Component = as as any
  const resolvedActive = () => resolveReactiveValue(active)

  return Component === 'div' ? (
    <div
      {...rest}
      className={buildSkeletonNodeClassName(className, resolvedActive())}
      style={style}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={buildSkeletonNodeClassName(className, resolvedActive())}
      style={style}
    >
      {children}
    </span>
  ) : (
    <></>
  )
}

/** Image Placeholder Icon 的内部组件。 */
const ImagePlaceholderIcon: FC = () => (
  <svg viewBox="0 0 64 64" className="h-10 w-10 fill-current opacity-60" aria-hidden="true">
    <path d="M10 14a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v36a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V14Zm4 0v28.28l9.64-9.63a3 3 0 0 1 4.24 0L36 40.77l6.64-6.63a3 3 0 0 1 4.24 0L50 37.25V14H14Zm36 36V42.9l-5.24-5.23L38.12 44.3a3 3 0 0 1-4.24 0l-8.12-8.11L14 47.97V50h36ZM22 28a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
  </svg>
)

/** Skeleton Image 的内部工具函数。 */
const SkeletonImage: FC<SkeletonImageProps> = ({
  as = 'div',
  active,
  aspect = 'video',
  className,
  children,
  style,
  ...rest
}) => {
  const Component = as as any
  const resolvedAspect = resolveReactiveValue(aspect) ?? 'video'
  const resolvedActive = resolveReactiveValue(active)

  return Component === 'div' ? (
    <div
      {...rest}
      className={buildSkeletonImageClassName(className, resolvedAspect, resolvedActive)}
      style={style}
    >
      {hasRenderableContent(children) ? children : <ImagePlaceholderIcon />}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={buildSkeletonImageClassName(className, resolvedAspect, resolvedActive)}
      style={style}
    >
      {hasRenderableContent(children) ? children : <ImagePlaceholderIcon />}
    </span>
  ) : (
    <></>
  )
}

/** 渲染 Title 的内部工具函数。 */
const RenderTitle = ({
  arg0: props,
  arg1: active,
  arg2: round,
  arg3: extraClassName,
  arg4: extraStyle,
}: {
  arg0: Partial<SkeletonTitleProps>
  arg1?: boolean
  arg2?: boolean
  arg3?: string
  arg4?: Record<string, any>
}) => {
  const { className, style, width, ...rest } = props
  return (
    <div
      {...rest}
      className={buildPrimitiveClassName(
        mergeClassName('h-4 max-w-full', round && 'rounded-full', extraClassName, className),
        false,
        active,
      )}
      style={mergeStyle({ width: resolveDimension(width) }, extraStyle, style)}
    />
  )
}

/** 解析 Paragraph Row Width 的内部工具函数。 */
const resolveParagraphRowWidth = (
  width: SkeletonParagraphProps['width'],
  index: number,
  rows: number,
) => {
  if (Array.isArray(width)) {
    const value = width[index]
    if (value != null) return value
    if (index === rows - 1 && width.length > 0) return width[width.length - 1]
    return undefined
  }
  if (index === rows - 1) return width
  return undefined
}

/** 渲染 Paragraph 的内部工具函数。 */
const RenderParagraph = ({
  arg0: props,
  arg1: active,
  arg2: round,
  arg3: extraClassName,
  arg4: extraStyle,
}: {
  arg0: Partial<SkeletonParagraphProps>
  arg1?: boolean
  arg2?: boolean
  arg3?: string
  arg4?: Record<string, any>
}) => {
  const { className, style, rows = 2, width, rowClassName, ...rest } = props
  return (
    <div
      {...rest}
      className={mergeClassName('flex flex-col gap-3', extraClassName, className)}
      style={mergeStyle(extraStyle, style)}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={buildPrimitiveClassName(
            mergeClassName('h-4 max-w-full', round && 'rounded-full', rowClassName),
            false,
            active,
          )}
          style={{ width: resolveDimension(resolveParagraphRowWidth(width, index, rows)) }}
        />
      ))}
    </div>
  )
}

/** Skeleton Root 的内部工具函数。 */
const SkeletonRoot: FC<SkeletonProps> = props => {
  const {
    active,
    avatar,
    title,
    paragraph,
    round,
    className,
    rootClassName,
    classNames,
    style,
    styles,
    ...rest
  } = props
  const hasLoadingProp = Object.prototype.hasOwnProperty.call(props, 'loading')
  const shouldRenderComposite =
    hasLoadingProp ||
    avatar !== undefined ||
    title !== undefined ||
    paragraph !== undefined ||
    !!round

  if (!shouldRenderComposite) {
    return <PrimitiveSkeleton {...props} />
  }

  if (props.loading === false) {
    return <>{props.children}</>
  }

  const avatarConfig = normalizeToggleProps<SkeletonAvatarProps>(avatar, false)
  const titleConfig = normalizeToggleProps<SkeletonTitleProps>(title, true)
  const paragraphConfig = normalizeToggleProps<SkeletonParagraphProps>(paragraph, true)
  const hasAvatar = avatarConfig.enabled
  const hasTitle = titleConfig.enabled
  const hasParagraph = paragraphConfig.enabled
  const mergedAvatarProps = hasAvatar
    ? { ...getAvatarBasicProps(hasTitle, hasParagraph), ...avatarConfig.props }
    : null
  const mergedTitleProps = hasTitle
    ? { ...getTitleBasicProps(hasAvatar, hasParagraph), ...titleConfig.props }
    : null
  const mergedParagraphProps = hasParagraph
    ? { ...getParagraphBasicProps(hasAvatar, hasTitle), ...paragraphConfig.props }
    : null

  return (
    <div
      {...rest}
      className={mergeClassName(
        'flex w-full gap-4',
        !hasAvatar && 'flex-col',
        classNames?.root,
        className,
        rootClassName,
      )}
      style={mergeStyle(styles?.root, style)}
    >
      {hasAvatar ? (
        <div className={mergeClassName('shrink-0', classNames?.header)} style={styles?.header}>
          <SkeletonAvatar
            active={active}
            {...mergedAvatarProps}
            className={mergeClassName(classNames?.avatar, mergedAvatarProps?.className)}
            style={mergeStyle(styles?.avatar, mergedAvatarProps?.style)}
          />
        </div>
      ) : null}
      {hasTitle || hasParagraph ? (
        <div
          className={mergeClassName('flex min-w-0 flex-1 flex-col gap-3', classNames?.section)}
          style={styles?.section}
        >
          {hasTitle ? (
            <RenderTitle
              arg0={mergedTitleProps ?? {}}
              arg1={active}
              arg2={round}
              arg3={classNames?.title}
              arg4={styles?.title}
            />
          ) : null}
          {hasParagraph ? (
            <RenderParagraph
              arg0={mergedParagraphProps ?? {}}
              arg1={active}
              arg2={round}
              arg3={classNames?.paragraph}
              arg4={styles?.paragraph}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

type SkeletonCompound = FC<SkeletonProps> & {
  Avatar: FC<SkeletonAvatarProps>
  Button: FC<SkeletonButtonProps>
  Input: FC<SkeletonInputProps>
  Image: FC<SkeletonImageProps>
  Node: FC<SkeletonNodeProps>
}

const Skeleton: SkeletonCompound = /*#__PURE__*/ Object.assign(SkeletonRoot, {
  Avatar: SkeletonAvatar,
  Button: SkeletonButton,
  Input: SkeletonInput,
  Image: SkeletonImage,
  Node: SkeletonNode,
})

/** 默认导出骨架屏组件。 */
export default Skeleton
