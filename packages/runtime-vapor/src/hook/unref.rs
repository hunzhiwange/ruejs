/*
unref 工具（浅层）
*/
use js_sys::Reflect;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = unref)]
pub fn unref_js(obj: JsValue) -> JsValue {
    if obj.is_object() {
        let v = Reflect::get(&obj, &JsValue::from_str("value")).unwrap_or(JsValue::UNDEFINED);
        if !v.is_undefined() {
            return v;
        }
    }
    obj
}

#[wasm_bindgen(typescript_custom_section)]
const TS_UNREF_DECL: &'static str = r#"
/**
 * unref：若参数是 ref，返回其 .value；否则原样返回
 */
export function unref<T = any>(obj: any): T;
 "#;
