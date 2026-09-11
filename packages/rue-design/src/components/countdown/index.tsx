/*
Countdown 组件概述
- 兼容静态 children / items / Countdown.Value 组合写法。
- 新增目标时间倒计时模式，支持 format / onChange / onFinish。
- 继续保持 Rue 当前基于 daisyUI countdown 的视觉与分隔符约束。
*/
import { computed, onUnmounted, ref, watch, type FC } from '@rue-js/rue'

/** DEFAULT_FORMAT 内部常量。 */
const DEFAULT_FORMAT = 'HH:mm:ss'
/** MILLISECOND_INTERVAL 内部常量。 */
const MILLISECOND_INTERVAL = 1000 / 30
/** SECOND_INTERVAL 内部常量。 */
const SECOND_INTERVAL = 1000
/** TIME_UNITS 内部常量。 */
const TIME_UNITS: Array<[unit: CountdownFormatUnit, milliseconds: number]> = [
  ['Y', 1000 * 60 * 60 * 24 * 365],
  ['M', 1000 * 60 * 60 * 24 * 30],
  ['D', 1000 * 60 * 60 * 24],
  ['H', 1000 * 60 * 60],
  ['m', 1000 * 60],
  ['s', 1000],
  ['S', 1],
]

type CountdownAriaLive = 'polite' | 'off' | 'assertive'
type CountdownFormatUnit = 'Y' | 'M' | 'D' | 'H' | 'm' | 's' | 'S'

/** CountdownTextItem 数据项结构。 */
export interface CountdownTextItem {
  /** 主体内容。 */
  content: any
  /** 根节点附加类名。 */
  className?: string
}

/** CountdownValueItem 数据项结构。 */
export interface CountdownValueItem {
  /** 受控值。 */
  value: number
  /** digits 配置项。 */
  digits?: number
  /** 根节点附加类名。 */
  className?: string
  /** ariaLive 配置项。 */
  ariaLive?: CountdownAriaLive
  /** ariaLabel 标签内容。 */
  ariaLabel?: string
  /** 组件子内容。 */
  children?: any
}

/** CountdownItem 类型。 */
export type CountdownItem = CountdownTextItem | CountdownValueItem
/** CountdownTargetValue 值类型。 */
export type CountdownTargetValue = number | string | Date

interface CountdownLiteralToken {
  type: 'literal'
  content: string
}

interface CountdownUnitToken {
  type: 'unit'
  unit: CountdownFormatUnit
  digits: number
}

type CountdownFormatToken = CountdownLiteralToken | CountdownUnitToken

/** CountdownProps 组件属性。 */
export interface CountdownProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<CountdownItem>
  /** 受控值。 */
  value?: CountdownTargetValue
  /** format 配置项。 */
  format?: string
  /** interval 配置项。 */
  interval?: number
  /** ariaLive 配置项。 */
  ariaLive?: CountdownAriaLive
  /** 值或状态变化时触发的回调。 */
  onChange?: (remaining?: number) => void
  /** onFinish 事件回调。 */
  onFinish?: () => void
}

