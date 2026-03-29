/*
Countdown 组件概述
- 数据驱动：支持文本项与数值项混合渲染。
- 数值项：通过 CSS 变量 --value/--digits 控制显示，支持 aria 属性。
*/
import { h, type FC } from 'rue-js'
/* 引入 h 用于默认回退渲染；FC 约束组件签名 */

interface CountdownTextItem {
  content: any
  className?: string
}

interface CountdownValueItem {
  value: number
  digits?: number
  className?: string
  ariaLive?: 'polite' | 'off' | 'assertive'
  ariaLabel?: string
  children?: any
}

type CountdownItem = CountdownTextItem | CountdownValueItem

interface CountdownProps {
  className?: string
  children?: any
  items?: ReadonlyArray<CountdownItem>
}

/** 倒计时组件：文本与数值组合展示 */
const Countdown: FC<CountdownProps> = ({ className, children, items }) => {
  let cls = 'countdown'
  /* 附加类名 */
  if (className) cls += ` ${className}`

  if (items && items.length) {
    return (
      <span className={cls}>
        {items.map((it, i) => {
          if ('value' in it) {
            /* 数值项：传递到 Value 子组件 */
            const { value, digits, className: vCls, ariaLive, ariaLabel, children } = it
            return (
              <Value
                key={i}
                value={value}
                digits={digits}
                className={vCls}
                ariaLive={ariaLive}
                ariaLabel={ariaLabel}
              >
                {/* 子内容覆盖默认显示 */}
                {children}
              </Value>
            )
          }
          /* 文本项：直接渲染内容 */
          return (
            <span key={i} className={it.className}>
              {(it as CountdownTextItem).content}
            </span>
          )
        })}
      </span>
    )
  }

  /* children 形式 */
  return <span className={cls}>{children}</span>
}

interface ValueProps {
  value: number
  digits?: number
  className?: string
  ariaLive?: 'polite' | 'off' | 'assertive'
  ariaLabel?: string
  children?: any
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
  /* 内联样式变量：--value 与 --digits 控制显示 */
  const styleAttr = `--value:${value};${digits != null ? ` --digits:${digits};` : ''}`
  let cls = ''
  /* 附加类名 */
  if (className) cls += ` ${className}`
  return (
    <span
      style={styleAttr as any}
      aria-live={ariaLive}
      aria-label={ariaLabel ?? String(value)}
      className={cls.trim()}
    >
      {/* 回退渲染：无 children 时显示数值 */}
      {children != null ? children : h('div', null, String(value))}
    </span>
  )
}

type CountdownCompound = FC<CountdownProps> & {
  Value: FC<ValueProps>
}

const CountdownCompound: CountdownCompound = Object.assign(Countdown, {
  Value,
})

export default CountdownCompound
