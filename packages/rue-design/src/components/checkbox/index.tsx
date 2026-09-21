/*
Checkbox 组件概述
- 保留 Rue 当前 checkbox 视觉类，同时补齐受控/非受控、children 标签包装、indeterminate 能力。
- Checkbox.Group 以 options 为主，兼容 children 直出，并提供受控/非受控选中值管理。
*/
import type { FC } from '@rue-js/rue'
import { ref, useSetup, watchEffect } from '@rue-js/rue'

/** CheckboxColor 语义色类型。 */
export type CheckboxColor =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'info'
  | 'error'

/** CheckboxSize 尺寸类型。 */
export type CheckboxSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
/** CheckboxValue 值类型。 */
export type CheckboxValue = string | number | boolean

/** CheckboxChangeMeta 接口。 */
export interface CheckboxChangeMeta {
  /** 受控选中状态。 */
  checked: boolean
  /** indeterminate 配置项。 */
  indeterminate: boolean
  /** 受控值。 */
  value?: CheckboxValue
}

/** CheckboxProps 组件属性。 */
export interface CheckboxProps {
  /** 组件语义色。 */
  color?: CheckboxColor
  /** 组件尺寸。 */
  size?: CheckboxSize
  /** 受控选中状态。 */
  checked?: boolean
  /** 非受控初始选中状态。 */
  defaultChecked?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** indeterminate 配置项。 */
  indeterminate?: boolean
  /** 受控值。 */
  value?: CheckboxValue
  /** 根节点附加类名。 */
  className?: string
  /** 根节点附加类名。 */
  rootClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** 根节点内联样式。 */
  style?: any
  /** 根节点内联样式。 */
  rootStyle?: any
  /** 组件子内容。 */
  children?: any
  /** 值或状态变化时触发的回调。 */
  onChange?: (event: Event, meta: CheckboxChangeMeta) => void
  /** onCheckedChange 事件回调。 */
  onCheckedChange?: (checked: boolean, event: Event) => void
  /** Group 内部管理标记。 */
  __rueCheckboxManagedByGroup?: boolean
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** CheckboxOption 选项配置。 */
export interface CheckboxOption {
  /** 展示标签。 */
  label: any
  /** 受控值。 */
  value: CheckboxValue
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 标题内容。 */
  title?: string
  /** 元素或数据项标识。 */
  id?: string
  /** indeterminate 配置项。 */
  indeterminate?: boolean
}

/** CheckboxGroupProps 组件属性。 */
export interface CheckboxGroupProps {
  /** 受控值。 */
  value?: CheckboxValue[]
  /** 非受控初始值。 */
  defaultValue?: CheckboxValue[]
  /** 可选项数据。 */
  options?: ReadonlyArray<CheckboxOption | CheckboxValue>
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 表单 name 属性或分组名称。 */
  name?: string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** 值或状态变化时触发的回调。 */
  onChange?: (checkedValue: CheckboxValue[]) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedCheckboxOption extends CheckboxOption {}

let checkboxContentIdSeed = 0

/** append Class Name 的内部工具函数。 */
const appendClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 构建 Input Class Name 的内部工具函数。 */
const buildInputClassName = (color?: CheckboxColor, size?: CheckboxSize, className?: string) => {
  let cls = 'checkbox'
  if (color) cls += ` checkbox-${color}`
  if (size) cls += ` checkbox-${size}`
  if (className) cls += ` ${className}`
  return cls
}

/** 构建 Root Class Name 的内部工具函数。 */
const buildRootClassName = (disabled?: boolean, rootClassName?: string) => {
  let cls = 'inline-flex items-start gap-3 text-sm leading-5 text-base-content'
  if (disabled) cls += ' cursor-not-allowed opacity-60'
  else cls += ' cursor-pointer'
  if (rootClassName) cls += ` ${rootClassName}`
  return cls
}

/** 构建 Content Class Name 的内部工具函数。 */
const buildContentClassName = (contentClassName?: string) => {
  return appendClassName('min-w-0 flex-1 pt-0.5', contentClassName)
}

/** serialize Value 的内部工具函数。 */
const serializeValue = (value: CheckboxValue) => {
  switch (typeof value) {
    case 'number':
      return `number:${value}`
    case 'boolean':
      return `boolean:${value ? 'true' : 'false'}`
    default:
      return `string:${value}`
  }
}

/** deserialize Value 的内部工具函数。 */
const deserializeValue = (serialized?: string): CheckboxValue | undefined => {
  if (!serialized) return undefined
  const separatorIndex = serialized.indexOf(':')
  if (separatorIndex === -1) return serialized
  const type = serialized.slice(0, separatorIndex)
  const rawValue = serialized.slice(separatorIndex + 1)
  if (type === 'number') return Number(rawValue)
  if (type === 'boolean') return rawValue === 'true'
  return rawValue
}

/** 归一化 Value List 的内部工具函数。 */
const normalizeValueList = (values?: ReadonlyArray<CheckboxValue>) => {
  const next: CheckboxValue[] = []
  ;(values ?? []).forEach(value => {
    if (!next.some(current => current === value)) {
      next.push(value)
    }
  })
  return next
}

/** 归一化 Options 的内部工具函数。 */
const normalizeOptions = (options?: ReadonlyArray<CheckboxOption | CheckboxValue>) => {
  return (options ?? []).map<NormalizedCheckboxOption>(option => {
    if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
      return {
        label: String(option),
        value: option,
      }
    }
    return option
  })
}

/** Checkbox 的内部工具函数。 */
const Checkbox: FC<CheckboxProps> = ({
  color,
  size,
  checked,
  defaultChecked,
  disabled,
  indeterminate,
  value,
  className,
  rootClassName,
  contentClassName,
  style,
  rootStyle,
  children,
  onChange,
  onCheckedChange,
  __rueCheckboxManagedByGroup,
  ...rest
}) => {
  const instance = useSetup(() => ({
    contentId: `rue-checkbox-content-${checkboxContentIdSeed++}`,
    input: undefined as HTMLInputElement | undefined,
  }))
  const readControlledChecked = () => {
    if (typeof checked === 'boolean') return checked
    return undefined
  }
  const uncontrolledChecked = ref(readControlledChecked() ?? !!defaultChecked)
  const readChecked = () => readControlledChecked() ?? uncontrolledChecked.value
  const readContentId = () =>
    children != null ? (rest['aria-labelledby'] ?? instance.contentId) : undefined

  const syncNativeInput = (input = instance.input) => {
    const nextIndeterminate = !!indeterminate
    const nextControlledChecked = readControlledChecked()
    if (!input) return
    input.indeterminate = nextIndeterminate
    if (nextControlledChecked !== undefined && !__rueCheckboxManagedByGroup) {
      input.checked = nextControlledChecked
    }
  }

  const bindInput = (input: HTMLInputElement | null) => {
    instance.input = input ?? undefined
    syncNativeInput(input ?? undefined)
  }

  watchEffect(() => {
    syncNativeInput()
  })

  const handleChange = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    const nextChecked = target?.checked === true
    let resolvedChecked = readControlledChecked()

    if (resolvedChecked === undefined) {
      uncontrolledChecked.value = nextChecked
    }

    if (onChange) {
      onChange(event, {
        checked: nextChecked,
        indeterminate: !!indeterminate,
        value,
      })
    }
    if (onCheckedChange) {
      onCheckedChange(nextChecked, event)
    }

    resolvedChecked = readControlledChecked()
    if (resolvedChecked !== undefined && target && !__rueCheckboxManagedByGroup) {
      target.checked = resolvedChecked
    }
    syncNativeInput(target ?? undefined)
  }

