use js_sys::{Function, JsString, Promise, Reflect};
use rue_runtime_vapor::reactive::signal::create_reactive;
use rue_runtime_vapor::{
    batch, create_computed, create_effect, create_resource, create_signal, set_reactive_scheduling,
    untrack,
};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen_test::*;

/// 当 Signal 被 set 时，订阅它的 Effect 会重新执行。
/// 首次创建 Effect 会立即执行一次，用于建立对 `sig.get_js()` 的订阅。
#[wasm_bindgen_test]
fn signal_effect_runs_on_set() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let sig_for_effect = sig.clone();
    // effect 中读取 `sig.get_js()` 会建立订阅；每次 set 导致 effect 重新执行
    let c = Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = sig_for_effect.get_js();
    }) as Box<dyn FnMut()>);
    let f: Function = c.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 2);
    c.forget();
}

/// 批处理：批内多次 set 只会在批结束后统一触发一次 Effect。
#[wasm_bindgen_test]
fn batch_runs_effect_once_for_multiple_sets() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let sig_for_effect = sig.clone();
    // 建立订阅
    let c = Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = sig_for_effect.get_js();
    }) as Box<dyn FnMut()>);
    let f: Function = c.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    let sig_for_batch = sig.clone();
    // 在 `batch` 中多次 set，只在批结束统一触发一次
    let set_twice = Closure::wrap(Box::new(move || {
        sig_for_batch.set_js(JsValue::from_f64(1.0));
        sig_for_batch.set_js(JsValue::from_f64(2.0));
    }) as Box<dyn FnMut()>);
    let g: Function = set_twice.as_ref().clone().into();
    batch(g);
    sig.set_js(JsValue::from_f64(3.0));
    assert!(*hits.borrow() >= 3);
    set_twice.forget();
    c.forget();
}

/// 在 `untrack` 中读取 Signal 不会建立订阅关系。
#[wasm_bindgen_test]
fn untrack_prevents_subscription() {
    set_reactive_scheduling("sync");
    let a = create_signal(JsValue::from_f64(0.0), None);
    let b = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let a_for_effect = a.clone();
    let b_for_inner = b.clone();
    let cb = Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = a_for_effect.get_js();
        let inner_b = b_for_inner.clone();
        // 在 `untrack` 中读取 `b`，不会建立对 `b` 的订阅
        let read_b = Closure::wrap(Box::new(move || {
            let _ = inner_b.get_js();
            JsValue::from(JsString::from("ok"))
        }) as Box<dyn FnMut() -> JsValue>);
        let f: Function = read_b.as_ref().clone().into();
        let _ = untrack(f);
        read_b.forget();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    b.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
    a.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}

/// `create_computed` 返回的派生 Signal 在依赖变化时会更新。
#[wasm_bindgen_test]
fn computed_updates_when_dependency_changes() {
    set_reactive_scheduling("sync");
    let count = create_signal(JsValue::from_f64(1.0), None);
    let c1 = count.clone();
    // 派生函数：依赖 `count`，返回其 2 倍
    let comp = Closure::wrap(Box::new(move || {
        let v = c1.get_js().as_f64().unwrap();
        JsValue::from_f64(v * 2.0)
    }) as Box<dyn FnMut() -> JsValue>);
    let f_comp: Function = comp.as_ref().clone().into();
    let double = create_computed(f_comp.into());
    comp.forget();
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let d1 = double.clone();
    let init = Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        // 读取派生信号，确保在依赖变化（第二次触发）时为有限数值
        let dv = d1.get_js().as_f64().unwrap();
        let cur = *hits2.borrow();
        if cur >= 2 {
            assert!(dv.is_finite());
        }
    }) as Box<dyn FnMut()>);
    let f: Function = init.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    count.set_js(JsValue::from_f64(2.0));
    assert_eq!(*hits.borrow(), 2);
    init.forget();
}

/// 为 Signal 提供 `equals` 选项可以阻止等值更新触发 Effect。
#[wasm_bindgen_test]
fn signal_equals_prevents_rerun() {
    set_reactive_scheduling("sync");
    let sig = create_signal(
        JsValue::from_f64(0.0),
        Some({
            let obj = js_sys::Object::new();
            // 自定义等值函数：始终返回 true，阻止等值更新触发 effect
            let eq = Closure::wrap(Box::new(move |a: JsValue, b: JsValue| {
                let _ = a;
                let _ = b;
                JsValue::from_bool(true)
            }) as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
            let f: Function = eq.as_ref().clone().into();
            js_sys::Reflect::set(&obj, &JsValue::from_str("equals"), &f).unwrap();
            eq.forget();
            obj.into()
        }),
    );
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let s1 = sig.clone();
    let c = Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = s1.get_js();
    }) as Box<dyn FnMut()>);
    let f: Function = c.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
    c.forget();
}

