use js_sys::Array;
use js_sys::{Function, Object, Promise, Reflect};
use rue_runtime_vapor::{
    batch, create_signal, set_reactive_scheduling, watch_deep_signal, watch_effect, watch_fn,
    watch_path, watch_signal,
};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

// 文件说明：
// 验证不同形式的 watch：
// - `watch_fn(getter, handler)`：对 getter 的依赖进行追踪，变化时调用 handler
// - `watch_effect(cb)`：自动收集 cb 中读取到的依赖
// - `watch_signal(sig)` / `watch_deep_signal(sig)` / `watch_path(sig, path)`：针对特定信号与路径的监听
// 支持 `immediate`、`equals`、`scheduler` 等选项控制首次触发、相等性与调度方式。

#[wasm_bindgen_test]
/// 基础：`watch_fn` 通过 `immediate=true` 立即触发一次，然后在依赖变化时再次触发。
fn watch_fn_immediate_and_changes() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let s1 = sig.clone();
    let records = Rc::new(RefCell::new(Vec::<(f64, Option<f64>)>::new()));
    let getter = wasm_bindgen::closure::Closure::wrap(
        Box::new(move || s1.get_js()) as Box<dyn FnMut() -> JsValue>
    );
    let g: Function = getter.as_ref().clone().into();
    let rec = records.clone();
    let handler =
        wasm_bindgen::closure::Closure::wrap(Box::new(move |newv: JsValue, oldv: JsValue| {
            let n = newv.as_f64().unwrap();
            let o = if oldv.is_undefined() { None } else { Some(oldv.as_f64().unwrap()) };
            rec.borrow_mut().push((n, o));
            JsValue::UNDEFINED
        })
            as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let h: Function = handler.as_ref().clone().into();
    let options = Object::new();
    Reflect::set(&options, &JsValue::from_str("immediate"), &JsValue::from_bool(true)).unwrap();
    let _eh = watch_fn(g, h, Some(options.into()));
    assert_eq!(records.borrow().len(), 1);
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(records.borrow().len(), 2);
    getter.forget();
    handler.forget();
}

#[wasm_bindgen_test]
/// `watch_effect` 会收集回调中读取到的依赖；当依赖变化时再次运行。
fn watch_effect_collects_dependencies() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let s1 = sig.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = s1.get_js();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = watch_effect(f, Some(Object::new().into()));
    assert_eq!(*hits.borrow(), 1);
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 2);
    cb.forget();
}

#[wasm_bindgen_test]
fn watch_signal_equals_prevents_rerun() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let records = Rc::new(RefCell::new(0));
    let rec = records.clone();
    let handler =
        wasm_bindgen::closure::Closure::wrap(Box::new(move |_newv: JsValue, _oldv: JsValue| {
            *rec.borrow_mut() += 1;
            JsValue::UNDEFINED
        })
            as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let h: Function = handler.as_ref().clone().into();
    let options = Object::new();
    // immediate true to trigger first time
    Reflect::set(&options, &JsValue::from_str("immediate"), &JsValue::from_bool(true)).unwrap();
    // equals always true blocks subsequent triggers
    let eq = wasm_bindgen::closure::Closure::wrap(Box::new(move |_a: JsValue, _b: JsValue| {
        JsValue::from_bool(true)
    })
        as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let eqf: Function = eq.as_ref().clone().into();
    Reflect::set(&options, &JsValue::from_str("equals"), &eqf).unwrap();
    let _eh = watch_signal(&sig, h, Some(options.into()));
    assert_eq!(*records.borrow(), 1);
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*records.borrow(), 1);
    handler.forget();
    eq.forget();
}

