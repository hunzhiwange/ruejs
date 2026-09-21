/*
Hero 模块概述
- 汇总首屏展示组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import { Component, type FC } from '@rue-js/rue'

/** HeroTone 语义色类型。 */
export type HeroTone =
  | 'default'
  | 'base-100'
  | 'base-200'
  | 'base-300'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** HeroSize 尺寸类型。 */
export type HeroSize = 'sm' | 'md' | 'lg' | 'xl' | 'screen'
/** HeroContentLayout 类型。 */
export type HeroContentLayout = 'inherit' | 'center' | 'split' | 'split-reverse'
/** HeroAlign 对齐方式类型。 */
export type HeroAlign = 'start' | 'center' | 'end'
/** HeroTextAlign 对齐方式类型。 */
export type HeroTextAlign = 'start' | 'center' | 'end'
/** HeroGap 类型。 */
export type HeroGap = 'sm' | 'md' | 'lg' | 'xl'
/** HeroTitleSize 尺寸类型。 */
export type HeroTitleSize = 'sm' | 'md' | 'lg' | 'xl'
/** HeroDescriptionSize 尺寸类型。 */
export type HeroDescriptionSize = 'sm' | 'md' | 'lg'
/** HeroOverlayTone 语义色类型。 */
export type HeroOverlayTone =
  | 'default'
  | 'base-content'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
/** HeroOverlayOpacity 类型。 */
export type HeroOverlayOpacity = 'soft' | 'medium' | 'strong' | number

interface HeroInlineStyle {
  [key: string]: string | number | undefined
}

interface HeroPartProps {
  as?: string
  className?: string
  children?: any
  style?: HeroInlineStyle
  [key: string]: any
}

/** HeroProps 组件属性。 */
export interface HeroProps extends HeroPartProps {
  /** 组件语义色调。 */
  tone?: HeroTone
  /** 组件尺寸。 */
  size?: HeroSize
  /** fullHeight 配置项。 */
  fullHeight?: boolean
  /** backgroundImage 配置项。 */
  backgroundImage?: string
  /** backgroundPosition 配置项。 */
  backgroundPosition?: string
  /** backgroundSize 尺寸。 */
  backgroundSize?: string
  /** backgroundRepeat 配置项。 */
  backgroundRepeat?: string
  /** overlay 配置项。 */
  overlay?: boolean | HeroOverlayProps
}

/** HeroContentProps 组件属性。 */
export interface HeroContentProps extends HeroPartProps {
  /** layout 配置项。 */
  layout?: HeroContentLayout
  /** 交叉轴或内容对齐方式。 */
  align?: HeroAlign
  /** textAlign 配置项。 */
  textAlign?: HeroTextAlign
  /** 元素间距。 */
  gap?: HeroGap
}

/** HeroOverlayProps 组件属性。 */
export interface HeroOverlayProps extends HeroPartProps {
  /** 组件语义色调。 */
  tone?: HeroOverlayTone
  /** opacity 配置项。 */
  opacity?: HeroOverlayOpacity
  /** blur 配置项。 */
  blur?: boolean
}

/** HeroTitleProps 组件属性。 */
export interface HeroTitleProps extends HeroPartProps {
  /** 组件尺寸。 */
  size?: HeroTitleSize
  /** balanced 配置项。 */
  balanced?: boolean
}

/** HeroDescriptionProps 组件属性。 */
export interface HeroDescriptionProps extends HeroPartProps {
  /** 组件尺寸。 */
  size?: HeroDescriptionSize
  /** muted 配置项。 */
  muted?: boolean
}

/** HeroActionsProps 组件属性。 */
export interface HeroActionsProps extends HeroPartProps {
  /** 交叉轴或内容对齐方式。 */
  align?: HeroAlign
  /** 布局方向。 */
  direction?: 'row' | 'column'
  /** stackOnMobile 配置项。 */
  stackOnMobile?: boolean
}

const heroToneClassMap: Record<Exclude<HeroTone, 'default'>, string> = {
  'base-100': 'bg-base-100 text-base-content',
  'base-200': 'bg-base-200 text-base-content',
  'base-300': 'bg-base-300 text-base-content',
  neutral: 'bg-neutral text-neutral-content',
  primary: 'bg-primary text-primary-content',
  secondary: 'bg-secondary text-secondary-content',
  accent: 'bg-accent text-accent-content',
  info: 'bg-info text-info-content',
  success: 'bg-success text-success-content',
  warning: 'bg-warning text-warning-content',
  error: 'bg-error text-error-content',
}

