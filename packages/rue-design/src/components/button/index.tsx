import { Template } from '@rue-js/rue'
/*
Button 组件概述
- 提供语义化按钮 API，内部仍映射到 rue 当前的 btn 系列视觉类。
- 默认输出 button；当传入 href 或 as='a' 时输出 a，保留一致的交互和禁用语义。
- 组件仅保留当前推荐 API，不再承载旧版兼容分支。
*/
import type { FC } from '@rue-js/rue'
import { createContext, useContext } from '@rue-js/rue'
import { provideContext } from '@rue-js/rue/internal/app'

/** ButtonTone 语义色类型。 */
export type ButtonTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** ButtonColor 语义色类型。 */
export type ButtonColor = 'default' | 'danger' | ButtonTone
/** ButtonType 视觉或语义变体类型。 */
export type ButtonType = 'solid' | 'filled' | 'outlined' | 'dashed' | 'text' | 'link'
/** ButtonVariant 视觉或语义变体类型。 */
export type ButtonVariant = ButtonType
/** ButtonVisualVariant 视觉或语义变体类型。 */
export type ButtonVisualVariant = ButtonType
/** ButtonShape 类型。 */
export type ButtonShape = 'default' | 'square' | 'circle' | 'round'
/** ButtonSize 尺寸类型。 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'middle' | 'large'
/** ButtonHTMLType 视觉或语义变体类型。 */
export type ButtonHTMLType = 'button' | 'submit' | 'reset'
/** ButtonIconPlacement 位置或方向类型。 */
export type ButtonIconPlacement = 'start' | 'end'
/** ButtonGroupDirection 位置或方向类型。 */
export type ButtonGroupDirection = 'horizontal' | 'vertical'

/** ButtonLoadingConfig 配置对象。 */
export interface ButtonLoadingConfig {
  /** delay 配置项。 */
  delay?: number
  /** 图标内容。 */
  icon?: any
}

