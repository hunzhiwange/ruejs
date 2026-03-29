use js_sys::{Function, Promise, Reflect};
use rue_runtime_vapor::{create_resource, create_signal, set_reactive_scheduling};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

// 文件说明：
// 验证异步资源 `create_resource` 的加载流程：
// - 当 fetcher 返回 Promise 并 resolve 时，`loading=false` 且 `data` 更新
// - 当 fetcher reject 时，`loading=false` 且 `error` 变为字符串
// - 当 fetcher 返回非 Promise 时，回退为立即 resolved 的 Promise，最终 `data=undefined`

#[wasm_bindgen_test(async)]
/// 资源 resolve：依赖源变化后，等待微任务，`loading=false` 且 `data` 为计算结果。
async fn resource_resolves_promise() {
    set_reactive_scheduling("sync");
    let src = create_signal(JsValue::from_f64(1.0), None);
    let s1 = src.clone();
    let fetch = wasm_bindgen::closure::Closure::wrap(Box::new(move |x: JsValue| {
        let v = x.as_f64().unwrap();
        Promise::resolve(&JsValue::from_f64(v * 2.0)).into()
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let f: Function = fetch.as_ref().clone().into();
    let res = create_resource(&src, f);
    fetch.forget();
    let data = Reflect::get(&res, &JsValue::from_str("data")).unwrap();
    let loading = Reflect::get(&res, &JsValue::from_str("loading")).unwrap();
    s1.set_js(JsValue::from_f64(2.0));
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    let l_get = Reflect::get(&loading, &JsValue::from_str("get")).unwrap();
    let l_fn: Function = l_get.dyn_into().unwrap();
    let lv = l_fn.call0(&loading).unwrap().as_bool().unwrap();
    assert_eq!(lv, false);
    let d_get = Reflect::get(&data, &JsValue::from_str("get")).unwrap();
    let d_fn: Function = d_get.dyn_into().unwrap();
    let dv = d_fn.call0(&data).unwrap().as_f64().unwrap();
    assert_eq!(dv, 4.0);
}

#[wasm_bindgen_test(async)]
/// 资源 reject：依赖源变化后，等待微任务，`loading=false` 且 `error` 为字符串。
async fn resource_catches_error() {
    set_reactive_scheduling("sync");
    let src = create_signal(JsValue::from_f64(1.0), None);
    let s1 = src.clone();
    let fetch = wasm_bindgen::closure::Closure::wrap(Box::new(move |_x: JsValue| {
        Promise::reject(&JsValue::from_str("fail")).into()
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let f: Function = fetch.as_ref().clone().into();
    let res = create_resource(&src, f);
    fetch.forget();
    let error = Reflect::get(&res, &JsValue::from_str("error")).unwrap();
    let loading = Reflect::get(&res, &JsValue::from_str("loading")).unwrap();
    s1.set_js(JsValue::from_f64(2.0));
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

#[wasm_bindgen_test(async)]
/// 当 fetcher 返回“非 Promise”时，会回退为一个立即 resolved 的 Promise，最终 data=undefined、loading=false。
async fn resource_fetcher_returns_non_promise() {
    set_reactive_scheduling("sync");
    let src = create_signal(JsValue::from_str("k"), None);
    let s1 = src.clone();
    let fetch = wasm_bindgen::closure::Closure::wrap(Box::new(move |_x: JsValue| {
        // 返回一个普通值（非 Promise）
        JsValue::from_str("not-promise")
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let f: Function = fetch.as_ref().clone().into();
    let res = create_resource(&src, f);
    fetch.forget();
    let data = Reflect::get(&res, &JsValue::from_str("data")).unwrap();
    let loading = Reflect::get(&res, &JsValue::from_str("loading")).unwrap();
    s1.set_js(JsValue::from_str("k2"));
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    let l_get = Reflect::get(&loading, &JsValue::from_str("get")).unwrap();
    let l_fn: Function = l_get.dyn_into().unwrap();
    let lv = l_fn.call0(&loading).unwrap().as_bool().unwrap();
    assert_eq!(lv, false);
    let d_get = Reflect::get(&data, &JsValue::from_str("get")).unwrap();
    let d_fn: Function = d_get.dyn_into().unwrap();
    let dv = d_fn.call0(&data).unwrap();
    assert!(dv.is_undefined());
}
