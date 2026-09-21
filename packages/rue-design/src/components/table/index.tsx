/*
Table 组件概述
- 数据驱动：基于 columns 与 dataSource 渲染表格，支持排序、筛选、分页、选择、展开与分组表头。
- 状态模型：排序、筛选、分页、选择与展开同时支持受控与非受控两类写法。
- 复合组件：Head/Body/Foot/TR/TH/TD 便于自定义结构；也可直接传 children。
*/
import type { FC } from '@rue-js/rue'
import { computed, ref, Slot } from '@rue-js/rue'
import Dropdown from '../dropdown/index'

type TableSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'large'
type TableKey = string | number
type SortOrder = 'ascend' | 'descend' | null
type ColumnAlign = 'left' | 'right' | 'center'
type PaginationPlacement =
  | 'topStart'
  | 'topCenter'
  | 'topEnd'
  | 'bottomStart'
  | 'bottomCenter'
  | 'bottomEnd'
  | 'none'
type PaginationPosition =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'
  | 'none'
type SorterTooltipTarget = 'full-header' | 'sorter-icon'
type ShowSorterTooltip = boolean | { target?: SorterTooltipTarget; title?: any }

interface TableLocale {
  emptyText?: any
  filterConfirm?: any
  filterReset?: any
  triggerAsc?: string
  triggerDesc?: string
  cancelSort?: string
}

interface TableClassNames {
  root?: string
  wrapper?: string
  table?: string
  title?: string
  footer?: string
  thead?: string
  tbody?: string
  tfoot?: string
  headerRow?: string
  bodyRow?: string
  headerCell?: string
  cell?: string
  summary?: string
  pager?: string
  empty?: string
  loading?: string
}

interface TableStyles {
  root?: Record<string, any>
  wrapper?: Record<string, any>
  table?: Record<string, any>
  title?: Record<string, any>
  footer?: Record<string, any>
  thead?: Record<string, any>
  tbody?: Record<string, any>
  tfoot?: Record<string, any>
  headerRow?: Record<string, any>
  bodyRow?: Record<string, any>
  headerCell?: Record<string, any>
  cell?: Record<string, any>
  summary?: Record<string, any>
  pager?: Record<string, any>
  empty?: Record<string, any>
  loading?: Record<string, any>
}

type SemanticRecord<T> = T | ((info: { props: TableProps }) => T)

interface FilterItem {
  text: any
  value: any
  children?: FilterItem[]
}

interface ColumnTitleContext {
  sortOrder: SortOrder
  filteredValue: any[]
  sortColumns: Array<{ column: any; columnKey: string; order: SortOrder }>
  filters: Record<string, any[]>
}

interface SorterConfig {
  compare?: (a: any, b: any) => number
  multiple?: number
}

interface ColumnItem {
  key?: string
  title?: string | number | ((context: ColumnTitleContext) => string | number)
  dataIndex?: string | string[]
  align?: ColumnAlign
  className?: string
  width?: string | number
  minWidth?: string | number
  ellipsis?: boolean | { showTitle?: boolean }
  formatter?: (value: any, record: any, index: number) => string | number
  sorter?: boolean | ((a: any, b: any) => number) | SorterConfig
  defaultSortOrder?: SortOrder
  sortOrder?: SortOrder
  sortDirections?: Array<Exclude<SortOrder, null>>
  sortIcon?: (props: { sortOrder: SortOrder }) => string
  showSorterTooltip?: ShowSorterTooltip
  filtered?: boolean
  filters?: FilterItem[]
  onFilter?: (value: any, record: any) => boolean
  filteredValue?: any[] | null
  defaultFilteredValue?: any[] | null
  filterMultiple?: boolean
  filterCombine?: 'or' | 'and'
  filterOnClose?: boolean
  filterResetToDefaultFilteredValue?: boolean
  filterPresets?: Array<{ label: string; values: any[]; className?: string }>
  filterConfirmClassName?: string
  filterDropdownOpen?: boolean
  filterDropdownProps?: TableFilterDropdownProps
  filterMode?: 'menu' | 'tree'
  onFilterDropdownOpenChange?: (visible: boolean) => void
  filterSearch?: boolean | ((input: string, item: FilterItem) => boolean)
  filterIcon?: string | ((filtered: boolean) => string)
  hidden?: boolean
  onHeaderCell?: (column: ColumnItem, index: number) => Record<string, any>
  onCell?: (record: any, rowIndex: number) => Record<string, any>
  rowScope?: 'row' | 'rowgroup'
  fixedCol?: boolean
  fixed?: boolean | 'left' | 'right' | 'start' | 'end'
  colSpan?: number
  rowSpan?: number
  children?: ColumnItem[]
}

interface RowSelection {
  type?: 'checkbox' | 'radio'
  selectedRowKeys?: TableKey[]
  defaultSelectedRowKeys?: TableKey[]
  columnWidth?: number | string
  columnTitle?: string
  titleClassName?: string
  cellClassName?: string
  cellLabelFormatter?: (checked: boolean, record: any, index: number) => string
  align?: ColumnAlign
  hideSelectAll?: boolean
  disabled?: boolean
  fixed?: boolean | 'left' | 'right' | 'start' | 'end'
  onChange?: (selectedRowKeys: TableKey[], selectedRows: any[], info?: any) => void
  onSelect?: (record: any, selected: boolean, selectedRows: any[], nativeEvent?: Event) => void
  getCheckboxProps?: (record: any) => Record<string, any>
  getTitleCheckboxProps?: () => Record<string, any>
  onSelectAll?: (selected: boolean, selectedRows: any[]) => void
  preserveSelectedRowKeys?: boolean
}

interface PaginationConfig {
  current?: number
  defaultCurrent?: number
  pageSize?: number
  defaultPageSize?: number
  hideOnSinglePage?: boolean
  placement?: PaginationPlacement[]
  position?: PaginationPosition[]
  onChange?: (page: number, pageSize: number) => void
}

interface ExpandableConfig {
  expandedRowRender?: (record: any, index: number, indent: number, expanded: boolean) => any
  expandedRowFormatter?: (record: any, index: number, indent: number, expanded: boolean) => any
  expandedRowKeys?: TableKey[]
  defaultExpandedRowKeys?: TableKey[]
  defaultExpandAllRows?: boolean
  expandRowByClick?: boolean
  rowExpandable?: (record: any) => boolean
  showExpandColumn?: boolean
  columnTitle?: any
  columnWidth?: number | string
  childrenColumnName?: string
  expandedRowClassName?: string | ((record: any, index: number, indent: number) => string)
  expandButtonClassName?: string
  expandLabelFormatter?: (expanded: boolean, record: any) => string
  indentSize?: number
  fixed?: boolean | 'left' | 'right' | 'start' | 'end'
  onExpand?: (expanded: boolean, record: any) => void
  onExpandedRowsChange?: (expandedRowKeys: TableKey[]) => void
}

interface ScrollConfig {
  x?: string | number | true
  y?: string | number
  scrollToFirstRowOnChange?: boolean
}

interface TableProps {
  size?: TableSize
  zebra?: boolean
  pinRows?: boolean
  pinCols?: boolean
  bordered?: boolean
  className?: string
  classNames?: SemanticRecord<TableClassNames>
  styles?: SemanticRecord<TableStyles>
  children?: any
  dataSource?: any[]
  columns?: ColumnItem[]
  rowKey?: string | ((record: any) => TableKey)
  showHeader?: boolean
  onRow?: (record: any, index: number) => Record<string, any>
  onHeaderRow?: (columns: ColumnItem[], index: number) => Record<string, any>
  onChange?: (pagination: any, filters: any, sorter: any, extra: any) => void
  rowSelection?: RowSelection
  pagination?: false | PaginationConfig
  expandable?: ExpandableConfig
  rowClassName?: (record: any, index: number) => string
  summary?: (currentData: any[], info?: { total: number; page: number; pageSize: number }) => any
  emptyText?: any
  locale?: TableLocale
  titleFormatter?: (currentData: any[]) => any
  footerFormatter?: (currentData: any[]) => any
  title?: (currentData: any[]) => any
  footer?: (currentData: any[]) => any
  loading?: boolean | { spinning?: boolean; tip?: any }
  rowHoverable?: boolean
  rowHoverClass?: string
  tableLayout?: 'auto' | 'fixed'
  sortDirections?: Array<Exclude<SortOrder, null>>
  showSorterTooltip?: ShowSorterTooltip
  scroll?: ScrollConfig
  sticky?:
    | boolean
    | { offsetHeader?: number; offsetScroll?: number; getContainer?: () => HTMLElement }
  height?: string | number
  onScroll?: (event: any) => void
}

interface FilterConfirmOptions {
  closeDropdown?: boolean
}

interface FilterClearOptions {
  confirm?: boolean
  closeDropdown?: boolean
}

interface FilterDropdownRenderProps {
  setSelectedKeys: (selectedKeys: any[]) => void
  selectedKeys: any[]
  confirm: (options?: FilterConfirmOptions) => void
  clearFilters?: (options?: FilterClearOptions) => void
  filters?: FilterItem[]
  close: () => void
  visible: boolean
}

interface TableFilterDropdownProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  [key: string]: any
}

interface HeaderCellMeta {
  column: ColumnItem
  index: number
  key: string
  colSpan: number
  rowSpan: number
}

interface SortState {
  key: string
  order: SortOrder
  multiple?: number
}

type SortStateInput =
  | SortState
  | { key: string; order?: SortOrder; multiple?: number }
  | null
  | undefined

interface FlattenRow {
  key: TableKey
  renderKey: string
  record: any
  indent: number
  hasTreeChildren: boolean
}

let tableSeed = 0

const defaultTableLocale: Required<TableLocale> = {
  emptyText: 'No Data',
  filterConfirm: '应用',
  filterReset: '重置',
  triggerAsc: '切换为升序',
  triggerDesc: '切换为降序',
  cancelSort: '取消排序',
}

