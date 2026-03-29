use js_sys::Function;
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

use rue_runtime_vapor::{create_effect, create_signal, set_reactive_scheduling, watch_effect};

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
/// 嵌套 effect 场景：外层 effect 在内部创建 watch_effect 后，仍能保持对 Signal 的订阅。
/// 之前 bug：run_effect 在执行内层 effect 后将 CURRENT_EFFECT 设为 None，
/// 导致外层 effect 后续对 Signal 的读取不再建立订阅，只有 watch_effect 自己会响应。
/// 修复后：内层 effect 结束时恢复外层 CURRENT_EFFECT，Signal 同时订阅外层渲染 effect 与内层 watch_effect。
fn nested_effect_restores_outer_current_effect() {
    set_reactive_scheduling("sync");
    let sig = create_signal(JsValue::from_f64(0.0), None);

    let outer_hits = Rc::new(RefCell::new(0));
    let inner_hits = Rc::new(RefCell::new(0));
    let outer_hits_clone = outer_hits.clone();
    let inner_hits_clone = inner_hits.clone();
    let s_for_outer = sig.clone();
    let s_for_inner = sig.clone();

    // 外层 effect：模拟组件渲染 effect，内部创建 watch_effect
    let outer_cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *outer_hits_clone.borrow_mut() += 1;
        // 模拟“渲染时访问信号”，应订阅到当前（外层） effect
        let _ = s_for_outer.get_js();

        // 在外层 effect 内部创建 watch_effect，形成嵌套 effect
        let inner_hits_for_watch = inner_hits_clone.clone();
        let s_for_watch = s_for_inner.clone();
        let inner_cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
            *inner_hits_for_watch.borrow_mut() += 1;
            let _ = s_for_watch.get_js();
        }) as Box<dyn FnMut()>);
        let f: Function = inner_cb.as_ref().clone().into();
        let _eh = watch_effect(f, None);
        inner_cb.forget();
    }) as Box<dyn FnMut()>);

    let f_outer: Function = outer_cb.as_ref().clone().into();
    let _eh_outer = create_effect(f_outer, None);

    // 初次运行：外层 effect 和内层 watch_effect 都会各自执行一次
    assert_eq!(*outer_hits.borrow(), 1);
    assert_eq!(*inner_hits.borrow(), 1);

    // 更新信号：应同时触发外层 effect 与 watch_effect
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*outer_hits.borrow(), 2);
    assert_eq!(*inner_hits.borrow(), 2);

    outer_cb.forget();
}
