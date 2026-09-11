/*
Stat 组件概述
- 列表容器：水平/垂直布局；支持 children 或 items 数据驱动。
- 复合组件：保留 Item/Title/Value/Desc/Figure/Actions 组合能力。
- 增强数值展示：补齐 formatter / precision / prefix / suffix / loading / timer。
*/
import { Template, onUnmounted, ref, watch, type FC } from '@rue-js/rue'

/** DEFAULT_DECIMAL_SEPARATOR 内部常量。 */
const DEFAULT_DECIMAL_SEPARATOR = '.'
/** DEFAULT_GROUP_SEPARATOR 内部常量。 */
const DEFAULT_GROUP_SEPARATOR = ','
/** DEFAULT_TIMER_FORMAT 内部常量。 */
const DEFAULT_TIMER_FORMAT = 'HH:mm:ss'
/** MILLISECOND_INTERVAL 内部常量。 */
const MILLISECOND_INTERVAL = 1000 / 30
/** SECOND_INTERVAL 内部常量。 */
const SECOND_INTERVAL = 1000
/** TIME_UNITS 内部常量。 */
const TIME_UNITS: Array<[unit: StatTimerFormatUnit, milliseconds: number]> = [
  ['Y', 1000 * 60 * 60 * 24 * 365],
  ['M', 1000 * 60 * 60 * 24 * 30],
  ['D', 1000 * 60 * 60 * 24],
  ['H', 1000 * 60 * 60],
  ['m', 1000 * 60],
  ['s', 1000],
  ['S', 1],
]

/** StatsDirection 位置或方向类型。 */
export type StatsDirection = 'horizontal' | 'vertical'
/** StatTimerType 视觉或语义变体类型。 */
export type StatTimerType = 'countdown' | 'countup'
/** StatAriaLive 类型。 */
export type StatAriaLive = 'polite' | 'off' | 'assertive'
/** StatTimerFormatUnit 类型。 */
export type StatTimerFormatUnit = 'Y' | 'M' | 'D' | 'H' | 'm' | 's' | 'S'
/** StatTargetValue 值类型。 */
export type StatTargetValue = number | string | Date

interface StatFormatConfig {
  formatter?: (value?: string | number) => string | number
  precision?: number
  decimalSeparator?: string
  groupSeparator?: string
}

interface StatsProps {
  direction?: StatsDirection
  className?: string
  children?: any
  items?: ReadonlyArray<StatDataItem>
}

interface StatPartProps {
  className?: string
  style?: any
  children?: any
}

interface StatValueTextProps {
  children?: any
}

/** StatValueProps 组件属性。 */
export interface StatValueProps extends StatPartProps, StatFormatConfig {
  /** 受控值。 */
  value?: string | number
  /** 前缀内容。 */
  prefix?: string | number
  /** 后缀内容。 */
  suffix?: string | number
  /** 是否展示加载态。 */
  loading?: boolean
  /** Transform the formatted value node. */
  valueRender?: (node: any) => any
}

/** StatItemProps 组件属性。 */
export interface StatItemProps extends StatFormatConfig {
  /** center 配置项。 */
  center?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** figure 配置项。 */
  figure?: string | number
  /** figureClassName 附加类名。 */
  figureClassName?: string
  /** figureStyle 内联样式。 */
  figureStyle?: any
  /** 标题内容。 */
  title?: string | number
  /** titleClassName 附加类名。 */
  titleClassName?: string
  /** titleStyle 内联样式。 */
  titleStyle?: any
  /** 受控值。 */
  value?: string | number
  /** valueClassName 附加类名。 */
  valueClassName?: string
  /** valueStyle 内联样式。 */
  valueStyle?: any
  /** 前缀内容。 */
  prefix?: string | number
  /** 后缀内容。 */
  suffix?: string | number
  /** 是否展示加载态。 */
  loading?: boolean
  /** desc 配置项。 */
  desc?: string | number
  /** descClassName 附加类名。 */
  descClassName?: string
  /** descStyle 内联样式。 */
  descStyle?: any
  /** 操作区内容。 */
  actions?: string | number
  /** actionsClassName 附加类名。 */
  actionsClassName?: string
  /** actionsStyle 内联样式。 */
  actionsStyle?: any
}

/** StatDataItem 数据项结构。 */
export interface StatDataItem extends Omit<StatItemProps, 'children'> {
  /** 数据项唯一标识。 */
  key?: string | number
}

interface StatTimerLiteralToken {
  type: 'literal'
  content: string
}

interface StatTimerUnitToken {
  type: 'unit'
  unit: StatTimerFormatUnit
  digits: number
}

type StatTimerFormatToken = StatTimerLiteralToken | StatTimerUnitToken

