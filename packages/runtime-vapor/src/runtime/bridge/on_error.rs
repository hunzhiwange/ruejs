use super::WasmRue;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "onError")]
    pub fn on_error(&self, f: JsValue) {
        self.inner.borrow_mut().on_error(f);
    }
}
