use super::super::WasmRue;
use crate::runtime::DEFAULT_MOUNT_HANDLE_KEY;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::{ComponentProps, MountInput, MountInputType};
use js_sys::{Function, Object, Reflect};
use wasm_bindgen::JsValue;

pub(super) fn create_function_component_out(
    _this: &WasmRue,
    func: Function,
    props_map: ComponentProps,
) -> JsValue {
    let input = MountInput::new_normalized(
        MountInputType::<JsDomAdapter>::Component(func.clone().into()),
        props_map,
        Vec::new(),
    );
    let key = input.key.clone();
    let id = crate::runtime::MOUNT_INPUT_REGISTRY.with(|reg| {
        let mut registry = reg.borrow_mut();
        registry.push(Some(input));
        (registry.len() - 1) as u32
    });
    let out = Object::new();
    let _ = Reflect::set(
        &out,
        &JsValue::from_str(DEFAULT_MOUNT_HANDLE_KEY),
        &JsValue::from_f64(id as f64),
    );
    if let Some(key) = key {
        let _ = Reflect::set(&out, &JsValue::from_str("key"), &JsValue::from_str(&key));
    }
    out.into()
}