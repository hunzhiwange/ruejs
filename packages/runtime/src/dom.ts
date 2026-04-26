/*
架构设计总览
- DOMAdapter 抽象：定义跨宿主（浏览器/SSR/自定义渲染器）一致的节点与元素操作。
- BrowserDOMAdapter 实现：以原生 document 为后端，提供创建、插入、样式、属性、事件等完整能力。
- CURRENT_ADAPTER：保存当前适配器，支持运行时替换；通过 globalThis.__rue_dom 暴露统一代理。
- 工具函数导出：对适配器方法进行薄封装，便于以函数式调用和 tree-shaking。
*/
export interface DomNodeLike {
  nextSibling?: DomNodeLike | null
  firstChild?: DomNodeLike | null
}
// 节点最小能力模型：只暴露必要的结构引用，避免绑定具体平台类型
export interface DomElementLike extends DomNodeLike {
  innerHTML?: any
}
// 片段与文本占位接口：用于抽象 DocumentFragment/Text 等非元素节点
export interface DomFragmentLike extends DomNodeLike {}
export interface DomTextLike extends DomNodeLike {}

export interface DOMAdapter {
  /** 创建注释节点
   * @param data 注释文本内容
   * @returns 抽象的注释节点
   */
  createComment(data: string): DomNodeLike
  /** 创建文本节点
   * @param data 文本内容
   * @returns 抽象的文本节点
   */
  createTextNode(data: string): DomTextLike
  /** 创建元素节点
   * @param tag 标签名（支持 SVG 标签）
   * @returns 抽象的元素节点
   */
  createElement(tag: string): DomElementLike
  /** 创建文本包装元素
   * @param parent 父元素，用于判断是否在 SVG 环境
   * @returns 在 SVG 中返回 <text>，HTML 中返回 <span>
   */
  createTextWrapper(parent: DomElementLike): DomElementLike
  /** 设置行内样式
   * @param el 目标元素
   * @param style 字符串形式、部分 CSSStyleDeclaration，或 null/undefined 清空
   */
  setStyle(
    el: DomElementLike,
    style: string | Partial<CSSStyleDeclaration> | null | undefined,
  ): void
  /** 样式增量补丁
   * @param el 目标元素
   * @param oldStyle 旧样式对象
   * @param newStyle 新样式对象
   */
  patchStyle(
    el: DomElementLike,
    oldStyle: Partial<CSSStyleDeclaration> | undefined,
    newStyle: Partial<CSSStyleDeclaration> | undefined,
  ): void
  /** 设置节点文本内容
   * @param el 目标节点
   * @param val 值，null/undefined/boolean 将写为空字符串
   */
  settextContent(el: DomNodeLike, val: any): void
  /** 创建文档片段
   * @returns 抽象的文档片段节点
   */
  createDocumentFragment(): DomFragmentLike
  /** 追加子节点
   * @param parent 父节点
   * @param child 子节点
   */
  appendChild(parent: DomNodeLike, child: DomNodeLike): void
  /** 移除子节点
   * @param parent 父节点
   * @param child 子节点
   */
  removeChild(parent: DomNodeLike, child: DomNodeLike): void
  /** 在参照节点前插入
   * @param parent 父节点
   * @param child 插入的子节点
   * @param ref 参照节点，可为 null 表示尾部
   */
  insertBefore(parent: DomNodeLike, child: DomNodeLike, ref: DomNodeLike | null): void
  /** 用新节点替换旧节点
   * @param parent 父节点
   * @param newChild 新子节点
   * @param oldChild 旧子节点
   */
  replaceChild(parent: DomNodeLike, newChild: DomNodeLike, oldChild: DomNodeLike): void
  /** 使用选择器查询元素
   * @param selector CSS 选择器
   * @returns 抽象的元素或 null
   */
  querySelector(selector: string): DomElementLike | null
  /** 设置属性
   * @param el 目标元素
   * @param name 属性名
   * @param value 属性值（统一转字符串）
   */
  setAttribute(el: DomElementLike, name: string, value: any): void
  /** 移除属性
   * @param el 目标元素
   * @param name 属性名
   */
  removeAttribute(el: DomElementLike, name: string): void
  /** 添加事件监听
   * @param el 目标元素
   * @param eventName 事件名
   * @param listener 事件处理函数
   */
  addEventListener(el: DomElementLike, eventName: string, listener: DOMEventHandler): void
  /** 移除事件监听
   * @param el 目标元素
   * @param eventName 事件名
   * @param listener 事件处理函数
   */
  removeEventListener(el: DomElementLike, eventName: string, listener: DOMEventHandler): void
  /** 设置类名
   * @param el 目标元素
   * @param value 类名字符串
   */
  setClassName(el: DomElementLike, value: string): void
  /** 设置 innerHTML
   * @param el 目标元素（HTMLElement）
   * @param html HTML 字符串
   */
  setInnerHTML(el: DomElementLike, html: string): void
  /** 设置表单值
   * @param el 目标元素
   * @param value 值，兼容 select[multiple] 与普通可写 value
   */
  setValue(el: DomElementLike, value: any): void
  /** 设置选中状态
   * @param el 目标元素
   * @param checked 是否选中
   */
  setChecked(el: DomElementLike, checked: boolean): void
  /** 设置禁用状态
   * @param el 目标元素
   * @param disabled 是否禁用
   */
  setDisabled(el: DomElementLike, disabled: boolean): void
  /** 获取标签名
   * @param el 目标元素
   * @returns 标签名（原生 tagName）
   */
  getTagName(el: DomElementLike): string
  /** 判断父子包含关系
   * @param parent 父节点
   * @param child 子节点
   * @returns 是否包含
   */
  contains(parent: DomNodeLike, child: DomNodeLike): boolean
  /** 获取父节点
   * @param node 当前节点
   * @returns 父节点或 null
   */
  getParentNode(node: DomNodeLike): DomNodeLike | null
  /** 判断是否为文档片段
   * @param node 当前节点
   * @returns 是否为 DocumentFragment
   */
  isFragment(node: DomNodeLike): boolean
  /** 收集片段的所有子节点
   * @param node 当前节点或片段
   * @returns 若为片段返回其子节点数组，否则返回自身数组
   */
  collectFragmentChildren(node: DomNodeLike): DomNodeLike[]
  /** 应用 ref
   * @param el 目标元素
   * @param ref 函数或 {current: T} 对象
   */
  applyRef(el: DomElementLike, ref: any): void
  /** 清理 ref
   * @param ref 函数或 {current: T} 对象
   */
  clearRef(ref: any): void
}

