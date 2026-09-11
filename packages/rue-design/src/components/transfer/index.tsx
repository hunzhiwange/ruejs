/*
Transfer 组件概述
- 提供接近成熟组件库的双栏穿梭能力，覆盖受控 / 非受控、搜索、分页、单向模式与自定义渲染。
- 视觉上延续 Rue 当前的轻量卡片语言，不直接照搬特定组件库，而是以 badge / card / btn / checkbox 语义重组交互。
- 数据模型保持 `dataSource + targetKeys + selectedKeys` 主线，便于延续常见穿梭框组件的使用心智。
*/
import type { FC } from '@rue-js/rue'
import { computed, ref, useRef } from '@rue-js/rue'

const TransferText: FC<{ value: string }> = ({ value }) => <span>{String(value)}</span>

/** TransferKey 标识键类型。 */
export type TransferKey = string | number
/** TransferDirection 位置或方向类型。 */
export type TransferDirection = 'left' | 'right'
/** TransferStatus 状态类型。 */
export type TransferStatus = 'warning' | 'error'
/** TransferSize 尺寸类型。 */
export type TransferSize = 'small' | 'default' | 'middle' | 'large' | 'sm' | 'md' | 'lg'

/** TransferItem 数据项结构。 */
export interface TransferItem {
  /** 数据项唯一标识。 */
  key?: TransferKey
  /** 标题内容。 */
  title?: string | number
  /** 描述内容。 */
  description?: string | number
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** TransferRenderResultObject 接口。 */
export interface TransferRenderResultObject {
  /** 展示标签。 */
  label: string | number
  /** 受控值。 */
  value?: string
  /** 描述内容。 */
  description?: string | number
}

/** TransferRenderResult 类型。 */
export type TransferRenderResult = TransferRenderResultObject | string | number | null
/** TransferRender 自定义渲染函数类型。 */
export type TransferRender<RecordType> = (item: RecordType) => TransferRenderResult

/** TransferLocale 接口。 */
export interface TransferLocale {
  /** titles 配置项。 */
  titles?: any[]
  /** notFoundContent 配置项。 */
  notFoundContent?: any | any[]
  /** searchPlaceholder 配置项。 */
  searchPlaceholder?: any
  /** itemUnit 配置项。 */
  itemUnit?: string
  /** itemsUnit 配置项。 */
  itemsUnit?: string
  /** remove 配置项。 */
  remove?: any
  /** selectAll 配置项。 */
  selectAll?: any
  /** deselectAll 配置项。 */
  deselectAll?: any
  /** selectInvert 配置项。 */
  selectInvert?: any
  /** clearSelection 配置项。 */
  clearSelection?: any
  /** removeSelected 配置项。 */
  removeSelected?: any
}

/** TransferSearchConfig 配置对象。 */
export interface TransferSearchConfig {
  /** 占位内容。 */
  placeholder?: string
  /** 非受控初始值。 */
  defaultValue?: string
}

/** TransferPaginationConfig 配置对象。 */
export interface TransferPaginationConfig {
  /** pageSize 尺寸。 */
  pageSize?: number
}

/** TransferListStyleInfo 接口。 */
export interface TransferListStyleInfo {
  /** 布局方向。 */
  direction: TransferDirection
}

/** TransferClassNames 局部类名配置。 */
export interface TransferClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** panel 区域配置。 */
  panel?: string
  /** 头部区域内容。 */
  header?: string
  /** search 配置项。 */
  search?: string
  /** 主体区域配置。 */
  body?: string
  /** list 区域配置。 */
  list?: string
  /** item 区域配置。 */
  item?: string
  /** operations 配置项。 */
  operations?: string
  /** 底部区域内容。 */
  footer?: string
  /** empty 配置项。 */
  empty?: string
  /** pager 配置项。 */
  pager?: string
}

/** TransferStyles 局部样式配置。 */
export interface TransferStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** panel 区域配置。 */
  panel?: Record<string, any>
  /** 头部区域内容。 */
  header?: Record<string, any>
  /** search 配置项。 */
  search?: Record<string, any>
  /** 主体区域配置。 */
  body?: Record<string, any>
  /** list 区域配置。 */
  list?: Record<string, any>
  /** item 区域配置。 */
  item?: Record<string, any>
  /** operations 配置项。 */
  operations?: Record<string, any>
  /** 底部区域内容。 */
  footer?: Record<string, any>
  /** empty 配置项。 */
  empty?: Record<string, any>
  /** pager 配置项。 */
  pager?: Record<string, any>
}

/** TransferRenderListItem 数据项结构。 */
export interface TransferRenderListItem<RecordType = TransferItem> {
  /** 数据项唯一标识。 */
  key: TransferKey
  /** record 配置项。 */
  record: RecordType
  /** 是否禁用交互。 */
  disabled: boolean
  /** 展示标签。 */
  label: string | number
  /** 描述内容。 */
  description?: string | number
  /** searchText 文本内容。 */
  searchText: string
}

/** TransferRenderListProps 组件属性。 */
export interface TransferRenderListProps<RecordType = TransferItem> {
  /** 布局方向。 */
  direction: TransferDirection
  /** 是否禁用交互。 */
  disabled: boolean
  /** 数据驱动渲染项。 */
  items: TransferRenderListItem<RecordType>[]
  /** filteredItems 配置项。 */
  filteredItems: TransferRenderListItem<RecordType>[]
  /** selectedKeys 标识键集合。 */
  selectedKeys: TransferKey[]
  /** searchValue 值。 */
  searchValue: string
  /** onItemSelect 事件回调。 */
  onItemSelect: (key: TransferKey, selected: boolean) => void
  /** onItemSelectAll 事件回调。 */
  onItemSelectAll: (keys: TransferKey[], selected: boolean) => void
}

