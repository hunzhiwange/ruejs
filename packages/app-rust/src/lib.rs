use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use js_sys::{Function, Object, Reflect};

mod vector_canvas;
mod wgpu;
#[cfg(feature = "wgpu_rs")]
mod wgpu_rs_backend;
mod layer_manager;

#[wasm_bindgen]
pub fn makeVectorElement(width: u32, height: u32) -> JsValue {
    vector_canvas::make_vector_element(width, height)
}

#[wasm_bindgen]
pub fn makeWgpuElement(width: u32, height: u32) -> JsValue {
    wgpu::make_wgpu_element(width, height)
}

#[wasm_bindgen]
pub fn makeWgpuRsElement(width: u32, height: u32) -> JsValue {
    #[cfg(feature = "wgpu_rs")]
    {
        return wgpu_rs_backend::make_wgpu_rs_element(width, height);
    }
    let global = js_sys::global();
    let document = Reflect::get(&global, &JsValue::from_str("document")).unwrap();
    let ce: Function = Reflect::get(&document, &JsValue::from_str("createElement"))
        .unwrap()
        .into();
    let root = ce.call1(&document, &JsValue::from_str("div")).unwrap();
    let _ = Reflect::set(
        &root,
        &JsValue::from_str("className"),
        &JsValue::from_str("inline-block rounded-xl border border-base-300 p-2 text-xs text-base-content/70"),
    );
    let _ = Reflect::set(
        &root,
        &JsValue::from_str("textContent"),
        &JsValue::from_str("wgpu.rs 后端未启用（app-rust Cargo 特性 wgpu_rs 关闭）"),
    );
    let out = Object::new();
    let _ = Reflect::set(&out, &JsValue::from_str("vaporElement"), &root);
    out.into()
}
#[wasm_bindgen]
pub fn makeLayerManagerElement(width: u32, height: u32) -> JsValue {
    layer_manager::make_layer_manager_element(width, height)
}
