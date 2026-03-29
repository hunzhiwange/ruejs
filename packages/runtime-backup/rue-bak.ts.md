/\*\*

- Rue - The Wasm Framework For Vapor Native DOM.
  \*/

'use strict'

import { batch, reactive as rxReactive } from '../runtime/src/reactivity'
import { setCurrentInstance as rxSetCurrentInstance } from '../runtime/src/reactivity'
import type { DomNodeLike, DomElementLike, DomTextLike, DOMEventHandler } from '../runtime/src/dom'

interface ComponentProps {
[key: string]: any
children?: Child | Child[]
}

type ComponentInstance<P = {}> = FC<P>

interface VNode {
type: string | ComponentInstance<any>
props: ComponentProps
children: VNode[] | string[]
el?: DomNodeLike
key?: string | number
component?: any
**fragNodes?: DomNodeLike[]
**subtree?: VNode
**isVNode**?: boolean
}

type Child = VNode | string | number | boolean | null | undefined
type ChildInput = Child | ChildInput[]

interface LifecycleHooks {
beforeCreate: Set<() => void>
created: Set<() => void>
beforeMount: Set<() => void>
mounted: Set<() => void>
beforeUpdate: Set<() => void>
updated: Set<() => void>
beforeUnmount: Set<() => void>
unmounted: Set<() => void>
}

interface ComponentInternalInstance {
vnode: VNode
parent: ComponentInternalInstance | null
isMounted: boolean
hooks: LifecycleHooks
propsRO: object
error?: any
index: number
\_\_hooks: { states: []; index: 0 }
}

