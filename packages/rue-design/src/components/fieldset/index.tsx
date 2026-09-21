/*
Fieldset 模块概述
- 汇总字段集组件的公开类型、渲染入口和局部工具逻辑。
- 结构化内容属性与 children 一样通过编译插槽挂载，可承载 JSX 渲染值。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'

/** FieldsetTone 语义色类型。 */
export type FieldsetTone =
  | 'default'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** FieldsetVariant 视觉或语义变体类型。 */
export type FieldsetVariant = 'default' | 'soft' | 'outlined'
/** FieldsetSize 尺寸类型。 */
export type FieldsetSize = 'sm' | 'md' | 'lg' | 'small' | 'middle' | 'medium' | 'large'

/** FieldsetRootProps 组件属性。 */
export interface FieldsetRootProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** legend 配置项。 */
  legend?: any
  /** 描述内容。 */
  description?: any
  /** hint 配置项。 */
  hint?: any
  /** 主体内容。 */
  content?: any
  /** 底部操作区。 */
  actions?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<FieldsetItemData>
  /** 组件尺寸。 */
  size?: FieldsetSize
  /** 组件语义色调。 */
  tone?: FieldsetTone
  /** 组件视觉变体。 */
  variant?: FieldsetVariant
  /** bordered 配置项。 */
  bordered?: boolean
  /** invalid 配置项。 */
  invalid?: boolean
  /** legendClassName 附加类名。 */
  legendClassName?: string
  /** descriptionClassName 附加类名。 */
  descriptionClassName?: string
  /** hintClassName 附加类名。 */
  hintClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** actionsClassName 附加类名。 */
  actionsClassName?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FieldsetLegendProps 组件属性。 */
export interface FieldsetLegendProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** aside 配置项。 */
  aside?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FieldsetLabelProps 组件属性。 */
export interface FieldsetLabelProps {
  /** 自定义渲染的宿主元素。 */
  as?: 'label' | 'p' | 'span' | 'div'
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 组件语义色调。 */
  tone?: FieldsetTone | 'muted'
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FieldsetItemProps 组件属性。 */
export interface FieldsetItemProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 展示标签。 */
  label?: any
  /** 描述内容。 */
  description?: any
  /** hint 配置项。 */
  hint?: any
  /** control 配置项。 */
  control?: any
  controlProps?: Record<string, any>
  /** required 配置项。 */
  required?: boolean
  /** optional 配置项。 */
  optional?: boolean
  /** horizontal 配置项。 */
  horizontal?: boolean
  /** 组件尺寸。 */
  size?: FieldsetSize
  /** 组件语义色调。 */
  tone?: FieldsetTone
  /** invalid 配置项。 */
  invalid?: boolean
  /** labelClassName 附加类名。 */
  labelClassName?: string
  /** descriptionClassName 附加类名。 */
  descriptionClassName?: string
  /** hintClassName 附加类名。 */
  hintClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** labelProps 透传属性。 */
  labelProps?: Omit<FieldsetLabelProps, 'children' | 'className'>
  /** descriptionProps 透传属性。 */
  descriptionProps?: Omit<FieldsetLabelProps, 'children' | 'className' | 'as'>
  /** hintProps 透传属性。 */
  hintProps?: Omit<FieldsetLabelProps, 'children' | 'className' | 'as'>
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FieldsetItemData 数据项结构。 */
export interface FieldsetItemData extends Omit<FieldsetItemProps, 'children'> {
  /** 数据项唯一标识。 */
  key?: string | number
}

/** join Class Name 的内部工具函数。 */
const joinClassName = (...values: Array<string | undefined | false>) =>
  values.filter(Boolean).join(' ')

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** 解析 Size 的内部工具函数。 */
const resolveSize = (size?: FieldsetSize): 'sm' | 'md' | 'lg' => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'middle':
    case 'medium':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size ?? 'md'
  }
}

/** 解析 Gap Class 的内部工具函数。 */
const resolveGapClass = (size?: FieldsetSize) => {
  switch (resolveSize(size)) {
    case 'sm':
      return 'gap-2'
    case 'lg':
      return 'gap-4'
    default:
      return 'gap-3'
  }
}

