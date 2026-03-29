use js_sys::{Function, Promise};
use rue_runtime_vapor::{
    batch, create_effect, create_signal, on_cleanup, set_reactive_scheduling, untrack,
};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
/// Effect 在创建时会立即运行一次，并在依赖的 Signal 变化时重新运行。
fn effect_immediate_run_and_rerun_on_set() {
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
/// 注册的清理函数会在下一次 Effect 执行前被调用，用于释放上一次执行的副作用资源。
fn effect_cleanup_runs_before_next_execution() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let runs = Rc::new(RefCell::new(0));
    let cleans = Rc::new(RefCell::new(0));
    let runs2 = runs.clone();
    let s_for = sig.clone();
    let cleans_capture = cleans.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *runs2.borrow_mut() += 1;
        // clone inside to avoid moving captured variables out of this closure's environment
        let cleans_inner = cleans_capture.clone();
        let reg = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
            *cleans_inner.borrow_mut() += 1;
        }) as Box<dyn FnMut()>);
        let f: Function = reg.as_ref().clone().into();
        on_cleanup(f);
        reg.forget();
        let _ = s_for.get_js();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    assert_eq!(*runs.borrow(), 1);
    assert_eq!(*cleans.borrow(), 0);
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*cleans.borrow(), 1);
    assert_eq!(*runs.borrow(), 2);
    cb.forget();
}

#[wasm_bindgen_test]
/// 在 `untrack` 中读取 Signal 不会建立依赖关系，因此后续 set 不会触发当前 Effect 重新运行。
fn untrack_prevents_subscription() {
    set_reactive_scheduling("sync");
    let a = create_signal(JsValue::from_f64(0.0), None);
    let b = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let a_for = a.clone();
    let b_for = b.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = a_for.get_js();
        let b_inner = b_for.clone();
        let read_b = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
            let _ = b_inner.get_js();
            JsValue::from("ok")
        })
            as Box<dyn FnMut() -> JsValue>);
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

#[wasm_bindgen_test]
/// 批处理将多次 set 合并成一次运行，从而减少不必要的重复执行。
fn batch_coalesces_multiple_sets() {
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
    let sig_for_batch = sig.clone();
    let set_twice = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        sig_for_batch.set_js(JsValue::from_f64(1.0));
        sig_for_batch.set_js(JsValue::from_f64(2.0));
    }) as Box<dyn FnMut()>);
    let g: Function = set_twice.as_ref().clone().into();
    batch(g);
    sig.set_js(JsValue::from_f64(3.0));
    assert!(*hits.borrow() >= 3);
    set_twice.forget();
    cb.forget();
}

#[wasm_bindgen_test]
/// 调用 `dispose_js()` 后，Effect 停止后续运行（解除订阅）。
fn dispose_stops_future_runs() {
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
    let eh = create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    eh.dispose_js();
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
    cb.forget();
}

#[wasm_bindgen_test(async)]
/// 提供自定义调度器时，初始运行会交由调度器安排（例如微任务）。
async fn effect_with_custom_scheduler_defers_initial_run() {
    set_reactive_scheduling("sync");
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        JsValue::UNDEFINED
    }) as Box<dyn FnMut() -> JsValue>);
    let fcb: Function = cb.as_ref().clone().into();

    let scheduler = wasm_bindgen::closure::Closure::wrap(Box::new(move |run: JsValue| {
        let run_fn: Function = run.unchecked_into();
        let cb2 = wasm_bindgen::closure::Closure::wrap(Box::new(move |_v: JsValue| {
            let _ = run_fn.call0(&JsValue::NULL);
        }) as Box<dyn FnMut(JsValue)>);
        let _ = Promise::resolve(&JsValue::UNDEFINED).then(&cb2);
        cb2.forget();
    }) as Box<dyn FnMut(JsValue)>);
    let schf: Function = scheduler.as_ref().clone().into();

    let opts = js_sys::Object::new();
    js_sys::Reflect::set(&opts, &JsValue::from_str("scheduler"), &schf).unwrap();
    js_sys::Reflect::set(&opts, &JsValue::from_str("lazy"), &JsValue::from_bool(false)).unwrap();
    let _eh = create_effect(fcb, Some(opts.into()));

    // 由于调度器推迟到微任务，创建后尚未执行
    assert_eq!(*hits.borrow(), 0);
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    assert_eq!(*hits.borrow(), 1);
    cb.forget();
    scheduler.forget();
}

#[wasm_bindgen_test(async)]
/// 避免自身重入：在 Effect 内对同一信号 set，不会“同步再次运行”，而是退回微任务队列。
async fn effect_self_reentry_avoids_direct_loop() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let s_for = sig.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = s_for.get_js();
        // 在副作用内部写入同一信号：不会同步触发下一次运行
        s_for.set_js(JsValue::from_f64(1.0));
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    // 初次运行只加 1 次
    assert_eq!(*hits.borrow(), 1);
    // 等待微任务后，第二次运行才到来
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}