/** TransferProps 组件属性。 */
export interface TransferProps<RecordType = TransferItem> {
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 组件尺寸。 */
  size?: TransferSize
  /** 组件状态。 */
  status?: TransferStatus
  /** 数据源。 */
  dataSource?: RecordType[]
  /** targetKeys 标识键集合。 */
  targetKeys?: TransferKey[]
  /** defaultTargetKeys 标识键集合。 */
  defaultTargetKeys?: TransferKey[]
  /** selectedKeys 标识键集合。 */
  selectedKeys?: TransferKey[]
  /** defaultSelectedKeys 标识键集合。 */
  defaultSelectedKeys?: TransferKey[]
  /** render 配置项。 */
  render?: TransferRender<RecordType>
  /** 值或状态变化时触发的回调。 */
  onChange?: (
    targetKeys: TransferKey[],
    direction: TransferDirection,
    moveKeys: TransferKey[],
  ) => void
  /** onSelectChange 事件回调。 */
  onSelectChange?: (sourceSelectedKeys: TransferKey[], targetSelectedKeys: TransferKey[]) => void
  /** titles 配置项。 */
  titles?: any[]
  /** operations 配置项。 */
  operations?: any[]
  /** 操作区内容。 */
  actions?: any[]
  /** showSearch 配置项。 */
  showSearch?: boolean | TransferSearchConfig
  /** filterOption 配置项。 */
  filterOption?: (inputValue: string, item: RecordType, direction: TransferDirection) => boolean
  /** locale 配置项。 */
  locale?: TransferLocale
  /** 底部区域内容。 */
  footerFormatter?: (
    props: TransferRenderListProps<RecordType>,
    info: { direction: TransferDirection },
  ) => string | number
  footer?: (
    props: TransferRenderListProps<RecordType>,
    info: { direction: TransferDirection },
  ) => any
  children?: (props: TransferRenderListProps<RecordType>) => any
  renderList?: (props: TransferRenderListProps<RecordType>) => any
  /** listVariant 配置项。 */
  listVariant?: 'checkboxes' | 'buttons'
  /** rowKey 标识键。 */
  rowKey?: (record: RecordType) => TransferKey
  /** 搜索文本变化时触发的回调。 */
  onSearch?: (direction: TransferDirection, value: string) => void
  /** onScroll 事件回调。 */
  onScroll?: (direction: TransferDirection, event: Event) => void
  /** 组件子内容。 */

