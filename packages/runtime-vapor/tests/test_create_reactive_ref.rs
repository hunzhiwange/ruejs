use js_sys::{Function, Object, Reflect};
use rue_runtime_vapor::reactive::signal::{create_reactive, create_ref};
use rue_runtime_vapor::{create_effect, set_reactive_scheduling};
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
fn create_reactive_updates_on_nested_set() {
    set_reactive_scheduling("sync");
    let root = Object::new();
    let user = Object::new();
    let _ = Reflect::set(&user, &JsValue::from_str("name"), &JsValue::from_str("A"));
    let _ = Reflect::set(&root, &JsValue::from_str("user"), &user);
    let proxy = create_reactive(root.into(), None);

    let hits = std::rc::Rc::new(std::cell::RefCell::new(0));
    let hits2 = hits.clone();
    let p1 = proxy.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let u = Reflect::get(&p1, &JsValue::from_str("user")).unwrap();
        let n = Reflect::get(&u, &JsValue::from_str("name")).unwrap();
        let _ = n.as_string().unwrap();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);

    let u2 = Reflect::get(&proxy, &JsValue::from_str("user")).unwrap();
    let _ = Reflect::set(&u2, &JsValue::from_str("name"), &JsValue::from_str("B"));
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}

#[wasm_bindgen_test]
fn create_reactive_array_index_triggers_effect() {
    set_reactive_scheduling("sync");
    let root = Object::new();
    let arr = js_sys::Array::new();
    arr.push(&JsValue::from_str("x"));
    arr.push(&JsValue::from_str("y"));
    let _ = Reflect::set(&root, &JsValue::from_str("items"), &arr.into());
    let proxy = create_reactive(root.into(), None);

    let hits = std::rc::Rc::new(std::cell::RefCell::new(0));
    let hits2 = hits.clone();
    let p1 = proxy.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let items = Reflect::get(&p1, &JsValue::from_str("items")).unwrap();
        let first = Reflect::get(&items, &JsValue::from_f64(0.0)).unwrap();
        let _ = first.as_string().unwrap();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);

    let items2 = Reflect::get(&proxy, &JsValue::from_str("items")).unwrap();
    let _ = Reflect::set(&items2, &JsValue::from_f64(0.0), &JsValue::from_str("z"));
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}

#[wasm_bindgen_test]
fn create_ref_getter_setter_work() {
    set_reactive_scheduling("sync");
    let r = create_ref(JsValue::from_f64(1.0), None);
    let get = Reflect::get(&r, &JsValue::from_str("value")).unwrap();
    let v1 = get.as_f64().unwrap();
    assert_eq!(v1, 1.0);

    let _ = Reflect::set(&r, &JsValue::from_str("value"), &JsValue::from_f64(2.0));
    let get2 = Reflect::get(&r, &JsValue::from_str("value")).unwrap();
    let v2 = get2.as_f64().unwrap();
    assert_eq!(v2, 2.0);
}

#[wasm_bindgen_test]
fn create_ref_supports_array_and_object_values() {
    set_reactive_scheduling("sync");
    // Array value
    let arr = js_sys::Array::new();
    arr.push(&JsValue::from_f64(1.0));
    arr.push(&JsValue::from_f64(2.0));
    let r_arr = create_ref(arr.clone().into(), None);
    let v_arr = Reflect::get(&r_arr, &JsValue::from_str("value")).unwrap();
    let len = js_sys::Array::from(&v_arr).length();
    assert_eq!(len, 2);
    let _ = Reflect::set(&r_arr, &JsValue::from_str("value"), &JsValue::from(js_sys::Array::new()));
    let v_arr2 = Reflect::get(&r_arr, &JsValue::from_str("value")).unwrap();
    let len2 = js_sys::Array::from(&v_arr2).length();
    assert_eq!(len2, 0);

    // Object value
    let obj = Object::new();
    let _ = Reflect::set(&obj, &JsValue::from_str("a"), &JsValue::from_f64(1.0));
    let r_obj = create_ref(obj.clone().into(), None);
    let v_obj = Reflect::get(&r_obj, &JsValue::from_str("value")).unwrap();
    let a1 = Reflect::get(&v_obj, &JsValue::from_str("a")).unwrap().as_f64().unwrap();
    assert_eq!(a1, 1.0);
    let obj2 = Object::new();
    let _ = Reflect::set(&obj2, &JsValue::from_str("b"), &JsValue::from_f64(2.0));
    let _ = Reflect::set(&r_obj, &JsValue::from_str("value"), &obj2.into());
    let v_obj2 = Reflect::get(&r_obj, &JsValue::from_str("value")).unwrap();
    let b2 = Reflect::get(&v_obj2, &JsValue::from_str("b")).unwrap().as_f64().unwrap();
    assert_eq!(b2, 2.0);
}

#[wasm_bindgen_test]
fn create_ref_nested_set_triggers_effect() {
    set_reactive_scheduling("sync");
    let root = Object::new();
    let user = Object::new();
    let _ = Reflect::set(&user, &JsValue::from_str("name"), &JsValue::from_str("A"));
    let _ = Reflect::set(&root, &JsValue::from_str("user"), &user);
    let r = create_ref(root.into(), None);

    let hits = std::rc::Rc::new(std::cell::RefCell::new(0));
    let hits2 = hits.clone();
    let r1 = r.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let v = Reflect::get(&r1, &JsValue::from_str("value")).unwrap();
        let u = Reflect::get(&v, &JsValue::from_str("user")).unwrap();
        let n = Reflect::get(&u, &JsValue::from_str("name")).unwrap();
        let _ = n.as_string().unwrap();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);

    let v2 = Reflect::get(&r, &JsValue::from_str("value")).unwrap();
    let u2 = Reflect::get(&v2, &JsValue::from_str("user")).unwrap();
    let _ = Reflect::set(&u2, &JsValue::from_str("name"), &JsValue::from_str("B"));
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}

#[wasm_bindgen_test]
fn create_ref_array_index_triggers_effect() {
    set_reactive_scheduling("sync");
    let root = Object::new();
    let arr = js_sys::Array::new();
    arr.push(&JsValue::from_str("x"));
    arr.push(&JsValue::from_str("y"));
    let _ = Reflect::set(&root, &JsValue::from_str("items"), &arr.into());
    let r = create_ref(root.into(), None);

    let hits = std::rc::Rc::new(std::cell::RefCell::new(0));
    let hits2 = hits.clone();
    let r1 = r.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let v = Reflect::get(&r1, &JsValue::from_str("value")).unwrap();
        let items = Reflect::get(&v, &JsValue::from_str("items")).unwrap();
        let first = Reflect::get(&items, &JsValue::from_f64(0.0)).unwrap();
        let _ = first.as_string().unwrap();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);

    let v2 = Reflect::get(&r, &JsValue::from_str("value")).unwrap();
    let items2 = Reflect::get(&v2, &JsValue::from_str("items")).unwrap();
    let _ = Reflect::set(&items2, &JsValue::from_f64(0.0), &JsValue::from_str("z"));
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}
