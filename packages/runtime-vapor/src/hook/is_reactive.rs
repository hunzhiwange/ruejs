/*
isReactive 调试工具
*/
use js_sys::Reflect;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = isReactive)]
pub fn is_reactive(obj: JsValue) -> bool {
    // 非对象一定不是 reactive
    if !obj.is_object() {
        return false;
    }
    // reactive 代理会打上内部标记：
    // - __isReactive__: 布尔或存在即视为真
    // - __signal__:    隐藏的底层信号句柄（对象存在也说明是代理）
    let flag =
        Reflect::get(&obj, &JsValue::from_str("__isReactive__")).unwrap_or(JsValue::UNDEFINED);
    let sig = Reflect::get(&obj, &JsValue::from_str("__signal__")).unwrap_or(JsValue::UNDEFINED);
    let flag_true = flag.as_bool().unwrap_or(false) || !flag.is_undefined();
    let has_sig = !sig.is_undefined() && sig.is_object();
    flag_true || has_sig
}

#[wasm_bindgen(typescript_custom_section)]
const TS_IS_REACTIVE_DECL: &'static str = r#"
/**
 * 调试工具：判断对象是否为 reactive 代理
 */
export function isReactive(obj: any): boolean;
"#;
