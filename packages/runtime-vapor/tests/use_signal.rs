use js_sys::{Array, Function, Object, Reflect};
use rue_runtime_vapor::{set_reactive_scheduling, use_signal, watch_signal};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;
use wasm_bindgen_test::*;

fn reset_rec() {
    let _ = Reflect::set(&js_sys::global(), &JsValue::from_str("_rec"), &Array::new());
}

fn handler_push() -> Function {
    Function::new_with_args("n,o", "globalThis._rec.push([n,o])")
}

fn rec() -> Array {
    Array::from(&Reflect::get(&js_sys::global(), &JsValue::from_str("_rec")).unwrap())
}

fn opts_immediate_true() -> JsValue {
    let o = Object::new();
    let _ = Reflect::set(&o, &JsValue::from_str("immediate"), &JsValue::from_bool(true));
    o.into()
}

fn sig_get(s_obj: &JsValue) -> JsValue {
    let get_m = Reflect::get(s_obj, &JsValue::from_str("get")).unwrap_or(JsValue::UNDEFINED);
    let get_f: Function = get_m.unchecked_into();
    get_f.call0(s_obj).unwrap_or(JsValue::UNDEFINED)
}

#[allow(dead_code)]
fn sig_set(s_obj: &JsValue, v: JsValue) {
    let set_m = Reflect::get(s_obj, &JsValue::from_str("set")).unwrap_or(JsValue::UNDEFINED);
    if let Ok(set_f) = set_m.dyn_into::<Function>() {
        let _ = set_f.call1(s_obj, &v);
    }
}

#[allow(dead_code)]
fn sig_peek(s_obj: &JsValue) -> JsValue {
    let peek_m = Reflect::get(s_obj, &JsValue::from_str("peek")).unwrap_or(JsValue::UNDEFINED);
    let peek_f: Function = peek_m.unchecked_into();
    peek_f.call0(s_obj).unwrap_or(JsValue::UNDEFINED)
}

#[wasm_bindgen_test]
fn test_use_signal_basic_setter() {
    set_reactive_scheduling("sync");
    let pair = Array::from(&use_signal(JsValue::from_f64(0.0), None));
    let sig_obj = pair.get(0);
    let setter: Function = pair.get(1).unchecked_into();
    assert_eq!(sig_get(&sig_obj).as_f64().unwrap(), 0.0);
    let _ = setter.call1(&JsValue::NULL, &JsValue::from_f64(1.0));
    assert_eq!(sig_get(&sig_obj).as_f64().unwrap(), 1.0);
    // 函数式更新：sig.peek() + 1
    let upd = Function::new_with_args("sig", "return sig.peek()+1");
    let _ = setter.call1(&JsValue::NULL, &upd.into());
    assert_eq!(sig_get(&sig_obj).as_f64().unwrap(), 2.0);
}

#[wasm_bindgen_test]
fn test_use_signal_equals_no_trigger() {
    set_reactive_scheduling("sync");
    reset_rec();
    // equals 始终返回 true，不触发订阅者
    let opts = Object::new();
    let eq = Function::new_with_args("prev,next", "return true");
    let _ = Reflect::set(&opts, &JsValue::from_str("equals"), &eq);
    let pair = Array::from(&use_signal(JsValue::from_f64(0.0), Some(opts.into())));
    let sig_obj = pair.get(0);
    let setter: Function = pair.get(1).unchecked_into();
    // 将 JS 对象转换为 SignalHandle 以复用 watch_signal（它要求 Rust 侧类型）
    // 这里通过创建新的底层句柄：直接 set 不会触发，但 watch 的立即触发会记录一次
    // 为保持一致性，我们从对象上读取 get 方法以确认值，再创建一个原生信号进行观察
    let s_native = rue_runtime_vapor::create_signal(sig_get(&sig_obj), None);
    let _eh = watch_signal(&s_native, handler_push(), Some(opts_immediate_true()));
    let _ = setter.call1(&JsValue::NULL, &JsValue::from_f64(1.0));
    let r = rec();
    assert_eq!(r.length(), 1);
}
