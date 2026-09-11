/*
List 组件概述
- 保留 Rue/daisyUI 的 list 视觉与 Row/ColGrow/ColWrap 组合 API。
- 增强的数据 API：dataSource/renderItem、header/footer、loading、pagination、grid、empty。
- Item 支持 actions、extra、Meta，便于组织更完整的信息列表。
*/
import type { FC } from '@rue-js/rue'
import { computed, ref } from '@rue-js/rue'

/** ListSize 尺寸类型。 */
export type ListSize = 'small' | 'default' | 'large' | 'sm' | 'md' | 'lg'
/** ListItemLayout 类型。 */
export type ListItemLayout = 'horizontal' | 'vertical'
/** ListPaginationPosition 位置或方向类型。 */
export type ListPaginationPosition = 'top' | 'bottom' | 'both'
/** ListPaginationAlign 对齐方式类型。 */
export type ListPaginationAlign = 'start' | 'center' | 'end'
/** ListKey 标识键类型。 */
export type ListKey = string | number

/** ListGridType 接口。 */
export interface ListGridType {
  /** 栅格间距。 */
  gutter?: number | string
  /** column 配置项。 */
  column?: number
  /** xs 配置项。 */
  xs?: number
  /** sm 配置项。 */
  sm?: number
  /** md 配置项。 */
  md?: number
  /** lg 配置项。 */
  lg?: number
  /** xl 配置项。 */
  xl?: number
  /** xxl 配置项。 */
  xxl?: number
  /** xxxl 配置项。 */
  xxxl?: number
}

/** ListPaginationConfig 配置对象。 */
export interface ListPaginationConfig {
  /** current 配置项。 */
  current?: number
  /** defaultCurrent 配置项。 */
  defaultCurrent?: number
  /** pageSize 尺寸。 */
  pageSize?: number
  /** defaultPageSize 尺寸。 */
  defaultPageSize?: number
  /** total 配置项。 */
  total?: number
  /** position 配置项。 */
  position?: ListPaginationPosition
  /** 交叉轴或内容对齐方式。 */
  align?: ListPaginationAlign
  /** hideOnSinglePage 配置项。 */
  hideOnSinglePage?: boolean
  /** showTotal 配置项。 */
  showTotal?: (total: number, range: [number, number]) => any
  /** 值或状态变化时触发的回调。 */
  onChange?: (page: number, pageSize: number) => void
}

/** ListLoadingConfig 配置对象。 */
export interface ListLoadingConfig {
  /** spinning 配置项。 */
  spinning?: boolean
  /** tip 配置项。 */
  tip?: any
  /** indicator 配置项。 */
  indicator?: any
}

/** ListLocale 接口。 */
export interface ListLocale {
  /** emptyText 文本内容。 */
  emptyText?: any
}

/** ListColDataItem 数据项结构。 */
export interface ListColDataItem {
  /** 组件类型或语义类型。 */
  type: 'grow' | 'wrap'
  /** 自定义渲染的宿主元素。 */
  as?: 'div' | 'p' | 'span'
  /** 根节点附加类名。 */
  className?: string
  /** 主体内容。 */
  content?: any
}

/** ListDataItem 数据项结构。 */
export interface ListDataItem {
  /** 数据项唯一标识。 */
  key?: ListKey
  /** 组件类型或语义类型。 */
  type?: 'row' | 'item'
  /** normal 配置项。 */
  normal?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 主体内容。 */
  content?: any
  /** cols 配置项。 */
  cols?: ReadonlyArray<ListColDataItem>
  /** 标题内容。 */
  title?: any
  /** 描述内容。 */
  description?: any
  /** avatar 配置项。 */
  avatar?: any
  /** 操作区内容。 */
  actions?: any[]
  /** 额外操作或补充内容。 */
  extra?: any
}