// ========== 响应式系统 ==========
export class Rue {
// 容器到当前 vnode 的映射，用于增量更新
private containerMap: WeakMap<DomElementLike, VNode | null>
// 当前正在处理的组件实例，用于 onXxx 注册
private currentInstance: ComponentInternalInstance | null
private currentContainerCount: number = 0
// 组件实例执行栈
private instanceStack: ComponentInternalInstance[]
// 挂载后回调队列
private mountedQueue: Array<() => void>
private rangeMap: WeakMap<DomNodeLike, VNode | null>
private currentAnchor: DomNodeLike | null
private errorHandlers: Set<(error: any, instance?: ComponentInternalInstance | null) => void>
private currentContainer: DomElementLike | null
private deferredQueue: Array<() => void>
private installedPlugins: Map<any, any[]>
private crashed: boolean
private vnodeMeta: WeakMap<object, Record<string, any>>
private domAdapter: any

constructor() {
this.containerMap = new WeakMap()
this.currentInstance = null
this.instanceStack = []
this.mountedQueue = []
this.rangeMap = new WeakMap()
this.currentAnchor = null
this.errorHandlers = new Set()
this.currentContainer = null
this.deferredQueue = []
this.installedPlugins = new Map()
this.crashed = false
this.vnodeMeta = new WeakMap()
this.domAdapter = (globalThis as any).\_\_rue_dom || null
}

setDOMAdapter(adapter: any): void {
this.domAdapter = adapter
}
getDOMAdapter(): any {
return this.domAdapter || (globalThis as any).\_\_rue_dom
}

// ========== JSX/TSX 支持 ==========
/\*_ JSX 工厂：规范化 children 为 VNode 列表，并注入到 props.children，以兼容组件读取 children _/
createElement<P = {}>(
type: string | ComponentInstance<P>,
props: ComponentProps | null,
...children: ChildInput[]
): VNode {
const normalizedProps = props || {}

    const normalizedChildren: VNode[] = []
    const push = (c: any) => {
      if (c == null) return
      if (Array.isArray(c)) {
        c.forEach(push)
      } else if (typeof c === 'boolean') {
        return
      } else if (typeof c === 'string' || typeof c === 'number') {
        normalizedChildren.push({
          type: '#text',
          props: {},
          children: [c.toString()],
          el: this.getDOMAdapter().createTextNode(c.toString()),
          __isVNode__: true,
        })
      } else {
        // 安全判断是否是 VNode：避免使用 'in'，改用直接属性访问
        const maybeVNode = c
        const looksLikeVNode =
          maybeVNode &&
          typeof maybeVNode === 'object' &&
          maybeVNode !== null &&
          typeof maybeVNode.type !== 'undefined' &&
          typeof maybeVNode.props !== 'undefined'

        if (looksLikeVNode) {
          try {
            ;(c as any).__isVNode__ = true
          } catch {}
          normalizedChildren.push(c as VNode)
        } else {
          // 其他对象（包括 useState 的代理包装）按文本处理
          const s = String(c)
          normalizedChildren.push({
            type: '#text',
            props: {},
            children: [s],
            el: this.getDOMAdapter().createTextNode(s),
            __isVNode__: true,
          })
        }
      }
    }
    children.forEach(push)

    return {
      type,
      props: normalizedProps,
      children: normalizedChildren,
      key: normalizedProps.key as string | number,
      __isVNode__: true,
    }

}

// ========== 渲染系统 ==========
/\*\*

- 渲染入口（容器级）
-
- 核心算法：
- - 利用 containerMap 记住容器上一次的 vnode
- - 每次渲染执行增量 patch（oldVNode -> newVNode），尽量复用现有 DOM
- - 通过 rxBatch 将多次状态更新合并为一次渲染批次，避免抖动
-
- 作用：驱动整棵树的更新（不依赖锚点），用于常规 mount/render
  \*/
  render(vnode: VNode, container: DomElementLike): void {
  if (this.crashed) return
  const prevContainer = this.currentContainer
  try {
  ;(globalThis as any).\_\_rue_active = this
  this.currentContainer = container
  const prev = this.containerMap.get(container) || null
  this.patch(prev, vnode, container)
  this.containerMap.set(container, vnode)
  } catch (e) {
  this.handleError(e, this.currentInstance)
  } finally {
  this.currentContainer = prevContainer
  }
  }

/\*\*

- 区间渲染（带锚点）
-
- 核心算法：
- - 使用 rangeMap 记住以 start 注释为键的上一次区间 vnode
- - 将 currentAnchor 指向 end 注释，使新节点插入到 end 之前
- - 首次渲染：创建并插入新节点
- - 后续渲染：对比旧 vnode 与新 vnode
- - 一般情况：走 patch(old, new, parent)，按类型进行细粒度更新
- - vapor→vapor：出于语义与稳定性，将旧区间的真实节点彻底移除，再重新挂载新 vapor 片段
-     这是因为 vapor 节点的内部由外部 setup 返回的真实节点控制，常规 patchVapor 不会替换 DOM
-
- 作用：实现条件渲染与插槽，在两个锚点之间安全地替换内容
  \*/
  renderBetween(vnode: VNode, parent: DomElementLike, start: DomNodeLike, end: DomNodeLike): void {
  if (this.crashed) return
  try {
  const prev = this.rangeMap.get(start) || null
  this.currentAnchor = end
  if (!prev) {
  this.instantiateTree(vnode)
  const el = this.mountVNode(vnode)
  this.currentAnchor = end
  if (el) {
  if (this.currentAnchor && this.getDOMAdapter().contains(parent, this.currentAnchor))
  this.getDOMAdapter().insertBefore(parent, el, this.currentAnchor)
  else this.getDOMAdapter().appendChild(parent, el)
  }
  this.flushMounted()
  } else {
  if (
  typeof (prev as any).type === 'string' &&
  (prev as any).type === 'vapor' &&
  typeof (vnode as any).type === 'string' &&
  (vnode as any).type === 'vapor'
  ) {
  const parentEl = parent
  const prevNodes = this.getVNodeMeta(prev, '\_\_fragNodes') as DomNodeLike[] | undefined
  const prevEl = this.getVNodeEl(prev as any)
  if (prevNodes && prevNodes.length) {
  prevNodes.forEach((n: DomNodeLike) => {
  if (this.getDOMAdapter().contains(parentEl, n))
  this.getDOMAdapter().removeChild(parentEl, n)
  })
  } else if (prevEl && parentEl && this.getDOMAdapter().contains(parentEl, prevEl)) {
  this.getDOMAdapter().removeChild(parentEl, prevEl)
  }
  this.instantiateTree(vnode)
  const el = this.mountVNode(vnode)
  this.currentAnchor = end
  if (el) {
  if (this.currentAnchor && this.getDOMAdapter().contains(parentEl, this.currentAnchor))
  this.getDOMAdapter().insertBefore(parentEl, el, this.currentAnchor)
  else this.getDOMAdapter().appendChild(parentEl, el)
  }
  this.flushMounted()
  } else {
  this.patch(prev, vnode, parent)
  }
  }
  this.rangeMap.set(start, vnode)
  this.currentAnchor = null
  } catch (e) {
  this.handleError(e, this.currentInstance)
  }
  }

/\*\*

- 创建真实 DOM（初次）
-
- 核心分支：
- - 字面类型：'#text' / 'fragment' / 'vapor' / 原生元素标签
- - 非字面类型：函数组件，先创建组件实例，再递归生成子树真实 DOM
-
- 作用：在不触发生命周期的情况下，为 vnode 生成可插入的真实节点
  \*/
  private createRealDOM(vnode: VNode): DomNodeLike | null {
  // 若已有真实节点，直接返回（避免重复创建）
  if (this.getVNodeEl(vnode)) {
  return this.getVNodeEl(vnode)
  }

  if (typeof vnode.type === 'string') {
  if (vnode.type === '#text') {
  // 文本节点：以 children[0] 为内容创建 textNode
  const textNode = this.getDOMAdapter().createTextNode(vnode.children[0] as string)
  this.setVNodeEl(vnode, textNode)
  return textNode
  }

      if (vnode.type === 'fragment') {
        // 片段：生成 DocumentFragment 并递归创建所有子节点
        const frag = this.getDOMAdapter().createDocumentFragment()
        this.setVNodeEl(vnode, frag)
        ;(vnode.children as VNode[]).forEach((child: VNode) => {
          const childEl = this.createRealDOM(child as VNode)
          if (childEl) {
            this.getDOMAdapter().appendChild(frag, childEl)
          }
        })
        return frag
      }

      if (vnode.type === 'vapor') {
        // vapor：执行 setup() 获取真实节点，直接作为内容返回
        const info = vnode.props.setup()
        this.setVNodeEl(vnode, info.vaporElement)
        return info.vaporElement
      }

      // 创建元素（SVG 使用命名空间）
      // 引入 rue-dom 的 createElement 以支持 SVG
      // 原生元素（含 SVG）：通过 domCreateElement 创建节点
      const el = this.getDOMAdapter().createElement(vnode.type as string) as DomElementLike
      this.setVNodeEl(vnode, el)

      // 设置属性
      // 设置属性与事件：class/style/innerHTML/value/checked/onXxx 等
      Object.keys(vnode.props).forEach((key: string) => {
        if (key === 'className') {
          this.getDOMAdapter().setClassName(el, vnode.props[key] as string)
        } else if (key === 'style' && typeof vnode.props[key] === 'object') {
          this.getDOMAdapter().patchStyle(el, undefined, vnode.props[key])
        } else if (
          key === 'dangerouslySetInnerHTML' &&
          vnode.props[key] &&
          typeof vnode.props[key] === 'object' &&
          '__html' in vnode.props[key]
        ) {
          this.getDOMAdapter().setInnerHTML(el, vnode.props[key].__html ?? '')
        } else if (key === 'value') {
          this.getDOMAdapter().setValue(el, vnode.props[key])
        } else if (key === 'checked') {
          this.getDOMAdapter().setChecked(el, !!vnode.props[key])
        } else if (key.startsWith('on') && typeof vnode.props[key] === 'function') {
          const eventName = key.toLowerCase().substring(2)
          this.getDOMAdapter().addEventListener(el, eventName, vnode.props[key] as DOMEventHandler)
        } else if (key !== 'key' && key !== 'children') {
          this.getDOMAdapter().setAttribute(el, key, vnode.props[key] as string)
        }
      })

      // 添加子元素（如设置 dangerouslySetInnerHTML，跳过 children）
      // 未使用 dangerouslySetInnerHTML 时，递归插入 children
      if (!('dangerouslySetInnerHTML' in (vnode.props || {}))) {
        vnode.children.forEach((child: string | VNode) => {
          if (typeof child === 'string') {
            this.getDOMAdapter().appendChild(el, this.getDOMAdapter().createTextNode(child))
          } else {
            const childEl = this.createRealDOM(child as VNode)
            if (childEl) {
              this.getDOMAdapter().appendChild(el, childEl)
            }
          }
        })
      }

      // 返回已构建的元素节点
      return el

  } else {
  // 函数组件：创建/复用实例，同步 props，并生成子树 vnode
  const inst =
  (vnode.component as ComponentInternalInstance) || this.createComponentInstance(vnode)
  this.pushInstance(inst)
  inst.\_\_hooks.index = 0

      if (vnode.component !== undefined) {
        this.syncPropsChildren(inst, vnode.props || {}, vnode.children)
      }

      let componentVNode: VNode
      try {
        componentVNode = vnode.type(inst.propsRO as any)
      } catch (e) {
        inst.error = e
        this.handleError(e, this.currentInstance)
        return null
      }
      if (!inst.isMounted) this.callHooks(inst, 'beforeCreate')
      if (!inst.isMounted) this.callHooks(inst, 'created')
      if (!inst.isMounted) this.callHooks(inst, 'beforeMount')
      // 递归创建子树真实 DOM
      const el = this.createRealDOM(componentVNode)
      this.setVNodeMeta(vnode, '__subtree', componentVNode)
      this.setVNodeEl(vnode, el ?? undefined)
      this.popInstance()
      if (!inst.isMounted) {
        // 首次挂载时触发 mounted
        this.callHooks(inst, 'mounted')
        inst.isMounted = true
      }
      return el

  }

}

/\*\*

- diff/patch：根据类型与 key 决定替换或细粒度更新
-
- 核心策略：
- - 若类型或 key 变化：视为“替换”，根据旧节点类别（fragment/vapor/组件/元素）进行彻底替换
- - 若类型一致：走对应的细粒度补丁路径（文本/fragment/vapor/元素/组件）
- - 始终尊重 currentAnchor，将新节点插入到锚点之前
-
- 作用：提供稳定的最小更新，保证 vnode 树与真实 DOM 同步
  \*/
  private patch(oldVNode: VNode | null, newVNode: VNode, container: DomElementLike): void {
  if (!oldVNode) {
  // 初次渲染：预实例化 + 挂载，并处理锚点插入位置
  this.instantiateTree(newVNode)
  const el = this.mountVNode(newVNode)
  if (el) {
  if (this.currentAnchor && this.getDOMAdapter().contains(container, this.currentAnchor))
  this.getDOMAdapter().insertBefore(container, el, this.currentAnchor)
  else this.getDOMAdapter().appendChild(container, el)
  }
  // 执行挂载后的生命周期回调队列
  this.flushMounted()
  return
  }
  if (oldVNode.type !== newVNode.type || oldVNode.key !== newVNode.key) {
  // 类型或 key 变化：视为替换，先找到父级并执行 beforeUnmount
  const parent =
  (oldVNode &&
  this.getVNodeEl(oldVNode) &&
  (this.getDOMAdapter().getParentNode(this.getVNodeEl(oldVNode)) as any)) ||
  container
  this.invokeBeforeUnmount(oldVNode)
  // 预实例化并挂载新节点
  this.instantiateTree(newVNode)
  const newEl = this.mountVNode(newVNode)
  if (oldVNode.type === 'fragment') {
  const olds = (oldVNode.children || []) as VNode[]
  for (const c of olds) {
  const cel = this.getVNodeEl(c)
  if (cel && parent && this.getDOMAdapter().contains(parent, cel))
  this.getDOMAdapter().removeChild(parent, cel)
  }
  const nodes = (this.getVNodeMeta(oldVNode, '**fragNodes') || []) as DomNodeLike[]
  for (const n of nodes) {
  if (n && parent && this.getDOMAdapter().contains(parent, n))
  this.getDOMAdapter().removeChild(parent, n)
  }
  if (newEl && parent) {
  if (this.currentAnchor && this.getDOMAdapter().contains(parent, this.currentAnchor))
  this.getDOMAdapter().insertBefore(parent, newEl, this.currentAnchor)
  else this.getDOMAdapter().appendChild(parent, newEl)
  }
  } else if (oldVNode.type === 'vapor') {
  // vapor：若旧为 fragment 内容，移除其所有子节点；否则按 el 替换
  const prevNodes = this.getVNodeMeta(oldVNode, '**fragNodes') as DomNodeLike[] | undefined
  if (prevNodes && prevNodes.length) {
  prevNodes.forEach((n: DomNodeLike) => {
  if (this.getDOMAdapter().contains(parent, n))
  this.getDOMAdapter().removeChild(parent, n)
  })
  if (newEl && parent) {
  if (this.currentAnchor && this.getDOMAdapter().contains(parent, this.currentAnchor))
  this.getDOMAdapter().insertBefore(parent, newEl, this.currentAnchor)
  else this.getDOMAdapter().appendChild(parent, newEl)
  }
  } else {
  if (this.getVNodeEl(oldVNode) && newEl && parent) {
  this.getDOMAdapter().replaceChild(parent, newEl, this.getVNodeEl(oldVNode) as any)
  } else if (newEl && parent) {
  if (this.currentAnchor && this.getDOMAdapter().contains(parent, this.currentAnchor))
  this.getDOMAdapter().insertBefore(parent, newEl, this.currentAnchor)
  else this.getDOMAdapter().appendChild(parent, newEl)
  }
  }
  } else if (typeof oldVNode.type !== 'string') {
  // 组件：若旧子树为 fragment，需清理其子节点；否则按 el 替换
  const oldSub = this.getVNodeMeta(oldVNode, '**subtree') as VNode
  if (oldSub && oldSub.type === 'fragment') {
  const olds = (oldSub.children || []) as VNode[]
  olds.forEach((c: VNode) => {
  const cel = this.getVNodeEl(c)
  if (cel && parent && this.getDOMAdapter().contains(parent, cel))
  this.getDOMAdapter().removeChild(parent, cel)
  })
  if (newEl && parent) {
  if (this.currentAnchor && this.getDOMAdapter().contains(parent, this.currentAnchor))
  this.getDOMAdapter().insertBefore(parent, newEl, this.currentAnchor)
  else this.getDOMAdapter().appendChild(parent, newEl)
  }
  } else {
  // 修复组件替换时，旧子树为 fragment 时的子节点清理问题
  if (newVNode.type === 'fragment') {
  const oldEl = this.getVNodeEl(oldVNode)
  if (oldEl && parent && this.getDOMAdapter().contains(parent, oldEl))
  this.getDOMAdapter().removeChild(parent, oldEl)
  if (newEl && parent) {
  const nodes = this.getDOMAdapter().collectFragmentChildren(newEl as any)
  for (const n of nodes) {
  if (this.currentAnchor && this.getDOMAdapter().contains(parent, this.currentAnchor))
  this.getDOMAdapter().insertBefore(parent, n, this.currentAnchor)
  else this.getDOMAdapter().appendChild(parent, n)
  }
  }
  } else {
  if (this.getVNodeEl(oldVNode) && newEl && parent) {
  // 旧节点类似下面的
  // 示例：const SiteHome: FC = () => (<><div>hello world</div></>)
  // 说明：当根节点是片段（DocumentFragment，nodeType === 11）或旧节点缺失时，
  // oldVNode.el.parentNode 为 null，无法使用 replaceChild 进行替换。
  // 回退策略：清空 container，然后根据 currentAnchor 决定插入位置，确保渲染稳定。
  const oldNode = this.getVNodeEl(oldVNode)
  const nonFragment = !!(oldNode && !this.getDOMAdapter().isFragment(oldNode as any))
  if (!nonFragment) {
  while (container.firstChild) {
  this.getDOMAdapter().removeChild(container, container.firstChild as any)
  }
  if (
  this.currentAnchor &&
  this.getDOMAdapter().contains(container, this.currentAnchor)
  ) {
  this.getDOMAdapter().insertBefore(container, newEl, this.currentAnchor)
  } else {
  this.getDOMAdapter().appendChild(container, newEl)
  }
  } else {
  // 非片段根：存在真实父节点，按常规替换即可
  const oldEl = this.getVNodeEl(oldVNode)
  if (parent && oldEl && this.getDOMAdapter().contains(parent, oldEl)) {
  this.getDOMAdapter().replaceChild(parent, newEl, oldEl as any)
  } else {
  // 这里为兼容 RouterView 中 h(data.record.component, { params: data.params })
  // 它和 useComponent 联合使用后，会导致无法识别父子组件
  // 无法正常替换
  while (parent.firstChild) {
  this.getDOMAdapter().removeChild(parent, parent.firstChild)
  }
  this.getDOMAdapter().appendChild(parent, newEl)
  }
  }
  } else if (newEl && parent) {
  if (this.currentAnchor && this.getDOMAdapter().contains(parent, this.currentAnchor))
  this.getDOMAdapter().insertBefore(parent, newEl, this.currentAnchor)
  else this.getDOMAdapter().appendChild(parent, newEl)
  }
  }
  }
  } else {
  // 原生元素：按 el 替换
  if (this.getVNodeEl(oldVNode) && newEl && parent) {
  this.getDOMAdapter().replaceChild(parent, newEl, this.getVNodeEl(oldVNode) as any)
  } else if (newEl && parent) {
  if (this.currentAnchor && this.getDOMAdapter().contains(parent, this.currentAnchor))
  this.getDOMAdapter().insertBefore(parent, newEl, this.currentAnchor)
  else this.getDOMAdapter().appendChild(parent, newEl)
  }
  }
  // 触发 unmounted 并将新 el 记录到 newVNode
  this.invokeUnmounted(oldVNode)
  this.setVNodeEl(newVNode, newEl ?? undefined)
  // 执行挂载后的生命周期队列
  this.flushMounted()
  return
  }
  if (typeof newVNode.type === 'string') {
  if (newVNode.type === '#text') {
  // 文本：更新 textContent
  this.patchText(oldVNode, newVNode)
  } else if (newVNode.type === 'fragment') {
  // fragment：对子节点进行补丁
  const parent =
  (oldVNode &&
  this.getVNodeEl(oldVNode) &&
  (this.getDOMAdapter().getParentNode(this.getVNodeEl(oldVNode)) as any)) ||
  container
  this.patchFragment(oldVNode, newVNode, parent)
  } else if (newVNode.type === 'vapor') {
  // vapor：仅复用 el（区间内替换由 renderBetween 决定）
  this.patchVapor(oldVNode as VNode, newVNode as VNode)
  } else {
  // 原生元素：执行属性与子节点的细粒度补丁
  this.patchElement(oldVNode, newVNode as VNode)
  }
  } else {
  // 组件：复用或创建实例，同步 props，调用 beforeUpdate/updated 生命周期
  const inst =
  (oldVNode.component as ComponentInternalInstance) || this.createComponentInstance(newVNode)
  newVNode.component = inst
  this.pushInstance(inst)
  // 重置 hooks 游标，确保本次更新周期的 hooks（watchEffect/computed 等）正确对齐复用
  inst.**hooks.index = 0

      if (oldVNode.component !== undefined) {
        this.syncPropsChildren(inst, newVNode.props || {}, newVNode.children)
      }

      let next: VNode
      try {
        next = newVNode.type(inst.propsRO as any)
      } catch (e) {
        inst.error = e
        this.handleError(e, inst)
        return
      }
      this.callHooks(inst, 'beforeUpdate')
      this.patch((this.getVNodeMeta(oldVNode, '__subtree') as VNode) || null, next, container)
      this.popInstance()
      this.callHooks(inst, 'updated')
      this.setVNodeMeta(newVNode, '__subtree', next)
      this.setVNodeEl(newVNode, this.getVNodeEl(oldVNode))

  }
  }

private patchText(oldVNode: VNode, newVNode: VNode): void {
const el = (this.getVNodeEl(oldVNode) as DomTextLike) || this.getDOMAdapter().createTextNode('')
const newText = (newVNode.children[0] as string) || ''
this.getDOMAdapter().settextContent(el as any, newText)
this.setVNodeEl(newVNode, el)
}

private patchElement(oldVNode: VNode, newVNode: VNode): void {
const el =
(this.getVNodeEl(oldVNode) as DomElementLike) ||
(this.getDOMAdapter().createElement(newVNode.type as string) as DomElementLike)
this.setVNodeEl(newVNode, el)
this.patchProps(el, oldVNode.props || {}, newVNode.props || {})
const hasHTML = 'dangerouslySetInnerHTML' in (newVNode.props || {})
if (!hasHTML) {
this.patchChildren(oldVNode.children as VNode[], newVNode.children as VNode[], el)
const np = newVNode.props || {}
if (this.getDOMAdapter().getTagName(el) === 'SELECT' && 'value' in np) {
const v: any = np.value
this.getDOMAdapter().setValue(el, v)
}
}
}

/\*_ 属性补丁：移除旧属性、更新 class/style/事件/普通属性 _/
private patchProps(el: DomElementLike, oldProps: ComponentProps, newProps: ComponentProps): void {
Object.keys(oldProps).forEach((key: string) => {
if (!(key in newProps)) {
if (key.startsWith('on') && typeof oldProps[key] === 'function') {
const eventName = key.toLowerCase().substring(2)
this.getDOMAdapter().removeEventListener(el, eventName, oldProps[key] as DOMEventHandler)
} else if (key === 'className') {
this.getDOMAdapter().setClassName(el, '')
} else if (key === 'style' && typeof oldProps[key] === 'object') {
this.getDOMAdapter().patchStyle(el, oldProps.style || {}, {})
} else if (key === 'dangerouslySetInnerHTML') {
this.getDOMAdapter().setInnerHTML(el, '')
} else if (key === 'value') {
if (this.getDOMAdapter().getTagName(el) === 'SELECT') {
const sel = el as any
if (sel.multiple) {
this.getDOMAdapter().setValue(el, [])
} else {
this.getDOMAdapter().setValue(el, '')
}
} else if ((el as any).value !== undefined) {
this.getDOMAdapter().setValue(el, '')
this.getDOMAdapter().removeAttribute(el, 'value')
}
} else if (key === 'checked') {
this.getDOMAdapter().setChecked(el, false)
this.getDOMAdapter().removeAttribute(el, 'checked')
} else if (key === 'disabled') {
this.getDOMAdapter().setDisabled(el, false)
this.getDOMAdapter().removeAttribute(el, 'disabled')
} else if (key === 'ref') {
const r = oldProps[key]
try {
this.getDOMAdapter().clearRef(r)
} catch (e) {
this.handleError(e, this.currentInstance)
return
}
} else if (key !== 'key' && key !== 'children') {
this.getDOMAdapter().removeAttribute(el, key)
}
}
})

    Object.keys(newProps).forEach((key: string) => {
      const value = newProps[key]
      if (key === 'className') {
        this.getDOMAdapter().setClassName(el, value as string)
      } else if (key === 'style' && typeof value === 'object') {
        const oldStyle = oldProps.style || {}
        const newStyle = value
        this.getDOMAdapter().patchStyle(el, oldStyle, newStyle)
      } else if (
        key === 'dangerouslySetInnerHTML' &&
        value &&
        typeof value === 'object' &&
        '__html' in value
      ) {
        this.getDOMAdapter().setInnerHTML(el, (value as any).__html ?? '')
      } else if (key === 'value') {
        this.getDOMAdapter().setValue(el, value)
      } else if (key === 'checked') {
        this.getDOMAdapter().setChecked(el, !!value)
      } else if (key === 'disabled') {
        this.getDOMAdapter().setDisabled(el, !!value)
      } else if (key === 'ref') {
        const prev = oldProps[key]
        if (prev && prev !== value) {
          try {
            this.getDOMAdapter().clearRef(prev)
          } catch (e) {
            this.handleError(e, this.currentInstance)
            return
          }
        }
        try {
          this.getDOMAdapter().applyRef(el, value)
        } catch (e) {
          this.handleError(e, this.currentInstance)
          return
        }
      } else if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.toLowerCase().substring(2)
        const old = oldProps[key]
        if (old && typeof old === 'function') {
          this.getDOMAdapter().removeEventListener(el, eventName, old as DOMEventHandler)
        }
        this.getDOMAdapter().addEventListener(el, eventName, value as DOMEventHandler)
      } else if (key !== 'key' && key !== 'children') {
        this.getDOMAdapter().setAttribute(el, key, value as string)
      }
    })

}