const heroSizeClassMap: Record<HeroSize, string> = {
  sm: 'min-h-80',
  md: 'min-h-96',
  lg: 'min-h-[30rem]',
  xl: 'min-h-[36rem]',
  screen: 'min-h-screen',
}

const heroContentLayoutClassMap: Record<Exclude<HeroContentLayout, 'inherit'>, string> = {
  center: 'text-center',
  split: 'flex-col gap-10 lg:flex-row',
  'split-reverse': 'flex-col gap-10 lg:flex-row-reverse',
}

const heroAlignClassMap: Record<HeroAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
}

const heroTextAlignClassMap: Record<HeroTextAlign, string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
}

const heroGapClassMap: Record<HeroGap, string> = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-10',
  xl: 'gap-14',
}

const heroOverlayToneClassMap: Record<Exclude<HeroOverlayTone, 'default'>, string> = {
  'base-content': 'bg-base-content',
  neutral: 'bg-neutral',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  accent: 'bg-accent',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
}

const heroTitleSizeClassMap: Record<HeroTitleSize, string> = {
  sm: 'text-3xl md:text-4xl',
  md: 'text-4xl md:text-5xl',
  lg: 'text-5xl md:text-6xl',
  xl: 'text-6xl md:text-7xl',
}

const heroDescriptionSizeClassMap: Record<HeroDescriptionSize, string> = {
  sm: 'text-sm md:text-base',
  md: 'text-base md:text-lg',
  lg: 'text-lg md:text-xl',
}

/** join Class Name 的内部工具函数。 */
const joinClassName = (...classNames: Array<string | false | null | undefined>) => {
  return classNames.filter(Boolean).join(' ')
}

/** merge Style 的内部工具函数。 */
const mergeStyle = (base?: HeroInlineStyle, extra?: HeroInlineStyle) => {
  if (!base && !extra) {
    return undefined
  }
  return {
    ...base,
    ...extra,
  }
}

/** 解析 Overlay Props 的内部工具函数。 */
const resolveOverlayProps = (overlay?: boolean | HeroOverlayProps) => {
  if (!overlay) {
    return undefined
  }
  if (overlay === true) {
    return {}
  }
  return overlay
}

/** 解析 Overlay Opacity Style 的内部工具函数。 */
const resolveOverlayOpacityStyle = (opacity?: HeroOverlayOpacity) => {
  if (opacity == null) {
    return undefined
  }
  if (typeof opacity === 'number') {
    return { opacity }
  }
  switch (opacity) {
    case 'soft':
      return { opacity: 0.25 }
    case 'strong':
      return { opacity: 0.7 }
    default:
      return { opacity: 0.45 }
  }
}

/** 解析 Hero Background Style 的内部工具函数。 */
const resolveHeroBackgroundStyle = ({
  backgroundImage,
  backgroundPosition,
  backgroundSize,
  backgroundRepeat,
}: Pick<
  HeroProps,
  'backgroundImage' | 'backgroundPosition' | 'backgroundSize' | 'backgroundRepeat'
>) => {
  if (!backgroundImage) {
    return undefined
  }

  return {
    backgroundImage: `url(${backgroundImage})`,
    backgroundPosition: backgroundPosition ?? 'center',
    backgroundSize: backgroundSize ?? 'cover',
    backgroundRepeat: backgroundRepeat ?? 'no-repeat',
  }
}

/** 解析 Actions Alignment Class 的内部工具函数。 */
const resolveActionsAlignmentClass = (
  align: HeroAlign | undefined,
  direction: 'row' | 'column',
  stackOnMobile: boolean,
) => {
  if (!align) {
    return undefined
  }

  if (stackOnMobile) {
    switch (align) {
      case 'center':
        return 'items-center sm:justify-center'
      case 'end':
        return 'items-end sm:justify-end'
      default:
        return 'items-start sm:justify-start'
    }
  }

  if (direction === 'column') {
    switch (align) {
      case 'center':
        return 'items-center'
      case 'end':
        return 'items-end'
      default:
        return 'items-start'
    }
  }

  switch (align) {
    case 'center':
      return 'justify-center'
    case 'end':
      return 'justify-end'
    default:
      return 'justify-start'
  }
}