// SVG 标签命名空间与白名单：用于 createElement 的分支创建
const SVG_NS = 'http://www.w3.org/2000/svg'
const SVG_TAGS = new Set([
  'svg',
  'g',
  'circle',
  'ellipse',
  'line',
  'path',
  'polygon',
  'polyline',
  'rect',
  'text',
  'tspan',
  'defs',
  'clipPath',
  'mask',
  'pattern',
  'linearGradient',
  'radialGradient',
  'stop',
  'use',
  'symbol',
  'marker',
  'foreignObject',
])

export class BrowserDOMAdapter implements DOMAdapter {
  /** 注释节点：委托原生 document.createComment */
  createComment(data: string) {
    return document.createComment(data) as any
  }
  /** 文本节点：委托原生 document.createTextNode */
  createTextNode(data: string) {
    return document.createTextNode(data) as any
  }
  /** 元素节点：SVG 使用 createElementNS，否则使用 createElement */
  createElement(tag: string) {
    return (
      SVG_TAGS.has(tag) ? document.createElementNS(SVG_NS, tag) : document.createElement(tag)
    ) as any
  }
  /**
   * 文本包装器。
   *
   * 这里要区分三种情况：
   * 1. HTML 父节点：继续返回 <span>，和原来一样。
   * 2. 普通 SVG 容器（如 <g>、<svg>）：返回 <text>，因为它本身就是一段 SVG 文本的承载节点。
   * 3. 已经处在 SVG 文本容器内部（<text> / <tspan>）：必须返回 <tspan>，不能再返回 <text>。
   *
   * 这条分支是本次修复的关键。
   * 之前统一在 SVG 下返回 <text>，会把：
   *
   * <text>{expr}ms</text>
   *
   * 渲染成：
   *
   * <text><text>0</text>ms</text>
   *
   * 这在 SVG 里语义是错的，浏览器兼容表现也会很怪，看起来像“表达式空了”或文字布局异常。
   * 正确做法是在 text 内部用 tspan 包住动态片段，得到：
   *
   * <text><tspan>0</tspan>ms</text>
   */
  createTextWrapper(parent: DomElementLike) {
    const p = parent as any
    // 这里读取父节点 tagName，而不是只判断“是不是 SVGElement”，
    // 因为 <g> 和 <text> 都是 SVGElement，但它们需要的文本子节点类型并不一样。
    const tagName = typeof p?.tagName === 'string' ? p.tagName.toLowerCase() : ''
    return (
      p instanceof SVGElement
        ? this.createElement(tagName === 'text' || tagName === 'tspan' ? 'tspan' : 'text')
        : this.createElement('span')
    ) as any
  }
  /** 设置行内样式：支持字符串/对象，null/undefined 清空 */
  setStyle(el: DomElementLike, style: string | Partial<CSSStyleDeclaration> | null | undefined) {
    if (typeof style === 'string') {
      ;(el as any).setAttribute('style', style)
    } else if (style && typeof style === 'object') {
      Object.assign((el as any).style, style)
    } else {
      ;(el as any).removeAttribute('style')
    }
  }
  /** 文本内容：空值/布尔值写空，其余转字符串 */
  settextContent(el: DomNodeLike, val: any) {
    ;(el as any).textContent = val == null || typeof val === 'boolean' ? '' : String(val)
  }
  /** 创建文档片段：用于批量插入提升性能 */
  createDocumentFragment() {
    return document.createDocumentFragment() as any
  }
  /** 追加子节点：parent.appendChild(child) */
  appendChild(parent: DomNodeLike, child: DomNodeLike) {
    ;(parent as any).appendChild(child)
  }
  /** 移除子节点：parent.removeChild(child) */
  removeChild(parent: DomNodeLike, child: DomNodeLike) {
    ;(parent as any).removeChild(child)
  }
  /** 插入子节点：parent.insertBefore(child, ref) */
  insertBefore(parent: DomNodeLike, child: DomNodeLike, ref: DomNodeLike | null) {
    ;(parent as any).insertBefore(child, ref)
  }
  /** 替换子节点：parent.replaceChild(newChild, oldChild) */
  replaceChild(parent: DomNodeLike, newChild: DomNodeLike, oldChild: DomNodeLike) {
    ;(parent as any).replaceChild(newChild, oldChild)
  }
  /** 选择器查询：document.querySelector(selector) */
  querySelector(selector: string) {
    return document.querySelector(selector) as any
  }
  /** 设置属性：值统一转字符串 */
  setAttribute(el: DomElementLike, name: string, value: any) {
    ;(el as any).setAttribute(name, String(value))
  }
  /** 移除属性 */
  removeAttribute(el: DomElementLike, name: string) {
    ;(el as any).removeAttribute(name)
  }
  /** 添加事件监听：el.addEventListener(eventName, listener) */
  addEventListener(el: DomElementLike, eventName: string, listener: DOMEventHandler) {
    ;(el as any).addEventListener(eventName, listener)
  }
  /** 移除事件监听：el.removeEventListener(eventName, listener) */
  removeEventListener(el: DomElementLike, eventName: string, listener: DOMEventHandler) {
    ;(el as any).removeEventListener(eventName, listener)
  }
  /** 设置类名：SVG 用属性 'class'，HTML 用 className */
  setClassName(el: DomElementLike, value: string) {
    if ((el as any) instanceof SVGElement) {
      ;(el as any).setAttribute('class', value)
    } else {
      ;(el as any as HTMLElement).className = value
    }
  }
  /** 设置 innerHTML：仅 HTMLElement 生效 */
  setInnerHTML(el: DomElementLike, html: string) {
    ;(el as any as HTMLElement).innerHTML = html
  }
  /** 样式增量补丁：移除旧键，批量赋新样式 */
  patchStyle(
    el: DomElementLike,
    oldStyle: Partial<CSSStyleDeclaration> | undefined,
    newStyle: Partial<CSSStyleDeclaration> | undefined,
  ) {
    const prev = oldStyle || {}
    const next = newStyle || {}
    for (const k of Object.keys(prev)) {
      if (!(k in next)) ((el as any).style as any)[k] = ''
    }
    Object.assign((el as any).style, next)
  }
  /** 设置表单值：兼容 select[multiple]、select 与可写 value 元素 */
  setValue(el: DomElementLike, value: any) {
    const anyEl = el as any
    const tag = (anyEl.tagName || '').toUpperCase()
    if (tag === 'SELECT') {
      if (anyEl.multiple && Array.isArray(value)) {
        for (let i = 0; i < anyEl.options.length; i++) {
          const opt = anyEl.options[i]
          opt.selected = (value as string[]).indexOf(opt.value) !== -1
        }
      } else {
        anyEl.value = value
      }
      return
    }
    if (anyEl.value !== undefined) {
      anyEl.value = value
    } else {
      anyEl.setAttribute('value', String(value))
    }
  }
  /** 设置选中状态：优先属性，其次属性开关 */
  setChecked(el: DomElementLike, checked: boolean) {
    const anyEl = el as any
    if (anyEl.checked !== undefined) {
      anyEl.checked = checked
    } else {
      if (checked) anyEl.setAttribute('checked', '')
      else anyEl.removeAttribute('checked')
    }
  }
  /** 设置禁用状态：优先属性，其次属性开关 */
  setDisabled(el: DomElementLike, disabled: boolean) {
    const anyEl = el as any
    if (anyEl.disabled !== undefined) {
      anyEl.disabled = disabled
    } else {
      if (disabled) anyEl.setAttribute('disabled', '')
      else anyEl.removeAttribute('disabled')
    }
  }
  /** 获取标签名：返回原生 tagName */
  getTagName(el: DomElementLike) {
    return (el as any as HTMLElement).tagName
  }
  /** 包含关系判断：优先原生 contains，缺省 false */
  contains(parent: DomNodeLike, child: DomNodeLike) {
    return (parent as any).contains?.(child as any) ?? false
  }
  /** 父节点获取：不存在返回 null */
  getParentNode(node: DomNodeLike) {
    return (node as any).parentNode || null
  }
  /** 是否为文档片段：nodeType === 11 */
  isFragment(node: DomNodeLike) {
    return (node as any).nodeType === 11
  }
  /** 片段子节点收集：Fragment 返回所有子节点，否则返回自身 */
  collectFragmentChildren(node: DomNodeLike) {
    if (this.isFragment(node)) {
      return Array.from((node as any as DocumentFragment).childNodes) as any
    }
    return [node]
  }
  /** 应用 ref：函数立即调用，对象写入 current */
  applyRef(el: DomElementLike, ref: any) {
    if (typeof ref === 'function') {
      ;(ref as Function)(el)
    } else if (ref && typeof ref === 'object' && 'current' in ref) {
      ;(ref as any).current = el
    }
  }
  /** 清理 ref：函数传入 null，对象置为 undefined */
  clearRef(ref: any) {
    if (typeof ref === 'function') {
      ;(ref as Function)(null)
    } else if (ref && typeof ref === 'object' && 'current' in ref) {
      ;(ref as any).current = undefined
    }
  }
}

