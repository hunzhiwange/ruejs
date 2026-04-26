/*
组件实例（ComponentInternalInstance）与生命周期（LifecycleHooks）
--------------------------------------------------------------
Rue 并未引入完整组件渲染器，但预留了组件实例的数据结构及生命周期钩子集合。
当外层框架在 Rue 之上封装组件模型（如函数式组件），可以把运行时状态、父子关系、props 与错误信息
封装到 ComponentInternalInstance 中，并通过生命周期集合管理钩子的执行。

设计意图：
- LifecycleHooks 使用多个 HashSet<usize> 只是一个简单占位，表示不同阶段的钩子集合；
  实际使用中可将这些 id 映射到注册的 JS 函数列表（在 Rue::lifecycle_hooks 中存放）。
- ComponentInternalInstance 持有当前组件的父实例、副作用作用域、挂载状态与只读 props 等。
*/
use crate::runtime::dom_adapter::DomAdapter;
use std::collections::HashMap;
use std::marker::PhantomData;
use wasm_bindgen::JsValue;

pub struct LifecycleHooks(pub HashMap<String, Vec<JsValue>>);

pub struct ComponentInternalInstance<A: DomAdapter> {
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
    // 本组件“本轮渲染”期间创建的 effect/computed/useEffect 所属 scope。
    // 组件更新前会先 dispose 上一轮 scope，避免这些副作用在多次重渲染后不断累积。
    pub render_scope_id: Option<usize>,
    // 组件内部错误（如渲染/副作用阶段抛出的异常）
    pub error: Option<JsValue>,
    // 错误处理回调集合
    pub error_handlers: Vec<JsValue>,
    // 实例索引（在运行时内部用于跟踪）
    pub index: usize,
    // 占位类型信息：实例本身不再持有历史树对象，但仍需约束宿主类型 A。
    pub _marker: PhantomData<A>,
}