/** 解析 Surface Class 的内部工具函数。 */
const resolveSurfaceClass = ({
  variant,
  tone,
  bordered,
  invalid,
}: Pick<FieldsetRootProps, 'variant' | 'tone' | 'bordered' | 'invalid'>) => {
  if (invalid) return 'rounded-box border border-error/30 bg-error/5 p-4'

  if (variant === 'soft') {
    switch (tone) {
      case 'neutral':
        return 'rounded-box bg-neutral/5 p-4'
      case 'primary':
        return 'rounded-box bg-primary/5 p-4'
      case 'secondary':
        return 'rounded-box bg-secondary/5 p-4'
      case 'accent':
        return 'rounded-box bg-accent/5 p-4'
      case 'info':
        return 'rounded-box bg-info/8 p-4'
      case 'success':
        return 'rounded-box bg-success/8 p-4'
      case 'warning':
        return 'rounded-box bg-warning/10 p-4'
      case 'error':
        return 'rounded-box bg-error/8 p-4'
      default:
        return 'rounded-box bg-base-200 p-4'
    }
  }

  if (variant === 'outlined' || bordered) {
    switch (tone) {
      case 'neutral':
        return 'rounded-box border border-neutral/20 bg-neutral/5 p-4'
      case 'primary':
        return 'rounded-box border border-primary/25 bg-primary/5 p-4'
      case 'secondary':
        return 'rounded-box border border-secondary/25 bg-secondary/5 p-4'
      case 'accent':
        return 'rounded-box border border-accent/25 bg-accent/5 p-4'
      case 'info':
        return 'rounded-box border border-info/30 bg-info/8 p-4'
      case 'success':
        return 'rounded-box border border-success/30 bg-success/8 p-4'
      case 'warning':
        return 'rounded-box border border-warning/35 bg-warning/10 p-4'
      case 'error':
        return 'rounded-box border border-error/30 bg-error/8 p-4'
      default:
        return 'rounded-box border border-base-300 bg-base-100 p-4'
    }
  }

  return undefined
}

