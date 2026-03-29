use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

use rue_runtime_vapor::{set_current_instance, use_callback, use_memo, use_ref, use_setup};

wasm_bindgen_test_configure!(run_in_browser);
#[wasm_bindgen_test]
fn use_memo_caches_until_deps_change() {
    let inst = Object::new();
    set_current_instance(inst.clone().into());

    let hits = std::rc::Rc::new(std::cell::RefCell::new(0));
    let hits2 = hits.clone();
    let factory = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        JsValue::from_str("memo")
    }) as Box<dyn FnMut() -> JsValue>);
    let f: Function = factory.as_ref().clone().unchecked_into();

    let d1 = Array::new();
    d1.push(&JsValue::from_f64(1.0));
    let _v1 = use_memo(f.clone(), d1.clone().into());
    assert_eq!(*hits.borrow(), 1);

    let d2 = Array::new();
    d2.push(&JsValue::from_f64(1.0));
    let hooks = Reflect::get(&inst, &JsValue::from_str("__hooks")).unwrap_or(JsValue::UNDEFINED);
    if hooks.is_object() {
        let _ = Reflect::set(
            &hooks.clone().unchecked_into::<Object>(),
            &JsValue::from_str("index"),
            &JsValue::from_f64(0.0),
        );
    }
    let _v2 = use_memo(f.clone(), d2.clone().into());
    assert_eq!(*hits.borrow(), 1);

    let d3 = Array::new();
    d3.push(&JsValue::from_f64(2.0));
    if hooks.is_object() {
        let _ = Reflect::set(
            &hooks.clone().unchecked_into::<Object>(),
            &JsValue::from_str("index"),
            &JsValue::from_f64(0.0),
        );
    }
    let _v3 = use_memo(f.clone(), d3.clone().into());
    assert_eq!(*hits.borrow(), 2);

    // 非数组依赖每次都重新计算
    if hooks.is_object() {
        let _ = Reflect::set(
            &hooks.clone().unchecked_into::<Object>(),
            &JsValue::from_str("index"),
            &JsValue::from_f64(0.0),
        );
    }
    let _v4 = use_memo(f.clone(), JsValue::from_str("x"));
    assert_eq!(*hits.borrow(), 3);
    let _ = Reflect::set(
        &hooks.unchecked_into::<Object>(),
        &JsValue::from_str("__forcedIndex"),
        &JsValue::from_f64(0.0),
    );
    let _v5 = use_memo(f.clone(), JsValue::from_str("x"));
    assert_eq!(*hits.borrow(), 4);

    factory.forget();
}

#[wasm_bindgen_test]
fn use_callback_keeps_identity_until_deps_change() {
    let inst = Object::new();
    set_current_instance(inst.clone().into());

    let cb = wasm_bindgen::closure::Closure::wrap(
        Box::new(move |_x: JsValue| JsValue::UNDEFINED) as Box<dyn FnMut(JsValue) -> JsValue>
    );
    let cbf: Function = cb.as_ref().clone().unchecked_into();

    let d1 = Array::new();
    d1.push(&JsValue::from_f64(1.0));
    let f1 = use_callback(cbf.clone(), d1.clone().into());

    let d2 = Array::new();
    d2.push(&JsValue::from_f64(1.0));
    let hooks = Reflect::get(&inst, &JsValue::from_str("__hooks")).unwrap_or(JsValue::UNDEFINED);
    if hooks.is_object() {
        let _ = Reflect::set(
            &hooks.clone().unchecked_into::<Object>(),
            &JsValue::from_str("index"),
            &JsValue::from_f64(0.0),
        );
    }
    let f2 = use_callback(cbf.clone(), d2.clone().into());
    let obj_is = js_sys::Function::new_no_args("return Object.is");
    let eq12 = obj_is
        .call2(&JsValue::UNDEFINED, &JsValue::from(f1.clone()), &JsValue::from(f2.clone()))
        .unwrap_or(JsValue::FALSE)
        .as_bool()
        .unwrap_or(false);
    assert!(eq12);

    let d3 = Array::new();
    d3.push(&JsValue::from_f64(2.0));
    if hooks.is_object() {
        let _ = Reflect::set(
            &hooks.clone().unchecked_into::<Object>(),
            &JsValue::from_str("index"),
            &JsValue::from_f64(0.0),
        );
    }
    let f3 = use_callback(cbf.clone(), d3.clone().into());
    let eq13 = obj_is
        .call2(&JsValue::UNDEFINED, &JsValue::from(f1.clone()), &JsValue::from(f3.clone()))
        .unwrap_or(JsValue::FALSE)
        .as_bool()
        .unwrap_or(false);
    assert!(!eq13);

    cb.forget();
}

#[wasm_bindgen_test]
fn use_setup_runs_once() {
    let inst = Object::new();
    set_current_instance(inst.clone().into());

    let hits = std::rc::Rc::new(std::cell::RefCell::new(0));
    let hits2 = hits.clone();
    let factory = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        JsValue::from_str("setup")
    }) as Box<dyn FnMut() -> JsValue>);
    let f: Function = factory.as_ref().clone().unchecked_into();

    let _v1 = use_setup(f.clone());
    let hooks = Reflect::get(&inst, &JsValue::from_str("__hooks")).unwrap_or(JsValue::UNDEFINED);
    if hooks.is_object() {
        let _ = Reflect::set(
            &hooks.clone().unchecked_into::<Object>(),
            &JsValue::from_str("index"),
            &JsValue::from_f64(0.0),
        );
    }
    let _v2 = use_setup(f.clone());
    if hooks.is_object() {
        let _ = Reflect::set(
            &hooks.clone().unchecked_into::<Object>(),
            &JsValue::from_str("index"),
            &JsValue::from_f64(0.0),
        );
    }
    let _v3 = use_setup(f.clone());
    assert_eq!(*hits.borrow(), 1);
    factory.forget();
}

#[wasm_bindgen_test]
fn use_ref_persists_container() {
    let inst = Object::new();
    set_current_instance(inst.clone().into());

    let r1 = use_ref(JsValue::from_str("a"));
    let cur1 = Reflect::get(&r1, &JsValue::from_str("current")).unwrap_or(JsValue::UNDEFINED);
    assert_eq!(cur1.as_string().unwrap_or_default(), "a");

    let hooks = Reflect::get(&inst, &JsValue::from_str("__hooks")).unwrap_or(JsValue::UNDEFINED);
    if hooks.is_object() {
        let _ = Reflect::set(
            &hooks.clone().unchecked_into::<Object>(),
            &JsValue::from_str("index"),
            &JsValue::from_f64(0.0),
        );
    }
    let r2 = use_ref(JsValue::from_str("b"));
    let obj_is = js_sys::Function::new_no_args("return Object.is");
    let eq = obj_is
        .call2(&JsValue::UNDEFINED, &JsValue::from(r1.clone()), &JsValue::from(r2.clone()))
        .unwrap_or(JsValue::FALSE)
        .as_bool()
        .unwrap_or(false);
    assert!(eq);
    let cur2 = Reflect::get(&r2, &JsValue::from_str("current")).unwrap_or(JsValue::UNDEFINED);
    // 第二次调用不会覆盖初始值
    assert_eq!(cur2.as_string().unwrap_or_default(), "a");
}