/** ListProps 组件属性。 */
export interface ListProps<T = any> {
  /** bordered 配置项。 */
  bordered?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 数据源。 */
  dataSource?: ReadonlyArray<T>
  /** emptyText 文本内容。 */
  emptyText?: any
  /** 底部区域内容。 */
  footer?: any
  /** grid 配置项。 */
  grid?: ListGridType
  /** 头部区域内容。 */
  header?: any
  /** itemLayout 配置项。 */
  itemLayout?: ListItemLayout
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<ListDataItem>
  /** 是否展示加载态。 */
  loading?: boolean | ListLoadingConfig
  /** loadMore 配置项。 */
  loadMore?: any
  /** locale 配置项。 */
  locale?: ListLocale
  /** pagination 配置项。 */
  pagination?: boolean | ListPaginationConfig | false
  /** renderItem 配置项。 */
  itemFormatter?: (item: T, index: number) => string | number
  itemClassName?: string
  /** rowKey 标识键。 */
  rowKey?: keyof T | ((item: T, index: number) => ListKey)
  /** 组件尺寸。 */
  size?: ListSize
  /** split 配置项。 */
  split?: boolean
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ListRowProps 组件属性。 */
export interface ListRowProps {
  /** normal 配置项。 */
  normal?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ListColProps 组件属性。 */
export interface ListColProps {
  /** 自定义渲染的宿主元素。 */
  as?: 'div' | 'p' | 'span'
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ListItemMetaProps 组件属性。 */
export interface ListItemMetaProps {
  /** avatar 配置项。 */
  avatar?: any
  /** 根节点附加类名。 */
  className?: string
  /** 描述内容。 */
  description?: any
  /** 标题内容。 */
  title?: any
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ListItemProps 组件属性。 */
export interface ListItemProps {
  /** 操作区内容。 */
  actions?: any[]
  /** 根节点附加类名。 */
  className?: string
  /** 按局部区域覆盖的类名集合。 */
  classNames?: {
    actions?: string
    extra?: string
    meta?: string
  }
  /** 额外操作或补充内容。 */
  extra?: any
  /** itemLayout 配置项。 */
  itemLayout?: ListItemLayout
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: {
    actions?: Record<string, any>
    extra?: Record<string, any>
    meta?: Record<string, any>
  }
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedLoadingConfig {
  spinning: boolean
  tip?: any
  indicator?: any
}

interface NormalizedPaginationConfig extends ListPaginationConfig {
  current: number
  pageSize: number
  total: number
  position: ListPaginationPosition
  align: ListPaginationAlign
}

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | false | null | undefined>) => {
  const cls = parts.filter(Boolean).join(' ').trim()
  return cls || undefined
}

/** as Css Size 的内部工具函数。 */
const asCssSize = (value?: number | string) => {
  if (typeof value === 'number') return `${value}px`
  return value
}

/** clamp Page 的内部工具函数。 */
const clampPage = (page: number, pageCount: number) => {
  if (page <= 1) return 1
  if (page >= pageCount) return pageCount
  return page
}

/** 判断 Legacy List Data Item 的内部工具函数。 */
const isLegacyListDataItem = (item: any): item is ListDataItem => {
  return !!(
    item &&
    typeof item === 'object' &&
    (item.type === 'item' ||
      item.type === 'row' ||
      item.cols ||
      item.content !== undefined ||
      item.normal !== undefined ||
      item.title !== undefined ||
      item.description !== undefined ||
      item.avatar !== undefined ||
      item.actions !== undefined ||
      item.extra !== undefined)
  )
}

/** 解析 Renderable Item Content 的内部工具函数。 */
const resolveRenderableItemContent = (item: any) => {
  if (item == null || typeof item === 'boolean') {
    return item
  }

  if (Array.isArray(item)) {
    return item
  }

  if (typeof item !== 'object') {
    return item
  }

  const candidateFields = ['content', 'children', 'title', 'label', 'text', 'name', 'description']

  for (const field of candidateFields) {
    const value = item[field]
    if (value !== undefined && value !== null) {
      return value
    }
  }

  try {
    return JSON.stringify(item)
  } catch {
    return String(item)
  }
}

/** 判断 Empty Node 的内部工具函数。 */
const isEmptyNode = (value: any) => {
  return value === undefined || value === null || (Array.isArray(value) && value.length === 0)
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: ListSize) => {
  switch (size) {
    case 'small':
    case 'sm':
      return 'text-sm'
    case 'large':
    case 'lg':
      return 'text-lg'
    default:
      return undefined
  }
}

/** 归一化 Loading 的内部工具函数。 */
const normalizeLoading = (loading?: boolean | ListLoadingConfig): NormalizedLoadingConfig => {
  if (typeof loading === 'object') {
    return {
      spinning: loading.spinning !== false,
      tip: loading.tip,
      indicator: loading.indicator,
    }
  }
  return {
    spinning: !!loading,
  }
}

/** 读取 Record Key 的内部工具函数。 */
const getRecordKey = <T,>(
  item: T,
  index: number,
  rowKey?: keyof T | ((item: T, index: number) => ListKey),
) => {
  if (typeof rowKey === 'function') return rowKey(item, index)
  if (rowKey && item && typeof item === 'object') return (item as any)[rowKey]
  if (item && typeof item === 'object' && (item as any).key != null) return (item as any).key
  return `list-item-${index}`
}

/** 读取 Grid Column Count 的内部工具函数。 */
const getGridColumnCount = (grid?: ListGridType) => {
  if (!grid) return undefined
  return grid.xxxl ?? grid.xxl ?? grid.xl ?? grid.lg ?? grid.md ?? grid.sm ?? grid.xs ?? grid.column
}

/** 读取 Grid Style 的内部工具函数。 */
const getGridStyle = (grid?: ListGridType, style?: Record<string, any>) => {
  if (!grid) return style
  const columnCount = getGridColumnCount(grid)
  return {
    ...style,
    display: 'grid',
    gridTemplateColumns: columnCount ? `repeat(${columnCount}, minmax(0, 1fr))` : undefined,
    gap: asCssSize(grid.gutter),
  }
}

/** 解析 Pagination 的内部工具函数。 */
const resolvePagination = (
  pagination: boolean | ListPaginationConfig | false | undefined,
  total: number,
  currentValue: number,
  pageSizeValue: number,
): NormalizedPaginationConfig | null => {
  if (!pagination) return null
  const config = typeof pagination === 'object' ? pagination : {}
  const pageSize = Math.max(1, config.pageSize ?? pageSizeValue ?? config.defaultPageSize ?? 10)
  const pageCount = Math.max(1, Math.ceil((config.total ?? total) / pageSize))
  const current = clampPage(config.current ?? currentValue ?? config.defaultCurrent ?? 1, pageCount)

  return {
    ...config,
    current,
    pageSize,
    total: config.total ?? total,
    position: config.position ?? 'bottom',
    align: config.align ?? 'end',
  }
}

/** 渲染 Legacy Item 的内部工具函数。 */
const RenderLegacyItem = ({ arg0: item, arg1: index }: { arg0: ListDataItem; arg1: number }) => {
  const key = item.key ?? index
  const type =
    item.type ??
    (item.cols ||
    item.title !== undefined ||
    item.description !== undefined ||
    item.avatar !== undefined ||
    item.actions !== undefined ||
    item.extra !== undefined
      ? 'row'
      : 'item')
  if (type === 'item') {
    return <Item className={item.className}>{String(item.content ?? '')}</Item>
  }

  if (item.title || item.description || item.avatar || item.actions || item.extra) {
    return (
      <Item actions={item.actions} className={item.className} extra={item.extra}>
        <Meta avatar={item.avatar} title={item.title} description={item.description}>
          {String(item.content ?? '')}
        </Meta>
        <ListDataCols cols={item.cols} />
      </Item>
    )
  }

  return (
    <Row normal={item.normal} className={item.className}>
      {String(item.content ?? '')}
      <ListDataCols cols={item.cols} />
    </Row>
  )
}

/** 渲染 Loading 的内部工具函数。 */
const RenderLoading = ({ arg0: loading }: { arg0: NormalizedLoadingConfig }) => {
  if (!loading.spinning) return <></>
  return (
    <li className="flex min-h-24 items-center justify-center gap-3 p-6 text-sm opacity-70">
      {loading.indicator ?? <span className="loading loading-spinner loading-sm" />}
      {loading.tip ? <span>{loading.tip}</span> : null}
    </li>
  )
}

/** 渲染 Empty 的内部工具函数。 */
const RenderEmpty = ({ arg0: emptyText }: { arg0: any }) => {
  return <li className="p-8 text-center text-sm opacity-60">{emptyText ?? 'No data'}</li>
}

/** 渲染 Section 的内部工具函数。 */
const RenderSection = ({ arg0: content, arg1: className }: { arg0: any; arg1: string }) => {
  if (isEmptyNode(content)) return <></>
  return <li className={className}>{String(content)}</li>
}

const ListDivHost: FC<any> = ({ children, ...rest }) => <div {...rest}>{children}</div>
const ListParagraphHost: FC<any> = ({ children, ...rest }) => <p {...rest}>{children}</p>
const ListSpanHost: FC<any> = ({ children, ...rest }) => <span {...rest}>{children}</span>
const ListItemHost: FC<any> = ({ children, ...rest }) => <li {...rest}>{children}</li>
const LIST_BLOCK_HOSTS = { div: ListDivHost, p: ListParagraphHost, span: ListSpanHost }
const LIST_PAGER_HOSTS = { div: ListDivHost, li: ListItemHost }
const Component = ListDivHost as any

/** 渲染 Pager 的内部工具函数。 */
const Pager = ({
  config,
  onChange,
  as = 'li',
}: {
  config: NormalizedPaginationConfig | null
  onChange: (page: number) => void
  as?: 'li' | 'div'
}) => {
  if (!config) return <></>
  const pageCount = Math.max(1, Math.ceil(config.total / config.pageSize))
  if (config.hideOnSinglePage && pageCount <= 1) return <></>
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)
  const start = config.total === 0 ? 0 : (config.current - 1) * config.pageSize + 1
  const end = Math.min(config.current * config.pageSize, config.total)
  const alignClass =
    config.align === 'start'
      ? 'justify-start'
      : config.align === 'center'
        ? 'justify-center'
        : 'justify-end'

