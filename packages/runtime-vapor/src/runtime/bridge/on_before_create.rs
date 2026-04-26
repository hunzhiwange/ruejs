use super::WasmRue;
use crate::runtime::globals::push_pending_hook;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "onBeforeCreate")]
    pub fn on_before_create(&self, f: JsValue) {
        if let Ok(mut inner) = self.inner.try_borrow_mut() {
            inner.on_before_create(f);
        } else {
            push_pending_hook("before_create", f);
        }
    }
}