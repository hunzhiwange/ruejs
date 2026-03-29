/*
组件实例（ComponentInternalInstance）与生命周期（LifecycleHooks）
--------------------------------------------------------------
Rue 并未引入完整组件渲染器，但预留了组件实例的数据结构及生命周期钩子集合。
当外层框架在 Rue 之上封装组件模型（如函数式组件），可以把 VNode 与父子关系、props 与错误信息
封装到 ComponentInternalInstance 中，并通过生命周期集合管理钩子的执行。

设计意图：
- LifecycleHooks 使用多个 HashSet<usize> 只是一个简单占位，表示不同阶段的钩子集合；
  实际使用中可将这些 id 映射到注册的 JS 函数列表（在 Rue::lifecycle_hooks 中存放）。
- ComponentInternalInstance 持有当前组件的 VNode、副本父实例、挂载状态与只读 props 等。
*/
use super::types::VNode;
use crate::runtime::dom_adapter::DomAdapter;
use std::collections::HashMap;
use wasm_bindgen::JsValue;

pub struct LifecycleHooks(pub HashMap<String, Vec<JsValue>>);

pub struct ComponentInternalInstance<A: DomAdapter> {
    // 当前组件对应的虚拟节点（VNode）
    pub vnode: VNode<A>,
    // 父组件实例（若有），用于层级结构（可选）
    pub parent: Option<Box<ComponentInternalInstance<A>>>,
    // 是否已挂载（mount 后为 true）
    pub is_mounted: bool,
    // 生命周期钩子集合（占位）
    pub hooks: LifecycleHooks,
    // 只读的 props 代理（由 reactive 系统创建的 JS 对象）
    pub props_ro: JsValue,
    // 当前组件对应的 Hook 宿主对象（setCurrentInstance 所使用的对象）
    pub host: JsValue,
    // 组件内部错误（如渲染/副作用阶段抛出的异常）
    pub error: Option<JsValue>,
    // 错误处理回调集合
    pub error_handlers: Vec<JsValue>,
    // 实例索引（在运行时内部用于跟踪）
    pub index: usize,
}