/\*_ 子节点补丁：前缀对齐 patch，随后追加或移除多余节点 _/
private patchChildren(
oldChildren: VNode[] | string[],
newChildren: VNode[] | string[],
el: DomElementLike,
): void {
const oldLen = oldChildren.length
const newLen = newChildren.length
const keyed =
(oldChildren as VNode[]).some((c: any) => c && c.key != null) ||
(newChildren as VNode[]).some((c: any) => c && c.key != null)
if (keyed) {
const oldKeyToVNode = new Map<any, VNode>()
for (let i = 0; i < oldLen; i++) {
const oc = oldChildren[i] as VNode
if (oc && oc.key != null) {
oldKeyToVNode.set(oc.key, oc)
}
}
const newKeySet = new Set<any>()
let cursor: DomNodeLike | null = null
for (let i = newLen - 1; i >= 0; i--) {
const nc = newChildren[i] as VNode
if (!nc) continue
const key: any = nc.key
newKeySet.add(key)
if (key != null && oldKeyToVNode.has(key)) {
const old = oldKeyToVNode.get(key) as VNode
this.patch(old, nc, el)
if (nc.type === 'fragment') {
const source = old.type === 'fragment' ? old : nc
const fragChildren = (source.children || []) as VNode[]
const nodes: DomNodeLike[] = []
for (const fc of fragChildren) {
const cel = this.getVNodeEl(fc) as DomNodeLike | null
if (!cel) continue
nodes.push(...this.getDOMAdapter().collectFragmentChildren(cel))
}
const last = nodes.length ? nodes[nodes.length - 1] : null
const needMove = last
? cursor
? last.nextSibling !== cursor
: last.nextSibling !== null
: false
if (needMove) {
for (const n of nodes) {
if (cursor) this.getDOMAdapter().insertBefore(el, n, cursor)
else if (
this.currentAnchor &&
this.getDOMAdapter().contains(el, this.currentAnchor)
)
this.getDOMAdapter().insertBefore(el, n, this.currentAnchor)
else this.getDOMAdapter().appendChild(el, n)
}
}
} else {
const cel = this.getVNodeEl(nc) as DomNodeLike | null
if (cel) {
const needMove = cursor ? cel.nextSibling !== cursor : cel.nextSibling !== null
if (needMove) {
if (cursor) this.getDOMAdapter().insertBefore(el, cel, cursor)
else if (
this.currentAnchor &&
this.getDOMAdapter().contains(el, this.currentAnchor)
)
this.getDOMAdapter().insertBefore(el, cel, this.currentAnchor)
else this.getDOMAdapter().appendChild(el, cel)
}
}
}
} else {
this.instantiateTree(nc)
const childEl = this.mountVNode(nc)
if (childEl) {
if (cursor) this.getDOMAdapter().insertBefore(el, childEl, cursor)
else if (this.currentAnchor && this.getDOMAdapter().contains(el, this.currentAnchor))
this.getDOMAdapter().insertBefore(el, childEl, this.currentAnchor)
else this.getDOMAdapter().appendChild(el, childEl)
}
}
let nodeForCursor: DomNodeLike | null = null
if (nc.type === 'fragment') {
const fragChildren = (nc.children || []) as VNode[]
for (const fc of fragChildren) {
const cel = this.getVNodeEl(fc) as DomNodeLike | null
if (!cel) continue
const list = this.getDOMAdapter().collectFragmentChildren(cel)
const first = list.length ? list[0] : null
if (first) {
nodeForCursor = first
break
}
}
} else {
nodeForCursor = (this.getVNodeEl(nc) as DomNodeLike | null) || null
}
cursor =
nodeForCursor && this.getDOMAdapter().contains(el, nodeForCursor) ? nodeForCursor : cursor
}
// 移除不存在的旧节点
for (let i = 0; i < oldLen; i++) {
const oldChild = oldChildren[i] as VNode
if (!oldChild) continue
const k: any = oldChild.key
if (k == null || !newKeySet.has(k)) {
this.invokeBeforeUnmount(oldChild)
if (oldChild.type === 'fragment') {
// 优先根据 fragment 子 vnode 的 el 进行删除，避免依赖 **fragNodes 可能为空的情况
const fragChildren = (oldChild.children || []) as VNode[]
for (const fc of fragChildren) {
const cel = this.getVNodeEl(fc) as any | null
if (cel && this.getDOMAdapter().contains(el, cel))
this.getDOMAdapter().removeChild(el, cel)
}
// 兜底：若仍残留，使用 **fragNodes 移除所有节点
const nodes = (this.getVNodeMeta(oldChild, '**fragNodes') || []) as DomNodeLike[]
for (const n of nodes) {
if (n && this.getDOMAdapter().contains(el, n)) this.getDOMAdapter().removeChild(el, n)
}
} else {
const cel = this.getVNodeEl(oldChild) as DomNodeLike | null
if (cel && this.getDOMAdapter().contains(el, cel))
this.getDOMAdapter().removeChild(el, cel)
}
this.invokeUnmounted(oldChild)
}
}
this.flushMounted()
return
}
const common = Math.min(oldLen, newLen)
for (let i = 0; i < common; i++) {
const oldChild = oldChildren[i] as VNode
const newChild = newChildren[i] as VNode
if (!oldChild || !newChild) continue
this.patch(oldChild, newChild, el)
}
if (newLen > oldLen) {
for (let i = common; i < newLen; i++) {
const newChild = newChildren[i] as VNode
this.instantiateTree(newChild)
const childEl = this.mountVNode(newChild)
if (childEl) {
if (this.currentAnchor && this.getDOMAdapter().contains(el, this.currentAnchor))
this.getDOMAdapter().insertBefore(el, childEl, this.currentAnchor)
else this.getDOMAdapter().appendChild(el, childEl)
}
}
this.flushMounted()
} else if (oldLen > newLen) {
for (let i = common; i < oldLen; i++) {
const oldChild = oldChildren[i] as VNode
if (oldChild) {
this.invokeBeforeUnmount(oldChild)
if (oldChild.type === 'fragment') {
const nodes = (this.getVNodeMeta(oldChild, '**fragNodes') || []) as DomNodeLike[]
for (const n of nodes) {
if (n && this.getDOMAdapter().contains(el, n)) this.getDOMAdapter().removeChild(el, n)
}
} else if (
this.getVNodeEl(oldChild) &&
this.getDOMAdapter().contains(el, this.getVNodeEl(oldChild))
) {
this.getDOMAdapter().removeChild(el, this.getVNodeEl(oldChild))
}
this.invokeUnmounted(oldChild)
}
}
}
}

