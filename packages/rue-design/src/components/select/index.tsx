/*
Select 组件概述
- 默认保持原生 select 语义与浏览器下拉行为；只有在传入前后缀、附加说明或清空能力时，才增加轻量 shell 包裹。
- `mode="multiple"` 默认进入紧凑下拉多选，已选项以标签形式展示；显式传入 `nativeSize` 或原生 `multiple` 时仍回退到浏览器 listbox。
- 支持 options / fieldNames / placeholder / allowClear / status / variant / 多选上限等增强能力，同时继续兼容原有 children 写法。
*/
import type { FC } from '@rue-js/rue'
import { onMounted, onUnmounted, ref, useRef, watch } from '@rue-js/rue'

/** SelectColor 语义色类型。 */
export type SelectColor =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** SelectStatus 状态类型。 */
export type SelectStatus = 'success' | 'warning' | 'error'
/** SelectVariant 视觉或语义变体类型。 */
export type SelectVariant = 'outlined' | 'filled' | 'ghost' | 'borderless'

// 保持完整类名为静态字符串，确保 Tailwind 能从组件库源码中发现所有颜色变体。
const selectColorClassMap: Record<SelectColor, string> = {
  neutral: 'select-neutral',
  primary: 'select-primary',
  secondary: 'select-secondary',
  accent: 'select-accent',
  info: 'select-info',
  success: 'select-success',
  warning: 'select-warning',
  error: 'select-error',
}

const shellColorClassMap: Record<SelectColor, string> = {
  neutral: 'input-neutral',
  primary: 'input-primary',
  secondary: 'input-secondary',
  accent: 'input-accent',
  info: 'input-info',
  success: 'input-success',
  warning: 'input-warning',
  error: 'input-error',
}

const selectSizeMap = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  small: 'sm',
  medium: 'md',
  middle: 'md',
  large: 'lg',
} as const

/** SelectVisualSize 尺寸类型。 */
export type SelectVisualSize = keyof typeof selectSizeMap
type SelectResolvedSize = (typeof selectSizeMap)[SelectVisualSize]
type SelectSizeProp = SelectVisualSize | number | string
/** SelectValue 值类型。 */
export type SelectValue = string | number
/** SelectRawValue 值类型。 */
export type SelectRawValue = SelectValue | SelectValue[]

/** SelectFieldNames 接口。 */
export interface SelectFieldNames {
  /** 展示标签。 */
  label?: string
  /** 受控值。 */
  value?: string
  /** 可选项数据。 */
  options?: string
  /** 是否禁用交互。 */
  disabled?: string
  /** 标题内容。 */
  title?: string
  /** 根节点附加类名。 */
  className?: string
  /** groupLabel 标签内容。 */
  groupLabel?: string
}