  return as === 'div' ? (
    <div className={mergeClassNames('flex flex-wrap items-center gap-3 p-3', alignClass)}>
      {config.showTotal ? (
        <span className="mr-auto text-xs opacity-60">
          {config.showTotal(config.total, [start, end])}
        </span>
      ) : null}
      <div className="join">
        <button
          className={mergeClassNames('join-item btn btn-sm', config.current <= 1 && 'btn-disabled')}
          disabled={config.current <= 1}
          onClick={() => onChange(config.current - 1)}
          type="button"
        >
          Prev
        </button>
        {pages.map(page => (
          <button
            className={mergeClassNames(
              'join-item btn btn-sm',
              page === config.current && 'btn-active',
            )}
            key={page}
            onClick={() => onChange(page)}
            type="button"
          >
            {page}
          </button>
        ))}
        <button
          className={mergeClassNames(
            'join-item btn btn-sm',
            config.current >= pageCount && 'btn-disabled',
          )}
          disabled={config.current >= pageCount}
          onClick={() => onChange(config.current + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  ) : as === 'li' ? (
    <li className={mergeClassNames('flex flex-wrap items-center gap-3 p-3', alignClass)}>
      {config.showTotal ? (
        <span className="mr-auto text-xs opacity-60">
          {config.showTotal(config.total, [start, end])}
        </span>
      ) : null}
      <div className="join">
        <button
          className={mergeClassNames('join-item btn btn-sm', config.current <= 1 && 'btn-disabled')}
          disabled={config.current <= 1}
          onClick={() => onChange(config.current - 1)}
          type="button"
        >
          Prev
        </button>
        {pages.map(page => (
          <button
            className={mergeClassNames(
              'join-item btn btn-sm',
              page === config.current && 'btn-active',
            )}
            key={page}
            onClick={() => onChange(page)}
            type="button"
          >
            {page}
          </button>
        ))}
        <button
          className={mergeClassNames(
            'join-item btn btn-sm',
            config.current >= pageCount && 'btn-disabled',
          )}
          disabled={config.current >= pageCount}
          onClick={() => onChange(config.current + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </li>
  ) : (
    <></>
  )
}

/** 列表组件：children、items 与 dataSource 三种渲染方式。 */
const List: FC<ListProps> = ({
  bordered,
  className,
  children,
  dataSource,
  emptyText,
  footer,
  grid,
  header,
  itemLayout = 'horizontal',
  items,
  loading,
  loadMore,
  locale,
  pagination,
  itemFormatter,
  itemClassName,
  rowKey,
  size,
  split = true,
  style,
  ...rest
}) => {
  const loadingConfig = normalizeLoading(loading)
  const currentRef = ref(
    typeof pagination === 'object' ? (pagination.defaultCurrent ?? pagination.current ?? 1) : 1,
  )
  const pageSizeRef = ref(
    typeof pagination === 'object' ? (pagination.defaultPageSize ?? pagination.pageSize ?? 10) : 10,
  )
  const hasDataSource = Array.isArray(dataSource)
  const dataItems = hasDataSource ? dataSource : items
  const hasPagination = !!pagination

  let cls = 'list'
  if (bordered) cls += ' border border-base-300 rounded-box overflow-hidden'
  if (grid) cls += ' grid'
  if (!split) cls += ' list-no-split'
  if (itemLayout === 'vertical') cls += ' list-vertical'
  cls = mergeClassNames(cls, resolveSizeClass(size), className) ?? 'list'

  const readItemClass = () => itemClassName
  const formatItem = (item: any, index: number) =>
    itemFormatter ? itemFormatter(item, index) : (resolveRenderableItemContent(item) ?? '')
  const PageItem = ({
    item,
    index,
    pager,
  }: {
    item: any
    index: number
    pager: NormalizedPaginationConfig | null
  }) => {
    const absoluteIndex = pager ? (pager.current - 1) * pager.pageSize + index : index
    return isLegacyListDataItem(item) ? (
      <RenderLegacyItem arg0={item} arg1={absoluteIndex} />
    ) : (
      <li className={readItemClass()}>{String(formatItem(item, absoluteIndex))}</li>
    )
  }
  const RenderPageItems = ({
    arg0: pageData,
    arg1: pager,
  }: {
    arg0: ReadonlyArray<any> | undefined
    arg1: NormalizedPaginationConfig | null
  }) => (
    <>
      {(pageData ?? []).map((item, index) => (
        <PageItem
          key={getRecordKey(item, index, rowKey as any)}
          item={item}
          index={index}
          pager={pager}
        />
      ))}
    </>
  )

  const getPagerSnapshot = () =>
    resolvePagination(pagination, dataItems?.length ?? 0, currentRef.value, pageSizeRef.value)

  const getPageDataSnapshot = (pager: NormalizedPaginationConfig | null) => {
    if (!dataItems) return dataItems
    if (!pager) return dataItems
    return dataItems.slice((pager.current - 1) * pager.pageSize, pager.current * pager.pageSize)
  }
  const pager = computed(() => getPagerSnapshot())
  const pagedItems = computed(() => getPageDataSnapshot(pager.get()))
  const PaginatedListContent = () =>
    loadingConfig.spinning ? (
      <RenderLoading arg0={loadingConfig} />
    ) : dataItems && dataItems.length === 0 ? (
      <RenderEmpty arg0={locale?.emptyText ?? emptyText} />
    ) : (
      <RenderPageItems arg0={pagedItems.get()} arg1={pager.get()} />
    )

  const handlePageChange = (nextPage: number) => {
    const pager = getPagerSnapshot()
    if (!pager) return
    const pageCount = Math.max(1, Math.ceil(pager.total / pager.pageSize))
    const safePage = clampPage(nextPage, pageCount)
    if (typeof pagination === 'object' && pagination.current === undefined) {
      currentRef.value = safePage
    }
    pageSizeRef.value = pager.pageSize
    if (pager.onChange) pager.onChange(safePage, pager.pageSize)
  }

  if (hasPagination) {
    const wrapperCls = mergeClassNames(
      'rue-list',
      bordered && 'border border-base-300 rounded-box overflow-hidden',
      className,
    )
    const listCls = mergeClassNames(
      'list',
      grid && 'grid',
      !split && 'list-no-split',
      itemLayout === 'vertical' && 'list-vertical',
      resolveSizeClass(size),
    )

    return (
      <div {...rest} className={wrapperCls} style={!grid ? style : undefined}>
        {pager.get() && (pager.get()?.position === 'top' || pager.get()?.position === 'both') ? (
          <Pager config={pager.get()} onChange={handlePageChange} as="div" />
        ) : null}
        {isEmptyNode(header) ? null : (
          <div className="p-4 pb-2 text-sm font-medium opacity-70">{header}</div>
        )}
        <ul className={listCls} style={getGridStyle(grid, grid ? style : undefined)}>
          <PaginatedListContent />
        </ul>
        {isEmptyNode(footer) ? null : <div className="p-4 pt-2 text-sm opacity-70">{footer}</div>}
        {isEmptyNode(loadMore) ? null : <div className="p-3 text-center">{loadMore}</div>}
        {pager.get() && (pager.get()?.position === 'bottom' || pager.get()?.position === 'both') ? (
          <Pager config={pager.get()} onChange={handlePageChange} as="div" />
        ) : null}
      </div>
    )
  }

  return (
    <ul {...rest} className={cls} style={getGridStyle(grid, style)}>
      <RenderSection arg0={header} arg1={'p-4 pb-2 text-sm font-medium opacity-70'} />
      {loadingConfig.spinning ? <RenderLoading arg0={loadingConfig} /> : null}
      {!loadingConfig.spinning && dataItems && dataItems.length === 0 ? (
        <RenderEmpty arg0={locale?.emptyText ?? emptyText} />
      ) : null}
      {!loadingConfig.spinning && dataItems && dataItems.length > 0 && (
        <RenderPageItems arg0={dataItems} arg1={null} />
      )}
      {!hasDataSource && !items ? <>{children}</> : null}
      <RenderSection arg0={footer} arg1={'p-4 pt-2 text-sm opacity-70'} />
      <RenderSection arg0={loadMore} arg1={'p-3 text-center'} />
    </ul>
  )
}

/** 行组件：normal 时为普通 li，否则为 list-row。 */
const Row: FC<ListRowProps> = ({ normal, className, children, ...rest }) => {
  if (normal) {
    return (
      <li {...rest} className={className || undefined}>
        {children}
      </li>
    )
  }
  return (
    <li {...rest} className={mergeClassNames('list-row', className)}>
      {children}
    </li>
  )
}

/** 列：可伸展区域。 */
const ColGrow: FC<ListColProps> = ({ as = 'div', className, children, ...rest }) => {
  return as === 'div' ? (
    <div {...rest} className={mergeClassNames('list-col-grow', className)}>
      {children}
    </div>
  ) : as === 'span' ? (
    <span {...rest} className={mergeClassNames('list-col-grow', className)}>
      {children}
    </span>
  ) : as === 'p' ? (
    <p {...rest} className={mergeClassNames('list-col-grow', className)}>
      {children}
    </p>
  ) : as === 'label' ? (
    <label {...rest} className={mergeClassNames('list-col-grow', className)}>
      {children}
    </label>
  ) : as === 'li' ? (
    <li {...rest} className={mergeClassNames('list-col-grow', className)}>
      {children}
    </li>
  ) : as === 'button' ? (
    <button {...rest} className={mergeClassNames('list-col-grow', className)}>
      {children}
    </button>
  ) : (
    <></>
  )
}

/** 列：包裹区域。 */
const ColWrap: FC<ListColProps> = ({ as = 'div', className, children, ...rest }) => {
  return as === 'div' ? (
    <div {...rest} className={mergeClassNames('list-col-wrap', className)}>
      {children}
    </div>
  ) : as === 'span' ? (
    <span {...rest} className={mergeClassNames('list-col-wrap', className)}>
      {children}
    </span>
  ) : as === 'p' ? (
    <p {...rest} className={mergeClassNames('list-col-wrap', className)}>
      {children}
    </p>
  ) : as === 'label' ? (
    <label {...rest} className={mergeClassNames('list-col-wrap', className)}>
      {children}
    </label>
  ) : as === 'li' ? (
    <li {...rest} className={mergeClassNames('list-col-wrap', className)}>
      {children}
    </li>
  ) : as === 'button' ? (
    <button {...rest} className={mergeClassNames('list-col-wrap', className)}>
      {children}
    </button>
  ) : (
    <></>
  )
}

/** 数据列渲染组件。 */
const ListDataCol: FC<{ col: ListColDataItem }> = ({ col }) => {
  if (col.type === 'grow') {
    return (
      <ColGrow as={col.as} className={col.className}>
        {String(col.content ?? '')}
      </ColGrow>
    )
  }
  return (
    <ColWrap as={col.as} className={col.className}>
      {String(col.content ?? '')}
    </ColWrap>
  )
}

/** 数据列集合渲染组件。 */
const ListDataCols: FC<{ cols?: ReadonlyArray<ListColDataItem> }> = ({ cols }) => {
  if (!cols) return <></>
  return (
    <>
      {cols.map((col, index) => (
        <ListDataCol col={col} key={index} />
      ))}
    </>
  )
}

/** Meta 的内部工具函数。 */
const Meta: FC<ListItemMetaProps> = ({
  avatar,
  className,
  description,
  title,
  children,
  ...rest
}) => {
  return (
    <div {...rest} className={mergeClassNames('flex min-w-0 flex-1 items-start gap-3', className)}>
      {avatar ? <div className="shrink-0">{String(avatar)}</div> : null}
      <div className="min-w-0 flex-1">
        {title ? <div className="font-medium">{String(title)}</div> : null}
        {description ? <div className="text-sm opacity-70">{String(description)}</div> : null}
        {children}
      </div>
    </div>
  )
}

/** Action 渲染组件。 */
const ListActionItem: FC<{ action: any }> = ({ action }) => {
  return (
    <li>
      <button type="button" onClick={action.onClick}>
        {String(action.label)}
      </button>
    </li>
  )
}

/** 项组件：默认保持普通 li；传入 actions/extra 时自动组织为信息行。 */
const Item: FC<ListItemProps> = ({
  actions,
  className,
  classNames,
  extra,
  extraClassName,
  itemLayout = 'horizontal',
  styles,
  children,
  ...rest
}) => {
  const hasActions = !!actions && actions.length > 0
  const hasExtra = !isEmptyNode(extra)
  if (!hasActions && !hasExtra) {
    return (
      <li {...rest} className={className || undefined}>
        {children}
      </li>
    )
  }

  const vertical = itemLayout === 'vertical'
  return (
    <li
      {...rest}
      className={mergeClassNames(
        'list-row',
        vertical && 'items-start',
        hasExtra && !vertical && 'grid-cols-[1fr_auto]',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {children}
        {hasActions ? (
          <ul
            className={mergeClassNames(
              'mt-3 flex flex-wrap items-center gap-2 text-sm opacity-80',
              classNames?.actions,
            )}
            style={styles?.actions}
          >
            {actions.map((action, index) => (
              <ListActionItem action={action} key={index} />
            ))}
          </ul>
        ) : null}
      </div>
      {hasExtra ? (
        <div
          className={mergeClassNames('list-col-wrap', classNames?.extra, extraClassName)}
          style={styles?.extra}
        >
          {String(extra)}
        </div>
      ) : null}
    </li>
  )
}

type ListCompound = FC<ListProps> & {
  Row: FC<ListRowProps>
  ColGrow: FC<ListColProps>
  ColWrap: FC<ListColProps>
  Item: FC<ListItemProps> & {
    Meta: FC<ListItemMetaProps>
  }
}

const ItemCompound = /*#__PURE__*/ Object.assign(Item, {
  Meta,
})

const ListCompound: ListCompound = /*#__PURE__*/ Object.assign(List, {
  Row,
  ColGrow,
  ColWrap,
  Item: ItemCompound,
})

/** 默认导出列表组件。 */
export default ListCompound
