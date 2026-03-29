use js_sys::{Array, Function, Object, Reflect};
use rue_runtime_vapor::{get_current_instance, set_current_instance, with_hook_slot};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

// 文件说明：
// 验证“当前实例”与“Hook 插槽”相关的上下文管理：
// - `with_hook_slot` 为当前实例分配/访问 Hook 的状态位
// - 支持强制插槽索引（`__forcedIndex`）并在调用后自动复位
// - `get_current_instance` 在无显式实例时返回“根实例结构”

#[wasm_bindgen_test]
fn with_hook_slot_allocates_and_forced_index_resets() {
    // 准备一个伪实例并设置为当前实例
    let inst = Object::new();
    set_current_instance(inst.clone().into());

    let a = wasm_bindgen::closure::Closure::wrap(
        Box::new(move || JsValue::from_str("A")) as Box<dyn FnMut() -> JsValue>
    );
    let af: Function = a.as_ref().clone().into();
    let s0 = with_hook_slot(af);
    a.forget();

    let b = wasm_bindgen::closure::Closure::wrap(
        Box::new(move || JsValue::from_str("B")) as Box<dyn FnMut() -> JsValue>
    );
    let bf: Function = b.as_ref().clone().into();
    let s1 = with_hook_slot(bf);
    b.forget();

    let cur = get_current_instance();
    let hooks = Reflect::get(&cur, &JsValue::from_str("__hooks")).unwrap();
    let states = Reflect::get(&hooks, &JsValue::from_str("states")).unwrap();
    let arr: Array = states.unchecked_into();
    assert_eq!(arr.get(0).as_string().unwrap(), s0.as_string().unwrap());
    assert_eq!(arr.get(1).as_string().unwrap(), s1.as_string().unwrap());

    // 强制使用插槽 0，并验证调用后会自动复位
    Reflect::set(&hooks, &JsValue::from_str("__forcedIndex"), &JsValue::from_f64(0.0)).unwrap();
    let c = wasm_bindgen::closure::Closure::wrap(
        Box::new(move || JsValue::from_str("C")) as Box<dyn FnMut() -> JsValue>
    );
    let cf: Function = c.as_ref().clone().into();
    let s_forced = with_hook_slot(cf);
    c.forget();

    let states2: Array =
        Reflect::get(&hooks, &JsValue::from_str("states")).unwrap().unchecked_into();
    assert_eq!(states2.get(0).as_string().unwrap(), s_forced.as_string().unwrap());
    let forced = Reflect::get(&hooks, &JsValue::from_str("__forcedIndex")).unwrap();
    assert!(forced.is_undefined());
}

#[wasm_bindgen_test]
fn get_current_instance_returns_undefined_when_cleared() {
    set_current_instance(JsValue::UNDEFINED);
    let cur = get_current_instance();
    assert!(cur.is_undefined() || cur.is_null());
}