/** ButtonProps 组件属性。 */
export interface ButtonProps {
  /** 自定义渲染的宿主元素。 */
  as?: 'button' | 'a' | 'div'
  /** 组件类型或语义类型。 */
  type?: ButtonType
  /** 原生 button type 属性。 */
  htmlType?: ButtonHTMLType
  /** 组件语义色。 */
  color?: ButtonColor
  /** 组件形状。 */
  shape?: ButtonShape
  /** 组件尺寸。 */
  size?: ButtonSize
  /** 图标内容。 */
  icon?: any
  /** iconPlacement 配置项。 */
  iconPlacement?: ButtonIconPlacement
  /** 是否展示加载态。 */
  loading?: boolean | ButtonLoadingConfig
  /** 是否禁用交互。 */
  disabled?: boolean
  /** danger 配置项。 */
  danger?: boolean
  /** 是否处于激活态。 */
  active?: boolean
  /** block 配置项。 */
  block?: boolean
  /** wide 配置项。 */
  wide?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 链接地址。 */
  href?: string
  /** 链接或定位目标。 */
  target?: string
  /** 链接 rel 属性。 */
  rel?: string
  /** 点击时触发的回调。 */
  onClick?: (e: MouseEvent) => void
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ButtonGroupProps 组件属性。 */
export interface ButtonGroupProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 组件尺寸。 */
  size?: ButtonSize
  /** 组件形状。 */
  shape?: ButtonShape
  /** 布局方向。 */
  direction?: ButtonGroupDirection
  /** block 配置项。 */
  block?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedLoadingConfig {
  active: boolean
  delay: number
  icon?: any
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/**
 * 归一化尺寸别名，保留一组更顺手的语义名称，最终仍落到 daisyUI 的尺寸类。
 */
const resolveSizeClass = (size?: ButtonSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'medium':
    case 'middle':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** Loading 图标尺寸略小于按钮本体，避免视觉重心过高。 */
const resolveLoadingSizeClass = (size?: ButtonSize) => {
  const resolved = resolveSizeClass(size)
  switch (resolved) {
    case 'xs':
    case 'sm':
      return 'loading-xs'
    case 'lg':
      return 'loading-md'
    case 'xl':
      return 'loading-lg'
    default:
      return 'loading-sm'
  }
}

/** 解析 Button Size Utility Class 的内部工具函数。 */

/** resolve Button Shape Utility Class 的内部工具函数。 */

/** 解析 Button Group Shape Utility Class 的内部工具函数。 */
const resolveButtonGroupShapeUtilityClass = (shape?: ButtonShape) => {
  switch (shape) {
    case 'square':
      return 'btn-square'
    case 'circle':
    case 'round':
      return 'rounded-full'
    default:
      return undefined
  }
}

/**
 * type 直接承载视觉类型；颜色层由 color 单独控制。
 */
const resolveTypePreset = (type?: ButtonType) => {
  switch (type) {
    case 'outlined':
      return { outline: true, dash: false, soft: false, ghost: false, link: false }
    case 'dashed':
      return { outline: false, dash: true, soft: false, ghost: false, link: false }
    case 'filled':
      return { outline: false, dash: false, soft: true, ghost: false, link: false }
    case 'text':
      return { outline: false, dash: false, soft: false, ghost: true, link: false }
    case 'link':
      return { outline: false, dash: false, soft: false, ghost: false, link: true }
    default:
      return { outline: false, dash: false, soft: false, ghost: false, link: false }
  }
}

/** 标准化 loading 配置，支持 boolean 与对象两种写法。 */
const normalizeLoading = (loading?: boolean | ButtonLoadingConfig): NormalizedLoadingConfig => {
  if (!loading) {
    return { active: false, delay: 0 }
  }
  if (typeof loading === 'object') {
    return {
      active: true,
      delay: typeof loading.delay === 'number' && loading.delay > 0 ? loading.delay : 0,
      icon: loading.icon,
    }
  }
  return { active: true, delay: 0 }
}

/** 默认 loading 图标。 */
const DefaultLoadingIcon: FC<{ size?: ButtonSize }> = ({ size }) => {
  return <span className={`loading loading-spinner ${resolveLoadingSizeClass(size)}`.trim()} />
}

/** ButtonContentSlot 内部子节点插槽。 */
const ButtonContentSlot: FC<{ children?: any }> = ({ children }) => {
  return <span>{children}</span>
}

/** ButtonIconSlot 内部图标插槽，确保外部节点通过 children 锚点渲染。 */
const ButtonIconSlot: FC<{ hiddenFromA11y?: boolean; children?: any }> = ({
  hiddenFromA11y,
  children,
}) => {
  return (
    <span
      className="inline-flex items-center justify-center"
      aria-hidden={hiddenFromA11y ? 'true' : undefined}
    >
      {children}
    </span>
  )
}

/** Button content uses explicit icon and default slot factories. */
const ButtonChildren: FC<{
  iconPlacement: ButtonIconPlacement
  loading: boolean
  size?: ButtonSize
  hasIcon: boolean
  hasChildren: boolean
  children?: any
}> = (
  { iconPlacement, loading, size, hasIcon, hasChildren, children },
  slots: Record<string, any> = {},
) => {
  return iconPlacement === 'end' ? (
    <>
      {hasChildren ? <ButtonContentSlot>{children}</ButtonContentSlot> : null}
      {hasIcon ? (
        <ButtonIconSlot hiddenFromA11y={hasChildren}>
          {loading ? (
            slots.loadingIcon ? (
              <>{slots.loadingIcon}</>
            ) : (
              <DefaultLoadingIcon size={size} />
            )
          ) : (
            <>{slots.icon}</>
          )}
        </ButtonIconSlot>
      ) : null}
    </>
  ) : (
    <>
      {hasIcon ? (
        <ButtonIconSlot hiddenFromA11y={hasChildren}>
          {loading ? (
            slots.loadingIcon ? (
              <>{slots.loadingIcon}</>
            ) : (
              <DefaultLoadingIcon size={size} />
            )
          ) : (
            <>{slots.icon}</>
          )}
        </ButtonIconSlot>
      ) : null}
      {hasChildren ? <ButtonContentSlot>{children}</ButtonContentSlot> : null}
    </>
  )
}

const ButtonGroupContext = createContext<{ size?: ButtonSize; shape?: ButtonShape } | undefined>(
  undefined,
)

/** Button Group 的内部工具函数。 */
const ButtonGroup: FC<ButtonGroupProps> = ({
  as,
  size,
  shape,
  direction,
  block,
  className,
  style,
  children,
  ...rest
}) => {
  provideContext(ButtonGroupContext, () => ({ size, shape }))

  let cls = 'join'
  if (direction === 'vertical') cls += ' join-vertical flex-col'
  if (block) cls += ' w-full'
  if (className) cls += ` ${className}`

  if (!as || as === 'div') {
    return (
      <div
        {...rest}
        className={cls}
        style={style}
        data-rue-button-group="true"
        data-rue-button-group-direction={direction ?? 'horizontal'}
      >
        {children}
      </div>
    )
  }

  if (as === 'section') {
    return (
      <section
        {...rest}
        className={cls}
        style={style}
        data-rue-button-group="true"
        data-rue-button-group-direction={direction ?? 'horizontal'}
      >
        {children}
      </section>
    )
  }

  if (as === 'nav') {
    return (
      <nav
        {...rest}
        className={cls}
        style={style}
        data-rue-button-group="true"
        data-rue-button-group-direction={direction ?? 'horizontal'}
      >
        {children}
      </nav>
    )
  }

  const Tag = as as any

  return Tag === 'div' ? (
    <div
      {...rest}
      className={cls}
      style={style}
      data-rue-button-group="true"
      data-rue-button-group-direction={direction ?? 'horizontal'}
    >
      {children}
    </div>
  ) : Tag === 'span' ? (
    <span
      {...rest}
      className={cls}
      style={style}
      data-rue-button-group="true"
      data-rue-button-group-direction={direction ?? 'horizontal'}
    >
      {children}
    </span>
  ) : Tag === 'button' ? (
    <button
      {...rest}
      className={cls}
      style={style}
      data-rue-button-group="true"
      data-rue-button-group-direction={direction ?? 'horizontal'}
    >
      {children}
    </button>
  ) : Tag === 'a' ? (
    <a
      {...rest}
      className={cls}
      style={style}
      data-rue-button-group="true"
      data-rue-button-group-direction={direction ?? 'horizontal'}
    >
      {children}
    </a>
  ) : Tag === 'section' ? (
    <section
      {...rest}
      className={cls}
      style={style}
      data-rue-button-group="true"
      data-rue-button-group-direction={direction ?? 'horizontal'}
    >
      {children}
    </section>
  ) : Tag === 'nav' ? (
    <nav
      {...rest}
      className={cls}
      style={style}
      data-rue-button-group="true"
      data-rue-button-group-direction={direction ?? 'horizontal'}
    >
      {children}
    </nav>
  ) : (
    <></>
  )
}

/** Button 的内部工具函数。 */
const Button: FC<ButtonProps> = (
  {
    as,
    type,
    htmlType,
    color,
    shape = 'default',
    size,
    icon,
    iconPlacement = 'start',
    loading,
    disabled,
    danger,
    active,
    block,
    wide,
    className,
    href,
    target,
    rel,
    onClick,
    children,
    ...rest
  },
  slots: Record<string, any> = {},
) => {
  const group = useContext(ButtonGroupContext)
  const mergedShape = group?.shape ?? shape
  const typePreset = resolveTypePreset(type)
  const mergedColor: ButtonColor = color ?? (danger ? 'danger' : 'default')
  const mergedSize = resolveSizeClass(group?.size ?? size)
  const normalizedLoading = normalizeLoading(loading)
  const mergedDisabled = !!disabled || normalizedLoading.active
  const renderAs = as ?? (href ? 'a' : 'button')
  const loadingVisible = normalizedLoading.active
  const hasIcon = loadingVisible || slots.icon != null
  const hasChildren = children != null

  let cls = group ? 'btn join-item' : 'btn'
  if (mergedColor !== 'default') {
    cls += ` btn-${mergedColor === 'danger' ? 'error' : mergedColor}`
  }
  if (mergedSize) cls += ` btn-${mergedSize}`
  if (typePreset.outline) cls += ' btn-outline'
  if (typePreset.dash) cls += ' btn-dash'
  if (typePreset.soft) cls += ' btn-soft'
  if (typePreset.ghost) cls += ' btn-ghost'
  if (typePreset.link) cls += ' btn-link'
  if (active) cls += ' btn-active'
  if (block) cls += ' btn-block'
  if (wide) cls += ' btn-wide'
  if (mergedShape === 'square') cls += ' btn-square'
  if (mergedShape === 'circle') cls += ' btn-circle'
  if (mergedShape === 'round') cls += ' rounded-full'
  if (group?.shape) cls += ` ${resolveButtonGroupShapeUtilityClass(group.shape)}`
  if (mergedDisabled && renderAs !== 'button') cls += ' btn-disabled'
  if (className) cls += ` ${className}`

  const mergedClassName = mergeClassName(cls, hasIcon && hasChildren ? 'gap-2' : undefined)

  const handleClick = (event: MouseEvent) => {
    if (mergedDisabled) {
      if (typeof (event as any).preventDefault === 'function') {
        ;(event as any).preventDefault()
      }
      if (typeof (event as any).stopPropagation === 'function') {
        ;(event as any).stopPropagation()
      }
      return
    }
    if (onClick) onClick(event)
  }

  if (renderAs === 'a') {
    const anchorRel = target === '_blank' && !rel ? 'noreferrer' : rel
    return (
      <a
        {...rest}
        href={mergedDisabled ? undefined : href}
        target={target}
        rel={anchorRel}
        role={href ? rest.role : (rest.role ?? 'button')}
        className={mergedClassName}
        aria-disabled={mergedDisabled ? 'true' : undefined}
        aria-busy={loadingVisible ? 'true' : undefined}
        onClick={handleClick}
      >
        <ButtonChildren
          iconPlacement={iconPlacement}
          loading={loadingVisible}
          size={size}
          hasIcon={hasIcon}
          hasChildren={hasChildren}
        >
          <Template slot="icon">{slots.icon}</Template>
          <Template slot="loadingIcon">
            {slots.loadingIcon ? <>{slots.loadingIcon}</> : <DefaultLoadingIcon size={size} />}
          </Template>
          {children}
        </ButtonChildren>
      </a>
    )
  }

  if (renderAs === 'div') {
    return (
      <div
        {...rest}
        role={rest.role ?? 'button'}
        tabIndex={rest.tabIndex ?? (mergedDisabled ? -1 : 0)}
        className={mergedClassName}
        aria-disabled={mergedDisabled ? 'true' : undefined}
        aria-busy={loadingVisible ? 'true' : undefined}
        onClick={handleClick}
      >
        <ButtonChildren
          iconPlacement={iconPlacement}
          loading={loadingVisible}
          size={size}
          hasIcon={hasIcon}
          hasChildren={hasChildren}
        >
          <Template slot="icon">{slots.icon}</Template>
          <Template slot="loadingIcon">
            {slots.loadingIcon ? <>{slots.loadingIcon}</> : <DefaultLoadingIcon size={size} />}
          </Template>
          {children}
        </ButtonChildren>
      </div>
    )
  }

  return (
    <button
      {...rest}
      className={mergedClassName}
      disabled={mergedDisabled}
      type={htmlType ?? 'button'}
      aria-busy={loadingVisible ? 'true' : undefined}
      onClick={handleClick}
    >
      <ButtonChildren
        iconPlacement={iconPlacement}
        loading={loadingVisible}
        size={size}
        hasIcon={hasIcon}
        hasChildren={hasChildren}
      >
        <Template slot="icon">{slots.icon}</Template>
        <Template slot="loadingIcon">
          {slots.loadingIcon ? <>{slots.loadingIcon}</> : <DefaultLoadingIcon size={size} />}
        </Template>
        {children}
      </ButtonChildren>
    </button>
  )
}

type ButtonCompound = FC<ButtonProps> & {
  Group: FC<ButtonGroupProps>
}

const ButtonCompound: ButtonCompound = /*#__PURE__*/ Object.assign(Button, {
  Group: ButtonGroup,
})

/** 默认导出按钮组件。 */
export default ButtonCompound
