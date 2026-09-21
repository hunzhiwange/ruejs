/*
Form 模块概述
- 汇总表单组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'
import {
  createContext,
  useContext,
  computed,
  onCleanup,
  onMounted,
  ref,
  useRef,
  watchEffect,
} from '@rue-js/rue'
import { provideContext } from '@rue-js/rue/internal/app'

/** FormLayout 类型。 */
export type FormLayout = 'horizontal' | 'vertical' | 'inline'
/** FormLabelAlign 对齐方式类型。 */
export type FormLabelAlign = 'left' | 'right'
/** FormSize 尺寸类型。 */
export type FormSize = 'small' | 'middle' | 'large' | 'sm' | 'md' | 'lg'
/** FormRequiredMark 类型。 */
export type FormRequiredMark = boolean | 'optional'
/** FormComponent 类型。 */
export type FormComponent = string | false
/** NamePath 类型。 */
export type NamePath = string | number | ReadonlyArray<string | number>
/** NamePathSegment 类型。 */
export type NamePathSegment = string | number
/** ValidateStatus 状态类型。 */
export type ValidateStatus = 'success' | 'warning' | 'error' | 'validating'

/** FormValidateMessages 接口。 */
export interface FormValidateMessages {
  /** required 配置项。 */
  required?: string
  /** whitespace 配置项。 */
  whitespace?: string
  /** pattern 配置项。 */
  pattern?: string
  /** types 配置项。 */
  types?: Partial<Record<FormRuleType, string>>
  /** string 配置项。 */
  string?: {
    len?: string
    min?: string
    max?: string
  }
  /** number 配置项。 */
  number?: {
    len?: string
    min?: string
    max?: string
  }
  /** array 配置项。 */
  array?: {
    len?: string
    min?: string
    max?: string
  }
}

/** FormRuleType 视觉或语义变体类型。 */
export type FormRuleType = 'string' | 'number' | 'boolean' | 'array' | 'email' | 'url'

/** FormRule 接口。 */
export interface FormRule {
  /** required 配置项。 */
  required?: boolean
  /** message 配置项。 */
  message?: string
  /** min 配置项。 */
  min?: number
  /** max 配置项。 */
  max?: number
  /** len 配置项。 */
  len?: number
  /** 组件类型或语义类型。 */
  type?: FormRuleType
  /** pattern 配置项。 */
  pattern?: RegExp
  /** whitespace 配置项。 */
  whitespace?: boolean
  /** warningOnly 配置项。 */
  warningOnly?: boolean
  /** transform 配置项。 */
  transform?: (value: any) => any
  /** validator 配置项。 */
  validator?: (rule: FormRule, value: any, values: any) => void | string | Promise<void | string>
}

/** FieldError 接口。 */
export interface FieldError {
  /** 表单 name 属性或分组名称。 */
  name: NamePathSegment[]
  /** errors 配置项。 */
  errors: string[]
  /** warnings 配置项。 */
  warnings: string[]
}

/** FieldData 数据项结构。 */
export interface FieldData extends FieldError {
  /** touched 配置项。 */
  touched: boolean
  /** validating 配置项。 */
  validating: boolean
  /** 受控值。 */
  value: any
}

/** FormListFieldData 数据项结构。 */
export interface FormListFieldData {
  /** 数据项唯一标识。 */
  key: number
  /** 表单 name 属性或分组名称。 */
  name: number
  /** fieldKey 标识键。 */
  fieldKey: number
}

/** FormListOperation 接口。 */
export interface FormListOperation {
  /** add 配置项。 */
  add: (defaultValue?: any, insertIndex?: number) => void
  /** remove 配置项。 */
  remove: (index: number | number[]) => void
  /** move 配置项。 */
  move: (from: number, to: number) => void
}

/** FormErrorListProps 组件属性。 */
export interface FormErrorListProps {
  /** errors 配置项。 */
  errors?: ReadonlyArray<any>
  /** warnings 配置项。 */
  warnings?: ReadonlyArray<any>
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
}

/** FormProps 组件属性。 */
export interface FormProps {
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 组件子内容。 */
  children?: any
  /** render 配置项。 */
  render?: (form: FormInstance) => any

  /** component 配置项。 */
  component?: FormComponent
  /** layout 配置项。 */
  layout?: FormLayout
  /** 组件尺寸。 */
  size?: FormSize
  /** 是否禁用交互。 */
  disabled?: boolean
  /** colon 配置项。 */
  colon?: boolean
  /** labelAlign 配置项。 */
  labelAlign?: FormLabelAlign
  /** labelWrap 配置项。 */
  labelWrap?: boolean
  /** labelCol 配置项。 */
  labelCol?: FormColConfig
  /** wrapperCol 配置项。 */
  wrapperCol?: FormColConfig
  /** requiredMark 配置项。 */
  requiredMark?: FormRequiredMark
  /** initialValues 值集合。 */
  initialValues?: Record<string, any>
  /** form 配置项。 */
  form?: FormInstance
  /** 表单 name 属性或分组名称。 */
  name?: string
  /** preserve 配置项。 */
  preserve?: boolean
  /** validateMessages 配置项。 */
  validateMessages?: FormValidateMessages
  /** validateTrigger 配置项。 */
  validateTrigger?: string | string[]
  /** scrollToFirstError 配置项。 */
  scrollToFirstError?: boolean | (ScrollIntoViewOptions & { focus?: boolean })
  /** onValuesChange 事件回调。 */
  onValuesChange?: (changedValues: any, allValues: any) => void
  /** onFieldsChange 事件回调。 */
  onFieldsChange?: (changedFields: FieldData[], allFields: FieldData[]) => void
  /** onFinish 事件回调。 */
  onFinish?: (values: any) => void
  /** onFinishFailed 事件回调。 */
  onFinishFailed?: (info: FormFinishFailedInfo) => void
  /** onSubmit 事件回调。 */
  onSubmit?: (event: Event) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FormItemProps 组件属性。 */
export interface FormItemProps {
  control?: 'input' | 'checkbox' | 'textarea'
  controlProps?: Record<string, unknown>
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** form 配置项。 */
  form?: FormInstance
  /** 组件子内容。 */
  children?: any
  /** render 配置项。 */
  render?: (control: Record<string, any>, meta?: unknown, form?: FormInstance) => any

