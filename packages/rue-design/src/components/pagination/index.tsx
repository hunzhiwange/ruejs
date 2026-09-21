/*
Pagination 组件概述
- 保留 Rue 当前基于 join + btn 的视觉风格，同时补齐更接近成熟组件库的分页能力。
- 同时支持静态组合模式（`Pagination.Item`）与数据驱动模式（`total/current/pageSize`）。
*/
import type { FC } from '@rue-js/rue'
import { effect, ref } from '@rue-js/rue'

/** PaginationDirection 位置或方向类型。 */
export type PaginationDirection = 'horizontal' | 'vertical'
/** PaginationAlign 对齐方式类型。 */
export type PaginationAlign = 'start' | 'center' | 'end'
/** PaginationSize 尺寸类型。 */
export type PaginationSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'large'
/** PaginationItemType 视觉或语义变体类型。 */
export type PaginationItemType = 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next'

/** PaginationSimpleConfig 配置对象。 */
export interface PaginationSimpleConfig {
  /** readOnly 配置项。 */
  readOnly?: boolean
}

/** PaginationLocale 接口。 */
export interface PaginationLocale {
  /** prev 配置项。 */
  prev?: any
  /** next 配置项。 */
  next?: any
  /** jumpPrev 配置项。 */
  jumpPrev?: any
  /** jumpNext 配置项。 */
  jumpNext?: any
  /** pageSuffix 配置项。 */
  pageSuffix?: any
  /** itemsPerPage 配置项。 */
  itemsPerPage?: any
  /** pageTitle 配置项。 */
  pageTitle?: (page: number) => string
  /** jumpTo 配置项。 */
  jumpTo?: any
  /** previousPage 配置项。 */
  previousPage?: any
  /** nextPage 配置项。 */
  nextPage?: any
  /** jumpPrevTitle 配置项。 */
  jumpPrevTitle?: any
  /** jumpNextTitle 配置项。 */
  jumpNextTitle?: any
}

/** PaginationItemRender 自定义渲染函数类型。 */
export type PaginationItemRender = (
  page: number,
  type: PaginationItemType,
  originalElement: any,
) => any
/** PaginationShowTotal 类型。 */
export type PaginationShowTotal = (total: number, range: [number, number]) => any