/** 解析 Text Tone Class 的内部工具函数。 */
const resolveTextToneClass = (tone?: FieldsetTone | 'muted') => {
  switch (tone) {
    case 'muted':
      return 'opacity-70'
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

/** 解析 Label Text Class 的内部工具函数。 */
const resolveLabelTextClass = (size?: FieldsetSize) => {
  switch (resolveSize(size)) {
    case 'sm':
      return 'text-xs'
    case 'lg':
      return 'text-sm'
    default:
      return 'text-sm'
  }
}

/** 解析 Hint Text Class 的内部工具函数。 */
const resolveHintTextClass = (size?: FieldsetSize) => {
  switch (resolveSize(size)) {
    case 'lg':
      return 'text-sm'
    default:
      return 'text-xs'
  }
}

/** Legend 的内部工具函数。 */
const Legend: FC<FieldsetLegendProps> = ({ className, children, aside, ...rest }) => {
  const hasAside = hasRenderableContent(aside)
  return (
    <legend {...rest} className={joinClassName('fieldset-legend', className)}>
      {hasAside ? (
        <span className="flex w-full items-center gap-2">
          <span>{children}</span>
          <span className="ml-auto text-xs font-normal opacity-65">{aside}</span>
        </span>
      ) : (
        children
      )}
    </legend>
  )
}

/** Label 的内部工具函数。 */
const Label: FC<FieldsetLabelProps> = ({ as = 'label', className, children, tone, ...rest }) => {
  const cls = joinClassName('label', resolveTextToneClass(tone), className)

  if (as === 'p') {
    return (
      <p {...rest} className={joinClassName(cls, 'block min-w-0 whitespace-normal break-words')}>
        {children}
      </p>
    )
  }

  if (as === 'span') {
    return (
      <span {...rest} className={cls}>
        {children}
      </span>
    )
  }

  if (as === 'div') {
    return (
      <div {...rest} className={cls}>
        {children}
      </div>
    )
  }

  return (
    <label {...rest} className={cls}>
      {children}
    </label>
  )
}

/** Item 的内部工具函数。 */
const Item: FC<FieldsetItemProps> = ({
  className,
  children,
  label,
  description,
  hint,
  control,
  controlProps,
  required,
  optional,
  horizontal,
  size,
  tone,
  invalid,
  labelClassName,
  descriptionClassName,
  hintClassName,
  contentClassName,
  labelProps,
  descriptionProps,
  hintProps,
  ...rest
}) => {
  const resolvedTone = invalid ? 'error' : tone
  const hasLabel = hasRenderableContent(label)
  const hasDescription = hasRenderableContent(description)
  const hasHint = hasRenderableContent(hint)
  const hasControlContent = control != null || children != null
  const hasMeta = hasLabel || hasDescription
  const hasControl = hasControlContent || hasHint

  return (
    <div
      {...rest}
      className={joinClassName(
        horizontal ? 'grid gap-3 md:grid-cols-[minmax(0,12rem)_1fr] md:items-start' : 'grid gap-2',
        className,
      )}
    >
      {hasMeta ? (
        <div className="min-w-0">
          {hasLabel ? (
            <Label
              {...labelProps}
              className={joinClassName(
                'justify-start gap-2 font-medium',
                resolveLabelTextClass(size),
                labelClassName,
              )}
              tone={resolvedTone}
            >
              <span>{label}</span>
              {required ? <span className="text-error text-xs font-medium">必填</span> : null}
              {!required && optional ? <span className="text-xs opacity-60">可选</span> : null}
            </Label>
          ) : null}
          {hasDescription ? (
            <Label
              {...descriptionProps}
              as="p"
              className={joinClassName(
                'mt-0 min-h-0 px-0 pb-0',
                resolveHintTextClass(size),
                descriptionClassName,
              )}
              tone={invalid ? 'error' : (descriptionProps?.tone ?? 'muted')}
            >
              {description}
            </Label>
          ) : null}
        </div>
      ) : null}
      {hasControl ? (
        <div className={joinClassName('min-w-0', contentClassName)}>
          {control === 'input' ? (
            <input {...controlProps} />
          ) : control === 'textarea' ? (
            <textarea {...controlProps} />
          ) : control != null ? (
            control
          ) : (
            children
          )}
          {hasHint ? (
            <Label
              {...hintProps}
              as="p"
              className={joinClassName(
                'mt-0 min-h-0 px-0 pt-1',
                resolveHintTextClass(size),
                hintClassName,
              )}
              tone={invalid ? 'error' : (hintProps?.tone ?? 'muted')}
            >
              {hint}
            </Label>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** Root 的内部工具函数。 */
const Root: FC<FieldsetRootProps> = (
  {
    className,
    children,
    legend,
    description,
    hint,
    content,
    actions,
    items,
    size,
    tone,
    variant,
    bordered,
    invalid,
    legendClassName,
    descriptionClassName,
    hintClassName,
    contentClassName,
    actionsClassName,
    'aria-invalid': ariaInvalidProp,
    ...rest
  },
  slots: Record<string, any> = {},
) => {
  const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const item = rowArg0
    const index = rowArg1

    const { key, ...itemProps } = item
    return (
      <Item
        key={key ?? index}
        {...itemProps}
        size={item.size ?? size}
        invalid={item.invalid ?? invalid}
      />
    )
  }

  const hasChildren = hasRenderableContent(children)
  const hasContent = hasRenderableContent(content)
  const hasItems = !!items?.length
  const ariaInvalid = invalid ? 'true' : ariaInvalidProp
  const fieldsetAriaInvalidProps: Record<string, any> = {}
  if (ariaInvalid !== undefined && ariaInvalid !== null) {
    fieldsetAriaInvalidProps['aria-invalid'] = ariaInvalid
  }
  return (
    <fieldset
      {...rest}
      {...fieldsetAriaInvalidProps}
      className={joinClassName(
        'fieldset',
        resolveGapClass(size),
        resolveSurfaceClass({ variant, tone, bordered, invalid }),
        className,
      )}
    >
      {hasChildren ? (
        children
      ) : (
        <>
          {hasRenderableContent(legend) ? (
            <Legend className={joinClassName(invalid && 'text-error', legendClassName)}>
              {legend}
            </Legend>
          ) : null}
          {hasRenderableContent(description) ? (
            <Label
              as="p"
              tone={invalid ? 'error' : 'muted'}
              className={joinClassName(
                'mt-0 min-h-0 px-0',
                resolveLabelTextClass(size),
                descriptionClassName,
              )}
            >
              {description}
            </Label>
          ) : null}
          {hasContent ? (
            <div className={joinClassName('grid min-w-0', resolveGapClass(size), contentClassName)}>
              {content}
            </div>
          ) : null}
          {!hasContent && hasItems ? (
            <div className={joinClassName('grid min-w-0', resolveGapClass(size), contentClassName)}>
              {items.map((rowArg0: any, rowArg1: number) => (
                <CompiledRow1 rowArg0={rowArg0} rowArg1={rowArg1} />
              ))}
            </div>
          ) : null}
          {hasRenderableContent(hint) ? (
            <Label
              as="p"
              tone={invalid ? 'error' : 'muted'}
              className={joinClassName(
                'mt-0 min-h-0 px-0',
                resolveHintTextClass(size),
                hintClassName,
              )}
            >
              {hint}
            </Label>
          ) : null}
          {hasRenderableContent(actions) || slots.actions != null ? (
            <div
              className={joinClassName('mt-1 flex flex-wrap justify-end gap-2', actionsClassName)}
            >
              {hasRenderableContent(actions) ? actions : slots.actions}
            </div>
          ) : null}
        </>
      )}
    </fieldset>
  )
}

type FieldsetCompound = FC<FieldsetRootProps> & {
  Legend: FC<FieldsetLegendProps>
  Label: FC<FieldsetLabelProps>
  Item: FC<FieldsetItemProps>
}

const Fieldset: FieldsetCompound = /*#__PURE__*/ Object.assign(Root, {
  Legend,
  Label,
  Item,
})

/** 默认导出字段集组件。 */
export default Fieldset
