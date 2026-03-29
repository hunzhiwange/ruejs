use js_sys::{Function, Promise};
use rue_runtime_vapor::{create_effect, create_signal, set_reactive_scheduling};
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