// 当前适配器：默认使用浏览器实现，可在运行时替换
let CURRENT_ADAPTER: DOMAdapter = new BrowserDOMAdapter()

type GlobalDOMBridge = {
  createElement: (tag: string) => DomElementLike
  createTextNode: (data: string) => DomTextLike
  createDocumentFragment: () => DomFragmentLike
  isFragment: (node: DomNodeLike) => boolean
  collectFragmentChildren: (node: DomNodeLike) => DomNodeLike[]
  setTextContent: (el: DomNodeLike, val: any) => void
  appendChild: (parent: DomNodeLike, child: DomNodeLike) => void
  insertBefore: (parent: DomNodeLike, child: DomNodeLike, ref: DomNodeLike | null) => void
  removeChild: (parent: DomNodeLike, child: DomNodeLike) => void
  contains: (parent: DomNodeLike, child: DomNodeLike) => boolean
  setClassName: (el: DomElementLike, value: string) => void
  patchStyle: (
    el: DomElementLike,
    oldStyle: Record<string, string>,
    newStyle: Record<string, string>,
  ) => void
  setInnerHTML: (el: DomElementLike, html: string) => void
  setValue: (el: DomElementLike, value: any) => void
  setChecked: (el: DomElementLike, checked: boolean) => void
  setDisabled: (el: DomElementLike, disabled: boolean) => void
  clearRef: (ref: any) => void
  applyRef: (el: DomElementLike, ref: any) => void
  setAttribute: (el: DomElementLike, name: string, value: any) => void
  removeAttribute: (el: DomElementLike, name: string) => void
  getTagName: (el: DomElementLike) => string
  addEventListener: (el: DomElementLike, eventName: string, listener: DOMEventHandler) => void
  removeEventListener: (
    el: DomElementLike,
    eventName: string,
    listener: DOMEventHandler,
  ) => void
  hasValueProperty: (el: DomElementLike) => boolean
  isSelectMultiple: (el: DomElementLike) => boolean
  querySelector: (selector: string) => DomElementLike | null
}

