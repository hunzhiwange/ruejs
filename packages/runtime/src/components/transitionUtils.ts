/*
过渡工具集概述
- 类型定义：TransitionType/TransitionPhase 用于标识过渡类型与阶段，统一 API 输入输出。
- 类名操作：addClass/removeClass 支持空格分隔批量处理，减少 DOM 接触次数。
- 帧控制与布局：nextFrame 通过双 RAF 保证样式变更跨帧应用；forceReflow 通过读取布局触发重排。
- 时间解析：toMs 解析 CSS 时间字符串（含逗号分段）；sumTimeTokens 解析 style 行内配置的每段 duration+delay 总和。
- 类型推断与时长：inferType/resolveDuration 综合 computed styles 与显式配置，得到最终过渡类型与时长（毫秒）。
- 结束监听：whenTransitionEnds 通过事件监听并结合超时兜底，确保在最坏情况下也能执行回调。
*/
export type TransitionType = 'transition' | 'animation'
export type TransitionPhase = 'enter' | 'leave' | 'appear'

/** 为元素添加类（支持空格分隔的多个类） */
export function addClass(el: HTMLElement, cls?: string) {
  if (!cls) return
  cls.split(/\s+/).forEach(c => c && el.classList.add(c))
}

/** 为元素移除类（支持空格分隔的多个类） */
export function removeClass(el: HTMLElement, cls?: string) {
  if (!cls) return
  cls.split(/\s+/).forEach(c => c && el.classList.remove(c))
}

/** 在下一帧的下一帧执行函数（确保样式应用） */
export function nextFrame(fn: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(fn))
}

/** 强制触发布局计算（用于确保过渡起点生效） */
export function forceReflow(el?: HTMLElement): number {
  const targetDocument = el ? el.ownerDocument! : document
  return targetDocument.body.offsetHeight
}

/** 将 CSS 时间字符串转换为毫秒总和（支持逗号分段） */
export function toMs(val: string): number {
  if (val === 'auto') return 0
  return val
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => (s.endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000))
    .reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)
}

/** 解析 style.transition/animation 字符串中每段的 duration+delay 总和 */
function sumTimeTokens(s: string): number {
  if (!s) return 0
  return s
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const tokens = part.split(/\s+/)
      const times: number[] = []
      for (const tk of tokens) {
        if (/[0-9.]+m?s$/.test(tk)) {
          const n = tk.endsWith('ms') ? parseFloat(tk) : parseFloat(tk) * 1000
          if (!isNaN(n)) times.push(n)
        }
      }
      const dur = times[0] || 0
      const delay = times[1] || 0
      return dur + delay
    })
    .reduce((a, b) => a + b, 0)
}

/** 根据样式推断过渡类型（或按 expected 优先） */
export function inferType(el: HTMLElement, expected?: TransitionType): TransitionType | null {
  const styles = window.getComputedStyle(el)
  const t = toMs(styles.transitionDuration) + toMs(styles.transitionDelay)
  const a = toMs(styles.animationDuration) + toMs(styles.animationDelay)
  if (expected) {
    if (expected === 'transition') {
      if (t > 0) return 'transition'
      const ts = sumTimeTokens(el.style.transition)
      return ts > 0 ? 'transition' : null
    } else {
      if (a > 0) return 'animation'
      const as = sumTimeTokens(el.style.animation)
      return as > 0 ? 'animation' : null
    }
  }
  if (t === 0 && a === 0) {
    const ts = sumTimeTokens(el.style.transition)
    const as = sumTimeTokens(el.style.animation)
    if (ts === 0 && as === 0) return null
    return ts >= as ? 'transition' : 'animation'
  }
  return t >= a ? 'transition' : 'animation'
}

/** 解析过渡时长（优先使用 specified；否则从样式推断） */
export function resolveDuration(
  el: HTMLElement,
  expected: TransitionType | undefined,
  specified: number | { enter: number; leave: number } | undefined,
  phase: TransitionPhase,
): number {
  if (specified != null) {
    if (typeof specified === 'number') return specified
    return phase === 'leave' ? specified.leave : specified.enter
  }
  const styles = window.getComputedStyle(el)
  const t = toMs(styles.transitionDuration) + toMs(styles.transitionDelay)
  const a = toMs(styles.animationDuration) + toMs(styles.animationDelay)
  if (t === 0 && a === 0) {
    const ts = sumTimeTokens(el.style.transition)
    const as = sumTimeTokens(el.style.animation)
    if (expected) return expected === 'transition' ? ts : as
    return Math.max(ts, as)
  }
  if (expected) return expected === 'transition' ? t : a
  return Math.max(t, a)
}

/** 在过渡结束时调用回调（事件或超时兜底） */
export function whenTransitionEnds(
  el: HTMLElement,
  type: TransitionType | null,
  timeout: number,
  cb: () => void,
) {
  if (!type || timeout === 0) {
    cb()
    return
  }
  let called = false
  const endEvent = type === 'transition' ? 'transitionend' : 'animationend'
  const onEnd = (e: Event) => {
    if (called) return
    if (e.target !== el) return
    called = true
    el.removeEventListener(endEvent, onEnd)
    cb()
  }
  el.addEventListener(endEvent, onEnd)
  // 超时兜底：即使事件未触发也能确保回调被调用，+50ms 偏移用于规避时间舍入误差
  setTimeout(() => {
    if (called) return
    called = true
    el.removeEventListener(endEvent, onEnd)
    cb()
  }, timeout + 50)
}