  /** showSelectAll 配置项。 */
  showSelectAll?: boolean
  /** selectAllLabels 配置项。 */
  selectAllLabels?: Array<any | ((info: { selectedCount: number; totalCount: number }) => any)>
  /** oneWay 配置项。 */
  oneWay?: boolean
  /** pagination 配置项。 */
  pagination?: boolean | TransferPaginationConfig
  /** listStyle 内联样式。 */
  listStyle?: Record<string, any> | ((info: TransferListStyleInfo) => Record<string, any>)
  /** operationStyle 内联样式。 */
  operationStyle?: Record<string, any>
  /** 按局部区域覆盖的类名集合。 */
  classNames?: TransferClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: TransferStyles
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedTransferItem<RecordType> extends TransferRenderListItem<RecordType> {
  keyText: string
}

interface TransferPageSlice<RecordType> {
  currentPage: number
  pageCount: number
  items: NormalizedTransferItem<RecordType>[]
}

interface TransferStateSnapshot<RecordType> {
  mergedTargetKeys: TransferKey[]
  mergedSelectedKeys: TransferKey[]
  sourceSelectedKeys: TransferKey[]
  targetSelectedKeys: TransferKey[]
  sourceItems: NormalizedTransferItem<RecordType>[]
  targetItems: NormalizedTransferItem<RecordType>[]
}

type TransferSelectAllLabel = NonNullable<TransferProps<any>['selectAllLabels']>[number]

/** 解析 Display Label 的内部工具函数。 */
const resolveDisplayLabel = <RecordType,>(item: NormalizedTransferItem<RecordType>) => {
  if (typeof item.label === 'string' || typeof item.label === 'number') return item.label
  return resolveFallbackLabel(item.record, item.key)
}

const defaultLocale: Required<TransferLocale> = {
  titles: ['待选择', '已加入'],
  notFoundContent: '暂无条目',
  searchPlaceholder: '搜索条目',
  itemUnit: '项',
  itemsUnit: '项',
  remove: '移出',
  selectAll: '全选',
  deselectAll: '取消全选',
  selectInvert: '反选',
  clearSelection: '清空选择',
  removeSelected: '移出已选',
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base?: string, className?: string) => {
  if (!base) return className ?? ''
  return className ? `${base} ${className}` : base
}

/** 转换为 Key Text 的内部工具函数。 */
const toKeyText = (key: TransferKey) => `${typeof key}:${String(key)}`

/** uniq Keys 的内部工具函数。 */
const uniqKeys = (keys?: ReadonlyArray<TransferKey>) => {
  const next: TransferKey[] = []
  const seen = /*#__PURE__*/ new Set<string>()

  ;(keys ?? []).forEach(key => {
    const keyText = toKeyText(key)
    if (seen.has(keyText)) return
    seen.add(keyText)
    next.push(key)
  })

  return next
}

/** 判断是否存在 Key 的内部工具函数。 */
const hasKey = (keys: ReadonlyArray<TransferKey>, key: TransferKey) => {
  const keyText = toKeyText(key)
  return keys.some(current => toKeyText(current) === keyText)
}

/** remove Keys 的内部工具函数。 */
const removeKeys = (keys: ReadonlyArray<TransferKey>, keysToRemove: ReadonlyArray<TransferKey>) => {
  const removeSet = /*#__PURE__*/ new Set(keysToRemove.map(toKeyText))
  return keys.filter(key => !removeSet.has(toKeyText(key)))
}

/** stringify Search Part 的内部工具函数。 */
const stringifySearchPart = (value: any): string => {
  if (value == null || typeof value === 'boolean') return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return value
      .map(item => stringifySearchPart(item))
      .filter(Boolean)
      .join(' ')
  }
  if (typeof value === 'object') {
    const candidateFields = ['value', 'title', 'label', 'name', 'description', 'text', 'children']
    return candidateFields
      .map(field => stringifySearchPart(value[field]))
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

/** 解析 Fallback Label 的内部工具函数。 */
const resolveFallbackLabel = (record: any, key: TransferKey) => {
  const candidates = [record?.title, record?.label, record?.name, record?.text, record?.description]
  const matched = candidates.find(candidate => candidate !== undefined && candidate !== null)
  return matched ?? String(key)
}

/** 归一化 Render Result 的内部工具函数。 */
const normalizeRenderResult = <RecordType,>(
  record: RecordType,
  key: TransferKey,
  render?: TransferRender<RecordType>,
) => {
  const rendered = render ? render(record) : undefined

  if (rendered && typeof rendered === 'object' && !Array.isArray(rendered) && 'label' in rendered) {
    const result = rendered as TransferRenderResultObject
    return {
      label: result.label,
      description: result.description,
      searchText:
        stringifySearchPart(result.value) ||
        stringifySearchPart(result.label) ||
        stringifySearchPart((record as any)?.description) ||
        stringifySearchPart(resolveFallbackLabel(record, key)),
    }
  }

  if (rendered !== undefined && rendered !== null) {
    return {
      label: rendered,
      description: (record as any)?.description,
      searchText:
        stringifySearchPart(rendered) ||
        stringifySearchPart((record as any)?.description) ||
        stringifySearchPart(resolveFallbackLabel(record, key)),
    }
  }

  return {
    label: resolveFallbackLabel(record, key),
    description: (record as any)?.description,
    searchText: [
      stringifySearchPart((record as any)?.title),
      stringifySearchPart((record as any)?.label),
      stringifySearchPart((record as any)?.name),
      stringifySearchPart((record as any)?.description),
      stringifySearchPart(key),
    ]
      .filter(Boolean)
      .join(' '),
  }
}

/** 解析 Record Key 的内部工具函数。 */
const resolveRecordKey = <RecordType,>(
  record: RecordType,
  index: number,
  rowKey?: (record: RecordType) => TransferKey,
) => {
  if (typeof rowKey === 'function') return rowKey(record)
  if ((record as any)?.key !== undefined && (record as any)?.key !== null)
    return (record as any).key
  return index
}

/** 归一化 Data Source 的内部工具函数。 */
const normalizeDataSource = <RecordType,>(
  dataSource: RecordType[] | undefined,
  rowKey?: (record: RecordType) => TransferKey,
  render?: TransferRender<RecordType>,
) => {
  const seen = /*#__PURE__*/ new Set<string>()

  return (dataSource ?? []).flatMap<NormalizedTransferItem<RecordType>>((record, index) => {
    const key = resolveRecordKey(record, index, rowKey)
    const keyText = toKeyText(key)
    if (seen.has(keyText)) return []
    seen.add(keyText)

    const result = normalizeRenderResult(record, key, render)
    return [
      {
        key,
        keyText,
        record,
        disabled: !!(record as any)?.disabled,
        label: result.label,
        description: result.description,
        searchText: result.searchText,
      },
    ]
  })
}

/** 解析 Titles 的内部工具函数。 */
const resolveTitles = (titles?: any[], localeTitles?: any[]) => {
  const resolved = Array.isArray(titles)
    ? titles
    : Array.isArray(localeTitles)
      ? localeTitles
      : defaultLocale.titles
  return [resolved[0] ?? defaultLocale.titles[0], resolved[1] ?? defaultLocale.titles[1]]
}

/** 解析 Not Found Content 的内部工具函数。 */
const resolveNotFoundContent = (
  notFoundContent: any | any[] | undefined,
  direction: TransferDirection,
) => {
  if (Array.isArray(notFoundContent)) {
    return notFoundContent[direction === 'left' ? 0 : 1] ?? defaultLocale.notFoundContent
  }
  return notFoundContent ?? defaultLocale.notFoundContent
}

/** 归一化 Search Config 的内部工具函数。 */
const normalizeSearchConfig = (showSearch?: boolean | TransferSearchConfig) => {
  if (!showSearch)
    return { enabled: false, placeholder: defaultLocale.searchPlaceholder, defaultValue: '' }
  if (typeof showSearch === 'object') {
    return {
      enabled: true,
      placeholder: showSearch.placeholder ?? defaultLocale.searchPlaceholder,
      defaultValue: showSearch.defaultValue ?? '',
    }
  }
  return { enabled: true, placeholder: defaultLocale.searchPlaceholder, defaultValue: '' }
}

/** 归一化 Pagination 的内部工具函数。 */
const normalizePagination = (pagination?: boolean | TransferPaginationConfig) => {
  if (!pagination) return null
  if (pagination === true) return { pageSize: 10 }
  return { pageSize: Math.max(1, Math.floor(pagination.pageSize ?? 10)) }
}

/** 解析 List Style 的内部工具函数。 */
const resolveListStyle = (
  listStyle: TransferProps['listStyle'],
  direction: TransferDirection,
): Record<string, any> | undefined => {
  if (!listStyle) return undefined
  if (typeof listStyle === 'function') return listStyle({ direction })
  return listStyle
}

/** partition Selected Keys 的内部工具函数。 */
const partitionSelectedKeys = <RecordType,>(
  keys: ReadonlyArray<TransferKey>,
  targetKeySet: Set<string>,
  itemMap: Map<string, NormalizedTransferItem<RecordType>>,
) => {
  const left: TransferKey[] = []
  const right: TransferKey[] = []

  keys.forEach(key => {
    const keyText = toKeyText(key)
    if (!itemMap.has(keyText)) return
    if (targetKeySet.has(keyText)) right.push(key)
    else left.push(key)
  })

  return { left, right }
}

/** filter Items 的内部工具函数。 */
const filterItems = <RecordType,>(
  items: NormalizedTransferItem<RecordType>[],
  inputValue: string,
  direction: TransferDirection,
  filterOption?: (inputValue: string, item: RecordType, direction: TransferDirection) => boolean,
) => {
  const trimmedValue = inputValue.trim()
  if (!trimmedValue) return items

  return items.filter(item => {
    if (filterOption) return filterOption(trimmedValue, item.record, direction)
    return item.searchText.toLowerCase().includes(trimmedValue.toLowerCase())
  })
}

/** paginate Items 的内部工具函数。 */
const paginateItems = <RecordType,>(
  items: NormalizedTransferItem<RecordType>[],
  page: number,
  pageSize?: number,
): TransferPageSlice<RecordType> => {
  if (!pageSize) {
    return {
      currentPage: 1,
      pageCount: 1,
      items,
    }
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(Math.max(page, 1), pageCount)
  const start = (currentPage - 1) * pageSize

  return {
    currentPage,
    pageCount,
    items: items.slice(start, start + pageSize),
  }
}

/** 解析 Unit Label 的内部工具函数。 */
const resolveUnitLabel = (total: number, locale: Required<TransferLocale>) => {
  return total === 1 ? locale.itemUnit : locale.itemsUnit
}

/** 解析 Select All Label 的内部工具函数。 */
const resolveSelectAllLabel = (
  label: TransferSelectAllLabel | undefined,
  info: { selectedCount: number; totalCount: number },
) => {
  if (typeof label === 'function') return label(info)
  return label
}

/** 解析 Size Config 的内部工具函数。 */
const resolveSizeConfig = (size?: TransferSize) => {
  switch (size) {
    case 'small':
    case 'sm':
      return {
        inputClass: 'input-sm',
        buttonClass: 'btn-sm',
        checkboxSize: 'sm' as const,
        itemClass: 'px-3 py-2 text-sm',
        panelMinHeightClass: 'min-h-[19rem]',
      }
    case 'large':
    case 'lg':
      return {
        inputClass: 'input-md',
        buttonClass: 'btn-md',
        checkboxSize: 'md' as const,
        itemClass: 'px-4 py-3.5 text-[0.95rem]',
        panelMinHeightClass: 'min-h-[23rem]',
      }
    default:
      return {
        inputClass: 'input-sm',
        buttonClass: 'btn-sm',
        checkboxSize: 'sm' as const,
        itemClass: 'px-3.5 py-2.5 text-sm',
        panelMinHeightClass: 'min-h-[21rem]',
      }
  }
}

/** 解析 Status Class Name 的内部工具函数。 */
const resolveStatusClassName = (status?: TransferStatus) => {
  switch (status) {
    case 'error':
      return 'border-error/55 shadow-[0_0_0_1px_rgba(248,113,113,0.14)]'
    case 'warning':
      return 'border-warning/55 shadow-[0_0_0_1px_rgba(251,191,36,0.14)]'
    default:
      return ''
  }
}

/** 解析 Checkbox Class Name 的内部工具函数。 */
const resolveCheckboxClassName = (size?: 'sm' | 'md') => {
  if (size === 'md') return 'checkbox checkbox-md'
  return 'checkbox checkbox-sm'
}

/** Arrow Right Icon 的内部工具函数。 */
const ArrowRightIcon: FC = () => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m13 6 6 6-6 6" />
    </svg>
  )
}

/** Arrow Left Icon 的内部工具函数。 */
const ArrowLeftIcon: FC = () => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m11 18-6-6 6-6" />
    </svg>
  )
}

