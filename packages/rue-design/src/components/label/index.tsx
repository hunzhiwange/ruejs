/*
Label 组件概述
- 保留 Rue 当前 input / select 包装与 floating-label 复合写法。
- 增强为字段级 API：label、description、help、error、required、prefix/suffix、status、size 等可直接组合。
- 默认仍输出轻量 label 壳；只有传入字段说明类 props 时才包一层字段布局。
*/
import type { FC } from '@rue-js/rue'

/** LabelControl 类型。 */
export type LabelControl = 'input' | 'select' | 'textarea' | 'none'
/** LabelTone 语义色类型。 */
export type LabelTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
/** LabelColor 语义色类型。 */
export type LabelColor = 'default' | LabelTone
/** LabelStatus 状态类型。 */
export type LabelStatus = 'default' | 'success' | 'warning' | 'error'
/** LabelSize 尺寸类型。 */
export type LabelSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'
/** LabelVariant 视觉或语义变体类型。 */
export type LabelVariant = 'outlined' | 'filled' | 'ghost' | 'borderless'
/** LabelLayout 类型。 */
export type LabelLayout = 'stacked' | 'inline'
/** LabelAlign 对齐方式类型。 */
export type LabelAlign = 'start' | 'center' | 'end'
/** LabelRootAs 类型。 */
export type LabelRootAs = 'label' | 'div'
/** LabelTextTone 语义色类型。 */
export type LabelTextTone = LabelTone | 'default' | 'muted'