#[wasm_bindgen_test(async)]
/// 自定义调度器：初始运行不再推迟（为了保证依赖收集），但后续更新遵循调度器。
async fn watch_fn_custom_scheduler_runs_immediately() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let s1 = sig.clone();
    let hits = Rc::new(RefCell::new(0));
    let getter = wasm_bindgen::closure::Closure::wrap(
        Box::new(move || s1.get_js()) as Box<dyn FnMut() -> JsValue>
    );
    let g: Function = getter.as_ref().clone().into();
    let rec = hits.clone();
    let handler =
        wasm_bindgen::closure::Closure::wrap(Box::new(move |_newv: JsValue, _oldv: JsValue| {
            *rec.borrow_mut() += 1;
            JsValue::UNDEFINED
        })
            as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let h: Function = handler.as_ref().clone().into();
    let scheduler = wasm_bindgen::closure::Closure::wrap(Box::new(move |run: JsValue| {
        let run_fn: Function = run.unchecked_into();
        let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move |_v: JsValue| {
            let _ = run_fn.call0(&JsValue::NULL);
        }) as Box<dyn FnMut(JsValue)>);
        let _ = Promise::resolve(&JsValue::UNDEFINED).then(&cb);
        cb.forget();
    }) as Box<dyn FnMut(JsValue)>);
    let schf: Function = scheduler.as_ref().clone().into();
    let options = Object::new();
    Reflect::set(&options, &JsValue::from_str("scheduler"), &schf).unwrap();
    Reflect::set(&options, &JsValue::from_str("immediate"), &JsValue::from_bool(true)).unwrap();
    let _eh = watch_fn(g, h, Some(options.into()));
    // 修正：现在 watch 会同步执行一次以收集依赖
    assert_eq!(*hits.borrow(), 1);
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    // 调度器未被调用（因为是同步首轮），所以此处不应增加
    assert_eq!(*hits.borrow(), 1);
    
    // 触发更新，应走调度器
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1); // 尚未执行
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    assert_eq!(*hits.borrow(), 2); // 执行了

    getter.forget();
    handler.forget();
    scheduler.forget();
}

#[wasm_bindgen_test]
/// watch_fn 的 equals 返回 true 时，后续变化不会触发 handler。
fn watch_fn_equals_prevents_rerun() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let s1 = sig.clone();
    let getter = wasm_bindgen::closure::Closure::wrap(
        Box::new(move || s1.get_js()) as Box<dyn FnMut() -> JsValue>
    );
    let g: Function = getter.as_ref().clone().into();
    let hits = Rc::new(RefCell::new(0));
    let rec = hits.clone();
    let handler =
        wasm_bindgen::closure::Closure::wrap(Box::new(move |_newv: JsValue, _oldv: JsValue| {
            *rec.borrow_mut() += 1;
            JsValue::UNDEFINED
        })
            as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let h: Function = handler.as_ref().clone().into();
    let options = Object::new();
    Reflect::set(&options, &JsValue::from_str("immediate"), &JsValue::from_bool(true)).unwrap();
    let eq = wasm_bindgen::closure::Closure::wrap(Box::new(move |_a: JsValue, _b: JsValue| {
        JsValue::from_bool(true)
    })
        as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let eqf: Function = eq.as_ref().clone().into();
    Reflect::set(&options, &JsValue::from_str("equals"), &eqf).unwrap();
    let _eh = watch_fn(g, h, Some(options.into()));
    assert_eq!(*hits.borrow(), 1);
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
    getter.forget();
    handler.forget();
    eq.forget();
}

#[wasm_bindgen_test(async)]
/// watch_effect 也可以通过自定义调度器把运行推迟到微任务。
async fn watch_effect_custom_scheduler_defers() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let s1 = sig.clone();
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        let _ = s1.get_js();
        *hits2.borrow_mut() += 1;
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let scheduler = wasm_bindgen::closure::Closure::wrap(Box::new(move |run: JsValue| {
        let run_fn: Function = run.unchecked_into();
        let cb2 = wasm_bindgen::closure::Closure::wrap(Box::new(move |_v: JsValue| {
            let _ = run_fn.call0(&JsValue::NULL);
        }) as Box<dyn FnMut(JsValue)>);
        let _ = Promise::resolve(&JsValue::UNDEFINED).then(&cb2);
        cb2.forget();
    }) as Box<dyn FnMut(JsValue)>);
    let schf: Function = scheduler.as_ref().clone().into();
    let options = Object::new();
    Reflect::set(&options, &JsValue::from_str("scheduler"), &schf).unwrap();
    let _eh = watch_effect(f, Some(options.into()));
    // 初始运行必须是同步的以收集依赖
    assert_eq!(*hits.borrow(), 1);
    
    // 触发更新
    sig.set_js(JsValue::from_f64(1.0));
    // 更新应被调度器推迟
    assert_eq!(*hits.borrow(), 1);
    
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    // 调度执行后增加
    assert_eq!(*hits.borrow(), 2);
    
    cb.forget();
    scheduler.forget();
}