/\*\*

- fragment 的子节点补丁：对比旧/新 children 并更新到同一父级
  \*/
  private patchFragment(oldVNode: VNode | null, newVNode: VNode, parent: DomElementLike): void {
  // 提取旧/新 children 列表，并对其进行补丁到同一父级
  const oldChildren = oldVNode ? (oldVNode.children as VNode[]) : []
  const newChildren = newVNode.children as VNode[]
  this.patchChildren(oldChildren, newChildren, parent)
  // 片段本身没有固定元素，复用旧的 el 引用（若有）
  this.setVNodeEl(newVNode, oldVNode ? this.getVNodeEl(oldVNode) : undefined)
  }

/\*\*

- vapor 的补丁：仅复用外层容器引用（el），不触碰内部 DOM
-
- 注意：在区间更新（renderBetween）里，我们对 vapor→vapor 做了“强制替换”，
- 因为 vapor 的内部由 setup 返回控制，常规 patch 不会替换真实子节点
  \*/
  private patchVapor(oldVNode: VNode, newVNode: VNode): void {
  // 复用旧的外层 el；内部 DOM 由 renderBetween 或替换逻辑处理
  const el = this.getVNodeEl(oldVNode)
  this.setVNodeEl(newVNode, el)
  }

private instantiateComponent(vnode: VNode): void {
const inst =
(vnode.component as ComponentInternalInstance) || this.createComponentInstance(vnode)
this.pushInstance(inst)

    if (vnode.component !== undefined) {
      this.syncPropsChildren(inst, vnode.props || {}, vnode.children)
    }

    const sub = (vnode.type as any)(inst.propsRO as any)
    this.setVNodeMeta(vnode, '__subtree', sub)
    this.callHooks(inst, 'beforeCreate')
    this.callHooks(inst, 'created')

}

