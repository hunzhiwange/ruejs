use js_sys::{Function, Promise};
use rue_runtime_vapor::reactive::core::{
    create_effect_scope, current_effect_scope, dispose_effect_scope, pop_effect_scope,
    push_effect_scope,
};
use rue_runtime_vapor::{create_effect, create_signal, on_cleanup, set_reactive_scheduling};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
/// scope 栈：push/pop 影响 current_effect_scope 的返回值。
fn effect_scope_stack_roundtrip() {
    // 先创建一个父 scope 并压栈。
    let parent = create_effect_scope();
    push_effect_scope(parent);
    assert_eq!(current_effect_scope(), Some(parent));

    // 在父 scope 处于栈顶时创建子 scope，并把它也压栈。
    let child = create_effect_scope();
    push_effect_scope(child);
    assert_eq!(current_effect_scope(), Some(child));

    // 弹栈时应先弹出子 scope，再回到父 scope。
    assert_eq!(pop_effect_scope(), Some(child));
    assert_eq!(current_effect_scope(), Some(parent));
    assert_eq!(pop_effect_scope(), Some(parent));
    assert_eq!(current_effect_scope(), None);
}

#[wasm_bindgen_test]
/// dispose 空 scope：允许重复 dispose，且不会影响后续 scope 使用。
fn dispose_empty_scope_is_idempotent() {
    let sid = create_effect_scope();

    // 第一次 dispose：scope 的内部表会被移除（调用方不需要关心具体数据结构）。
    dispose_effect_scope(sid);

    // 第二次 dispose：应是安全的 no-op（不会 panic）。
    dispose_effect_scope(sid);

    // 新建 scope 仍然能正常工作，避免“全局状态被破坏”的回归。
    let sid2 = create_effect_scope();
    push_effect_scope(sid2);
    assert_eq!(current_effect_scope(), Some(sid2));
    pop_effect_scope();
}

#[wasm_bindgen_test]
/// dispose scope：会执行 cleanup，并且销毁后不再响应 signal 变化。
fn dispose_scope_runs_cleanup_and_stops_future_runs() {
    // 用同步模式，避免测试依赖微任务时序。
    set_reactive_scheduling("sync");

    // 用全局变量统计 cleanup 运行次数，便于跨回调断言。
    let _ = js_sys::eval("globalThis.__rue_cleanup_count = 0;");

    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let sig2 = sig.clone();

    // 创建 scope，并把它设为当前 scope：effect 会自动绑定到该 scope。
    let sid = create_effect_scope();
    push_effect_scope(sid);

    // effect 首次执行时：
    // - hits +1（用于验证是否被触发）
    // - 读取 sig 建立订阅
    // - 注册 cleanup（用于验证 dispose 时会被执行）
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = sig2.get_js();

        let cleanup = Function::new_no_args(
            "globalThis.__rue_cleanup_count = (globalThis.__rue_cleanup_count || 0) + 1;",
        );
        on_cleanup(cleanup);
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    cb.forget();

    // setup 结束后弹出 scope，模拟 Vapor setup 生命周期。
    pop_effect_scope();

    // 创建时 effect 会立即跑一次，因此 hits 必须是 1。
    assert_eq!(*hits.borrow(), 1);

    // dispose scope：会销毁 scope 内的 effect，并执行最后一次注册的 cleanup。
    dispose_effect_scope(sid);
    let v = js_sys::eval("globalThis.__rue_cleanup_count").unwrap();
    assert_eq!(v.as_f64().unwrap() as i32, 1);

    // scope 已销毁：后续 set 不应再触发该 effect。
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
}

#[wasm_bindgen_test]
/// dispose scope：会递归销毁子 scope 的 effect。
fn dispose_scope_is_recursive() {
    set_reactive_scheduling("sync");
    let _ = js_sys::eval("globalThis.__rue_cleanup_count = 0;");

    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let sig2 = sig.clone();

    // 父 scope -> 子 scope：子 scope 在父 scope 栈顶时创建，从而建立父子关系。
    let parent = create_effect_scope();
    push_effect_scope(parent);
    let child = create_effect_scope();
    push_effect_scope(child);

    // effect 归属到“当前（子）scope”，因此 dispose(parent) 需要递归清理它。
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = sig2.get_js();

        let cleanup = Function::new_no_args(
            "globalThis.__rue_cleanup_count = (globalThis.__rue_cleanup_count || 0) + 1;",
        );
        on_cleanup(cleanup);
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    cb.forget();

    // 模拟 setup 结束，弹出子/父 scope。
    pop_effect_scope();
    pop_effect_scope();

    // dispose 父 scope：应递归 dispose 子 scope，并触发 cleanup。
    dispose_effect_scope(parent);
    let v = js_sys::eval("globalThis.__rue_cleanup_count").unwrap();
    assert_eq!(v.as_f64().unwrap() as i32, 1);

    // 销毁后不应再响应 signal。
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
}

#[wasm_bindgen_test(async)]
/// dispose scope：会取消尚未执行的微任务调度，避免“卸载后又跑一次”。
async fn dispose_scope_cancels_pending_microtask_run() {
    set_reactive_scheduling("microtask");

    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let sig2 = sig.clone();

    let sid = create_effect_scope();
    push_effect_scope(sid);

    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = sig2.get_js();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    cb.forget();

    pop_effect_scope();
    assert_eq!(*hits.borrow(), 1);

    // microtask 模式下，set 只会把 effect 加入 pending 队列，不会立刻运行。
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);

    // 在微任务执行前 dispose scope：pending 里的 effect 也应被移除。
    dispose_effect_scope(sid);

    // 等待一个微任务，确认不会出现“卸载后又跑一次”。
    wasm_bindgen_futures::JsFuture::from(Promise::resolve(&JsValue::UNDEFINED)).await.unwrap();
    assert_eq!(*hits.borrow(), 1);
}
