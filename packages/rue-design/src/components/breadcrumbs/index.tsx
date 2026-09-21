/*
Breadcrumbs 组件概述
- 推荐使用 items：补齐 path/params、itemFormatter、menu 与自定义 separator 等能力。
- 保留 children 形式：继续兼容现有 Breadcrumbs.Item 组合写法，不破坏旧 demo。
- 视觉沿用 Rue 当前的箭头分隔风格，仅在 items 模式切换为可控的手动分隔符渲染。
*/
import type { FC } from '@rue-js/rue'
import Dropdown from '../dropdown/index'

type BreadcrumbsParamValue = string | number | boolean | null | undefined
type BreadcrumbsMenuAlign = 'start' | 'center' | 'end'
type BreadcrumbsMenuDirection = 'top' | 'bottom' | 'left' | 'right'

/** BreadcrumbsParams 接口。 */
export interface BreadcrumbsParams {
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: BreadcrumbsParamValue
}

/** BreadcrumbsMenuItem 数据项结构。 */
export interface BreadcrumbsMenuItem {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 展示标签。 */
  label?: any
  /** 标题内容。 */
  title?: any
  /** 链接地址。 */
  href?: string
  /** 链接或定位目标。 */
  target?: string
  /** 链接 rel 属性。 */
  rel?: string
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent) => void
}

/** BreadcrumbsMenu 接口。 */
export interface BreadcrumbsMenu {
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<BreadcrumbsMenuItem>
  /** 交叉轴或内容对齐方式。 */
  align?: BreadcrumbsMenuAlign
  /** 布局方向。 */
  direction?: BreadcrumbsMenuDirection
  /** 根节点附加类名。 */
  className?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
}

/** BreadcrumbsRouteItem 数据项结构。 */
export interface BreadcrumbsRouteItem {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 标题内容。 */
  title?: any
  /** 展示标签。 */
  label?: any
  /** 链接地址。 */
  href?: string
  /** path 配置项。 */
  path?: string
  /** 图标内容。 */
  icon?: string | { path: string }
  iconClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** linkClassName 附加类名。 */
  linkClassName?: string
  /** current 配置项。 */
  current?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 链接或定位目标。 */
  target?: string
  /** 链接 rel 属性。 */
  rel?: string
  /** menu 配置项。 */
  menu?: BreadcrumbsMenu
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent) => void
}

/** BreadcrumbsSeparatorItem 数据项结构。 */
export interface BreadcrumbsSeparatorItem {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 组件类型或语义类型。 */
  type: 'separator'
  /** separator 配置项。 */
  separator?: any
}

/** BreadcrumbsDataItem 类型。 */
export type BreadcrumbsDataItem = BreadcrumbsRouteItem | BreadcrumbsSeparatorItem

/** BreadcrumbsProps 组件属性。 */
export interface BreadcrumbsProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<BreadcrumbsDataItem>
  /** routes 配置项。 */
  routes?: ReadonlyArray<BreadcrumbsDataItem>
  /** separator 配置项。 */
  separator?: any
  /** params 配置项。 */
  params?: BreadcrumbsParams
  /** dropdownIcon 图标内容。 */
  dropdownIcon?: any
  /** itemFormatter 自定义渲染函数。 */
  itemFormatter?: (
    route: BreadcrumbsRouteItem,
    params: BreadcrumbsParams,
    routes: ReadonlyArray<BreadcrumbsRouteItem>,
    paths: string[],
    href?: string,
  ) => any
  /** Compatibility spelling used by data-driven breadcrumb APIs. */
  itemRender?: BreadcrumbsProps['itemFormatter']
}

/** BreadcrumbsItemProps 组件属性。 */
export interface BreadcrumbsItemProps extends BreadcrumbsRouteItem {
  /** 组件子内容。 */
  children?: any
}

/** normalize Children 的内部工具函数。 */

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base?: string, className?: string) => {
  if (base && className) return `${base} ${className}`
  return base ?? className ?? ''
}