/** Hero 的内部工具函数。 */
const Hero: FC<HeroProps> = ({
  as = 'div',
  className,
  children,
  style,
  tone = 'default',
  size,
  fullHeight,
  backgroundImage,
  backgroundPosition,
  backgroundSize,
  backgroundRepeat,
  overlay,
  ...rest
}) => {
  const backgroundStyle = resolveHeroBackgroundStyle({
    backgroundImage,
    backgroundPosition,
    backgroundSize,
    backgroundRepeat,
  })
  const overlayProps = resolveOverlayProps(overlay)

  return (
    <Component
      is={as}
      {...rest}
      style={mergeStyle(style, backgroundStyle)}
      className={joinClassName(
        'hero',
        tone !== 'default' ? heroToneClassMap[tone] : undefined,
        fullHeight ? heroSizeClassMap.screen : size ? heroSizeClassMap[size] : undefined,
        className,
      )}
    >
      {overlayProps ? <Overlay {...overlayProps} /> : null}
      {children}
    </Component>
  )
}

/** Content 的内部工具函数。 */
const Content: FC<HeroContentProps> = ({
  as = 'div',
  className,
  children,
  layout = 'inherit',
  align,
  textAlign,
  gap,
  ...rest
}) => {
  const Component = as as any

  return Component === 'div' ? (
    <div
      {...rest}
      className={joinClassName(
        'hero-content',
        layout !== 'inherit' ? heroContentLayoutClassMap[layout] : undefined,
        align ? heroAlignClassMap[align] : undefined,
        textAlign ? heroTextAlignClassMap[textAlign] : undefined,
        gap ? heroGapClassMap[gap] : undefined,
        className,
      )}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={joinClassName(
        'hero-content',
        layout !== 'inherit' ? heroContentLayoutClassMap[layout] : undefined,
        align ? heroAlignClassMap[align] : undefined,
        textAlign ? heroTextAlignClassMap[textAlign] : undefined,
        gap ? heroGapClassMap[gap] : undefined,
        className,
      )}
    >
      {children}
    </span>
  ) : Component === 'h1' ? (
    <h1
      {...rest}
      className={joinClassName(
        'hero-content',
        layout !== 'inherit' ? heroContentLayoutClassMap[layout] : undefined,
        align ? heroAlignClassMap[align] : undefined,
        textAlign ? heroTextAlignClassMap[textAlign] : undefined,
        gap ? heroGapClassMap[gap] : undefined,
        className,
      )}
    >
      {children}
    </h1>
  ) : Component === 'p' ? (
    <p
      {...rest}
      className={joinClassName(
        'hero-content',
        layout !== 'inherit' ? heroContentLayoutClassMap[layout] : undefined,
        align ? heroAlignClassMap[align] : undefined,
        textAlign ? heroTextAlignClassMap[textAlign] : undefined,
        gap ? heroGapClassMap[gap] : undefined,
        className,
      )}
    >
      {children}
    </p>
  ) : (
    <></>
  )
}

/** Overlay 的内部工具函数。 */
const Overlay: FC<HeroOverlayProps> = ({
  as = 'div',
  className,
  children,
  tone = 'default',
  opacity,
  blur,
  style,
  ...rest
}) => {
  const Component = as as any

  return Component === 'div' ? (
    <div
      {...rest}
      style={mergeStyle(style, resolveOverlayOpacityStyle(opacity))}
      className={joinClassName(
        'hero-overlay',
        tone !== 'default' ? heroOverlayToneClassMap[tone] : undefined,
        blur ? 'backdrop-blur-sm' : undefined,
        className,
      )}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      style={mergeStyle(style, resolveOverlayOpacityStyle(opacity))}
      className={joinClassName(
        'hero-overlay',
        tone !== 'default' ? heroOverlayToneClassMap[tone] : undefined,
        blur ? 'backdrop-blur-sm' : undefined,
        className,
      )}
    >
      {children}
    </span>
  ) : Component === 'h1' ? (
    <h1
      {...rest}
      style={mergeStyle(style, resolveOverlayOpacityStyle(opacity))}
      className={joinClassName(
        'hero-overlay',
        tone !== 'default' ? heroOverlayToneClassMap[tone] : undefined,
        blur ? 'backdrop-blur-sm' : undefined,
        className,
      )}
    >
      {children}
    </h1>
  ) : Component === 'p' ? (
    <p
      {...rest}
      style={mergeStyle(style, resolveOverlayOpacityStyle(opacity))}
      className={joinClassName(
        'hero-overlay',
        tone !== 'default' ? heroOverlayToneClassMap[tone] : undefined,
        blur ? 'backdrop-blur-sm' : undefined,
        className,
      )}
    >
      {children}
    </p>
  ) : (
    <></>
  )
}