/** PaginationProps 组件属性。 */
export interface PaginationProps {
  /** 布局方向。 */
  direction?: PaginationDirection
  /** 交叉轴或内容对齐方式。 */
  align?: PaginationAlign
  /** 组件尺寸。 */
  size?: PaginationSize
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** current 配置项。 */
  current?: number
  /** defaultCurrent 配置项。 */
  defaultCurrent?: number
  /** total 配置项。 */
  total?: number
  /** pageSize 尺寸。 */
  pageSize?: number
  /** defaultPageSize 尺寸。 */
  defaultPageSize?: number
  /** 是否禁用交互。 */
  disabled?: boolean
  /** simple 配置项。 */
  simple?: boolean | PaginationSimpleConfig
  /** showSizeChanger 配置项。 */
  showSizeChanger?: boolean
  /** pageSizeOptions 选项配置。 */
  pageSizeOptions?: Array<number | string>
  /** showQuickJumper 配置项。 */
  showQuickJumper?: boolean | { goButton?: any }
  /** showLessItems 配置项。 */
  showLessItems?: boolean
  /** hideOnSinglePage 配置项。 */
  hideOnSinglePage?: boolean
  /** showTitle 配置项。 */
  showTitle?: boolean
  /** showTotal 配置项。 */
  showTotal?: PaginationShowTotal
  /** itemRender 自定义渲染函数。 */
  itemRender?: PaginationItemRender
  /** 值或状态变化时触发的回调。 */
  onChange?: (page: number, pageSize: number) => void
  /** onShowSizeChange 事件回调。 */
  onShowSizeChange?: (current: number, pageSize: number) => void
  /** locale 配置项。 */
  locale?: PaginationLocale
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** PaginationItemProps 组件属性。 */
export interface PaginationItemProps {
  /** tag 配置项。 */
  tag?: any
  /** 是否处于激活态。 */
  active?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 组件尺寸。 */
  size?: PaginationSize
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface PaginationDisplayItem {
  type: PaginationItemType
  page: number
  label: any
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (...values: Array<string | undefined | false>) => {
  return values.filter(Boolean).join(' ')
}

/** clamp 的内部工具函数。 */
const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}

/** 归一化 Positive Int 的内部工具函数。 */
const normalizePositiveInt = (value: any, fallback: number) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.floor(numeric)
}

/** 解析 Size Token 的内部工具函数。 */
const resolveSizeToken = (size?: PaginationSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'middle':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** 解析 Align Class Name 的内部工具函数。 */
const resolveAlignClassName = (align?: PaginationAlign) => {
  switch (align) {
    case 'center':
      return 'justify-center'
    case 'end':
      return 'justify-end'
    default:
      return 'justify-start'
  }
}

/** 构建 Join Class Name 的内部工具函数。 */
const buildJoinClassName = (direction?: PaginationDirection) => {
  let cls = 'join'
  if (direction) cls += ` join-${direction}`
  return cls
}

/** 构建 Button Class Name 的内部工具函数。 */
const buildButtonClassName = (
  size?: PaginationSize,
  active?: boolean,
  disabled?: boolean,
  className?: string,
) => {
  const resolvedSize = resolveSizeToken(size)
  let cls = 'join-item btn'
  if (resolvedSize) cls += ` btn-${resolvedSize}`
  if (active) cls += ' btn-active bg-base-300'
  if (disabled) cls += ' btn-disabled'
  if (className) cls += ` ${className}`
  return cls
}

/** 构建 Select Class Name 的内部工具函数。 */
const buildSelectClassName = (size?: PaginationSize, className?: string) => {
  const resolvedSize = resolveSizeToken(size)
  let cls = 'select select-bordered'
  if (resolvedSize) cls += ` select-${resolvedSize}`
  if (className) cls += ` ${className}`
  return cls
}

/** 构建 Input Class Name 的内部工具函数。 */
const buildInputClassName = (size?: PaginationSize, className?: string) => {
  const resolvedSize = resolveSizeToken(size)
  let cls = 'input input-bordered'
  if (resolvedSize) cls += ` input-${resolvedSize}`
  if (className) cls += ` ${className}`
  return cls
}

/** 构建 Number Input Class Name 的内部工具函数。 */
const buildNumberInputClassName = (size?: PaginationSize, className?: string) => {
  return appendClassName(
    buildInputClassName(size),
    'appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
    className,
  )
}

/** 解析 Number Input Width Class 的内部工具函数。 */
const resolveNumberInputWidthClass = (pageCount: number, mode: 'simple' | 'quick') => {
  const digits = String(Math.max(1, pageCount)).length

  if (mode === 'simple') {
    if (digits <= 2) return 'w-10'
    if (digits === 3) return 'w-12'
    return 'w-14'
  }

  if (digits <= 2) return 'w-14'
  if (digits === 3) return 'w-16'
  return 'w-20'
}

/** 解析 Page Size Select Width Class 的内部工具函数。 */
const resolvePageSizeSelectWidthClass = (options: Array<number | string>) => {
  const maxDigits = options.reduce<number>((result, option) => {
    return Math.max(result, String(option).length)
  }, 2)

  if (maxDigits <= 2) return 'w-16'
  if (maxDigits === 3) return 'w-18'
  return 'w-20'
}

/** 判断 Data Mode 的内部工具函数。 */
const isDataMode = (props: PaginationProps) => {
  return (
    props.current !== undefined ||
    props.defaultCurrent !== undefined ||
    props.total !== undefined ||
    props.pageSize !== undefined ||
    props.defaultPageSize !== undefined ||
    props.simple !== undefined ||
    props.showSizeChanger !== undefined ||
    props.showQuickJumper !== undefined ||
    props.showLessItems !== undefined ||
    props.hideOnSinglePage !== undefined ||
    props.showTotal !== undefined ||
    props.itemRender !== undefined ||
    props.align !== undefined ||
    props.size !== undefined ||
    props.disabled !== undefined ||
    props.onChange !== undefined ||
    props.onShowSizeChange !== undefined ||
    props.pageSizeOptions !== undefined ||
    props.locale !== undefined
  )
}

/** 读取 Range 的内部工具函数。 */
const getRange = (current: number, pageSize: number, total: number): [number, number] => {
  if (total <= 0) return [0, 0]
  const start = (current - 1) * pageSize + 1
  const end = Math.min(total, current * pageSize)
  return [start, end]
}

/** 读取 Display Items 的内部工具函数。 */
const getDisplayItems = (
  current: number,
  pageCount: number,
  showLessItems?: boolean,
): PaginationDisplayItem[] => {
  if (pageCount <= 0) return []

  const items: PaginationDisplayItem[] = []
  const pageBuffer = showLessItems ? 1 : 2
  const jumpStep = showLessItems ? 3 : 5

  if (pageCount <= 5 + pageBuffer * 2) {
    for (let page = 1; page <= pageCount; page += 1) {
      items.push({ type: 'page', page, label: String(page) })
    }
    return items
  }

  const left = Math.max(1, current - pageBuffer)
  const right = Math.min(pageCount, current + pageBuffer)

  items.push({ type: 'page', page: 1, label: '1' })

  if (left > 2) {
    items.push({
      type: 'jump-prev',
      page: Math.max(1, current - jumpStep),
      label: '•••',
    })
  } else {
    for (let page = 2; page < left; page += 1) {
      items.push({ type: 'page', page, label: String(page) })
    }
  }

  for (let page = Math.max(2, left); page <= Math.min(pageCount - 1, right); page += 1) {
    items.push({ type: 'page', page, label: String(page) })
  }

  if (right < pageCount - 1) {
    items.push({
      type: 'jump-next',
      page: Math.min(pageCount, current + jumpStep),
      label: '•••',
    })
  } else {
    for (let page = right + 1; page < pageCount; page += 1) {
      items.push({ type: 'page', page, label: String(page) })
    }
  }

  items.push({ type: 'page', page: pageCount, label: String(pageCount) })
  return items
}

/** Item 的内部工具函数。 */
const Item: FC<PaginationItemProps> = ({
  tag = 'button',
  active,
  disabled,
  size,
  className,
  children,
  ...rest
}) => {
  const Tag = tag as any
  const readProps = () => {
    const props: Record<string, any> = {
      ...rest,
      className: buildButtonClassName(size, active, disabled, className),
    }

    if (active) {
      props['aria-current'] = rest['aria-current'] ?? 'page'
    }

    if (disabled) {
      props['aria-disabled'] = rest['aria-disabled'] ?? true
      if (tag === 'button' || tag === 'input') {
        props.disabled = rest.disabled ?? true
      } else {
        props.role = rest.role ?? 'button'
        props.tabIndex = rest.tabIndex ?? -1
      }
    }

    return props
  }

  return Tag === 'div' ? (
    <div {...readProps()}>{children}</div>
  ) : Tag === 'span' ? (
    <span {...readProps()}>{children}</span>
  ) : Tag === 'button' ? (
    <button {...readProps()}>{children}</button>
  ) : Tag === 'a' ? (
    <a {...readProps()}>{children}</a>
  ) : (
    <></>
  )
}

/** Root 的内部工具函数。 */
const Root: FC<PaginationProps> = ({
  direction,
  align,
  size,
  className,
  children,
  current,
  defaultCurrent,
  total,
  pageSize,
  defaultPageSize,
  disabled,
  simple,
  showSizeChanger,
  pageSizeOptions,
  showQuickJumper,
  showLessItems,
  hideOnSinglePage,
  showTitle = true,
  showTotal,
  itemRender,
  onChange,
  onShowSizeChange,
  locale,
  ...rest
}) => {
  const CompiledRow1 = ({ rowArg0 }: { rowArg0: any }) => {
    const item = rowArg0

    const label =
      item.type === 'jump-prev'
        ? labels.jumpPrev
        : item.type === 'jump-next'
          ? labels.jumpNext
          : item.label

    return (
      <RenderItem
        arg0={item.page}
        arg1={item.type}
        arg2={label}
        arg3={{
          active: item.type === 'page' && item.page === mergedCurrent,
          disabled: item.type !== 'page' ? !!disabled : false,
          title:
            item.type === 'page'
              ? labels.pageTitle(item.page)
              : item.type === 'jump-prev'
                ? labels.jumpPrevTitle
                : labels.jumpNextTitle,
        }}
      />
    )
  }

  if (
    !isDataMode({
      direction,
      align,
      size,
      className,
      children,
      current,
      defaultCurrent,
      total,
      pageSize,
      defaultPageSize,
      disabled,
      simple,
      showSizeChanger,
      pageSizeOptions,
      showQuickJumper,
      showLessItems,
      hideOnSinglePage,
      showTotal,
      itemRender,
      onChange,
      onShowSizeChange,
      locale,
    })
  ) {
    return (
      <div {...rest} className={mergeClassName(buildJoinClassName(direction), className)}>
        {children}
      </div>
    )
  }

  const uncontrolledCurrent = ref(normalizePositiveInt(defaultCurrent ?? current ?? 1, 1))
  const uncontrolledPageSize = ref(normalizePositiveInt(defaultPageSize ?? pageSize ?? 10, 10))
  const mergedPageSize = normalizePositiveInt(pageSize ?? uncontrolledPageSize.value, 10)
  const normalizedTotal = Math.max(0, Number(total) || 0)
  const pageCount = Math.max(1, Math.ceil(normalizedTotal / mergedPageSize))
  const mergedCurrent = clamp(
    normalizePositiveInt(current ?? uncontrolledCurrent.value, 1),
    1,
    pageCount,
  )
  const totalRange = getRange(mergedCurrent, mergedPageSize, normalizedTotal)
  const sizeOptions =
    pageSizeOptions && pageSizeOptions.length > 0
      ? pageSizeOptions.map(option => normalizePositiveInt(option, mergedPageSize))
      : [10, 20, 50, 100]
  const simpleConfig = typeof simple === 'object' ? simple : simple ? {} : undefined
  const quickJumperConfig =
    typeof showQuickJumper === 'object' && showQuickJumper
      ? showQuickJumper
      : showQuickJumper
        ? {}
        : undefined
  const pagerItems = getDisplayItems(mergedCurrent, pageCount, showLessItems)
  const inputDraftPage = ref(mergedCurrent)
  const simpleInputValue = ref(String(mergedCurrent))
  const quickInputValue = ref(String(mergedCurrent))

  effect(() => {
    if (inputDraftPage.value !== mergedCurrent) {
      const syncedValue = String(mergedCurrent)
      inputDraftPage.value = mergedCurrent
      simpleInputValue.value = syncedValue
      quickInputValue.value = syncedValue
    }
  })

  const labels: Required<PaginationLocale> = {
    prev: locale?.prev ?? '‹',
    next: locale?.next ?? '›',
    jumpPrev: locale?.jumpPrev ?? '•••',
    jumpNext: locale?.jumpNext ?? '•••',
    pageSuffix: locale?.pageSuffix ?? '/ page',
    itemsPerPage: locale?.itemsPerPage ?? 'items / page',
    pageTitle: locale?.pageTitle ?? (page => `Page ${page}`),
    jumpTo: locale?.jumpTo ?? 'Go to',
    previousPage: locale?.previousPage ?? 'Previous Page',
    nextPage: locale?.nextPage ?? 'Next Page',
    jumpPrevTitle: locale?.jumpPrevTitle ?? 'Jump Previous Pages',
    jumpNextTitle: locale?.jumpNextTitle ?? 'Jump Next Pages',
  }

  if (hideOnSinglePage && pageCount <= 1) {
    return <></>
  }

  const updatePage = (nextPage: number, nextPageSize = mergedPageSize) => {
    const normalizedPageCount = Math.max(1, Math.ceil(normalizedTotal / nextPageSize))
    const resolvedNextPage = clamp(normalizePositiveInt(nextPage, 1), 1, normalizedPageCount)

    if (current === undefined) {
      uncontrolledCurrent.value = resolvedNextPage
    }
    if (pageSize === undefined && nextPageSize !== mergedPageSize) {
      uncontrolledPageSize.value = nextPageSize
    }
    if (onChange) {
      onChange(resolvedNextPage, nextPageSize)
    }
  }

  const updatePageSize = (nextPageSize: number) => {
    const normalizedNextPageSize = normalizePositiveInt(nextPageSize, mergedPageSize)
    const nextPageCount = Math.max(1, Math.ceil(normalizedTotal / normalizedNextPageSize))
    const nextCurrent = clamp(mergedCurrent, 1, nextPageCount)

    if (pageSize === undefined) {
      uncontrolledPageSize.value = normalizedNextPageSize
    }
    if (current === undefined) {
      uncontrolledCurrent.value = nextCurrent
    }
    if (onShowSizeChange) {
      onShowSizeChange(nextCurrent, normalizedNextPageSize)
    }
    if (onChange) {
      onChange(nextCurrent, normalizedNextPageSize)
    }
  }

  const RenderItem = ({
    arg0: page,
    arg1: type,
    arg2: label,
    arg3: options,
  }: {
    arg0: number
    arg1: PaginationItemType
    arg2: any
    arg3?: {
      active?: boolean
      disabled?: boolean
      title?: string
    }
  }) => {
    const renderedDisabled = !!disabled || !!options?.disabled
    const fallbackContent = label
    const renderedContent = itemRender ? itemRender(page, type, fallbackContent) : fallbackContent
    return (
      <Item
        size={size}
        active={options?.active}
        disabled={renderedDisabled}
        aria-label={type === 'page' ? labels.pageTitle(page) : undefined}
        title={
          showTitle
            ? (options?.title ?? (type === 'page' ? labels.pageTitle(page) : undefined))
            : undefined
        }
        onClick={() => {
          if (renderedDisabled || options?.active) return
          updatePage(page)
        }}
      >
        {renderedContent}
      </Item>
    )
  }

  return (
    <div
      {...rest}
      className={appendClassName(
        'flex flex-wrap items-center gap-3',
        resolveAlignClassName(align),
        className,
      )}
    >
      {showTotal ? (
        <div className="text-sm opacity-70" aria-live="polite">
          {showTotal(normalizedTotal, totalRange)}
        </div>
      ) : null}
      {simpleConfig ? (
        <div className={buildJoinClassName()}>
          <RenderItem
            arg0={Math.max(1, mergedCurrent - 1)}
            arg1={'prev'}
            arg2={labels.prev}
            arg3={{
              disabled: mergedCurrent <= 1,
              title: labels.previousPage,
            }}
          />
          <div
            className={buildInputClassName(
              size,
              'join-item inline-flex shrink-0 items-center gap-1 px-2 text-sm',
            )}
          >
            {simpleConfig.readOnly ? (
              <span className="tabular-nums">{mergedCurrent}</span>
            ) : (
              <input
                key={`simple-${mergedCurrent}-${pageCount}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                max={String(pageCount)}
                value={simpleInputValue.value}
                disabled={disabled}
                className={appendClassName(
                  'border-0 bg-transparent p-0 text-right outline-none appearance-none [appearance:textfield] tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                  resolveNumberInputWidthClass(pageCount, 'simple'),
                )}
                onInput={(event: Event) => {
                  simpleInputValue.value = (event.currentTarget as HTMLInputElement).value
                }}
                onKeyDown={(event: KeyboardEvent) => {
                  if (event.key !== 'Enter') return
                  const target = event.currentTarget as HTMLInputElement
                  updatePage(Number(target.value))
                }}
                onBlur={(event: FocusEvent) => {
                  if (disabled) return
                  const target = event.currentTarget as HTMLInputElement
                  if (target.value === '') {
                    target.value = String(mergedCurrent)
                    simpleInputValue.value = target.value
                    return
                  }
                  updatePage(Number(target.value))
                }}
              />
            )}
            <span className="inline-flex items-center opacity-60">
              {labels.pageSuffix === '/ page'
                ? `/ ${pageCount}`
                : `${labels.pageSuffix} ${pageCount}`}
            </span>
          </div>
          <RenderItem
            arg0={Math.min(pageCount, mergedCurrent + 1)}
            arg1={'next'}
            arg2={labels.next}
            arg3={{
              disabled: mergedCurrent >= pageCount,
              title: labels.nextPage,
            }}
          />
        </div>
      ) : (
        <div className={buildJoinClassName(direction)}>
          <RenderItem
            arg0={Math.max(1, mergedCurrent - 1)}
            arg1={'prev'}
            arg2={labels.prev}
            arg3={{
              disabled: mergedCurrent <= 1,
              title: labels.previousPage,
            }}
          />
          {pagerItems.map((rowArg0: any, rowIndex: number) => (
            <CompiledRow1 rowArg0={rowArg0} />
          ))}
          <RenderItem
            arg0={Math.min(pageCount, mergedCurrent + 1)}
            arg1={'next'}
            arg2={labels.next}
            arg3={{
              disabled: mergedCurrent >= pageCount,
              title: labels.nextPage,
            }}
          />
        </div>
      )}
      {showSizeChanger ? (
        <label className="flex items-center gap-2 text-sm opacity-80">
          <select
            value={String(mergedPageSize)}
            disabled={disabled}
            className={buildSelectClassName(
              size,
              `${resolvePageSizeSelectWidthClass(sizeOptions)} text-center tabular-nums`,
            )}
            onChange={(event: Event) =>
              updatePageSize(Number((event.currentTarget as HTMLSelectElement).value))
            }
          >
            {sizeOptions.map(option => (
              <option key={option} value={String(option)}>
                {option}
              </option>
            ))}
          </select>
          <span>{String(labels.itemsPerPage ?? '')}</span>
        </label>
      ) : null}
      {quickJumperConfig ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-70">{String(labels.jumpTo ?? '')}</span>
          <input
            key={`quick-${mergedCurrent}-${pageCount}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min="1"
            max={String(pageCount)}
            value={quickInputValue.value}
            disabled={disabled}
            className={buildNumberInputClassName(
              size,
              `${resolveNumberInputWidthClass(pageCount, 'quick')} text-center tabular-nums`,
            )}
            onInput={(event: Event) => {
              quickInputValue.value = (event.currentTarget as HTMLInputElement).value
            }}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key !== 'Enter') return
              const target = event.currentTarget as HTMLInputElement
              updatePage(Number(target.value))
            }}
          />
          {quickJumperConfig.goButton != null ? (
            <button
              type="button"
              disabled={disabled}
              className={appendClassName(
                'btn',
                resolveSizeToken(size) ? `btn-${resolveSizeToken(size)}` : undefined,
              )}
              onClick={(event: MouseEvent) => {
                const wrapper = (event.currentTarget as HTMLButtonElement).parentElement
                const input = wrapper?.querySelector('input') as HTMLInputElement | null
                if (!input) return
                updatePage(Number(input.value))
              }}
            >
              {quickJumperConfig.goButton}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

type PaginationCompound = FC<PaginationProps> & {
  Item: FC<PaginationItemProps>
}

const Pagination: PaginationCompound = /*#__PURE__*/ Object.assign(Root, {
  Item,
})

/** 默认导出分页组件。 */
export default Pagination
