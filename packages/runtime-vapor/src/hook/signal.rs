/*
Signal 包装（Hook 入口）
*/
use js_sys::Function;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::context::{get_current_instance, with_hook_slot};
use crate::reactive::signal::{SignalHandle, create_signal};

thread_local! {
    static SIGNAL_HANDLE_REGISTRY: std::cell::RefCell<Vec<SignalHandle>> = std::cell::RefCell::new(Vec::new());
}

#[wasm_bindgen(js_name = signal)]
pub fn signal_js(
    initial: JsValue,
    options: Option<JsValue>,
    force_global: Option<bool>,
) -> SignalHandle {
    // 当没有当前组件实例或明确要求强制全局时，直接创建并返回
    let use_global = force_global.unwrap_or(false);
    let cur = get_current_instance();
    if use_global || cur.is_undefined() || cur.is_null() {
        return create_signal(initial, options);
    }
    // 在 Hook 插槽中存储并返回
    let make = Closure::wrap(Box::new(move || {
        // 创建信号句柄，并将其索引存入线程局部的注册表，以便稍后取回
        let h = create_signal(initial.clone(), options.clone());
        let idx = SIGNAL_HANDLE_REGISTRY.with(|r| {
            let mut v = r.borrow_mut();
            v.push(h);
            (v.len() - 1) as f64
        });
        JsValue::from_f64(idx)
    }) as Box<dyn FnMut() -> JsValue>);
    let f: Function = make.as_ref().clone().unchecked_into();
    let v = with_hook_slot(f);
    make.forget();
    // 取出刚才存入注册表的句柄并返回
    let idx = v.as_f64().unwrap_or(0.0) as usize;
    SIGNAL_HANDLE_REGISTRY.with(|r| r.borrow()[idx].clone())
}

#[wasm_bindgen(typescript_custom_section)]
const TS_SIGNAL_HOOK_DECL: &'static str = r#"
/**
 * 创建带选项的信号
 * options.equals: Function(prev, next) -> bool，返回 true 表示值相等（不触发）
 * 示例（JavaScript）：
 * ```javascript
 * const count = signal(0);
 * createEffect(() => {
 *   console.log('count =', count.get());
 * });
 * count.set(1); // 触发 effect
 *
 * const eq = (prev, next) => prev === next;
 * const s = signal(0, { equals: eq });
 * s.set(0); // 不触发，因为 equals 返回 true（相等）
 * s.set(2); // 触发订阅者
 * ```
 */
export function signal<T = any>(
  initial: T,
  options?: { equals?: Equals<T> },
  forceGlobal?: boolean,
): SignalHandle<T>;
"#;