/** 判断 Separator Item 的内部工具函数。 */
const isSeparatorItem = (item: BreadcrumbsDataItem): item is BreadcrumbsSeparatorItem => {
  return !!item && typeof item === 'object' && 'type' in item && item.type === 'separator'
}

/** 解析 Item Title 的内部工具函数。 */
const resolveItemTitle = (item: Pick<BreadcrumbsRouteItem, 'title' | 'label'>, fallback?: any) =>
  item.title ?? item.label ?? fallback

/** 解析 Path 的内部工具函数。 */
const resolvePath = (params: BreadcrumbsParams, path?: string) => {
  if (path === undefined) {
    return undefined
  }

  let mergedPath = path.replace(/^\//, '').replace(/\/$/, '')
  Object.keys(params).forEach(key => {
    const value = params[key]
    if (value != null) {
      mergedPath = mergedPath.replace(`:${key}`, String(value))
    }
  })
  return mergedPath
}

/** 解析 Href 的内部工具函数。 */
const resolveHref = (href: string | undefined, paths: string[], hasPath: boolean) => {
  if (href) {
    return href
  }
  if (!hasPath) {
    return undefined
  }
  const mergedPath = paths.filter(Boolean).join('/')
  return mergedPath ? `/${mergedPath}` : '/'
}

/** 解析 Link Rel 的内部工具函数。 */
const resolveLinkRel = (target?: string, rel?: string) => {
  if (target === '_blank' && !rel) {
    return 'noreferrer'
  }
  return rel
}

/** prevent When Disabled 的内部工具函数。 */
const preventWhenDisabled = (disabled?: boolean, onClick?: (event: MouseEvent) => void) => {
  return (event: MouseEvent) => {
    if (disabled) {
      if (typeof (event as any).preventDefault === 'function') {
        ;(event as any).preventDefault()
      }
      if (typeof (event as any).stopPropagation === 'function') {
        ;(event as any).stopPropagation()
      }
      return
    }
    if (onClick) {
      onClick(event)
    }
  }
}

/** Default Separator 的内部工具函数。 */

/** Default Dropdown Icon 的内部工具函数。 */
const DefaultDropdownIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  )
}

/** 渲染 Menu Trigger 的内部工具函数。 */
const BreadcrumbText: FC<{ value: string }> = ({ value }) => <span>{String(value)}</span>

