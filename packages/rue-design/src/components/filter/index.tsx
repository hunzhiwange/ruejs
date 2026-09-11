/*
Filter 组件概述
- 保留 Rue 当前基于 daisyUI `filter + btn` 的视觉组合。
- 同时支持旧的 `children + Filter.Item/Reset` 方式，以及 `items/value/onChange/reset` 的增强用法。
- 数据驱动模式直接通过 JSX 输出完整 input 属性，适配 Vapor 深编译路径。
*/
import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'

/** FilterMode 类型。 */
export type FilterMode = 'form' | 'div'
/** FilterInputType 视觉或语义变体类型。 */
export type FilterInputType = 'radio' | 'checkbox'
/** FilterTone 语义色类型。 */
export type FilterTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
/** FilterColor 语义色类型。 */
export type FilterColor = 'default' | 'danger' | FilterTone
/** FilterVariant 视觉或语义变体类型。 */
export type FilterVariant = 'solid' | 'filled' | 'outlined' | 'dashed' | 'text'
/** FilterSize 尺寸类型。 */
export type FilterSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'middle' | 'large'
/** FilterValue 值类型。 */
export type FilterValue = string | number | boolean

/** FilterItemChangeMeta 接口。 */
export interface FilterItemChangeMeta {
  /** 受控选中状态。 */
  checked: boolean
  /** 受控值。 */
  value?: FilterValue
  /** item 区域配置。 */
  item?: FilterItemData
}

/** FilterChangeMeta 接口。 */
export interface FilterChangeMeta extends FilterItemChangeMeta {
  /** values 配置项。 */
  values: FilterValue[]
}

/** FilterItemData 数据项结构。 */
export interface FilterItemData {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 展示标签。 */
  label?: any
  /** 受控值。 */
  value?: FilterValue
  /** 受控选中状态。 */
  checked?: boolean
  /** 非受控初始选中状态。 */
  defaultChecked?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件语义色。 */
  color?: FilterColor
  /** 组件尺寸。 */
  size?: FilterSize
  /** 组件视觉变体。 */
  variant?: FilterVariant
  /** 是否处于激活态。 */
  active?: boolean
  /** 标题内容。 */
  title?: string
  /** 表单 name 属性或分组名称。 */
  name?: string
  /** 组件类型或语义类型。 */
  type?: FilterInputType
  /** 值或状态变化时触发的回调。 */
  onChange?: (event: Event, meta: FilterItemChangeMeta) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FilterProps 组件属性。 */
export interface FilterProps {
  /** 自定义渲染的宿主元素。 */
  as?: FilterMode
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<FilterItemData | FilterValue>
  /** 表单 name 属性或分组名称。 */
  name?: string
  /** 组件类型或语义类型。 */
  type?: FilterInputType
  /** multiple 配置项。 */
  multiple?: boolean
  /** 受控值。 */
  value?: FilterValue | ReadonlyArray<FilterValue>
  /** 非受控初始值。 */
  defaultValue?: FilterValue | ReadonlyArray<FilterValue>
  /** 值或状态变化时触发的回调。 */
  onChange?: (
    value: FilterValue | FilterValue[] | undefined,
    event: Event,
    meta: FilterChangeMeta,
  ) => void
  /** 组件尺寸。 */
  size?: FilterSize
  /** 组件语义色。 */
  color?: FilterColor
  /** 组件视觉变体。 */
  variant?: FilterVariant
  /** 是否禁用交互。 */
  disabled?: boolean
  /** itemClassName 附加类名。 */
  itemClassName?: string
  /** reset 配置项。 */
  reset?: boolean | FilterResetProps
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

const FilterDivHost: FC<any> = ({ children, ...rest }) => <div {...rest}>{children}</div>
const FilterFormHost: FC<any> = ({ children, ...rest }) => <form {...rest}>{children}</form>
const FILTER_HOSTS = { div: FilterDivHost, form: FilterFormHost }
const Component = FilterDivHost as any

/** FilterItemProps 组件属性。 */
export interface FilterItemProps extends FilterItemData {}

/** FilterResetProps 组件属性。 */
export interface FilterResetProps {
  /** mode 配置项。 */
  mode?: FilterMode
  /** 展示标签。 */
  label?: any
  /** 受控选中状态。 */
  checked?: boolean
  /** 非受控初始选中状态。 */
  defaultChecked?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件语义色。 */
  color?: FilterColor
  /** 组件尺寸。 */
  size?: FilterSize
  /** 组件视觉变体。 */
  variant?: FilterVariant
  /** 是否处于激活态。 */
  active?: boolean
  /** 值或状态变化时触发的回调。 */
  onChange?: (event: Event) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

let filterNameSeed = 0

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...values: Array<string | undefined>) => {
  return values.filter(Boolean).join(' ').trim()
}

/** omit Nullish Props 的内部工具函数。 */
const omitNullishProps = <T extends Record<string, any>>(values: T) => {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value != null),
  ) as Partial<T>
}

