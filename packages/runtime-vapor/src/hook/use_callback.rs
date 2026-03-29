use js_sys::Function;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::hook::use_memo;

#[wasm_bindgen(js_name = useCallback)]
pub fn use_callback(func: Function, deps: JsValue) -> Function {
    // 将传入的函数包装为“工厂函数”，供 useMemo 缓存其返回值（实际上就是函数本身的稳定引用）
    let make =
        Closure::wrap(Box::new(move || JsValue::from(func.clone())) as Box<dyn FnMut() -> JsValue>);
    // useMemo 会根据依赖数组判断是否需要重新计算；这里计算的值是 `func` 的克隆引用
    let fval = use_memo(make.as_ref().clone().unchecked_into(), deps);
    make.forget();
    // 返回稳定的函数引用，避免子组件或 effect 因引用变化而重跑
    fval.unchecked_into::<Function>()
}

#[wasm_bindgen(typescript_custom_section)]
const TS_USE_CALLBACK_DECL: &'static str = r#"
/**
 * useCallback：根据依赖数组缓存回调函数的引用
 */
export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: any[]): T;
"#;