#[wasm_bindgen_test]
fn watch_effect_no_duplicate_on_batch_flush() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_str("Hello World!"), None);
    let records = Rc::new(RefCell::new(Vec::<String>::new()));
    let rec = records.clone();
    let s1 = sig.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        let v = s1.get_js();
        rec.borrow_mut().push(v.as_string().unwrap_or_default());
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = watch_effect(f, Some(Object::new().into()));
    assert_eq!(records.borrow().len(), 1);
    let g = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        sig.set_js(JsValue::from_str("hello"));
        sig.set_js(JsValue::from_str("world"));
        JsValue::UNDEFINED
    }) as Box<dyn FnMut() -> JsValue>);
    let gf: Function = g.as_ref().clone().into();
    batch(gf.clone());
    assert_eq!(records.borrow().len(), 2);
    assert_eq!(records.borrow().get(1).cloned().unwrap(), "world");
    cb.forget();
    g.forget();
}

#[wasm_bindgen_test]
fn watch_effect_no_duplicate_last_value() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_str("Hello World!"), None);
    let records = Rc::new(RefCell::new(Vec::<String>::new()));
    let rec = records.clone();
    let s1 = sig.clone();
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        let v = s1.get_js();
        rec.borrow_mut().push(v.as_string().unwrap_or_default());
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = watch_effect(f, Some(Object::new().into()));
    assert_eq!(records.borrow().len(), 1);
    sig.set_js(JsValue::from_str("hello"));
    sig.set_js(JsValue::from_str("world"));
    assert_eq!(records.borrow().len(), 3);
    assert_eq!(records.borrow().get(0).cloned().unwrap(), "Hello World!");
    assert_eq!(records.borrow().get(1).cloned().unwrap(), "hello");
    assert_eq!(records.borrow().get(2).cloned().unwrap(), "world");
    cb.forget();
}

#[wasm_bindgen_test]
/// 深度监听：`watch_deep_signal` 对嵌套路径变化触发，但对“等值写入”不触发。
fn watch_deep_signal_triggers_on_nested_changes() {
    set_reactive_scheduling("sync");
    let profile = Object::new();
    Reflect::set(&profile, &JsValue::from_str("name"), &JsValue::from_str("A")).unwrap();
    let user = Object::new();
    Reflect::set(&user, &JsValue::from_str("profile"), &profile).unwrap();
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("user"), &user).unwrap();
    let sig = create_signal(root.into(), None);

    let hits = Rc::new(RefCell::new(0));
    let rec = hits.clone();
    let handler = wasm_bindgen::closure::Closure::wrap(Box::new(move |_n: JsValue, _o: JsValue| {
        *rec.borrow_mut() += 1;
        JsValue::UNDEFINED
    })
        as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let h: Function = handler.as_ref().clone().into();
    let options = Object::new();
    Reflect::set(&options, &JsValue::from_str("immediate"), &JsValue::from_bool(true)).unwrap();
    let _eh = watch_deep_signal(&sig, h, Some(options.into()));
    assert_eq!(*hits.borrow(), 1);
    let path = Array::new();
    path.push(&JsValue::from_str("user"));
    path.push(&JsValue::from_str("profile"));
    path.push(&JsValue::from_str("name"));
    sig.set_path_js(path.clone().into(), JsValue::from_str("B"));
    assert_eq!(*hits.borrow(), 2);
    sig.set_path_js(path.clone().into(), JsValue::from_str("B"));
    assert_eq!(*hits.borrow(), 2);
    handler.forget();
}