  /** 表单 name 属性或分组名称。 */
  name?: NamePath
  /** 展示标签。 */
  label?: any
  /** 额外操作或补充内容。 */
  extra?: any
  /** help 配置项。 */
  help?: any
  /** required 配置项。 */
  required?: boolean
  /** rules 配置项。 */
  rules?: FormRule[]
  /** dependencies 配置项。 */
  dependencies?: NamePath[]
  /** noStyle 内联样式。 */
  noStyle?: boolean
  /** hidden 配置项。 */
  hidden?: boolean
  /** initialValue 值。 */
  initialValue?: any
  /** preserve 配置项。 */
  preserve?: boolean
  /** valuePropName 配置项。 */
  valuePropName?: string
  /** trigger 区域配置。 */
  trigger?: string
  /** validateTrigger 配置项。 */
  validateTrigger?: string | string[]
  /** getValueFromEvent 配置项。 */
  getValueFromEvent?: (...args: any[]) => any
  /** getValueProps 透传属性。 */
  getValueProps?: (value: any) => Record<string, any>
  /** normalize 配置项。 */
  normalize?: (value: any, prevValue: any, values: any) => any
  /** shouldUpdate 配置项。 */
  shouldUpdate?: boolean | ((prevValues: any, nextValues: any) => boolean)
  /** validateStatus 状态。 */
  validateStatus?: ValidateStatus
  /** hasFeedback 配置项。 */
  hasFeedback?: boolean
  /** messageVariables 配置项。 */
  messageVariables?: Record<string, string>
  /** colon 配置项。 */
  colon?: boolean
  /** labelAlign 配置项。 */
  labelAlign?: FormLabelAlign
  /** labelCol 配置项。 */
  labelCol?: FormColConfig
  /** wrapperCol 配置项。 */
  wrapperCol?: FormColConfig
  /** layout 配置项。 */
  layout?: Exclude<FormLayout, 'inline'>
  /** htmlFor 配置项。 */
  htmlFor?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FormListProps 组件属性。 */
export interface FormListProps {
  fields?: Array<FormItemProps & { name: NamePath }>
  /** form 配置项。 */
  form?: FormInstance
  /** 表单 name 属性或分组名称。 */
  name: NamePath
  /** 组件子内容。 */
  /** render 配置项。 */
  render?: (
    fields: FormListFieldData[],
    operation: FormListOperation,
    meta: { errors: string[]; warnings: string[] },
  ) => any

