use js_sys::Function;
use rue_runtime_vapor::{create_computed, create_effect, create_signal, set_reactive_scheduling};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

// 文件说明：
// 验证 `create_computed` 的派生值会随依赖的 Signal 变化而更新。
// 关键点：
// - 通过 `set_reactive_scheduling("sync")` 保证副作用同步执行，便于断言
// - 通过 `JsFuture::from(Promise::resolve(...))` 等待微任务，确保派生值已刷新

#[wasm_bindgen_test(async)]
async fn computed_updates_on_dependency_change() {
    // 设置调度为同步，避免时序干扰
    set_reactive_scheduling("sync");
    let count = create_signal(JsValue::from_f64(1.0), None);
    let c1 = count.clone();
    let comp = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        let v = c1.get_js().as_f64().unwrap();
        JsValue::from_f64(v * 2.0)
    }) as Box<dyn FnMut() -> JsValue>);
    let f_comp: Function = comp.as_ref().clone().into();
    let double = create_computed(f_comp.into());
    comp.forget();

    // 等待一次微任务，确保计算完成
    wasm_bindgen_futures::JsFuture::from(js_sys::Promise::resolve(&JsValue::UNDEFINED))
        .await
        .unwrap();
    let first = double.get_js().as_f64().unwrap();
    assert!(first.is_finite());

    // 修改依赖，派生值应随之变化
    count.set_js(JsValue::from_f64(2.0));
    wasm_bindgen_futures::JsFuture::from(js_sys::Promise::resolve(&JsValue::UNDEFINED))
        .await
        .unwrap();
    let second = double.get_js().as_f64().unwrap();
    assert!(second > first);
}

// 对象参数：`createComputed({ get })` 也应正常工作
#[wasm_bindgen_test]
fn computed_accepts_options_object() {
    set_reactive_scheduling("sync");
    let first = create_signal(JsValue::from_str("John"), None);
    let last = create_signal(JsValue::from_str("Doe"), None);
    let f1 = first.clone();
    let l1 = last.clone();
    // 构造 options 对象：{ get: () => first.get() + ' ' + last.get() }
    let options = js_sys::Object::new();
    let getter = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        let a = f1.get_js().as_string().unwrap();
        let b = l1.get_js().as_string().unwrap();
        JsValue::from_str(&format!("{} {}", a, b))
    }) as Box<dyn FnMut() -> JsValue>);
    let gf: Function = getter.as_ref().clone().into();
    js_sys::Reflect::set(&options, &JsValue::from_str("get"), &gf).unwrap();
    let full = create_computed(options.into());
    getter.forget();

    let hits = Rc::new(RefCell::new(0));
    let rec = hits.clone();
    let f2 = full.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *rec.borrow_mut() += 1;
        let v = f2.get_js().as_string().unwrap();
        if *rec.borrow() == 1 {
            assert_eq!(v, "John Doe");
        } else if *rec.borrow() == 2 {
            assert_eq!(v, "Jane Doe");
        }
    }) as Box<dyn FnMut()>);
    let ef: Function = cb.as_ref().clone().into();
    let _eh = create_effect(ef, None);
    assert_eq!(*hits.borrow(), 1);
    first.set_js(JsValue::from_str("Jane"));
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}

// `{ get, set }`：可写 computed，调用 `.set()` 应转发到 `set` 并更新源信号
#[wasm_bindgen_test]
fn computed_writable_calls_setter_and_updates_value() {
    set_reactive_scheduling("sync");
    let first = create_signal(JsValue::from_str("John"), None);
    let last = create_signal(JsValue::from_str("Doe"), None);
    let f1 = first.clone();
    let l1 = last.clone();
    let options = js_sys::Object::new();
    // get: () => `${first} ${last}`
    let getter = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        let a = f1.get_js().as_string().unwrap();
        let b = l1.get_js().as_string().unwrap();
        JsValue::from_str(&format!("{} {}", a, b))
    }) as Box<dyn FnMut() -> JsValue>);
    let gf: Function = getter.as_ref().clone().into();
    js_sys::Reflect::set(&options, &JsValue::from_str("get"), &gf).unwrap();
    getter.forget();

    // set: (nv) => { const [f,l] = nv.split(' '); first.set(f); last.set(l) }
    let first_for_set = first.clone();
    let last_for_set = last.clone();
    let setter = wasm_bindgen::closure::Closure::wrap(Box::new(move |nv: JsValue| {
        let s = nv.as_string().unwrap_or_default();
        let mut parts = s.split(' ');
        let f = parts.next().unwrap_or("");
        let l = parts.next().unwrap_or("");
        first_for_set.set_js(JsValue::from_str(f));
        last_for_set.set_js(JsValue::from_str(l));
        JsValue::UNDEFINED
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let sf: Function = setter.as_ref().clone().into();
    js_sys::Reflect::set(&options, &JsValue::from_str("set"), &sf).unwrap();
    setter.forget();

    let full = create_computed(options.into());

    // 初始派生值
    assert_eq!(full.get_js().as_string().unwrap(), "John Doe");
    // 通过 `.set()` 触发 setter，更新源信号并重算派生值
    full.set_js(JsValue::from_str("David Smith"));
    assert_eq!(first.get_js().as_string().unwrap(), "David");
    assert_eq!(last.get_js().as_string().unwrap(), "Smith");
    assert_eq!(full.get_js().as_string().unwrap(), "David Smith");
}

#[wasm_bindgen_test]
fn computed_is_lazy_and_uses_dirty_cache() {
    set_reactive_scheduling("sync");
    let count = create_signal(JsValue::from_f64(1.0), None);
    let getter_hits = Rc::new(RefCell::new(0));
    let getter_hits2 = getter_hits.clone();
    let count_for_getter = count.clone();
    let getter = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *getter_hits2.borrow_mut() += 1;
        let value = count_for_getter.get_js().as_f64().unwrap();
        JsValue::from_f64(value * 2.0)
    }) as Box<dyn FnMut() -> JsValue>);
    let getter_fn: Function = getter.as_ref().clone().into();
    let double = create_computed(getter_fn.into());
    getter.forget();

    // 首次创建时不应 eager 执行 getter。
    assert_eq!(*getter_hits.borrow(), 0);

    assert_eq!(double.get_js().as_f64().unwrap(), 2.0);
    assert_eq!(*getter_hits.borrow(), 1);

    // 未脏化前重复读取应直接命中缓存。
    assert_eq!(double.get_js().as_f64().unwrap(), 2.0);
    assert_eq!(*getter_hits.borrow(), 1);

    // 依赖变化后只标脏，不立即重算。
    count.set_js(JsValue::from_f64(2.0));
    assert_eq!(*getter_hits.borrow(), 1);

    // 下一次读取才真正重算并刷新缓存。
    assert_eq!(double.get_js().as_f64().unwrap(), 4.0);
    assert_eq!(*getter_hits.borrow(), 2);
}
