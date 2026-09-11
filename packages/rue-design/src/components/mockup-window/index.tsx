/*
MockupWindow 组件概述
- 保留 daisyUI 的 mockup-window 外框和既有 children 用法。
- 新增推荐用法：根组件可通过 title / description / toolbar / actions 自动装配常见窗口结构。
- 同时暴露 Header / Body / Toolbar / Actions 复合子组件，便于需要更细粒度布局时手动拼装。
*/
import { Template, type FC } from '@rue-js/rue'

/** MockupWindowPadding 类型。 */
export type MockupWindowPadding = 'none' | 'sm' | 'md' | 'lg'

/** MockupWindowProps 组件属性。 */
export interface MockupWindowProps {
  /** bordered 配置项。 */
  bordered?: boolean
  /** background 配置项。 */
  background?: boolean
  /** 标题内容。 */
  title?: string | number
  /** 描述内容。 */
  description?: string | number
  /** padding 配置项。 */
  padding?: MockupWindowPadding
  /** bodyClassName 附加类名。 */
  bodyClassName?: string
  /** headerClassName 附加类名。 */
  headerClassName?: string
  /** actionsClassName 附加类名。 */
  actionsClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** MockupWindowPartProps 组件属性。 */
export interface MockupWindowPartProps {
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** MockupWindowHeaderProps 组件属性。 */
export interface MockupWindowHeaderProps extends MockupWindowPartProps {
  /** 标题内容。 */
  title?: string | number
  /** 描述内容。 */
  description?: string | number
}

/** MockupWindowBodyProps 组件属性。 */
export interface MockupWindowBodyProps extends MockupWindowPartProps {
  /** padding 配置项。 */
  padding?: MockupWindowPadding
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base?: string, className?: string) => {
  if (base && className) return `${base} ${className}`
  return base ?? className ?? ''
}

/** 解析 Padding Class 的内部工具函数。 */
const resolvePaddingClass = (padding: MockupWindowPadding) => {
  switch (padding) {
    case 'none':
      return ''
    case 'sm':
      return 'p-3'
    case 'lg':
      return 'p-6'
    default:
      return 'p-4'
  }
}

/** Header 的内部工具函数。 */
const Header: FC<MockupWindowHeaderProps> = (
  { title, description, className, style, children, ...rest },
  slots: Record<string, any> = {},
) => {
  const hasCustomChildren = children != null

  return (
    <div
      {...rest}
      className={appendClassName(
        'rue-mockup-window-header flex items-start justify-between gap-3 border-b border-base-300/80 px-4 py-3',
        className,
      )}
      style={style}
    >
      {hasCustomChildren ? (
        { children }
      ) : (
        <>
          <div className="min-w-0 flex-1">
            {title != null ? (
              <div className="truncate text-sm font-semibold">{String(title)}</div>
            ) : null}
            {description != null ? (
              <div className="mt-1 text-xs opacity-70">{String(description)}</div>
            ) : null}
          </div>
          {slots.extra != null ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{slots.extra}</div>
          ) : null}
        </>
      )}
    </div>
  )
}

/** Body 的内部工具函数。 */
const Body: FC<MockupWindowBodyProps> = ({
  padding = 'none',
  className,
  style,
  children,
  ...rest
}) => {
  const paddingClassName = resolvePaddingClass(padding)

  return (
    <div
      {...rest}
      className={appendClassName(
        appendClassName('rue-mockup-window-body', paddingClassName),
        className,
      )}
      style={style}
    >
      {children}
    </div>
  )
}

/** Toolbar 的内部工具函数。 */
const Toolbar: FC<MockupWindowPartProps> = ({ className, style, children, ...rest }) => {
  return (
    <div
      {...rest}
      className={appendClassName(
        'rue-mockup-window-toolbar flex flex-wrap items-center gap-2',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  )
}

/** Actions 的内部工具函数。 */
const Actions: FC<MockupWindowPartProps> = ({ className, style, children, ...rest }) => {
  return (
    <div
      {...rest}
      className={appendClassName(
        'rue-mockup-window-actions flex flex-wrap items-center justify-end gap-2 border-t border-base-300/80 px-4 py-3',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  )
}

/** Root 的内部工具函数。 */
const Root: FC<MockupWindowProps> = (
  {
    bordered,
    background,
    title,
    description,
    padding,
    bodyClassName,
    headerClassName,
    actionsClassName,
    className,
    style,
    children,
    ...rest
  },
  slots: Record<string, any> = {},
) => {
  const hasHeader = title != null || description != null || slots.toolbar != null
  const hasActions = slots.actions != null
  const hasStructuredSlots =
    hasHeader ||
    hasActions ||
    padding != null ||
    bodyClassName != null ||
    headerClassName != null ||
    actionsClassName != null

  let rootClassName = 'mockup-window'
  if (bordered) rootClassName += ' border border-base-300'
  if (background) rootClassName += ' bg-base-100'
  if (className) rootClassName += ` ${className}`

  if (!hasStructuredSlots) {
    return (
      <div {...rest} className={rootClassName} style={style}>
        {children}
      </div>
    )
  }

  return (
    <div {...rest} className={rootClassName} style={style}>
      {hasHeader ? (
        <Header title={title} description={description} className={headerClassName}>
          <Template slot="extra">{slots.toolbar}</Template>
        </Header>
      ) : null}
      <Body padding={padding ?? 'md'} className={bodyClassName}>
        {children}
      </Body>
      {hasActions ? <Actions className={actionsClassName}>{slots.actions}</Actions> : null}
    </div>
  )
}

type MockupWindowCompound = FC<MockupWindowProps> & {
  Header: FC<MockupWindowHeaderProps>
  Body: FC<MockupWindowBodyProps>
  Toolbar: FC<MockupWindowPartProps>
  Actions: FC<MockupWindowPartProps>
}

const MockupWindow: MockupWindowCompound = /*#__PURE__*/ Object.assign(Root, {
  Header,
  Body,
  Toolbar,
  Actions,
})

/** 默认导出窗口样机组件。 */
export default MockupWindow