/** Title 的内部工具函数。 */
const Title: FC<HeroTitleProps> = ({
  as = 'h1',
  className,
  children,
  size = 'lg',
  balanced = true,
  ...rest
}) => {
  const Component = as as any

  return Component === 'div' ? (
    <div
      {...rest}
      className={joinClassName(
        'font-bold tracking-tight',
        heroTitleSizeClassMap[size],
        balanced ? 'text-balance' : undefined,
        className,
      )}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={joinClassName(
        'font-bold tracking-tight',
        heroTitleSizeClassMap[size],
        balanced ? 'text-balance' : undefined,
        className,
      )}
    >
      {children}
    </span>
  ) : Component === 'h1' ? (
    <h1
      {...rest}
      className={joinClassName(
        'font-bold tracking-tight',
        heroTitleSizeClassMap[size],
        balanced ? 'text-balance' : undefined,
        className,
      )}
    >
      {children}
    </h1>
  ) : Component === 'p' ? (
    <p
      {...rest}
      className={joinClassName(
        'font-bold tracking-tight',
        heroTitleSizeClassMap[size],
        balanced ? 'text-balance' : undefined,
        className,
      )}
    >
      {children}
    </p>
  ) : (
    <></>
  )
}

/** Description 的内部工具函数。 */
const Description: FC<HeroDescriptionProps> = ({
  as = 'p',
  className,
  children,
  size = 'md',
  muted = true,
  ...rest
}) => {
  const Component = as as any

  return Component === 'div' ? (
    <div
      {...rest}
      className={joinClassName(
        'max-w-2xl leading-relaxed',
        heroDescriptionSizeClassMap[size],
        muted ? 'opacity-80' : undefined,
        className,
      )}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={joinClassName(
        'max-w-2xl leading-relaxed',
        heroDescriptionSizeClassMap[size],
        muted ? 'opacity-80' : undefined,
        className,
      )}
    >
      {children}
    </span>
  ) : Component === 'h1' ? (
    <h1
      {...rest}
      className={joinClassName(
        'max-w-2xl leading-relaxed',
        heroDescriptionSizeClassMap[size],
        muted ? 'opacity-80' : undefined,
        className,
      )}
    >
      {children}
    </h1>
  ) : Component === 'p' ? (
    <p
      {...rest}
      className={joinClassName(
        'max-w-2xl leading-relaxed',
        heroDescriptionSizeClassMap[size],
        muted ? 'opacity-80' : undefined,
        className,
      )}
    >
      {children}
    </p>
  ) : (
    <></>
  )
}

/** Actions 的内部工具函数。 */
const Actions: FC<HeroActionsProps> = ({
  as = 'div',
  className,
  children,
  align,
  direction = 'row',
  stackOnMobile = false,
  ...rest
}) => {
  const Component = as as any

  return Component === 'div' ? (
    <div
      {...rest}
      className={joinClassName(
        'flex gap-3',
        stackOnMobile
          ? 'flex-col sm:flex-row sm:flex-wrap'
          : direction === 'column'
            ? 'flex-col'
            : 'flex-row flex-wrap',
        resolveActionsAlignmentClass(align, direction, stackOnMobile),
        className,
      )}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={joinClassName(
        'flex gap-3',
        stackOnMobile
          ? 'flex-col sm:flex-row sm:flex-wrap'
          : direction === 'column'
            ? 'flex-col'
            : 'flex-row flex-wrap',
        resolveActionsAlignmentClass(align, direction, stackOnMobile),
        className,
      )}
    >
      {children}
    </span>
  ) : Component === 'h1' ? (
    <h1
      {...rest}
      className={joinClassName(
        'flex gap-3',
        stackOnMobile
          ? 'flex-col sm:flex-row sm:flex-wrap'
          : direction === 'column'
            ? 'flex-col'
            : 'flex-row flex-wrap',
        resolveActionsAlignmentClass(align, direction, stackOnMobile),
        className,
      )}
    >
      {children}
    </h1>
  ) : Component === 'p' ? (
    <p
      {...rest}
      className={joinClassName(
        'flex gap-3',
        stackOnMobile
          ? 'flex-col sm:flex-row sm:flex-wrap'
          : direction === 'column'
            ? 'flex-col'
            : 'flex-row flex-wrap',
        resolveActionsAlignmentClass(align, direction, stackOnMobile),
        className,
      )}
    >
      {children}
    </p>
  ) : (
    <></>
  )
}

type HeroCompound = FC<HeroProps> & {
  Content: FC<HeroContentProps>
  Overlay: FC<HeroOverlayProps>
  Title: FC<HeroTitleProps>
  Description: FC<HeroDescriptionProps>
  Actions: FC<HeroActionsProps>
}

const HeroCompound: HeroCompound = /*#__PURE__*/ Object.assign(Hero, {
  Content,
  Overlay,
  Title,
  Description,
  Actions,
})

/** 默认导出首屏展示组件。 */
export default HeroCompound