/** Close Icon 的内部工具函数。 */
const CloseIcon: FC = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-3.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

interface TransferManagedPanelProps {
  direction: TransferDirection
  rawItems: NormalizedTransferItem<any>[]
  sideSelectedKeys: TransferKey[]
  searchValue: string
  currentPage: number
  disabled?: boolean
  filterOption?: TransferProps<any>['filterOption']
  footerFormatter?: TransferProps<any>['footerFormatter']
  listStyle?: TransferProps<any>['listStyle']
  oneWay?: boolean
  onScroll?: TransferProps<any>['onScroll']
  selectAllLabels: NonNullable<TransferProps<any>['selectAllLabels']>
  showSelectAll: boolean
  status?: TransferStatus
  classNames?: TransferClassNames
  styles?: TransferStyles
  paginationPageSize?: number
  searchEnabled: boolean
  sizeConfig: ReturnType<typeof resolveSizeConfig>
  mergedLocale: Required<TransferLocale>
  title: any
  sharedSearchPlaceholder: string
  listVariant: 'checkboxes' | 'buttons'
  getTransferStateSnapshot: () => TransferStateSnapshot<any>
  onItemSelect: (key: TransferKey, selected: boolean) => void
  onItemSelectAll: (keys: TransferKey[], selected: boolean) => void
  onReplaceSideSelection: (nextSideSelectedKeys: TransferKey[]) => void
  onMoveItems: (direction: TransferDirection, moveKeys: TransferKey[]) => void
  onSearchInput: (value: string) => void
  assignSearchInputRef: (element: HTMLInputElement | null) => void
  searchComposingRef: { current: boolean | undefined }
  setCurrentPage: (nextPage: number) => void
}

