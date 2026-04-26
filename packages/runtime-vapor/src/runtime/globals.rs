//! 运行时全局状态（线程局部）与工具函数（中文注释增强）
//!
//! 提供崩溃标记、最近钩子错误、挂起钩子队列以及默认输入注册表。
//! 这些状态通过 thread_local 保证在 Wasm/JS 环境下的隔离与安全。
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::MountInput;
use std::cell::{Cell, RefCell};
use wasm_bindgen::JsValue;

thread_local! {
    /// 运行时是否崩溃（由钩子或其他错误导致）
    pub static RUNTIME_CRASHED: Cell<bool> = Cell::new(false);
    /// 最近一次钩子抛出的错误（用于上报与调试）
    pub static LAST_HOOK_ERROR: RefCell<Option<JsValue>> = RefCell::new(None);
    /// 待执行的钩子队列（名称，回调），避免重入与上下文混乱
    pub static PENDING_HOOKS: RefCell<Vec<(String, JsValue)>> = RefCell::new(Vec::new());
}

/// 在钩子执行路径上标记崩溃，并记录错误
pub fn mark_crashed_from_hook(err: &JsValue) {
    RUNTIME_CRASHED.with(|c| c.set(true));
    LAST_HOOK_ERROR.with(|cell| {
        *cell.borrow_mut() = Some(err.clone());
    });
}

/// 查询运行时是否已崩溃
pub fn is_runtime_crashed() -> bool {
    RUNTIME_CRASHED.with(|c| c.get())
}

/// 读取最近一次钩子错误（若存在）
pub fn last_hook_error() -> Option<JsValue> {
    LAST_HOOK_ERROR.with(|cell| cell.borrow().clone())
}

thread_local! {
    /// 默认 bridge 输入注册表（索引 -> MountInput）。
    ///
    /// 默认主路径已经不再运输 live 树对象；createElement/vapor 生成的句柄，
    /// 以及 render/renderAnchor/renderBetween/renderStatic 默认入口消费的对象，
    /// 都先收敛为 MountInput 再进入调度层。
    pub static MOUNT_INPUT_REGISTRY: RefCell<Vec<Option<MountInput<JsDomAdapter>>>> = RefCell::new(Vec::new());
}

/// 推入挂起钩子（名称与回调），由外层批量执行
pub fn push_pending_hook(name: &str, f: JsValue) {
    PENDING_HOOKS.with(|q| q.borrow_mut().push((name.to_string(), f)));
}

/// 取出并清空所有挂起钩子（供批处理执行）
pub fn take_pending_hooks() -> Vec<(String, JsValue)> {
    PENDING_HOOKS.with(|q| q.borrow_mut().drain(..).collect())
}
