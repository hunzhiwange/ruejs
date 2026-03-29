// 用例说明：
// - 验证 `useState` 的核心行为与与 `watch` 的配合：
//   1) 基本读写：读取初值、调用 setter 更新、再次读取为新值
//   2) updater 回调返回对象：形如 `{ value: next }`，写入到内部 Ref
//   3) updater 回调返回原始值：直接写入到内部 Ref 的 `value`
//   4) 配合 `watch_fn` 与 `equals`：相等更新不触发，非相等更新触发一次
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

use rue_runtime_vapor::{set_current_instance, set_reactive_scheduling, use_state, watch_fn};

wasm_bindgen_test_configure!(run_in_browser);

fn force_slot_zero() {
    let inst = rue_runtime_vapor::get_current_instance();
    if inst.is_object() {
        let hooks =
            Reflect::get(&inst, &JsValue::from_str("__hooks")).unwrap_or(JsValue::UNDEFINED);
        if hooks.is_object() {
            let _ = Reflect::set(
                &hooks.unchecked_into::<Object>(),
                &JsValue::from_str("__forcedIndex"),
                &JsValue::from_f64(0.0),
            );
        }
    }
}

#[wasm_bindgen_test]
/// 验证基本读写：初值 0，设置为 1 后再次读取应为 1。
fn use_state_basic_set_and_get() {
    set_reactive_scheduling("sync");
    let inst = Object::new();
    set_current_instance(inst.into());

    force_slot_zero();
    let arr = Array::from(&use_state(JsValue::from_f64(0.0), None));
    let state_obj: Object = arr.get(0).unchecked_into();
    let cur = Reflect::get(&state_obj, &JsValue::from_str("value")).unwrap().as_f64().unwrap();
    assert_eq!(cur, 0.0);
    let setter = arr.get(1).dyn_into::<Function>().unwrap();
    let _ = setter.call1(&JsValue::NULL, &JsValue::from_f64(1.0));

    force_slot_zero();
    let arr2 = Array::from(&use_state(JsValue::from_f64(0.0), None));
    let state_obj2: Object = arr2.get(0).unchecked_into();
    let cur2 = Reflect::get(&state_obj2, &JsValue::from_str("value")).unwrap().as_f64().unwrap();
    assert_eq!(cur2, 1.0);
}

#[wasm_bindgen_test]
/// 验证 updater 回调返回 `{ value }` 对象时的写入语义。
fn use_state_updater_function() {
    set_reactive_scheduling("sync");
    let inst = Object::new();
    set_current_instance(inst.into());

    force_slot_zero();
    let arr = Array::from(&use_state(JsValue::from_f64(1.0), None));
    let setter = arr.get(1).dyn_into::<Function>().unwrap();
    // 针对默认 reactive（原始值包裹为 { value }）：读取 `{ value }`，返回包含 `value` 的对象
    let inc = wasm_bindgen::closure::Closure::wrap(Box::new(move |x: JsValue| {
        let obj: Object = x.unchecked_into();
        let v = Reflect::get(&obj, &JsValue::from_str("value")).unwrap().as_f64().unwrap();
        let out = Object::new();
        Reflect::set(&out, &JsValue::from_str("value"), &JsValue::from_f64(v + 1.0)).ok();
        out.into()
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let f: Function = inc.as_ref().clone().into();
    let _ = setter.call1(&JsValue::NULL, &f.into());
    inc.forget();

    force_slot_zero();
    let arr2 = Array::from(&use_state(JsValue::from_f64(1.0), None));
    let state_obj: Object = arr2.get(0).unchecked_into();
    let cur = Reflect::get(&state_obj, &JsValue::from_str("value")).unwrap().as_f64().unwrap();
    assert_eq!(cur, 2.0);
}

#[wasm_bindgen_test]
/// 验证 updater 回调返回原始值（数字）时直接写入到 `value`。
fn use_state_updater_primitive_return() {
    set_reactive_scheduling("sync");
    let inst = Object::new();
    set_current_instance(inst.into());

    force_slot_zero();
    let arr = Array::from(&use_state(JsValue::from_f64(5.0), None));
    let setter = arr.get(1).dyn_into::<Function>().unwrap();
    // 返回原始值（数字），应直接写入到 { value }
    let inc = wasm_bindgen::closure::Closure::wrap(Box::new(move |x: JsValue| {
        let obj: Object = x.unchecked_into();
        let v = Reflect::get(&obj, &JsValue::from_str("value")).unwrap().as_f64().unwrap();
        JsValue::from_f64(v + 3.0)
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let f: Function = inc.as_ref().clone().into();
    let _ = setter.call1(&JsValue::NULL, &f.into());
    inc.forget();

    force_slot_zero();
    let arr2 = Array::from(&use_state(JsValue::from_f64(5.0), None));
    let state_obj: Object = arr2.get(0).unchecked_into();
    let cur = Reflect::get(&state_obj, &JsValue::from_str("value")).unwrap().as_f64().unwrap();
    assert_eq!(cur, 8.0);
}

#[wasm_bindgen_test]
/// 验证 `equals` 选项：相等更新不触发，非相等更新触发一次。
fn use_state_equals_prevents_rerun_in_watch() {
    set_reactive_scheduling("sync");
    let inst = Object::new();
    set_current_instance(inst.into());

    let records = Array::new();

    let getter_cl = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        force_slot_zero();
        let opts = {
            let opt = Object::new();
            let eq = Function::new_with_args("p,n", "return Object.is(p,n)");
            Reflect::set(&opt, &JsValue::from_str("equals"), &eq).ok();
            opt.into()
        };
        let arr = Array::from(&use_state(JsValue::from_f64(0.0), Some(opts)));
        let obj: Object = arr.get(0).unchecked_into();
        Reflect::get(&obj, &JsValue::from_str("value")).unwrap()
    }) as Box<dyn FnMut() -> JsValue>);
    let getter_fn: Function = getter_cl.as_ref().clone().unchecked_into();

    let recs = records.clone();
    let handler_cl = wasm_bindgen::closure::Closure::wrap(Box::new(move |n: JsValue, o: JsValue| {
        let entry = Array::new();
        entry.push(&n);
        entry.push(&o);
        recs.push(&entry.into());
    })
        as Box<dyn FnMut(JsValue, JsValue)>);
    let handler_fn: Function = handler_cl.as_ref().clone().unchecked_into();

    let opts = {
        let o = Object::new();
        Reflect::set(&o, &JsValue::from_str("immediate"), &JsValue::from_bool(true)).ok();
        o.into()
    };
    let _eh = watch_fn(getter_fn, handler_fn, Some(opts));
    getter_cl.forget();
    handler_cl.forget();

    force_slot_zero();
    let arr = Array::from(&use_state(JsValue::from_f64(0.0), None));
    let setter = arr.get(1).dyn_into::<Function>().unwrap();
    // 设置相等值：不触发
    let _ = setter.call1(&JsValue::NULL, &JsValue::from_f64(0.0));
    // 设置不相等值：触发
    let _ = setter.call1(&JsValue::NULL, &JsValue::from_f64(2.0));

    assert_eq!(records.length(), 2);
    let e0 = Array::from(&records.get(0));
    assert_eq!(e0.get(0).as_f64().unwrap(), 0.0);
    assert!(e0.get(1).is_undefined());
    let e1 = Array::from(&records.get(1));
    assert_eq!(e1.get(0).as_f64().unwrap(), 2.0);
    assert_eq!(e1.get(1).as_f64().unwrap(), 0.0);
}