/\*\*

- 预实例化 vnode 树：
- - 函数组件：创建实例、生成子树并记录到 \_\_subtree
- - fragment/元素：递归实例化其子节点
-
- 作用：为 mount 阶段准备好必要的结构（避免重复创建实例）
  \*/
  private instantiateTree(vnode: VNode): void {
  // 空节点保护
  if (!vnode) return
  if (typeof vnode.type !== 'string') {
  // 组件：创建实例并生成子树
  this.instantiateComponent(vnode)
  const sub = this.getVNodeMeta(vnode, '\_\_subtree') as VNode
  // 递归实例化子树
  if (sub) this.instantiateTree(sub)
  this.popInstance()
  } else if (vnode.type === 'fragment') {
  // 片段：递归实例化所有子节点
  ;(vnode.children as VNode[]).forEach((c: VNode) => this.instantiateTree(c as VNode))
  } else if (vnode.type !== '#text') {
  // 原生元素：递归实例化所有子节点
  ;(vnode.children as VNode[]).forEach((c: VNode) => this.instantiateTree(c as VNode))
  }
  }

private mountComponent(vnode: VNode): DomNodeLike | null {
const inst = vnode.component as ComponentInternalInstance
this.pushInstance(inst)
this.callHooks(inst, 'beforeMount')
const sub = this.getVNodeMeta(vnode, '\_\_subtree') as VNode
const el = this.mountVNode(sub)
this.popInstance()
this.mountedQueue.push(() => {
this.callHooks(inst, 'mounted')
})
inst.isMounted = true
this.setVNodeEl(vnode, el ?? undefined)
return el
}