/** 读取 Val 的内部工具函数。 */
const getVal = (record: any, dataIndex?: string | string[]) => {
  if (!dataIndex) return undefined
  if (Array.isArray(dataIndex)) {
    let cur = record
    for (const segment of dataIndex) {
      if (cur == null) return undefined
      cur = cur[segment]
    }
    return cur
  }
  return record?.[dataIndex]
}

/** align Class 的内部工具函数。 */
const alignClass = (align?: ColumnAlign) => {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | undefined>) => {
  const cls = parts.filter(Boolean).join(' ').trim()
  return cls || undefined
}

/** merge Styles 的内部工具函数。 */
const mergeStyles = (...styles: Array<Record<string, any> | undefined>) => {
  let merged: Record<string, any> | undefined
  styles.forEach(style => {
    if (!style) return
    merged = merged ? { ...merged, ...style } : { ...style }
  })
  return merged
}

/** 归一化 Filter Values 的内部工具函数。 */
const normalizeFilterValues = (value: any): any[] => {
  if (value == null || value === false) return []
  if (Array.isArray(value)) return [...value]
  if (typeof value !== 'string' && typeof value?.[Symbol.iterator] === 'function') {
    return Array.from(value as Iterable<any>)
  }
  return [value]
}

/** 读取 Column Key 的内部工具函数。 */
const getColumnKey = (column: ColumnItem, indexPath: number[]) => {
  if (column.key) return column.key
  if (typeof column.dataIndex === 'string') return column.dataIndex
  if (Array.isArray(column.dataIndex) && column.dataIndex.length > 0)
    return column.dataIndex.join('.')
  return `column-${indexPath.join('-')}`
}

/** 读取 Visible Children 的内部工具函数。 */
const getVisibleChildren = (column: ColumnItem) =>
  (column.children ?? []).filter(child => !child.hidden)

/** count Leaf Columns 的内部工具函数。 */
const countLeafColumns = (columns: ColumnItem[]): number => {
  return columns.reduce((count, column) => {
    if (column.hidden) return count
    const children = getVisibleChildren(column)
    if (children.length === 0) return count + 1
    return count + countLeafColumns(children)
  }, 0)
}

/** 读取 Column Depth 的内部工具函数。 */
const getColumnDepth = (columns: ColumnItem[]) => {
  let maxDepth = 1
  columns.forEach(column => {
    if (column.hidden) return
    const children = getVisibleChildren(column)
    if (children.length > 0) {
      maxDepth = Math.max(maxDepth, 1 + getColumnDepth(children))
    }
  })
  return maxDepth
}

/** flatten Leaf Columns 的内部工具函数。 */
const flattenLeafColumns = (columns: ColumnItem[], path: number[] = []) => {
  const result: Array<{ column: ColumnItem; indexPath: number[]; key: string }> = []
  columns.forEach((column, index) => {
    if (column.hidden) return
    const indexPath = [...path, index]
    const children = getVisibleChildren(column)
    if (children.length > 0) {
      result.push(...flattenLeafColumns(children, indexPath))
      return
    }
    result.push({ column, indexPath, key: getColumnKey(column, indexPath) })
  })
  return result
}

/** 构建 Header Rows 的内部工具函数。 */
const buildHeaderRows = (columns: ColumnItem[]) => {
  const visibleColumns = columns.filter(column => !column.hidden)
  const depth = getColumnDepth(visibleColumns)
  const rows: HeaderCellMeta[][] = Array.from({ length: depth }, () => [])

  const walk = (items: ColumnItem[], level: number, parentPath: number[] = []) => {
    items.forEach((column, index) => {
      if (column.hidden) return
      const path = [...parentPath, index]
      const children = getVisibleChildren(column)
      const defaultColSpan = children.length > 0 ? countLeafColumns(children) : 1
      const colSpan = column.colSpan ?? defaultColSpan
      if (colSpan === 0) return
      const rowSpan = column.rowSpan ?? (children.length > 0 ? 1 : depth - level)
      rows[level].push({
        column,
        index,
        key: getColumnKey(column, path),
        colSpan,
        rowSpan,
      })
      if (children.length > 0) walk(children, level + 1, path)
    })
  }

  walk(visibleColumns, 0)
  return rows
}

/** 解析 Fixed Column 的内部工具函数。 */
const resolveFixedColumn = (column: ColumnItem) => {
  return !!(
    column.fixedCol ||
    column.fixed === true ||
    column.fixed === 'left' ||
    column.fixed === 'start'
  )
}

/** 判断 Sorter Config 的内部工具函数。 */
const isSorterConfig = (sorter: ColumnItem['sorter']): sorter is SorterConfig => {
  return typeof sorter === 'object' && sorter !== null
}

/** 读取 Sorter Multiple 的内部工具函数。 */
const getSorterMultiple = (column: ColumnItem) => {
  if (!isSorterConfig(column.sorter)) return undefined
  return column.sorter.multiple
}

/** 归一化 Sort States 的内部工具函数。 */
const normalizeSortStates = (sortStates: SortStateInput[]) => {
  const resolvedSortStates: SortStateInput[] = Array.isArray(sortStates)
    ? sortStates
    : typeof (sortStates as any)?.get === 'function'
      ? (sortStates as any).get()
      : []
  return resolvedSortStates
    .filter((state): state is SortState => !!state?.order)
    .sort((a, b) => {
      const multipleA = a.multiple ?? 0
      const multipleB = b.multiple ?? 0
      if (multipleA === multipleB) return 0
      return multipleB - multipleA
    })
}

/** 解析 Initial Sort 的内部工具函数。 */
const resolveInitialSort = (leafColumns: Array<{ column: ColumnItem; key: string }>) => {
  const controlledStates = normalizeSortStates(
    leafColumns
      .filter(leaf => leaf.column.sortOrder !== undefined)
      .map(leaf => ({
        key: leaf.key,
        order: leaf.column.sortOrder,
        multiple: getSorterMultiple(leaf.column),
      })),
  )
  if (controlledStates.length > 0) return controlledStates
  return normalizeSortStates(
    leafColumns
      .filter(leaf => !!leaf.column.defaultSortOrder)
      .map(leaf => ({
        key: leaf.key,
        order: leaf.column.defaultSortOrder,
        multiple: getSorterMultiple(leaf.column),
      })),
  )
}

/** 解析 Initial Filters 的内部工具函数。 */
const resolveInitialFilters = (leafColumns: Array<{ column: ColumnItem; key: string }>) => {
  const filters: Record<string, any[]> = {}
  leafColumns.forEach(({ column, key }) => {
    if (column.filteredValue !== undefined) {
      filters[key] = normalizeFilterValues(column.filteredValue)
      return
    }
    if (column.defaultFilteredValue !== undefined) {
      filters[key] = normalizeFilterValues(column.defaultFilteredValue)
    }
  })
  return filters
}

/** clamp Page 的内部工具函数。 */
const clampPage = (page: number, pageCount: number) => {
  if (page <= 1) return 1
  if (page >= pageCount) return pageCount
  return page
}

/** as Css Size 的内部工具函数。 */
const asCssSize = (value?: string | number) => {
  if (typeof value === 'number') return `${value}px`
  return value
}

/** 解析 Table Size Class 的内部工具函数。 */
const resolveTableSizeClass = (size?: TableSize) => {
  switch (size) {
    case 'small':
      return 'table-sm'
    case 'middle':
      return 'table-md'
    case 'large':
      return 'table-lg'
    case 'xs':
    case 'sm':
    case 'md':
    case 'lg':
    case 'xl':
      return `table-${size}`
    default:
      return undefined
  }
}

/** 解析 Locale 的内部工具函数。 */
const resolveLocale = (locale?: TableLocale) => ({
  ...defaultTableLocale,
  ...locale,
})

/** 解析 Semantic Value 的内部工具函数。 */
const resolveSemanticValue = <T extends Record<string, any>>(
  value: SemanticRecord<T> | undefined,
  props: TableProps,
): T => {
  if (typeof value === 'function') return value({ props }) ?? ({} as T)
  return (value ?? {}) as T
}

/** should Show Ellipsis Title 的内部工具函数。 */
const shouldShowEllipsisTitle = (ellipsis?: ColumnItem['ellipsis']) => {
  if (!ellipsis) return false
  if (ellipsis === true) return true
  return ellipsis.showTitle !== false
}

/** map Pagination Position 的内部工具函数。 */
const mapPaginationPosition = (position: PaginationPosition): PaginationPlacement => {
  switch (position) {
    case 'topLeft':
      return 'topStart'
    case 'topCenter':
      return 'topCenter'
    case 'topRight':
      return 'topEnd'
    case 'bottomLeft':
      return 'bottomStart'
    case 'bottomCenter':
      return 'bottomCenter'
    case 'bottomRight':
      return 'bottomEnd'
    case 'none':
    default:
      return 'none'
  }
}

/** 解析 Pagination Placements 的内部工具函数。 */
const resolvePaginationPlacements = (pagination?: false | PaginationConfig) => {
  if (pagination == null || pagination === false) return [] as PaginationPlacement[]
  const placements = pagination.placement?.length
    ? pagination.placement
    : pagination.position?.length
      ? pagination.position.map(mapPaginationPosition)
      : (['bottomEnd'] as PaginationPlacement[])
  return placements.filter((placement, index, source) => {
    if (placement === 'none') return source.length === 1
    return source.indexOf(placement) === index
  })
}

/** 读取 Pagination Placement Class 的内部工具函数。 */
const getPaginationPlacementClass = (placement: PaginationPlacement) => {
  switch (placement) {
    case 'topStart':
    case 'bottomStart':
      return 'justify-start'
    case 'topCenter':
    case 'bottomCenter':
      return 'justify-center'
    case 'topEnd':
    case 'bottomEnd':
    default:
      return 'justify-end'
  }
}

/** 读取 Tree Children 的内部工具函数。 */
const getTreeChildren = (record: any, childrenColumnName: string) => {
  const children = record?.[childrenColumnName]
  return Array.isArray(children) ? children : []
}

/** Render Table Section 的内部工具函数。 */
const isCompiledRenderFactory = (value: unknown) =>
  typeof value === 'function' &&
  ((value as { kind?: unknown }).kind === 'block-factory' || value.length === 3)

