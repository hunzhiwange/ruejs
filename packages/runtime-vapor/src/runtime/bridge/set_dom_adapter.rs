use super::WasmRue;
use crate::runtime::js_adapter::JsDomAdapter;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "setDOMAdapter")]
    /// 设置 DOM 适配器（JsDomAdapter），用于后续渲染与元素操作
    pub fn set_dom_adapter(&self, adapter: JsValue) {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:setDOMAdapter") {
                let is_obj = adapter.is_object();
                crate::log::log("debug", &format!("runtime:setDOMAdapter is_object={}", is_obj));
            }
        }
        let mut rue = self.inner.borrow_mut();
        let js_adapter = JsDomAdapter::new(adapter.clone());
        rue.set_dom_adapter(js_adapter);
    }
}