/\*\*

- 挂载 vnode：根据类型分派到对应的挂载逻辑，并返回真实节点
- - 组件：触发生命周期队列（beforeMount/mounted）
- - 文本/fragment/vapor/元素：各自路径生成并记录 el
    \*/
    private mountVNode(vnode: VNode): DomNodeLike | null {
    // 空节点保护：返回 null，不做任何挂载
    if (!vnode) return null
    if (typeof vnode.type !== 'string') {
    // 组件挂载：触发生命周期并返回根 el
    return this.mountComponent(vnode)
    }
    if (vnode.type === '#text') {
    // 文本挂载：创建或复用 text 节点，并保证内容一致
    const el =
    (this.getVNodeEl(vnode) as DomTextLike) ||
    this.getDOMAdapter().createTextNode((vnode.children[0] as string) || '')
    const text = (vnode.children[0] as string) || ''
    this.getDOMAdapter().settextContent(el as any, text)
    this.setVNodeEl(vnode, el)
    return el
    }
    if (vnode.type === 'fragment') {
    const frag = this.getDOMAdapter().createDocumentFragment()
    this.setVNodeEl(vnode, frag)
    ;(vnode.children as VNode[]).forEach((child: VNode) => {
    const cel = this.mountVNode(child as VNode)
    if (cel) this.getDOMAdapter().appendChild(frag, cel)
    })
    this.setVNodeMeta(vnode, '**fragNodes', this.getDOMAdapter().collectFragmentChildren(frag))
    return frag
    }
    if (vnode.type === 'vapor') {
    // vapor 挂载：执行 setup() 获取真实节点，并记录 fragment 的子节点到 **fragNodes
    const info = vnode.props.setup()
    const el = info.vaporElement
    if (el && this.getDOMAdapter().isFragment(el as any)) {
    this.setVNodeMeta(
    vnode,
    '\_\_fragNodes',
    this.getDOMAdapter().collectFragmentChildren(el as any),
    )
    }
    this.setVNodeEl(vnode, el)
    return el
    }
    // 原生元素挂载（SVG 使用命名空间）
    const el = this.getDOMAdapter().createElement(vnode.type as string) as DomElementLike
    this.setVNodeEl(vnode, el)
    this.patchProps(el, {}, vnode.props || {})
    if (!('dangerouslySetInnerHTML' in (vnode.props || {}))) {
    ;(vnode.children as VNode[]).forEach((child: VNode) => {
    let cel: any = null
    if (typeof child.type !== 'string') {
    cel = this.mountComponent(child as VNode)
    } else {
    cel = this.mountVNode(child as VNode)
    }
    if (cel) this.getDOMAdapter().appendChild(el, cel)
    })
    if (
    this.getDOMAdapter().getTagName(el) === 'SELECT' &&
    vnode.props &&
    'value' in vnode.props
    ) {
    const v: any = vnode.props.value
    this.getDOMAdapter().setValue(el, v)
    }
    }
    return el
    }