/** SelectOptionData 数据项结构。 */
export interface SelectOptionData {
  /** 展示标签。 */
  label?: any
  /** 受控值。 */
  value?: SelectValue
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 标题内容。 */
  title?: string
  /** 根节点附加类名。 */
  className?: string
  /** 可选项数据。 */
  options?: SelectOptionData[]
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** SelectLabeledValue 接口。 */
export interface SelectLabeledValue {
  /** 受控值。 */
  value: SelectValue
  /** 展示标签。 */
  label: any
  /** 数据项唯一标识。 */
  key: SelectValue
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 标题内容。 */
  title?: string
}

/** SelectResolvedOption 选项配置。 */
export interface SelectResolvedOption {
  /** 数据项唯一标识。 */
  key: string
  /** 受控值。 */
  value: SelectValue
  /** 展示标签。 */
  label: any
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 标题内容。 */
  title?: string
  /** 根节点附加类名。 */
  className?: string
  /** groupLabel 标签内容。 */
  groupLabel?: any
  /** raw 配置项。 */
  raw?: SelectOptionData
}

/** SelectChangeContext 事件或渲染上下文。 */
export interface SelectChangeContext {
  /** values 配置项。 */
  values: SelectValue[]
  /** labels 配置项。 */
  labels: any[]
  /** 可选项数据。 */
  options: SelectResolvedOption[]
  /** nativeEvent 配置项。 */
  nativeEvent: Event
}

/** SelectProps 组件属性。 */
export interface SelectProps {
  /** 受控值。 */
  value?: SelectRawValue
  /** 非受控初始值。 */
  defaultValue?: SelectRawValue
  /** 组件语义色。 */
  color?: SelectColor
  /** 组件状态。 */
  status?: SelectStatus
  /** 组件视觉变体。 */
  variant?: SelectVariant
  /** 组件尺寸。 */
  size?: SelectSizeProp
  /** uiSize 尺寸。 */
  uiSize?: SelectVisualSize
  /** nativeSize 尺寸。 */
  nativeSize?: number | string
  /** ghost 配置项。 */
  ghost?: boolean
  /** 是否展示加载态。 */
  loading?: boolean
  /** loadingText 文本内容。 */
  loadingText?: any
  /** 可选项数据。 */
  options?: SelectOptionData[]
  /** 自定义数据字段映射。 */
  fieldNames?: SelectFieldNames
  /** 占位内容。 */
  placeholder?: any
  /** placeholderValue 值。 */
  placeholderValue?: SelectValue | ''
  /** placeholderDisabled 配置项。 */
  placeholderDisabled?: boolean
  /** notFoundContent 配置项。 */
  notFoundContent?: any
  /** 是否允许一键清空。 */
  allowClear?: boolean
  /** clearLabel 标签内容。 */
  clearLabel?: string
  /** 清空时触发的回调。 */
  onClear?: (event: MouseEvent) => void
  /** 前缀内容。 */
  prefix?: any
  /** 后缀内容。 */
  suffix?: string | number
  /** 输入前置附加内容。 */
  addonBefore?: any
  /** 输入后置附加内容。 */
  addonAfter?: any
  /** suffixIcon 图标内容。 */
  suffixIcon?: any
  /** showArrow 配置项。 */
  showArrow?: boolean
  /** mode 配置项。 */
  mode?: 'multiple'
  /** labelInValue 值。 */
  labelInValue?: boolean
  /** optionLabelProp 配置项。 */
  optionLabelProp?: string
  /** maxCount 配置项。 */
  maxCount?: number
  /** 值或状态变化时触发的回调。 */
  onChange?: (event: Event) => void
  /** onValueChange 事件回调。 */
  onValueChange?: (
    value: SelectValue | SelectValue[] | SelectLabeledValue | SelectLabeledValue[] | null,
    context: SelectChangeContext,
  ) => void
  /** 选中项时触发的回调。 */
  onSelect?: (
    value: SelectValue | SelectLabeledValue,
    option: SelectResolvedOption,
    event: Event,
  ) => void
  /** 取消选中项时触发的回调。 */
  onDeselect?: (
    value: SelectValue | SelectLabeledValue,
    option: SelectResolvedOption,
    event: Event,
  ) => void
  /** 根节点附加类名。 */
  rootClassName?: string
  /** selectClassName 附加类名。 */
  selectClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** SelectOptionProps 组件属性。 */
export interface SelectOptionProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** SelectOptGroupProps 组件属性。 */
export interface SelectOptGroupProps {
  /** 展示标签。 */
  label: string
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** SelectShellProps 组件属性。 */
export interface SelectShellProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface FlattenedSelectOption {
  key: string
  value?: SelectValue
  label?: any
  disabled?: boolean
  title?: string
  className?: string
  groupLabel?: any
  raw?: SelectOptionData
}

interface SelectResolvedOptionGroup {
  key: string
  label?: any
  options: SelectResolvedOption[]
}

const defaultFieldNames: Required<SelectFieldNames> = {
  label: 'label',
  value: 'value',
  options: 'options',
  disabled: 'disabled',
  title: 'title',
  className: 'className',
  groupLabel: 'label',
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 判断 Visual Size 的内部工具函数。 */
const isVisualSize = (value?: SelectSizeProp): value is SelectVisualSize => {
  return typeof value === 'string' && value in selectSizeMap
}

/** 解析 Visual Size 的内部工具函数。 */
const resolveVisualSize = (
  size?: SelectSizeProp,
  uiSize?: SelectVisualSize,
): SelectResolvedSize | undefined => {
  if (uiSize && isVisualSize(uiSize)) {
    return selectSizeMap[uiSize]
  }
  if (isVisualSize(size)) {
    return selectSizeMap[size]
  }
  return undefined
}

/** 解析 Native Size 的内部工具函数。 */
const resolveNativeSize = (size?: SelectSizeProp, nativeSize?: number | string) => {
  if (nativeSize !== undefined && nativeSize !== null) {
    return String(nativeSize)
  }
  if (typeof size === 'number') {
    return String(size)
  }
  if (typeof size === 'string' && size !== '' && !isVisualSize(size)) {
    return size
  }
  return undefined
}

/** 解析 Select Variant Class Name 的内部工具函数。 */
const resolveSelectVariantClassName = (variant?: SelectVariant, ghost?: boolean) => {
  const resolvedVariant = ghost ? 'ghost' : variant
  switch (resolvedVariant) {
    case 'filled':
      return 'bg-base-200 border-base-300 shadow-none'
    case 'borderless':
      return 'select-ghost bg-transparent border-transparent shadow-none'
    case 'ghost':
      return 'select-ghost'
    default:
      return undefined
  }
}

/** 解析 Shell Variant Class Name 的内部工具函数。 */
const resolveShellVariantClassName = (variant?: SelectVariant, ghost?: boolean) => {
  const resolvedVariant = ghost ? 'ghost' : variant
  switch (resolvedVariant) {
    case 'filled':
      return 'bg-base-200 border-base-300 shadow-none'
    case 'borderless':
      return 'bg-transparent border-transparent shadow-none px-0'
    case 'ghost':
      return 'input-ghost'
    default:
      return undefined
  }
}

/** 构建 Select Class Name 的内部工具函数。 */
const buildSelectClassName = (
  color?: SelectColor,
  status?: SelectStatus,
  variant?: SelectVariant,
  size?: SelectSizeProp,
  uiSize?: SelectVisualSize,
  ghost?: boolean,
  className?: string,
) => {
  let cls = 'select'
  const resolvedColor = status ?? color
  const resolvedSize = resolveVisualSize(size, uiSize)
  const variantClassName = resolveSelectVariantClassName(variant, ghost)

  if (resolvedColor) cls += ` ${selectColorClassMap[resolvedColor]}`
  if (resolvedSize) cls += ` select-${resolvedSize}`
  if (variantClassName) cls += ` ${variantClassName}`
  if (className) cls += ` ${className}`
  return cls
}

/** 构建 Shell Class Name 的内部工具函数。 */
const buildShellClassName = (
  color?: SelectColor,
  status?: SelectStatus,
  variant?: SelectVariant,
  size?: SelectSizeProp,
  uiSize?: SelectVisualSize,
  ghost?: boolean,
  className?: string,
) => {
  let cls = 'input'
  const resolvedColor = status ?? color
  const resolvedSize = resolveVisualSize(size, uiSize)
  const variantClassName = resolveShellVariantClassName(variant, ghost)

  if (resolvedColor) cls += ` ${shellColorClassMap[resolvedColor]}`
  if (resolvedSize) cls += ` input-${resolvedSize}`
  if (variantClassName) cls += ` ${variantClassName}`
  cls += ' flex items-center gap-2'
  if (className) cls += ` ${className}`
  return cls
}

/** read Option Field 的内部工具函数。 */
const readOptionField = (
  option: SelectOptionData,
  field: keyof Required<SelectFieldNames>,
  fieldNames?: SelectFieldNames,
) => {
  const fieldName = fieldNames?.[field] ?? defaultFieldNames[field]
  return option[fieldName]
}

/** flatten Data Options 的内部工具函数。 */
const flattenDataOptions = (
  options: SelectOptionData[],
  fieldNames?: SelectFieldNames,
  path = 'option',
  parentGroupLabel?: any,
): FlattenedSelectOption[] => {
  return options.flatMap((option, index) => {
    const optionPath = `${path}-${index}`
    const nestedOptions = readOptionField(option, 'options', fieldNames)
    const groupLabel = parentGroupLabel ?? readOptionField(option, 'groupLabel', fieldNames)

    if (Array.isArray(nestedOptions)) {
      const nextGroupLabel =
        readOptionField(option, 'groupLabel', fieldNames) ??
        readOptionField(option, 'label', fieldNames)
      return flattenDataOptions(nestedOptions, fieldNames, optionPath, nextGroupLabel)
    }

    return [
      {
        key: optionPath,
        value: readOptionField(option, 'value', fieldNames),
        label: readOptionField(option, 'label', fieldNames) ?? option.children,
        disabled: readOptionField(option, 'disabled', fieldNames),
        title: readOptionField(option, 'title', fieldNames),
        className: readOptionField(option, 'className', fieldNames),
        groupLabel,
        raw: option,
      },
    ]
  })
}

/** 创建 Option Meta Map 的内部工具函数。 */
const createOptionMetaMap = (options?: SelectOptionData[], fieldNames?: SelectFieldNames) => {
  const map: Record<string, FlattenedSelectOption> = {}

  if (!Array.isArray(options)) {
    return map
  }

  flattenDataOptions(options, fieldNames).forEach(option => {
    if (option.value === undefined || option.value === null) return
    map[String(option.value)] = option
  })

  return map
}

/** 渲染 Data Options 的内部工具函数。 */
const RenderDataOptions = ({
  arg0: options,
  arg1: fieldNames,
  arg2: path = 'option',
  arg3: selectedValues,
}: {
  arg0: SelectOptionData[]
  arg1?: SelectFieldNames
  arg2?: any
  arg3?: Set<string>
}): any[] => {
  const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const option = rowArg0
    const index = rowArg1

    const optionPath = `${path}-${index}`
    const nestedOptions = readOptionField(option, 'options', fieldNames)
    const className = readOptionField(option, 'className', fieldNames)
    const title = readOptionField(option, 'title', fieldNames)
    const disabled = readOptionField(option, 'disabled', fieldNames)

    if (Array.isArray(nestedOptions)) {
      const groupLabel =
        readOptionField(option, 'groupLabel', fieldNames) ??
        readOptionField(option, 'label', fieldNames)
      return (
        <optgroup
          key={optionPath}
          label={String(groupLabel ?? '')}
          className={className}
          title={title}
        >
          <RenderDataOptions
            arg0={nestedOptions}
            arg1={fieldNames}
            arg2={optionPath}
            arg3={selectedValues}
          />
        </optgroup>
      )
    }

    const label = readOptionField(option, 'label', fieldNames) ?? option.children
    const value = readOptionField(option, 'value', fieldNames)

    return (
      <option
        key={value !== undefined && value !== null ? String(value) : optionPath}
        value={value as any}
        disabled={disabled}
        title={title}
        className={className}
        {...(selectedValues?.has(String(value)) ? { selected: true } : {})}
      >
        {String(label ?? value ?? '')}
      </option>
    )
  }

  return (
    <>
      {options.map((rowArg0: any, rowArg1: number) => (
        <CompiledRow1 key={rowArg1} rowArg0={rowArg0} rowArg1={rowArg1} />
      ))}
    </>
  )
}

/** 判断 Listbox Size 的内部工具函数。 */
const isListboxSize = (nativeSizeValue?: string) => {
  if (!nativeSizeValue) return false
  const resolved = Number(nativeSizeValue)
  return Number.isFinite(resolved) && resolved > 1
}

const compactOpenStore = /*#__PURE__*/ new Map<string, boolean>()

/** 解析 Compact Open Persistence Key 的内部工具函数。 */
const resolveCompactOpenPersistenceKey = (
  nativeProps: Record<string, any>,
  options: SelectOptionData[] | undefined,
  fieldNames: SelectFieldNames | undefined,
  placeholder: any,
  className?: string,
  selectClassName?: string,
) => {
  const explicitKey =
    nativeProps.id ??
    nativeProps.name ??
    nativeProps['data-testid'] ??
    nativeProps['aria-label'] ??
    nativeProps.title

  if (explicitKey !== undefined && explicitKey !== null && explicitKey !== '') {
    return `prop:${String(explicitKey)}`
  }

  if (!Array.isArray(options) || !options.length) {
    return null
  }

  const optionFingerprint = flattenDataOptions(options, fieldNames)
    .map(
      option => `${String(option.groupLabel ?? '')}>${String(option.value ?? option.label ?? '')}`,
    )
    .join('|')
  const placeholderKey =
    placeholder !== undefined && placeholder !== null ? String(placeholder) : ''
  const classKey = [className, selectClassName].filter(Boolean).join('|')
  return `options:${placeholderKey}:${classKey}:${optionFingerprint}`
}

/** 读取 Compact Open 状态的内部工具函数。 */
const readCompactOpenState = (key?: string | null) =>
  key ? compactOpenStore.get(key) === true : false

/** 写入 Compact Open 状态的内部工具函数。 */
const writeCompactOpenState = (key: string | null, open: boolean) => {
  if (key) {
    compactOpenStore.set(key, open)
  }
}

/** 解析 Option Label 的内部工具函数。 */
const resolveOptionLabel = (
  option: HTMLOptionElement,
  meta: FlattenedSelectOption | undefined,
  optionLabelProp?: string,
) => {
  if (optionLabelProp) {
    const rawValue = meta?.raw?.[optionLabelProp]
    if (rawValue !== undefined) return rawValue

    const attrValue = option.getAttribute(optionLabelProp)
    if (attrValue !== null) return attrValue

    const domValue = (option as any)[optionLabelProp]
    if (domValue !== undefined && domValue !== null && domValue !== '') {
      return domValue
    }
  }

  if (meta?.label !== undefined) return meta.label
  return option.textContent ?? option.label ?? option.value
}

/** 解析 Option Value 的内部工具函数。 */
const resolveOptionValue = (option: HTMLOptionElement, meta: FlattenedSelectOption | undefined) => {
  if (meta?.value !== undefined && meta.value !== null) {
    return meta.value
  }
  return option.value
}

/** 转换为 Labeled Value 的内部工具函数。 */
const toLabeledValue = (
  option: HTMLOptionElement,
  meta: FlattenedSelectOption | undefined,
  optionLabelProp?: string,
): SelectLabeledValue => {
  const value = resolveOptionValue(option, meta)
  return {
    value,
    key: value,
    label: resolveOptionLabel(option, meta, optionLabelProp),
    disabled: meta?.disabled ?? option.disabled,
    title: meta?.title ?? option.title,
  }
}

/** 转换为 Resolved Option 的内部工具函数。 */
const toResolvedOption = (
  option: HTMLOptionElement,
  meta: FlattenedSelectOption | undefined,
  optionLabelProp?: string,
): SelectResolvedOption => {
  const labeledValue = toLabeledValue(option, meta, optionLabelProp)
  return {
    key: option.value,
    value: labeledValue.value,
    label: labeledValue.label,
    disabled: labeledValue.disabled,
    title: labeledValue.title,
    className: meta?.className,
    groupLabel: meta?.groupLabel,
    raw: meta?.raw,
  }
}

/** 构建 Change State 的内部工具函数。 */
const buildChangeState = (
  select: HTMLSelectElement,
  optionMetaMap: Record<string, FlattenedSelectOption>,
  optionLabelProp?: string,
  labelInValue?: boolean,
) => {
  const selectedOptions = Array.from(select.selectedOptions) as HTMLOptionElement[]
  const resolvedOptions = selectedOptions.map(option => {
    return toResolvedOption(option, optionMetaMap[option.value], optionLabelProp)
  })

  const values = resolvedOptions.map(option => option.value)
  const labels = resolvedOptions.map(option => option.label)
  const semanticValues = labelInValue
    ? selectedOptions.map(option =>
        toLabeledValue(option, optionMetaMap[option.value], optionLabelProp),
      )
    : values

  return {
    values,
    labels,
    options: resolvedOptions,
    payload: select.multiple ? semanticValues : (semanticValues[0] ?? null),
  }
}

/** 裁剪 Select Values 的内部工具函数。 */
const clampSelectValues = (
  currentValues: string[],
  previousValues: string[],
  maxCount?: number,
) => {
  if (!maxCount || maxCount <= 0 || currentValues.length <= maxCount) {
    return currentValues
  }

  const keptValues: string[] = []
  previousValues.forEach(value => {
    if (
      currentValues.includes(value) &&
      !keptValues.includes(value) &&
      keptValues.length < maxCount
    ) {
      keptValues.push(value)
    }
  })

  currentValues.forEach(value => {
    if (!keptValues.includes(value) && keptValues.length < maxCount) {
      keptValues.push(value)
    }
  })

  return keptValues
}

/** clamp Selection To Max Count 的内部工具函数。 */
const clampSelectionToMaxCount = (
  select: HTMLSelectElement,
  previousValues: string[],
  maxCount?: number,
) => {
  if (!select.multiple || !maxCount || maxCount <= 0) {
    return Array.from(select.selectedOptions).map(option => option.value)
  }

  const currentValues = Array.from(select.selectedOptions).map(option => option.value)
  const keptValues = clampSelectValues(currentValues, previousValues, maxCount)

  const allowedValues = /*#__PURE__*/ new Set(keptValues)
  Array.from(select.options).forEach(option => {
    option.selected = allowedValues.has(option.value)
  })

  return Array.from(select.selectedOptions).map(option => option.value)
}

/** find Option Element By Value 的内部工具函数。 */
const findOptionElementByValue = (select: HTMLSelectElement, value: string) => {
  return Array.from(select.options).find(option => option.value === value) as
    | HTMLOptionElement
    | undefined
}

/** 归一化 Select Values 的内部工具函数。 */
const normalizeSelectValues = (value?: SelectRawValue) => {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value.map(item => String(item)) : [String(value)]
}

/** group Resolved Options 的内部工具函数。 */
const groupResolvedOptions = (options: SelectResolvedOption[]) => {
  const groups: SelectResolvedOptionGroup[] = []
  const groupMap = /*#__PURE__*/ new Map<string, SelectResolvedOptionGroup>()
  const ungrouped: SelectResolvedOption[] = []

  options.forEach(option => {
    if (option.groupLabel === undefined || option.groupLabel === null || option.groupLabel === '') {
      ungrouped.push(option)
      return
    }

    const key = String(option.groupLabel)
    let group = groupMap.get(key)
    if (!group) {
      group = {
        key,
        label: option.groupLabel,
        options: [],
      }
      groupMap.set(key, group)
      groups.push(group)
    }
    group.options.push(option)
  })

  if (ungrouped.length) {
    groups.unshift({
      key: '__ungrouped__',
      options: ungrouped,
    })
  }

  return groups
}

/** 转换为 Resolved Option From Flat 的内部工具函数。 */
const toResolvedOptionFromFlat = (option: FlattenedSelectOption): SelectResolvedOption => {
  const value = option.value ?? option.key
  return {
    key: String(value),
    value,
    label: option.label ?? value,
    disabled: option.disabled,
    title: option.title,
    className: option.className,
    groupLabel: option.groupLabel,
    raw: option.raw,
  }
}

/** Default Chevron 的内部工具函数。 */
const DefaultChevron: FC = () => {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 shrink-0 opacity-60">
      <path
        d="M6 8.5L10 12.5L14 8.5"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}

/** Shell 的内部工具函数。 */
const Shell: FC<SelectShellProps> = ({ className, children, ...rest }) => {
  return (
    <label {...rest} className={mergeClassName('input', className)}>
      {children}
    </label>
  )
}

/** Option 的内部工具函数。 */
const Option: FC<SelectOptionProps> = ({ className, children, ...rest }) => {
  return (
    <option {...rest} className={className}>
      {children}
    </option>
  )
}

/** Opt Group 的内部工具函数。 */
const OptGroup: FC<SelectOptGroupProps> = ({ label, className, children, ...rest }) => {
  return (
    <optgroup {...rest} label={label} className={className}>
      {children}
    </optgroup>
  )
}

type SelectCompound = FC<SelectProps> & {
  Option: FC<SelectOptionProps>
  OptGroup: FC<SelectOptGroupProps>
  Shell: FC<SelectShellProps>
}

/** Select Root 的内部工具函数。 */
const SelectRoot: FC<SelectProps> = (
  {
    value,
    defaultValue,
    color,
    status,
    variant,
    size,
    uiSize,
    nativeSize,
    ghost,
    loading,
    loadingText,
    options,
    fieldNames,
    placeholder,
    placeholderValue = '',
    placeholderDisabled = true,
    notFoundContent,
    allowClear,
    clearLabel = '清空选择',
    onClear,
    prefix,
    suffix,
    addonBefore,
    addonAfter,
    suffixIcon,
    showArrow = true,
    mode,
    labelInValue,
    optionLabelProp,
    maxCount,
    onChange,
    onValueChange,
    onSelect,
    onDeselect,
    rootClassName,
    selectClassName,
    className,
    children,
    multiple,
    disabled,
    ...rest
  },
  slots: Record<string, any> = {},
) => {
  const nativeProps = rest as Record<string, any>
  const hasOptions = Array.isArray(options) && options.length > 0
  const hasChildren = children !== undefined && children !== null
  const mergedDisabled = !!disabled || !!loading
  const isNativeMultiple = !!multiple
  const isEnhancedMultiple = mode === 'multiple'
  const mergedMultiple = isNativeMultiple || isEnhancedMultiple
  const nativeSizeValue = resolveNativeSize(size, nativeSize)
  const shouldRenderListbox = isNativeMultiple || isListboxSize(nativeSizeValue)
  const useCompactMultiple = isEnhancedMultiple && !shouldRenderListbox
  const resolveCompactOptions = () =>
    hasOptions
      ? flattenDataOptions(options!, fieldNames).map(option => toResolvedOptionFromFlat(option))
      : []
  const compactPersistenceKey = useCompactMultiple
    ? resolveCompactOpenPersistenceKey(
        nativeProps,
        options,
        fieldNames,
        placeholder,
        className,
        selectClassName,
      )
    : null
  const compactOpen = ref(readCompactOpenState(compactPersistenceKey))
  const compactSelectedValues = ref<string[]>(
    normalizeSelectValues(value !== undefined ? value : defaultValue),
  )
  const compactResolvedOptions = ref<SelectResolvedOption[]>(resolveCompactOptions())
  const selectElementRef = useRef<HTMLSelectElement>()
  const compactRootRef = useRef<HTMLDivElement>()
  let previousSelectedValues = compactSelectedValues.value.slice()
  let compactIntentValues = compactSelectedValues.value.slice()
  let pendingCompactValues: string[] | null = null
  const hasShellDecorators =
    prefix !== undefined ||
    suffix !== undefined ||
    slots.suffix != null ||
    addonBefore !== undefined ||
    addonAfter !== undefined ||
    !!allowClear ||
    !!loading ||
    suffixIcon !== undefined
  const useShell = useCompactMultiple || (hasShellDecorators && !shouldRenderListbox)
  const nativeSelectedValues = normalizeSelectValues(value !== undefined ? value : defaultValue)
  const loadingOptionContent = loadingText ?? '正在加载...'
  const emptyOptionContent = notFoundContent ?? '暂无可选项'
  const compactPlaceholder = placeholder ?? 'Select options'
  const isCompactOpen = () => compactOpen.value === true
  const getUseCompactMultiple = () => useCompactMultiple
  const getUseShell = () => useShell
  const hasNoProvidedOptions = () => !hasOptions && !hasChildren
  const getNativeSizeAttrs = () => (nativeSizeValue !== undefined ? { size: nativeSizeValue } : {})
  const getSelectValueAttrs = () => {
    if (useCompactMultiple) {
      return {}
    }

    if (value !== undefined) {
      return { value: value as any }
    }

    if (defaultValue !== undefined) {
      return { defaultValue: defaultValue as any }
    }

    return {}
  }
  const getCompactSelectAttrs = () => ({
    tabIndex: useCompactMultiple ? -1 : rest.tabIndex,
    ariaHidden: useCompactMultiple ? 'true' : undefined,
  })
  const getSelectClassName = () => {
    if (useCompactMultiple) {
      return mergeClassName(
        'pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0',
        selectClassName,
      )
    }

    if (useShell) {
      return mergeClassName(
        'min-w-0 grow appearance-none border-none bg-transparent pr-1 text-base-content outline-none',
        selectClassName,
      )
    }

    return mergeClassName(baseSelectClassName, selectClassName)
  }

  const setCompactOpen = (nextOpen: boolean) => {
    if (compactOpen.value === nextOpen) {
      return
    }

    compactOpen.value = nextOpen
    writeCompactOpenState(compactPersistenceKey, nextOpen)
    const root = compactRootRef.current
    const popup = root?.querySelector('[data-rue-select-popup="true"]') as HTMLElement | null
    const trigger = root?.querySelector('[data-rue-select-trigger="true"]') as HTMLElement | null
    if (popup) {
      popup.hidden = !nextOpen
      popup.setAttribute('aria-hidden', nextOpen ? 'false' : 'true')
    }
    trigger?.setAttribute('aria-expanded', nextOpen ? 'true' : 'false')
  }

  const getCompactSelectedOptions = () => {
    return compactSelectedValues.value
      .map(selectedValue => {
        return compactResolvedOptions.value.find(option => String(option.value) === selectedValue)
      })
      .filter(Boolean) as SelectResolvedOption[]
  }

  const syncSelectionToDom = (nextValues: string[]) => {
    return (select: HTMLSelectElement | null) => {
      if (!select) return

      if (select.multiple) {
        const selectedValueSet = /*#__PURE__*/ new Set(nextValues)
        Array.from(select.options).forEach(option => {
          option.selected = selectedValueSet.has(option.value)
        })
        return
      }

      select.value = nextValues[0] ?? ''
    }
  }

  const syncNativeSelectionFromProps = () => {
    const sourceValue = value !== undefined ? value : defaultValue
    if (sourceValue === undefined) {
      return
    }
    syncSelectionToDom(normalizeSelectValues(sourceValue))(selectElementRef.current ?? null)
  }

  const syncSelectionFromProps = () => {
    const sourceValue = value !== undefined ? value : defaultValue
    if (sourceValue === undefined) {
      return
    }

    const nextValues = normalizeSelectValues(sourceValue)
    compactSelectedValues.value = nextValues
    compactIntentValues = nextValues.slice()
    previousSelectedValues = nextValues.slice()
  }

  const syncSelectedSnapshot = () => {
    previousSelectedValues = compactSelectedValues.value.slice()
  }

  const assignSelectElementRef = (element: HTMLSelectElement | null) => {
    selectElementRef.current = element ?? undefined
  }

  const findSelectFromEvent = (event: Event) => {
    const target = event.target as Element | null
    if (target instanceof HTMLSelectElement) {
      return target
    }

    const current = event.currentTarget as Element | null
    const root = current?.closest?.('[data-rue-select-root="true"]')
    return (root?.querySelector('select') as HTMLSelectElement | null) ?? null
  }

  const emitSemanticCallbacks = (event: Event) => {
    const select = findSelectFromEvent(event)
    if (!select) return

    const previousValues = previousSelectedValues.slice()
    if (pendingCompactValues) {
      syncSelectionToDom(pendingCompactValues)(select)
    }
    const nextValues = clampSelectionToMaxCount(select, previousValues, maxCount)
    const optionMetaMap = createOptionMetaMap(options, fieldNames)
    const changeState = buildChangeState(select, optionMetaMap, optionLabelProp, labelInValue)
    const nextValueKeys = nextValues.map(current => String(current))
    const addedValues = nextValueKeys.filter(current => !previousValues.includes(current))
    const removedValues = previousValues.filter(current => !nextValueKeys.includes(current))

    if (onValueChange) {
      onValueChange(changeState.payload, {
        values: changeState.values,
        labels: changeState.labels,
        options: changeState.options,
        nativeEvent: event,
      })
    }

    if (onSelect) {
      addedValues.forEach(valueKey => {
        const option = findOptionElementByValue(select, valueKey)
        if (!option) return
        const resolvedOption = toResolvedOption(option, optionMetaMap[valueKey], optionLabelProp)
        const semanticValue = labelInValue
          ? toLabeledValue(option, optionMetaMap[valueKey], optionLabelProp)
          : resolvedOption.value
        onSelect(semanticValue, resolvedOption, event)
      })
    }

    if (onDeselect) {
      removedValues.forEach(valueKey => {
        const option = findOptionElementByValue(select, valueKey)
        if (!option) return
        const resolvedOption = toResolvedOption(option, optionMetaMap[valueKey], optionLabelProp)
        const semanticValue = labelInValue
          ? toLabeledValue(option, optionMetaMap[valueKey], optionLabelProp)
          : resolvedOption.value
        onDeselect(semanticValue, resolvedOption, event)
      })
    }

    previousSelectedValues = nextValueKeys
  }

  const handleChange = (event: Event) => {
    emitSemanticCallbacks(event)
    onChange?.(event)
    const select = findSelectFromEvent(event)
    if (select) {
      if (!useCompactMultiple) {
        compactSelectedValues.value = Array.from(select.selectedOptions).map(option => option.value)
      }
    }
    pendingCompactValues = null
  }

  const dispatchNativeSelectionChange = (select: HTMLSelectElement | null) => {
    if (!select) return
    select.dispatchEvent(new Event('input', { bubbles: true }))
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const toggleCompactOption = (optionValue: string, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const select = findSelectFromEvent(event)
    if (!select || mergedDisabled) {
      return
    }

    const option = compactResolvedOptions.value.find(
      current => String(current.value) === optionValue,
    )
    if (!option || option.disabled) {
      return
    }

    const previousValues = compactIntentValues.slice()
    const nextValues = previousValues.includes(optionValue)
      ? previousValues.filter(valueKey => valueKey !== optionValue)
      : previousValues.concat(optionValue)
    const clampedValues = clampSelectValues(nextValues, previousValues, maxCount)

    compactIntentValues = clampedValues.slice()
    pendingCompactValues = clampedValues
    if (value === undefined) compactSelectedValues.value = clampedValues
    syncSelectionToDom(clampedValues)(select)
    dispatchNativeSelectionChange(select)
    const restoreSelection = () =>
      syncSelectionToDom(clampedValues)(selectElementRef.current ?? select)
    queueMicrotask(restoreSelection)
  }

  const removeCompactOption = (optionValue: string, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const select = findSelectFromEvent(event)
    if (!select || mergedDisabled) {
      return
    }

    const option = compactResolvedOptions.value.find(
      current => String(current.value) === optionValue,
    )
    if (!option || option.disabled || !compactSelectedValues.value.includes(optionValue)) {
      return
    }

    const nextValues = compactIntentValues.filter(valueKey => valueKey !== optionValue)
    compactIntentValues = nextValues.slice()
    if (value === undefined) compactSelectedValues.value = nextValues
    pendingCompactValues = nextValues
    syncSelectionToDom(nextValues)(select)
    dispatchNativeSelectionChange(select)
    const restoreSelection = () =>
      syncSelectionToDom(nextValues)(selectElementRef.current ?? select)
    queueMicrotask(restoreSelection)
  }

  const handleCompactTriggerClick = (event: MouseEvent) => {
    event.preventDefault()
    if (mergedDisabled) return
    if (isCompactOpen()) return
    setCompactOpen(true)
  }

  const handleCompactTriggerKeyDown = (event: KeyboardEvent) => {
    if (mergedDisabled) return

    if (event.key === 'Escape') {
      setCompactOpen(false)
      return
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault()
      setCompactOpen(true)
    }
  }

  const clearSelection = (event: MouseEvent) => {
    const select = findSelectFromEvent(event)

    if (!select || mergedDisabled) {
      return
    }

    if (select.multiple) {
      Array.from(select.options).forEach(option => {
        option.selected = false
      })
    } else if (placeholder !== undefined && placeholder !== null) {
      select.value = String(placeholderValue)
    } else {
      select.selectedIndex = -1
      select.value = ''
    }

    compactIntentValues = []
    previousSelectedValues = []
    pendingCompactValues = []
    dispatchNativeSelectionChange(select)
    syncSelectionToDom([])(select)
    queueMicrotask(() => syncSelectionToDom([])(selectElementRef.current ?? select))

    if (onClear) {
      onClear(event)
    }
  }

  onMounted(() => {
    syncSelectionFromProps()
    syncNativeSelectionFromProps()
    queueMicrotask(syncNativeSelectionFromProps)
    syncSelectedSnapshot()

    if (typeof window === 'undefined') return

    const handleWindowPointerDown = (event: PointerEvent) => {
      if (!isCompactOpen()) return
      const target = event.target as Element | null
      if (!target) return
      if (target.closest?.('[data-rue-select-root="true"]')) return
      setCompactOpen(false)
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (!isCompactOpen() || event.key !== 'Escape') return
      setCompactOpen(false)
    }

    window.addEventListener('pointerdown', handleWindowPointerDown, true)
    window.addEventListener('keydown', handleWindowKeyDown)

    onUnmounted(() => {
      window.removeEventListener('pointerdown', handleWindowPointerDown, true)
      window.removeEventListener('keydown', handleWindowKeyDown)
    })
  })

  watch(
    () => value,
    () => {
      syncSelectionFromProps()
      syncNativeSelectionFromProps()
      syncSelectedSnapshot()
    },
    { immediate: true },
  )

  watch(
    () => options,
    () => {
      compactResolvedOptions.value = resolveCompactOptions()
      syncSelectionFromProps()
      syncNativeSelectionFromProps()
      syncSelectedSnapshot()
    },
  )

  watch(
    () => children,
    () => {
      syncSelectionFromProps()
      syncNativeSelectionFromProps()
      syncSelectedSnapshot()
    },
  )

  const baseSelectClassName = buildSelectClassName(
    color,
    status,
    variant,
    size,
    uiSize,
    ghost,
    className,
  )
  const shellClassName = buildShellClassName(color, status, variant, size, uiSize, ghost, className)

  const getCompactGroups = () => groupResolvedOptions(compactResolvedOptions.value)
  const isCompactValueSelected = (optionValue: string) =>
    compactSelectedValues.value.includes(optionValue)
  const CompactNativeOptions = () => (
    <>
      {compactResolvedOptions.value.map(option => {
        const optionValue = String(option.value)
        return (
          <option
            key={option.key}
            value={option.value as any}
            disabled={option.disabled}
            title={option.title}
            className={option.className}
            {...(isCompactValueSelected(optionValue) ? { selected: true } : {})}
          >
            {String(option.label ?? option.value ?? '')}
          </option>
        )
      })}
    </>
  )

  const SelectNode = () => (
    <select
      {...rest}
      {...getNativeSizeAttrs()}
      {...(mergedMultiple ? { multiple: true } : {})}
      {...(mergedDisabled ? { disabled: true } : {})}
      {...getSelectValueAttrs()}
      tabIndex={getCompactSelectAttrs().tabIndex}
      aria-hidden={getCompactSelectAttrs().ariaHidden}
      aria-busy={loading ? 'true' : undefined}
      className={getSelectClassName()}
      ref={assignSelectElementRef}
      onChange={handleChange}
    >
      {!getUseCompactMultiple() &&
      !mergedMultiple &&
      placeholder !== undefined &&
      placeholder !== null ? (
        <option value={placeholderValue as any} disabled={placeholderDisabled}>
          {String(placeholder)}
        </option>
      ) : null}
      {getUseCompactMultiple() ? (
        <CompactNativeOptions />
      ) : hasOptions ? (
        <RenderDataOptions
          arg0={options!}
          arg1={fieldNames}
          arg2={'option'}
          arg3={new Set(nativeSelectedValues)}
        />
      ) : (
        <>{children}</>
      )}
      {!getUseCompactMultiple() && loading && hasNoProvidedOptions() ? (
        <option disabled={true}>{String(loadingOptionContent)}</option>
      ) : null}
      {!getUseCompactMultiple() && !loading && hasNoProvidedOptions() ? (
        <option disabled={true}>{String(emptyOptionContent)}</option>
      ) : null}
    </select>
  )

  if (!getUseShell()) {
    return <SelectNode />
  }

  if (getUseCompactMultiple()) {
    const CompiledRow101 = ({ rowArg0 }: { rowArg0: any }) => {
      const CompiledRow102 = ({ rowArg0 }: { rowArg0: any }) => {
        const option = rowArg0

        const optionValue = String(option.value)
        const selected = isCompactValueSelected(optionValue)
        return (
          <button
            key={optionValue}
            type="button"
            className={mergeClassName(
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition',
              option.disabled
                ? 'cursor-not-allowed opacity-50'
                : selected
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-base-200',
            )}
            data-rue-select-option={optionValue}
            aria-selected={selected ? 'true' : 'false'}
            disabled={option.disabled}
            onClick={(event: MouseEvent) => {
              toggleCompactOption(optionValue, event)
            }}
          >
            <span className="truncate">{String(option.label ?? option.value ?? '')}</span>
            <span data-rue-select-check="true" className={selected ? 'opacity-100' : 'opacity-0'}>
              ✓
            </span>
          </button>
        )
      }

      const group = rowArg0
      return (
        <div key={group.key} className="space-y-1">
          {group.label !== undefined ? (
            <div className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">
              {String(group.label)}
            </div>
          ) : null}
          {group.options.map((rowArg0: any, rowIndex: number) => (
            <CompiledRow102 rowArg0={rowArg0} />
          ))}
        </div>
      )
    }

    const CompiledRow2 = ({ rowArg0 }: { rowArg0: any }) => {
      const option = rowArg0

      const optionValue = String(option.value)
      return (
        <span
          key={optionValue}
          className="inline-flex max-w-full items-center gap-1 rounded-md bg-base-200 px-2 py-1 text-xs text-base-content"
        >
          <span className="truncate">{String(option.label ?? option.value ?? '')}</span>
          {!mergedDisabled ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs h-4 min-h-0 w-4 rounded-full p-0 text-[10px]"
              aria-label={`移除 ${String(option.label ?? option.value)}`}
              onClick={(event: MouseEvent) => removeCompactOption(optionValue, event)}
            >
              ×
            </button>
          ) : null}
        </span>
      )
    }

    return (
      <div
        ref={(element: HTMLDivElement | null) => {
          compactRootRef.current = element ?? undefined
        }}
        className={mergeClassName('relative', rootClassName)}
        data-rue-select-root="true"
        aria-disabled={mergedDisabled ? 'true' : undefined}
      >
        <SelectNode />
        <div
          className={mergeClassName(
            mergeClassName(shellClassName, 'flex min-h-12 items-center gap-2 py-2'),
            isCompactOpen() ? 'ring ring-primary/15' : undefined,
          )}
          role="button"
          tabIndex={mergedDisabled ? -1 : 0}
          aria-haspopup="listbox"
          aria-expanded={isCompactOpen() ? 'true' : 'false'}
          data-rue-select-trigger="true"
          onClick={handleCompactTriggerClick}
          onKeyDown={handleCompactTriggerKeyDown}
        >
          {addonBefore !== undefined ? (
            <span className="shrink-0 text-sm text-base-content/60">{addonBefore}</span>
          ) : null}
          {prefix !== undefined ? (
            <span className="shrink-0 text-sm text-base-content/60">{prefix}</span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {getCompactSelectedOptions().length ? (
              <>
                {' '}
                {getCompactSelectedOptions().map((rowArg0: any, rowIndex: number) => (
                  <CompiledRow2 rowArg0={rowArg0} />
                ))}{' '}
              </>
            ) : (
              <span className="truncate text-sm text-base-content/40">
                {String(compactPlaceholder)}
              </span>
            )}
          </div>
          {!loading && allowClear && getCompactSelectedOptions().length ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle shrink-0"
              aria-label={clearLabel}
              onClick={(event: MouseEvent) => {
                event.preventDefault()
                event.stopPropagation()
                clearSelection(event)
              }}
              disabled={mergedDisabled}
            >
              ×
            </button>
          ) : null}
          {loading ? (
            <span className="loading loading-spinner loading-xs shrink-0" aria-hidden="true" />
          ) : null}
          {suffix !== undefined || slots.suffix != null ? (
            <span className="shrink-0 text-sm text-base-content/60">
              {slots.suffix ? slots.suffix : String(suffix ?? '')}
            </span>
          ) : null}
          {showArrow || suffixIcon != null ? (
            <span className="pointer-events-none flex shrink-0 items-center text-base-content/70">
              {suffixIcon != null ? String(suffixIcon) : <DefaultChevron />}
            </span>
          ) : null}
          {addonAfter !== undefined ? (
            <span className="shrink-0 text-sm text-base-content/60">{addonAfter}</span>
          ) : null}
        </div>
        <div
          className="absolute z-30 mt-2 w-full rounded-box border border-base-300 bg-base-100 p-2 shadow-xl"
          data-rue-select-popup="true"
          aria-hidden={isCompactOpen() ? 'false' : 'true'}
          {...(!isCompactOpen() ? { hidden: true } : {})}
        >
          <div
            role="listbox"
            aria-multiselectable="true"
            className="max-h-72 space-y-2 overflow-auto"
          >
            {getCompactGroups().map((rowArg0: any, rowIndex: number) => (
              <CompiledRow101 rowArg0={rowArg0} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={mergeClassName(shellClassName, rootClassName)}
      data-rue-select-root="true"
      aria-disabled={mergedDisabled ? 'true' : undefined}
    >
      {addonBefore !== undefined ? (
        <span className="shrink-0 text-sm text-base-content/60">{addonBefore}</span>
      ) : null}
      {prefix !== undefined ? (
        <span className="shrink-0 text-sm text-base-content/60">{prefix}</span>
      ) : null}
      <SelectNode />
      {!loading && allowClear ? (
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle inline-flex shrink-0 items-center justify-center self-center"
          aria-label={clearLabel}
          onClick={clearSelection}
          disabled={mergedDisabled}
        >
          ×
        </button>
      ) : null}
      {loading ? (
        <span
          className="loading loading-spinner loading-xs shrink-0 self-center"
          aria-hidden="true"
        />
      ) : null}
      {suffix !== undefined || slots.suffix != null ? (
        <span className="inline-flex shrink-0 items-center self-center text-sm text-base-content/60">
          {slots.suffix ? slots.suffix : String(suffix ?? '')}
        </span>
      ) : null}
      {showArrow || suffixIcon != null ? (
        <span className="pointer-events-none inline-flex shrink-0 items-center self-center text-base-content/70">
          {suffixIcon != null ? String(suffixIcon) : <DefaultChevron />}
        </span>
      ) : null}
      {addonAfter !== undefined ? (
        <span className="shrink-0 text-sm text-base-content/60">{addonAfter}</span>
      ) : null}
    </div>
  )
}

const Select: SelectCompound = /*#__PURE__*/ Object.assign(SelectRoot, {
  Option,
  OptGroup,
  Shell,
})

/** 默认导出选择器组件。 */
export default Select