const createGlobalDOMBridge = (): GlobalDOMBridge => ({
  createElement: (tag: string) => CURRENT_ADAPTER.createElement(tag),
  createTextNode: (data: string) => CURRENT_ADAPTER.createTextNode(data),
  createDocumentFragment: () => CURRENT_ADAPTER.createDocumentFragment(),
  isFragment: (node: DomNodeLike) => CURRENT_ADAPTER.isFragment(node),
  collectFragmentChildren: (node: DomNodeLike) => CURRENT_ADAPTER.collectFragmentChildren(node),
  setTextContent: (el: DomNodeLike, val: any) => CURRENT_ADAPTER.settextContent(el, val),
  appendChild: (parent: DomNodeLike, child: DomNodeLike) => CURRENT_ADAPTER.appendChild(parent, child),
  insertBefore: (parent: DomNodeLike, child: DomNodeLike, ref: DomNodeLike | null) =>
    CURRENT_ADAPTER.insertBefore(parent, child, ref),
  removeChild: (parent: DomNodeLike, child: DomNodeLike) => CURRENT_ADAPTER.removeChild(parent, child),
  contains: (parent: DomNodeLike, child: DomNodeLike) => CURRENT_ADAPTER.contains(parent, child),
  setClassName: (el: DomElementLike, value: string) => CURRENT_ADAPTER.setClassName(el, value),
  patchStyle: (
    el: DomElementLike,
    oldStyle: Record<string, string>,
    newStyle: Record<string, string>,
  ) => CURRENT_ADAPTER.patchStyle(el, oldStyle as any, newStyle as any),
  setInnerHTML: (el: DomElementLike, html: string) => CURRENT_ADAPTER.setInnerHTML(el, html),
  setValue: (el: DomElementLike, value: any) => CURRENT_ADAPTER.setValue(el, value),
  setChecked: (el: DomElementLike, checked: boolean) => CURRENT_ADAPTER.setChecked(el, checked),
  setDisabled: (el: DomElementLike, disabled: boolean) => CURRENT_ADAPTER.setDisabled(el, disabled),
  clearRef: (ref: any) => CURRENT_ADAPTER.clearRef(ref),
  applyRef: (el: DomElementLike, ref: any) => CURRENT_ADAPTER.applyRef(el, ref),
  setAttribute: (el: DomElementLike, name: string, value: any) =>
    CURRENT_ADAPTER.setAttribute(el, name, value),
  removeAttribute: (el: DomElementLike, name: string) => CURRENT_ADAPTER.removeAttribute(el, name),
  getTagName: (el: DomElementLike) => CURRENT_ADAPTER.getTagName(el),
  addEventListener: (el: DomElementLike, eventName: string, listener: DOMEventHandler) =>
    CURRENT_ADAPTER.addEventListener(el, eventName, listener),
  removeEventListener: (el: DomElementLike, eventName: string, listener: DOMEventHandler) =>
    CURRENT_ADAPTER.removeEventListener(el, eventName, listener),
  hasValueProperty: (el: DomElementLike) => (el as any).value !== undefined,
  isSelectMultiple: (el: DomElementLike) =>
    (CURRENT_ADAPTER.getTagName(el) || '').toUpperCase() === 'SELECT' && !!(el as any).multiple,
  querySelector: (selector: string) => CURRENT_ADAPTER.querySelector(selector),
})