private createComponentInstance(vnode: VNode): ComponentInternalInstance {
const propsRO = rxReactive(
vnode.props || {},
{ readonly: true, equals: (p: any, n: any) => this.shallowEqualProp(p, n) },
true,
)
const inst: ComponentInternalInstance = {
vnode,
parent: this.currentInstance || null,
isMounted: false,
hooks: {
beforeCreate: new Set(),
created: new Set(),
beforeMount: new Set(),
mounted: new Set(),
beforeUpdate: new Set(),
updated: new Set(),
beforeUnmount: new Set(),
unmounted: new Set(),
},
propsRO: propsRO,
error: null,
index: this.currentContainerCount,
\_\_hooks: { states: [], index: 0 },
}
vnode.component = inst
return inst
}

private pushInstance(i: ComponentInternalInstance): void {
this.instanceStack.push(i)
this.currentInstance = i
rxSetCurrentInstance(i)
}

private popInstance(): void {
this.instanceStack.pop()
this.currentInstance = this.instanceStack[this.instanceStack.length - 1] || null
rxSetCurrentInstance(this.currentInstance)
}

private callHooks(inst: ComponentInternalInstance, name: keyof LifecycleHooks): void {
inst.hooks[name].forEach((fn: () => void) => {
fn()
})
}

private isVNodeLike(x: any): boolean {
return !!(x && typeof x === 'object' && (x as any).**isVNode** === true)
}

private shallowEqualProp(a: any, b: any): boolean {
if (Object.is(a, b)) return true
if (Array.isArray(a) && this.isVNodeLike(b) && a.length === 1) {
const ai = a[0]
const bj = b
if (this.isVNodeLike(ai) && this.isVNodeLike(bj)) {
return Object.is(ai.type, bj.type) && Object.is((ai as any).key, (bj as any).key)
}
return Object.is(ai, bj)
}
if (Array.isArray(b) && this.isVNodeLike(a) && b.length === 1) {
const bi = b[0]
const aj = a
if (this.isVNodeLike(bi) && this.isVNodeLike(aj)) {
return Object.is(bi.type, aj.type) && Object.is((bi as any).key, (aj as any).key)
}
return Object.is(bi, aj)
}
if (Array.isArray(a) && Array.isArray(b)) {
if (a.length !== b.length) return false
for (let i = 0; i < a.length; i++) {
const ai = a[i]
const bi = b[i]
if (this.isVNodeLike(ai) && this.isVNodeLike(bi)) {
if (!Object.is(ai.type, bi.type) || !Object.is((ai as any).key, (bi as any).key)) {
return false
}
} else {
if (!Object.is(ai, bi)) return false
}
}
return true
}
if (this.isVNodeLike(a) && this.isVNodeLike(b)) {
return (
Object.is((a as any).type, (b as any).type) && Object.is((a as any).key, (b as any).key)
)
}
if (a && b && typeof a === 'object' && typeof b === 'object') {
const ak = Object.keys(a)
const bk = Object.keys(b)
if (ak.length !== bk.length) return false
for (const k of ak) {
if (!(k in (b as any))) return false
const av = (a as any)[k]
const bv = (b as any)[k]
if (this.isVNodeLike(av) && this.isVNodeLike(bv)) {
if (!Object.is(av.type, bv.type) || !Object.is(av.key, bv.key)) return false
} else {
if (!Object.is(av, bv)) return false
}
}
return true
}
return false
}
private setVNodeMeta(vnode: VNode, key: string, value: any): void {
try {
;(vnode as any)[key] = value
return
} catch {}
const existing = this.vnodeMeta.get(vnode as any) || {}
existing[key] = value
this.vnodeMeta.set(vnode as any, existing)
}
private getVNodeMeta(vnode: VNode, key: string): any {
const direct = (vnode as any)[key]
if (typeof direct !== 'undefined') return direct
const map = this.vnodeMeta.get(vnode as any)
return map ? map[key] : undefined
}
private setVNodeEl(vnode: VNode, el: any): void {
try {
;(vnode as any).el = el
return
} catch {}
this.setVNodeMeta(vnode, '**el', el)
}
private getVNodeEl(vnode: VNode | null): any {
if (!vnode) return undefined
const direct = (vnode as any).el
if (typeof direct !== 'undefined') return direct
return this.getVNodeMeta(vnode, '**el')
}
private syncPropsChildren(
inst: ComponentInternalInstance,
props: ComponentProps | undefined,
children: any,
): void {
const p = props || {}
const sig: any = (inst.propsRO as any).**signal**
batch(() => {
Object.keys(p).forEach((k: string) => {
const nv = (p as any)[k]
const ov = typeof sig.peekPath === 'function' ? sig.peekPath([k]) : undefined
if (!this.shallowEqualProp(ov, nv)) {
sig.setPath([k], nv)
}
})
const cv = children
const ncv = Array.isArray(cv) ? cv : [cv]
const ovC = typeof sig.peekPath === 'function' ? sig.peekPath(['children']) : undefined
const skipEmptyChildrenWrite =
(ovC === undefined || ovC === null) && Array.isArray(ncv) && ncv.length === 0
if (!skipEmptyChildrenWrite && !this.shallowEqualProp(ovC, ncv)) {
sig.setPath(['children'], ncv)
}
})
}

private flushMounted(): void {
const q = this.mountedQueue.slice()
this.mountedQueue.length = 0
q.forEach((fn: () => void) => {
fn()
})
}

private invokeBeforeUnmount(vnode: VNode | null): void {
if (!vnode) return
if (typeof vnode.type !== 'string') {
const inst = vnode.component as ComponentInternalInstance
if (inst) this.callHooks(inst, 'beforeUnmount')
const sub = this.getVNodeMeta(vnode, '\_\_subtree') as VNode
if (sub) this.invokeBeforeUnmount(sub)
} else {
if (vnode.type === 'fragment') {
;(vnode.children as VNode[]).forEach((c: VNode) => this.invokeBeforeUnmount(c))
} else if (vnode.type !== 'text') {
;(vnode.children as VNode[]).forEach((c: VNode) => this.invokeBeforeUnmount(c))
}
}
}

private invokeUnmounted(vnode: VNode | null): void {
if (!vnode) return
if (typeof vnode.type !== 'string') {
const sub = this.getVNodeMeta(vnode, '\_\_subtree') as VNode
if (sub) this.invokeUnmounted(sub)
const inst = vnode.component as ComponentInternalInstance
if (inst) this.callHooks(inst, 'unmounted')
} else {
if (vnode.type === 'fragment') {
;(vnode.children as VNode[]).forEach((c: VNode) => this.invokeUnmounted(c as VNode))
} else if (vnode.type !== 'text') {
;(vnode.children as VNode[]).forEach((c: VNode) => this.invokeUnmounted(c as VNode))
}
}
}

