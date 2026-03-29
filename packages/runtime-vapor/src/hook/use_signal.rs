use js_sys::{Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

use super::use_state::use_state;

/// useSignal：等价于 `useState(initial, { kind: 'signal', ...options })`
///
/// 用途：
/// - 以“底层信号句柄”的形式管理状态，适合需要精细控制 `get/set/update/setPath/peek` 的场景
/// - 支持 `equals(prev, next)` 自定义等值比较，返回 `true` 表示不触发订阅者
///
/// 示例：
/// const [sig, setSig] = useSignal({ a: 1 })
/// console.log(sig.get())       // { a: 1 }
/// setSig({ a: 2 })             // 触发订阅者
/// setSig(h => ({ a: h.peek().a + 1 })) // { a: 3 }
/// sig.setPath('a', 4)
/// console.log(sig.get())       // { a: 4 }
#[wasm_bindgen(js_name = useSignal)]
pub fn use_signal(initial: JsValue, options: Option<JsValue>) -> JsValue {
    // 将传入的 options 扩展为 { kind: 'signal', ...options }
    // - 若未传 options：创建一个空对象并写入 kind
    // - 若传入的是对象：直接在该对象上写入 kind
    let opts_out = if let Some(opts) = options {
        if opts.is_object() {
            let o: Object = opts.clone().unchecked_into();
            Reflect::set(&o, &JsValue::from_str("kind"), &JsValue::from_str("signal")).ok();
            Some(opts)
        } else {
            let o = Object::new();
            Reflect::set(&o, &JsValue::from_str("kind"), &JsValue::from_str("signal")).ok();
            Some(o.into())
        }
    } else {
        let o = Object::new();
        Reflect::set(&o, &JsValue::from_str("kind"), &JsValue::from_str("signal")).ok();
        Some(o.into())
    };
    // 复用 useState 的创建与返回逻辑，得到 [SignalHandle, setter]
    use_state(initial, opts_out)
}

#[wasm_bindgen(typescript_custom_section)]
const TS_USE_SIGNAL_DECL: &'static str = r#"
/**
 * useSignal：等价于 `useState(initial, { kind: 'signal', ...options })`
 *
 * 用途：
 * - 以“底层信号句柄”的形式管理状态，适合需要精细控制 `get/set/update/setPath/peek` 的场景
 * - 支持 `equals(prev, next)` 自定义等值比较，返回 `true` 表示不触发订阅者
 *
 * 示例：
 * const [sig, setSig] = useSignal({ a: 1 })
 * console.log(sig.get())       // { a: 1 }
 * setSig({ a: 2 })             // 触发订阅者
 * setSig(h => ({ a: h.peek().a + 1 })) // { a: 3 }
 * sig.setPath('a', 4)
 * console.log(sig.get())       // { a: 4 }
 */
export function useSignal<T extends Primitive>(
  initial: T | (() => T),
  options?: UseStateOptions<T>,
): [SignalHandle<Widen<T>>, (v: Widen<T> | ((sig: SignalHandle<Widen<T>>) => Widen<T> | void)) => void]
export function useSignal<T extends object | Function>(
  initial: T | (() => T),
  options?: UseStateOptions<T>,
): [SignalHandle<T>, (v: T | ((sig: SignalHandle<T>) => T | void)) => void]
"#;