/** StatTimerProps 组件属性。 */
export interface StatTimerProps {
  /** 组件类型或语义类型。 */
  type?: StatTimerType
  /** 根节点附加类名。 */
  className?: string
  /** center 配置项。 */
  center?: boolean
  /** figure 配置项。 */
  figure?: string | number
  /** figureClassName 附加类名。 */
  figureClassName?: string
  /** figureStyle 内联样式。 */
  figureStyle?: any
  /** 标题内容。 */
  title?: string | number
  /** titleClassName 附加类名。 */
  titleClassName?: string
  /** titleStyle 内联样式。 */
  titleStyle?: any
  /** valueClassName 附加类名。 */
  valueClassName?: string
  /** valueStyle 内联样式。 */
  valueStyle?: any
  /** 前缀内容。 */
  prefix?: string | number
  /** 后缀内容。 */
  suffix?: string | number
  /** 是否展示加载态。 */
  loading?: boolean
  /** desc 配置项。 */
  desc?: string | number
  /** descClassName 附加类名。 */
  descClassName?: string
  /** descStyle 内联样式。 */
  descStyle?: any
  /** 操作区内容。 */
  actions?: string | number
  /** actionsClassName 附加类名。 */
  actionsClassName?: string
  /** actionsStyle 内联样式。 */
  actionsStyle?: any
  /** 受控值。 */
  value: StatTargetValue
  /** format 配置项。 */
  format?: string
  /** interval 配置项。 */
  interval?: number
  /** ariaLive 配置项。 */
  ariaLive?: StatAriaLive
  /** 值或状态变化时触发的回调。 */
  onChange?: (value?: number) => void
  /** onFinish 事件回调。 */
  onFinish?: () => void
}

/** StatCountdownProps 组件属性。 */
export interface StatCountdownProps extends Omit<StatTimerProps, 'type'> {}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 判断是否存在 Content 的内部工具函数。 */
const hasContent = (value: any): boolean => {
  if (value === undefined || value === null || value === false) return false
  if (Array.isArray(value)) return value.some(item => hasContent(item))
  return true
}

/** parse Target Time 的内部工具函数。 */
const parseTargetTime = (value?: StatTargetValue) => {
  if (value == null) return null
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

/** format Numeric Value 的内部工具函数。 */
const formatNumericValue = ({
  value,
  formatter,
  precision,
  decimalSeparator = DEFAULT_DECIMAL_SEPARATOR,
  groupSeparator = DEFAULT_GROUP_SEPARATOR,
}: Pick<
  StatValueProps,
  'value' | 'formatter' | 'precision' | 'decimalSeparator' | 'groupSeparator'
>) => {
  if (typeof formatter === 'function') return formatter(value)
  if (!hasContent(value)) return null
  if (typeof value !== 'number' && typeof value !== 'string') return value

  const raw = String(value)
  const cells = raw.match(/^(-?)(\d*)(\.(\d+))?$/)

  if (!cells || raw === '-') return raw

  const negative = cells[1]
  let int = cells[2] || '0'
  let decimal = cells[4] || ''

  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)

  if (typeof precision === 'number' && precision >= 0) {
    decimal = decimal.padEnd(precision, '0').slice(0, precision > 0 ? precision : 0)
  }

  return `${negative}${int}${decimal ? `${decimalSeparator}${decimal}` : ''}`
}