onBeforeCreate(fn: () => void): void {
if (this.currentInstance) this.currentInstance.hooks.beforeCreate.add(fn)
}
onCreated(fn: () => void): void {
if (this.currentInstance) this.currentInstance.hooks.created.add(fn)
}
onBeforeMount(fn: () => void): void {
if (this.currentInstance) this.currentInstance.hooks.beforeMount.add(fn)
}
onMounted(fn: () => void): void {
if (this.currentInstance) this.currentInstance.hooks.mounted.add(fn)
}
onBeforeUpdate(fn: () => void): void {
if (this.currentInstance) this.currentInstance.hooks.beforeUpdate.add(fn)
}
onUpdated(fn: () => void): void {
if (this.currentInstance) this.currentInstance.hooks.updated.add(fn)
}
onError(fn: (error: any, instance?: ComponentInternalInstance | null) => void): void {
this.errorHandlers.add(fn)
}
private handleError(error: any, instance?: ComponentInternalInstance | null): void {
if (this.crashed) return
const hasHandlers = this.errorHandlers.size > 0
if (hasHandlers) {
for (const h of this.errorHandlers) {
try {
this.createElement(error, instance || null)
} catch {}
}
this.deferredQueue.length = 0
this.mountedQueue.length = 0
return
}
this.crashed = true
console.error(error)
this.deferredQueue.length = 0
this.mountedQueue.length = 0
const c = this.currentContainer
if (c) {
try {
this.unmount(c)
} catch {}
}
}
onBeforeUnmount(fn: () => void): void {
if (this.currentInstance) this.currentInstance.hooks.beforeUnmount.add(fn)
}
onUnmounted(fn: () => void): void {
if (this.currentInstance) this.currentInstance.hooks.unmounted.add(fn)
}

emitted(props: ComponentProps): (event: string, ...args: any[]) => void {
const p: any = props || {}
return (event: string, ...args: any[]) => {
const keyColon = 'on' + event
const keyCamel = 'on' + (event[0] ? event[0].toUpperCase() + event.slice(1) : '')
const handler = p[keyColon] || p[keyCamel]
if (typeof handler === 'function') handler(...args)
}
}

// 挂载应用
/\*_ 应用挂载：以 effect 包裹根组件生成过程，确保响应式状态变化触发重渲染 _/
mount(App: ComponentInstance, container: string | DomElementLike): void {
let mountContainer: DomElementLike
if (typeof container === 'string') {
const el = this.getDOMAdapter().querySelector(container)
if (!el) {
throw new Error(`Container ${container} not found`)
}
mountContainer = el as any
} else {
mountContainer = container
}
this.currentContainer = mountContainer
this.installedPlugins.forEach((options: any, plugin) => {
try {
if (plugin && typeof plugin.install === 'function') {
plugin.install(this, options)
} else if (typeof plugin === 'function') {
plugin(this, options)
}
} catch (e) {
this.handleError(e, this.currentInstance)
return
}
})
try {
const appVNode = App({})
this.render(appVNode, mountContainer)
} catch (e) {
this.handleError(e, this.currentInstance)
return
}
}

use(plugin: any, ...options: any[]): Rue {
if (this.installedPlugins.has(plugin)) return this
this.installedPlugins.set(plugin, options)

    return this

}

unmount(container: string | DomElementLike): void {
const mountContainer =
typeof container === 'string'
? (this.getDOMAdapter().querySelector(container) as any)
: (container as any)
if (!mountContainer) return
const prev = this.containerMap.get(mountContainer) || null
if (!prev) {
this.getDOMAdapter().setInnerHTML(mountContainer, '')
return
}
this.invokeBeforeUnmount(prev)
const parent =
(prev &&
this.getVNodeEl(prev) &&
(this.getDOMAdapter().getParentNode(this.getVNodeEl(prev)) as any)) ||
mountContainer
if (prev.type === 'fragment') {
const nodes = (this.getVNodeMeta(prev, '\_\_fragNodes') || []) as DomNodeLike[]
for (const n of nodes) {
if (n && this.getDOMAdapter().contains(parent, n))
this.getDOMAdapter().removeChild(parent, n)
}
} else if (
this.getVNodeEl(prev) &&
this.getDOMAdapter().contains(parent, this.getVNodeEl(prev))
) {
this.getDOMAdapter().removeChild(parent, this.getVNodeEl(prev))
}
this.invokeUnmounted(prev)
this.containerMap.set(mountContainer, null)
}

getCurrentContainer(): DomElementLike | null {
return this.currentContainer
}

/\*\*

- 创建 vapor vnode：以 setup 返回的真实节点作为内容载体
- 用于编译产物与手写 DOM 片段的桥接
  \*/
  vapor(setup: () => { vaporElement: DomNodeLike }): VNode {
  // 返回一个类型为 'vapor' 的 vnode，setup 在挂载时产出真实 DOM
  return {
  type: 'vapor',
  props: { setup },
  children: [],
  key: undefined,
  }
  }
  }

const rue: Rue = ((globalThis as any).**rue || ((globalThis as any).**rue = new Rue())) as Rue
const getRue = () => (globalThis as any).**rue_active || (globalThis as any).**rue

export const createElement = <P = {}>(
type: string | ComponentInstance<P>,
props: ComponentProps | null,
...children: ChildInput[]
) => getRue().createElement(type, props, ...children)
export const render = (vnode: VNode, container: DomElementLike) => getRue().render(vnode, container)
export const renderBetween = (
vnode: VNode,
parent: DomElementLike,
start: DomNodeLike,
end: DomNodeLike,
) => getRue().renderBetween(vnode, parent, start, end)
export const mount = (App: ComponentInstance, container: string | DomElementLike) =>
getRue().mount(App, container)
export const use = (plugin: any, ...options: any[]) => getRue().use(plugin, ...options)
export const emitted = (props: ComponentProps) => getRue().emitted(props)
export const vapor = (setup: () => { vaporElement: DomNodeLike }) => getRue().vapor(setup)
export const onBeforeCreate = (fn: () => void) => getRue().onBeforeCreate(fn)
export const onCreated = (fn: () => void) => getRue().onCreated(fn)
export const onBeforeMount = (fn: () => void) => getRue().onBeforeMount(fn)
export const onMounted = (fn: () => void) => getRue().onMounted(fn)
export const onBeforeUpdate = (fn: () => void) => getRue().onBeforeUpdate(fn)
export const onUpdated = (fn: () => void) => getRue().onUpdated(fn)
export const onBeforeUnmount = (fn: () => void) => getRue().onBeforeUnmount(fn)
export const onUnmounted = (fn: () => void) => getRue().onUnmounted(fn)
export const onError = (fn: (error: any, instance?: any) => void) => getRue().onError(fn)
export const getCurrentContainer = () => getRue().getCurrentContainer()
export default rue

export function createRue(): Rue {
return new Rue()
}

// 为 JSX/TSX 提供工厂函数
export function h<P = {}>(
type: string | ComponentInstance<P>,
props: ComponentProps | null,
...children: ChildInput[]
): VNode {
return getRue().createElement(type, props, ...children)
}
export const Fragment = 'fragment'
export type PropsWithChildren<P = {}> = P & { children?: Child | Child[] }
export type FC<P = {}> = (props: PropsWithChildren<P>) => VNode

// 类型导出
export type { ComponentProps, ComponentInstance, VNode }