/** LabelRootProps 组件属性。 */
export interface LabelRootProps {
  /** 自定义渲染的宿主元素。 */
  as?: LabelRootAs
  /** control 配置项。 */
  control?: LabelControl
  /** 展示标签。 */
  label?: any
  /** 描述内容。 */
  description?: any
  /** help 配置项。 */
  help?: any
  /** error 配置项。 */
  error?: any
  /** 额外操作或补充内容。 */
  extra?: any
  /** optional 配置项。 */
  optional?: any
  /** required 配置项。 */
  required?: boolean
  /** 组件语义色。 */
  color?: LabelColor
  /** 组件状态。 */
  status?: LabelStatus
  /** 组件尺寸。 */
  size?: LabelSize
  /** 组件视觉变体。 */
  variant?: LabelVariant
  /** ghost 配置项。 */
  ghost?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** block 配置项。 */
  block?: boolean
  /** layout 配置项。 */
  layout?: LabelLayout
  /** 交叉轴或内容对齐方式。 */
  align?: LabelAlign
  /** labelWidth 配置项。 */
  labelWidth?: string | number
  /** 前缀内容。 */
  prefix?: any
  /** 后缀内容。 */
  suffix?: any
  /** 根节点附加类名。 */
  rootClassName?: string
  /** labelClassName 附加类名。 */
  labelClassName?: string
  /** descriptionClassName 附加类名。 */
  descriptionClassName?: string
  /** helpClassName 附加类名。 */
  helpClassName?: string
  /** extraClassName 附加类名。 */
  extraClassName?: string
  /** affixClassName 附加类名。 */
  affixClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** LabelTextProps 组件属性。 */
export interface LabelTextProps {
  /** 组件语义色调。 */
  tone?: LabelTextTone
  /** muted 配置项。 */
  muted?: boolean
  /** strong 配置项。 */
  strong?: boolean
  /** required 配置项。 */
  required?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** LabelCaptionProps 组件属性。 */
export interface LabelCaptionProps {
  text?: string
  /** required 配置项。 */
  required?: boolean
  /** optional 配置项。 */
  optional?: any
  /** 额外操作或补充内容。 */
  extra?: any
  /** 根节点附加类名。 */
  className?: string
  /** textClassName 附加类名。 */
  textClassName?: string
  /** extraClassName 附加类名。 */
  extraClassName?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** LabelHelpProps 组件属性。 */
export interface LabelHelpProps {
  /** 组件状态。 */
  status?: LabelStatus
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FloatingLabelProps 组件属性。 */
export interface FloatingLabelProps {
  /** caption 配置项。 */
  caption?: any
  /** text 区域配置。 */
  text?: any
  /** 描述内容。 */
  description?: any
  /** help 配置项。 */
  help?: any
  /** error 配置项。 */
  error?: any
  /** 额外操作或补充内容。 */
  extra?: any
  /** optional 配置项。 */
  optional?: any
  /** required 配置项。 */
  required?: boolean
  /** 组件状态。 */
  status?: LabelStatus
  /** 是否禁用交互。 */
  disabled?: boolean
  /** block 配置项。 */
  block?: boolean
  /** layout 配置项。 */
  layout?: LabelLayout
  /** 交叉轴或内容对齐方式。 */
  align?: LabelAlign
  /** labelWidth 配置项。 */
  labelWidth?: string | number
  /** 根节点附加类名。 */
  rootClassName?: string
  /** captionClassName 附加类名。 */
  captionClassName?: string
  /** textClassName 附加类名。 */
  textClassName?: string
  /** descriptionClassName 附加类名。 */
  descriptionClassName?: string
  /** helpClassName 附加类名。 */
  helpClassName?: string
  /** extraClassName 附加类名。 */
  extraClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

const labelSizeMap = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  small: 'sm',
  middle: 'md',
  medium: 'md',
  large: 'lg',
} as const

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (...parts: Array<string | false | null | undefined>) => {
  return parts.filter(Boolean).join(' ')
}

/** 判断是否存在 Node 的内部工具函数。 */
const hasNode = (value: any) => {
  return value !== undefined && value !== null && value !== false
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: LabelSize) => {
  return size ? labelSizeMap[size] : undefined
}

/** 解析 Status Tone 的内部工具函数。 */
const resolveStatusTone = (status?: LabelStatus) => {
  switch (status) {
    case 'success':
    case 'warning':
    case 'error':
      return status
    default:
      return undefined
  }
}

/** 解析 Control Base 的内部工具函数。 */
const resolveControlBase = (control: LabelControl) => {
  return control === 'none' ? 'label' : control
}

/** 解析 Variant Class Name 的内部工具函数。 */
const resolveVariantClassName = (base: string, variant?: LabelVariant, ghost?: boolean) => {
  const resolvedVariant = ghost ? 'ghost' : variant
  switch (resolvedVariant) {
    case 'filled':
      return 'bg-base-200/70 border-base-300 shadow-none focus-within:bg-base-100'
    case 'ghost':
      return `${base}-ghost`
    case 'borderless':
      return `${base}-ghost bg-transparent border-transparent shadow-none`
    default:
      return undefined
  }
}

/** 构建 Control Class Name 的内部工具函数。 */
const buildControlClassName = ({
  control = 'input',
  color,
  status,
  size,
  variant,
  ghost,
  disabled,
  block,
  className,
}: Pick<
  LabelRootProps,
  'control' | 'color' | 'status' | 'size' | 'variant' | 'ghost' | 'disabled' | 'block' | 'className'
>) => {
  const base = resolveControlBase(control)
  const resolvedSize = resolveSizeClass(size)
  const resolvedTone = color && color !== 'default' ? color : resolveStatusTone(status)
  const variantClassName =
    control === 'none' ? undefined : resolveVariantClassName(base, variant, ghost)

  let cls = base
  if (control !== 'none' && resolvedTone) cls += ` ${base}-${resolvedTone}`
  if (control !== 'none' && resolvedSize) cls += ` ${base}-${resolvedSize}`
  if (variantClassName) cls += ` ${variantClassName}`
  if (disabled) cls += ' opacity-60 cursor-not-allowed'
  if (block) cls += ' w-full'
  if (className) cls += ` ${className}`
  return cls
}

/** 解析 Text Tone Class Name 的内部工具函数。 */
const resolveTextToneClassName = (tone?: LabelTextTone, muted?: boolean) => {
  if (muted || tone === 'muted') return 'opacity-60'
  switch (tone) {
    case 'neutral':
      return 'text-neutral'
    case 'primary':
      return 'text-primary'
    case 'secondary':
      return 'text-secondary'
    case 'accent':
      return 'text-accent'
    case 'info':
      return 'text-info'
    case 'success':
      return 'text-success'
    case 'warning':
      return 'text-warning'
    case 'error':
      return 'text-error'
    default:
      return undefined
  }
}

/** 构建 Field Class Name 的内部工具函数。 */
const buildFieldClassName = (layout?: LabelLayout, block?: boolean, className?: string) => {
  return mergeClassName(
    layout === 'inline'
      ? 'grid gap-2 sm:grid-cols-[var(--label-inline-width, minmax(8rem,12rem))_1fr]'
      : 'grid gap-1',
    block && 'w-full',
    className,
  )
}

/** 解析 Inline Align Class Name 的内部工具函数。 */
const resolveInlineAlignClassName = (align?: LabelAlign) => {
  switch (align) {
    case 'center':
      return 'sm:items-center'
    case 'end':
      return 'sm:items-end'
    default:
      return 'sm:items-start'
  }
}

/** 解析 Inline Width Style 的内部工具函数。 */
const resolveInlineWidthStyle = (layout?: LabelLayout, labelWidth?: string | number) => {
  if (layout !== 'inline' || labelWidth === undefined || labelWidth === null || labelWidth === '')
    return undefined
  return {
    '--label-inline-width': typeof labelWidth === 'number' ? `${labelWidth}px` : labelWidth,
  } as any
}

/** 构建 Help Class Name 的内部工具函数。 */
const buildHelpClassName = (status?: LabelStatus, className?: string) => {
  const tone = resolveStatusTone(status)
  return mergeClassName(
    'text-xs leading-relaxed',
    tone === 'success' && 'text-success',
    tone === 'warning' && 'text-warning',
    tone === 'error' && 'text-error',
    !tone && 'opacity-70',
    className,
  )
}

/** Required Mark 的内部工具函数。 */
const RequiredMark: FC = () => {
  return (
    <span className="text-error" aria-hidden="true">
      *
    </span>
  )
}

/** Text 的内部工具函数。 */
const Text: FC<LabelTextProps> = ({
  tone,
  muted,
  strong,
  required,
  className,
  children,
  ...rest
}) => {
  return (
    <span
      {...rest}
      className={mergeClassName(
        'label',
        resolveTextToneClassName(tone, muted),
        strong && 'font-semibold',
        className,
      )}
    >
      {children}
      {required ? <RequiredMark /> : null}
    </span>
  )
}

/** Caption 的内部工具函数。 */
const Caption: FC<LabelCaptionProps> = ({
  required,
  optional,
  extra,
  className,
  textClassName,
  extraClassName,
  children,
  text,
  ...rest
}) => {
  return (
    <div {...rest} className={mergeClassName('label px-0 pb-1', className)}>
      <span className={mergeClassName('inline-flex items-center gap-1 font-medium', textClassName)}>
        {text !== undefined ? <span>{String(text)}</span> : children}
        {required ? <RequiredMark /> : null}
      </span>
      {hasNode(extra) || hasNode(optional) ? (
        <span className={mergeClassName('text-xs opacity-60', extraClassName)}>
          {String(hasNode(extra) ? extra : (optional ?? ''))}
        </span>
      ) : null}
    </div>
  )
}

/** Help 的内部工具函数。 */
const Help: FC<LabelHelpProps> = ({ status, className, children, ...rest }) => {
  return (
    <div {...rest} className={buildHelpClassName(status, className)}>
      {children}
    </div>
  )
}

/** 渲染 Caption 的内部工具函数。 */
const RenderCaption = ({
  label,
  required,
  optional,
  extra,
  labelClassName,
  extraClassName,
}: Pick<
  LabelRootProps,
  'label' | 'required' | 'optional' | 'extra' | 'labelClassName' | 'extraClassName'
>) => {
  if (!hasNode(label) && !required && !hasNode(optional) && !hasNode(extra)) return <></>
  return (
    <Caption
      required={required}
      optional={optional}
      extra={extra}
      textClassName={labelClassName}
      extraClassName={extraClassName}
      text={String(label ?? '')}
    />
  )
}

/** 渲染 Description 的内部工具函数。 */
const RenderDescription = ({
  arg0: description,
  arg1: className,
}: {
  arg0: any
  arg1?: string
}) => {
  if (!hasNode(description)) return <></>
  return (
    <div className={mergeClassName('text-xs leading-relaxed opacity-70', className)}>
      {String(description ?? '')}
    </div>
  )
}

/** 渲染 Help 的内部工具函数。 */
const RenderHelp = ({
  arg0: help,
  arg1: error,
  arg2: status,
  arg3: className,
}: {
  arg0: any
  arg1: any
  arg2?: LabelStatus
  arg3?: string
}) => {
  const content = hasNode(error) ? error : help
  if (!hasNode(content)) return <></>
  return (
    <div className={buildHelpClassName(hasNode(error) ? 'error' : status, className)}>
      {String(content ?? '')}
    </div>
  )
}

/** 渲染 Control Affix 的内部工具函数。 */
const RenderControlAffix = ({ arg0: content, arg1: className }: { arg0: any; arg1?: string }) => {
  if (!hasNode(content)) return <></>
  return <span className={mergeClassName('label', className)}>{String(content ?? '')}</span>
}

/** 渲染 Control Node 的内部工具函数。 */
const RenderControlNode = ({
  as,
  rest,
  controlClassName,
  required,
  resolvedStatus,
  disabled,
  prefix,
  suffix,
  affixClassName,
  children,
}: {
  as?: LabelRootAs
  rest: Record<string, any>
  controlClassName: string
  required?: boolean
  resolvedStatus?: LabelStatus
  disabled?: boolean
  prefix?: any
  suffix?: any
  affixClassName?: string
  children?: any
}) => {
  const controlAriaProps = {
    'aria-required': required ? 'true' : rest['aria-required'],
    'aria-invalid': resolvedStatus === 'error' ? 'true' : rest['aria-invalid'],
    'aria-disabled': disabled ? 'true' : rest['aria-disabled'],
  }

  if (as === 'div') {
    return (
      <div {...rest} className={controlClassName} {...controlAriaProps}>
        <RenderControlAffix arg0={prefix} arg1={affixClassName} />
        {children}
        <RenderControlAffix arg0={suffix} arg1={affixClassName} />
      </div>
    )
  }

  return (
    <label {...rest} className={controlClassName} {...controlAriaProps}>
      <RenderControlAffix arg0={prefix} arg1={affixClassName} />
      {children}
      <RenderControlAffix arg0={suffix} arg1={affixClassName} />
    </label>
  )
}

/** Label Root 的内部工具函数。 */
const LabelRoot: FC<LabelRootProps> = ({
  as,
  control = 'input',
  label,
  description,
  help,
  error,
  extra,
  optional,
  required,
  color,
  status,
  size,
  variant,
  ghost,
  disabled,
  block,
  layout = 'stacked',
  align,
  labelWidth,
  prefix,
  suffix,
  rootClassName,
  labelClassName,
  descriptionClassName,
  helpClassName,
  extraClassName,
  affixClassName,
  className,
  children,
  ...rest
}) => {
  const resolvedStatus = status ?? (hasNode(error) ? 'error' : undefined)
  const controlClassName = buildControlClassName({
    control,
    color,
    status: resolvedStatus,
    size,
    variant,
    ghost,
    disabled,
    block,
    className,
  })
  const hasFieldLayout =
    hasNode(label) ||
    hasNode(description) ||
    hasNode(help) ||
    hasNode(error) ||
    hasNode(extra) ||
    hasNode(optional) ||
    !!rootClassName ||
    layout === 'inline'
  const fieldClassName = buildFieldClassName(layout, block, rootClassName)
  const fieldStyle = resolveInlineWidthStyle(layout, labelWidth)

  if (!hasFieldLayout) {
    return (
      <RenderControlNode
        as={as}
        rest={rest}
        controlClassName={controlClassName}
        required={required}
        resolvedStatus={resolvedStatus}
        disabled={disabled}
        prefix={prefix}
        suffix={suffix}
        affixClassName={affixClassName}
      >
        {children}
      </RenderControlNode>
    )
  }

  if (layout === 'inline') {
    return (
      <div
        className={mergeClassName(fieldClassName, resolveInlineAlignClassName(align))}
        style={fieldStyle}
      >
        <div>
          <RenderCaption
            label={label}
            required={required}
            optional={optional}
            extra={extra}
            labelClassName={labelClassName}
            extraClassName={extraClassName}
          />
          <RenderDescription arg0={String(description ?? '')} arg1={descriptionClassName} />
        </div>
        <div className="grid gap-1">
          <RenderControlNode
            as={as}
            rest={rest}
            controlClassName={controlClassName}
            required={required}
            resolvedStatus={resolvedStatus}
            disabled={disabled}
            prefix={prefix}
            suffix={suffix}
            affixClassName={affixClassName}
          >
            {children}
          </RenderControlNode>
          <RenderHelp arg0={help} arg1={error} arg2={resolvedStatus} arg3={helpClassName} />
        </div>
      </div>
    )
  }

  return (
    <div className={fieldClassName}>
      <RenderCaption
        label={label}
        required={required}
        optional={optional}
        extra={extra}
        labelClassName={labelClassName}
        extraClassName={extraClassName}
      />
      <RenderDescription arg0={String(description ?? '')} arg1={descriptionClassName} />
      <RenderControlNode
        as={as}
        rest={rest}
        controlClassName={controlClassName}
        required={required}
        resolvedStatus={resolvedStatus}
        disabled={disabled}
        prefix={prefix}
        suffix={suffix}
        affixClassName={affixClassName}
      >
        {children}
      </RenderControlNode>
      <RenderHelp arg0={help} arg1={error} arg2={resolvedStatus} arg3={helpClassName} />
    </div>
  )
}

/** Floating Text 的内部工具函数。 */
const FloatingText: FC<LabelTextProps> = ({
  tone,
  muted,
  strong,
  required,
  className,
  children,
  ...rest
}) => {
  return (
    <span
      {...rest}
      className={mergeClassName(
        resolveTextToneClassName(tone, muted),
        strong && 'font-semibold',
        className,
      )}
    >
      {children}
      {required ? <RequiredMark /> : null}
    </span>
  )
}

/** 渲染 Floating Node 的内部工具函数。 */
const RenderFloatingNode = ({
  rest,
  required,
  resolvedStatus,
  disabled,
  block,
  className,
  children,
  text,
  textClassName,
}: {
  rest: Record<string, any>
  required?: boolean
  resolvedStatus?: LabelStatus
  disabled?: boolean
  block?: boolean
  className?: string
  children?: any
  text?: any
  textClassName?: string
}) => {
  const floatingAriaProps = {
    'aria-required': required ? 'true' : rest['aria-required'],
    'aria-invalid': resolvedStatus === 'error' ? 'true' : rest['aria-invalid'],
    'aria-disabled': disabled ? 'true' : rest['aria-disabled'],
  }

  return (
    <label
      {...rest}
      className={mergeClassName(
        'floating-label',
        disabled && 'opacity-60 cursor-not-allowed',
        block && 'w-full',
        className,
      )}
      {...floatingAriaProps}
    >
      {children}
      {hasNode(text) ? (
        <FloatingText required={required} className={textClassName}>
          {String(text ?? '')}
        </FloatingText>
      ) : null}
    </label>
  )
}

/** Floating 的内部工具函数。 */
const Floating: FC<FloatingLabelProps> = ({
  caption,
  text,
  description,
  help,
  error,
  extra,
  optional,
  required,
  status,
  disabled,
  block,
  layout = 'stacked',
  align,
  labelWidth,
  rootClassName,
  captionClassName,
  textClassName,
  descriptionClassName,
  helpClassName,
  extraClassName,
  className,
  children,
  ...rest
}) => {
  const resolvedStatus = status ?? (hasNode(error) ? 'error' : undefined)
  const hasFieldLayout =
    hasNode(caption) ||
    hasNode(description) ||
    hasNode(help) ||
    hasNode(error) ||
    hasNode(extra) ||
    hasNode(optional) ||
    !!rootClassName ||
    layout === 'inline'
  const fieldClassName = buildFieldClassName(layout, block, rootClassName)
  const fieldStyle = resolveInlineWidthStyle(layout, labelWidth)

  if (!hasFieldLayout) {
    return (
      <RenderFloatingNode
        rest={rest}
        required={required}
        resolvedStatus={resolvedStatus}
        disabled={disabled}
        block={block}
        className={className}
        text={text}
        textClassName={textClassName}
      >
        {children}
      </RenderFloatingNode>
    )
  }

  if (layout === 'inline') {
    return (
      <div
        className={mergeClassName(fieldClassName, resolveInlineAlignClassName(align))}
        style={fieldStyle}
      >
        <div>
          <RenderCaption
            label={caption}
            required={required}
            optional={optional}
            extra={extra}
            labelClassName={captionClassName}
            extraClassName={extraClassName}
          />
          <RenderDescription arg0={String(description ?? '')} arg1={descriptionClassName} />
        </div>
        <div className="grid gap-1">
          <RenderFloatingNode
            rest={rest}
            required={required}
            resolvedStatus={resolvedStatus}
            disabled={disabled}
            block={block}
            className={className}
            text={text}
            textClassName={textClassName}
          >
            {children}
          </RenderFloatingNode>
          <RenderHelp arg0={help} arg1={error} arg2={resolvedStatus} arg3={helpClassName} />
        </div>
      </div>
    )
  }

  return (
    <div className={fieldClassName}>
      <RenderCaption
        label={caption}
        required={required}
        optional={optional}
        extra={extra}
        labelClassName={captionClassName}
        extraClassName={extraClassName}
      />
      <RenderDescription arg0={String(description ?? '')} arg1={descriptionClassName} />
      <RenderFloatingNode
        rest={rest}
        required={required}
        resolvedStatus={resolvedStatus}
        disabled={disabled}
        block={block}
        className={className}
        text={text}
        textClassName={textClassName}
      >
        {children}
      </RenderFloatingNode>
      <RenderHelp arg0={help} arg1={error} arg2={resolvedStatus} arg3={helpClassName} />
    </div>
  )
}

type LabelCompound = FC<LabelRootProps> & {
  Text: FC<LabelTextProps>
  Caption: FC<LabelCaptionProps>
  Help: FC<LabelHelpProps>
  Floating: FC<FloatingLabelProps>
  FloatingText: FC<LabelTextProps>
}

const LabelCompound: LabelCompound = /*#__PURE__*/ Object.assign(LabelRoot, {
  Text,
  Caption,
  Help,
  Floating,
  FloatingText,
})

/** 默认导出标签组件。 */
export default LabelCompound
