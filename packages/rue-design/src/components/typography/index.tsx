/*
Typography 组件概述
- Typography 复合 API，提供 Text、Link、Title、Paragraph 语义组件。
- 保留 Rue 当前偏轻量的实现方式，继续用 daisyUI 与原子类完成视觉表达，不强加额外样式系统。
- Text Rotate 等组件可以直接复用这些语义化排版能力，避免把排版职责塞进业务组件本身。
*/
import type { FC } from '@rue-js/rue'

/** TypographyTone 语义色类型。 */
export type TypographyTone = 'default' | 'secondary' | 'success' | 'warning' | 'danger'
/** TypographyHeadingLevel 类型。 */
export type TypographyHeadingLevel = 1 | 2 | 3 | 4 | 5
/** TypographyTextTag 类型。 */
export type TypographyTextTag = 'span' | 'div' | 'p'
/** TypographyRootTag 类型。 */
export type TypographyRootTag = 'div' | 'section' | 'article'

/** TypographyInlineProps 组件属性。 */
export interface TypographyInlineProps {
  text?: string | number
  /** 组件类型或语义类型。 */
  type?: TypographyTone
  /** 是否禁用交互。 */
  disabled?: boolean
  /** mark 配置项。 */
  mark?: boolean
  /** code 配置项。 */
  code?: boolean
  /** keyboard 配置项。 */
  keyboard?: boolean
  /** underline 配置项。 */
  underline?: boolean
  /** delete 配置项。 */
  delete?: boolean
  /** strong 配置项。 */
  strong?: boolean
  /** italic 配置项。 */
  italic?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** TypographyProps 组件属性。 */
export interface TypographyProps {
  /** 自定义渲染的宿主元素。 */
  as?: TypographyRootTag
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** TypographyTextProps 组件属性。 */
export interface TypographyTextProps extends TypographyInlineProps {
  /** 自定义渲染的宿主元素。 */
  as?: TypographyTextTag
}

/** TypographyLinkProps 组件属性。 */
export interface TypographyLinkProps extends TypographyInlineProps {
  /** 链接地址。 */
  href?: string
  /** 链接或定位目标。 */
  target?: string
  /** 链接 rel 属性。 */
  rel?: string
}

/** TypographyTitleProps 组件属性。 */
export interface TypographyTitleProps extends TypographyInlineProps {
  /** level 配置项。 */
  level?: TypographyHeadingLevel
}

/** TypographyParagraphProps 组件属性。 */
export interface TypographyParagraphProps extends TypographyInlineProps {}

interface DecoratedContentProps {
  text?: string | number
  mark?: boolean
  code?: boolean
  keyboard?: boolean
  children?: any
}

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | undefined | false>) => {
  return parts.filter(Boolean).join(' ')
}

/** 解析 Tone Class 的内部工具函数。 */
const resolveToneClass = (type?: TypographyTone) => {
  switch (type) {
    case 'secondary':
      return 'text-base-content/65'
    case 'success':
      return 'text-success'
    case 'warning':
      return 'text-warning'
    case 'danger':
      return 'text-error'
    default:
      return undefined
  }
}

/** 构建 Inline Class Name 的内部工具函数。 */
const buildInlineClassName = ({
  type,
  disabled,
  underline,
  deleted,
  strong,
  italic,
  className,
  display,
  link,
}: {
  type?: TypographyTone
  disabled?: boolean
  underline?: boolean
  deleted?: boolean
  strong?: boolean
  italic?: boolean
  className?: string
  display?: 'inline' | 'block'
  link?: boolean
}) => {
  return mergeClassNames(
    display,
    link ? 'link link-hover decoration-current underline-offset-4' : undefined,
    resolveToneClass(type),
    disabled ? 'cursor-not-allowed opacity-45' : undefined,
    underline ? 'underline decoration-current underline-offset-4' : undefined,
    deleted ? 'line-through' : undefined,
    strong ? 'font-semibold' : undefined,
    italic ? 'italic' : undefined,
    className,
  )
}

/** DecoratedContent 的内部工具函数。 */
const DecoratedContent: FC<DecoratedContentProps> = ({ mark, code, keyboard, children, text }) => {
  if (mark && code && keyboard) {
    return (
      <mark className="rounded bg-warning/20 px-1 py-0.5 text-inherit">
        <code className="rounded bg-base-200 px-1.5 py-0.5 text-[0.9em]">
          <kbd className="kbd kbd-sm align-middle">
            {text !== undefined ? <span>{String(text)}</span> : children}
          </kbd>
        </code>
      </mark>
    )
  }

  if (mark && code) {
    return (
      <mark className="rounded bg-warning/20 px-1 py-0.5 text-inherit">
        <code className="rounded bg-base-200 px-1.5 py-0.5 text-[0.9em]">
          {text !== undefined ? <span>{String(text)}</span> : children}
        </code>
      </mark>
    )
  }

  if (mark && keyboard) {
    return (
      <mark className="rounded bg-warning/20 px-1 py-0.5 text-inherit">
        <kbd className="kbd kbd-sm align-middle">
          {text !== undefined ? <span>{String(text)}</span> : children}
        </kbd>
      </mark>
    )
  }

  if (code && keyboard) {
    return (
      <code className="rounded bg-base-200 px-1.5 py-0.5 text-[0.9em]">
        <kbd className="kbd kbd-sm align-middle">
          {text !== undefined ? <span>{String(text)}</span> : children}
        </kbd>
      </code>
    )
  }

  if (mark) {
    return (
      <mark className="rounded bg-warning/20 px-1 py-0.5 text-inherit">
        {text !== undefined ? <span>{String(text)}</span> : children}
      </mark>
    )
  }

  if (code) {
    return (
      <code className="rounded bg-base-200 px-1.5 py-0.5 text-[0.9em]">
        {text !== undefined ? <span>{String(text)}</span> : children}
      </code>
    )
  }

  if (keyboard) {
    return (
      <kbd className="kbd kbd-sm align-middle">
        {text !== undefined ? <span>{String(text)}</span> : children}
      </kbd>
    )
  }

  return <>{text !== undefined ? <span>{String(text)}</span> : children}</>
}

/** Typography Root 的内部工具函数。 */
const TypographyRoot: FC<TypographyProps> = ({
  as = 'div',
  className,
  style,
  children,
  ...rest
}) => {
  const props = {
    ...rest,
    className: mergeClassNames('rue-typography text-base-content', className),
    style,
  }

  if (as === 'article') {
    return <article {...props}>{children}</article>
  }
  if (as === 'section') {
    return <section {...props}>{children}</section>
  }
  return <div {...props}>{children}</div>
}

/** Text 的内部工具函数。 */
const Text: FC<TypographyTextProps> = ({
  as = 'span',
  type,
  disabled,
  mark,
  code,
  keyboard,
  underline,
  delete: deleted,
  strong,
  italic,
  className,
  style,
  children,
  text,
  ...rest
}) => {
  const props = {
    ...rest,
    className: buildInlineClassName({
      type,
      disabled,
      underline,
      deleted,
      strong,
      italic,
      className,
      display: as === 'span' ? 'inline' : 'block',
    }),
    style,
    'aria-disabled': disabled ? 'true' : undefined,
  }

  if (as === 'div') {
    return (
      <div {...props}>
        <DecoratedContent text={text} mark={mark} code={code} keyboard={keyboard}>
          {children}
        </DecoratedContent>
      </div>
    )
  }
  if (as === 'p') {
    return (
      <p {...props}>
        <DecoratedContent text={text} mark={mark} code={code} keyboard={keyboard}>
          {children}
        </DecoratedContent>
      </p>
    )
  }
  return (
    <span {...props}>
      <DecoratedContent text={text} mark={mark} code={code} keyboard={keyboard}>
        {children}
      </DecoratedContent>
    </span>
  )
}

/** Link 的内部工具函数。 */
const Link: FC<TypographyLinkProps> = ({
  href,
  target,
  rel,
  type,
  disabled,
  mark,
  code,
  keyboard,
  underline,
  delete: deleted,
  strong,
  italic,
  className,
  style,
  children,
  text,
  tabIndex,
  ...rest
}) => {
  return (
    <a
      {...rest}
      href={disabled ? undefined : href}
      target={target}
      rel={target === '_blank' && !rel ? 'noreferrer' : rel}
      className={buildInlineClassName({
        type,
        disabled,
        underline: underline ?? true,
        deleted,
        strong,
        italic,
        className,
        display: 'inline',
        link: true,
      })}
      style={style}
      aria-disabled={disabled ? 'true' : undefined}
      tabindex={disabled ? '-1' : tabIndex === undefined ? undefined : String(tabIndex)}
    >
      <DecoratedContent text={text} mark={mark} code={code} keyboard={keyboard}>
        {children}
      </DecoratedContent>
    </a>
  )
}

/** 解析 Title Class Name 的内部工具函数。 */
const resolveTitleClassName = (level: TypographyHeadingLevel) => {
  switch (level) {
    case 1:
      return 'block text-4xl font-semibold tracking-tight text-balance md:text-5xl'
    case 2:
      return 'block text-3xl font-semibold tracking-tight text-balance md:text-4xl'
    case 3:
      return 'block text-2xl font-semibold tracking-tight text-balance md:text-3xl'
    case 4:
      return 'block text-xl font-semibold tracking-tight text-balance md:text-2xl'
    default:
      return 'block text-lg font-semibold tracking-tight text-balance md:text-xl'
  }
}

/** Title 的内部工具函数。 */
const Title: FC<TypographyTitleProps> = ({
  level = 1,
  type,
  disabled,
  mark,
  code,
  keyboard,
  underline,
  delete: deleted,
  strong,
  italic,
  className,
  style,
  children,
  ...rest
}) => {
  const props = {
    ...rest,
    className: mergeClassNames(
      resolveTitleClassName(level),
      buildInlineClassName({
        type,
        disabled,
        underline,
        deleted,
        strong,
        italic,
        className,
      }),
    ),
    style,
    'aria-disabled': disabled ? 'true' : undefined,
  }

  if (level === 1) {
    return (
      <h1 {...props}>
        <DecoratedContent mark={mark} code={code} keyboard={keyboard}>
          {children}
        </DecoratedContent>
      </h1>
    )
  }
  if (level === 2) {
    return (
      <h2 {...props}>
        <DecoratedContent mark={mark} code={code} keyboard={keyboard}>
          {children}
        </DecoratedContent>
      </h2>
    )
  }
  if (level === 3) {
    return (
      <h3 {...props}>
        <DecoratedContent mark={mark} code={code} keyboard={keyboard}>
          {children}
        </DecoratedContent>
      </h3>
    )
  }
  if (level === 4) {
    return (
      <h4 {...props}>
        <DecoratedContent mark={mark} code={code} keyboard={keyboard}>
          {children}
        </DecoratedContent>
      </h4>
    )
  }
  return (
    <h5 {...props}>
      <DecoratedContent mark={mark} code={code} keyboard={keyboard}>
        {children}
      </DecoratedContent>
    </h5>
  )
}

/** Paragraph 的内部工具函数。 */
const Paragraph: FC<TypographyParagraphProps> = ({
  type,
  disabled,
  mark,
  code,
  keyboard,
  underline,
  delete: deleted,
  strong,
  italic,
  className,
  style,
  children,
  ...rest
}) => {
  return (
    <p
      {...rest}
      className={mergeClassNames(
        'block leading-7 text-base-content/80',
        buildInlineClassName({
          type,
          disabled,
          underline,
          deleted,
          strong,
          italic,
          className,
        }),
      )}
      style={style}
      aria-disabled={disabled ? 'true' : undefined}
    >
      <DecoratedContent mark={mark} code={code} keyboard={keyboard}>
        {children}
      </DecoratedContent>
    </p>
  )
}

type TypographyCompound = FC<TypographyProps> & {
  Text: FC<TypographyTextProps>
  Link: FC<TypographyLinkProps>
  Title: FC<TypographyTitleProps>
  Paragraph: FC<TypographyParagraphProps>
}

const Typography: TypographyCompound = /*#__PURE__*/ Object.assign(TypographyRoot, {
  Text,
  Link,
  Title,
  Paragraph,
})

/** 默认导出排版组件。 */
export default Typography
