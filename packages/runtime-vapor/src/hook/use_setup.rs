use js_sys::{Array, Function};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

use crate::hook::use_memo;

#[wasm_bindgen(js_name = useSetup)]
pub fn use_setup(factory: Function) -> JsValue {
    // 空依赖数组：只会在首次执行时调用 factory 并缓存结果
    let empty: JsValue = Array::new().into();
    use_memo(factory, empty)
}

#[wasm_bindgen(typescript_custom_section)]
const TS_USE_SETUP_DECL: &'static str = r#"
/**
 * useSetup：仅在首次调用时计算一次并缓存
 */
export function useSetup<T>(factory: () => T): T;
"#;