#[wasm_bindgen_test]
/// 自定义 equals：当 equals 恒为 false 时，即使写入同值也会认为发生变化并触发。
fn watch_deep_signal_custom_equals_always_triggers() {
    set_reactive_scheduling("sync");
    let a = Object::new();
    Reflect::set(&a, &JsValue::from_str("b"), &JsValue::from_f64(1.0)).unwrap();
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("a"), &a).unwrap();
    let sig = create_signal(root.into(), None);
    let hits = Rc::new(RefCell::new(0));
    let rec = hits.clone();
    let handler = wasm_bindgen::closure::Closure::wrap(Box::new(move |_n: JsValue, _o: JsValue| {
        *rec.borrow_mut() += 1;
        JsValue::UNDEFINED
    })
        as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let h: Function = handler.as_ref().clone().into();
    let options = Object::new();
    let eq = wasm_bindgen::closure::Closure::wrap(Box::new(move |_p: JsValue, _n: JsValue| {
        JsValue::from_bool(false)
    })
        as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let eqf: Function = eq.as_ref().clone().into();
    Reflect::set(&options, &JsValue::from_str("equals"), &eqf).unwrap();
    Reflect::set(&options, &JsValue::from_str("immediate"), &JsValue::from_bool(true)).unwrap();
    let _eh = watch_deep_signal(&sig, h, Some(options.into()));
    assert_eq!(*hits.borrow(), 1);
    let path = Array::new();
    path.push(&JsValue::from_str("a"));
    path.push(&JsValue::from_str("b"));
    sig.set_path_js(path.clone().into(), JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 2);
    eq.forget();
    handler.forget();
}

#[wasm_bindgen_test]
/// 路径监听：对指定路径的值变化触发；重复写入同值不会再次触发。
fn watch_path_triggers_on_value_change() {
    set_reactive_scheduling("sync");
    let profile = Object::new();
    Reflect::set(&profile, &JsValue::from_str("name"), &JsValue::from_str("A")).unwrap();
    let user = Object::new();
    Reflect::set(&user, &JsValue::from_str("profile"), &profile).unwrap();
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("user"), &user).unwrap();
    let sig = create_signal(root.into(), None);
    let path = Array::new();
    path.push(&JsValue::from_str("user"));
    path.push(&JsValue::from_str("profile"));
    path.push(&JsValue::from_str("name"));
    let hits = Rc::new(RefCell::new(0));
    let rec = hits.clone();
    let handler = wasm_bindgen::closure::Closure::wrap(Box::new(move |_n: JsValue, _o: JsValue| {
        *rec.borrow_mut() += 1;
        JsValue::UNDEFINED
    })
        as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let h: Function = handler.as_ref().clone().into();
    let options = Object::new();
    Reflect::set(&options, &JsValue::from_str("immediate"), &JsValue::from_bool(true)).unwrap();
    let _eh = watch_path(&sig, path.clone().into(), h, Some(options.into()));
    assert_eq!(*hits.borrow(), 1);
    sig.set_path_js(path.clone().into(), JsValue::from_str("B"));
    assert_eq!(*hits.borrow(), 2);
    sig.set_path_js(path.clone().into(), JsValue::from_str("B"));
    assert_eq!(*hits.borrow(), 2);
    handler.forget();
}

#[wasm_bindgen_test]
/// 字符串路径：watch_path 支持以 `.` 分隔的字符串路径（数字段转为索引）。
fn watch_path_supports_string_path() {
    set_reactive_scheduling("sync");
    let profile = Object::new();
    Reflect::set(&profile, &JsValue::from_str("name"), &JsValue::from_str("A")).unwrap();
    let user = Object::new();
    Reflect::set(&user, &JsValue::from_str("profile"), &profile).unwrap();
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("user"), &user).unwrap();
    let sig = create_signal(root.into(), None);
    let hits = Rc::new(RefCell::new(0));
    let rec = hits.clone();
    let handler = wasm_bindgen::closure::Closure::wrap(Box::new(move |_n: JsValue, _o: JsValue| {
        *rec.borrow_mut() += 1;
        JsValue::UNDEFINED
    })
        as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let h: Function = handler.as_ref().clone().into();
    let options = Object::new();
    Reflect::set(&options, &JsValue::from_str("immediate"), &JsValue::from_bool(true)).unwrap();
    let _eh = watch_path(&sig, JsValue::from_str("user.profile.name"), h, Some(options.into()));
    assert_eq!(*hits.borrow(), 1);
    sig.set_path_js(JsValue::from_str("user.profile.name"), JsValue::from_str("B"));
    assert_eq!(*hits.borrow(), 2);
    handler.forget();
}

#[wasm_bindgen_test]
/// 路径监听 + equals：当 equals 恒为 true 时，后续变化不会触发。
fn watch_path_equals_prevents_rerun() {
    set_reactive_scheduling("sync");
    let profile = Object::new();
    Reflect::set(&profile, &JsValue::from_str("name"), &JsValue::from_str("A")).unwrap();
    let user = Object::new();
    Reflect::set(&user, &JsValue::from_str("profile"), &profile).unwrap();
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("user"), &user).unwrap();
    let sig = create_signal(root.into(), None);
    let path = Array::new();
    path.push(&JsValue::from_str("user"));
    path.push(&JsValue::from_str("profile"));
    path.push(&JsValue::from_str("name"));
    let hits = Rc::new(RefCell::new(0));
    let rec = hits.clone();
    let handler = wasm_bindgen::closure::Closure::wrap(Box::new(move |_n: JsValue, _o: JsValue| {
        *rec.borrow_mut() += 1;
        JsValue::UNDEFINED
    })
        as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let h: Function = handler.as_ref().clone().into();
    let options = Object::new();
    Reflect::set(&options, &JsValue::from_str("immediate"), &JsValue::from_bool(true)).unwrap();
    let eq = wasm_bindgen::closure::Closure::wrap(Box::new(move |_a: JsValue, _b: JsValue| {
        JsValue::from_bool(true)
    })
        as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let eqf: Function = eq.as_ref().clone().into();
    Reflect::set(&options, &JsValue::from_str("equals"), &eqf).unwrap();
    let _eh = watch_path(&sig, path.clone().into(), h, Some(options.into()));
    assert_eq!(*hits.borrow(), 1);
    sig.set_path_js(path.clone().into(), JsValue::from_str("C"));
    assert_eq!(*hits.borrow(), 1);
    eq.forget();
    handler.forget();
}

#[wasm_bindgen_test(async)]
/// 防抖测试：连续快速变更只会触发一次
async fn watch_debounce_merges_rapid_changes() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let rec = hits.clone();
    let handler = wasm_bindgen::closure::Closure::wrap(Box::new(move |_n: JsValue, _o: JsValue| {
        *rec.borrow_mut() += 1;
        JsValue::UNDEFINED
    }) as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let h: Function = handler.as_ref().clone().into();
    
    let options = Object::new();
    // 设置 20ms 防抖
    Reflect::set(&options, &JsValue::from_str("debounce"), &JsValue::from_f64(20.0)).unwrap();
    
    let _eh = watch_signal(&sig, h, Some(options.into()));
    
    // 连续触发多次
    for i in 1..=10 {
        sig.set_js(JsValue::from_f64(i as f64));
    }
    
    // 此时应该还未触发（防抖计时中）
    assert_eq!(*hits.borrow(), 0);
    
    // 等待 100ms 确保防抖结束
    let promise = Promise::new(&mut |resolve, _| {
        let win = js_sys::global();
        let set_timeout = Reflect::get(&win, &JsValue::from_str("setTimeout")).unwrap();
        let set_timeout_fn = set_timeout.unchecked_into::<Function>();
        let _ = set_timeout_fn.call2(&JsValue::NULL, &resolve, &JsValue::from_f64(100.0));
    });
    wasm_bindgen_futures::JsFuture::from(promise).await.unwrap();
    
    // 应该只触发一次
    let count = *hits.borrow();
    assert_eq!(count, 1, "debounce failed: hits={}", count);
    
    handler.forget();
}
