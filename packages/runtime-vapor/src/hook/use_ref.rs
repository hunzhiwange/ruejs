/*
useRef：在 Hook 插槽上持久化一个简单的容器 { current }

设计要点：
- 通过 `withHookSlot(factory)` 把当前调用的“钩子状态”放进组件实例的 `__hooks.states` 指定槽位中；
  首次调用会使用 `factory` 创建对象，后续调用直接复用该对象（保持引用稳定）。
- 返回的对象仅包含一个字段：`current`，用于存放任意值，读写都不会触发响应式副作用。
*/
use js_sys::{Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::context::with_hook_slot;

#[wasm_bindgen(js_name = useRef)]
pub fn use_ref(initial: JsValue) -> JsValue {
    // 工厂函数：仅在该 Hook 的插槽尚未创建时执行一次
    // 创建一个普通对象，并将初始值写入 `current`
    let factory = Closure::wrap(Box::new(move || {
        let o = Object::new();
        let _ = Reflect::set(&o, &JsValue::from_str("current"), &initial);
        o.into()
    }) as Box<dyn FnMut() -> JsValue>);
    // 使用 Hook 插槽：首次返回工厂创建的对象；后续调用返回同一个对象（保持引用稳定）
    let slot = with_hook_slot(factory.as_ref().clone().into());
    factory.forget();
    // 返回持久化的 { current } 容器；该容器本身不具备响应式能力，仅用于存放任意值
    slot
}

#[wasm_bindgen(typescript_custom_section)]
const TS_USE_REF_DECL: &'static str = r#"
/**
 * useRef：在 Hook 插槽上持久化 { current } 容器
 */
export function useRef<T = any>(initial?: T): { current: T | undefined };
"#;
