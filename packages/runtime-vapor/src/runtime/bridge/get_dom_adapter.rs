use super::WasmRue;
use js_sys::Reflect;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "getDOMAdapter")]
    /// 读取当前 DOM 适配器（从全局 __rue_dom）
    pub fn get_dom_adapter(&self) -> JsValue {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:getDOMAdapter") {
                crate::log::log("debug", "runtime:getDOMAdapter");
            }
        }
        let global = js_sys::global();
        Reflect::get(&global, &JsValue::from_str("__rue_dom")).unwrap_or(JsValue::UNDEFINED)
    }
}