const syncGlobalDOMBridge = () => {
  ;(globalThis as any).__rue_dom = createGlobalDOMBridge()
}

/** 设置当前 DOM 适配器
 * 替换底层实现并刷新全局 __rue_dom 代理映射
 * @param adapter 新的 DOMAdapter 实例
 */
export const setDOMAdapter = (adapter: DOMAdapter) => {
  CURRENT_ADAPTER = adapter
  // 在全局注入轻量代理，便于调试与非模块环境访问
  syncGlobalDOMBridge()
}
/** 获取当前 DOM 适配器
 * @returns 当前的 DOMAdapter 实例
 */
export const getDOMAdapter = () => CURRENT_ADAPTER

// 启动时即注入一次全局代理，保证在未调用 setDOMAdapter 前也可使用
syncGlobalDOMBridge()

// 便捷导出：函数式封装 CURRENT_ADAPTER，简化调用与测试替换
/** 创建注释节点（便捷函数）
 * @param data 注释文本
 */
export const createComment = (data: string) => CURRENT_ADAPTER.createComment(data)
/** 创建文本节点（便捷函数）
 * @param data 文本内容
 */
export const createTextNode = (data: string) => CURRENT_ADAPTER.createTextNode(data)
/** 创建元素（便捷函数）
 * @param tag 标签名
 */