/** Transfer Managed Panel 的内部工具函数。 */
const TransferManagedPanel: FC<TransferManagedPanelProps> = ({
  direction,
  rawItems,
  sideSelectedKeys,
  searchValue,
  currentPage,
  disabled,
  filterOption,
  footerFormatter,
  listStyle,
  oneWay,
  onScroll,
  selectAllLabels,
  showSelectAll,
  status,
  classNames,
  styles,
  paginationPageSize,
  searchEnabled,
  sizeConfig,
  mergedLocale,
  title,
  sharedSearchPlaceholder,
  listVariant,
  getTransferStateSnapshot,
  onItemSelect,
  onItemSelectAll,
  onReplaceSideSelection,
  onMoveItems,
  onSearchInput,
  assignSearchInputRef,
  searchComposingRef,
  setCurrentPage,
}) => {
  const CompiledRow1 = ({
    rowArg0,
    variant,
  }: {
    rowArg0: any
    variant: 'checkboxes' | 'buttons'
  }) => {
    const item = rowArg0

    const checked = hasKey(safeSideSelectedKeys.get(), item.key)
    const removable = oneWay && direction === 'right' && !disabled && !item.disabled

    return (
      <li key={item.keyText}>
        {variant === 'buttons' ? (
          <button
            type="button"
            data-rue-transfer-choice={item.keyText}
            aria-pressed={checked ? 'true' : 'false'}
            disabled={disabled || item.disabled}
            onClick={() => onItemSelect(item.key, !checked)}
          >
            <TransferText value={String(resolveDisplayLabel(item) ?? '')} />
          </button>
        ) : (
          <label
            className={appendClassName(
              appendClassName(
                appendClassName(
                  `flex w-full items-start gap-3 rounded-2xl border border-base-300/75 bg-base-100/80 ${safeSizeConfig.get().itemClass} transition duration-200 ease-out hover:border-base-300 hover:bg-base-100 hover:shadow-sm`,
                  checked
                    ? 'border-primary/45 bg-primary/6 shadow-[0_14px_28px_-24px_rgba(59,130,246,0.75)]'
                    : '',
                ),
                disabled || item.disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
              ),
              classNames?.item,
            )}
            style={styles?.item}
          >
            <span className="shrink-0 pt-0.5">
              <input
                type="checkbox"
                className={resolveCheckboxClassName(safeSizeConfig.get().checkboxSize)}
                checked={checked}
                disabled={disabled || item.disabled}
                onChange={(event: Event) =>
                  onItemSelect(item.key, (event.currentTarget as HTMLInputElement).checked)
                }
              />
            </span>
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="min-w-0 truncate font-medium leading-5 text-base-content">
                  <TransferText value={String(resolveDisplayLabel(item) ?? '')} />
                </div>
                {item.description ? (
                  <div className="mt-1 text-xs leading-5 text-base-content/60">
                    <TransferText value={String(item.description ?? '')} />
                  </div>
                ) : null}
              </div>
              {removable ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs -mt-1 -mr-1 rounded-full text-base-content/55 hover:text-base-content"
                  aria-label={String(safeLocale.get().remove)}
                  onClick={(event: MouseEvent) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onMoveItems('left', [item.key])
                  }}
                >
                  <CloseIcon />
                </button>
              ) : null}
            </div>
          </label>
        )}
      </li>
    )
  }

  const panelVariant = computed(() => listVariant)
  const sideIndex = computed(() => (direction === 'left' ? 0 : 1))
  const safeRawItems = computed(() => (Array.isArray(rawItems) ? rawItems : []))
  const safeSideSelectedKeys = computed(() =>
    Array.isArray(sideSelectedKeys) ? sideSelectedKeys : [],
  )
  const safeSelectAllLabels = computed(() =>
    Array.isArray(selectAllLabels) ? selectAllLabels : [],
  )
  const safeSizeConfig = computed(() => sizeConfig ?? resolveSizeConfig())
  const safeLocale = computed(() => ({ ...defaultLocale, ...mergedLocale }))
  const safeSearchComposingRef = computed(() => searchComposingRef ?? { current: false })
  const filteredItems = computed(() =>
    filterItems(safeRawItems.get(), searchValue, direction, filterOption),
  )
  const pagedItems = computed(() =>
    paginateItems(filteredItems.get(), currentPage, paginationPageSize),
  )

  const visibleItems = computed(() => pagedItems.get().items)
  const visibleSelectableKeys = computed(() =>
    visibleItems
      .get()
      .filter(item => !disabled && !item.disabled)
      .map(item => item.key),
  )
  const visibleSelectedCount = computed(
    () => visibleSelectableKeys.get().filter(key => hasKey(safeSideSelectedKeys.get(), key)).length,
  )
  const visibleAllSelected = computed(
    () =>
      visibleSelectableKeys.get().length > 0 &&
      visibleSelectedCount.get() === visibleSelectableKeys.get().length,
  )
  const visiblePartiallySelected = computed(
    () => visibleSelectedCount.get() > 0 && !visibleAllSelected.get(),
  )
  const filteredSelectableKeys = computed(() =>
    filteredItems
      .get()
      .filter(item => !disabled && !item.disabled)
      .map(item => item.key),
  )
  const snapshot = computed(() => getTransferStateSnapshot())
  const removableSelectedKeys = computed(() =>
    direction === 'right'
      ? snapshot
          .get()
          .targetItems.filter(
            item => hasKey(snapshot.get().targetSelectedKeys, item.key) && !item.disabled,
          )
          .map(item => item.key)
      : [],
  )

  const listRenderProps = computed(() => ({
    direction,
    disabled: !!disabled,
    items: visibleItems.get().map(item => ({
      key: item.key,
      record: item.record,
      disabled: item.disabled,
      label: resolveDisplayLabel(item),
      description: item.description,
      searchText: item.searchText,
    })),
    filteredItems: filteredItems.get().map(item => ({
      key: item.key,
      record: item.record,
      disabled: item.disabled,
      label: resolveDisplayLabel(item),
      description: item.description,
      searchText: item.searchText,
    })),
    selectedKeys: safeSideSelectedKeys.get(),
    searchValue,
    onItemSelect,
    onItemSelectAll,
  }))

  const selectionBadge = computed(() =>
    resolveSelectAllLabel(safeSelectAllLabels.get()[sideIndex.get()], {
      selectedCount: visibleSelectedCount.get(),
      totalCount: visibleSelectableKeys.get().length,
    }),
  )

  const panelClassName = computed(() =>
    appendClassName(
      appendClassName(
        `relative overflow-hidden rounded-[1.35rem] border border-base-300/70 bg-gradient-to-b from-base-100 via-base-100 to-base-200/35 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)] ${safeSizeConfig.get().panelMinHeightClass}`,
        resolveStatusClassName(status),
      ),
      classNames?.panel,
    ),
  )

  const panelStyle = computed(() => ({
    ...styles?.panel,
    ...resolveListStyle(listStyle, direction),
  }))

  const footerText = computed(() =>
    footerFormatter
      ? String(
          footerFormatter(
            {
              ...listRenderProps.get(),
              items: [...listRenderProps.get().items],
              filteredItems: [...listRenderProps.get().filteredItems],
              selectedKeys: [...listRenderProps.get().selectedKeys],
            },
            { direction },
          ) ?? '',
        )
      : '',
  )
  const DefaultListContentView = () => (
    <>
      {' '}
      {visibleItems.get().length ? (
        <ul role="listbox" aria-multiselectable="true" className="space-y-2">
          {visibleItems.get().map((rowArg0: any, rowIndex: number) => (
            <CompiledRow1 key={rowArg0.keyText} rowArg0={rowArg0} variant={panelVariant.get()} />
          ))}
        </ul>
      ) : (
        <div
          className={appendClassName(
            'grid h-full place-items-center px-6 py-8 text-center text-sm text-base-content/55',
            classNames?.empty,
          )}
          style={styles?.empty}
        >
          <div>
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-base-200/80 text-base-content/35">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="size-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M7 4h10l1 3H6l1-3Z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 10v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"
                />
              </svg>
            </div>
            <div>
              <TransferText
                value={String(
                  resolveNotFoundContent(safeLocale.get().notFoundContent, direction) ?? '',
                )}
              />
            </div>
          </div>
        </div>
      )}{' '}
    </>
  )

  return (
    <section
      className={panelClassName.get()}
      style={panelStyle.get()}
      data-rue-transfer-panel={direction}
    >
      <div
        className={appendClassName(
          'flex min-h-16 flex-wrap items-start justify-between gap-3 border-b border-base-300/70 px-4 py-4',
          classNames?.header,
        )}
        style={styles?.header}
      >
        <div
          className="min-w-0 flex-1"
          style={direction === 'right' && oneWay ? { flex: 4 } : undefined}
        >
          <div className="flex flex-wrap items-center gap-2">
            {showSelectAll ? (
              <label
                className={appendClassName(
                  'mr-1 inline-flex items-center',
                  disabled || visibleSelectableKeys.get().length === 0
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer',
                )}
              >
                <input
                  ref={(element: HTMLInputElement | null) => {
                    if (element) element.indeterminate = visiblePartiallySelected.get()
                  }}
                  type="checkbox"
                  className={resolveCheckboxClassName(safeSizeConfig.get().checkboxSize)}
                  checked={visibleAllSelected.get()}
                  disabled={disabled || visibleSelectableKeys.get().length === 0}
                  aria-label={`${String(title)}全选`}
                  onChange={(event: Event) =>
                    onItemSelectAll(
                      visibleSelectableKeys.get(),
                      (event.currentTarget as HTMLInputElement).checked,
                    )
                  }
                />
              </label>
            ) : null}
            <h3 className="m-0 truncate text-sm font-semibold text-base-content md:text-[0.95rem]">
              <TransferText value={String(title)} />
            </h3>
            <span className="badge badge-ghost badge-sm rounded-full px-2.5">
              <TransferText value={String(safeSideSelectedKeys.get().length)} />/
              <TransferText value={String(safeRawItems.get().length)} />{' '}
              <TransferText
                value={String(resolveUnitLabel(safeRawItems.get().length, safeLocale.get()) ?? '')}
              />
            </span>
            {filteredItems.get().length !== safeRawItems.get().length ? (
              <span className="text-xs text-base-content/55">
                匹配 <TransferText value={String(filteredItems.get().length)} />
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-1.5 text-xs md:w-auto md:justify-end">
          {selectionBadge.get() ? (
            <span className="badge badge-outline badge-sm">
              <TransferText value={String(selectionBadge.get() ?? '')} />
            </span>
          ) : null}
          {showSelectAll && visibleSelectableKeys.get().length > 0 ? (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-xs min-h-0 rounded-full px-2"
                disabled={disabled}
                onClick={() => onItemSelectAll(filteredSelectableKeys.get(), true)}
              >
                <TransferText value={String(safeLocale.get().selectAll ?? '')} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs min-h-0 rounded-full px-2"
                disabled={disabled}
                onClick={() => {
                  const invertedKeys = filteredSelectableKeys
                    .get()
                    .filter(key => !hasKey(safeSideSelectedKeys.get(), key))
                  onReplaceSideSelection([
                    ...removeKeys(safeSideSelectedKeys.get(), filteredSelectableKeys.get()),
                    ...invertedKeys,
                  ])
                }}
              >
                <TransferText value={String(safeLocale.get().selectInvert ?? '')} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs min-h-0 rounded-full px-2"
                disabled={disabled || safeSideSelectedKeys.get().length === 0}
                onClick={() => onItemSelectAll(safeSideSelectedKeys.get(), false)}
              >
                <TransferText value={String(safeLocale.get().clearSelection ?? '')} />
              </button>
            </>
          ) : null}
          {oneWay && direction === 'right' ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs min-h-0 rounded-full px-2"
              disabled={disabled || removableSelectedKeys.get().length === 0}
              onClick={() => onMoveItems('left', removableSelectedKeys.get())}
            >
              <TransferText value={String(safeLocale.get().removeSelected ?? '')} />
            </button>
          ) : null}
        </div>
      </div>

      {searchEnabled ? (
        <div
          className={appendClassName('border-b border-base-300/70 px-4 py-3', classNames?.search)}
          style={styles?.search}
        >
          <label className="input input-bordered flex w-full items-center gap-2 rounded-2xl border-base-300/80 bg-base-100/85 px-3 shadow-sm focus-within:border-primary/45 focus-within:outline-none">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-4 text-base-content/50"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={assignSearchInputRef}
              type="text"
              value={searchValue}
              placeholder={sharedSearchPlaceholder}
              className={appendClassName(
                `grow bg-transparent ${safeSizeConfig.get().inputClass}`,
                'border-none px-0 outline-none',
              )}
              onCompositionStart={() => {
                safeSearchComposingRef.get().current = true
              }}
              onCompositionEnd={(event: Event) => {
                safeSearchComposingRef.get().current = false
                onSearchInput((event.currentTarget as HTMLInputElement).value)
              }}
              onInput={(event: Event) =>
                safeSearchComposingRef.get().current
                  ? undefined
                  : onSearchInput((event.currentTarget as HTMLInputElement).value)
              }
            />
          </label>
        </div>
      ) : null}

      <div className={appendClassName('flex flex-col', classNames?.body)} style={styles?.body}>
        <div
          className={appendClassName('h-80 overflow-auto px-3 py-3', classNames?.list)}
          style={styles?.list}
          onScroll={(event: Event) => {
            if (onScroll) onScroll(direction, event)
          }}
        >
          <DefaultListContentView />
        </div>

        {paginationPageSize != null && filteredItems.get().length > 0 ? (
          <div
            className={appendClassName(
              'flex items-center justify-between border-t border-base-300/70 px-4 py-3 text-xs text-base-content/65',
              classNames?.pager,
            )}
            style={styles?.pager}
          >
            <span>
              第 <TransferText value={String(pagedItems.get().currentPage)} /> /{' '}
              <TransferText value={String(pagedItems.get().pageCount)} /> 页
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-xs rounded-full"
                disabled={pagedItems.get().currentPage <= 1}
                onClick={() => setCurrentPage(pagedItems.get().currentPage - 1)}
              >
                上一页
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs rounded-full"
                disabled={pagedItems.get().currentPage >= pagedItems.get().pageCount}
                onClick={() => setCurrentPage(pagedItems.get().currentPage + 1)}
              >
                下一页
              </button>
            </div>
          </div>
        ) : null}

        {footerFormatter ? (
          <div
            className={appendClassName('border-t border-base-300/70 px-4 py-3', classNames?.footer)}
            style={styles?.footer}
            data-rue-transfer-footer={direction}
          >
            <TransferText value={footerText.get()} />
          </div>
        ) : null}
      </div>
    </section>
  )
}

