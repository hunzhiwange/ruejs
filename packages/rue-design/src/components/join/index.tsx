/*
Join 模块概述
- 汇总组合容器组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import { Component, type FC } from '@rue-js/rue'

/** JoinDirection 位置或方向类型。 */
export type JoinDirection = 'horizontal' | 'vertical'

/** JoinItemProps 组件属性。 */
export interface JoinItemProps {
  text?: string | number
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** tag 配置项。 */
  tag?: any
  /** 根节点附加类名。 */
  className?: string
  /** 是否处于激活态。 */
  active?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 链接地址。 */
  href?: string
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent) => void
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** JoinItemConfig 配置对象。 */
export interface JoinItemConfig extends JoinItemProps {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 展示标签。 */
  label?: string | number
}

/** JoinProps 组件属性。 */
export interface JoinProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 布局方向。 */
  direction?: JoinDirection
  /** 数据驱动渲染项。 */
  items?: JoinItemConfig[]
  /** itemClassName 附加类名。 */
  itemClassName?: string
  /** wrap 配置项。 */
  wrap?: boolean
  /** block 配置项。 */
  block?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...classNames: Array<string | undefined | false>) => {
  return classNames.filter(Boolean).join(' ')
}

/** 判断 Disabled Attr Tag 的内部工具函数。 */
const isDisabledAttrTag = (tag: any) => {
  return (
    typeof tag === 'string' &&
    ['button', 'input', 'select', 'textarea', 'option', 'optgroup', 'fieldset'].includes(tag)
  )
}

/** 判断 Button Like Class 的内部工具函数。 */
const isButtonLikeClass = (className?: string) => {
  return !!className && /\bbtn\b/.test(className)
}

/** 判断是否存在 Renderable Children 的内部工具函数。 */
const hasRenderableChildren = (children: any) =>
  children != null && children !== false && children !== ''

/** Item 的内部工具函数。 */
const Item: FC<JoinItemProps> = ({
  as,
  tag,
  className,
  active,
  disabled,
  href,
  onClick,
  children,
  text,
  ...rest
}) => {
  const Tag = (as ?? tag ?? 'button') as any
  const supportsDisabledAttr = isDisabledAttrTag(Tag)
  const disabledLikeButton = !!disabled && (Tag === 'a' || isButtonLikeClass(className))
  const mergedClassName = mergeClassNames(
    'join-item',
    active && 'btn-active',
    disabledLikeButton && 'btn-disabled',
    className,
  )

  const handleClick = (event: MouseEvent) => {
    if (disabled) {
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

  if (Tag === 'a') {
    return (
      <a
        {...rest}
        {...(disabled ? {} : href != null ? { href } : {})}
        className={mergedClassName}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={handleClick}
      >
        {text !== undefined ? <span>{String(text)}</span> : children}
      </a>
    )
  }

  if (Tag === 'button') {
    return (
      <button
        {...rest}
        type={rest.type ?? 'button'}
        disabled={disabled}
        className={mergedClassName}
        onClick={handleClick}
      >
        {text !== undefined ? <span>{String(text)}</span> : children}
      </button>
    )
  }

  if (Tag === 'input') {
    return (
      <input
        {...rest}
        disabled={disabled}
        className={mergedClassName}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={handleClick}
      />
    )
  }

  if (Tag === 'select') {
    return (
      <select
        {...rest}
        disabled={disabled}
        className={mergedClassName}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={handleClick}
      >
        {text !== undefined ? <span>{String(text)}</span> : children}
      </select>
    )
  }

  if (Tag === 'textarea') {
    return (
      <textarea
        {...rest}
        disabled={disabled}
        className={mergedClassName}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={handleClick}
      >
        {text !== undefined ? <span>{String(text)}</span> : children}
      </textarea>
    )
  }

  return Tag === 'div' ? (
    <div
      {...rest}
      {...(Tag === 'a' && !disabled && href != null ? { href } : {})}
      disabled={supportsDisabledAttr ? disabled : undefined}
      className={mergedClassName}
      aria-disabled={!supportsDisabledAttr && disabled ? 'true' : undefined}
      onClick={handleClick}
    >
      {text !== undefined ? <span>{String(text)}</span> : children}
    </div>
  ) : Tag === 'span' ? (
    <span
      {...rest}
      {...(Tag === 'a' && !disabled && href != null ? { href } : {})}
      disabled={supportsDisabledAttr ? disabled : undefined}
      className={mergedClassName}
      aria-disabled={!supportsDisabledAttr && disabled ? 'true' : undefined}
      onClick={handleClick}
    >
      {text !== undefined ? <span>{String(text)}</span> : children}
    </span>
  ) : Tag === 'button' ? (
    <button
      {...rest}
      {...(Tag === 'a' && !disabled && href != null ? { href } : {})}
      disabled={supportsDisabledAttr ? disabled : undefined}
      className={mergedClassName}
      aria-disabled={!supportsDisabledAttr && disabled ? 'true' : undefined}
      onClick={handleClick}
    >
      {text !== undefined ? <span>{String(text)}</span> : children}
    </button>
  ) : Tag === 'fieldset' ? (
    <fieldset
      {...rest}
      {...(Tag === 'a' && !disabled && href != null ? { href } : {})}
      disabled={supportsDisabledAttr ? disabled : undefined}
      className={mergedClassName}
      aria-disabled={!supportsDisabledAttr && disabled ? 'true' : undefined}
      onClick={handleClick}
    >
      {text !== undefined ? <span>{String(text)}</span> : children}
    </fieldset>
  ) : Tag === 'a' ? (
    <a
      {...rest}
      {...(Tag === 'a' && !disabled && href != null ? { href } : {})}
      disabled={supportsDisabledAttr ? disabled : undefined}
      className={mergedClassName}
      aria-disabled={!supportsDisabledAttr && disabled ? 'true' : undefined}
      onClick={handleClick}
    >
      {text !== undefined ? <span>{String(text)}</span> : children}
    </a>
  ) : (
    <></>
  )
}

/** Join Root 的内部工具函数。 */
const JoinRoot: FC<JoinProps> = ({
  as,
  direction,
  items,
  itemClassName,
  wrap,
  block,
  className,
  children,
  ...rest
}) => {
  const readItemProps = (item: JoinItemConfig) => ({
    ...item,
    text: item.label,
    className: mergeClassNames(itemClassName, item.className),
  })
  const Tag = (as ?? 'div') as any
  const mergedClassName = mergeClassNames(
    'join',
    direction && `join-${direction}`,
    wrap && 'flex flex-wrap',
    block && 'w-full',
    className,
  )

  return (
    <Component is={Tag} {...rest} className={mergedClassName}>
      {hasRenderableChildren(children) ? (
        children
      ) : items ? (
        <>
          {' '}
          {items.map((rowArg0: any, rowArg1: number) => (
            <Item key={rowArg0.key ?? rowArg1} {...readItemProps(rowArg0)} />
          ))}{' '}
        </>
      ) : null}
    </Component>
  )
}

type JoinCompound = FC<JoinProps> & {
  Item: FC<JoinItemProps>
}

const JoinCompound: JoinCompound = /*#__PURE__*/ Object.assign(JoinRoot, {
  Item,
})

/** 默认导出组合容器组件。 */
export default JoinCompound
