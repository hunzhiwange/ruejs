/*
基础过渡运行器概述
- 设计目标：统一封装进入/离开的过渡行为，兼容 CSS 类名驱动与 JS 钩子接管两种模式。
- 阶段语义：分为 enter/leave/appear 三类阶段；每一阶段包含 from/active/to 三个子状态，用于控制类名增删。
- 时间确定：通过 inferType 推断是 transition 还是 animation，再结合 resolveDuration 计算最终时长；若用户显式提供 duration，则优先使用。
- 事件流转：通过 emitted(props) 派发生命周期事件（before/after-appear/enter/leave），便于外部监听。
- 可扩展性：用户可覆盖类名或提供 onEnter/onLeave/onAppear 钩子，自行控制动画并在结束时调用 done()。
*/
import { emitted } from '../rue'
import {
  type TransitionPhase,
  type TransitionType,
  addClass,
  forceReflow,
  inferType,
  nextFrame,
  removeClass,
  resolveDuration,
  whenTransitionEnds,
} from './transitionUtils'

export interface BaseTransitionProps {
  name?: string
  type?: TransitionType
  css?: boolean
  appear?: boolean
  duration?: number | { enter: number; leave: number }
  // Class overrides
  enterFromClass?: string
  enterActiveClass?: string
  enterToClass?: string
  leaveFromClass?: string
  leaveActiveClass?: string
  leaveToClass?: string
  appearFromClass?: string
  appearActiveClass?: string
  appearToClass?: string
  // JS hooks
  onBeforeEnter?: (el: HTMLElement) => void
  onEnter?: (el: HTMLElement, done: () => void) => void
  onAfterEnter?: (el: HTMLElement) => void
  onEnterCancelled?: (el: HTMLElement) => void
  onBeforeLeave?: (el: HTMLElement) => void
  onLeave?: (el: HTMLElement, done: () => void) => void
  onAfterLeave?: (el: HTMLElement) => void
  onLeaveCancelled?: (el: HTMLElement) => void
  onBeforeAppear?: (el: HTMLElement) => void
  onAppear?: (el: HTMLElement, done: () => void) => void
  onAfterAppear?: (el: HTMLElement) => void
  onAppearCancelled?: (el: HTMLElement) => void
}

/** 属性详解与行为说明：
 * - name：类名前缀，默认 'rue'；例如 enter-from 类为 `${name}-enter-from`
 * - type：显式指定过渡类型（'transition' 或 'animation'），影响结束事件与时长解析
 * - css：是否启用 CSS 类名驱动；为 false 时仅执行 JS 钩子，不触碰类名
 * - appear：首次渲染时是否执行出现动画（appear）；否则按 enter 处理
 * - duration：过渡时长（毫秒）。可为数字或对象 { enter, leave }，优先于样式推断
 * - enter/leave/appearXXXClass：覆盖三阶段的 from/active/to 类名
 * - onBeforeXXX/onXXX/onAfterXXX：进入/出现/离开钩子。提供 onEnter/onLeave/onAppear 时必须在完成时调用 done()
 */
/** 根据阶段返回类名集合（支持 appear 覆盖） */
function getPhaseClasses(name: string, props: BaseTransitionProps, phase: TransitionPhase) {
  if (phase === 'appear') {
    // Rue 默认 appear 复用 enter 类；若用户提供 appear 覆盖，则使用覆盖
    return {
      from: props.appearFromClass ?? props.enterFromClass ?? `${name}-enter-from`,
      active: props.appearActiveClass ?? props.enterActiveClass ?? `${name}-enter-active`,
      to: props.appearToClass ?? props.enterToClass ?? `${name}-enter-to`,
    }
  }
  if (phase === 'enter') {
    return {
      from: props.enterFromClass ?? `${name}-enter-from`,
      active: props.enterActiveClass ?? `${name}-enter-active`,
      to: props.enterToClass ?? `${name}-enter-to`,
    }
  }
  return {
    from: props.leaveFromClass ?? `${name}-leave-from`,
    active: props.leaveActiveClass ?? `${name}-leave-active`,
    to: props.leaveToClass ?? `${name}-leave-to`,
  }
}

/** 创建过渡运行器
 * @param props 过渡属性配置
 * @returns 过渡执行函数集合：runEnter/runLeave
 */
export function createTransitionRunner(props: BaseTransitionProps) {
  const name = props.name || 'rue'
  const css = props.css !== false
  const em = emitted(props)

  /** 执行进入/出现过渡 */
  function runEnter(el: HTMLElement, phase: TransitionPhase = 'enter', onDone?: () => void) {
    const cls = getPhaseClasses(name, props, phase)

    // 钩子与事件：进入前
    if (props.onBeforeEnter) props.onBeforeEnter(el)
    if (phase === 'appear' && props.onBeforeAppear) props.onBeforeAppear(el)
    em(phase === 'appear' ? 'before-appear' : 'before-enter')

    if (css) {
      // CSS 类切换序列：
      // 1) 增加 from/active，确保初始状态与过渡属性就位
      addClass(el, cls.from)
      addClass(el, cls.active)
      // 2) 强制重排，使浏览器应用 from 状态
      forceReflow(el)
      // 3) 下一帧切换到 to，触发过渡
      nextFrame(() => {
        removeClass(el, cls.from)
        addClass(el, cls.to)
      })
    }

    // 过渡类型与时长解析：
    const type = props.type ?? inferType(el)
    const timeout = resolveDuration(el, props.type, props.duration, phase)

    const done = () => {
      // 清理类名并派发完成事件
      if (css) {
        removeClass(el, cls.active)
        removeClass(el, cls.to)
      }
      if (props.onAfterEnter) props.onAfterEnter(el)
      if (phase === 'appear' && props.onAfterAppear) props.onAfterAppear(el)
      em(phase === 'appear' ? 'after-appear' : 'after-enter')
      if (onDone) onDone()
    }

    if (props.onEnter || (phase === 'appear' && props.onAppear)) {
      // JS 钩子接管：由用户控制动画并在结束时调用 done()
      const userHook = phase === 'appear' ? props.onAppear! : props.onEnter!
      userHook(el, done)
    } else {
      // CSS/原生事件驱动：监听 transitionend/animationend 或超时兜底
      whenTransitionEnds(el, type ?? null, timeout, done)
    }
  }

  /** 执行离开过渡 */
  function runLeave(el: HTMLElement, onDone?: () => void) {
    const cls = getPhaseClasses(name, props, 'leave')

    // 钩子与事件：离开前
    if (props.onBeforeLeave) props.onBeforeLeave(el)
    em('before-leave')

    if (css) {
      // CSS 类切换序列：同 enter
      addClass(el, cls.from)
      addClass(el, cls.active)
      forceReflow(el)
      nextFrame(() => {
        removeClass(el, cls.from)
        addClass(el, cls.to)
      })
    }

    const type = props.type ?? inferType(el)
    const timeout = resolveDuration(el, props.type, props.duration, 'leave')

    const done = () => {
      // 清理类名并派发完成事件
      if (css) {
        removeClass(el, cls.active)
        removeClass(el, cls.to)
      }
      if (props.onAfterLeave) props.onAfterLeave(el)
      em('after-leave')
      if (onDone) onDone()
    }

    if (props.onLeave) {
      // JS 钩子接管
      props.onLeave(el, done)
    } else {
      // CSS/原生事件驱动
      whenTransitionEnds(el, type ?? null, timeout, done)
    }
  }

  return { runEnter, runLeave }
}