  if (children == null && !rootClassName && !rootStyle && !contentClassName) {
    return (
      <input
        {...rest}
        ref={bindInput}
        type="checkbox"
        value={value as any}
        checked={readChecked()}
        defaultChecked={defaultChecked ?? readChecked()}
        disabled={disabled}
        style={style}
        className={buildInputClassName(color, size, className)}
        aria-labelledby={readContentId()}
        aria-checked={indeterminate ? 'mixed' : rest['aria-checked']}
        data-rue-checkbox-input="true"
        data-rue-checkbox-disabled={disabled ? 'true' : 'false'}
        data-rue-checkbox-value={value !== undefined ? serializeValue(value) : undefined}
        onChange={handleChange}
      />
    )
  }

  return (
    <label
      className={buildRootClassName(disabled, rootClassName)}
      style={rootStyle}
      data-rue-checkbox-root="true"
    >
      <span className="shrink-0">
        <input
          {...rest}
          ref={bindInput}
          type="checkbox"
          value={value as any}
          checked={readChecked()}
          defaultChecked={defaultChecked ?? readChecked()}
          disabled={disabled}
          style={style}
          className={buildInputClassName(color, size, className)}
          aria-labelledby={readContentId()}
          aria-checked={indeterminate ? 'mixed' : rest['aria-checked']}
          data-rue-checkbox-input="true"
          data-rue-checkbox-disabled={disabled ? 'true' : 'false'}
          data-rue-checkbox-value={value !== undefined ? serializeValue(value) : undefined}
          onChange={handleChange}
        />
      </span>
      {children != null ? (
        <span
          id={readContentId()}
          className={buildContentClassName(contentClassName)}
          data-rue-checkbox-content="true"
        >
          {children}
        </span>
      ) : null}
    </label>
  )
}

