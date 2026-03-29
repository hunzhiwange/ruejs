use js_sys::{Object, Reflect};
use wasm_bindgen::JsValue;

/// 重置组件宿主对象上的 hook 调用索引
///
/// 确保后续 hooks 从索引 0 开始，避免跨渲染错位。
pub(crate) fn reset_hook_index(host: &Object) {
    let hooks = Reflect::get(host, &JsValue::from_str("__hooks")).unwrap_or(JsValue::UNDEFINED);
    if hooks.is_undefined() || hooks.is_null() {
        return;
    }
    let hooks_obj = Object::from(hooks);
    let _ = Reflect::set(&hooks_obj, &JsValue::from_str("index"), &JsValue::from_f64(0.0));
}