/** Transfer 的内部工具函数。 */
const Transfer: FC<TransferProps<any>> = ({
  className,
  style,
  disabled,
  size,
  status,
  dataSource,
  targetKeys,
  defaultTargetKeys,
  selectedKeys,
  defaultSelectedKeys,
  render,
  onChange,
  onSelectChange,
  titles,
  operations,
  actions,
  showSearch,
  filterOption,
  locale,
  footerFormatter,
  listVariant = 'checkboxes',
  rowKey,
  onSearch,
  onScroll,

  showSelectAll = true,
  selectAllLabels = [],
  oneWay,
  pagination,
  listStyle,
  operationStyle,
  classNames,
  styles,
  ...rest
}: TransferProps<any>) => {
  const mergedLocale: Required<TransferLocale> = {
    ...defaultLocale,
    ...locale,
  }
  const searchConfig = normalizeSearchConfig(showSearch)
  const paginationConfig = normalizePagination(pagination)
  const sizeConfig = resolveSizeConfig(size)
  const readUncontrolledTargetKeys = () =>
    Array.isArray(uncontrolledTargetKeysRef.value) ? uncontrolledTargetKeysRef.value : []
  const readUncontrolledSelectedKeys = () =>
    Array.isArray(uncontrolledSelectedKeysRef.value) ? uncontrolledSelectedKeysRef.value : []

  const uncontrolledTargetKeysRef = ref(uniqKeys(defaultTargetKeys ?? targetKeys))
  const uncontrolledSelectedKeysRef = ref(uniqKeys(defaultSelectedKeys ?? selectedKeys))
  const leftSearchValueRef = ref(searchConfig.defaultValue)
  const rightSearchValueRef = ref(searchConfig.defaultValue)
  const leftPageRef = ref(1)
  const rightPageRef = ref(1)
  const leftSearchInputRef = useRef<HTMLInputElement>()
  const rightSearchInputRef = useRef<HTMLInputElement>()
  const leftSearchComposingRef = useRef(false)
  const rightSearchComposingRef = useRef(false)
  const leftPanelHostRef = useRef<HTMLElement>()
  const rightPanelHostRef = useRef<HTMLElement>()
  const pendingSearchFocusRef = useRef<TransferDirection | null>(null)

  const normalizedItems = normalizeDataSource(dataSource, rowKey, render)
  const readNormalizedItems = () => (Array.isArray(normalizedItems) ? normalizedItems : [])
  const itemMap = /*#__PURE__*/ new Map(readNormalizedItems().map(item => [item.keyText, item]))

  const mergedActions = Array.isArray(actions)
    ? actions
    : Array.isArray(operations)
      ? operations
      : ['加入', '移出']
  const [sourceTitle, targetTitle] = resolveTitles(titles, mergedLocale.titles)
  const moveRightLabel = mergedActions[0] ?? defaultLocale.selectAll
  const moveLeftLabel = mergedActions[1] ?? defaultLocale.remove
  const sharedSearchPlaceholder = searchConfig.placeholder || String(mergedLocale.searchPlaceholder)

  const getTransferStateSnapshot = () => {
    const mergedTargetKeys = (
      targetKeys !== undefined ? uniqKeys(targetKeys) : readUncontrolledTargetKeys()
    ).filter(key => itemMap.has(toKeyText(key)))
    const targetKeySet = /*#__PURE__*/ new Set(mergedTargetKeys.map(toKeyText))
    const mergedSelectedKeys = (
      selectedKeys !== undefined ? uniqKeys(selectedKeys) : readUncontrolledSelectedKeys()
    ).filter(key => itemMap.has(toKeyText(key)))
    const selectedPartitions = partitionSelectedKeys(mergedSelectedKeys, targetKeySet, itemMap)
    const sourceItems = readNormalizedItems().filter(item => !targetKeySet.has(item.keyText))
    const targetItems = mergedTargetKeys
      .map(key => itemMap.get(toKeyText(key)))
      .filter(Boolean) as NormalizedTransferItem<any>[]

    return {
      mergedTargetKeys,
      mergedSelectedKeys,
      sourceSelectedKeys: selectedPartitions.left,
      targetSelectedKeys: selectedPartitions.right,
      sourceItems,
      targetItems,
    }
  }

  const emitSelectChange = (
    nextSelectedKeys: TransferKey[],
    nextTargetKeys = getTransferStateSnapshot().mergedTargetKeys,
  ) => {
    if (!onSelectChange) return
    const nextTargetSet = /*#__PURE__*/ new Set(nextTargetKeys.map(toKeyText))
    const partitions = partitionSelectedKeys(nextSelectedKeys, nextTargetSet, itemMap)
    onSelectChange(partitions.left, partitions.right)
  }

  const managedPanelSharedProps = {
    disabled,
    filterOption,
    footerFormatter,
    listStyle,
    oneWay,
    onScroll,
    selectAllLabels,
    showSelectAll,
    status,
    classNames,
    styles,
  }

  const focusSearchInput = (direction: TransferDirection) => {
    const refInput = direction === 'left' ? leftSearchInputRef.current : rightSearchInputRef.current
    const panelHost = direction === 'left' ? leftPanelHostRef.current : rightPanelHostRef.current
    const input =
      refInput && refInput.isConnected
        ? refInput
        : (panelHost?.querySelector('input[type="text"]') as HTMLInputElement | null | undefined)
    if (!input) return false
    if (direction === 'left') {
      leftSearchInputRef.current = input
    } else {
      rightSearchInputRef.current = input
    }
    input.focus()
    if (typeof document !== 'undefined' && document.activeElement === input) {
      pendingSearchFocusRef.current = null
      return true
    }
    return false
  }

  const requestSearchInputFocus = (direction: TransferDirection) => {
    pendingSearchFocusRef.current = direction
    queueMicrotask(() => {
      if (focusSearchInput(direction)) return
      setTimeout(() => {
        focusSearchInput(direction)
      }, 0)
    })
  }

  const SourcePanel = () => {
    const snapshot = computed(getTransferStateSnapshot)
    return (
      <TransferManagedPanel
        {...managedPanelSharedProps}
        direction="left"
        rawItems={snapshot.get().sourceItems}
        sideSelectedKeys={snapshot.get().sourceSelectedKeys}
        searchValue={leftSearchValueRef.value}
        currentPage={leftPageRef.value}
        paginationPageSize={paginationConfig?.pageSize}
        searchEnabled={searchConfig.enabled}
        sizeConfig={sizeConfig}
        mergedLocale={mergedLocale}
        title={sourceTitle}
        sharedSearchPlaceholder={sharedSearchPlaceholder}
        listVariant={listVariant}
        getTransferStateSnapshot={getTransferStateSnapshot}
        onItemSelect={(key: TransferKey, selected: boolean) =>
          handleItemSelect('left', key, selected)
        }
        onItemSelectAll={(keys: TransferKey[], selected: boolean) =>
          handleItemSelectAll('left', keys, selected)
        }
        onReplaceSideSelection={(nextSideSelectedKeys: TransferKey[]) =>
          mergeSideSelection('left', nextSideSelectedKeys)
        }
        onMoveItems={moveItems}
        onSearchInput={(value: string) => handleSearchInput('left', value)}
        assignSearchInputRef={(element: HTMLInputElement | null) => {
          leftSearchInputRef.current = element ?? undefined
          if (element && pendingSearchFocusRef.current === 'left') {
            requestSearchInputFocus('left')
          }
        }}
        searchComposingRef={leftSearchComposingRef}
        setCurrentPage={(nextPage: number) => {
          requestSearchInputFocus('left')
          leftPageRef.value = nextPage
        }}
      />
    )
  }

  const TargetPanel = () => {
    const snapshot = computed(getTransferStateSnapshot)
    return (
      <TransferManagedPanel
        {...managedPanelSharedProps}
        direction="right"
        rawItems={snapshot.get().targetItems}
        sideSelectedKeys={snapshot.get().targetSelectedKeys}
        searchValue={rightSearchValueRef.value}
        currentPage={rightPageRef.value}
        paginationPageSize={paginationConfig?.pageSize}
        searchEnabled={searchConfig.enabled}
        sizeConfig={sizeConfig}
        mergedLocale={mergedLocale}
        title={targetTitle}
        sharedSearchPlaceholder={sharedSearchPlaceholder}
        listVariant={listVariant}
        getTransferStateSnapshot={getTransferStateSnapshot}
        onItemSelect={(key: TransferKey, selected: boolean) =>
          handleItemSelect('right', key, selected)
        }
        onItemSelectAll={(keys: TransferKey[], selected: boolean) =>
          handleItemSelectAll('right', keys, selected)
        }
        onReplaceSideSelection={(nextSideSelectedKeys: TransferKey[]) =>
          mergeSideSelection('right', nextSideSelectedKeys)
        }
        onMoveItems={moveItems}
        onSearchInput={(value: string) => handleSearchInput('right', value)}
        assignSearchInputRef={(element: HTMLInputElement | null) => {
          rightSearchInputRef.current = element ?? undefined
          if (element && pendingSearchFocusRef.current === 'right') {
            requestSearchInputFocus('right')
          }
        }}
        searchComposingRef={rightSearchComposingRef}
        setCurrentPage={(nextPage: number) => {
          requestSearchInputFocus('right')
          rightPageRef.value = nextPage
        }}
      />
    )
  }
  const commitSelectedKeys = (
    nextSelectedKeys: TransferKey[],
    nextTargetKeys = getTransferStateSnapshot().mergedTargetKeys,
  ) => {
    const cleanedKeys = uniqKeys(nextSelectedKeys).filter(key => itemMap.has(toKeyText(key)))
    if (selectedKeys === undefined) {
      uncontrolledSelectedKeysRef.value = cleanedKeys
    }
    emitSelectChange(cleanedKeys, nextTargetKeys)
  }

  const commitTargetKeys = (
    nextTargetKeys: TransferKey[],
    direction: TransferDirection,
    moveKeys: TransferKey[],
    nextSelectedKeys: TransferKey[],
  ) => {
    const cleanedTargetKeys = uniqKeys(nextTargetKeys).filter(key => itemMap.has(toKeyText(key)))
    if (targetKeys === undefined) {
      uncontrolledTargetKeysRef.value = cleanedTargetKeys
    }
    commitSelectedKeys(nextSelectedKeys, cleanedTargetKeys)
    if (onChange) onChange(cleanedTargetKeys, direction, moveKeys)
  }

  const mergeSideSelection = (
    direction: TransferDirection,
    nextSideSelectedKeys: TransferKey[],
  ) => {
    const snapshot = getTransferStateSnapshot()
    const normalizedNextSideSelectedKeys = uniqKeys(nextSideSelectedKeys)
    const nextSelectedKeys =
      direction === 'left'
        ? [...normalizedNextSideSelectedKeys, ...snapshot.targetSelectedKeys]
        : [...snapshot.sourceSelectedKeys, ...normalizedNextSideSelectedKeys]

    commitSelectedKeys(nextSelectedKeys)
  }

  const handleItemSelect = (direction: TransferDirection, key: TransferKey, selected: boolean) => {
    const item = itemMap.get(toKeyText(key))
    if (!item || disabled || item.disabled) return

    const snapshot = getTransferStateSnapshot()
    const currentKeys =
      direction === 'left' ? snapshot.sourceSelectedKeys : snapshot.targetSelectedKeys
    const nextKeys = selected
      ? uniqKeys([...currentKeys, key])
      : currentKeys.filter(current => toKeyText(current) !== toKeyText(key))

    mergeSideSelection(direction, nextKeys)
  }

  const handleItemSelectAll = (
    direction: TransferDirection,
    keys: TransferKey[],
    selected: boolean,
  ) => {
    const snapshot = getTransferStateSnapshot()
    const currentKeys =
      direction === 'left' ? snapshot.sourceSelectedKeys : snapshot.targetSelectedKeys
    const nextKeys = selected ? uniqKeys([...currentKeys, ...keys]) : removeKeys(currentKeys, keys)
    mergeSideSelection(direction, nextKeys)
  }

  const moveItems = (direction: TransferDirection, moveKeys: TransferKey[]) => {
    if (!moveKeys.length) return
    const snapshot = getTransferStateSnapshot()
    if (direction === 'right') {
      const nextTargetKeys = uniqKeys([...snapshot.mergedTargetKeys, ...moveKeys])
      const nextSelectedKeys = removeKeys(snapshot.mergedSelectedKeys, moveKeys)
      commitTargetKeys(nextTargetKeys, 'right', moveKeys, nextSelectedKeys)
      return
    }

    const moveKeySet = /*#__PURE__*/ new Set(moveKeys.map(toKeyText))
    const nextTargetKeys = snapshot.mergedTargetKeys.filter(key => !moveKeySet.has(toKeyText(key)))
    const nextSelectedKeys = removeKeys(snapshot.mergedSelectedKeys, moveKeys)
    commitTargetKeys(nextTargetKeys, 'left', moveKeys, nextSelectedKeys)
  }

  const moveToRight = () => {
    const snapshot = getTransferStateSnapshot()
    const moveKeys = snapshot.sourceItems
      .filter(item => hasKey(snapshot.sourceSelectedKeys, item.key) && !item.disabled)
      .map(item => item.key)
    moveItems('right', moveKeys)
  }

  const moveToLeft = () => {
    const snapshot = getTransferStateSnapshot()
    const moveKeys = snapshot.targetItems
      .filter(item => hasKey(snapshot.targetSelectedKeys, item.key) && !item.disabled)
      .map(item => item.key)
    moveItems('left', moveKeys)
  }

  const handleSearchInput = (direction: TransferDirection, value: string) => {
    const currentValue = direction === 'left' ? leftSearchValueRef.value : rightSearchValueRef.value
    const currentPage = direction === 'left' ? leftPageRef.value : rightPageRef.value

    if (currentValue === value && currentPage === 1) {
      return
    }

    if (direction === 'left') {
      leftSearchValueRef.value = value
      leftPageRef.value = 1
    } else {
      rightSearchValueRef.value = value
      rightPageRef.value = 1
    }
    if (onSearch) onSearch(direction, value)
  }

  const RenderOperationButton = ({
    arg0: direction,
    arg1: content,
    arg2: buttonDisabled,
  }: {
    arg0: TransferDirection
    arg1: any
    arg2: boolean
  }) => {
    const baseClassName = appendClassName(
      `btn btn-outline ${sizeConfig.buttonClass} min-w-24 rounded-2xl shadow-sm`,
      direction === 'right'
        ? 'border-primary/25 hover:border-primary hover:bg-primary/6'
        : 'border-base-300',
    )

    return (
      <button
        type="button"
        disabled={buttonDisabled}
        className={baseClassName}
        onClick={direction === 'right' ? moveToRight : moveToLeft}
      >
        <span className="inline-flex items-center gap-2">
          {direction === 'left' && !oneWay ? <ArrowLeftIcon /> : null}
          <span>
            <TransferText value={String(content ?? '')} />
          </span>
          {direction === 'right' ? <ArrowRightIcon /> : null}
        </span>
      </button>
    )
  }

  const RenderOperations = () => {
    const snapshot = computed(getTransferStateSnapshot)
    const canMoveRight = snapshot
      .get()
      .sourceItems.some(
        item => hasKey(snapshot.get().sourceSelectedKeys, item.key) && !item.disabled,
      )
    const canMoveLeft = snapshot
      .get()
      .targetItems.some(
        item => hasKey(snapshot.get().targetSelectedKeys, item.key) && !item.disabled,
      )

    return (
      <div
        className={appendClassName(
          'flex flex-row items-center justify-center gap-2 lg:flex-col',
          classNames?.operations,
        )}
        style={{ ...styles?.operations, ...operationStyle }}
      >
        <RenderOperationButton
          arg0={'right'}
          arg1={moveRightLabel}
          arg2={disabled || !canMoveRight}
        />
        {!oneWay ? (
          <RenderOperationButton
            arg0={'left'}
            arg1={moveLeftLabel}
            arg2={disabled || !canMoveLeft}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div
      {...rest}
      className={appendClassName(
        appendClassName(
          'rue-transfer grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch',
          classNames?.root,
        ),
        className,
      )}
      style={{ ...styles?.root, ...style }}
      data-rue-transfer="true"
    >
      <div ref={leftPanelHostRef}>
        <SourcePanel />
      </div>
      <RenderOperations />
      <div ref={rightPanelHostRef}>
        <TargetPanel />
      </div>
    </div>
  )
}

/** 默认导出穿梭框组件。 */
export default Transfer