/** Group 的内部工具函数。 */
const Group: FC<CheckboxGroupProps> = ({
  value,
  defaultValue,
  options,
  disabled,
  name,
  className,
  style,
  children,
  onChange,
  ...rest
}) => {
  const normalizedOptions = normalizeOptions(options)
  const selectedValues = ref(normalizeValueList(value ?? defaultValue))
  const instance = useSetup(() => ({
    root: undefined as HTMLDivElement | undefined,
  }))
  const readCurrentValue = () =>
    value !== undefined ? normalizeValueList(value) : selectedValues.value

  const sortValuesByRegistration = (values: ReadonlyArray<CheckboxValue>) => {
    const normalizedValue = normalizeValueList(values)
    const root = instance.root
    if (!root) return normalizedValue

    const order = Array.from(
      root.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][data-rue-checkbox-input="true"]',
      ),
    )
      .map(input => input.dataset.rueCheckboxValue)
      .filter((item): item is string => !!item)

    if (!order.length) return normalizedValue

    const orderMap = /*#__PURE__*/ new Map(order.map((item, index) => [item, index]))
    return normalizedValue.sort((left, right) => {
      return (
        (orderMap.get(serializeValue(left)) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(serializeValue(right)) ?? Number.MAX_SAFE_INTEGER)
      )
    })
  }

  const commitValue = (nextValue: ReadonlyArray<CheckboxValue>, controlled?: boolean) => {
    const sortedValue = sortValuesByRegistration(nextValue)
    if (!controlled) {
      selectedValues.value = sortedValue
    }
    if (onChange) {
      onChange(sortedValue)
    }
    return sortedValue
  }

  const toggleOption = (optionValue: CheckboxValue, nextChecked: boolean, controlled?: boolean) => {
    const currentValue = controlled ? normalizeValueList(value) : selectedValues.value
    const hasValue = currentValue.some(item => item === optionValue)
    if (nextChecked && hasValue) {
      return commitValue(currentValue, controlled)
    }
    if (!nextChecked && !hasValue) {
      return commitValue(currentValue, controlled)
    }
    if (nextChecked) {
      return commitValue([...currentValue, optionValue], controlled)
    }
    return commitValue(
      currentValue.filter(item => item !== optionValue),
      controlled,
    )
  }

  const syncChildInputs = () => {
    const root = instance.root
    const selectedSet = /*#__PURE__*/ new Set(readCurrentValue().map(serializeValue))
    if (!root || typeof root.querySelectorAll !== 'function') return

    root
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-rue-checkbox-input="true"]')
      .forEach(input => {
        const serializedValue = input.dataset.rueCheckboxValue
        if (serializedValue) {
          input.checked = selectedSet.has(serializedValue)
        }
        if (name) {
          input.name = name
        }
        if (disabled) {
          input.disabled = true
        } else {
          input.disabled = input.dataset.rueCheckboxDisabled === 'true'
        }
      })
  }

  const bindGroupRoot = (root: HTMLDivElement | null) => {
    instance.root = root ?? undefined
    syncChildInputs()
    Promise.resolve().then(() => {
      syncChildInputs()
    })
  }

  const handleChildrenChange = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    if (!target || target.type !== 'checkbox' || target.dataset.rueCheckboxInput !== 'true') {
      return
    }
    const resolvedValue = deserializeValue(target.dataset.rueCheckboxValue)
    if (resolvedValue === undefined) {
      return
    }
    toggleOption(resolvedValue, target.checked, value !== undefined)
    syncChildInputs()
  }

  watchEffect(() => {
    syncChildInputs()
  })

  const groupClassName = appendClassName('flex flex-col gap-3', className)
  const readOptionItems = () =>
    normalizedOptions.map(option => ({
      option,
      checked: readCurrentValue().some(item => item === option.value),
    }))

  return (
    <div
      {...rest}
      ref={bindGroupRoot}
      role={rest.role ?? 'group'}
      className={groupClassName}
      style={style}
      data-rue-checkbox-group="true"
      onChange={(event: Event) => {
        if (normalizedOptions.length) {
          if (typeof rest.onChange === 'function') rest.onChange(event)
          return
        }
        handleChildrenChange(event)
      }}
    >
      {normalizedOptions.length ? (
        <>
          {' '}
          {readOptionItems().map(({ option, checked }) => (
            <Checkbox
              key={serializeValue(option.value)}
              value={option.value}
              checked={checked}
              disabled={disabled || option.disabled}
              __rueCheckboxManagedByGroup={true}
              name={name}
              title={option.title}
              id={option.id}
              indeterminate={option.indeterminate}
              rootClassName={option.className}
              rootStyle={option.style}
              onChange={(_, meta) => {
                toggleOption(option.value, meta.checked, value !== undefined)
                syncChildInputs()
                Promise.resolve().then(() => {
                  syncChildInputs()
                })
              }}
            >
              {option.label}
            </Checkbox>
          ))}{' '}
        </>
      ) : (
        children
      )}
    </div>
  )
}

type CheckboxCompound = FC<CheckboxProps> & {
  Group: FC<CheckboxGroupProps>
}

const CheckboxCompound: CheckboxCompound = /*#__PURE__*/ Object.assign(Checkbox, {
  Group,
})

/** 默认导出复选框组件。 */
export default CheckboxCompound