/** 解析 Size Token 的内部工具函数。 */
const resolveSizeToken = (size?: FilterSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'medium':
    case 'middle':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** serialize Value 的内部工具函数。 */
const serializeValue = (value: FilterValue) => {
  switch (typeof value) {
    case 'number':
      return `number:${value}`
    case 'boolean':
      return `boolean:${value ? 'true' : 'false'}`
    default:
      return `string:${value}`
  }
}

/** 判断 Primitive Value 的内部工具函数。 */
const isPrimitiveValue = (value: any): value is FilterValue => {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

/** unique Values 的内部工具函数。 */
const uniqueValues = (values: ReadonlyArray<FilterValue>) => {
  const next: FilterValue[] = []
  values.forEach(value => {
    if (!next.some(current => serializeValue(current) === serializeValue(value))) {
      next.push(value)
    }
  })
  return next
}

/** 归一化 Value List 的内部工具函数。 */
const normalizeValueList = (
  value: FilterValue | ReadonlyArray<FilterValue> | undefined,
  type: FilterInputType,
) => {
  if (value === undefined) return []
  if (Array.isArray(value)) {
    return type === 'checkbox' ? uniqueValues(value) : value.length ? [value[0]] : []
  }
  return [value]
}

/** 归一化 Items 的内部工具函数。 */
const normalizeItems = (items?: ReadonlyArray<FilterItemData | FilterValue>): FilterItemData[] => {
  return (items ?? []).map((item, index) => {
    if (isPrimitiveValue(item)) {
      return {
        key: `${serializeValue(item)}-${index}`,
        label: String(item),
        value: item,
      }
    }

    const label = item.label ?? item['aria-label']
    const fallbackKey =
      item.key ??
      (item.value !== undefined
        ? serializeValue(item.value)
        : typeof label === 'string' || typeof label === 'number' || typeof label === 'boolean'
          ? String(label)
          : `item-${index}`)

    return {
      ...item,
      key: fallbackKey,
    }
  })
}

/** 解析 Variant Class Name 的内部工具函数。 */
const resolveVariantClassName = (variant?: FilterVariant) => {
  switch (variant) {
    case 'outlined':
      return 'btn-outline'
    case 'dashed':
      return 'btn-dash'
    case 'filled':
      return 'btn-soft'
    case 'text':
      return 'btn-ghost'
    default:
      return undefined
  }
}

/** 解析 Button Class Name 的内部工具函数。 */
const resolveButtonClassName = ({
  color,
  size,
  variant,
  active,
  className,
}: {
  color?: FilterColor
  size?: FilterSize
  variant?: FilterVariant
  active?: boolean
  className?: string
}) => {
  let cls = 'btn'
  const resolvedSize = resolveSizeToken(size)
  const resolvedVariant = resolveVariantClassName(variant)

  if (color && color !== 'default') {
    cls += ` btn-${color === 'danger' ? 'error' : color}`
  }
  if (resolvedSize) cls += ` btn-${resolvedSize}`
  if (resolvedVariant) cls += ` ${resolvedVariant}`
  if (active) cls += ' btn-active'
  if (className) cls += ` ${className}`
  return cls
}

/** 解析 Item Label 的内部工具函数。 */
const resolveItemLabel = (label: any, fallbackChildren?: any) => {
  if (label !== undefined) return label
  return fallbackChildren
}

/** 解析 Item Value 的内部工具函数。 */
const resolveItemValue = (props: {
  value?: FilterValue
  label?: any
  ['aria-label']?: any
  children?: any
}) => {
  if (props.value !== undefined) return props.value
  const label = resolveItemLabel(props.label ?? props['aria-label'], props.children)
  return isPrimitiveValue(label) ? label : undefined
}

/** 构建 Managed Item 原生属性的内部工具函数。 */
const buildManagedItemInputProps = (item: FilterItemData) => {
  const {
    key: _key,
    label,
    children,
    checked: _checked,
    defaultChecked: _defaultChecked,
    disabled: _disabled,
    className: _className,
    color: _color,
    size: _size,
    variant: _variant,
    active: _active,
    name: _name,
    type: _type,
    onChange: _onChange,
    ...rest
  } = item
  const itemValue = resolveItemValue(item)
  const itemLabel = resolveItemLabel(label ?? rest['aria-label'], children)
  const inputProps = { ...rest }

  if (
    itemLabel !== undefined &&
    inputProps['aria-label'] === undefined &&
    isPrimitiveValue(itemLabel)
  ) {
    inputProps['aria-label'] = String(itemLabel)
  }
  if (itemValue !== undefined && inputProps.value === undefined) {
    inputProps.value = String(itemValue)
  }

  return inputProps
}

/** Filter 的内部工具函数。 */
const Filter: FC<FilterProps> = ({
  as = 'form',
  className,
  style,
  children,
  items,
  name,
  type,
  multiple,
  value,
  defaultValue,
  onChange,
  size,
  color,
  variant,
  disabled,
  itemClassName,
  reset,
  onClick,
  onReset,
  ...rest
}) => {
  const getRootColor = () => color
  const getRootVariant = () => variant
  const CompiledRow103 = ({ rowArg0 }: { rowArg0: any }) => {
    const entry = rowArg0
    return entry.kind === 'reset' ? (
      <input
        key={`filter-reset-${entry.mode}`}
        {...entry.reset.inputProps}
        name={entry.reset.name}
        type={entry.reset.type}
        defaultChecked={entry.reset.defaultChecked}
        className={entry.reset.className}
        disabled={entry.reset.disabled}
        onPointerDown={(event: Event) => {
          if (entry.mode !== 'form') {
            handleManagedResetClick(event, entry.reset.onChange)
          }
        }}
        onMouseDown={(event: Event) => {
          if (entry.mode !== 'form') {
            handleManagedResetClick(event, entry.reset.onChange)
          }
        }}
        onChange={(event: Event) => {
          if (entry.mode === 'form') {
            entry.reset.onChange?.(event)
          } else {
            handleManagedResetClick(event, entry.reset.onChange)
          }
        }}
      />
    ) : (
      <input
        key={entry.item.key ?? `filter-item-${entry.index}`}
        {...buildManagedItemInputProps(entry.item)}
        data-rue-filter-role="item"
        data-rue-filter-name={entry.item.name}
        data-rue-filter-type={entry.item.type}
        data-rue-filter-size={entry.item.size}
        data-rue-filter-color={entry.item.color}
        data-rue-filter-variant={entry.item.variant}
        data-rue-filter-class-name={entry.item.className}
        data-rue-filter-active={entry.item.active ? 'true' : 'false'}
        data-rue-filter-disabled={disabled || entry.item.disabled ? 'true' : 'false'}
        data-rue-filter-value={
          resolveItemValue(entry.item) !== undefined
            ? serializeValue(resolveItemValue(entry.item) as FilterValue)
            : undefined
        }
        type={entry.item.type ?? resolvedType}
        name={entry.item.name ?? resolvedName}
        checked={hasValue(resolveItemValue(entry.item))}
        defaultChecked={entry.item.defaultChecked}
        disabled={disabled || entry.item.disabled}
        className={resolveButtonClassName({
          color: entry.item.color ?? getRootColor(),
          size: entry.item.size ?? size,
          variant: entry.item.variant ?? getRootVariant(),
          active: entry.item.active || hasValue(resolveItemValue(entry.item)),
          className: mergeClassNames(itemClassName, entry.item.className),
        })}
        onChange={(event: Event) => {
          const nextChecked = (event.target as HTMLInputElement | null)?.checked === true
          const itemValue = resolveItemValue(entry.item)
          const meta = {
            checked: nextChecked,
            value: itemValue,
            item: entry.item,
          }
          entry.item.onChange?.(event, meta)
          handleItemChange(entry.item, itemValue, nextChecked, event)
        }}
      />
    )
  }

  const CompiledRow101 = ({ rowArg0 }: { rowArg0: any }) => {
    const entry = rowArg0
    return entry.kind === 'reset' ? (
      <input
        key={`filter-reset-${entry.mode}`}
        {...entry.reset.inputProps}
        name={entry.reset.name}
        type={entry.reset.type}
        defaultChecked={entry.reset.defaultChecked}
        className={entry.reset.className}
        disabled={entry.reset.disabled}
        onPointerDown={(event: Event) => {
          if (entry.mode !== 'form') {
            handleManagedResetClick(event, entry.reset.onChange)
          }
        }}
        onMouseDown={(event: Event) => {
          if (entry.mode !== 'form') {
            handleManagedResetClick(event, entry.reset.onChange)
          }
        }}
        onChange={(event: Event) => {
          if (entry.mode === 'form') {
            entry.reset.onChange?.(event)
          } else {
            handleManagedResetClick(event, entry.reset.onChange)
          }
        }}
      />
    ) : (
      <input
        key={entry.item.key ?? `filter-item-${entry.index}`}
        {...buildManagedItemInputProps(entry.item)}
        data-rue-filter-role="item"
        data-rue-filter-name={entry.item.name}
        data-rue-filter-type={entry.item.type}
        data-rue-filter-size={entry.item.size}
        data-rue-filter-color={entry.item.color}
        data-rue-filter-variant={entry.item.variant}
        data-rue-filter-class-name={entry.item.className}
        data-rue-filter-active={entry.item.active ? 'true' : 'false'}
        data-rue-filter-disabled={disabled || entry.item.disabled ? 'true' : 'false'}
        data-rue-filter-value={
          resolveItemValue(entry.item) !== undefined
            ? serializeValue(resolveItemValue(entry.item) as FilterValue)
            : undefined
        }
        type={entry.item.type ?? resolvedType}
        name={entry.item.name ?? resolvedName}
        checked={hasValue(resolveItemValue(entry.item))}
        defaultChecked={entry.item.defaultChecked}
        disabled={disabled || entry.item.disabled}
        className={resolveButtonClassName({
          color: entry.item.color ?? getRootColor(),
          size: entry.item.size ?? size,
          variant: entry.item.variant ?? getRootVariant(),
          active: entry.item.active || hasValue(resolveItemValue(entry.item)),
          className: mergeClassNames(itemClassName, entry.item.className),
        })}
        onChange={(event: Event) => {
          const nextChecked = (event.target as HTMLInputElement | null)?.checked === true
          const itemValue = resolveItemValue(entry.item)
          const meta = {
            checked: nextChecked,
            value: itemValue,
            item: entry.item,
          }
          entry.item.onChange?.(event, meta)
          handleItemChange(entry.item, itemValue, nextChecked, event)
        }}
      />
    )
  }

  const normalizedItems = normalizeItems(items)
  const readNormalizedItems = () => (Array.isArray(normalizedItems) ? normalizedItems : [])
  const resolvedType: FilterInputType = multiple ? 'checkbox' : (type ?? 'radio')
  const generatedName = ref(`rue-filter-${++filterNameSeed}`)
  const resolvedName = name ?? (resolvedType === 'radio' ? generatedName.value : undefined)
  const defaultValues = normalizeValueList(defaultValue, resolvedType)
  const controlledValues = ref<FilterValue[]>(normalizeValueList(value, resolvedType))
  const uncontrolledValues = ref<FilterValue[]>(defaultValues)
  const controlledMode = ref(value !== undefined)
  const isControlled = () => controlledMode.value
  const getCurrentValues = () => {
    const values = isControlled() ? controlledValues.value : uncontrolledValues.value
    return Array.isArray(values) ? values : []
  }
  const hasValue = (itemValue: FilterValue | undefined) =>
    itemValue !== undefined &&
    getCurrentValues().some(current => serializeValue(current) === serializeValue(itemValue))

  const emitChange = (
    nextValues: FilterValue[],
    event: Event,
    item?: FilterItemData,
    checked = false,
  ) => {
    const normalizedNext = normalizeValueList(nextValues, resolvedType)
    if (isControlled()) {
      if (onChange) {
        controlledValues.value = normalizedNext
      }
    } else {
      uncontrolledValues.value = normalizedNext
    }
    if (onChange) {
      onChange(resolvedType === 'checkbox' ? normalizedNext : normalizedNext[0], event, {
        checked,
        value: item ? resolveItemValue(item) : undefined,
        item,
        values: normalizedNext,
      })
    }
  }

  const handleItemChange = (
    item: FilterItemData,
    itemValue: FilterValue | undefined,
    checked: boolean,
    event: Event,
  ) => {
    const currentValues = getCurrentValues()

    if (itemValue === undefined) {
      emitChange(currentValues, event, item, checked)
      return
    }

    if (resolvedType === 'checkbox') {
      const hasValue = currentValues.some(
        current => serializeValue(current) === serializeValue(itemValue),
      )
      const nextValues = checked
        ? hasValue
          ? currentValues
          : [...currentValues, itemValue]
        : currentValues.filter(current => serializeValue(current) !== serializeValue(itemValue))
      emitChange(nextValues, event, item, checked)
      return
    }

    emitChange(checked ? [itemValue] : [], event, item, checked)
  }

  const clearSelection = (event: Event) => {
    emitChange([], event, undefined, false)
  }

  const restoreDefaultSelection = (event: Event) => {
    emitChange(defaultValues, event, undefined, false)
  }

  const resetProps = typeof reset === 'object' ? reset : undefined
  const resolvedResetMode = resetProps?.mode ?? as
  const renderResetAfterItems = resolvedType === 'checkbox' && resolvedResetMode === 'form'

  const handleManagedResetClick = (event: Event, resetOnChange?: (event: Event) => void) => {
    const markedEvent = event as Event & { __rueFilterResetHandled?: boolean }
    if (markedEvent.__rueFilterResetHandled) return
    markedEvent.__rueFilterResetHandled = true
    resetOnChange?.(event)
    clearSelection(event)
  }

  const handleGroupClick = (event: Event) => {
    if (readNormalizedItems().length === 0) return
    const target = event.target as HTMLElement | null
    if (
      !target ||
      target.dataset.rueFilterRole !== 'reset' ||
      (target.dataset.rueFilterMode as FilterMode | undefined) === 'form'
    ) {
      return
    }
    handleManagedResetClick(event, resetProps?.onChange)
  }

  const createManagedResetProps = ({
    mode: resetMode,
    name: resetName,
    checked: resetChecked,
  }: {
    mode: FilterMode
    name?: string
    checked?: boolean
  }) => {
    const {
      mode: _mode,
      label,
      checked: _checked,
      defaultChecked,
      disabled: resetDisabled,
      className: resetClassName,
      color: resetColor,
      size: resetSize,
      variant: resetVariant,
      active: resetActive,
      onChange: resetOnChange,
      ...resetRest
    } = resetProps ?? {}
    const resolvedLabel = resolveItemLabel(label ?? resetRest['aria-label'] ?? resetRest.value, '×')
    const domProps = { ...resetRest }
    let mergedClassName = resolveButtonClassName({
      color: resetColor ?? color,
      size: resetSize ?? size,
      variant: resetVariant ?? variant,
      active: resetActive || resetChecked,
      className: mergeClassNames(itemClassName, resetClassName),
    })

    if (resetMode === 'form') {
      mergedClassName += ' btn-square'
      if (domProps.value === undefined && isPrimitiveValue(resolvedLabel)) {
        domProps.value = String(resolvedLabel)
      }
    } else {
      mergedClassName += ' filter-reset'
      if (domProps['aria-label'] === undefined && isPrimitiveValue(resolvedLabel)) {
        domProps['aria-label'] = String(resolvedLabel)
      }
    }

    const dataProps = omitNullishProps({
      'data-rue-filter-role': 'reset',
      'data-rue-filter-mode': resetMode,
      'data-rue-filter-name': resetName ?? domProps.name,
      'data-rue-filter-size': resetSize,
      'data-rue-filter-color': resetColor,
      'data-rue-filter-variant': resetVariant,
      'data-rue-filter-class-name': resetClassName,
      'data-rue-filter-disabled': disabled || resetDisabled ? 'true' : 'false',
    })
    const inputProps = omitNullishProps({
      ...domProps,
      ...dataProps,
    })

    return {
      inputProps,
      label: resolvedLabel,
      name: resetName ?? domProps.name,
      type: domProps.type ?? (resetMode === 'form' ? 'reset' : 'radio'),
      defaultChecked,
      className: mergedClassName,
      disabled: disabled || resetDisabled,
      onChange: resetOnChange,
    }
  }

  const leadingResetProps =
    !renderResetAfterItems && reset
      ? createManagedResetProps({
          mode: resolvedResetMode,
          name:
            resolvedResetMode === 'div' && resolvedType === 'radio'
              ? resolvedName
              : resetProps?.name,
        })
      : undefined
  const trailingResetProps =
    renderResetAfterItems && reset
      ? createManagedResetProps({
          mode: 'form',
          name: resetProps?.name,
        })
      : undefined
  const managedEntries = [
    ...(leadingResetProps
      ? [{ kind: 'reset' as const, mode: resolvedResetMode, reset: leadingResetProps }]
      : []),
    ...readNormalizedItems().map((item, index) => ({ kind: 'item' as const, item, index })),
    ...(trailingResetProps
      ? [{ kind: 'reset' as const, mode: 'form' as const, reset: trailingResetProps }]
      : []),
  ]

  return as === 'div' ? (
    <div
      registry={FILTER_HOSTS}
      {...rest}
      style={style}
      onReset={(event: Event) => {
        restoreDefaultSelection(event)
        if (onReset) onReset(event)
      }}
      onClick={(event: Event) => {
        handleGroupClick(event)
        if (onClick) onClick(event)
      }}
      className={mergeClassNames(
        resolvedType === 'radio' ? 'filter' : 'flex flex-wrap gap-1',
        className,
      )}
      data-rue-filter-group="true"
      data-rue-filter-mode={as}
      data-rue-filter-type={resolvedType}
    >
      {readNormalizedItems().length > 0 ? (
        <>
          {managedEntries.map((rowArg0: any, rowIndex: number) => (
            <CompiledRow101 rowArg0={rowArg0} />
          ))}
        </>
      ) : (
        children
      )}
    </div>
  ) : as === 'form' ? (
    <form
      registry={FILTER_HOSTS}
      {...rest}
      style={style}
      onReset={(event: Event) => {
        restoreDefaultSelection(event)
        if (onReset) onReset(event)
      }}
      onClick={(event: Event) => {
        handleGroupClick(event)
        if (onClick) onClick(event)
      }}
      className={mergeClassNames(
        resolvedType === 'radio' ? 'filter' : 'flex flex-wrap gap-1',
        className,
      )}
      data-rue-filter-group="true"
      data-rue-filter-mode={as}
      data-rue-filter-type={resolvedType}
    >
      {readNormalizedItems().length > 0 ? (
        <>
          {managedEntries.map((rowArg0: any, rowIndex: number) => (
            <CompiledRow103 rowArg0={rowArg0} />
          ))}
        </>
      ) : (
        children
      )}
    </form>
  ) : (
    <></>
  )
}

/** Item 的内部工具函数。 */
const Item: FC<FilterItemProps> = ({
  label,
  children,
  checked,
  defaultChecked,
  disabled,
  className,
  color,
  size,
  variant,
  active,
  name,
  type,
  onChange,
  ...rest
}) => {
  const mergedType = type ?? 'radio'
  const mergedName = name
  const mergedDisabled = !!disabled
  const mergedValue = resolveItemValue({
    value: rest.value,
    label: label ?? rest['aria-label'],
    children,
  })
  const mergedAriaLabel = resolveItemLabel(label ?? rest['aria-label'], children)
  const mergedClassName = resolveButtonClassName({
    color,
    size,
    variant,
    active,
    className,
  })
  const domProps = { ...rest }

  if (
    mergedAriaLabel !== undefined &&
    domProps['aria-label'] === undefined &&
    isPrimitiveValue(mergedAriaLabel)
  ) {
    domProps['aria-label'] = String(mergedAriaLabel)
  }
  if (mergedValue !== undefined && domProps.value === undefined) {
    domProps.value = String(mergedValue)
  }

  const dataProps = omitNullishProps({
    'data-rue-filter-role': 'item',
    'data-rue-filter-name': mergedName,
    'data-rue-filter-type': type,
    'data-rue-filter-size': size,
    'data-rue-filter-color': color,
    'data-rue-filter-variant': variant,
    'data-rue-filter-class-name': className,
    'data-rue-filter-active': active ? 'true' : 'false',
    'data-rue-filter-disabled': mergedDisabled ? 'true' : 'false',
    'data-rue-filter-value': mergedValue !== undefined ? serializeValue(mergedValue) : undefined,
  })
  const inputProps = omitNullishProps({
    ...domProps,
    ...dataProps,
  })

  return (
    <input
      {...inputProps}
      name={mergedName}
      type={mergedType}
      checked={checked}
      defaultChecked={defaultChecked}
      className={mergedClassName}
      disabled={mergedDisabled}
      onChange={(event: Event) => {
        const nextChecked = (event.target as HTMLInputElement | null)?.checked === true
        if (onChange) {
          onChange(event, {
            checked: nextChecked,
            value: mergedValue,
            item: {
              ...rest,
              label: mergedAriaLabel,
              value: mergedValue,
              checked,
              defaultChecked,
              disabled: mergedDisabled,
              className,
              color,
              size,
              variant,
              active,
              name: mergedName,
              type: mergedType,
            },
          })
        }
      }}
    />
  )
}

/** Reset 的内部工具函数。 */
const Reset: FC<FilterResetProps> = ({
  mode,
  label,
  checked,
  defaultChecked,
  disabled,
  className,
  color,
  size,
  variant,
  active,
  onChange,
  ...rest
}) => {
  const resolvedMode = mode ?? 'div'
  const mergedDisabled = !!disabled
  const resolvedLabel = resolveItemLabel(label ?? rest['aria-label'] ?? rest.value, '×')
  let mergedClassName = resolveButtonClassName({
    color,
    size,
    variant,
    active: active || checked,
    className,
  })
  const domProps = { ...rest }

  if (resolvedMode === 'form') {
    mergedClassName += ' btn-square'
    if (domProps.value === undefined && isPrimitiveValue(resolvedLabel)) {
      domProps.value = String(resolvedLabel)
    }
  } else {
    mergedClassName += ' filter-reset'
    if (domProps['aria-label'] === undefined && isPrimitiveValue(resolvedLabel)) {
      domProps['aria-label'] = String(resolvedLabel)
    }
  }

  const dataProps = omitNullishProps({
    'data-rue-filter-role': 'reset',
    'data-rue-filter-mode': resolvedMode,
    'data-rue-filter-name': domProps.name,
    'data-rue-filter-size': size,
    'data-rue-filter-color': color,
    'data-rue-filter-variant': variant,
    'data-rue-filter-class-name': className,
    'data-rue-filter-disabled': mergedDisabled ? 'true' : 'false',
  })
  const inputProps = omitNullishProps({
    ...domProps,
    ...dataProps,
  })

  return (
    <input
      {...inputProps}
      name={domProps.name}
      type={domProps.type ?? (resolvedMode === 'form' ? 'reset' : 'radio')}
      checked={checked}
      defaultChecked={defaultChecked}
      className={mergedClassName}
      disabled={mergedDisabled}
      onChange={(event: Event) => {
        if (onChange) onChange(event)
      }}
    />
  )
}

type FilterCompound = FC<FilterProps> & {
  Item: FC<FilterItemProps>
  Reset: FC<FilterResetProps>
}

const FilterCompound: FilterCompound = /*#__PURE__*/ Object.assign(Filter, {
  Item,
  Reset,
})

/** 默认导出过滤器组件。 */
export default FilterCompound