const RenderTableSection: FC<{
  render?: ((currentData: any[]) => any) | null
  data: any[]
}> = ({ render, data }) => {
  if (typeof render !== 'function') return <></>
  if (isCompiledRenderFactory(render)) {
    return <Slot source={{ children: render as any }} props={data as any} />
  }
  return <>{render(data)}</>
}

const RenderExpandedRowContent: FC<{
  render?: ((record: any, index: number, indent: number, expanded: boolean) => any) | null
  record: any
  index: number
  indent: number
  expanded: boolean
}> = ({ render, record, index, indent, expanded }) => {
  if (typeof render !== 'function') return <></>
  if (isCompiledRenderFactory(render)) {
    return <Slot source={{ children: render as any }} props={record} />
  }
  return <>{render(record, index, indent, expanded)}</>
}

const RenderTableValue: FC<{ value: any }> = ({ value }) => {
  if (isCompiledRenderFactory(value)) {
    return <Slot source={{ children: value }} />
  }
  return <>{value}</>
}

const RenderTableSummary: FC<{
  render: NonNullable<TableProps['summary']>
  data: any[]
  info: { total: number; page: number; pageSize: number }
}> = ({ render, data, info }) => {
  if (isCompiledRenderFactory(render)) {
    return <Slot source={{ children: render as any }} props={data as any} />
  }
  return <>{render(data, info)}</>
}

/** 判断 Primitive Node 的内部工具函数。 */
const isPrimitiveNode = (value: any) => {
  const type = typeof value
  return type === 'string' || type === 'number'
}