export const createElement = (tag: string) => CURRENT_ADAPTER.createElement(tag)
/** 创建文本包装元素（便捷函数）
 * @param parent 父元素
 */
export const createTextWrapper = (parent: DomElementLike) =>
  CURRENT_ADAPTER.createTextWrapper(parent)
/** 设置行内样式（便捷函数） */
export const setStyle = (
  el: DomElementLike,
  style: string | Partial<CSSStyleDeclaration> | null | undefined,
) => {
  CURRENT_ADAPTER.setStyle(el, style)
}
/** 设置节点文本内容（便捷函数） */
export const settextContent = (el: DomNodeLike, val: any) => {
  CURRENT_ADAPTER.settextContent(el, val)
}
/** 创建文档片段（便捷函数） */
export const createDocumentFragment = () => CURRENT_ADAPTER.createDocumentFragment()
/** 追加子节点（便捷函数） */
export const appendChild = (parent: DomNodeLike, child: DomNodeLike) => {
  CURRENT_ADAPTER.appendChild(parent, child)
}
/** 移除子节点（便捷函数） */
export const removeChild = (parent: DomNodeLike, child: DomNodeLike) => {
  CURRENT_ADAPTER.removeChild(parent, child)
}
/** 插入子节点（便捷函数） */
export const insertBefore = (parent: DomNodeLike, child: DomNodeLike, ref: DomNodeLike | null) => {
  CURRENT_ADAPTER.insertBefore(parent, child, ref)
}
/** 替换子节点（便捷函数） */
export const replaceChild = (parent: DomNodeLike, newChild: DomNodeLike, oldChild: DomNodeLike) => {
  CURRENT_ADAPTER.replaceChild(parent, newChild, oldChild)
}
/** 选择器查询（便捷函数） */
export const querySelector = (selector: string) => CURRENT_ADAPTER.querySelector(selector)
/** 设置属性（便捷函数） */
export const setAttribute = (el: DomElementLike, name: string, value: any) =>
  CURRENT_ADAPTER.setAttribute(el, name, value)
