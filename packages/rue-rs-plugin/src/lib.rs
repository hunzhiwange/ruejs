use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use wasm_bindgen::JsCast;

#[wasm_bindgen(js_name = "createPlugin")]
pub fn create_plugin() -> JsValue {
    let install = wasm_bindgen::closure::Closure::wrap(Box::new(move |_app: JsValue, options: JsValue| {
        let count = if Array::is_array(&options) {
            Array::from(&options).length()
        } else {
            0
        };
        let global = js_sys::global();
        let _ = Reflect::set(&global, &JsValue::from_str("__rue_rs_plugin_installed"), &JsValue::from_f64(count as f64));
    }) as Box<dyn FnMut(JsValue, JsValue)>);
    let install_fn: Function = install.as_ref().clone().unchecked_into();
    install.forget();
    let plugin = Object::new();
    let _ = Reflect::set(&plugin, &JsValue::from_str("install"), &install_fn);
    plugin.into()
}