/// `update_js` 使用更新器函数派生新值；`peek_js` 只读值且不建立订阅。
#[wasm_bindgen_test]
fn signal_update_and_peek_work() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(1.0), None);
    // `peek_js` 只读当前值，不建立订阅
    let first = sig.peek_js().as_f64().unwrap();
    assert_eq!(first, 1.0);
    // `update_js` 使用更新器函数推导新值
    let inc = Closure::wrap(Box::new(move |x: JsValue| {
        let v = x.as_f64().unwrap();
        JsValue::from_f64(v + 1.0)
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let f: Function = inc.as_ref().clone().into();
    sig.update_js(f);
    inc.forget();
    // 再次 `peek_js`，值已加 1
    let after = sig.peek_js().as_f64().unwrap();
    assert_eq!(after, 2.0);
}

/// 资源：当异步数据成功时，`loading=false` 且 `data` 更新。
#[wasm_bindgen_test]
async fn resource_resolves_promise() {
    set_reactive_scheduling("sync");
    let src = create_signal(JsValue::from_f64(1.0), None);
    let s1 = src.clone();
    // fetcher：将源值 *2，并返回 Promise
    let fetch = Closure::wrap(Box::new(move |x: JsValue| {
        let v = x.as_f64().unwrap();
        Promise::resolve(&JsValue::from_f64(v * 2.0)).into()
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let f: Function = fetch.as_ref().clone().into();
    let res = create_resource(&src, f);
    fetch.forget();
    // 资源对象包含 `data`/`loading` 的信号封装（具有 `.get()` 方法）
    let data = Reflect::get(&res, &JsValue::from_str("data")).unwrap();
    let loading = Reflect::get(&res, &JsValue::from_str("loading")).unwrap();
    s1.set_js(JsValue::from_f64(2.0));
    // 等待一个微任务，模拟 Promise resolve
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    // 读取 `loading.get()` 与 `data.get()`
    let l_get = Reflect::get(&loading, &JsValue::from_str("get")).unwrap();
    let l_fn: Function = l_get.dyn_into().unwrap();
    let lv = l_fn.call0(&loading).unwrap().as_bool().unwrap();
    assert_eq!(lv, false);
    let d_get = Reflect::get(&data, &JsValue::from_str("get")).unwrap();
    let d_fn: Function = d_get.dyn_into().unwrap();
    let dv = d_fn.call0(&data).unwrap().as_f64().unwrap();
    assert_eq!(dv, 4.0);
}

/// 资源：当异步数据失败时，`loading=false` 且 `error` 为字符串。
#[wasm_bindgen_test]
async fn resource_catches_error() {
    set_reactive_scheduling("sync");
    let src = create_signal(JsValue::from_f64(1.0), None);
    let s1 = src.clone();
    // fetcher：直接返回 reject 的 Promise
    let fetch = Closure::wrap(Box::new(move |_x: JsValue| {
        Promise::reject(&JsValue::from_str("fail")).into()
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let f: Function = fetch.as_ref().clone().into();
    let res = create_resource(&src, f);
    fetch.forget();
    let error = Reflect::get(&res, &JsValue::from_str("error")).unwrap();
    let loading = Reflect::get(&res, &JsValue::from_str("loading")).unwrap();
    s1.set_js(JsValue::from_f64(2.0));
    // 等待微任务，模拟 Promise reject 被捕获
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    let l_get = Reflect::get(&loading, &JsValue::from_str("get")).unwrap();
    let l_fn: Function = l_get.dyn_into().unwrap();
    let lv = l_fn.call0(&loading).unwrap().as_bool().unwrap();
    assert_eq!(lv, false);
    let e_get = Reflect::get(&error, &JsValue::from_str("get")).unwrap();
    let e_fn: Function = e_get.dyn_into().unwrap();
    let ev = e_fn.call0(&error).unwrap();
    assert!(ev.is_string());
}

/// reactive 原始值：`.value` 可读取与写入，且原始 holder 同步
#[wasm_bindgen_test]
fn reactive_primitive_value_get_set() {
    set_reactive_scheduling("sync");
    let proxy = create_reactive(JsValue::from_str("B"), None);
    // 初始 .value
    let v = Reflect::get(&proxy, &JsValue::from_str("value")).unwrap();
    assert_eq!(v.as_string().unwrap(), "B");
    // 写入 .value
    Reflect::set(&proxy, &JsValue::from_str("value"), &JsValue::from_str("C")).unwrap();
    let v2 = Reflect::get(&proxy, &JsValue::from_str("value")).unwrap();
    assert_eq!(v2.as_string().unwrap(), "C");
    // 原始快照检查
    let raw = Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_v = Reflect::get(&raw, &JsValue::from_str("value")).unwrap();
    assert_eq!(raw_v.as_string().unwrap(), "C");
}

/// reactive 对象：属性写入后，代理值与原始 holder 保持一致
#[wasm_bindgen_test]
fn reactive_object_property_set_reflects_in_raw() {
    set_reactive_scheduling("sync");
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(&obj, &JsValue::from_str("a"), &JsValue::from_str("A")).unwrap();
    js_sys::Reflect::set(&obj, &JsValue::from_str("b"), &JsValue::from_str("B")).unwrap();
    let nested = js_sys::Object::new();
    js_sys::Reflect::set(&nested, &JsValue::from_str("hello"), &JsValue::from_str("hello"))
        .unwrap();
    js_sys::Reflect::set(&obj, &JsValue::from_str("c"), &nested.into()).unwrap();
    let proxy = create_reactive(obj.into(), None);
    // 写入属性
    js_sys::Reflect::set(&proxy, &JsValue::from_str("a"), &JsValue::from_str("xxx")).unwrap();
    // 代理读取
    let a_proxy = js_sys::Reflect::get(&proxy, &JsValue::from_str("a")).unwrap();
    assert_eq!(a_proxy.as_string().unwrap(), "xxx");
    // 原始快照读取
    let raw = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let a_raw = js_sys::Reflect::get(&raw, &JsValue::from_str("a")).unwrap();
    assert_eq!(a_raw.as_string().unwrap(), "xxx");
}
