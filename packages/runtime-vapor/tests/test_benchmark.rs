use js_sys::{Function, Object, Promise, Reflect};
use rue_runtime_vapor::{create_signal, set_reactive_scheduling, watch_signal};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

#[wasm_bindgen_test(async)]
/// 压力测试：10万次连续变更，验证防抖与稳定性
async fn benchmark_massive_updates_debounce() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let rec = hits.clone();
    
    // 处理器：只记录调用次数
    let handler = wasm_bindgen::closure::Closure::wrap(Box::new(move |_n: JsValue, _o: JsValue| {
        *rec.borrow_mut() += 1;
        JsValue::UNDEFINED
    }) as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let h: Function = handler.as_ref().clone().into();
    
    let options = Object::new();
    // 设置 100ms 防抖，给大量更新留足缓冲时间
    Reflect::set(&options, &JsValue::from_str("debounce"), &JsValue::from_f64(100.0)).unwrap();
    
    let _eh = watch_signal(&sig, h, Some(options.into()));
    
    // 10万次变更
    let start = js_sys::Date::now();
    for i in 1..=100_000 {
        sig.set_js(JsValue::from_f64(i as f64));
    }
    let end = js_sys::Date::now();
    
    // 简单的日志输出 (通过 Reflect 访问 console.log)
    if let Ok(console) = Reflect::get(&js_sys::global(), &JsValue::from_str("console")) {
        if let Ok(log) = Reflect::get(&console, &JsValue::from_str("log")) {
            if let Ok(log_fn) = log.dyn_into::<Function>() {
                let msg = format!("100k updates took {}ms", end - start);
                let _ = log_fn.call1(&console, &JsValue::from_str(&msg));
            }
        }
    }
    
    // 循环期间不应触发任何回调
    assert_eq!(*hits.borrow(), 0, "Should not trigger during sync loop");
    
    // 等待 200ms 确保防抖结束
    let promise = Promise::new(&mut |resolve, _| {
        let win = js_sys::global();
        let set_timeout = Reflect::get(&win, &JsValue::from_str("setTimeout")).unwrap();
        let set_timeout_fn = set_timeout.unchecked_into::<Function>();
        let _ = set_timeout_fn.call2(&JsValue::NULL, &resolve, &JsValue::from_f64(200.0));
    });
    wasm_bindgen_futures::JsFuture::from(promise).await.unwrap();
    
    // 应该只触发一次（最后一次值的变更）
    let count = *hits.borrow();
    if let Ok(console) = Reflect::get(&js_sys::global(), &JsValue::from_str("console")) {
        if let Ok(log) = Reflect::get(&console, &JsValue::from_str("log")) {
            if let Ok(log_fn) = log.dyn_into::<Function>() {
                let msg = format!("Final hit count: {}", count);
                let _ = log_fn.call1(&console, &JsValue::from_str(&msg));
            }
        }
    }
    assert_eq!(count, 1, "Should trigger exactly once after massive updates");
    
    handler.forget();
}
