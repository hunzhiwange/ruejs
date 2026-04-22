use js_sys::{Array, Function, Object, Reflect};
use rue_runtime_vapor::{create_effect, create_signal, set_reactive_scheduling};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
/// 调试方法：toJSON / valueOf 返回内部值；toString 对可序列化返回 JSON 字符串
fn signal_debug_methods_basic() {
    set_reactive_scheduling("sync");
    let obj = Object::new();
    Reflect::set(&obj, &JsValue::from_str("a"), &JsValue::from_f64(1.0)).unwrap();
    let sig = create_signal(obj.clone().into(), None);
    let j = sig.to_json();
    let a1 = Reflect::get(&j, &JsValue::from_str("a")).unwrap().as_f64().unwrap();
    assert_eq!(a1, 1.0);
    let v = sig.value_of_js();
    let a2 = Reflect::get(&v, &JsValue::from_str("a")).unwrap().as_f64().unwrap();
    assert_eq!(a2, 1.0);
    let s = sig.to_string_js();
    let parsed = js_sys::JSON::parse(&s).unwrap();
    let a3 = Reflect::get(&parsed, &JsValue::from_str("a")).unwrap().as_f64().unwrap();
    assert_eq!(a3, 1.0);
}

#[wasm_bindgen_test]
/// 调试方法：toString 遇到循环对象返回占位文本
fn signal_debug_to_string_cyclic_fallback() {
    set_reactive_scheduling("sync");
    let obj = Object::new();
    // 构造循环引用：obj.self = obj
    Reflect::set(&obj, &JsValue::from_str("self"), &obj.clone().into()).unwrap();
    let sig = create_signal(obj.into(), None);
    let s = sig.to_string_js();
    assert_eq!(s, "[object SignalHandle]");
}

#[wasm_bindgen_test]
/// value getter 不进行依赖收集：在 Effect 中读取后，后续 set 不会再次运行
fn signal_value_getter_does_not_subscribe() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let s_for = sig.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = s_for.value_getter();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
    cb.forget();
}

#[wasm_bindgen_test]
/// value setter 等价于 set：写入后触发订阅者与值更新
fn signal_value_setter_triggers_and_updates() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let s_for = sig.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = s_for.get_js();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    sig.value_setter(JsValue::from_f64(2.0));
    assert_eq!(*hits.borrow(), 2);
    let v = sig.peek_js().as_f64().unwrap();
    assert_eq!(v, 2.0);
    cb.forget();
}

#[wasm_bindgen_test]
/// 基础行为：Signal 更新会触发订阅它的 Effect 重新运行。
fn signal_runs_effect_on_set() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let s_for = sig.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = s_for.get_js();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}