/** 移除属性（便捷函数） */
export const removeAttribute = (el: DomElementLike, name: string) =>
  CURRENT_ADAPTER.removeAttribute(el, name)
/** 添加事件监听（便捷函数） */
export const addEventListener = (
  el: DomElementLike,
  eventName: string,
  listener: DOMEventHandler,
) => CURRENT_ADAPTER.addEventListener(el, eventName, listener)
/** 移除事件监听（便捷函数） */
export const removeEventListener = (
  el: DomElementLike,
  eventName: string,
  listener: DOMEventHandler,
) => CURRENT_ADAPTER.removeEventListener(el, eventName, listener)
/** 设置类名（便捷函数） */
export const setClassName = (el: DomElementLike, value: string) =>
  CURRENT_ADAPTER.setClassName(el, value)
/** 设置 innerHTML（便捷函数） */
export const setInnerHTML = (el: DomElementLike, html: string) =>
  CURRENT_ADAPTER.setInnerHTML(el, html)
/** 设置表单值（便捷函数） */
export const setValue = (el: DomElementLike, value: any) => CURRENT_ADAPTER.setValue(el, value)
/** 设置选中状态（便捷函数） */
export const setChecked = (el: DomElementLike, checked: boolean) =>
  CURRENT_ADAPTER.setChecked(el, checked)
/** 设置禁用状态（便捷函数） */
export const setDisabled = (el: DomElementLike, disabled: boolean) =>
  CURRENT_ADAPTER.setDisabled(el, disabled)
/** 获取标签名（便捷函数） */
export const getTagName = (el: DomElementLike) => CURRENT_ADAPTER.getTagName(el)
/** 判断包含关系（便捷函数） */
export const contains = (parent: DomNodeLike, child: DomNodeLike) =>
  CURRENT_ADAPTER.contains(parent, child)
/** 获取父节点（便捷函数） */
export const getParentNode = (node: DomNodeLike) => CURRENT_ADAPTER.getParentNode(node)
/** 样式增量补丁（便捷函数） */
export const patchStyle = (
  el: DomElementLike,
  oldStyle: Partial<CSSStyleDeclaration> | undefined,
  newStyle: Partial<CSSStyleDeclaration> | undefined,
) => CURRENT_ADAPTER.patchStyle(el, oldStyle, newStyle)
/** 判断是否为片段（便捷函数） */
export const isFragment = (node: DomNodeLike) => CURRENT_ADAPTER.isFragment(node)
/** 收集片段子节点（便捷函数） */
export const collectFragmentChildren = (node: DomNodeLike) =>
  CURRENT_ADAPTER.collectFragmentChildren(node)
/** 应用 ref（便捷函数） */
export const applyRef = (el: DomElementLike, ref: any) => CURRENT_ADAPTER.applyRef(el, ref)
/** 清理 ref（便捷函数） */
export const clearRef = (ref: any) => CURRENT_ADAPTER.clearRef(ref)
export type DOMEventHandler = (evt: any) => void