  /** initialValue 值。 */
  initialValue?: any[]
  /** rules 配置项。 */
  rules?: FormRule[]
}

/** FormFinishFailedInfo 接口。 */
export interface FormFinishFailedInfo {
  /** values 配置项。 */
  values: any
  /** errorFields 配置项。 */
  errorFields: FieldError[]
  /** outOfDate 配置项。 */
  outOfDate: boolean
}

/** FormInstance 对外暴露的实例能力。 */
export interface FormInstance {
  /** getFieldValue 值。 */
  getFieldValue: (name: NamePath) => any
  /** getFieldsValue 值。 */
  getFieldsValue: (nameList?: true | NamePath[]) => any
  /** setFieldValue 值。 */
  setFieldValue: (name: NamePath, value: any) => void
  /** setFieldsValue 值。 */
  setFieldsValue: (values: Record<string, any>) => void
  /** resetFields 配置项。 */
  resetFields: (nameList?: NamePath[]) => void
  /** validateFields 配置项。 */
  validateFields: (nameList?: NamePath[]) => Promise<any>
  /** submit 配置项。 */
  submit: () => void
  /** scrollToField 配置项。 */
  scrollToField: (name: NamePath, options?: ScrollIntoViewOptions & { focus?: boolean }) => void
  /** isFieldTouched 配置项。 */
  isFieldTouched: (name: NamePath) => boolean
  /** getFieldError 配置项。 */
  getFieldError: (name: NamePath) => string[]
  /** getFieldsError 配置项。 */
  getFieldsError: (nameList?: NamePath[]) => FieldError[]
}

/** FormColConfig 配置对象。 */
export interface FormColConfig {
  /** span 配置项。 */
  span?: number
  /** offset 配置项。 */
  offset?: number
}

interface InternalFieldMeta {
  touched: boolean
  validating: boolean
  errors: string[]
  warnings: string[]
}

interface RegisteredFieldEntity {
  id: string
  kind: 'item' | 'list'
  getNamePath: () => NamePathSegment[] | undefined
  getRules: () => FormRule[]
  getRequired: () => boolean | undefined
  getLabel: () => any
  getMessageVariables: () => Record<string, string> | undefined
  getValidateTrigger: () => string[]
  getDependencies: () => NamePathSegment[][]
  getInitialValue: () => any
  getPreserve: () => boolean | undefined
}

interface FormRuntimeOptions {
  name?: string
  preserve?: boolean
  validateTrigger: string[]
  validateMessages: FormValidateMessages
  scrollToFirstError?: boolean | (ScrollIntoViewOptions & { focus?: boolean })
  onValuesChange?: (changedValues: any, allValues: any) => void
  onFieldsChange?: (changedFields: FieldData[], allFields: FieldData[]) => void
  onFinish?: (values: any) => void
  onFinishFailed?: (info: FormFinishFailedInfo) => void
}

interface InternalFormInstance extends FormInstance {
  __INTERNAL__: {
    version: { value: number }
    setRuntimeOptions: (options: FormRuntimeOptions) => void
    ensureInitialized: (values?: Record<string, any>) => boolean
    registerField: (entity: RegisteredFieldEntity) => () => void
    getMeta: (namePath: NamePathSegment[]) => InternalFieldMeta
    validateFieldByPath: (
      namePath: NamePathSegment[],
      triggerName?: string,
    ) => Promise<FieldError | null>
    updateValueFromControl: (
      namePath: NamePathSegment[],
      value: any,
      info: { touch?: boolean; triggerName?: string },
    ) => Promise<void>
    updateListValue: (namePath: NamePathSegment[], value: any[]) => Promise<void>
    getDefaultValidateTrigger: () => string[]
    setRootElement: (element: HTMLElement | null) => void
    subscribe: (subscriber: () => void) => () => void
    emitUpdate: () => void
  }
}

interface FormContextValue {
  form: InternalFormInstance
  layout: FormLayout
  size?: FormSize
  disabled?: boolean
  colon: boolean
  labelAlign: FormLabelAlign
  labelWrap: boolean
  labelCol?: FormColConfig
  wrapperCol?: FormColConfig
  requiredMark: FormRequiredMark
  preserve?: boolean
  validateTrigger: string[]
  formName?: string
}

let formEntitySeed = 0

const defaultValidateMessages: FormValidateMessages = {
  required: '${label} 为必填项',
  whitespace: '${label} 不能只包含空白字符',
  pattern: '${label} 格式不正确',
  types: {
    string: '${label} 不是合法文本',
    number: '${label} 不是合法数字',
    boolean: '${label} 不是合法布尔值',
    array: '${label} 不是合法数组',
    email: '${label} 不是合法邮箱',
    url: '${label} 不是合法链接',
  },
  string: {
    len: '${label} 需为 ${len} 个字符',
    min: '${label} 至少 ${min} 个字符',
    max: '${label} 最多 ${max} 个字符',
  },
  number: {
    len: '${label} 需等于 ${len}',
    min: '${label} 不能小于 ${min}',
    max: '${label} 不能大于 ${max}',
  },
  array: {
    len: '${label} 需包含 ${len} 项',
    min: '${label} 至少包含 ${min} 项',
    max: '${label} 最多包含 ${max} 项',
  },
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (...values: Array<string | undefined | false | null>) => {
  return values.filter(Boolean).join(' ')
}

/** 判断 Object Like 的内部工具函数。 */
const isObjectLike = (value: unknown): value is Record<string, any> => {
  return !!value && typeof value === 'object'
}

/** clone Value 的内部工具函数。 */
const cloneValue = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(item => cloneValue(item)) as T
  }
  if (isObjectLike(value)) {
    const next: Record<string, any> = {}
    Object.keys(value).forEach(key => {
      next[key] = cloneValue((value as Record<string, any>)[key])
    })
    return next as T
  }
  return value
}

/** 转换为 Name Path Array 的内部工具函数。 */
const toNamePathArray = (name?: NamePath): NamePathSegment[] => {
  if (name == null) return []
  if (Array.isArray(name)) return [...name] as NamePathSegment[]
  return [name as NamePathSegment]
}

/** 读取 Path Key 的内部工具函数。 */
const getPathKey = (namePath: NamePathSegment[]) => {
  return namePath.map(segment => `${typeof segment}:${String(segment)}`).join('__rue_form_path__')
}

/** path Matches 的内部工具函数。 */
const pathMatches = (left: NamePathSegment[], right: NamePathSegment[]) => {
  if (left.length !== right.length) return false
  return left.every((segment, index) => segment === right[index])
}

/** path Starts With 的内部工具函数。 */

/** 读取 Value At Path 的内部工具函数。 */
const getValueAtPath = (source: any, namePath: NamePathSegment[]) => {
  return namePath.reduce<any>((current, segment) => {
    if (current == null) return undefined
    return current[segment as keyof typeof current]
  }, source)
}

/** 判断是否存在 Value At Path 的内部工具函数。 */
const hasValueAtPath = (source: any, namePath: NamePathSegment[]) => {
  if (namePath.length === 0) return source !== undefined
  let current = source
  for (const segment of namePath) {
    if (current == null || !(segment in Object(current))) return false
    current = current[segment as keyof typeof current]
  }
  return true
}

/** 设置 Value At Path 的内部工具函数。 */
const setValueAtPath = (source: any, namePath: NamePathSegment[], value: any): any => {
  if (namePath.length === 0) return cloneValue(value)

  const [segment, ...rest] = namePath
  const current = source ?? (typeof segment === 'number' ? [] : {})
  const next = (Array.isArray(current) ? [...current] : { ...current }) as any
  next[segment] = rest.length === 0 ? cloneValue(value) : setValueAtPath(next[segment], rest, value)
  return next
}

/** delete Value At Path 的内部工具函数。 */
const deleteValueAtPath = (source: any, namePath: NamePathSegment[]): any => {
  if (namePath.length === 0) return undefined
  if (!isObjectLike(source) && !Array.isArray(source)) return source

  const [segment, ...rest] = namePath
  const next = (Array.isArray(source) ? [...source] : { ...source }) as any

  if (rest.length === 0) {
    if (Array.isArray(next) && typeof segment === 'number') {
      next.splice(segment, 1)
    } else {
      delete next[segment]
    }
    return next
  }

  next[segment] = deleteValueAtPath(next[segment], rest)
  return next
}

/** merge Values 的内部工具函数。 */
const mergeValues = (base: any, patch: any): any => {
  if (!isObjectLike(patch) && !Array.isArray(patch)) return cloneValue(patch)
  if (Array.isArray(patch)) return patch.map(item => cloneValue(item))

  const current = isObjectLike(base) ? { ...base } : {}
  Object.keys(patch).forEach(key => {
    current[key] = mergeValues(current[key], patch[key])
  })
  return current
}

/** 构建 Changed Values 的内部工具函数。 */
const buildChangedValues = (namePath: NamePathSegment[], value: any) => {
  return setValueAtPath({}, namePath, value)
}

/** 归一化 Trigger List 的内部工具函数。 */
const normalizeTriggerList = (trigger?: string | string[]) => {
  if (!trigger) return ['onChange']
  return Array.isArray(trigger) ? trigger : [trigger]
}

/** 读取 Rule Length Type 的内部工具函数。 */
const getRuleLengthType = (value: any, type?: FormRuleType) => {
  if (type === 'number') return 'number'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return 'number'
  return 'string'
}

/** 读取 Rule Length Value 的内部工具函数。 */
const getRuleLengthValue = (value: any, type?: FormRuleType) => {
  const lengthType = getRuleLengthType(value, type)
  if (lengthType === 'array') return Array.isArray(value) ? value.length : 0
  if (lengthType === 'number') return Number(value)
  if (value == null) return 0
  return String(value).length
}

/** 判断 Empty Value 的内部工具函数。 */
const isEmptyValue = (value: any, type?: FormRuleType) => {
  if (value == null) return true
  if (type === 'array') return !Array.isArray(value) || value.length === 0
  if (typeof value === 'string') return value === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** 判断 Valid Url 的内部工具函数。 */
const isValidUrl = (value: string) => {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/** 读取 Type Valid 的内部工具函数。 */
const getTypeValid = (value: any, type?: FormRuleType) => {
  if (!type) return true
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'array':
      return Array.isArray(value)
    case 'email':
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    case 'url':
      return typeof value === 'string' && isValidUrl(value)
    default:
      return true
  }
}

/** extract Rule Message 的内部工具函数。 */
const extractRuleMessage = (
  rule: FormRule,
  value: any,
  label: string,
  messages: FormValidateMessages,
  fallbackType?: 'required' | 'whitespace' | 'pattern' | 'type' | 'len' | 'min' | 'max',
) => {
  if (rule.message) return rule.message

  if (fallbackType === 'required') {
    return messages.required ?? defaultValidateMessages.required ?? '${label} 为必填项'
  }

  if (fallbackType === 'whitespace') {
    return messages.whitespace ?? defaultValidateMessages.whitespace ?? '${label} 不能为空'
  }

  if (fallbackType === 'pattern') {
    return messages.pattern ?? defaultValidateMessages.pattern ?? '${label} 格式不正确'
  }

  if (fallbackType === 'type') {
    return (
      messages.types?.[rule.type ?? 'string'] ??
      defaultValidateMessages.types?.[rule.type ?? 'string'] ??
      '${label} 类型不正确'
    )
  }

  const lengthType = getRuleLengthType(value, rule.type)
  const source = messages[lengthType] ?? defaultValidateMessages[lengthType] ?? {}
  return source[fallbackType ?? 'len'] ?? '${label} 校验失败'
}

/** format Message 的内部工具函数。 */
const formatMessage = (
  template: string,
  variables: Record<string, string | number | undefined>,
) => {
  return template.replace(/\$\{(.*?)\}/g, (_, key) => {
    const trimmedKey = String(key).trim()
    return variables[trimmedKey] == null ? '' : String(variables[trimmedKey])
  })
}

/** 读取 Label Text 的内部工具函数。 */
const getLabelText = (label: any, namePath: NamePathSegment[]) => {
  if (typeof label === 'string' || typeof label === 'number') return String(label)
  const last = namePath[namePath.length - 1]
  return last == null ? '字段' : String(last)
}

/** 解析 Item Required 的内部工具函数。 */
const resolveItemRequired = (required: boolean | undefined, rules: FormRule[] | undefined) => {
  if (required !== undefined) return required
  return !!rules?.some(rule => rule.required && !rule.warningOnly)
}

/** run Rules 的内部工具函数。 */
const runRules = async (
  namePath: NamePathSegment[],
  value: any,
  rules: FormRule[],
  values: any,
  label: any,
  messageVariables: Record<string, string> | undefined,
  messages: FormValidateMessages,
) => {
  const errors: string[] = []
  const warnings: string[] = []
  const labelText = getLabelText(messageVariables?.label ?? label, namePath)

  for (const rule of rules) {
    const nextValue = typeof rule.transform === 'function' ? rule.transform(value) : value
    let nextMessage: string | null = null

    if (rule.required && isEmptyValue(nextValue, rule.type)) {
      nextMessage = extractRuleMessage(rule, nextValue, labelText, messages, 'required')
    } else if (rule.whitespace && typeof nextValue === 'string' && nextValue.trim() === '') {
      nextMessage = extractRuleMessage(rule, nextValue, labelText, messages, 'whitespace')
    } else if (
      !isEmptyValue(nextValue, rule.type) &&
      rule.type &&
      !getTypeValid(nextValue, rule.type)
    ) {
      nextMessage = extractRuleMessage(rule, nextValue, labelText, messages, 'type')
    } else if (
      !isEmptyValue(nextValue, rule.type) &&
      rule.pattern &&
      !rule.pattern.test(String(nextValue))
    ) {
      nextMessage = extractRuleMessage(rule, nextValue, labelText, messages, 'pattern')
    } else if (!isEmptyValue(nextValue, rule.type) && rule.len !== undefined) {
      const length = getRuleLengthValue(nextValue, rule.type)
      if (length !== rule.len) {
        nextMessage = extractRuleMessage(rule, nextValue, labelText, messages, 'len')
      }
    } else if (!isEmptyValue(nextValue, rule.type) && rule.min !== undefined) {
      const length = getRuleLengthValue(nextValue, rule.type)
      if (length < rule.min) {
        nextMessage = extractRuleMessage(rule, nextValue, labelText, messages, 'min')
      }
    } else if (!isEmptyValue(nextValue, rule.type) && rule.max !== undefined) {
      const length = getRuleLengthValue(nextValue, rule.type)
      if (length > rule.max) {
        nextMessage = extractRuleMessage(rule, nextValue, labelText, messages, 'max')
      }
    }

    if (!nextMessage && typeof rule.validator === 'function') {
      try {
        const validatorResult = await rule.validator(rule, nextValue, values)
        if (typeof validatorResult === 'string' && validatorResult.trim()) {
          nextMessage = validatorResult
        }
      } catch (error) {
        nextMessage = error instanceof Error ? error.message : String(error)
      }
    }

    if (!nextMessage) continue

    const message = formatMessage(nextMessage, {
      label: labelText,
      name: labelText,
      min: rule.min,
      max: rule.max,
      len: rule.len,
      ...messageVariables,
    })

    if (rule.warningOnly) warnings.push(message)
    else errors.push(message)
  }

  return { errors, warnings }
}

/** resolve Size Class 的内部工具函数。 */

/** 读取 Default Value From Event 的内部工具函数。 */

/** 读取 Feedback Icon 的内部工具函数。 */

/** 解析 Col Width 的内部工具函数。 */

/** should Keep Field 的内部工具函数。 */
const shouldKeepField = (entity: RegisteredFieldEntity, formPreserve?: boolean) => {
  if (entity.getPreserve() !== undefined) return entity.getPreserve() !== false
  return formPreserve !== false
}

/** 创建 Form Instance 的内部工具函数。 */
const createFormInstance = (): InternalFormInstance => {
  const version = ref(0)
  const fields = /*#__PURE__*/ new Map<string, RegisteredFieldEntity>()
  const fieldRegistrationKeys = /*#__PURE__*/ new Map<string, string>()
  const fieldMeta = /*#__PURE__*/ new Map<string, InternalFieldMeta>()
  const subscribers = /*#__PURE__*/ new Set<() => void>()
  let notifyQueued = false
  let values: Record<string, any> = {}
  let initialValues: Record<string, any> = {}
  let initialized = false
  let rootElement: HTMLElement | null = null
  let runtimeOptions: FormRuntimeOptions = {
    validateTrigger: ['onChange'],
    validateMessages: defaultValidateMessages,
  }

  const notify = () => {
    version.value += 1
    // A synchronous subscriber can rerender, unsubscribe, and subscribe again. Iterating the live
    // Set would then revisit that newly inserted entry forever, so dispatch from a stable snapshot.
    Array.from(subscribers).forEach(subscriber => subscriber())
  }

  const scheduleNotify = () => {
    if (notifyQueued) return
    notifyQueued = true
    queueMicrotask(() => {
      notifyQueued = false
      notify()
    })
  }

  const getMeta = (namePath: NamePathSegment[]) => {
    const pathKey = getPathKey(namePath)
    const current = fieldMeta.get(pathKey)
    if (current) return current
    const next = {
      touched: false,
      validating: false,
      errors: [],
      warnings: [],
    }
    fieldMeta.set(pathKey, next)
    return next
  }

  const getEntityRegistrationKey = (entity: RegisteredFieldEntity) => {
    const namePath = entity.getNamePath()
    return namePath && namePath.length ? `${entity.kind}:${getPathKey(namePath)}` : entity.id
  }

  const buildFieldData = (namePath: NamePathSegment[]): FieldData => {
    const meta = getMeta(namePath)
    return {
      name: [...namePath],
      errors: [...meta.errors],
      warnings: [...meta.warnings],
      touched: meta.touched,
      validating: meta.validating,
      value: cloneValue(getValueAtPath(values, namePath)),
    }
  }

  const emitFieldsChange = (namePath: NamePathSegment[]) => {
    runtimeOptions.onFieldsChange?.([buildFieldData(namePath)], internal.getFieldsValue(true))
  }

  const updateMeta = (
    namePath: NamePathSegment[],
    patch: Partial<InternalFieldMeta>,
    shouldNotify = true,
  ) => {
    const meta = getMeta(namePath)
    Object.assign(meta, patch)
    if (shouldNotify) {
      emitFieldsChange(namePath)
      notify()
      scheduleNotify()
    }
  }

  const getEntityByPath = (namePath: NamePathSegment[]) => {
    for (const entity of fields.values()) {
      const entityPath = entity.getNamePath()
      if (entityPath && pathMatches(entityPath, namePath)) return entity
    }
    return null
  }

  const validateEntity = async (entity: RegisteredFieldEntity, triggerName?: string) => {
    const namePath = entity.getNamePath()
    if (!namePath || namePath.length === 0) return null

    const validateTriggers = entity.getValidateTrigger()
    if (triggerName && validateTriggers.length > 0 && !validateTriggers.includes(triggerName)) {
      return null
    }

    const rules = entity.getRules()
    if (!rules.length) {
      updateMeta(namePath, { errors: [], warnings: [], validating: false })
      return null
    }

    updateMeta(namePath, { validating: true })
    const value = getValueAtPath(values, namePath)
    const result = await runRules(
      namePath,
      value,
      rules,
      values,
      entity.getLabel(),
      entity.getMessageVariables(),
      runtimeOptions.validateMessages,
    )
    updateMeta(namePath, {
      validating: false,
      errors: result.errors,
      warnings: result.warnings,
    })

    if (!result.errors.length && !result.warnings.length) return null
    return {
      name: [...namePath],
      errors: [...result.errors],
      warnings: [...result.warnings],
    }
  }

  const validateDependents = async (changedPath: NamePathSegment[]) => {
    const entities = Array.from(fields.values())
    for (const entity of entities) {
      const namePath = entity.getNamePath()
      if (!namePath || pathMatches(namePath, changedPath)) continue
      const dependencies = entity.getDependencies()
      if (!dependencies.some(dependency => pathMatches(dependency, changedPath))) continue
      await validateEntity(entity)
    }
  }

  const setFieldValueInternal = async (
    namePath: NamePathSegment[],
    value: any,
    info?: { touch?: boolean; triggerName?: string; emitValues?: boolean },
  ) => {
    values = setValueAtPath(values, namePath, value)
    if (info?.touch) {
      const meta = getMeta(namePath)
      meta.touched = true
    }
    notify()
    emitFieldsChange(namePath)

    if (info?.emitValues !== false) {
      runtimeOptions.onValuesChange?.(
        buildChangedValues(namePath, value),
        internal.getFieldsValue(true),
      )
    }

    const entity = getEntityByPath(namePath)
    if (entity) {
      await validateEntity(entity, info?.triggerName)
    }
    await validateDependents(namePath)
    scheduleNotify()
  }

  const registerField = (entity: RegisteredFieldEntity) => {
    const registrationKey = getEntityRegistrationKey(entity)
    const previousEntityId = fieldRegistrationKeys.get(registrationKey)
    if (previousEntityId && previousEntityId !== entity.id) {
      fields.delete(previousEntityId)
    }
    fields.set(entity.id, entity)
    fieldRegistrationKeys.set(registrationKey, entity.id)

    const namePath = entity.getNamePath()
    if (namePath && namePath.length) {
      const initialValue = entity.getInitialValue()
      if (!hasValueAtPath(initialValues, namePath) && initialValue !== undefined) {
        initialValues = setValueAtPath(initialValues, namePath, initialValue)
      }
      if (!hasValueAtPath(values, namePath) && initialValue !== undefined) {
        values = setValueAtPath(values, namePath, initialValue)
      }
      getMeta(namePath)
    }

    return () => {
      const isActiveEntity = fieldRegistrationKeys.get(registrationKey) === entity.id
      fields.delete(entity.id)
      if (!isActiveEntity) return
      fieldRegistrationKeys.delete(registrationKey)

      const entityPath = entity.getNamePath()
      if (!entityPath || !entityPath.length) return
      if (!shouldKeepField(entity, runtimeOptions.preserve)) {
        values = deleteValueAtPath(values, entityPath)
        fieldMeta.delete(getPathKey(entityPath))
        notify()
      }
    }
  }

  const ensureInitialized = (nextValues?: Record<string, any>) => {
    if (initialized) return false
    initialValues = cloneValue(nextValues ?? {})
    values = cloneValue(nextValues ?? {})
    initialized = true
    return true
  }

  const validateFields = async (nameList?: NamePath[]) => {
    const names = nameList?.map(name => toNamePathArray(name))
    const errorFields: FieldError[] = []
    const entities = Array.from(fields.values())
    const validatedKeys = /*#__PURE__*/ new Set<string>()

    for (const entity of entities) {
      const registrationKey = getEntityRegistrationKey(entity)
      if (validatedKeys.has(registrationKey)) continue
      validatedKeys.add(registrationKey)

      const entityPath = entity.getNamePath()
      if (!entityPath || !entityPath.length) continue
      if (names && !names.some(namePath => pathMatches(entityPath, namePath))) continue
      const result = await validateEntity(entity)
      if (result && result.errors.length > 0) {
        errorFields.push(result)
      }
    }

    if (errorFields.length > 0) {
      throw {
        values: internal.getFieldsValue(true),
        errorFields,
        outOfDate: false,
      } satisfies FormFinishFailedInfo
    }

    return internal.getFieldsValue(true)
  }

  const scrollToField = (name: NamePath, options?: ScrollIntoViewOptions & { focus?: boolean }) => {
    const namePath = toNamePathArray(name)
    const formName = runtimeOptions.name?.trim()
    const fieldId = namePath.map(segment => String(segment)).join('__')
    const ids = formName ? [`${formName}__${fieldId}`, fieldId] : [fieldId]
    const target =
      ids
        .map(id => {
          const escapedId =
            typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
              ? CSS.escape(id)
              : id.replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, '\\$1')
          return rootElement?.querySelector(`#${escapedId}`) as HTMLElement | null
        })
        .find(Boolean) ??
      ids
        .map(id =>
          typeof document === 'undefined'
            ? null
            : (document.getElementById(id) as HTMLElement | null),
        )
        .find(Boolean)
    if (!target) return
    target.scrollIntoView(options)
    if (options?.focus && 'focus' in target && typeof target.focus === 'function') {
      target.focus()
    }
  }

  const internal = {
    getFieldValue(name: NamePath) {
      void version.value
      return cloneValue(getValueAtPath(values, toNamePathArray(name)))
    },
    getFieldsValue(nameList?: true | NamePath[]) {
      void version.value
      if (nameList === true || nameList == null) {
        return cloneValue(values)
      }

      return nameList.reduce<Record<string, any>>((result, name) => {
        const namePath = toNamePathArray(name)
        return setValueAtPath(result, namePath, getValueAtPath(values, namePath))
      }, {})
    },
    setFieldValue(name: NamePath, value: any) {
      void setFieldValueInternal(toNamePathArray(name), value, { emitValues: false })
    },
    setFieldsValue(nextValues: Record<string, any>) {
      values = mergeValues(values, nextValues)
      notify()
    },
    resetFields(nameList?: NamePath[]) {
      if (!nameList?.length) {
        values = cloneValue(initialValues)
        fieldMeta.forEach(meta => {
          meta.touched = false
          meta.validating = false
          meta.errors = []
          meta.warnings = []
        })
        notify()
        return
      }

      nameList.forEach(name => {
        const namePath = toNamePathArray(name)
        const initialValue = getValueAtPath(initialValues, namePath)
        values =
          initialValue === undefined
            ? deleteValueAtPath(values, namePath)
            : setValueAtPath(values, namePath, initialValue)
        const meta = getMeta(namePath)
        meta.touched = false
        meta.validating = false
        meta.errors = []
        meta.warnings = []
      })
      notify()
    },
    validateFields,
    submit() {
      void validateFields()
        .then(submitValues => {
          runtimeOptions.onFinish?.(submitValues)
        })
        .catch((info: FormFinishFailedInfo) => {
          runtimeOptions.onFinishFailed?.(info)
          if (runtimeOptions.scrollToFirstError && info.errorFields[0]) {
            const options =
              runtimeOptions.scrollToFirstError === true
                ? ({ block: 'center' } as ScrollIntoViewOptions & { focus?: boolean })
                : runtimeOptions.scrollToFirstError
            scrollToField(info.errorFields[0].name, options)
          }
        })
    },
    scrollToField,
    isFieldTouched(name: NamePath) {
      return getMeta(toNamePathArray(name)).touched
    },
    getFieldError(name: NamePath) {
      return [...getMeta(toNamePathArray(name)).errors]
    },
    getFieldsError(nameList?: NamePath[]) {
      if (!nameList?.length) {
        const seenKeys = /*#__PURE__*/ new Set<string>()
        return Array.from(fields.values())
          .filter(entity => {
            const registrationKey = getEntityRegistrationKey(entity)
            if (seenKeys.has(registrationKey)) return false
            seenKeys.add(registrationKey)
            return true
          })
          .map(entity => entity.getNamePath())
          .filter((path): path is NamePathSegment[] => !!path && path.length > 0)
          .map(path => {
            const meta = getMeta(path)
            return {
              name: [...path],
              errors: [...meta.errors],
              warnings: [...meta.warnings],
            }
          })
      }

      return nameList.map(name => {
        const namePath = toNamePathArray(name)
        const meta = getMeta(namePath)
        return {
          name: [...namePath],
          errors: [...meta.errors],
          warnings: [...meta.warnings],
        }
      })
    },
    __INTERNAL__: {
      version,
      setRuntimeOptions(options: FormRuntimeOptions) {
        runtimeOptions = options
      },
      ensureInitialized,
      registerField,
      getMeta,
      validateFieldByPath(namePath: NamePathSegment[], triggerName?: string) {
        const entity = getEntityByPath(namePath)
        if (!entity) return Promise.resolve(null)
        return validateEntity(entity, triggerName)
      },
      updateValueFromControl(
        namePath: NamePathSegment[],
        value: any,
        info: { touch?: boolean; triggerName?: string },
      ) {
        return setFieldValueInternal(namePath, value, {
          touch: info.touch,
          triggerName: info.triggerName,
        })
      },
      updateListValue(namePath: NamePathSegment[], nextValue: any[]) {
        return setFieldValueInternal(namePath, nextValue, {
          touch: true,
          emitValues: false,
        })
      },
      getDefaultValidateTrigger() {
        return runtimeOptions.validateTrigger
      },
      setRootElement(element: HTMLElement | null) {
        rootElement = element
      },
      subscribe(subscriber: () => void) {
        subscribers.add(subscriber)
        return () => {
          subscribers.delete(subscriber)
        }
      },
      emitUpdate() {
        notify()
      },
    },
  } as InternalFormInstance

  return internal
}

/** 渲染 Required Mark 的内部工具函数。 */

/** Error List 的内部工具函数。 */
const ErrorList: FC<FormErrorListProps> = ({ errors, warnings, className, style }) => {
  const list = [...(errors ?? []), ...(warnings ?? [])].filter(item => item != null)
  if (!list.length) return <></>

  return (
    <ul
      className={mergeClassName('mt-3 grid gap-1.5 text-[0.8rem] leading-6', className)}
      style={style}
    >
      {(errors ?? []).map((message, index) => (
        <li key={`error-${index}`} className="text-error">
          {message}
        </li>
      ))}
      {(warnings ?? []).map((message, index) => (
        <li key={`warning-${index}`} className="text-warning">
          {message}
        </li>
      ))}
    </ul>
  )
}

/** Read the explicitly supplied form, or the current form owner context. */
const FormContext = createContext<FormInstance | undefined>(undefined)
export const createForm = (): FormInstance => createFormInstance()
export const useFormInstance = () => {
  const form = useContext(FormContext)
  if (!form) throw new Error('A form instance or ancestor Form is required')
  return form
}
export const useForm = (form?: FormInstance): [FormInstance] => {
  const value = useRef(form ?? createFormInstance())
  return [value.current!]
}
export const useWatch = (name: NamePath, form?: FormInstance) => {
  const target = (form ?? useFormInstance()) as InternalFormInstance
  return computed(() => {
    void target.__INTERNAL__.version.value
    return target.getFieldValue(name)
  })
}

/** A field binds a finite control schema; custom children remain static slots. */
const FormItem: FC<FormItemProps> = props => {
  const form = (props.form ?? useContext(FormContext)) as InternalFormInstance | undefined
  const name = props.name == null ? undefined : toNamePathArray(props.name)
  const id = props.htmlFor ?? name?.map(String).join('__')
  if (name && !form) throw new Error('A named FormItem requires a form')
  if (name && form) {
    const unregister = form.__INTERNAL__.registerField({
      id: `rue-form-item-${formEntitySeed++}`,
      kind: 'item',
      getNamePath: () => name,
      getRules: () => props.rules ?? [],
      getRequired: () => props.required,
      getLabel: () => props.label,
      getMessageVariables: () => props.messageVariables,
      getValidateTrigger: () => normalizeTriggerList(props.validateTrigger),
      getDependencies: () => (props.dependencies ?? []).map(toNamePathArray),
      getInitialValue: () => props.initialValue,
      getPreserve: () => props.preserve,
    })
    onCleanup(unregister)
  }
  const value = computed(() => {
    if (!form || !name) return undefined
    void form.__INTERNAL__.version.value
    return form.getFieldValue(name)
  })
  const meta = computed(() => {
    if (!form || !name) return { errors: [], warnings: [], validating: false }
    void form.__INTERNAL__.version.value
    const meta = form.__INTERNAL__.getMeta(name)
    return { ...meta, errors: [...meta.errors], warnings: [...meta.warnings] }
  })
  const update = (event: Event) => {
    if (!form || !name) return
    const element = event.target as HTMLInputElement
    const raw = props.getValueFromEvent
      ? props.getValueFromEvent(event)
      : props.control === 'checkbox' || props.valuePropName === 'checked'
        ? element.checked
        : element.value
    const next = props.normalize
      ? props.normalize(raw, value.value, form.getFieldsValue(true))
      : raw
    void form.__INTERNAL__.updateValueFromControl(name, next, {
      touch: true,
      triggerName: props.trigger ?? 'onChange',
    })
  }
  const validateBlur = () => {
    if (form && name && normalizeTriggerList(props.validateTrigger).includes('onBlur')) {
      void form.__INTERNAL__.validateFieldByPath(name, 'onBlur')
    }
  }
  const valuePropName = props.valuePropName ?? 'value'
  const triggerName = props.trigger ?? 'onChange'
  const initialValueProps = props.render
    ? (props.getValueProps?.(value.value) ?? { [valuePropName]: value.value })
    : {}
  const controlProps: Record<string, any> = {
    id,
    [triggerName]: update,
    onBlur: validateBlur,
  }
  // Rue text controls expose the native input event separately from change. A rendered
  // Form.Item is controlled by the form store, so it must write each edit back before
  // the controlled value is applied again. Keep onChange for components such as Select,
  // while also covering text-like controls through onInput.
  if (triggerName === 'onChange' && valuePropName === 'value') {
    controlProps.onInput = update
  }
  Object.keys(initialValueProps).forEach(key => {
    Object.defineProperty(controlProps, key, {
      enumerable: true,
      configurable: true,
      get: () =>
        props.getValueProps?.(value.value)?.[key] ??
        (key === valuePropName ? value.value : initialValueProps[key]),
    })
  })
  if (!(valuePropName in controlProps)) {
    Object.defineProperty(controlProps, valuePropName, {
      enumerable: true,
      configurable: true,
      get: () => value.value,
    })
  }
  const renderMeta = {
    get errors() {
      return meta.value.errors
    },
    get warnings() {
      return meta.value.warnings
    },
    get validating() {
      return meta.value.validating
    },
  }
  let previousConsumerValues: Record<string, any> = {}
  let currentConsumerContent: any
  let consumerRendered = false
  const consumerContent =
    !name && form && props.render
      ? computed(() => {
          void form.__INTERNAL__.version.value
          const nextValues = form.getFieldsValue(true)
          const shouldRender =
            !consumerRendered ||
            props.shouldUpdate === true ||
            props.shouldUpdate == null ||
            (typeof props.shouldUpdate === 'function' &&
              props.shouldUpdate(previousConsumerValues, nextValues))
          if (shouldRender) {
            currentConsumerContent = props.render!(nextValues, renderMeta, form)
            consumerRendered = true
          }
          previousConsumerValues = nextValues
          return currentConsumerContent
        })
      : undefined
  const renderedControl =
    name && props.render ? props.render(controlProps, renderMeta, form) : undefined
  const Control = () =>
    consumerContent ? (
      <>{consumerContent.value}</>
    ) : props.render ? (
      <>{renderedControl}</>
    ) : props.control === 'checkbox' ? (
      <input
        {...props.controlProps}
        id={id}
        type="checkbox"
        className="checkbox"
        checked={!!value.value}
        onChange={update}
        onBlur={validateBlur}
      />
    ) : props.control === 'textarea' ? (
      <textarea
        {...props.controlProps}
        id={id}
        className="textarea"
        value={value.value ?? ''}
        onInput={update}
        onChange={update}
        onBlur={validateBlur}
      />
    ) : props.control === 'input' ? (
      <input
        {...props.controlProps}
        id={id}
        className="input"
        value={value.value ?? ''}
        onInput={update}
        onChange={update}
        onBlur={validateBlur}
      />
    ) : (
      <>{props.children}</>
    )
  if (props.noStyle) return <Control />
  return (
    <div
      className={mergeClassName(
        'rue-form-item grid content-start self-start gap-3',
        props.hidden ? 'hidden' : undefined,
        props.className,
      )}
      style={props.style}
    >
      {props.label != null ? (
        <label for={id} className="font-medium">
          <span>{props.label}</span>
          {props.colon !== false ? ':' : ''}
          {resolveItemRequired(props.required, props.rules) ? (
            <span className="text-error">*</span>
          ) : null}
        </label>
      ) : null}
      <div
        className={mergeClassName(
          'min-w-0 flex-1',
          props.hasFeedback ? 'flex items-center gap-2' : undefined,
        )}
      >
        <div className="min-w-0 flex-1">
          <Control />
        </div>
        {props.hasFeedback ? (
          <span
            data-rue-form-feedback="true"
            aria-hidden="true"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center leading-none"
          >
            {meta.value.validating ? '…' : meta.value.errors.length ? '×' : '✓'}
          </span>
        ) : null}
      </div>
      {props.help != null ? (
        <div>{props.help}</div>
      ) : (
        <ErrorList errors={meta.value.errors} warnings={meta.value.warnings} />
      )}
      {props.extra != null ? <div className="text-xs">{props.extra}</div> : null}
    </div>
  )
}

/** Explicit list data and operations, independent of a JSX value protocol. */
export function createFormList(form: FormInstance, name: NamePath): FormListOperation {
  const target = form as InternalFormInstance
  const path = toNamePathArray(name)
  const read = () => {
    const value = form.getFieldValue(path)
    return Array.isArray(value) ? [...value] : []
  }
  return {
    add(value, index) {
      const list = read()
      list.splice(index ?? list.length, 0, value ?? null)
      void target.__INTERNAL__.updateListValue(path, list)
    },
    remove(index) {
      const list = read()
      for (const i of (Array.isArray(index) ? index : [index]).sort((a, b) => b - a))
        if (i >= 0 && i < list.length) list.splice(i, 1)
      void target.__INTERNAL__.updateListValue(path, list)
    },
    move(from, to) {
      const list = read()
      if (from < 0 || to < 0 || from >= list.length || to >= list.length) return
      const [value] = list.splice(from, 1)
      list.splice(to, 0, value)
      void target.__INTERNAL__.updateListValue(path, list)
    },
  }
}
const FormList: FC<FormListProps> = props => {
  const CompiledRow101 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const row = rowArg0
    const index = rowArg1
    return (
      <div data-rue-form-list-index={index}>
        {(props.fields ?? []).map(field => (
          <FormItem
            {...field}
            form={form}
            name={[...name, index, ...toNamePathArray(field.name)]}
          />
        ))}
      </div>
    )
  }