/** ValueProps 组件属性。 */
export interface ValueProps {
  /** 受控值。 */
  value: number
  /** digits 配置项。 */
  digits?: number
  /** 根节点附加类名。 */
  className?: string
  /** ariaLive 配置项。 */
  ariaLive?: CountdownAriaLive
  /** ariaLabel 标签内容。 */
  ariaLabel?: string
  /** 组件子内容。 */
  children?: any
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** parse Target Time 的内部工具函数。 */
const parseTargetTime = (value?: CountdownTargetValue) => {
  if (value == null) return null
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

/** parse Format 的内部工具函数。 */
const parseFormat = (format: string): CountdownFormatToken[] => {
  const tokens: CountdownFormatToken[] = []
  let index = 0

  while (index < format.length) {
    const current = format[index]

    if (current === '[') {
      const closeIndex = format.indexOf(']', index + 1)
      const content =
        closeIndex === -1 ? format.slice(index + 1) : format.slice(index + 1, closeIndex)
      if (content) {
        const prev = tokens[tokens.length - 1]
        if (prev?.type === 'literal') prev.content += content
        else tokens.push({ type: 'literal', content })
      }
      index = closeIndex === -1 ? format.length : closeIndex + 1
      continue
    }

    if (/[YMDHmsS]/.test(current)) {
      let end = index + 1
      while (end < format.length && format[end] === current) end += 1
      tokens.push({
        type: 'unit',
        unit: current as CountdownFormatUnit,
        digits: end - index,
      })
      index = end
      continue
    }

    let end = index + 1
    while (end < format.length && format[end] !== '[' && !/[YMDHmsS]/.test(format[end])) end += 1
    const content = format.slice(index, end)
    if (content) {
      const prev = tokens[tokens.length - 1]
      if (prev?.type === 'literal') prev.content += content
      else tokens.push({ type: 'literal', content })
    }
    index = end
  }

  return tokens
}

/** 读取 Unit Values 的内部工具函数。 */
const getUnitValues = (duration: number, tokens: CountdownFormatToken[]) => {
  const remainingUnits = /*#__PURE__*/ new Set<CountdownFormatUnit>()
  tokens.forEach(token => {
    if (token.type === 'unit') remainingUnits.add(token.unit)
  })

  let leftDuration = Math.max(duration, 0)
  const values = {} as Record<CountdownFormatUnit, number>

  TIME_UNITS.forEach(([unit, milliseconds]) => {
    if (!remainingUnits.has(unit)) return
    const value = Math.floor(leftDuration / milliseconds)
    values[unit] = value
    leftDuration -= value * milliseconds
  })

  return values
}

/** 解析 Timer Interval 的内部工具函数。 */
const resolveTimerInterval = (format: string, interval?: number) => {
  if (typeof interval === 'number' && interval > 0) return interval
  return format.includes('S') ? MILLISECOND_INTERVAL : SECOND_INTERVAL
}

/** 判断 Countdown Item 是否为数值段。 */
const isValueItem = (item: CountdownItem): item is CountdownValueItem => {
  return 'value' in item
}

/** 构建 Value 的 CSS 变量字符串，避免 callback ref 在 Vapor 更新路径里只跑首次挂载。 */
const buildValueStyle = (value: number, digits?: number) => {
  let style = `--value: ${String(value)};`
  if (digits != null) {
    style += ` --digits: ${String(digits)};`
  }
  return style
}

/** 在 countdown 的 inline-flex 文本分隔符中保留 format 写出的空格。 */
const renderLiteralContent = (content: any) => {
  return typeof content === 'string' ? content.replace(/ /g, '\u00a0') : content
}

/** 读取 format token 对应的显示位数。 */
const getTokenDigits = (token: CountdownUnitToken) => {
  return token.digits > 1 ? token.digits : undefined
}

/** 读取 format token 对应的当前值。 */
const getTokenValue = (
  token: CountdownUnitToken,
  values: Partial<Record<CountdownFormatUnit, number>>,
) => {
  return values[token.unit] ?? 0
}

/** 倒计时组件：支持静态拼装与目标时间倒计时两种模式 */
const Countdown: FC<CountdownProps> = ({
  className,
  children,
  items,
  value,
  format = DEFAULT_FORMAT,
  interval,
  ariaLive,
  onChange,
  onFinish,
}) => {
  const remaining = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null
  let finished = false
  let rootElement: HTMLElement | null = null

  const stopTimer = () => {
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
  }

  const syncRemaining = () => {
    const target = parseTargetTime(value)
    if (target == null) {
      remaining.value = 0

      if (onChange) onChange(undefined)
      stopTimer()
      return false
    }

    const nextRemaining = Math.max(target - Date.now(), 0)
    remaining.value = nextRemaining

    if (onChange) onChange(nextRemaining)

    if (nextRemaining <= 0) {
      stopTimer()
      if (!finished) {
        finished = true
        if (onFinish) onFinish()
      }
      return false
    }

    finished = false
    return true
  }

  const startTimer = () => {
    stopTimer()
    if (value == null) {
      remaining.value = 0
      return
    }
    if (!syncRemaining()) return
    timer = setInterval(syncRemaining, resolveTimerInterval(format, interval))
  }

  watch(
    () => `${parseTargetTime(value) ?? 'invalid'}|${format}|${interval ?? ''}`,
    () => {
      finished = false
      startTimer()
    },
    { immediate: true },
  )

  onUnmounted(stopTimer)

  const resolvedClassName = computed(() => mergeClassName('countdown', className))
  const hasItems = computed(() => !!(items && items.length))
  const usesTimerMode = computed(() => !hasItems.get() && value != null)
  const formatTokens = computed(() => parseFormat(format))
  const resolvedAriaLive = computed<CountdownAriaLive>(
    () => ariaLive ?? (format.includes('S') ? 'off' : 'polite'),
  )
  const getTimerTokenValue = (token: CountdownUnitToken) => {
    return getTokenValue(token, getUnitValues(remaining.value, formatTokens.get()))
  }

  return (
    <span className={resolvedClassName.get()}>
      {hasItems.get()
        ? (items ?? []).map(item =>
            isValueItem(item) ? (
              <span
                style={buildValueStyle(item.value, item.digits)}
                aria-live={item.ariaLive ?? 'polite'}
                aria-label={item.ariaLabel ?? String(item.value)}
                data-countdown-value={String(item.value)}
                {...(item.digits != null ? { 'data-countdown-digits': String(item.digits) } : {})}
                className={item.className ? item.className.trim() : ''}
              >
                {item.children}
              </span>
            ) : (
              renderLiteralContent(item.content)
            ),
          )
        : usesTimerMode.get()
          ? formatTokens
              .get()
              .map((token, index) =>
                token.type === 'unit' ? (
                  <span
                    key={index}
                    data-countdown-token-index={String(index)}
                    style={buildValueStyle(getTimerTokenValue(token), getTokenDigits(token))}
                    aria-live={resolvedAriaLive.get()}
                    aria-label={String(getTimerTokenValue(token))}
                    data-countdown-value={String(getTimerTokenValue(token))}
                    {...(getTokenDigits(token) != null
                      ? { 'data-countdown-digits': String(getTokenDigits(token)) }
                      : {})}
                  />
                ) : (
                  renderLiteralContent(token.content)
                ),
              )
          : children}
    </span>
  )
}

/** 数值子组件：通过 CSS 变量控制显示位数 */
const Value: FC<ValueProps> = ({
  value,
  digits,
  className,
  ariaLive = 'polite',
  ariaLabel,
  children,
}) => {
  const resolvedClassName = className ? className.trim() : ''

  return (
    <span
      style={buildValueStyle(value, digits)}
      aria-live={ariaLive}
      aria-label={ariaLabel ?? String(value)}
      data-countdown-value={String(value)}
      {...(digits != null ? { 'data-countdown-digits': String(digits) } : {})}
      className={resolvedClassName}
    >
      {children != null ? children : String(value)}
    </span>
  )
}

type CountdownCompound = FC<CountdownProps> & {
  Value: FC<ValueProps>
}

const CountdownCompound: CountdownCompound = /*#__PURE__*/ Object.assign(Countdown, {
  Value,
})

/** 默认导出倒计时组件。 */
export default CountdownCompound