/** parse Timer Format 的内部工具函数。 */
const parseTimerFormat = (format: string): StatTimerFormatToken[] => {
  const tokens: StatTimerFormatToken[] = []
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
        unit: current as StatTimerFormatUnit,
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

/** 读取 Timer Unit Values 的内部工具函数。 */
const getTimerUnitValues = (duration: number, tokens: StatTimerFormatToken[]) => {
  const requiredUnits = /*#__PURE__*/ new Set<StatTimerFormatUnit>()
  tokens.forEach(token => {
    if (token.type === 'unit') requiredUnits.add(token.unit)
  })

  let leftDuration = Math.max(duration, 0)
  const values = {} as Record<StatTimerFormatUnit, number>

  TIME_UNITS.forEach(([unit, milliseconds]) => {
    if (!requiredUnits.has(unit)) return
    const value = Math.floor(leftDuration / milliseconds)
    values[unit] = value
    leftDuration -= value * milliseconds
  })

  return values
}

/** format Timer Duration 的内部工具函数。 */
const formatTimerDuration = (duration: number, format: string) => {
  const tokens = parseTimerFormat(format)
  const unitValues = getTimerUnitValues(duration, tokens)
  return tokens
    .map(token => {
      if (token.type === 'literal') return token.content
      const raw = String(unitValues[token.unit] ?? 0)
      return token.digits > 1 ? raw.padStart(token.digits, '0') : raw
    })
    .join('')
}

/** 解析 Timer Interval 的内部工具函数。 */
const resolveTimerInterval = (format: string, interval?: number) => {
  if (typeof interval === 'number' && interval > 0) return interval
  return format.includes('S') ? MILLISECOND_INTERVAL : SECOND_INTERVAL
}

/** ItemContent 的内部工具函数。 */
const ItemContent: FC<Omit<StatItemProps, 'center' | 'className' | 'children'>> = ({
  figure,
  figureClassName,
  figureStyle,
  title,
  titleClassName,
  titleStyle,
  value,
  valueClassName,
  valueStyle,
  prefix,
  suffix,
  loading,
  formatter,
  precision,
  decimalSeparator,
  groupSeparator,
  desc,
  descClassName,
  descStyle,
  actions,
  actionsClassName,
  actionsStyle,
}) => {
  return (
    <>
      {hasContent(figure) ? (
        <Figure className={figureClassName} style={figureStyle}>
          {String(figure)}
        </Figure>
      ) : null}
      {hasContent(title) ? (
        <Title className={titleClassName} style={titleStyle}>
          {String(title)}
        </Title>
      ) : null}
      {loading ||
      hasContent(value) ||
      hasContent(prefix) ||
      hasContent(suffix) ||
      typeof formatter === 'function' ? (
        <Value
          className={valueClassName}
          style={valueStyle}
          value={value}
          prefix={prefix}
          suffix={suffix}
          loading={loading}
          formatter={formatter}
          precision={precision}
          decimalSeparator={decimalSeparator}
          groupSeparator={groupSeparator}
        />
      ) : null}
      {hasContent(desc) ? (
        <Desc className={descClassName} style={descStyle}>
          {String(desc)}
        </Desc>
      ) : null}
      {hasContent(actions) ? (
        <Actions className={actionsClassName} style={actionsStyle}>
          {String(actions)}
        </Actions>
      ) : null}
    </>
  )
}

/** 统计列表容器组件 */
const Stat: FC<StatsProps> = ({ direction, className, children, items }) => {
  const cls = mergeClassName(direction ? `stats stats-${direction}` : 'stats', className)
  if (items && items.length) {
    return (
      <div className={cls}>
        {items.map((item, index) => (
          <Item key={item.key ?? index} {...item} />
        ))}
      </div>
    )
  }
  return <div className={cls}>{children}</div>
}

/** 单个统计项容器 */
const Item: FC<StatItemProps> = ({
  center,
  className,
  children,
  figure,
  figureClassName,
  figureStyle,
  title,
  titleClassName,
  titleStyle,
  value,
  valueClassName,
  valueStyle,
  prefix,
  suffix,
  loading,
  formatter,
  precision,
  decimalSeparator,
  groupSeparator,
  desc,
  descClassName,
  descStyle,
  actions,
  actionsClassName,
  actionsStyle,
}) => {
  const cls = mergeClassName(center ? 'stat place-items-center' : 'stat', className)
  const shouldRenderChildren = hasContent(children)

  return (
    <div className={cls}>
      {shouldRenderChildren ? (
        children
      ) : (
        <ItemContent
          figure={figure}
          figureClassName={figureClassName}
          figureStyle={figureStyle}
          title={title}
          titleClassName={titleClassName}
          titleStyle={titleStyle}
          value={value}
          valueClassName={valueClassName}
          valueStyle={valueStyle}
          prefix={prefix}
          suffix={suffix}
          loading={loading}
          formatter={formatter}
          precision={precision}
          decimalSeparator={decimalSeparator}
          groupSeparator={groupSeparator}
          desc={desc}
          descClassName={descClassName}
          descStyle={descStyle}
          actions={actions}
          actionsClassName={actionsClassName}
          actionsStyle={actionsStyle}
        />
      )}
    </div>
  )
}

/** 标题区域 */
const Title: FC<StatPartProps> = ({ className, style, children }) => {
  return (
    <div className={mergeClassName('stat-title', className)} style={style}>
      {children}
    </div>
  )
}

/** 数值区域 */
const ValueText: FC<StatValueTextProps> = ({ children }) => {
  return (
    <span className="stat-value-text" data-stat-value="true">
      {children}
    </span>
  )
}

/** 数值区域 */
const Value: FC<StatValueProps> = (
  {
    className,
    style,
    children,
    value,
    prefix,
    suffix,
    loading,
    formatter,
    precision,
    decimalSeparator,
    groupSeparator,
  },
  slots: Record<string, any> = {},
) => {
  return (
    <div className={mergeClassName('stat-value', className)} style={style}>
      {hasContent(prefix) ? (
        <span
          className="stat-value-prefix mr-2 text-base-content/70 text-[0.55em]"
          aria-hidden="true"
        >
          {String(prefix)}
        </span>
      ) : null}
      {loading ? (
        <span
          className="skeleton inline-block h-[1.15em] w-24 max-w-full align-middle"
          data-stat-loading="true"
          aria-hidden="true"
        />
      ) : slots.value ? (
        <ValueText>{slots.value}</ValueText>
      ) : hasContent(value) ? (
        <ValueText>
          {String(
            formatNumericValue({ value, formatter, precision, decimalSeparator, groupSeparator }) ??
              '',
          )}
        </ValueText>
      ) : (
        <ValueText>{children}</ValueText>
      )}
      {hasContent(suffix) ? (
        <span
          className="stat-value-suffix ml-2 text-base-content/70 text-[0.55em]"
          aria-hidden="true"
        >
          {String(suffix)}
        </span>
      ) : null}
    </div>
  )
}

/** 描述区域 */
const Desc: FC<StatPartProps> = ({ className, style, children }) => {
  return (
    <div className={mergeClassName('stat-desc', className)} style={style}>
      {children}
    </div>
  )
}

/** 图示区域 */
const Figure: FC<StatPartProps> = ({ className, style, children }) => {
  return (
    <div className={mergeClassName('stat-figure', className)} style={style}>
      {children}
    </div>
  )
}

/** 操作区域 */
const Actions: FC<StatPartProps> = ({ className, style, children }) => {
  return (
    <div className={mergeClassName('stat-actions', className)} style={style}>
      {children}
    </div>
  )
}

/** 计时统计项：沿用 Stat 视觉结构，仅增强 value 的时间格式化能力 */
const Timer: FC<StatTimerProps> = ({
  type = 'countdown',
  className,
  center,
  figure,
  figureClassName,
  figureStyle,
  title,
  titleClassName,
  titleStyle,
  valueClassName,
  valueStyle,
  prefix,
  suffix,
  loading,
  desc,
  descClassName,
  descStyle,
  actions,
  actionsClassName,
  actionsStyle,
  value,
  format = DEFAULT_TIMER_FORMAT,
  interval,
  ariaLive,
  onChange,
  onFinish,
}) => {
  const duration = ref(0)
  const cls = mergeClassName(center ? 'stat place-items-center' : 'stat', className)
  let timer: ReturnType<typeof setInterval> | null = null
  let finished = false

  const stopTimer = () => {
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
  }

  const syncDuration = () => {
    const target = parseTargetTime(value)
    if (target == null) {
      duration.value = 0
      if (onChange) onChange(undefined)
      stopTimer()
      return false
    }

    const now = Date.now()
    const nextDuration = type === 'countup' ? Math.max(now - target, 0) : Math.max(target - now, 0)
    duration.value = nextDuration
    if (onChange) onChange(nextDuration)

    if (type === 'countdown' && nextDuration <= 0) {
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
    if (!syncDuration()) return
    timer = setInterval(syncDuration, resolveTimerInterval(format, interval))
  }

  watch(
    () => `${type}|${parseTargetTime(value) ?? 'invalid'}|${format}|${interval ?? ''}`,
    () => {
      finished = false
      startTimer()
    },
    { immediate: true },
  )

  onUnmounted(stopTimer)

  return (
    <div className={cls}>
      {hasContent(figure) ? (
        <Figure className={figureClassName} style={figureStyle}>
          {String(figure)}
        </Figure>
      ) : null}
      {hasContent(title) ? (
        <Title className={titleClassName} style={titleStyle}>
          {String(title)}
        </Title>
      ) : null}
      <Value
        className={valueClassName}
        style={valueStyle}
        prefix={prefix}
        suffix={suffix}
        loading={loading}
      >
        <span
          data-stat-timer={type}
          aria-live={ariaLive ?? (format.includes('S') ? 'off' : 'polite')}
          aria-label={String(formatTimerDuration(duration.value, format))}
        >
          {String(formatTimerDuration(duration.value, format))}
        </span>
      </Value>
      {hasContent(desc) ? (
        <Desc className={descClassName} style={descStyle}>
          {String(desc)}
        </Desc>
      ) : null}
      {hasContent(actions) ? (
        <Actions className={actionsClassName} style={actionsStyle}>
          {String(actions)}
        </Actions>
      ) : null}
    </div>
  )
}

/** Countdown 的内部工具函数。 */
const Countdown: FC<StatCountdownProps> = props => {
  return <Timer {...props} type="countdown" />
}

type StatCompound = FC<StatsProps> & {
  Item: FC<StatItemProps>
  Title: FC<StatPartProps>
  Value: FC<StatValueProps>
  Desc: FC<StatPartProps>
  Figure: FC<StatPartProps>
  Actions: FC<StatPartProps>
  Timer: FC<StatTimerProps>
  Countdown: FC<StatCountdownProps>
}

const StatCompound: StatCompound = /*#__PURE__*/ Object.assign(Stat, {
  Item,
  Title,
  Value,
  Desc,
  Figure,
  Actions,
  Timer,
  Countdown,
})

/** 默认导出统计组件。 */
export default StatCompound