  const form = (props.form ?? useFormInstance()) as InternalFormInstance
  const name = toNamePathArray(props.name)
  const unregister = form.__INTERNAL__.registerField({
    id: `rue-form-list-${formEntitySeed++}`,
    kind: 'list',
    getNamePath: () => name,
    getRules: () => props.rules ?? [],
    getRequired: () => undefined,
    getLabel: () => name.at(-1),
    getMessageVariables: () => undefined,
    getValidateTrigger: () => ['onChange'],
    getDependencies: () => [],
    getInitialValue: () => props.initialValue,
    getPreserve: () => true,
  })
  onCleanup(unregister)
  const rows = computed(() => {
    void form.__INTERNAL__.version.value
    const list = form.getFieldValue(name)
    return Array.isArray(list) ? list : []
  })
  const operation = createFormList(form, name)
  const renderContent = props.render
    ? computed(() => {
        void form.__INTERNAL__.version.value
        const fields = rows.value.map((_row, index) => ({
          key: index,
          name: index,
          fieldKey: index,
        }))
        const meta = form.__INTERNAL__.getMeta(name)
        return props.render!(fields, operation, {
          errors: [...meta.errors],
          warnings: [...meta.warnings],
        })
      })
    : undefined
  return (
    <div data-rue-form-list-shell="true">
      {renderContent
        ? renderContent.value
        : rows.value.map((rowArg0: any, rowArg1: number) => (
            <CompiledRow101 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
    </div>
  )
}

const FormRoot: FC<FormProps> = props => {
  const formRef = useRef((props.form ?? createFormInstance()) as InternalFormInstance)
  const form = formRef.current!
  const initialized = form.__INTERNAL__.ensureInitialized(props.initialValues)
  provideContext(FormContext, () => form)
  watchEffect(() =>
    form.__INTERNAL__.setRuntimeOptions({
      name: props.name,
      preserve: props.preserve,
      validateTrigger: normalizeTriggerList(props.validateTrigger),
      validateMessages: { ...defaultValidateMessages, ...props.validateMessages },
      scrollToFirstError: props.scrollToFirstError,
      onValuesChange: props.onValuesChange,
      onFieldsChange: props.onFieldsChange,
      onFinish: props.onFinish,
      onFinishFailed: props.onFinishFailed,
    }),
  )
  onMounted(() => {
    if (initialized) queueMicrotask(() => form.__INTERNAL__.emitUpdate())
  })
  const rootRef = (element: HTMLElement | null) => form.__INTERNAL__.setRootElement(element)
  const renderedContent = props.render?.(form)
  const submit = (event: Event) => {
    event.preventDefault()
    props.onSubmit?.(event)
    form.submit()
  }
  if (props.component === false) return <>{props.render ? renderedContent : props.children}</>
  if (props.component === 'div')
    return (
      <div
        ref={rootRef}
        className={mergeClassName('rue-form grid gap-6', props.className)}
        style={props.style}
        data-rue-form="true"
      >
        {props.render ? renderedContent : props.children}
      </div>
    )
  if (props.component === 'section')
    return (
      <section
        ref={rootRef}
        className={mergeClassName('rue-form grid gap-6', props.className)}
        style={props.style}
        data-rue-form="true"
      >
        {props.render ? renderedContent : props.children}
      </section>
    )
  return (
    <form
      ref={rootRef}
      onSubmit={submit}
      className={mergeClassName('rue-form grid gap-6', props.className)}
      style={props.style}
      data-rue-form="true"
    >
      {props.render ? renderedContent : props.children}
    </form>
  )
}

type FormCompound = FC<FormProps> & {
  Item: FC<FormItemProps>
  List: FC<FormListProps>
  ErrorList: FC<FormErrorListProps>
  useForm: (form?: FormInstance) => [FormInstance]
  useFormInstance: () => FormInstance
  useWatch: (name: NamePath, form?: FormInstance) => any
}

const Form = /*#__PURE__*/ Object.assign(FormRoot, {
  Item: FormItem,
  List: FormList,
  ErrorList,
  useForm,
  useFormInstance,
  useWatch,
}) as FormCompound

/** 默认导出表单组件。 */
export default Form