/** Table 的内部工具函数。 */
const Table: FC<TableProps> = props => {
  const {
    size,
    zebra,
    pinRows,
    pinCols,
    bordered,
    className,
    classNames,
    styles,
    children,
    dataSource,
    rowKey = 'key',
    showHeader = true,
    onRow,
    onHeaderRow,
    onChange,
    rowSelection,
    pagination,
    expandable,
    rowClassName,
    summary,
    emptyText,
    locale,
    titleFormatter: titleRender,
    footerFormatter: footerRender,
    loading,
    rowHoverable = false,
    rowHoverClass,
    tableLayout,
    sortDirections,
    showSorterTooltip,
    scroll,
    sticky,
    height,
    onScroll,
  } = props

  const localeText = resolveLocale(locale)
  const semanticClasses = resolveSemanticValue(classNames, props)
  const semanticStyles = resolveSemanticValue(styles, props)
  const loadingConfig =
    typeof loading === 'object'
      ? { spinning: loading.spinning !== false, tip: loading.tip }
      : { spinning: !!loading, tip: undefined }
  const childrenColumnName = expandable?.childrenColumnName ?? 'children'
  const indentSize = expandable?.indentSize ?? 15
  const expandedRowRender = expandable?.expandedRowFormatter ?? expandable?.expandedRowRender

  const getRecordKey = (record: any, fallback: TableKey): TableKey => {
    const rawKey = typeof rowKey === 'function' ? rowKey(record) : record?.[rowKey]
    return (rawKey ?? fallback) as TableKey
  }

  const collectExpandedKeys = (
    records: any[],
    parentPath: Array<string | number> = [],
  ): TableKey[] => {
    return records.flatMap((record, index) => {
      const path = [...parentPath, index]
      const key = getRecordKey(record, `row-${path.join('-')}`)
      const children = getTreeChildren(record, childrenColumnName)
      if (children.length === 0) return []
      return [key, ...collectExpandedKeys(children, path)]
    })
  }

  let cls = 'table'
  const sizeClass = resolveTableSizeClass(size)
  if (sizeClass) cls += ` ${sizeClass}`
  if (zebra) cls += ' table-zebra'
  if (pinRows || sticky) cls += ' table-pin-rows'
  if (pinCols) cls += ' table-pin-cols'
  if (bordered) cls += ' border-separate border-spacing-0'
  if (semanticClasses.table) cls += ` ${semanticClasses.table}`
  if (className) cls += ` ${className}`

  const hasChildren = children != null
  if (hasChildren)
    return (
      <table className={cls} style={semanticStyles.table}>
        {children}
      </table>
    )

  const initialLeafColumns = Array.isArray(props.columns)
    ? flattenLeafColumns(props.columns ?? [])
    : []
  const tableId = ref((() => `rue-table-${tableSeed++}`)())
  const sortStateRef = ref<SortState[]>(resolveInitialSort(initialLeafColumns))
  const setSortStateRef = (
    next:
      | typeof sortStateRef.value
      | ((current: typeof sortStateRef.value) => typeof sortStateRef.value),
  ) => {
    sortStateRef.value = typeof next === 'function' ? next(sortStateRef.value) : next
  }
  const filterStateRef = ref<Record<string, any[]>>(resolveInitialFilters(initialLeafColumns))
  const setFilterStateRef = (
    next:
      | typeof filterStateRef.value
      | ((current: typeof filterStateRef.value) => typeof filterStateRef.value),
  ) => {
    filterStateRef.value = typeof next === 'function' ? next(filterStateRef.value) : next
  }
  const draftFilterStateRef = ref<Record<string, any[]>>({})
  const setDraftFilterStateRef = (
    next:
      | typeof draftFilterStateRef.value
      | ((current: typeof draftFilterStateRef.value) => typeof draftFilterStateRef.value),
  ) => {
    draftFilterStateRef.value = typeof next === 'function' ? next(draftFilterStateRef.value) : next
  }
  const filterSearchRef = ref<Record<string, string>>({})
  const setFilterSearchRef = (
    next:
      | typeof filterSearchRef.value
      | ((current: typeof filterSearchRef.value) => typeof filterSearchRef.value),
  ) => {
    filterSearchRef.value = typeof next === 'function' ? next(filterSearchRef.value) : next
  }
  const openFilterMenuKey = { value: null as string | null }
  const scrollRoot = { value: null as HTMLElement | null }
  const stateVersion = ref(0)
  const setStateVersion = (
    next:
      | typeof stateVersion.value
      | ((current: typeof stateVersion.value) => typeof stateVersion.value),
  ) => {
    stateVersion.value = typeof next === 'function' ? next(stateVersion.value) : next
  }
  const selectedRowKeysRef = ref<TableKey[]>(
    rowSelection?.defaultSelectedRowKeys ? [...rowSelection.defaultSelectedRowKeys] : [],
  )
  const setSelectedRowKeysRef = (
    next:
      | typeof selectedRowKeysRef.value
      | ((current: typeof selectedRowKeysRef.value) => typeof selectedRowKeysRef.value),
  ) => {
    selectedRowKeysRef.value = typeof next === 'function' ? next(selectedRowKeysRef.value) : next
  }
  const paginationConfig = pagination != null && pagination !== false ? pagination : undefined
  const uncontrolledPageRef = ref(
    paginationConfig ? (paginationConfig.current ?? paginationConfig.defaultCurrent ?? 1) : 1,
  )
  const setUncontrolledPageRef = (
    next:
      | typeof uncontrolledPageRef.value
      | ((current: typeof uncontrolledPageRef.value) => typeof uncontrolledPageRef.value),
  ) => {
    uncontrolledPageRef.value = typeof next === 'function' ? next(uncontrolledPageRef.value) : next
  }
  const uncontrolledPageSizeRef = ref(
    paginationConfig
      ? (paginationConfig.pageSize ?? paginationConfig.defaultPageSize ?? 10)
      : Math.max(dataSource?.length ?? 0, 1),
  )
  const expandedRowKeysRef = ref<TableKey[]>(
    expandable?.defaultExpandedRowKeys
      ? [...expandable.defaultExpandedRowKeys]
      : expandable?.defaultExpandAllRows && Array.isArray(dataSource)
        ? dataSource.flatMap((record, index) => {
            const key = getRecordKey(record, `row-${index}`)
            const children = getTreeChildren(record, childrenColumnName)
            if (expandedRowRender) {
              return [key, ...collectExpandedKeys(children, [index])]
            }
            if (children.length > 0) {
              return [key, ...collectExpandedKeys(children, [index])]
            }
            return []
          })
        : [],
  )
  const setExpandedRowKeysRef = (
    next:
      | typeof expandedRowKeysRef.value
      | ((current: typeof expandedRowKeysRef.value) => typeof expandedRowKeysRef.value),
  ) => {
    expandedRowKeysRef.value = typeof next === 'function' ? next(expandedRowKeysRef.value) : next
  }

  if (Array.isArray(props.columns) && Array.isArray(dataSource)) {
    const renderBodyRow = (row: any, rowIndex: number) => {
      const renderBodyCell = (leaf: any, colIndex: number) => {
        const value = getVal(row.record, leaf.column.dataIndex)
        const rendered = leaf.column.formatter
          ? leaf.column.formatter(value, row.record, rowIndex)
          : value
        const cellProps = leaf.column.onCell ? leaf.column.onCell(row.record, rowIndex) || {} : {}
        const { className: cellPropClassName, style: cellPropStyle, ...restCellProps } = cellProps
        const colSpan = cellProps.colSpan ?? 1
        const rowSpan = cellProps.rowSpan ?? 1
        if (colSpan === 0 || rowSpan === 0) return <></>
        const inlineExpand = !expandColumnVisible && colIndex === 0
        const CellTag =
          leaf.column.rowScope || (pinCols && resolveFixedColumn(leaf.column)) ? 'th' : 'td'
        const className = mergeClassNames(
          semanticClasses.cell,
          alignClass(leaf.column.align),
          leaf.column.className,
          leaf.column.ellipsis ? 'truncate' : undefined,
          cellPropClassName,
        )
        const style = mergeStyles(
          semanticStyles.cell,
          leaf.column.width || leaf.column.minWidth
            ? {
                ...(leaf.column.width ? { width: leaf.column.width as any } : {}),
                ...(leaf.column.minWidth ? { minWidth: leaf.column.minWidth as any } : {}),
              }
            : undefined,
          inlineExpand && row.indent > 0
            ? { paddingLeft: `${row.indent * indentSize}px` }
            : undefined,
          cellPropStyle as Record<string, any> | undefined,
        )
        const cellTitle =
          leaf.column.ellipsis &&
          shouldShowEllipsisTitle(leaf.column.ellipsis) &&
          isPrimitiveNode(rendered)
            ? String(rendered)
            : undefined
        const CellContentView = () =>
          inlineExpand ? (
            <div className="flex items-center gap-2">
              <RenderExpandControl arg0={row} arg1={rowIndex} arg2={expandableState} />
              <span className={leaf.column.ellipsis ? 'truncate' : undefined}>
                {String(rendered ?? '')}
              </span>
            </div>
          ) : (
            <span>{String(rendered ?? '')}</span>
          )
        return CellTag === 'th' ? (
          <th
            key={`cell-${String(row.key)}-${leaf.key}-${colIndex}`}
            className={className}
            style={style}
            title={cellTitle}
            colSpan={colSpan}
            rowSpan={rowSpan}
            scope={leaf.column.rowScope}
            data-rue-table-indent={inlineExpand && row.indent > 0 ? String(row.indent) : undefined}
            {...restCellProps}
          >
            <CellContentView />
          </th>
        ) : (
          <td
            key={`cell-${String(row.key)}-${leaf.key}-${colIndex}`}
            className={className}
            style={style}
            title={cellTitle}
            colSpan={colSpan}
            rowSpan={rowSpan}
            scope={leaf.column.rowScope}
            data-rue-table-indent={inlineExpand && row.indent > 0 ? String(row.indent) : undefined}
            {...restCellProps}
          >
            <CellContentView />
          </td>
        )
      }

      const expandableState = getExpandableState(row, rowIndex)
      const rowProps = onRow ? onRow(row.record, rowIndex) || {} : {}
      const {
        className: rowPropClassName,
        style: rowPropStyle,
        onClick: rowClickHandler,
        ...restRowProps
      } = rowProps
      const baseRowClassName =
        typeof rowClassName === 'function' ? rowClassName(row.record, rowIndex) : ''
      const hoverClassName = rowHoverable ? rowHoverClass || 'hover:bg-base-200' : ''
      const mergedRowClick = (event: any) => {
        if (rowClickHandler) rowClickHandler(event)
        if (!expandable?.expandRowByClick || !expandableState.enabled) return
        const target = event?.target as HTMLElement | null
        if (target?.closest('button, input, a, label')) return
        toggleExpandedRow(row, rowIndex)
      }
      const showExpandedRow =
        hasExpandedRowRender && expandableState.hasExpandedRowRender && expandableState.expanded
      const expandedRowClassName = showExpandedRow
        ? typeof expandable?.expandedRowClassName === 'function'
          ? expandable.expandedRowClassName(row.record, rowIndex, row.indent)
          : expandable?.expandedRowClassName
        : undefined

      return (
        <>
          <tr
            key={`row-${String(row.key)}`}
            data-rue-table-row-key={String(row.key)}
            {...restRowProps}
            onClick={mergedRowClick}
            className={mergeClassNames(
              semanticClasses.bodyRow,
              rowPropClassName,
              baseRowClassName,
              hoverClassName,
            )}
            style={mergeStyles(
              semanticStyles.bodyRow,
              rowPropStyle as Record<string, any> | undefined,
            )}
          >
            {expandColumnVisible ? (
              <td
                className={mergeClassNames(semanticClasses.cell, alignClass('center'))}
                style={mergeStyles(
                  semanticStyles.cell,
                  expandable?.columnWidth ? { width: expandable.columnWidth as any } : undefined,
                  row.indent > 0 ? { paddingLeft: `${row.indent * indentSize}px` } : undefined,
                )}
              >
                <RenderExpandControl arg0={row} arg1={rowIndex} arg2={expandableState} />
              </td>
            ) : null}
            {hasSelection ? <RenderSelectionCell arg0={row} arg1={rowIndex} /> : null}
            {leafColumns.get().map((leaf, colIndex) => renderBodyCell(leaf, colIndex))}
          </tr>
          {showExpandedRow ? (
            <tr className={expandedRowClassName}>
              <td colSpan={bodyColSpan}>
                <RenderExpandedRowContent
                  render={expandedRowRender}
                  record={row.record}
                  index={rowIndex}
                  indent={row.indent}
                  expanded
                />
              </td>
            </tr>
          ) : null}
        </>
      )
    }

    const renderHeaderRow = (row: any[], rowIndex: number) => {
      const headerRowProps = onHeaderRow
        ? onHeaderRow(
            row.map((meta: any) => meta.column),
            rowIndex,
          ) || {}
        : {}
      const {
        className: headerRowClassName,
        style: headerRowStyle,
        ...restHeaderRowProps
      } = headerRowProps
      return (
        <tr
          key={`header-row-${rowIndex}`}
          className={mergeClassNames(semanticClasses.headerRow, headerRowClassName)}
          style={mergeStyles(
            semanticStyles.headerRow,
            headerRowStyle as Record<string, any> | undefined,
          )}
          {...restHeaderRowProps}
        >
          {rowIndex === 0 && expandColumnVisible ? (
            <th
              rowSpan={headerRows.get().length}
              className={mergeClassNames(semanticClasses.headerCell, alignClass('center'))}
              style={mergeStyles(
                semanticStyles.headerCell,
                expandable?.columnWidth ? { width: expandable.columnWidth as any } : undefined,
              )}
            >
              {String(expandable?.columnTitle ?? '')}
            </th>
          ) : null}
          {rowIndex === 0 && hasSelection ? (
            <th
              rowSpan={headerRows.get().length}
              className={mergeClassNames(semanticClasses.headerCell, alignClass(selectionAlign))}
              style={mergeStyles(
                semanticStyles.headerCell,
                rowSelection?.columnWidth ? { width: rowSelection.columnWidth as any } : undefined,
              )}
            >
              <div
                className={mergeClassNames(
                  'inline-flex items-center gap-2',
                  rowSelection?.titleClassName,
                )}
              >
                <SelectionHeaderView />
                {rowSelection?.columnTitle ? <span>{String(rowSelection.columnTitle)}</span> : null}
              </div>
            </th>
          ) : null}
          {row.map((meta: any) => (
            <RenderHeaderCell key={meta.key} meta={meta} level={rowIndex} />
          ))}
        </tr>
      )
    }

    const headerRows = computed(() => buildHeaderRows(props.columns ?? []))
    const leafColumns = computed(() => flattenLeafColumns(props.columns ?? []))
    const leafColumnMap = computed(
      () => new Map(leafColumns.get().map(leaf => [leaf.key, leaf] as const)),
    )

    const bumpStateVersion = () => {
      setStateVersion(version => version + 1)
    }

    const activeSortStates = computed(() => {
      const columns = leafColumns.get()
      const hasControlledSort = columns.some(leaf => leaf.column.sortOrder !== undefined)
      return hasControlledSort
        ? resolveInitialSort(columns)
        : normalizeSortStates([...sortStateRef.value])
    })
    const activeSortStateMap = computed(
      () => /*#__PURE__*/ new Map(activeSortStates.get().map(state => [state.key, state] as const)),
    )

    const currentFilters = computed(() =>
      leafColumns.get().reduce<Record<string, any[]>>((acc, leaf) => {
        const controlledValue = leaf.column.filteredValue
        if (controlledValue !== undefined) {
          acc[leaf.key] = normalizeFilterValues(controlledValue)
          return acc
        }
        acc[leaf.key] = normalizeFilterValues(filterStateRef.value[leaf.key])
        return acc
      }, {}),
    )

    const buildActiveFilters = (filters: Record<string, any[]>) => {
      const next: Record<string, any[]> = {}
      Object.keys(filters).forEach(key => {
        if (Array.isArray(filters[key]) && filters[key].length > 0) next[key] = [...filters[key]]
      })
      return next
    }

    const activeFilters = computed(() => buildActiveFilters(currentFilters.get()))

    const buildSortComparator = (column: ColumnItem) => {
      if (typeof column.sorter === 'function') return column.sorter
      if (isSorterConfig(column.sorter) && typeof column.sorter.compare === 'function') {
        return column.sorter.compare
      }
      return (a: any, b: any) => {
        const va = getVal(a, column.dataIndex)
        const vb = getVal(b, column.dataIndex)
        if (va == null && vb == null) return 0
        if (va == null) return -1
        if (vb == null) return 1
        if (va > vb) return 1
        if (va < vb) return -1
        return 0
      }
    }

    const compareRecords = (a: any, b: any, sortStates: SortState[]) => {
      for (const sortState of normalizeSortStates(sortStates)) {
        const activeLeaf = leafColumnMap.get().get(sortState.key)
        if (!activeLeaf?.column.sorter) continue
        const comparator = buildSortComparator(activeLeaf.column)
        const result = sortState.order === 'ascend' ? comparator(a, b) : -comparator(a, b)
        if (result !== 0) return result
      }
      return 0
    }

    const recordMatchesFilters = (record: any, filters: Record<string, any[]>) => {
      return leafColumns.get().every(leaf => {
        const values = filters[leaf.key] ?? []
        if (!Array.isArray(values) || values.length === 0) return true
        const combine = leaf.column.filterCombine ?? 'or'
        if (leaf.column.onFilter) {
          if (combine === 'and') return values.every(value => leaf.column.onFilter!(value, record))
          return values.some(value => leaf.column.onFilter!(value, record))
        }
        const cellValue = getVal(record, leaf.column.dataIndex)
        if (combine === 'and') return values.every(value => value === cellValue)
        return values.includes(cellValue)
      })
    }

    const buildProcessedData = (filters: Record<string, any[]>, sortStates: SortState[]) => {
      const processRecords = (records: any[]): any[] => {
        let workingData = records.flatMap(record => {
          const rawChildren = getTreeChildren(record, childrenColumnName)
          const processedChildren = rawChildren.length > 0 ? processRecords(rawChildren) : []
          const keepSelf = recordMatchesFilters(record, filters)
          if (!keepSelf && processedChildren.length === 0) return []
          if (rawChildren.length > 0) {
            return [
              {
                ...record,
                [childrenColumnName]: processedChildren,
              },
            ]
          }
          return [record]
        })
        if (normalizeSortStates(sortStates).length > 0) {
          workingData = workingData.slice().sort((a, b) => compareRecords(a, b, sortStates))
        }
        return workingData
      }
      return processRecords(dataSource)
    }

    const expandedRowKeys = computed(() =>
      expandable?.expandedRowKeys ? [...expandable.expandedRowKeys] : [...expandedRowKeysRef.value],
    )
    const expandedRowKeySet = computed(() => /*#__PURE__*/ new Set(expandedRowKeys.get()))

    const flattenRows = (
      records: any[],
      indent = 0,
      parentPath: Array<string | number> = [],
      forceExpand = false,
    ): FlattenRow[] => {
      return records.flatMap((record, index) => {
        const path = [...parentPath, index]
        const key = getRecordKey(record, `row-${path.join('-')}`)
        const children = getTreeChildren(record, childrenColumnName)
        const row = {
          key,
          renderKey: `${typeof key}:${String(key)}@${path.join('-')}`,
          record,
          indent,
          hasTreeChildren: children.length > 0,
        }
        if (children.length > 0 && (forceExpand || expandedRowKeySet.get().has(key))) {
          return [row, ...flattenRows(children, indent + 1, path, forceExpand)]
        }
        return [row]
      })
    }

    const allRows = flattenRows(dataSource, 0, [], true)
    const hasTreeData = allRows.some(row => row.hasTreeChildren)
    const processedData = computed(() =>
      buildProcessedData(currentFilters.get(), activeSortStates.get()),
    )
    const visibleRows = computed(() => flattenRows(processedData.get()))
    const paginationEnabled = paginationConfig != null
    const pageState = computed(() => {
      const rows = visibleRows.get()
      const total = rows.length
      const pageSize = paginationEnabled
        ? Math.max(1, paginationConfig.pageSize ?? uncontrolledPageSizeRef.value)
        : Math.max(total, 1)
      const pageCount = paginationEnabled ? Math.max(1, Math.ceil(total / pageSize)) : 1
      const currentPage = paginationEnabled
        ? clampPage(paginationConfig.current ?? uncontrolledPageRef.value, pageCount)
        : 1
      const pageRows = paginationEnabled
        ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
        : rows
      return { total, pageSize, pageCount, currentPage, pageRows }
    })

    const selectedRowKeys = computed(() =>
      rowSelection?.selectedRowKeys
        ? [...rowSelection.selectedRowKeys]
        : [...selectedRowKeysRef.value],
    )
    const selectedRowKeySet = computed(() => /*#__PURE__*/ new Set(selectedRowKeys.get()))

    const selectionAlign = rowSelection?.align ?? 'center'
    const hasSelection = !!rowSelection
    const hasExpandedRowRender = !!expandedRowRender
    const hasExpand = hasExpandedRowRender || hasTreeData
    const expandColumnVisible = hasExpand && expandable?.showExpandColumn !== false
    const extraColumnCount = (hasSelection ? 1 : 0) + (expandColumnVisible ? 1 : 0)
    const bodyColSpan = leafColumns.get().length + extraColumnCount

    const wrapperStyle = mergeStyles(
      semanticStyles.wrapper,
      typeof scroll?.y !== 'undefined' ? { maxHeight: asCssSize(scroll.y) } : undefined,
      typeof height !== 'undefined' ? { height: asCssSize(height) } : undefined,
      sticky && typeof sticky === 'object' && sticky.offsetScroll !== undefined
        ? { top: asCssSize(sticky.offsetScroll) }
        : undefined,
    )
    const wrapperCls = mergeClassNames(
      scroll?.x ? 'overflow-x-auto' : undefined,
      scroll?.y || typeof height !== 'undefined' ? 'overflow-y-auto' : undefined,
      semanticClasses.wrapper,
    )

    const tableStyle = mergeStyles(semanticStyles.table) ?? {}
    const needFixedLayout = leafColumns.get().some(({ column }) => !!column.ellipsis)
    if (tableLayout) tableStyle.tableLayout = tableLayout
    else if (needFixedLayout || scroll?.x) tableStyle.tableLayout = 'fixed'
    if (scroll?.x === true) {
      tableStyle.width = 'max-content'
      tableStyle.minWidth = '100%'
    } else if (typeof scroll?.x !== 'undefined') {
      tableStyle.width = asCssSize(scroll.x as string | number)
      tableStyle.minWidth = '100%'
    }

    const ensureOutsideCloseRegistered = () => {
      const globalValue: any = globalThis
      const registryKey = `__rue_table_outside_close_${tableId.value}`
      if (globalValue[registryKey]) return
      const handler = (event: any) => {
        const target = event?.target as HTMLElement | null
        if (!target) return
        if (target.closest(`[data-rue-table-root="${tableId.value}"]`)) return
        openFilterMenuKey.value = null
        bumpStateVersion()
      }
      if (globalValue?.addEventListener) globalValue.addEventListener('pointerdown', handler)
      globalValue[registryKey] = handler
    }
    ensureOutsideCloseRegistered()

    const scrollToTopIfNeeded = () => {
      if (!scroll?.scrollToFirstRowOnChange) return
      const root = scrollRoot.value
      if (root) root.scrollTop = 0
    }

    const sortColumnsContext = computed(
      () =>
        normalizeSortStates(activeSortStates.get())
          .map(sortState => {
            const leaf = leafColumnMap.get().get(sortState.key)
            if (!leaf) return null
            return {
              column: leaf.column,
              columnKey: sortState.key,
              order: sortState.order,
            }
          })
          .filter(Boolean) as Array<{
          column: ColumnItem
          columnKey: string
          order: SortOrder
        }>,
    )

    const getColumnTitleNode = (column: ColumnItem, key: string) => {
      const titleValue = column.title
      if (typeof titleValue === 'function') {
        return titleValue({
          sortOrder: activeSortStateMap.get().get(key)?.order ?? null,
          filteredValue: currentFilters.get()[key] ?? [],
          sortColumns: sortColumnsContext.get(),
          filters: activeFilters.get(),
        })
      }
      return titleValue
    }

    const buildSorterResult = (sortStates: SortState[]) => {
      const normalizedSortStates = normalizeSortStates(sortStates)
      const sorters = normalizedSortStates
        .map(sortState => {
          const leaf = leafColumnMap.get().get(sortState.key)
          if (!leaf) return null
          return {
            column: leaf.column,
            order: sortState.order,
            columnKey: sortState.key,
            field: leaf.column.dataIndex,
            multiple: sortState.multiple,
          }
        })
        .filter(Boolean)
      if (sorters.length === 0) return { column: null, order: null }
      return sorters.length === 1 ? sorters[0] : sorters
    }

    const emitTableChange = (
      action: 'paginate' | 'sort' | 'filter',
      nextPage: number,
      nextPageSize: number,
      nextFilters: Record<string, any[]>,
      nextSortStates: SortState[],
    ) => {
      if (!onChange) return
      const nextProcessedData = buildProcessedData(nextFilters, nextSortStates)
      const nextVisibleRows = flattenRows(nextProcessedData)
      const nextPageCount = paginationEnabled
        ? Math.max(1, Math.ceil(nextVisibleRows.length / nextPageSize))
        : 1
      const safePage = paginationEnabled ? clampPage(nextPage, nextPageCount) : 1
      const currentDataSource = paginationEnabled
        ? nextVisibleRows
            .slice((safePage - 1) * nextPageSize, safePage * nextPageSize)
            .map(row => row.record)
        : nextVisibleRows.map(row => row.record)
      onChange(
        paginationEnabled ? { current: safePage, pageSize: nextPageSize } : false,
        buildActiveFilters(nextFilters),
        buildSorterResult(nextSortStates),
        { action, currentDataSource },
      )
    }

    const updateSortState = (columnKey: string, order: SortOrder) => {
      const column = leafColumnMap.get().get(columnKey)?.column
      if (!column?.sorter) return
      const multiple = getSorterMultiple(column)
      const nextSortStates = (() => {
        if (multiple != null) {
          const next = activeSortStates
            .get()
            .filter(state => {
              const stateColumn = leafColumnMap.get().get(state.key)?.column
              return (
                getSorterMultiple(stateColumn ?? ({} as ColumnItem)) != null &&
                state.key !== columnKey
              )
            })
            .map(state => ({ ...state }))
          if (order) next.push({ key: columnKey, order, multiple })
          return normalizeSortStates(next)
        }
        if (!order) return []
        return [{ key: columnKey, order, multiple }]
      })()
      setSortStateRef(nextSortStates)
      bumpStateVersion()
      if (paginationEnabled && paginationConfig.current === undefined) setUncontrolledPageRef(1)
      scrollToTopIfNeeded()
      emitTableChange(
        'sort',
        paginationEnabled ? 1 : pageState.get().currentPage,
        pageState.get().pageSize,
        currentFilters.get(),
        nextSortStates,
      )
      setTimeout(() => {
        setTimeout(() => {
          const body = document
            .querySelector(`button[aria-label="sort-${columnKey}"]`)
            ?.closest('table')
            ?.querySelector('tbody')
          if (!body) return
          const rows = /*#__PURE__*/ new Map(
            Array.from(body.querySelectorAll<HTMLElement>('tr[data-rue-table-row-key]')).map(
              row => [row.dataset.rueTableRowKey, row],
            ),
          )
          flattenRows(buildProcessedData(currentFilters.get(), nextSortStates)).forEach(row => {
            const element = rows.get(String(row.key))
            if (element) body.appendChild(element)
          })
        }, 0)
      }, 0)
    }

    const updateFilterState = (columnKey: string, values: any[], closeMenu: boolean) => {
      const nextValues = normalizeFilterValues(values)
      const nextFilters = { ...currentFilters.get(), [columnKey]: nextValues }
      const column = leafColumns.get().find(leaf => leaf.key === columnKey)?.column
      if (column?.filteredValue === undefined) setFilterStateRef(nextFilters)
      setDraftFilterStateRef(current => ({ ...current, [columnKey]: nextValues }))
      bumpStateVersion()
      if (paginationEnabled && paginationConfig.current === undefined) setUncontrolledPageRef(1)
      if (closeMenu) openFilterMenuKey.value = null
      scrollToTopIfNeeded()
      emitTableChange(
        'filter',
        paginationEnabled ? 1 : pageState.get().currentPage,
        pageState.get().pageSize,
        nextFilters,
        activeSortStates.get(),
      )
    }

    const updatePage = (nextPage: number) => {
      const safePage = clampPage(nextPage, pageState.get().pageCount)
      if (paginationEnabled && paginationConfig.current === undefined)
        setUncontrolledPageRef(safePage)
      bumpStateVersion()
      if (paginationEnabled && paginationConfig.onChange) {
        paginationConfig.onChange(safePage, pageState.get().pageSize)
      }
      scrollToTopIfNeeded()
      emitTableChange(
        'paginate',
        safePage,
        pageState.get().pageSize,
        currentFilters.get(),
        activeSortStates.get(),
      )
    }

    const getSelectableRows = (rows: FlattenRow[]) => {
      return rows.filter(row => {
        if (rowSelection?.disabled) return false
        const checkboxProps = rowSelection?.getCheckboxProps
          ? rowSelection.getCheckboxProps(row.record)
          : {}
        return !checkboxProps?.disabled
      })
    }

    const selectablePageRows = computed(() => getSelectableRows(pageState.get().pageRows))
    const selectablePageKeys = computed(() => selectablePageRows.get().map(row => row.key))
    const allSelectedOnPage = computed(
      () =>
        selectablePageKeys.get().length > 0 &&
        selectablePageKeys.get().every(key => selectedRowKeySet.get().has(key)),
    )
    const someSelectedOnPage = computed(
      () =>
        selectablePageKeys.get().some(key => selectedRowKeySet.get().has(key)) &&
        !allSelectedOnPage.get(),
    )

    const updateSelectedKeys = (
      nextKeys: TableKey[],
      info: { type: 'checkbox' | 'radio' },
      record?: any,
      selected?: boolean,
      nativeEvent?: Event,
    ) => {
      if (rowSelection?.selectedRowKeys === undefined) setSelectedRowKeysRef([...nextKeys])
      const selectedRows = allRows.filter(row => nextKeys.includes(row.key)).map(row => row.record)
      if (record !== undefined && rowSelection?.onSelect && typeof selected === 'boolean') {
        rowSelection.onSelect(record, selected, selectedRows, nativeEvent)
      }
      if (rowSelection?.onChange) rowSelection.onChange([...nextKeys], selectedRows, info)
    }

    const selectAll = (checked: boolean) => {
      if (!rowSelection || rowSelection.type === 'radio') return
      const pageKeySet = /*#__PURE__*/ new Set(selectablePageKeys.get())
      const existingKeys = (rowSelection.selectedRowKeys ?? selectedRowKeysRef.value) as TableKey[]
      const nextKeySet = /*#__PURE__*/ new Set(existingKeys)
      pageKeySet.forEach(key => {
        if (checked) nextKeySet.add(key)
        else nextKeySet.delete(key)
      })
      const nextKeys = Array.from(nextKeySet)
      updateSelectedKeys(nextKeys, { type: 'checkbox' })
      if (rowSelection.onSelectAll) {
        const nextRows = allRows.filter(row => nextKeys.includes(row.key)).map(row => row.record)
        rowSelection.onSelectAll(checked, nextRows)
      }
    }

    const getExpandableState = (row: FlattenRow, rowIndex: number) => {
      const canExpandExtra =
        !!expandedRowRender &&
        (expandable?.rowExpandable ? expandable.rowExpandable(row.record) : true)
      const enabled = row.hasTreeChildren || canExpandExtra
      return {
        key: row.key,
        enabled,
        expanded: expandedRowKeySet.get().has(row.key),
        hasExpandedRowRender: canExpandExtra,
        indent: row.indent,
        rowIndex,
      }
    }

    const toggleExpandedRow = (row: FlattenRow, rowIndex: number) => {
      const state = getExpandableState(row, rowIndex)
      if (!state.enabled) return
      const nextKeySet = /*#__PURE__*/ new Set(expandedRowKeys.get())
      if (state.expanded) nextKeySet.delete(state.key)
      else nextKeySet.add(state.key)
      const nextKeys = Array.from(nextKeySet)
      if (expandable?.expandedRowKeys === undefined) setExpandedRowKeysRef(nextKeys)
      bumpStateVersion()
      if (expandable?.onExpand) expandable.onExpand(!state.expanded, row.record)
      if (expandable?.onExpandedRowsChange) expandable.onExpandedRowsChange(nextKeys)
    }

    const getSortCycle = (column: ColumnItem) => {
      const directions = column.sortDirections ?? sortDirections ?? ['ascend', 'descend']
      return [...directions, null] as SortOrder[]
    }

    const getNextSortOrder = (columnKey: string, column: ColumnItem) => {
      const cycle = getSortCycle(column)
      const currentOrder =
        new Map(normalizeSortStates([...sortStateRef.value]).map(state => [state.key, state])).get(
          columnKey,
        )?.order ?? null
      const currentIndex = cycle.findIndex(order => order === currentOrder)
      return cycle[(currentIndex + 1 + cycle.length) % cycle.length]
    }

    const resolveFilterDropdownOpen = (column: ColumnItem, columnKey: string) => {
      const controlledOpen = column.filterDropdownProps?.open ?? column.filterDropdownOpen
      if (controlledOpen !== undefined) return !!controlledOpen
      return openFilterMenuKey.value === columnKey
    }

    const getDraftFilterValues = (columnKey: string, column?: ColumnItem) => {
      const visible = column
        ? resolveFilterDropdownOpen(column, columnKey)
        : openFilterMenuKey.value === columnKey
      if (visible || draftFilterStateRef.value[columnKey] !== undefined) {
        return normalizeFilterValues(
          draftFilterStateRef.value[columnKey] ?? currentFilters.get()[columnKey],
        )
      }
      return normalizeFilterValues(currentFilters.get()[columnKey])
    }

    const setDraftFilterValues = (columnKey: string, values: any[]) => {
      setDraftFilterStateRef(current => ({
        ...current,
        [columnKey]: normalizeFilterValues(values),
      }))
      bumpStateVersion()
    }

    const syncFilterDropdownVisible = (leafKey: string, column: ColumnItem, visible: boolean) => {
      const wasVisible = resolveFilterDropdownOpen(column, leafKey)
      if (
        column.filterDropdownProps?.open === undefined &&
        column.filterDropdownOpen === undefined
      ) {
        if (visible) openFilterMenuKey.value = leafKey
        else if (openFilterMenuKey.value === leafKey) openFilterMenuKey.value = null
      }
      if (!visible && wasVisible !== visible) bumpStateVersion()
      column.filterDropdownProps?.onOpenChange?.(visible)
      column.onFilterDropdownOpenChange?.(visible)
    }

    const closeFilterDropdown = (leafKey: string, column: ColumnItem) => {
      syncFilterDropdownVisible(leafKey, column, false)
    }

    const confirmFilterValues = (
      leafKey: string,
      column: ColumnItem,
      options?: FilterConfirmOptions,
    ) => {
      updateFilterState(
        leafKey,
        getDraftFilterValues(leafKey, column),
        options?.closeDropdown ?? true,
      )
    }

    const clearFilterValues = (
      leafKey: string,
      column: ColumnItem,
      options?: FilterClearOptions,
    ) => {
      const defaults = column.filterResetToDefaultFilteredValue
        ? normalizeFilterValues(column.defaultFilteredValue)
        : []
      setDraftFilterValues(leafKey, defaults)
      if (options?.confirm) {
        updateFilterState(leafKey, defaults, options.closeDropdown ?? true)
        return
      }
      if (options?.closeDropdown) closeFilterDropdown(leafKey, column)
    }

    const renderFilterIcon = (column: ColumnItem, filtered: boolean) => {
      if (typeof column.filterIcon === 'function') return column.filterIcon(filtered)
      if (column.filterIcon !== undefined) return column.filterIcon
      return '☰'
    }

    const RenderSortIcon = ({
      arg0: column,
      arg1: sortOrder,
    }: {
      arg0: ColumnItem
      arg1: SortOrder
    }) => {
      if (typeof column.sortIcon === 'function')
        return <span>{String(column.sortIcon({ sortOrder }))}</span>
      return (
        <span
          className={mergeClassNames(
            'inline-flex flex-col leading-none',
            sortOrder ? 'text-base-content' : 'opacity-60',
          )}
        >
          <span
            className={mergeClassNames(sortOrder === 'ascend' ? 'text-base-content' : 'opacity-40')}
          >
            ▲
          </span>
          <span
            className={mergeClassNames(
              '-mt-0.5',
              sortOrder === 'descend' ? 'text-base-content' : 'opacity-40',
            )}
          >
            ▼
          </span>
        </span>
      )
    }

    const filterItemsBySearch = (
      items: FilterItem[],
      query: string,
      column: ColumnItem,
    ): FilterItem[] => {
      if (!query) return items
      return items
        .map(item => {
          const selfMatched =
            typeof column.filterSearch === 'function'
              ? column.filterSearch(query, item)
              : String(item.text).toLowerCase().includes(query.toLowerCase())
          const matchedChildren: FilterItem[] | undefined = Array.isArray(item.children)
            ? filterItemsBySearch(item.children, query, column)
            : undefined
          if (selfMatched || (matchedChildren && matchedChildren.length > 0)) {
            return matchedChildren && matchedChildren.length > 0
              ? { ...item, children: matchedChildren }
              : item
          }
          return null
        })
        .filter(Boolean) as FilterItem[]
    }

    const readFilterItems = (
      items: FilterItem[],
      column: ColumnItem,
      leafKey: string,
      draftValues: any[],
      depth = 0,
    ): any[] => {
      return items.flatMap(item => [
        {
          key: `${String(item.value)}-${depth}`,
          text: String(item.text),
          depth,
          type: column.filterMultiple === false ? 'radio' : 'checkbox',
          name: `rue-table-filter-${tableId.value}-${leafKey}`,
          checked: draftValues.includes(item.value),
          onChange: (event: Event) => {
            const checked = (event.target as HTMLInputElement).checked
            const latestValues = getDraftFilterValues(leafKey, column)
            const selected = new Set(latestValues)
            if (checked) selected.add(item.value)
            else selected.delete(item.value)
            const nextValues =
              column.filterMultiple === false ? (checked ? [item.value] : []) : [...selected]
            setDraftFilterValues(leafKey, nextValues)
            if (column.filterOnClose === false) updateFilterState(leafKey, nextValues, false)
          },
        },
        ...readFilterItems(item.children ?? [], column, leafKey, draftValues, depth + 1),
      ])
    }

    const RenderFilterDropdownContent = ({
      arg0: leafKey,
      arg1: column,
      arg2: visible,
      arg3: draftValues,
      arg4: menuItems,
    }: {
      arg0: string
      arg1: ColumnItem
      arg2: boolean
      arg3: any[] | undefined
      arg4: FilterItem[] | undefined
    }) => {
      const safeDraftValues = Array.isArray(draftValues) ? draftValues : []
      const safeMenuItems = Array.isArray(menuItems) ? menuItems : []
      const presetRows = (column.filterPresets ?? []).map(preset => ({
        ...preset,
        onClick: () => setDraftFilterValues(leafKey, preset.values),
      }))
      return (
        <div className="w-56 rounded-box border border-base-content/10 bg-base-100 p-3 shadow-xl">
          {presetRows.map((preset, index) => (
            <button key={index} type="button" className={preset.className} onClick={preset.onClick}>
              {String(preset.label)}
            </button>
          ))}
          {column.filterSearch ? (
            <input
              type="text"
              className="input input-bordered input-xs mb-2 w-full"
              placeholder="搜索筛选项"
              value={filterSearchRef.value[leafKey] ?? ''}
              onInput={(event: any) => {
                setFilterSearchRef(current => ({
                  ...current,
                  [leafKey]: (event.target as HTMLInputElement).value,
                }))
                bumpStateVersion()
              }}
            />
          ) : null}
          <div className="max-h-56 space-y-2 overflow-auto">
            {readFilterItems(safeMenuItems, column, leafKey, safeDraftValues).map(item => (
              <label
                key={item.key}
                className="flex items-center gap-2 text-sm"
                style={{ paddingLeft: `${item.depth * 12}px` }}
              >
                <input
                  type={item.type}
                  name={item.name}
                  className={item.type === 'radio' ? 'radio radio-xs' : 'checkbox checkbox-xs'}
                  checked={item.checked}
                  onChange={item.onChange}
                />
                <span>{String(item.text)}</span>
              </label>
            ))}
            {safeMenuItems.length === 0 ? (
              <div className="text-sm opacity-60">暂无匹配项</div>
            ) : null}
          </div>
          {column.filterOnClose === false ? null : (
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => clearFilterValues(leafKey, column, { confirm: true })}
              >
                {String(localeText.filterReset)}
              </button>
              <button
                className={mergeClassNames('btn btn-primary btn-xs', column.filterConfirmClassName)}
                onClick={() => confirmFilterValues(leafKey, column)}
              >
                {String(localeText.filterConfirm)}
              </button>
            </div>
          )}
        </div>
      )
    }

    const resolveSorterTooltipTitle = (column: ColumnItem, leafKey: string) => {
      const tooltipConfig = column.showSorterTooltip ?? showSorterTooltip
      if (tooltipConfig === false) return undefined
      if (typeof tooltipConfig === 'object' && tooltipConfig?.title !== undefined) {
        return tooltipConfig.title
      }
      const nextOrder = getNextSortOrder(leafKey, column)
      if (nextOrder === 'ascend') return localeText.triggerAsc
      if (nextOrder === 'descend') return localeText.triggerDesc
      return localeText.cancelSort
    }

    const RenderHeaderCellContent = ({
      arg0: leafKey,
      arg1: column,
    }: {
      arg0: string
      arg1: ColumnItem
    }) => {
      const titleNode = getColumnTitleNode(column, leafKey)
      const filtered = column.filtered ?? (currentFilters.get()[leafKey] ?? []).length > 0
      const sortOrder = activeSortStateMap.get().get(leafKey)?.order ?? null
      const draftValues = getDraftFilterValues(leafKey, column)
      const filterSearchValue = filterSearchRef.value[leafKey] ?? ''
      const visible = resolveFilterDropdownOpen(column, leafKey)
      const menuItems = filterItemsBySearch(column.filters ?? [], filterSearchValue, column)
      const sorterTooltipTitle = resolveSorterTooltipTitle(column, leafKey)
      const {
        open: _dropdownOpen,
        onOpenChange: _dropdownOnOpenChange,
        children: _dropdownChildren,
        content: _dropdownContent,
        overlay: _dropdownOverlay,
        items: _dropdownItems,
        menu: _dropdownMenu,
        popupRender: _dropdownPopupRender,
        ...dropdownProps
      } = column.filterDropdownProps ?? {}

      return (
        <div className="relative flex items-center gap-2">
          <span>{String(titleNode ?? '')}</span>
          {column.sorter ? (
            <button
              type="button"
              aria-label={`sort-${leafKey}`}
              title={sorterTooltipTitle}
              className="btn btn-ghost btn-xs h-auto min-h-0 px-1 py-0.5"
              onClick={(event: any) => {
                event.stopPropagation()
                updateSortState(leafKey, getNextSortOrder(leafKey, column))
              }}
            >
              <RenderSortIcon arg0={column} arg1={sortOrder} />
            </button>
          ) : null}
          {(Array.isArray(column.filters) && column.filters.length > 0) ||
          column.filterPresets !== undefined ? (
            <Dropdown
              trigger="click"
              open={visible}
              closeOnClick={false}
              align="start"
              {...dropdownProps}
              onOpenChange={(nextOpen: boolean) =>
                syncFilterDropdownVisible(leafKey, column, nextOpen)
              }
            >
              <Dropdown.Trigger
                as="button"
                type="button"
                aria-label={`filter-${leafKey}`}
                className={mergeClassNames(
                  'btn btn-ghost btn-xs h-auto min-h-0 px-1 py-0.5 select-none',
                  filtered ? 'text-base-content' : 'opacity-40',
                )}
              >
                <span>{String(renderFilterIcon(column, filtered))}</span>
              </Dropdown.Trigger>
              <Dropdown.Content
                className="dropdown-content z-50 mt-2 p-0"
                onClick={(event: any) => event.stopPropagation()}
              >
                <RenderFilterDropdownContent
                  arg0={leafKey}
                  arg1={column}
                  arg2={visible}
                  arg3={draftValues}
                  arg4={menuItems}
                />
              </Dropdown.Content>
            </Dropdown>
          ) : null}
        </div>
      )
    }

    const RenderHeaderCell = ({ meta, level }: { meta: HeaderCellMeta; level: number }) => {
      const cellProps = meta.column.onHeaderCell
        ? meta.column.onHeaderCell(meta.column, meta.index) || {}
        : {}
      const children = getVisibleChildren(meta.column)
      const isLeaf = children.length === 0
      const leaf = isLeaf ? (leafColumnMap.get().get(meta.key) ?? null) : null
      const key = leaf?.key ?? meta.key
      const colSpan = cellProps.colSpan ?? meta.colSpan
      const rowSpan = cellProps.rowSpan ?? meta.rowSpan
      if (colSpan === 0 || rowSpan === 0) return <></>
      const { className: cellPropClassName, style: cellPropStyle, ...restCellProps } = cellProps
      const className = mergeClassNames(
        semanticClasses.headerCell,
        alignClass(meta.column.align),
        meta.column.className,
        cellPropClassName,
      )
      const style = mergeStyles(
        semanticStyles.headerCell,
        meta.column.width || meta.column.minWidth
          ? {
              ...(meta.column.width ? { width: meta.column.width as any } : {}),
              ...(meta.column.minWidth ? { minWidth: meta.column.minWidth as any } : {}),
            }
          : undefined,
        cellPropStyle as Record<string, any> | undefined,
      )
      return (
        <th
          key={`${level}-${meta.key}`}
          colSpan={colSpan}
          rowSpan={rowSpan}
          className={className}
          style={style}
          {...restCellProps}
        >
          {leaf ? (
            <RenderHeaderCellContent arg0={key} arg1={meta.column} />
          ) : (
            <span>{String(getColumnTitleNode(meta.column, meta.key) ?? '')}</span>
          )}
        </th>
      )
    }

    const RenderSelectionCell = ({
      arg0: row,
      arg1: rowIndex,
    }: {
      arg0: FlattenRow
      arg1: number
    }) => {
      if (!rowSelection) return <></>
      const checkboxProps = rowSelection.getCheckboxProps
        ? { ...rowSelection.getCheckboxProps(row.record) }
        : {}
      if (rowSelection.disabled) checkboxProps.disabled = true
      const checked = selectedRowKeySet.get().has(row.key)
      const inputClassName = rowSelection.type === 'radio' ? 'radio' : 'checkbox'
      const onChangeHandler = (event: any) => {
        const input = event.target as HTMLInputElement
        if (rowSelection.type === 'radio') {
          updateSelectedKeys([row.key], { type: 'radio' }, row.record, true, event)
          return
        }
        const baseKeys = rowSelection.selectedRowKeys ?? selectedRowKeysRef.value
        const nextKeySet = /*#__PURE__*/ new Set(baseKeys)
        if (input.checked) nextKeySet.add(row.key)
        else nextKeySet.delete(row.key)
        updateSelectedKeys(
          Array.from(nextKeySet),
          { type: 'checkbox' },
          row.record,
          input.checked,
          event,
        )
      }
      const SelectionControlView = () => (
        <label onClick={(event: any) => event.stopPropagation()}>
          <input
            type={rowSelection.type === 'radio' ? 'radio' : 'checkbox'}
            name={rowSelection.type === 'radio' ? `${tableId.value}-selection` : undefined}
            className={inputClassName}
            checked={checked}
            onChange={onChangeHandler}
            {...checkboxProps}
          />
        </label>
      )
      const SelectionCellTag = pinCols && rowSelection.fixed ? 'th' : 'td'
      return SelectionCellTag === 'th' ? (
        <th
          className={mergeClassNames(semanticClasses.cell, alignClass(selectionAlign))}
          style={mergeStyles(
            semanticStyles.cell,
            rowSelection.columnWidth ? { width: rowSelection.columnWidth as any } : undefined,
          )}
        >
          <div
            className={mergeClassNames(
              'inline-flex items-center gap-2',
              rowSelection.cellClassName,
            )}
            data-checked={String(checked)}
          >
            <SelectionControlView />
            {rowSelection.cellLabelFormatter ? (
              <span>{String(rowSelection.cellLabelFormatter(checked, row.record, rowIndex))}</span>
            ) : null}
          </div>
        </th>
      ) : (
        <td
          className={mergeClassNames(semanticClasses.cell, alignClass(selectionAlign))}
          style={mergeStyles(
            semanticStyles.cell,
            rowSelection.columnWidth ? { width: rowSelection.columnWidth as any } : undefined,
          )}
        >
          <div
            className={mergeClassNames(
              'inline-flex items-center gap-2',
              rowSelection.cellClassName,
            )}
            data-checked={String(checked)}
          >
            <SelectionControlView />
            {rowSelection.cellLabelFormatter ? (
              <span>{String(rowSelection.cellLabelFormatter(checked, row.record, rowIndex))}</span>
            ) : null}
          </div>
        </td>
      )
    }

    const RenderExpandControl = ({
      arg0: row,
      arg1: rowIndex,
      arg2: state,
    }: {
      arg0: FlattenRow
      arg1: number
      arg2: ReturnType<typeof getExpandableState>
    }) => {
      if (!state.enabled) return <></>
      return (
        <button
          className={mergeClassNames('btn btn-ghost btn-xs', expandable?.expandButtonClassName)}
          onClick={(event: any) => {
            event.stopPropagation()
            toggleExpandedRow(row, rowIndex)
          }}
        >
          {String(
            expandable?.expandLabelFormatter
              ? expandable.expandLabelFormatter(state.expanded, row.record)
              : state.expanded
                ? '-'
                : '+',
          )}
        </button>
      )
    }

    const RenderBodyRow = ({ arg0: row, arg1: rowIndex }: { arg0: FlattenRow; arg1: number }) =>
      renderBodyRow(row, rowIndex)

    const pageData = computed(() => pageState.get().pageRows.map(row => row.record))
    const summaryInfo = computed(() => ({
      total: pageState.get().total,
      page: pageState.get().currentPage,
      pageSize: pageState.get().pageSize,
    }))
    const pageDataWithTotal = computed(() => {
      const data: any = pageData.get().slice()
      data.total = pageState.get().total
      return data
    })
    const pagerPlacements = resolvePaginationPlacements(paginationConfig)
    const showPager =
      paginationEnabled &&
      !(paginationConfig?.hideOnSinglePage && pageState.get().pageCount <= 1) &&
      !(pagerPlacements.length === 1 && pagerPlacements[0] === 'none')

    const RenderPager = ({ arg0: placement }: { arg0: PaginationPlacement }) => {
      return (
        <div
          key={`pager-${placement}`}
          data-rue-table-pager={placement}
          className={mergeClassNames(
            'flex items-center gap-2 p-2',
            getPaginationPlacementClass(placement),
            semanticClasses.pager,
          )}
          style={semanticStyles.pager}
        >
          <button
            className="btn btn-ghost btn-xs"
            disabled={pageState.get().currentPage <= 1}
            onClick={() => updatePage(pageState.get().currentPage - 1)}
          >
            Prev
          </button>
          {Array.from({ length: pageState.get().pageCount }).map((_, index) => (
            <button
              key={`page-${placement}-${index + 1}`}
              className={`btn btn-ghost btn-xs${pageState.get().currentPage === index + 1 ? ' btn-active' : ''}`}
              onClick={() => updatePage(index + 1)}
            >
              {index + 1}
            </button>
          ))}
          <button
            className="btn btn-ghost btn-xs"
            disabled={pageState.get().currentPage >= pageState.get().pageCount}
            onClick={() => updatePage(pageState.get().currentPage + 1)}
          >
            Next
          </button>
        </div>
      )
    }

    const headerCheckboxProps = rowSelection?.getTitleCheckboxProps?.() ?? {}
    const SelectionHeaderView = () =>
      rowSelection?.type === 'radio' || rowSelection?.hideSelectAll ? (
        <></>
      ) : (
        <label>
          <input
            type="checkbox"
            className="checkbox"
            checked={allSelectedOnPage.get()}
            aria-checked={
              someSelectedOnPage.get() ? 'mixed' : allSelectedOnPage.get() ? 'true' : 'false'
            }
            disabled={rowSelection?.disabled || selectablePageKeys.get().length === 0}
            onChange={(event: any) => selectAll((event.target as HTMLInputElement).checked)}
            {...headerCheckboxProps}
          />
        </label>
      )
    const handleScroll = (event: any) => {
      if (onScroll) onScroll(event)
    }

    return (
      <div
        ref={(element: HTMLElement | null) => {
          scrollRoot.value = element
        }}
        data-rue-table-root={tableId.value}
        data-rue-table-scroll={tableId.value}
        data-rue-table-version={stateVersion.value}
        className={mergeClassNames(
          'relative',
          bordered ? 'rounded-box border border-base-300 bg-base-100' : undefined,
          semanticClasses.root,
          wrapperCls,
        )}
        style={mergeStyles(semanticStyles.root, wrapperStyle)}
        onScroll={handleScroll}
      >
        {showPager ? (
          <>
            {' '}
            {pagerPlacements
              .filter(placement => placement.startsWith('top'))
              .map(placement => (
                <RenderPager key={placement} arg0={placement} />
              ))}{' '}
          </>
        ) : null}
        {titleRender ? (
          <div
            className={mergeClassNames('p-2', semanticClasses.title)}
            style={semanticStyles.title}
          >
            <RenderTableSection render={titleRender} data={pageData.get()} />
          </div>
        ) : null}
        <table className={cls} style={tableStyle} data-rue-table-id={tableId.value}>
          {showHeader ? (
            <thead className={semanticClasses.thead} style={semanticStyles.thead}>
              {headerRows.get().map((row, rowIndex) => renderHeaderRow(row, rowIndex))}
            </thead>
          ) : null}
          <tbody
            key={`body-${stateVersion.value}`}
            className={semanticClasses.tbody}
            style={semanticStyles.tbody}
          >
            {pageState.get().pageRows.map((row, rowIndex) => (
              <RenderBodyRow key={row.renderKey} arg0={row} arg1={rowIndex} />
            ))}
            {pageState.get().pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={bodyColSpan}
                  className={mergeClassNames(semanticClasses.empty, alignClass('center'))}
                  style={semanticStyles.empty}
                >
                  <RenderTableValue
                    value={typeof emptyText !== 'undefined' ? emptyText : localeText.emptyText}
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
          {typeof summary === 'function' ||
          (showPager && pagerPlacements.some(placement => placement.startsWith('bottom'))) ? (
            <tfoot className={semanticClasses.tfoot} style={semanticStyles.tfoot}>
              {typeof summary === 'function' ? (
                <tr className={semanticClasses.summary} style={semanticStyles.summary}>
                  <td colSpan={bodyColSpan}>
                    <RenderTableSummary
                      render={summary}
                      data={pageDataWithTotal.get()}
                      info={summaryInfo.get()}
                    />
                  </td>
                </tr>
              ) : null}
              {showPager ? (
                <>
                  {' '}
                  {pagerPlacements
                    .filter(placement => placement.startsWith('bottom'))
                    .map(placement => (
                      <tr key={`pager-row-${placement}`}>
                        <td colSpan={bodyColSpan}>
                          <RenderPager arg0={placement} />
                        </td>
                      </tr>
                    ))}{' '}
                </>
              ) : null}
            </tfoot>
          ) : null}
        </table>
        {footerRender ? (
          <div
            className={mergeClassNames('p-2', semanticClasses.footer)}
            style={semanticStyles.footer}
          >
            <RenderTableSection render={footerRender} data={pageData.get()} />
          </div>
        ) : null}
        {loadingConfig.spinning ? (
          <div
            className={mergeClassNames(
              'absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-box bg-base-100/70',
              semanticClasses.loading,
            )}
            style={semanticStyles.loading}
          >
            <span className="loading loading-spinner loading-md"></span>
            {loadingConfig.tip ? (
              <div className="text-sm opacity-70">{String(loadingConfig.tip)}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  return <table className={cls} style={semanticStyles.table} />
}

interface TablePartProps {
  className?: string
  children?: any
}

/** Head 的内部工具函数。 */
const Head: FC<TablePartProps> = ({ className, children }) => {
  return <thead className={className || undefined}>{children}</thead>
}

/** Body 的内部工具函数。 */
const Body: FC<TablePartProps> = ({ className, children }) => {
  return <tbody className={className || undefined}>{children}</tbody>
}

/** Foot 的内部工具函数。 */
const Foot: FC<TablePartProps> = ({ className, children }) => {
  return <tfoot className={className || undefined}>{children}</tfoot>
}

/** TR 内部常量。 */
const TR: FC<TablePartProps> = ({ className, children }) => {
  return <tr className={className || undefined}>{children}</tr>
}

/** TH 内部常量。 */
const TH: FC<TablePartProps> = ({ className, children }) => {
  return <th className={className || undefined}>{children}</th>
}

/** TD 内部常量。 */
const TD: FC<TablePartProps> = ({ className, children }) => {
  return <td className={className || undefined}>{children}</td>
}

type TableCompound = FC<TableProps> & {
  Head: FC<TablePartProps>
  Body: FC<TablePartProps>
  Foot: FC<TablePartProps>
  TR: FC<TablePartProps>
  TH: FC<TablePartProps>
  TD: FC<TablePartProps>
}

const TableCompound: TableCompound = /*#__PURE__*/ Object.assign(Table, {
  Head,
  Body,
  Foot,
  TR,
  TH,
  TD,
})

/** 默认导出表格组件。 */
export default TableCompound
