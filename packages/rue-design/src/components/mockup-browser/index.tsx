/*
MockupBrowser 模块概述
- 汇总浏览器样机组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'

/** MockupBrowserAddressBarStatus 状态类型。 */
export type MockupBrowserAddressBarStatus = 'default' | 'success' | 'warning' | 'error'
/** MockupBrowserContentPadding 类型。 */
export type MockupBrowserContentPadding = 'none' | 'sm' | 'md' | 'lg'

/** MockupBrowserProps 组件属性。 */
export interface MockupBrowserProps {
  /** bordered 配置项。 */
  bordered?: boolean
  /** background 配置项。 */
  background?: boolean
  /** showToolbar 配置项。 */
  showToolbar?: boolean
  /** url 配置项。 */
  url?: any
  /** toolbar 配置项。 */
  toolbar?: any
  /** toolbarStart 配置项。 */
  toolbarStart?: any
  /** toolbarEnd 配置项。 */
  toolbarEnd?: any
  /** toolbarClassName 附加类名。 */
  toolbarClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** contentBordered 配置项。 */
  contentBordered?: boolean
  /** contentBackground 配置项。 */
  contentBackground?: boolean
  /** contentPadding 配置项。 */
  contentPadding?: MockupBrowserContentPadding
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  text?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** MockupBrowserToolbarProps 组件属性。 */
export interface MockupBrowserToolbarProps {
  /** start 配置项。 */
  start?: any
  /** end 配置项。 */
  end?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  text?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** MockupBrowserAddressBarProps 组件属性。 */
export interface MockupBrowserAddressBarProps {
  /** 链接地址。 */
  href?: string
  /** 前缀内容。 */
  prefix?: any
  /** 后缀内容。 */
  suffix?: any
  /** interactive 配置项。 */
  interactive?: boolean
  /** 组件状态。 */
  status?: MockupBrowserAddressBarStatus
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  text?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** MockupBrowserContentProps 组件属性。 */
export interface MockupBrowserContentProps {
  /** bordered 配置项。 */
  bordered?: boolean
  /** background 配置项。 */
  background?: boolean
  /** padding 配置项。 */
  padding?: MockupBrowserContentPadding
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  text?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface AddressBarInnerProps {
  prefix?: any
  suffix?: any
  children?: any
  text?: string
}

/** join Class Name 的内部工具函数。 */
const joinClassName = (...tokens: Array<string | false | null | undefined>) => {
  return tokens.filter(Boolean).join(' ')
}

/** 解析 Address Bar Status Class 的内部工具函数。 */
const resolveAddressBarStatusClass = (status: MockupBrowserAddressBarStatus = 'default') => {
  switch (status) {
    case 'success':
      return 'border-success/30 bg-success/10 text-success'
    case 'warning':
      return 'border-warning/30 bg-warning/10 text-warning'
    case 'error':
      return 'border-error/30 bg-error/10 text-error'
    default:
      return 'border-base-300 bg-base-200/60'
  }
}

/** 解析 Padding Class 的内部工具函数。 */
const resolvePaddingClass = (padding: MockupBrowserContentPadding = 'none') => {
  switch (padding) {
    case 'sm':
      return 'p-3'
    case 'md':
      return 'p-4'
    case 'lg':
      return 'p-6'
    default:
      return ''
  }
}

/** AddressBarInner 的内部工具函数。 */
const AddressBarInner: FC<AddressBarInnerProps> = ({ prefix, suffix, children, text }) => {
  return (
    <>
      {prefix != null ? <span className="shrink-0 opacity-55">{String(prefix)}</span> : null}
      <span className="min-w-0 flex-1 truncate">
        {text !== undefined ? <span>{String(text)}</span> : children}
      </span>
      {suffix != null ? <span className="shrink-0 opacity-55">{String(suffix)}</span> : null}
    </>
  )
}

/** Address Bar 的内部工具函数。 */
const AddressBar: FC<MockupBrowserAddressBarProps> = ({
  href,
  prefix,
  suffix,
  interactive,
  status = 'default',
  className,
  children,
  ...rest
}) => {
  const content = href
  const mergedClassName = joinClassName(
    'input input-sm flex h-8 w-full min-w-0 items-center gap-2 text-sm',
    resolveAddressBarStatusClass(status),
    className,
  )

  if ((interactive || href) && typeof href === 'string') {
    return (
      <a {...rest} href={href} className={mergedClassName}>
        <AddressBarInner prefix={prefix} suffix={suffix} text={children ? undefined : content}>
          {children}
        </AddressBarInner>
      </a>
    )
  }

  return (
    <div {...rest} className={mergedClassName}>
      <AddressBarInner prefix={prefix} suffix={suffix} text={children ? undefined : content}>
        {children}
      </AddressBarInner>
    </div>
  )
}

/** Content 的内部工具函数。 */
const Content: FC<MockupBrowserContentProps> = ({
  bordered = true,
  background,
  padding = 'none',
  className,
  children,
  ...rest
}) => {
  return (
    <div
      {...rest}
      className={joinClassName(
        bordered && 'border-t border-base-300',
        background && 'bg-base-100',
        resolvePaddingClass(padding),
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Toolbar 的内部工具函数。 */
const Toolbar: FC<MockupBrowserToolbarProps> = ({ start, end, className, children, ...rest }) => {
  return (
    <div {...rest} className={joinClassName('mockup-browser-toolbar gap-3', className)}>
      {start != null ? (
        <div className="flex shrink-0 items-center gap-2">{String(start)}</div>
      ) : null}
      {children != null ? <div className="flex min-w-0 flex-1 items-center">{children}</div> : null}
      {end != null ? <div className="flex shrink-0 items-center gap-2">{String(end)}</div> : null}
    </div>
  )
}

/** Root 的内部工具函数。 */
const Root: FC<MockupBrowserProps> = ({
  bordered,
  background,
  showToolbar,
  url,
  toolbar,
  toolbarStart,
  toolbarEnd,
  toolbarClassName,
  contentClassName,
  contentBordered,
  contentBackground,
  contentPadding,
  className,
  children,
  ...rest
}) => {
  const shouldRenderToolbar =
    showToolbar !== false &&
    (toolbar != null ||
      url != null ||
      toolbarStart != null ||
      toolbarEnd != null ||
      toolbarClassName != null)
  const shouldWrapContent =
    shouldRenderToolbar ||
    contentClassName != null ||
    contentBordered != null ||
    contentBackground != null ||
    contentPadding != null

  return (
    <div
      {...rest}
      className={joinClassName(
        'mockup-browser',
        bordered && 'border border-base-300',
        background && 'bg-base-100',
        className,
      )}
    >
      {shouldRenderToolbar ? (
        <Toolbar className={toolbarClassName} start={toolbarStart} end={toolbarEnd}>
          {toolbar != null ? toolbar : url != null ? <AddressBar href={String(url)} /> : null}
        </Toolbar>
      ) : null}
      {shouldWrapContent ? (
        <Content
          className={contentClassName}
          bordered={contentBordered}
          background={contentBackground}
          padding={contentPadding}
        >
          {children}
        </Content>
      ) : (
        children
      )}
    </div>
  )
}

type MockupBrowserCompound = FC<MockupBrowserProps> & {
  Toolbar: FC<MockupBrowserToolbarProps>
  AddressBar: FC<MockupBrowserAddressBarProps>
  Content: FC<MockupBrowserContentProps>
}

const MockupBrowser: MockupBrowserCompound = /*#__PURE__*/ Object.assign(Root, {
  Toolbar,
  AddressBar,
  Content,
})

/** 默认导出浏览器样机组件。 */
export default MockupBrowser
