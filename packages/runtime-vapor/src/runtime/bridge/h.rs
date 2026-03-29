use super::WasmRue;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "h")]
    /// JSX/h 入口：与 createElement 行为一致，聚合到同一实现
    pub fn h_wasm(&self, type_tag: JsValue, props: JsValue, children: JsValue) -> JsValue {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:h") {
                crate::log::log("debug", "runtime:h");
            }
        }
        self.create_element_wasm(type_tag, props, children)
    }
}
