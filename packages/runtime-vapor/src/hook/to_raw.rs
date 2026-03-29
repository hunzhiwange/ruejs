/*
toRaw 调试工具
*/
use js_sys::{Function, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = toRaw)]
pub fn to_raw_js(obj: JsValue) -> JsValue {
    if obj.is_object() {
        // 优先：隐藏原始值
        let raw =
            Reflect::get(&obj, &JsValue::from_str("__rue_raw__")).unwrap_or(JsValue::UNDEFINED);
        if !raw.is_undefined() {
            return raw;
        }
        // 其次：底层信号句柄（代理暴露的隐藏通道）
        let sig =
            Reflect::get(&obj, &JsValue::from_str("__signal__")).unwrap_or(JsValue::UNDEFINED);
        if !sig.is_undefined() {
            let peek = Reflect::get(&sig, &JsValue::from_str("peek")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = peek.dyn_ref::<Function>() {
                // 首选 peek()：读取当前值但不收集依赖
                let v = f.call0(&sig).unwrap_or(JsValue::UNDEFINED);
                if !v.is_undefined() {
                    if v.is_object() {
                        let o: js_sys::Object = v.clone().unchecked_into();
                        let vv = js_sys::Reflect::get(&o, &JsValue::from_str("value"))
                            .unwrap_or(JsValue::UNDEFINED);
                        if !vv.is_undefined() {
                            return vv;
                        }
                    }
                    return v;
                }
            }
            let getf = Reflect::get(&sig, &JsValue::from_str("get")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = getf.dyn_ref::<Function>() {
                // 回退使用 get()：可能会收集依赖，但能保证读取到当前值
                let v = f.call0(&sig).unwrap_or(JsValue::UNDEFINED);
                if !v.is_undefined() {
                    if v.is_object() {
                        let o: js_sys::Object = v.clone().unchecked_into();
                        let vv = js_sys::Reflect::get(&o, &JsValue::from_str("value"))
                            .unwrap_or(JsValue::UNDEFINED);
                        if !vv.is_undefined() {
                            return vv;
                        }
                    }
                    return v;
                }
            }
            // 若读取失败，返回原对象以保持健壮性
            return obj.clone();
        }
        // Ref 形态：返回其 value
        let v = Reflect::get(&obj, &JsValue::from_str("value")).unwrap_or(JsValue::UNDEFINED);
        if !v.is_undefined() {
            return v;
        }
        // 兼容：如果对象含 `get` 方法（只读信号），尝试调用以获取当前值
        let getter = Reflect::get(&obj, &JsValue::from_str("get")).unwrap_or(JsValue::UNDEFINED);
        if let Some(f) = getter.dyn_ref::<Function>() {
            let v = f.call0(&obj).unwrap_or(JsValue::UNDEFINED);
            if !v.is_undefined() {
                return v;
            }
        }
    }
    obj
}

#[wasm_bindgen(typescript_custom_section)]
const TS_TO_RAW_DECL: &'static str = r#"
/**
 * 调试工具：获取 reactive 代理背后的原始数据快照
 * - 对 reactive 对象：通过隐藏的 `__signal__` 获取当前值（不收集依赖）
 * - 对 ref：返回其 `.value`
 * - 其他：原样返回
 */
export function toRaw<T = any>(obj: any): T;
"#;
