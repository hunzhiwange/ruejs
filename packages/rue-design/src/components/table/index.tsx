/*
Table 组件概述
- 数据驱动：基于 columns 与 dataSource 渲染表格，支持排序、筛选、分页、选择与展开。
- 固定布局：当列开启 ellipsis 或指定 tableLayout/fixed 时，自动使用固定布局优化。
- 复合组件：Head/Body/Foot/TR/TH/TD 便于自定义结构；也可直接传 children。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Table 组件签名 */

type TableSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ColumnItem {
  key?: string
  title?: any
  dataIndex?: string | string[]
  align?: 'left' | 'right' | 'center'
  className?: string
  width?: string | number
  ellipsis?: boolean
  render?: (value: any, record: any, index: number) => any
  sorter?: boolean | ((a: any, b: any) => number)
  defaultSortOrder?: 'ascend' | 'descend'
  sortOrder?: 'ascend' | 'descend' | null
  filters?: Array<{ text: any; value: any }>
  onFilter?: (value: any, record: any) => boolean
  filteredValue?: any[]
  defaultFilteredValue?: any[]
  filterMultiple?: boolean
  filterCombine?: 'or' | 'and'
  filterOnClose?: boolean
  filterResetToDefaultFilteredValue?: boolean
  hidden?: boolean
  onHeaderCell?: (column: ColumnItem, index: number) => Record<string, any>
  onCell?: (record: any, rowIndex: number) => Record<string, any>
  fixedCol?: boolean
}

interface RowSelection {
  type?: 'checkbox' | 'radio'
  selectedRowKeys?: Array<string | number>
  defaultSelectedRowKeys?: Array<string | number>
  columnWidth?: number | string
  disabled?: boolean
  onChange?: (selectedRowKeys: Array<string | number>, selectedRows: any[], info?: any) => void
  getCheckboxProps?: (record: any) => Record<string, any>
  onSelectAll?: (selected: boolean, selectedRows: any[]) => void
}

interface PaginationConfig {
  current?: number
  pageSize?: number
  hideOnSinglePage?: boolean
  onChange?: (page: number, pageSize: number) => void
}

interface ExpandableConfig {
  expandedRowRender?: (record: any, index: number) => any
  expandedRowKeys?: Array<string | number>
  defaultExpandAllRows?: boolean
  onExpand?: (expanded: boolean, record: any) => void
}

interface TableProps {
  size?: TableSize
  zebra?: boolean
  pinRows?: boolean
  pinCols?: boolean
  className?: string
  children?: any
  dataSource?: any[]
  columns?: ColumnItem[]
  rowKey?: string | ((record: any) => string)
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
  title?: (currentData: any[]) => any
  footer?: (currentData: any[]) => any
  rowHoverable?: boolean
  rowHoverClass?: string
  tableLayout?: 'auto' | 'fixed'
  scroll?: { x?: string | number | true; y?: string | number }
  height?: string | number
  onScroll?: (event: any) => void
}

/** 从记录中读取 dataIndex 对应的值（支持多级数组路径） */
const getVal = (record: any, dataIndex?: string | string[]) => {
  if (!dataIndex) return undefined
  if (Array.isArray(dataIndex)) {
    let cur = record
    for (const k of dataIndex) {
      if (cur == null) return undefined
      cur = cur[k]
    }
    return cur
  }
  return record?.[dataIndex]
}

/** 单元格对齐类名 */
const alignClass = (align?: 'left' | 'right' | 'center') => {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}