#[wasm_bindgen_test]
/// 当为 Signal 提供 `equals` 并总是返回 true 时，后续 set 不会触发重新运行（认为值未变化）。
fn signal_equals_prevents_rerun() {
    set_reactive_scheduling("sync");
    let sig = create_signal(
        JsValue::from_f64(0.0),
        Some({
            let obj = js_sys::Object::new();
            let eq = wasm_bindgen::closure::Closure::wrap(Box::new(move |a: JsValue, b: JsValue| {
                let _ = a;
                let _ = b;
                JsValue::from_bool(true)
            })
                as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
            let f: Function = eq.as_ref().clone().into();
            js_sys::Reflect::set(&obj, &JsValue::from_str("equals"), &f).unwrap();
            eq.forget();
            obj.into()
        }),
    );
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let s_for = sig.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = s_for.get_js();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
    cb.forget();
}

#[wasm_bindgen_test]
/// 当 equals 总是返回 false 时，即使 set 为“同一个值”也会认为发生了变化并触发订阅者。
fn signal_equals_always_false_triggers() {
    set_reactive_scheduling("sync");
    let sig = create_signal(
        JsValue::from_f64(1.0),
        Some({
            let obj = js_sys::Object::new();
            let eq =
                wasm_bindgen::closure::Closure::wrap(Box::new(move |_a: JsValue, _b: JsValue| {
                    JsValue::from_bool(false)
                })
                    as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
            let f: Function = eq.as_ref().clone().into();
            js_sys::Reflect::set(&obj, &JsValue::from_str("equals"), &f).unwrap();
            eq.forget();
            obj.into()
        }),
    );
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let s_for = sig.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = s_for.get_js();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    // 设置同一个值也会触发，因为 equals 恒为 false（认为不相等）
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}

#[wasm_bindgen_test]
/// `update_js` 使用更新器函数计算新值；`peek_js` 只读当前值且不建立订阅关系。
fn signal_update_and_peek() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(1.0), None);
    let first = sig.peek_js().as_f64().unwrap();
    assert_eq!(first, 1.0);
    let inc = wasm_bindgen::closure::Closure::wrap(Box::new(move |x: JsValue| {
        let v = x.as_f64().unwrap();
        JsValue::from_f64(v + 1.0)
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let f: Function = inc.as_ref().clone().into();
    sig.update_js(f);
    inc.forget();
    let after = sig.peek_js().as_f64().unwrap();
    assert_eq!(after, 2.0);
}

#[wasm_bindgen_test]
/// 在 Effect 中使用 `peek_js` 读取不会建立订阅，因此后续 set 不会再次运行。
fn peek_does_not_subscribe() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let s_for = sig.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = s_for.peek_js();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
    cb.forget();
}

#[wasm_bindgen_test]
/// 路径读写：支持对嵌套对象/数组按路径 `get/set/update`，并正确触发依赖更新。
fn signal_path_get_set_update() {
    set_reactive_scheduling("sync");
    let profile = Object::new();
    Reflect::set(&profile, &JsValue::from_str("name"), &JsValue::from_str("A")).unwrap();
    let user = Object::new();
    Reflect::set(&user, &JsValue::from_str("profile"), &profile).unwrap();
    let items = Array::new();
    items.push(&JsValue::from_str("x"));
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("user"), &user).unwrap();
    Reflect::set(&root, &JsValue::from_str("items"), &items).unwrap();
    let sig = create_signal(root.into(), None);

    let path_name = Array::new();
    path_name.push(&JsValue::from_str("user"));
    path_name.push(&JsValue::from_str("profile"));
    path_name.push(&JsValue::from_str("name"));

    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let s1 = sig.clone();
    let p1 = path_name.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = s1.get_path_js(p1.clone().into());
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);

    sig.set_path_js(path_name.clone().into(), JsValue::from_str("B"));
    assert_eq!(*hits.borrow(), 2);
    let name = sig.get_path_js(path_name.clone().into()).as_string().unwrap();
    assert_eq!(name, "B");

    let path_item0 = Array::new();
    path_item0.push(&JsValue::from_str("items"));
    path_item0.push(&JsValue::from_f64(0.0));
    sig.set_path_js(path_item0.clone().into(), JsValue::from_str("y"));
    let v0 = sig.get_path_js(path_item0.clone().into()).as_string().unwrap();
    assert_eq!(v0, "y");

    let path_age = Array::new();
    path_age.push(&JsValue::from_str("user"));
    path_age.push(&JsValue::from_str("age"));
    sig.set_path_js(path_age.clone().into(), JsValue::from_f64(20.0));
    let inc = wasm_bindgen::closure::Closure::wrap(Box::new(move |x: JsValue| {
        let v = x.as_f64().unwrap_or(0.0);
        JsValue::from_f64(v + 1.0)
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let f2: Function = inc.as_ref().clone().into();
    sig.update_path_js(path_age.clone().into(), f2);
    inc.forget();
    let age = sig.get_path_js(path_age.clone().into()).as_f64().unwrap();
    assert_eq!(age, 21.0);
    cb.forget();
}

#[wasm_bindgen_test]
/// 字符串路径：支持以 `.` 分隔的字符串路径，数字段转为数组索引。
fn signal_string_path_get_set_update() {
    set_reactive_scheduling("sync");
    let profile = Object::new();
    Reflect::set(&profile, &JsValue::from_str("name"), &JsValue::from_str("A")).unwrap();
    let user = Object::new();
    Reflect::set(&user, &JsValue::from_str("profile"), &profile).unwrap();
    Reflect::set(&user, &JsValue::from_str("age"), &JsValue::from_f64(20.0)).unwrap();
    let items = Array::new();
    items.push(&JsValue::from_str("x"));
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("user"), &user).unwrap();
    Reflect::set(&root, &JsValue::from_str("items"), &items).unwrap();
    let sig = create_signal(root.into(), None);

    // getPath / setPath with string
    let name_before = sig.get_path_js(JsValue::from_str("user.profile.name")).as_string().unwrap();
    assert_eq!(name_before, "A");
    sig.set_path_js(JsValue::from_str("user.profile.name"), JsValue::from_str("B"));
    let name_after = sig.get_path_js(JsValue::from_str("user.profile.name")).as_string().unwrap();
    assert_eq!(name_after, "B");

    // array index via string
    sig.set_path_js(JsValue::from_str("items.0"), JsValue::from_str("y"));
    let v0 = sig.get_path_js(JsValue::from_str("items.0")).as_string().unwrap();
    assert_eq!(v0, "y");

    // updatePath via string
    let inc = wasm_bindgen::closure::Closure::wrap(Box::new(move |x: JsValue| {
        let v = x.as_f64().unwrap_or(0.0);
        JsValue::from_f64(v + 1.0)
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let f: Function = inc.as_ref().clone().into();
    sig.update_path_js(JsValue::from_str("user.age"), f);
    inc.forget();
    let age = sig.get_path_js(JsValue::from_str("user.age")).as_f64().unwrap();
    assert_eq!(age, 21.0);
}

#[wasm_bindgen_test]
/// 路径订阅应按分支隔离：更新 left 分支不应触发订阅 right 分支的 effect。
fn signal_path_subscriptions_are_isolated_by_branch() {
    set_reactive_scheduling("sync");

    let left = Object::new();
    Reflect::set(&left, &JsValue::from_str("count"), &JsValue::from_f64(1.0)).unwrap();
    let right = Object::new();
    Reflect::set(&right, &JsValue::from_str("count"), &JsValue::from_f64(2.0)).unwrap();
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("left"), &left).unwrap();
    Reflect::set(&root, &JsValue::from_str("right"), &right).unwrap();
    let sig = create_signal(root.into(), None);

    let left_path = Array::new();
    left_path.push(&JsValue::from_str("left"));
    left_path.push(&JsValue::from_str("count"));
    let right_path = Array::new();
    right_path.push(&JsValue::from_str("right"));
    right_path.push(&JsValue::from_str("count"));

    let left_hits = Rc::new(RefCell::new(0));
    let left_hits2 = left_hits.clone();
    let sig_left = sig.clone();
    let left_path_for_effect = left_path.clone();
    let left_cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *left_hits2.borrow_mut() += 1;
        let _ = sig_left.get_path_js(left_path_for_effect.clone().into());
    }) as Box<dyn FnMut()>);
    let left_fn: Function = left_cb.as_ref().clone().into();
    let _left_effect = create_effect(left_fn, None);

    let right_hits = Rc::new(RefCell::new(0));
    let right_hits2 = right_hits.clone();
    let sig_right = sig.clone();
    let right_path_for_effect = right_path.clone();
    let right_cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *right_hits2.borrow_mut() += 1;
        let _ = sig_right.get_path_js(right_path_for_effect.clone().into());
    }) as Box<dyn FnMut()>);
    let right_fn: Function = right_cb.as_ref().clone().into();
    let _right_effect = create_effect(right_fn, None);

    assert_eq!(*left_hits.borrow(), 1);
    assert_eq!(*right_hits.borrow(), 1);

    sig.set_path_js(left_path.into(), JsValue::from_f64(10.0));

    assert_eq!(*left_hits.borrow(), 2);
    assert_eq!(*right_hits.borrow(), 1);

    left_cb.forget();
    right_cb.forget();
}

