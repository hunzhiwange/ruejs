/*
TextRotate 组件概述
- 保留 Rue 当前 text-rotate 结构与视觉，并把排版语义职责交给独立 Typography 组件。
- 根组件继续支持 children / items 两种用法；items 内部会自动复用 Typography.Text / Typography.Link 渲染。
- 为了兼容旧写法，仍然保留 Text、Link、Title、Paragraph 这组别名，但推荐直接使用 Typography。
*/
import type { FC } from '@rue-js/rue'
import Typography, {
  type TypographyHeadingLevel,
  type TypographyInlineProps,
  type TypographyLinkProps,
  type TypographyParagraphProps,
  type TypographyTextProps,
  type TypographyTextTag,
  type TypographyTitleProps,
  type TypographyTone,
} from '../typography'

/** TextRotateTone 语义色类型。 */
export type TextRotateTone = TypographyTone
/** TextRotateHeadingLevel 类型。 */
export type TextRotateHeadingLevel = TypographyHeadingLevel
/** TextRotateTextTag 类型。 */
export type TextRotateTextTag = TypographyTextTag
/** TextRotateInlineProps 组件属性类型。 */
export type TextRotateInlineProps = TypographyInlineProps
/** TextRotateTextProps 组件属性类型。 */
export type TextRotateTextProps = TypographyTextProps
/** TextRotateLinkProps 组件属性类型。 */
export type TextRotateLinkProps = TypographyLinkProps
/** TextRotateTitleProps 组件属性类型。 */
export type TextRotateTitleProps = TypographyTitleProps
/** TextRotateParagraphProps 组件属性类型。 */
export type TextRotateParagraphProps = TypographyParagraphProps

/** TextRotateItem 数据项结构。 */
export interface TextRotateItem extends TypographyInlineProps {
  /** 数据项唯一标识。 */
  key?: string | number
  /** text 区域配置。 */
  text?: string | number
  /** 链接地址。 */
  href?: string
  /** 链接或定位目标。 */
  target?: string
  /** 链接 rel 属性。 */
  rel?: string
  /** 自定义渲染的宿主元素。 */
  as?: TextRotateTextTag
}

/** TextRotateProps 组件属性。 */
export interface TextRotateProps {
  /** 自定义渲染的宿主元素。 */
  as?: 'span' | 'div'
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<TextRotateItem>
  /** innerClassName 附加类名。 */
  innerClassName?: string
  /** innerStyle 内联样式。 */
  innerStyle?: any
  /** itemClassName 附加类名。 */
  itemClassName?: string
  /** itemStyle 内联样式。 */
  itemStyle?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** merge Style 的内部工具函数。 */
const mergeStyle = (base?: any, extra?: any) => {
  if (base && extra) return { ...base, ...extra }
  return extra ?? base
}

/** 渲染 Item 的内部工具函数。 */
const RenderItem = ({
  arg0: item,
  arg1: index,
  arg2: itemClassName,
  arg3: itemStyle,
}: {
  arg0: TextRotateItem
  arg1: number
  arg2?: string
  arg3?: any
}) => {
  const key = item.key ?? index
  const content = item.text
  const mergedClassName = appendClassName(itemClassName ?? '', item.className).trim() || undefined
  const mergedStyle = mergeStyle(itemStyle, item.style)

  if (item.href) {
    return (
      <Typography.Link
        href={item.href}
        target={item.target}
        rel={item.rel}
        type={item.type}
        disabled={item.disabled}
        mark={item.mark}
        code={item.code}
        keyboard={item.keyboard}
        underline={item.underline}
        delete={item.delete}
        strong={item.strong}
        italic={item.italic}
        className={mergedClassName}
        style={mergedStyle}
        text={content}
      />
    )
  }

  return (
    <Typography.Text
      as={item.as}
      type={item.type}
      disabled={item.disabled}
      mark={item.mark}
      code={item.code}
      keyboard={item.keyboard}
      underline={item.underline}
      delete={item.delete}
      strong={item.strong}
      italic={item.italic}
      className={mergedClassName}
      style={mergedStyle}
      text={content}
    />
  )
}

/** Text Rotate Root 的内部工具函数。 */
const TextRotateRoot: FC<TextRotateProps> = ({
  as = 'span',
  className,
  style,
  children,
  items,
  innerClassName,
  innerStyle,
  itemClassName,
  itemStyle,
  ...rest
}) => {
  const cls = appendClassName('text-rotate', className)
  const hasItems = !!(items && items.length)

  if (as === 'div') {
    return (
      <div {...rest} className={cls} style={style}>
        {hasItems ? (
          <span className={innerClassName} style={innerStyle}>
            {items.map((item, index) => (
              <RenderItem arg0={item} arg1={index} arg2={itemClassName} arg3={itemStyle} />
            ))}
          </span>
        ) : (
          children
        )}
      </div>
    )
  }

  return (
    <span {...rest} className={cls} style={style}>
      {hasItems ? (
        <span className={innerClassName} style={innerStyle}>
          {items.map((item, index) => (
            <RenderItem arg0={item} arg1={index} arg2={itemClassName} arg3={itemStyle} />
          ))}
        </span>
      ) : (
        children
      )}
    </span>
  )
}

type TextRotateCompound = FC<TextRotateProps> & {
  Text: typeof Typography.Text
  Link: typeof Typography.Link
  Title: typeof Typography.Title
  Paragraph: typeof Typography.Paragraph
}

const TextRotate: TextRotateCompound = /*#__PURE__*/ Object.assign(TextRotateRoot, {
  Text: Typography.Text,
  Link: Typography.Link,
  Title: Typography.Title,
  Paragraph: Typography.Paragraph,
})

/** 默认导出文字轮播组件。 */
export default TextRotate