/** 高级表格组件：支持排序/筛选/分页/选择/展开/滚动等 */
const Table: FC<TableProps> = ({
  size,
  zebra,
  pinRows,
  pinCols,
  className,
  children,
  dataSource,
  columns,
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
  title,
  footer,
  rowHoverable = false,
  rowHoverClass,
  tableLayout,
  scroll,
  height,
  onScroll,
}) => {
  let cls = 'table'
  /* 表大小与斑马纹/固定行列 */
  if (size) cls += ` table-${size}`
  if (zebra) cls += ` table-zebra`
  if (pinRows) cls += ` table-pin-rows`
  if (pinCols) cls += ` table-pin-cols`
  /* 附加类名 */
  if (className) cls += ` ${className}`
  const hasChildren = !(
    children === undefined ||
    children === null ||
    (Array.isArray(children) && children.length === 0)
  )
  /* children 模式：直接渲染表 */
  if (hasChildren) return <table className={cls}>{children}</table>
  if (Array.isArray(columns) && Array.isArray(dataSource)) {
    /* 受控数据模式：计算列、排序、筛选、分页等 */
    const tableId = Math.random().toString(36).slice(2)
    const headerProps = onHeaderRow ? onHeaderRow(columns, 0) || {} : {}
    const visibleColumns = columns.filter(col => !col.hidden)
    /* 排序初始状态：优先使用 sortOrder，否则 defaultSortOrder */
    let sortColIndex: number | null = null
    let sortOrder: 'ascend' | 'descend' | null = null
    visibleColumns.forEach((col, i) => {
      if (col.sortOrder != null) {
        sortColIndex = i
        sortOrder = col.sortOrder
      } else if (sortColIndex == null && col.defaultSortOrder) {
        sortColIndex = i
        sortOrder = col.defaultSortOrder
      }
    })
    let workingData = dataSource.slice()
    const activeFilters: Record<string, any[]> = {}
    const getColKey = (col: ColumnItem) =>
      (typeof col.dataIndex === 'string'
        ? col.dataIndex
        : Array.isArray(col.dataIndex)
          ? col.dataIndex.join('.')
          : col.key) as string

    /* 筛选：组合 onFilter 或直接等值匹配 */
    visibleColumns.forEach(col => {
      const vals = col.filteredValue ?? col.defaultFilteredValue
      if (Array.isArray(vals) && vals.length > 0) {
        const key = getColKey(col)
        if (key) activeFilters[key] = vals
        workingData = workingData.filter(rec => {
          if (col.onFilter) {
            if (col.filterCombine === 'and') {
              return vals.every(v => col.onFilter!(v, rec))
            }
            return vals.some(v => col.onFilter!(v, rec))
          }
          const rv = getVal(rec, col.dataIndex)
          return vals.includes(rv)
        })
      }
    })
    /* 排序：自定义比较或默认比较 */
    if (sortColIndex != null && sortOrder && visibleColumns[sortColIndex]) {
      const col = visibleColumns[sortColIndex]
      const cmp =
        typeof col.sorter === 'function'
          ? col.sorter
          : (a: any, b: any) => {
              const va = getVal(a, col.dataIndex)
              const vb = getVal(b, col.dataIndex)
              if (va == null && vb == null) return 0
              if (va == null) return -1
              if (vb == null) return 1
              if (va > vb) return 1
              if (va < vb) return -1
              return 0
            }
      workingData.sort((a, b) => (sortOrder === 'ascend' ? cmp(a, b) : -cmp(a, b)))
    }
    /* 分页：计算页码与切片数据 */
    let page = 1
    let pageSize = workingData.length
    if (pagination !== false && pagination != null) {
      page = pagination.current || 1
      pageSize = pagination.pageSize || 10
    }
    const total = workingData.length
    const pageCount = Math.ceil(total / pageSize) || 1
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pageData = workingData.slice(start, end)
    /* 选择/展开：计算当前页 keys 与展开集合 */
    const hasSelection = !!rowSelection
    const hasExpand = !!expandable && typeof expandable.expandedRowRender === 'function'
    const expKeys = new Set<string | number>(
      expandable?.expandedRowKeys ||
        (expandable?.defaultExpandAllRows
          ? workingData.map(rec => (typeof rowKey === 'function' ? rowKey(rec) : rec?.[rowKey]))
          : []),
    )
    const selectedBase = (rowSelection?.selectedRowKeys ??
      rowSelection?.defaultSelectedRowKeys ??
      []) as Array<string | number>
    const isSelected = (key: any) => Array.isArray(selectedBase) && selectedBase.includes(key)
    /* 交互：点击表头单元格触发排序 */
    const onHeaderSortClick = (i: number) => {
      const col = visibleColumns[i]
      if (!col.sorter) return
      let next: 'ascend' | 'descend' | null = 'ascend'
      if (sortColIndex === i && sortOrder === 'ascend') next = 'descend'
      else if (sortColIndex === i && sortOrder === 'descend') next = null
      if (onChange)
        onChange(
          { current: page, pageSize },
          activeFilters,
          { column: col, order: next },
          { action: 'sort', currentDataSource: pageData },
        )
    }
    /* 交互：页码改变 */
    const onPageChange = (p: number) => {
      if (pagination !== false && pagination != null && pagination.onChange)
        pagination.onChange(p, pageSize)
      if (onChange)
        onChange(
          { current: p, pageSize },
          activeFilters,
          { order: sortOrder, column: sortColIndex != null ? visibleColumns[sortColIndex] : null },
          { action: 'paginate', currentDataSource: pageData },
        )
    }
    /* 交互：表头排序箭头点击 */
    const onHeaderSetSort = (i: number, order: 'ascend' | 'descend' | null) => {
      const col = visibleColumns[i]
      if (!col.sorter) return
      if (onChange)
        onChange(
          { current: page, pageSize },
          activeFilters,
          { column: col, order },
          { action: 'sort', currentDataSource: pageData },
        )
    }
    /* 工具：重置筛选菜单到默认选中值 */
    const resetHeaderFilterMenu = (i: number, menuEl?: HTMLElement) => {
      const col = visibleColumns[i]
      const el = menuEl || (document.getElementById(`table-filter-menu-${i}`) as HTMLElement | null)
      if (!col || !el) return
      const defaults = (
        col.filterResetToDefaultFilteredValue ? (col.defaultFilteredValue ?? []) : []
      ) as any[]
      const inputs = el.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"], input[type="radio"]',
      )
      inputs.forEach(inp => {
        const v = (inp.getAttribute('data-value') || inp.value) as any
        if (inp.type === 'checkbox') {
          inp.checked = defaults.includes(v)
        } else {
          inp.checked = defaults[0] === v
        }
      })
    }
    /* 注册外部点击关闭筛选菜单（一次性） */
    const ensureOutsideCloseRegistered = (id: string) => {
      const g: any = globalThis
      const key = `__rue_table_outside_close_${id}`
      if (g[key]) return
      const handler = (e: any) => {
        const target = e.target as HTMLElement
        const withinIcon = target.closest(`[data-rue-table-id="${id}"] .rue-table-filter-icon`)
        const withinMenu = target.closest(`[data-rue-table-id="${id}"] .rue-table-filter-menu`)
        if (!withinIcon && !withinMenu) {
          const tableEl = document.querySelector(
            `table[data-rue-table-id="${id}"]`,
          ) as HTMLElement | null
          if (!tableEl) return
          const menus = tableEl.querySelectorAll<HTMLElement>('.rue-table-filter-menu')
          menus.forEach(m => (m.style.display = 'none'))
        }
      }
      if (g && g.addEventListener) g.addEventListener('pointerdown', handler)
      g[key] = handler
    }
    ensureOutsideCloseRegistered(tableId)
    /* 打开/关闭并定位筛选菜单 */
    const toggleHeaderFilterMenu = (i: number, open?: boolean, anchor?: HTMLElement) => {
      let el: HTMLElement | null = null
      if (anchor) {
        const cell = anchor.closest('th, td') as HTMLElement | null
        el = cell ? (cell.querySelector('.rue-table-filter-menu') as HTMLElement | null) : null
      }
      if (!el) el = document.getElementById(`table-filter-menu-${i}`) as HTMLElement | null
      if (!el) return
      const hidden = el.style.display === 'none'
      const shouldOpen = open != null ? open : hidden
      if (!shouldOpen) {
        el.style.display = 'none'
        return
      }
      // Position as overlay relative to viewport
      el.style.position = 'fixed'
      el.style.visibility = 'hidden'
      el.style.display = ''
      const anchorEl = anchor || el
      const rect = anchorEl.getBoundingClientRect()
      const menuW = el.offsetWidth || 176
      const menuH = el.offsetHeight || 160
      const gap = 8
      const vw = window.innerWidth
      const vh = window.innerHeight
      let top = rect.bottom + gap
      let left = rect.left
      if (vh - rect.bottom < menuH + gap) top = Math.max(8, rect.top - menuH - gap)
      if (vw - rect.left < menuW + 8) left = Math.max(8, rect.right - menuW)
      el.style.visibility = ''
      el.style.top = `${top}px`
      el.style.left = `${left}px`
      el.style.maxHeight = 'calc(100vh - 16px)'
      el.style.overflow = 'auto'
      el.style.zIndex = '50'
    }
    /* 收集筛选菜单当前选中值 */
    const collectHeaderFilterValues = (i: number, menuEl?: HTMLElement) => {
      const el = menuEl || (document.getElementById(`table-filter-menu-${i}`) as HTMLElement | null)
      if (!el) return [] as any[]
      const inputs = el.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"], input[type="radio"]',
      )
      const vals: any[] = []
      inputs.forEach(inp => {
        const v = (inp.getAttribute('data-value') || inp.value) as any
        if (inp.checked) vals.push(v)
      })
      return vals
    }
    /* 应用筛选并关闭菜单 */
    const onHeaderFilterApply = (i: number, vals?: any[], menuEl?: HTMLElement) => {
      const col = visibleColumns[i]
      if (!col || !Array.isArray(col.filters) || col.filters.length === 0) return
      const key = getColKey(col)
      const cur = Array.isArray(vals) ? vals : collectHeaderFilterValues(i, menuEl)
      const nextFilters = { ...activeFilters }
      if (key) nextFilters[key] = cur
      if (onChange)
        onChange(
          { current: page, pageSize },
          nextFilters,
          { order: sortOrder, column: sortColIndex != null ? visibleColumns[sortColIndex] : null },
          { action: 'filter', currentDataSource: pageData },
        )
      toggleHeaderFilterMenu(i, false, menuEl || undefined)
    }
    /* 展开行：切换显示并通知回调 */
    const toggleExpand = (key: any, record: any, e?: any) => {
      const btnEl = e?.currentTarget as HTMLElement | undefined
      const rowEl = btnEl ? (btnEl.closest('tr') as HTMLElement | null) : null
      const expRow = rowEl?.nextElementSibling as HTMLElement | null
      if (expRow) {
        const hidden = expRow.style.display === 'none'
        expRow.style.display = hidden ? '' : 'none'
        if (btnEl) btnEl.textContent = hidden ? '-' : '+'
      }
      const has = expKeys.has(key)
      if (expandable?.onExpand) expandable.onExpand(!has, record)
    }
    /* 选择：全选/清空 */
    const selectAll = (checked: boolean) => {
      if (!rowSelection || rowSelection.type === 'radio') return
      const keys = checked
        ? pageData.map(rec => (typeof rowKey === 'function' ? rowKey(rec) : rec?.[rowKey]))
        : []
      if (rowSelection.onChange) {
        const rows = workingData.filter(rec =>
          keys.includes(typeof rowKey === 'function' ? rowKey(rec) : rec?.[rowKey]),
        )
        rowSelection.onChange(keys, rows, { type: 'checkbox' })
      }
      if (rowSelection.onSelectAll) {
        const rows = workingData.filter(rec =>
          keys.includes(typeof rowKey === 'function' ? rowKey(rec) : rec?.[rowKey]),
        )
        rowSelection.onSelectAll(checked, rows)
      }
    }
    const pageKeys = pageData.map(rec =>
      typeof rowKey === 'function' ? rowKey(rec) : rec?.[rowKey],
    )
    const allSelectedOnPage = pageKeys.length > 0 && pageKeys.every(k => isSelected(k))
    const someSelectedOnPage = pageKeys.some(k => isSelected(k)) && !allSelectedOnPage
    const tableStyle: Record<string, any> = {}
    const needFixedLayout = visibleColumns.some(c => !!c.ellipsis)
    /* 布局：固定/自动 */
    if (tableLayout) tableStyle.tableLayout = tableLayout
    else if (needFixedLayout) tableStyle.tableLayout = 'fixed'
    /* 包裹层：滚动与高度 */
    const wrapperNeeded = !!(scroll?.x || scroll?.y || typeof height !== 'undefined' || onScroll)
    const wrapperStyle: Record<string, any> = {}
    const wrapperCls =
      `${scroll?.x ? 'overflow-x-auto' : ''} ${scroll?.y || typeof height !== 'undefined' ? 'overflow-y-auto' : ''}`.trim() ||
      undefined
    if (typeof scroll?.y !== 'undefined') {
      const maxH = typeof scroll!.y === 'number' ? `${scroll!.y}px` : (scroll!.y as any)
      wrapperStyle.maxHeight = maxH
    }
    if (typeof height !== 'undefined') {
      const h = typeof height === 'number' ? `${height}px` : (height as any)
      wrapperStyle.height = h
    }
    return wrapperNeeded ? (
      <div className={wrapperCls} style={wrapperStyle} onScroll={onScroll}>
        {/* 标题区域：可选 */}
        {typeof title === 'function' ? <div className="p-2">{title(pageData)}</div> : null}
        <table className={cls} style={tableStyle} data-rue-table-id={tableId}>
          {showHeader ? (
            <thead {...headerProps}>
              <tr>
                {/* 展开列与选择列（可选） */}
                {hasExpand ? <th className={alignClass('center')}></th> : null}
                {hasSelection ? (
                  <th
                    style={
                      rowSelection?.columnWidth
                        ? { width: rowSelection.columnWidth as any }
                        : undefined
                    }
                    className={alignClass('center')}
                  >
                    {rowSelection?.type !== 'radio' ? (
                      <label>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={allSelectedOnPage}
                          aria-checked={
                            someSelectedOnPage ? 'mixed' : allSelectedOnPage ? 'true' : 'false'
                          }
                          disabled={!!rowSelection?.disabled}
                          onChange={(e: any) => selectAll((e.target as HTMLInputElement).checked)}
                        />
                      </label>
                    ) : null}
                  </th>
                ) : null}
                {visibleColumns.map((col, i) => {
                  const cellProps = col.onHeaderCell ? col.onHeaderCell(col, i) || {} : {}
                  const keyVal = (col.key ?? col.dataIndex ?? i) as any
                  const className =
                    `${alignClass(col.align)}${col.className ? ` ${col.className}` : ''}${cellProps.className ? ` ${cellProps.className}` : ''}`.trim() ||
                    undefined
                  const style = col.width ? { width: col.width as any } : (cellProps.style as any)
                  if (pinCols && !col.fixedCol) {
                    return (
                      <td
                        key={keyVal}
                        className={className}
                        style={style}
                        onClick={() => onHeaderSortClick(i)}
                        {...cellProps}
                      >
                        {col.title}
                      </td>
                    )
                  }
                  return (
                    <th
                      key={keyVal}
                      className={className}
                      style={style}
                      onClick={() => onHeaderSortClick(i)}
                      {...cellProps}
                    >
                      {/* 表头内容：标题/排序/筛选触发与菜单 */}
                      {col.title}
                    </th>
                  )
                })}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {pageData.map((record, rowIndex) => {
              const key = typeof rowKey === 'function' ? rowKey(record) : record?.[rowKey]
              const rowProps = onRow ? onRow(record, rowIndex) || {} : {}
              const baseCls =
                typeof rowClassName === 'function' ? rowClassName(record, rowIndex) : ''
              const hoverCls = rowHoverable ? rowHoverClass || 'hover:bg-base-200' : ''
              const rowCls = `${baseCls}${hoverCls ? ` ${hoverCls}` : ''}`.trim() || undefined
              const colSpan =
                (visibleColumns.length || 0) + (hasSelection ? 1 : 0) + (hasExpand ? 1 : 0)
              return (
                <>
                  <tr
                    key={(key ?? rowIndex) as any}
                    {...rowProps}
                    className={rowCls || rowProps.className}
                  >
                    {hasExpand ? (
                      <td className={alignClass('center')}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={(e: any) => toggleExpand(key, record, e)}
                        >
                          {expKeys.has(key) ? '-' : '+'}
                        </button>
                      </td>
                    ) : null}
                    {hasSelection ? (
                      <td
                        className={alignClass('center')}
                        style={
                          rowSelection?.columnWidth
                            ? { width: rowSelection.columnWidth as any }
                            : undefined
                        }
                      >
                        <label>
                          {rowSelection?.type === 'radio' ? (
                            <input
                              type="radio"
                              className="radio"
                              checked={!!isSelected(key)}
                              onChange={() => {
                                const keys = [key]
                                if (rowSelection?.onChange) {
                                  const rows = workingData.filter(rec =>
                                    keys.includes(
                                      typeof rowKey === 'function' ? rowKey(rec) : rec?.[rowKey],
                                    ),
                                  )
                                  rowSelection.onChange(keys, rows, { type: 'radio' })
                                }
                              }}
                              {...(rowSelection?.getCheckboxProps
                                ? rowSelection.getCheckboxProps(record)
                                : {})}
                            />
                          ) : (
                            <input
                              type="checkbox"
                              className="checkbox"
                              checked={!!isSelected(key)}
                              onChange={(e: any) => {
                                const checked = (e.target as HTMLInputElement).checked
                                const base = (rowSelection?.selectedRowKeys ??
                                  rowSelection?.defaultSelectedRowKeys ??
                                  []) as Array<string | number>
                                const set = new Set(base)
                                if (checked) set.add(key)
                                else set.delete(key)
                                const keys = Array.from(set)
                                if (rowSelection?.onChange) {
                                  const rows = workingData.filter(rec =>
                                    keys.includes(
                                      typeof rowKey === 'function' ? rowKey(rec) : rec?.[rowKey],
                                    ),
                                  )
                                  rowSelection.onChange(keys, rows, { type: 'checkbox' })
                                }
                              }}
                              {...(rowSelection?.getCheckboxProps
                                ? rowSelection.getCheckboxProps(record)
                                : {})}
                            />
                          )}
                        </label>
                      </td>
                    ) : null}
                    {visibleColumns.map((col, colIndex) => {
                      const val = getVal(record, col.dataIndex)
                      const node = col.render ? col.render(val, record, rowIndex) : val
                      const cellCls = `${alignClass(col.align)}${col.className ? ` ${col.className}` : ''}${col.ellipsis ? ' truncate' : ''}`
                      const cellProps = col.onCell ? col.onCell(record, rowIndex) || {} : {}
                      const keyVal = (col.key ?? `${rowIndex}-${colIndex}`) as any
                      const className =
                        `${cellCls}${cellProps.className ? ` ${cellProps.className}` : ''}`.trim() ||
                        undefined
                      const style = col.width
                        ? { width: col.width as any }
                        : (cellProps.style as any)
                      if (pinCols && col.fixedCol) {
                        return (
                          <th key={keyVal} className={className} style={style} {...cellProps}>
                            {node}
                          </th>
                        )
                      }
                      return (
                        <td key={keyVal} className={className} style={style} {...cellProps}>
                          {node}
                        </td>
                      )
                    })}
                  </tr>
                  {hasExpand && expandable?.expandedRowRender ? (
                    <tr key={`expanded-${key}`} style={{ display: expKeys.has(key) ? '' : 'none' }}>
                      <td colSpan={colSpan}>{expandable!.expandedRowRender!(record, rowIndex)}</td>
                    </tr>
                  ) : null}
                </>
              )
            })}
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    (visibleColumns.length || 0) + (hasSelection ? 1 : 0) + (hasExpand ? 1 : 0)
                  }
                  className={alignClass('center')}
                >
                  {typeof (emptyText as any) !== 'undefined' ? emptyText : 'No Data'}
                </td>
              </tr>
            ) : null}
          </tbody>
          {(() => {
            const colSpan =
              (visibleColumns.length || 0) + (hasSelection ? 1 : 0) + (hasExpand ? 1 : 0)
            const summaryInfo = { total, page, pageSize }
            const pageDataWithTotal: any = pageData.slice()
            ;(pageDataWithTotal as any).total = total
            const summaryNode =
              typeof summary === 'function' ? summary(pageDataWithTotal, summaryInfo) : null
            const showPager =
              pagination !== false &&
              pagination != null &&
              !(pagination.hideOnSinglePage && pageCount <= 1)
            if (!summaryNode && !showPager) return null
            return (
              <tfoot>
                {/* 汇总行：可选 */}
                {summaryNode ? (
                  <tr>
                    <td colSpan={colSpan}>{summaryNode}</td>
                  </tr>
                ) : null}
                {/* 分页器：页码与前后按钮 */}
                {showPager ? (
                  <tr>
                    <td colSpan={colSpan}>
                      <div className="flex items-center justify-end gap-2 p-2">
                        <button
                          className="btn btn-ghost btn-xs"
                          disabled={page <= 1}
                          onClick={() => onPageChange(page - 1)}
                        >
                          Prev
                        </button>
                        {Array.from({ length: pageCount }).map((_, i) => (
                          <button
                            key={i}
                            className={`btn btn-ghost btn-xs${page === i + 1 ? ' btn-active' : ''}`}
                            onClick={() => onPageChange(i + 1)}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          className="btn btn-ghost btn-xs"
                          disabled={page >= pageCount}
                          onClick={() => onPageChange(page + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tfoot>
            )
          })()}
        </table>
        {/* 表尾区域：可选 */}
        {typeof footer === 'function' ? <div className="p-2">{footer(pageData)}</div> : null}
      </div>
    ) : (
      <table className={cls} style={tableStyle} data-rue-table-id={tableId}>
        {showHeader ? (
          <thead {...headerProps}>
            <tr>
              {hasExpand ? <th className={alignClass('center')}></th> : null}
              {hasSelection ? (
                <th
                  style={
                    rowSelection?.columnWidth
                      ? { width: rowSelection.columnWidth as any }
                      : undefined
                  }
                  className={alignClass('center')}
                >
                  {rowSelection?.type !== 'radio' ? (
                    <label>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={allSelectedOnPage}
                        aria-checked={
                          someSelectedOnPage ? 'mixed' : allSelectedOnPage ? 'true' : 'false'
                        }
                        disabled={!!rowSelection?.disabled}
                        onChange={(e: any) => selectAll((e.target as HTMLInputElement).checked)}
                      />
                    </label>
                  ) : null}
                </th>
              ) : null}
              {visibleColumns.map((col, i) => {
                const cellProps = col.onHeaderCell ? col.onHeaderCell(col, i) || {} : {}
                const keyVal = (col.key ?? col.dataIndex ?? i) as any
                const className =
                  `${alignClass(col.align)}${col.className ? ` ${col.className}` : ''}${cellProps.className ? ` ${cellProps.className}` : ''}`.trim() ||
                  undefined
                const style = col.width ? { width: col.width as any } : (cellProps.style as any)
                if (pinCols && !col.fixedCol) {
                  return (
                    <td
                      key={keyVal}
                      className={className}
                      style={style}
                      onClick={() => onHeaderSortClick(i)}
                      {...cellProps}
                    >
                      <div className="flex items-center relative">
                        <span>{col.title}</span>
                        {col.sorter ? (
                          <span className="ml-1 inline-flex flex-col leading-none">
                            <span
                              className={`${sortColIndex === i && sortOrder === 'ascend' ? 'text-base-content' : 'opacity-40'} cursor-pointer`}
                              onClick={(e: any) => {
                                e.stopPropagation()
                                onHeaderSetSort(i, 'ascend')
                              }}
                            >
                              ▲
                            </span>
                            <span
                              className={`${sortColIndex === i && sortOrder === 'descend' ? 'text-base-content' : 'opacity-40'} cursor-pointer -mt-0.5`}
                              onClick={(e: any) => {
                                e.stopPropagation()
                                onHeaderSetSort(i, 'descend')
                              }}
                            >
                              ▼
                            </span>
                          </span>
                        ) : null}
                        {Array.isArray(col.filters) && col.filters.length > 0 ? (
                          <span
                            className={`rue-table-filter-icon ml-2 cursor-pointer ${activeFilters[getColKey(col)]?.length ? 'text-base-content' : 'opacity-40'}`}
                            onClick={(e: any) => {
                              e.stopPropagation()
                              toggleHeaderFilterMenu(i, undefined, e.currentTarget as HTMLElement)
                            }}
                          >
                            ☰
                          </span>
                        ) : null}
                      </div>
                      {Array.isArray(col.filters) && col.filters.length > 0
                        ? (() => {
                            const menuGroup = `header-filter-${i}-${Math.random().toString(36).slice(2)}`
                            return (
                              <div
                                id={`table-filter-menu-${i}`}
                                className="rue-table-filter-menu fixed z-50 w-44 rounded-box border border-base-content/10 bg-base-100 p-2 shadow"
                                style={{ display: 'none' }}
                              >
                                <div className="space-y-1">
                                  {col.filters.map(f => (
                                    <label
                                      key={(f.value as any) ?? String(f.text)}
                                      className="flex items-center gap-2"
                                    >
                                      <input
                                        type={col.filterMultiple === false ? 'radio' : 'checkbox'}
                                        name={menuGroup}
                                        className={
                                          col.filterMultiple === false
                                            ? 'radio radio-xs'
                                            : 'checkbox checkbox-xs'
                                        }
                                        defaultChecked={(
                                          activeFilters[getColKey(col)] ??
                                          col.defaultFilteredValue ??
                                          []
                                        ).includes(f.value)}
                                        data-value={String(f.value)}
                                        onChange={(e: any) => {
                                          if (col.filterOnClose) return
                                          const menuEl = (e.currentTarget as HTMLElement).closest(
                                            '.rue-table-filter-menu',
                                          ) as HTMLElement | null
                                          onHeaderFilterApply(i, undefined, menuEl || undefined)
                                        }}
                                      />
                                      <span className="text-sm">{f.text}</span>
                                    </label>
                                  ))}
                                </div>
                                {col.filterOnClose ? (
                                  <div className="mt-2 flex justify-end gap-2">
                                    <button
                                      className="btn btn-ghost btn-xs"
                                      onClick={(e: any) => {
                                        const menuEl = (e.currentTarget as HTMLElement).closest(
                                          '.rue-table-filter-menu',
                                        ) as HTMLElement | null
                                        resetHeaderFilterMenu(i, menuEl || undefined)
                                      }}
                                    >
                                      重置
                                    </button>
                                    <button
                                      className="btn btn-primary btn-xs"
                                      onClick={(e: any) => {
                                        const menuEl = (e.currentTarget as HTMLElement).closest(
                                          '.rue-table-filter-menu',
                                        ) as HTMLElement | null
                                        onHeaderFilterApply(i, undefined, menuEl || undefined)
                                      }}
                                    >
                                      应用
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            )
                          })()
                        : null}
                    </td>
                  )
                }
                return (
                  <th
                    key={keyVal}
                    className={className}
                    style={style}
                    onClick={() => onHeaderSortClick(i)}
                    {...cellProps}
                  >
                    <div className="flex items-center relative">
                      <span>{col.title}</span>
                      {col.sorter ? (
                        <span className="ml-1 inline-flex flex-col leading-none">
                          <span
                            className={`${sortColIndex === i && sortOrder === 'ascend' ? 'text-base-content' : 'opacity-40'} cursor-pointer`}
                            onClick={(e: any) => {
                              e.stopPropagation()
                              onHeaderSetSort(i, 'ascend')
                            }}
                          >
                            ▲
                          </span>
                          <span
                            className={`${sortColIndex === i && sortOrder === 'descend' ? 'text-base-content' : 'opacity-40'} cursor-pointer -mt-0.5`}
                            onClick={(e: any) => {
                              e.stopPropagation()
                              onHeaderSetSort(i, 'descend')
                            }}
                          >
                            ▼
                          </span>
                        </span>
                      ) : null}
                      {Array.isArray(col.filters) && col.filters.length > 0 ? (
                        <span
                          className={`rue-table-filter-icon ml-2 cursor-pointer ${activeFilters[getColKey(col)]?.length ? 'text-base-content' : 'opacity-40'}`}
                          onClick={(e: any) => {
                            e.stopPropagation()
                            toggleHeaderFilterMenu(i, undefined, e.currentTarget as HTMLElement)
                          }}
                        >
                          ☰
                        </span>
                      ) : null}
                      {Array.isArray(col.filters) && col.filters.length > 0
                        ? (() => {
                            const menuGroup = `header-filter-${i}-${Math.random().toString(36).slice(2)}`
                            return (
                              <div
                                id={`table-filter-menu-${i}`}
                                className="rue-table-filter-menu fixed z-50 w-44 rounded-box border border-base-content/10 bg-base-100 p-2 shadow"
                                style={{ display: 'none' }}
                              >
                                <div className="space-y-1">
                                  {col.filters.map(f => (
                                    <label
                                      key={(f.value as any) ?? String(f.text)}
                                      className="flex items-center gap-2"
                                    >
                                      <input
                                        type={col.filterMultiple === false ? 'radio' : 'checkbox'}
                                        name={menuGroup}
                                        className={
                                          col.filterMultiple === false
                                            ? 'radio radio-xs'
                                            : 'checkbox checkbox-xs'
                                        }
                                        defaultChecked={(
                                          activeFilters[getColKey(col)] ??
                                          col.defaultFilteredValue ??
                                          []
                                        ).includes(f.value)}
                                        data-value={String(f.value)}
                                        onChange={(e: any) => {
                                          if (col.filterOnClose) return
                                          const menuEl = (e.currentTarget as HTMLElement).closest(
                                            '.rue-table-filter-menu',
                                          ) as HTMLElement | null
                                          onHeaderFilterApply(i, undefined, menuEl || undefined)
                                        }}
                                      />
                                      <span className="text-sm">{f.text}</span>
                                    </label>
                                  ))}
                                </div>
                                {col.filterOnClose ? (
                                  <div className="mt-2 flex justify-end gap-2">
                                    <button
                                      className="btn btn-ghost btn-xs"
                                      onClick={(e: any) => {
                                        const menuEl = (e.currentTarget as HTMLElement).closest(
                                          '.rue-table-filter-menu',
                                        ) as HTMLElement | null
                                        resetHeaderFilterMenu(i, menuEl || undefined)
                                      }}
                                    >
                                      重置
                                    </button>
                                    <button
                                      className="btn btn-primary btn-xs"
                                      onClick={(e: any) => {
                                        const menuEl = (e.currentTarget as HTMLElement).closest(
                                          '.rue-table-filter-menu',
                                        ) as HTMLElement | null
                                        onHeaderFilterApply(i, undefined, menuEl || undefined)
                                      }}
                                    >
                                      应用
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            )
                          })()
                        : null}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {pageData.map((record, rowIndex) => {
            const key = typeof rowKey === 'function' ? rowKey(record) : record?.[rowKey]
            const rowProps = onRow ? onRow(record, rowIndex) || {} : {}
            const baseCls = typeof rowClassName === 'function' ? rowClassName(record, rowIndex) : ''
            const hoverCls = rowHoverable ? rowHoverClass || 'hover:bg-base-200' : ''
            const rowCls = `${baseCls}${hoverCls ? ` ${hoverCls}` : ''}`.trim() || undefined
            return (
              <>
                <tr
                  key={(key ?? rowIndex) as any}
                  {...rowProps}
                  className={rowCls || rowProps.className}
                >
                  {hasExpand ? (
                    <td className={alignClass('center')}>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={(e: any) => toggleExpand(key, record, e)}
                      >
                        {expKeys.has(key) ? '-' : '+'}
                      </button>
                    </td>
                  ) : null}
                  {hasSelection ? (
                    <td
                      className={alignClass('center')}
                      style={
                        rowSelection?.columnWidth
                          ? { width: rowSelection.columnWidth as any }
                          : undefined
                      }
                    >
                      <label>
                        {(() => {
                          const cbProps = rowSelection?.getCheckboxProps
                            ? { ...(rowSelection.getCheckboxProps(record) as any) }
                            : ({} as any)
                          if (rowSelection?.disabled) cbProps.disabled = true
                          if (rowSelection?.type === 'radio') {
                            return (
                              <input
                                type="radio"
                                className="radio"
                                checked={!!isSelected(key)}
                                onChange={() => {
                                  const keys = [key]
                                  if (rowSelection?.onChange) {
                                    const rows = workingData.filter(rec =>
                                      keys.includes(
                                        typeof rowKey === 'function' ? rowKey(rec) : rec?.[rowKey],
                                      ),
                                    )
                                    rowSelection.onChange(keys, rows, { type: 'radio' })
                                  }
                                }}
                                {...cbProps}
                              />
                            )
                          }
                          return (
                            <input
                              type="checkbox"
                              className="checkbox"
                              checked={!!isSelected(key)}
                              onChange={(e: any) => {
                                const checked = (e.target as HTMLInputElement).checked
                                const base = (rowSelection?.selectedRowKeys ??
                                  rowSelection?.defaultSelectedRowKeys ??
                                  []) as Array<string | number>
                                const set = new Set(base)
                                if (checked) set.add(key)
                                else set.delete(key)
                                const keys = Array.from(set)
                                if (rowSelection?.onChange) {
                                  const rows = workingData.filter(rec =>
                                    keys.includes(
                                      typeof rowKey === 'function' ? rowKey(rec) : rec?.[rowKey],
                                    ),
                                  )
                                  rowSelection.onChange(keys, rows, { type: 'checkbox' })
                                }
                              }}
                              {...cbProps}
                            />
                          )
                        })()}
                      </label>
                    </td>
                  ) : null}
                  {visibleColumns.map((col, colIndex) => {
                    const val = getVal(record, col.dataIndex)
                    const node = col.render ? col.render(val, record, rowIndex) : val
                    const cellCls = `${alignClass(col.align)}${col.className ? ` ${col.className}` : ''}${col.ellipsis ? ' truncate' : ''}`
                    const cellProps = col.onCell ? col.onCell(record, rowIndex) || {} : {}
                    const keyVal = (col.key ?? `${rowIndex}-${colIndex}`) as any
                    const className =
                      `${cellCls}${cellProps.className ? ` ${cellProps.className}` : ''}`.trim() ||
                      undefined
                    const style = col.width ? { width: col.width as any } : (cellProps.style as any)
                    if (pinCols && col.fixedCol) {
                      return (
                        <th key={keyVal} className={className} style={style} {...cellProps}>
                          {node}
                        </th>
                      )
                    }
                    return (
                      <td key={keyVal} className={className} style={style} {...cellProps}>
                        {node}
                      </td>
                    )
                  })}
                </tr>
                {hasExpand && expandable?.expandedRowRender ? (
                  <tr key={`expanded-${key}`} style={{ display: expKeys.has(key) ? '' : 'none' }}>
                    <td
                      colSpan={
                        (visibleColumns.length || 0) + (hasSelection ? 1 : 0) + (hasExpand ? 1 : 0)
                      }
                    >
                      {expandable!.expandedRowRender!(record, rowIndex)}
                    </td>
                  </tr>
                ) : null}
              </>
            )
          })}
          {pageData.length === 0 ? (
            <tr>
              <td
                colSpan={
                  (visibleColumns.length || 0) + (hasSelection ? 1 : 0) + (hasExpand ? 1 : 0)
                }
                className={alignClass('center')}
              >
                {typeof (emptyText as any) !== 'undefined' ? emptyText : 'No Data'}
              </td>
            </tr>
          ) : null}
        </tbody>
        {(() => {
          const colSpan =
            (visibleColumns.length || 0) + (hasSelection ? 1 : 0) + (hasExpand ? 1 : 0)
          const summaryInfo = { total, page, pageSize }
          const pageDataWithTotal: any = pageData.slice()
          ;(pageDataWithTotal as any).total = total
          const summaryNode =
            typeof summary === 'function' ? summary(pageDataWithTotal, summaryInfo) : null
          const showPager =
            pagination !== false &&
            pagination != null &&
            !(pagination.hideOnSinglePage && pageCount <= 1)
          if (!summaryNode && !showPager) return null
          return (
            <tfoot>
              {summaryNode ? (
                <tr>
                  <td colSpan={colSpan}>{summaryNode}</td>
                </tr>
              ) : null}
              {showPager ? (
                <tr>
                  <td colSpan={colSpan}>
                    <div className="flex items-center justify-end gap-2 p-2">
                      <button
                        className="btn btn-ghost btn-xs"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                      >
                        Prev
                      </button>
                      {Array.from({ length: pageCount }).map((_, i) => (
                        <button
                          key={i}
                          className={`btn btn-ghost btn-xs${page === i + 1 ? ' btn-active' : ''}`}
                          onClick={() => onPageChange(i + 1)}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        className="btn btn-ghost btn-xs"
                        disabled={page >= pageCount}
                        onClick={() => onPageChange(page + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tfoot>
          )
        })()}
      </table>
    )
  }
  return <table className={cls} />
}

interface TablePartProps {
  className?: string
  children?: any
}

/** 表头容器 */
const Head: FC<TablePartProps> = ({ className, children }) => {
  const cls = className ? className : undefined
  return <thead className={cls}>{children}</thead>
}

/** 表体容器 */
const Body: FC<TablePartProps> = ({ className, children }) => {
  const cls = className ? className : undefined
  return <tbody className={cls}>{children}</tbody>
}

/** 表尾容器 */
const Foot: FC<TablePartProps> = ({ className, children }) => {
  const cls = className ? className : undefined
  return <tfoot className={cls}>{children}</tfoot>
}

/** 行容器 */
const TR: FC<TablePartProps> = ({ className, children }) => {
  const cls = className ? className : undefined
  return <tr className={cls}>{children}</tr>
}

/** 表头单元格 */
const TH: FC<TablePartProps> = ({ className, children }) => {
  let cls = ''
  if (className) cls += ` ${className}`
  return <th className={cls.trim() || undefined}>{children}</th>
}

/** 表体单元格 */
const TD: FC<TablePartProps> = ({ className, children }) => {
  let cls = ''
  if (className) cls += ` ${className}`
  return <td className={cls.trim() || undefined}>{children}</td>
}

type TableCompound = FC<TableProps> & {
  Head: FC<TablePartProps>
  Body: FC<TablePartProps>
  Foot: FC<TablePartProps>
  TR: FC<TablePartProps>
  TH: FC<TablePartProps>
  TD: FC<TablePartProps>
}

const TableCompound: TableCompound = Object.assign(Table, {
  Head,
  Body,
  Foot,
  TR,
  TH,
  TD,
})

export default TableCompound
