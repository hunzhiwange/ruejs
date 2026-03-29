use super::WasmRue;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "getDOMAdapterMut")]
    /// 获取 DOM 适配器的“可变”接口（同只读返回，兼容 JS 侧命名）
    pub fn get_dom_adapter_mut(&self) -> JsValue {
        self.get_dom_adapter()
    }
}
