use super::WasmRue;
use crate::runtime::core::Rue;
use crate::runtime::js_adapter::JsDomAdapter;
use js_sys::Reflect;
use std::cell::RefCell;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[allow(non_snake_case)]
/// 创建 WasmRue 实例（可选设置 DOM 适配器）
///
/// - 若传入 adapter（JS 对象），则设置为 DomAdapter，并在全局挂载 __rue_dom
/// - 初始化内部 Rue，构造渲染队列与上次容器记录
pub fn createRue(adapter: JsValue) -> WasmRue {
    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "runtime:createRue") {
            let is_obj = adapter.is_object();
            crate::log::log("debug", &format!("runtime:createRue adapter_is_object={}", is_obj));
        }
    }
    let mut rue = Rue::<JsDomAdapter>::new();
    if !adapter.is_undefined() && !adapter.is_null() {
        let js_adapter = JsDomAdapter::new(adapter.clone());
        rue.set_dom_adapter(js_adapter);
        let global = js_sys::global();
        let _ = Reflect::set(&global, &JsValue::from_str("__rue_dom"), &adapter);
    }
    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "runtime:createRue done") {
            crate::log::log("debug", "runtime:createRue done");
        }
    }
    // 注意：WasmRue 是 JS 侧可持有的运行时实例：
    // - inner: Rust 运行时核心（patch/render/reactive 等）
    // - pending_*: JS->WASM 的渲染请求队列（通过 Promise.then 批处理）
    // - root_effect: mount 创建的根 effect 句柄（可选）
    //
    // root_effect 初始为 None：
    // - 只有调用 mount(app, container) 时才会创建
    // - 仅调用 render(vnode, container) 不会创建 root effect
    WasmRue {
        inner: RefCell::new(rue),
        last_container: RefCell::new(None),
        pending_between: RefCell::new(Vec::new()),
        pending_render: RefCell::new(Vec::new()),
        root_effect: RefCell::new(None),
        root_effect_scope: RefCell::new(None),
        root_effect_closure: RefCell::new(None),
    }
}