const MenuTrigger: FC<{
  menu?: BreadcrumbsMenu
  dropdownIcon?: any
  title: any
  children?: any
}> = ({ menu, dropdownIcon, title, children }) => {
  const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const menuItem = rowArg0
    const index = rowArg1

    const menuTitle = resolveItemTitle(menuItem)
    const handleClick = preventWhenDisabled(menuItem.disabled, menuItem.onClick)
    const className = menuItem.className ?? undefined

    if (menuItem.href && !menuItem.disabled) {
      return (
        <li key={menuItem.key ?? index}>
          <a
            className={className}
            href={menuItem.href}
            target={menuItem.target}
            rel={resolveLinkRel(menuItem.target, menuItem.rel)}
            onClick={menuItem.onClick ? handleClick : undefined}
          >
            <BreadcrumbText value={String(menuTitle)} />
          </a>
        </li>
      )
    }

    if (!menuItem.disabled && menuItem.onClick) {
      return (
        <li key={menuItem.key ?? index}>
          <button className={className} type="button" onClick={handleClick}>
            <BreadcrumbText value={String(menuTitle)} />
          </button>
        </li>
      )
    }

    return (
      <li key={menuItem.key ?? index}>
        <span
          className={mergeClassName(
            menuItem.disabled ? 'cursor-not-allowed opacity-50' : undefined,
            className,
          )}
        >
          <BreadcrumbText value={String(menuTitle)} />
        </span>
      </li>
    )
  }

  if (!menu?.items || menu.items.length === 0) {
    return <></>
  }

  const triggerLabel = typeof title === 'string' && title ? `打开 ${title} 菜单` : '打开路径菜单'

  return (
    <Dropdown
      as="span"
      trigger="click"
      popupStrategy="fixed"
      align={menu.align}
      direction={menu.direction}
      className={mergeClassName('ms-1', menu.className)}
      overlayClassName={mergeClassName('mt-2 min-w-40 p-2', menu.contentClassName)}
      overlay={
        <ul tabIndex={-1} className="menu w-full bg-transparent p-0">
          {menu.items.map((rowArg0: any, rowArg1: number) => (
            <CompiledRow1 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </ul>
      }
    >
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full text-base-content/60 outline-none transition-colors hover:text-base-content"
        aria-label={triggerLabel}
      >
        {children != null ? (
          <span style={{ display: 'contents' }}>{children}</span>
        ) : dropdownIcon != null ? (
          <span data-rue-breadcrumb-dropdown-icon="true">{String(dropdownIcon)}</span>
        ) : (
          <DefaultDropdownIcon />
        )}
      </button>
    </Dropdown>
  )
}

interface RenderItemContentOptions {
  item: BreadcrumbsRouteItem
  href?: string
  isLast: boolean
  allowAutoCurrent: boolean
  params: BreadcrumbsParams
  routes: ReadonlyArray<BreadcrumbsRouteItem>
  paths: string[]
  dropdownIcon?: any
  itemFormatter?: BreadcrumbsProps['itemFormatter']
  fallbackChildren?: any
}

interface RenderableBreadcrumbsItem {
  item: BreadcrumbsRouteItem
  index: number
  href?: string
  isLast: boolean
  separatorBefore?: any
  paths: string[]
}

/** 构建可渲染 Items，避免 JSX map 内部依赖可变闭包状态。 */
const buildRenderableItems = (
  mergedItems: ReadonlyArray<BreadcrumbsDataItem>,
  params: BreadcrumbsParams,
  resolvedSeparator: any,
) => {
  const routeItems = mergedItems.filter(item => !isSeparatorItem(item)) as BreadcrumbsRouteItem[]
  const renderableItems: RenderableBreadcrumbsItem[] = []
  const paths: string[] = []
  let routeIndex = -1
  let hasRenderedItem = false
  let separatorBefore = resolvedSeparator

  mergedItems.forEach((item, index) => {
    if (isSeparatorItem(item)) {
      separatorBefore = item.separator ?? resolvedSeparator
      return
    }

    routeIndex += 1

    const pathSegment = resolvePath(params, item.path)
    const pathsForItem =
      pathSegment !== undefined && pathSegment !== '' ? [...paths, pathSegment] : [...paths]
    const href = resolveHref(item.href, pathsForItem, pathSegment !== undefined)

    if (pathSegment !== undefined && pathSegment !== '') {
      paths.push(pathSegment)
    }

    renderableItems.push({
      item,
      index,
      href,
      isLast: routeIndex === routeItems.length - 1,
      separatorBefore: hasRenderedItem ? separatorBefore : undefined,
      paths: pathsForItem,
    })

    hasRenderedItem = true
    separatorBefore = resolvedSeparator
  })

  return {
    routeItems,
    renderableItems,
  }
}

/** 渲染 Item Content 的内部工具函数。 */
const RenderItemContent = ({
  item,
  href,
  isLast,
  allowAutoCurrent,
  params,
  routes,
  paths,
  dropdownIcon,
  itemFormatter,
  fallbackChildren,
}: RenderItemContentOptions) => {
  const title = itemFormatter
    ? itemFormatter(item, params, routes, paths, href)
    : resolveItemTitle(item)
  const readFallbackSlot = () => fallbackChildren
  const isCurrent = item.current ?? (allowAutoCurrent && isLast && !href)
  const handleClick = preventWhenDisabled(item.disabled, item.onClick)

  const ContentView = () => (
    <span className="inline-flex items-center gap-1">
      {item.icon ? (
        <span
          className={mergeClassName(
            'inline-flex shrink-0 items-center justify-center',
            item.iconClassName,
          )}
          aria-hidden={title != null ? 'true' : undefined}
        >
          {typeof item.icon === 'object' ? (
            <svg viewBox="0 0 24 24">
              <path d={item.icon.path} />
            </svg>
          ) : (
            <span>{String(item.icon)}</span>
          )}
        </span>
      ) : null}
      {title != null ? <span>{String(title)}</span> : <>{readFallbackSlot()}</>}
    </span>
  )

  const contentClassName =
    mergeClassName(
      isCurrent
        ? 'cursor-default font-medium text-base-content no-underline'
        : item.disabled
          ? 'cursor-not-allowed opacity-50 no-underline'
          : undefined,
      item.linkClassName,
    ) || undefined

  if (href && !item.disabled && !isCurrent) {
    return (
      <>
        <a
          className={contentClassName}
          href={href}
          target={item.target}
          rel={resolveLinkRel(item.target, item.rel)}
          onClick={item.onClick ? handleClick : undefined}
        >
          <ContentView />
        </a>
        <MenuTrigger menu={item.menu} title={title} dropdownIcon={dropdownIcon} />
      </>
    )
  }

  if (!item.disabled && !isCurrent && item.onClick) {
    return (
      <>
        <button className={contentClassName} type="button" onClick={handleClick}>
          <ContentView />
        </button>
        <MenuTrigger menu={item.menu} title={title} dropdownIcon={dropdownIcon} />
      </>
    )
  }

  return (
    <>
      <span className={contentClassName} aria-current={isCurrent ? 'page' : undefined}>
        <ContentView />
      </span>
      <MenuTrigger menu={item.menu} title={title} dropdownIcon={dropdownIcon} />
    </>
  )
}

/** Breadcrumbs 主组件：推荐 items，保留 children 兼容写法。 */
const Breadcrumbs: FC<BreadcrumbsProps> = ({
  className,
  children,
  items,
  routes,
  separator,
  params = {},
  dropdownIcon,
  itemFormatter,
}) => {
  const mergedItems = items && items.length ? items : routes
  let cls = 'breadcrumbs'
  const readItemContext = () => ({ params, dropdownIcon, itemFormatter })
  if (mergedItems && mergedItems.length) {
    cls += ' [&>ul>li+li]:before:hidden'
  }
  if (className) cls += ` ${className}`

  if (mergedItems && mergedItems.length) {
    const CompiledRow2 = ({ rowArg0 }: { rowArg0: any }) => {
      const { item, index, href, isLast, separatorBefore, paths } = rowArg0

      return (
        <li className={item.className ?? undefined} key={item.key ?? index}>
          {separatorBefore !== undefined ? (
            <span
              className="pointer-events-none inline-flex shrink-0 items-center justify-center ms-2 me-3 text-base-content/40"
              aria-hidden="true"
            >
              {String(separatorBefore)}
            </span>
          ) : null}
          <RenderItemContent
            {...{
              item,
              href,
              isLast,
              allowAutoCurrent: true,
              ...readItemContext(),
              routes: routeItems,
              paths,
            }}
          />
        </li>
      )
    }

    const resolvedSeparator = separator ?? '›'
    const { routeItems, renderableItems } = buildRenderableItems(
      mergedItems,
      params,
      resolvedSeparator,
    )

    return (
      <div className={cls}>
        <ul>
          {renderableItems.map((rowArg0: any, rowIndex: number) => (
            <CompiledRow2 rowArg0={rowArg0} />
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className={cls}>
      <ul>{children}</ul>
    </div>
  )
}

/** 子项组件：children 模式的轻量增强版，支持 href、icon、menu 与 current。 */
const Item: FC<BreadcrumbsItemProps> = ({ className, children, ...rest }) => {
  return (
    <li className={className ?? undefined}>
      <RenderItemContent
        {...{
          item: rest,
          href: rest.href,
          isLast: false,
          allowAutoCurrent: false,
          params: {},
          routes: [rest],
          paths: [],
          fallbackChildren: children,
        }}
      />
    </li>
  )
}

type BreadcrumbsCompound = FC<BreadcrumbsProps> & {
  Item: FC<BreadcrumbsItemProps>
}

const BreadcrumbsCompound: BreadcrumbsCompound = /*#__PURE__*/ Object.assign(Breadcrumbs, {
  Item,
})

/** 默认导出面包屑组件。 */
export default BreadcrumbsCompound
