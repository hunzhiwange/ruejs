use js_sys::{Function, Promise};
use rue_runtime_vapor::{
    create_computed, create_effect, create_signal, set_reactive_scheduling,
};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
/// 同步调度：副作用在 set 后立即执行（无微任务延迟）。
fn scheduling_sync_runs_immediately() {
    // 将调度模式设为同步
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

#[wasm_bindgen_test(async)]
/// 微任务调度：set 不会立刻触发副作用，需等待一个微任务。
async fn scheduling_microtask_defers_until_microtask() {
    set_reactive_scheduling("microtask");
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
    assert_eq!(*hits.borrow(), 1); // 初始创建时立即运行一次
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1); // 此时尚未运行（等待微任务）
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}

#[wasm_bindgen_test(async)]
/// frame 调度在非浏览器环境下会安全回退到微任务，避免测试/Node 环境因缺少 rAF 而卡住。
async fn scheduling_frame_falls_back_to_microtask_outside_browser() {
    set_reactive_scheduling("frame");
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
    assert_eq!(*hits.borrow(), 1);

    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}

#[wasm_bindgen_test(async)]
/// 微任务调度下，drain 过程中级联产生的新 pending effect 也应自动补发后续微任务，
/// 不应依赖下一次外部 set 才继续传播。
async fn scheduling_microtask_continues_chained_effects_without_external_poke() {
    set_reactive_scheduling("microtask");
    let source = create_signal(JsValue::from_f64(1.0), None);

    let source_for_computed = source.clone();
    let computed_cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        let value = source_for_computed.get_js().as_f64().unwrap();
        JsValue::from_f64(value * 2.0)
    }) as Box<dyn FnMut() -> JsValue>);
    let computed_fn: Function = computed_cb.as_ref().clone().into();
    let doubled = create_computed(computed_fn.into());
    computed_cb.forget();

    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let doubled_for_effect = doubled.clone();
    let effect_cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = doubled_for_effect.get_js();
    }) as Box<dyn FnMut()>);
    let effect_fn: Function = effect_cb.as_ref().clone().into();
    let _eh = create_effect(effect_fn, None);

    assert_eq!(*hits.borrow(), 1);
    source.set_js(JsValue::from_f64(2.0));
    assert_eq!(*hits.borrow(), 1);

    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();

    assert_eq!(*hits.borrow(), 2);
    assert_eq!(doubled.get_js().as_f64().unwrap(), 4.0);
    effect_cb.forget();
}

#[wasm_bindgen_test]
/// `to_value` 支持函数、对象 value/get、以及原始值的通用取值转换。
fn to_value_variants() {
    // 函数：调用返回值
    let f = wasm_bindgen::closure::Closure::wrap(
        Box::new(move || JsValue::from_str("ok")) as Box<dyn FnMut() -> JsValue>
    );
    let ff: js_sys::Function = f.as_ref().clone().into();
    let r1 = rue_runtime_vapor::to_value(ff.into());
    assert_eq!(r1.as_string().unwrap(), "ok");
    f.forget();

    // 对象：优先读取 value 字段
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(&obj, &JsValue::from_str("value"), &JsValue::from_f64(3.0)).unwrap();
    let r2 = rue_runtime_vapor::to_value(obj.into());
    assert_eq!(r2.as_f64().unwrap(), 3.0);

    // 对象：若没有 value，则调用 get()
    let obj2 = js_sys::Object::new();
    let get = wasm_bindgen::closure::Closure::wrap(
        Box::new(move || JsValue::from_str("G")) as Box<dyn FnMut() -> JsValue>
    );
    let gf: js_sys::Function = get.as_ref().clone().into();
    js_sys::Reflect::set(&obj2, &JsValue::from_str("get"), &gf).unwrap();
    let r3 = rue_runtime_vapor::to_value(obj2.into());
    assert_eq!(r3.as_string().unwrap(), "G");
    get.forget();

    // 其他：直接返回原值
    let r4 = rue_runtime_vapor::to_value(JsValue::from_bool(true));
    assert_eq!(r4.as_bool().unwrap(), true);
}