#[wasm_bindgen_test]
/// 父路径整体替换时，应通知订阅子路径的 effect。
fn signal_parent_path_replace_notifies_child_subscribers() {
    set_reactive_scheduling("sync");

    let user = Object::new();
    Reflect::set(&user, &JsValue::from_str("name"), &JsValue::from_str("A")).unwrap();
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("user"), &user).unwrap();
    let sig = create_signal(root.into(), None);

    let name_path = Array::new();
    name_path.push(&JsValue::from_str("user"));
    name_path.push(&JsValue::from_str("name"));

    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let sig_for_effect = sig.clone();
    let path_for_effect = name_path.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = sig_for_effect.get_path_js(path_for_effect.clone().into());
    }) as Box<dyn FnMut()>);
    let effect_fn: Function = cb.as_ref().clone().into();
    let _effect = create_effect(effect_fn, None);
    assert_eq!(*hits.borrow(), 1);

    let next_user = Object::new();
    Reflect::set(&next_user, &JsValue::from_str("name"), &JsValue::from_str("B")).unwrap();
    let user_path = Array::new();
    user_path.push(&JsValue::from_str("user"));
    sig.set_path_js(user_path.into(), next_user.into());

    assert_eq!(*hits.borrow(), 2);
    let next_name = sig.get_path_js(name_path.into()).as_string().unwrap();
    assert_eq!(next_name, "B");
    cb.forget();
}
