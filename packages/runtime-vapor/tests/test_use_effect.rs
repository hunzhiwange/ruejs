// 用例说明：
// - 验证 useEffect 的四种核心行为：
//   1) 空依赖数组：首次立即运行一次（旧值为 undefined），后续无触发
//   2) 依赖为信号句柄：变化后 effect 重跑，且上一次返回的清理函数会在重跑前执行一次
//   3) 依赖为 Ref（含 value 字段）：当 value 改变时触发
//   4) 自定义数组相等性（equals）：当 equals 返回 true 时不触发
use js_sys::{Array, Function, Object, Reflect};
use rue_runtime_vapor::reactive::signal::create_ref;
use rue_runtime_vapor::reactive::core::{
    create_effect_scope, dispose_effect_scope, pop_effect_scope, push_effect_scope,
};
use rue_runtime_vapor::{
    create_signal, set_current_instance, set_reactive_scheduling, use_effect, vapor_with_hook_id,
};
use wasm_bindgen::prelude::*;
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
/// 空依赖数组：仅在创建时运行一次（旧值为 `undefined`）。
fn use_effect_empty_deps_runs_once() {
    // 配置为同步调度，方便断言立即行为
    set_reactive_scheduling("sync");
    set_current_instance(JsValue::UNDEFINED);
    // 记录运行次数（首次应为 1）
    let runs = std::rc::Rc::new(std::cell::RefCell::new(0));
    let r2 = runs.clone();
    // effect：增加计数，不返回清理函数
    let eff = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *r2.borrow_mut() += 1;
        JsValue::UNDEFINED
    }) as Box<dyn FnMut() -> JsValue>);
    let f: Function = eff.as_ref().clone().unchecked_into();
    // 空依赖：仅首次运行一次
    use_effect(f, Some(Array::new().into()), None);
    assert_eq!(*runs.borrow(), 1);
    eff.forget();
}

#[wasm_bindgen_test]
/// 依赖为信号：变化时触发 effect，且重跑前执行上一次清理。
fn use_effect_signal_dep_triggers_on_change_and_cleanup_runs() {
    // 同步调度
    set_reactive_scheduling("sync");
    set_current_instance(JsValue::UNDEFINED);
    // 依赖源：信号句柄
    let s = create_signal(JsValue::from_f64(0.0), None);
    // 记录 effect 运行次数与清理次数
    let runs = std::rc::Rc::new(std::cell::RefCell::new(0));
    let cleans = std::rc::Rc::new(std::cell::RefCell::new(0));
    let runs2 = runs.clone();
    let cleans2 = cleans.clone();
    // effect：返回清理函数；重跑前会执行上一次清理
    let eff = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *runs2.borrow_mut() += 1;
        let c = cleans2.clone();
        let cleaner = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
            *c.borrow_mut() += 1;
        }) as Box<dyn FnMut()>);
        let ret: Function = cleaner.as_ref().clone().unchecked_into();
        cleaner.forget();
        ret.into()
    }) as Box<dyn FnMut() -> JsValue>);
    let f: Function = eff.as_ref().clone().unchecked_into();
    // 依赖数组：包含信号句柄
    let deps = Array::new();
    deps.push(&JsValue::from(s.clone()));
    // 首次运行一次
    use_effect(f, Some(deps.into()), None);
    assert_eq!(*runs.borrow(), 1);
    // 改变信号：先执行清理，再重跑（清理计数 +1，运行计数 +1）
    s.set_js(JsValue::from_f64(1.0));
    assert_eq!(*cleans.borrow(), 1);
    assert_eq!(*runs.borrow(), 2);
    eff.forget();
}

#[wasm_bindgen_test]
/// 依赖为 Ref：当 `ref.value` 改变时触发 effect。
fn use_effect_ref_value_dep_triggers_on_value_change() {
    // 同步调度
    set_reactive_scheduling("sync");
    set_current_instance(JsValue::UNDEFINED);
    // 依赖源：Ref（含 value 字段）
    let r = create_ref(JsValue::from_f64(0.0), None);
    let hits = std::rc::Rc::new(std::cell::RefCell::new(0));
    let hits2 = hits.clone();
    // effect：计数
    let eff = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        JsValue::UNDEFINED
    }) as Box<dyn FnMut() -> JsValue>);
    let f: Function = eff.as_ref().clone().unchecked_into();
    // 依赖数组：包含 Ref 对象，内部会被归一化为 `() => ref.value`
    let deps = Array::new();
    deps.push(&JsValue::from(r.clone()));
    // 首次运行一次
    use_effect(f, Some(deps.into()), None);
    assert_eq!(*hits.borrow(), 1);
    // 修改 ref.value：触发一次 effect
    let _ = Reflect::set(&r, &JsValue::from_str("value"), &JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 2);
    eff.forget();
}

#[wasm_bindgen_test]
/// 自定义数组 `equals`：始终返回 true 时抑制触发（除首次）。
fn use_effect_array_equals_prevents_trigger() {
    // 同步调度
    set_reactive_scheduling("sync");
    set_current_instance(JsValue::UNDEFINED);
    // 依赖源：信号句柄
    let s = create_signal(JsValue::from_f64(0.0), None);
    let runs = std::rc::Rc::new(std::cell::RefCell::new(0));
    let runs2 = runs.clone();
    // effect：计数
    let eff = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *runs2.borrow_mut() += 1;
        JsValue::UNDEFINED
    }) as Box<dyn FnMut() -> JsValue>);
    let f: Function = eff.as_ref().clone().unchecked_into();
    // 依赖数组：包含信号句柄
    let deps = Array::new();
    deps.push(&JsValue::from(s.clone()));
    // 自定义 equals：数组比较总返回 true，抑制触发
    let opts = Object::new();
    let eq = Function::new_with_args("prev,next", "return true");
    let _ = Reflect::set(&opts, &JsValue::from_str("equals"), &eq);
    // 首次运行一次；后续 set 不触发
    use_effect(f, Some(deps.into()), Some(opts.into()));
    assert_eq!(*runs.borrow(), 1);
    s.set_js(JsValue::from_f64(1.0));
    assert_eq!(*runs.borrow(), 1);
    eff.forget();
}

#[wasm_bindgen_test]
fn use_effect_reuses_watch_across_render_scopes_and_updates_latest_callback() {
    set_reactive_scheduling("sync");
    let inst = Object::new();
    set_current_instance(inst.into());

    let source = create_signal(JsValue::from_f64(0.0), None);
    let first_hits = std::rc::Rc::new(std::cell::RefCell::new(0));
    let second_hits = std::rc::Rc::new(std::cell::RefCell::new(0));

    let scope1 = create_effect_scope();
    push_effect_scope(scope1);
    let first_hits_for_effect = first_hits.clone();
    let effect1 = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *first_hits_for_effect.borrow_mut() += 1;
        JsValue::UNDEFINED
    }) as Box<dyn FnMut() -> JsValue>);
    let effect1_fn: Function = effect1.as_ref().clone().unchecked_into();
    let source_for_deps1 = source.clone();
    let render1 = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        let deps = Array::new();
        deps.push(&JsValue::from(source_for_deps1.clone()));
        use_effect(effect1_fn.clone(), Some(deps.into()), None);
        JsValue::UNDEFINED
    }) as Box<dyn FnMut() -> JsValue>);
    let _ = vapor_with_hook_id(
        JsValue::from_str("useEffect:reuse"),
        render1.as_ref().clone().unchecked_into(),
    );
    effect1.forget();
    render1.forget();
    assert_eq!(*first_hits.borrow(), 1);
    assert_eq!(pop_effect_scope(), Some(scope1));
    dispose_effect_scope(scope1);

    let scope2 = create_effect_scope();
    push_effect_scope(scope2);
    let second_hits_for_effect = second_hits.clone();
    let effect2 = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *second_hits_for_effect.borrow_mut() += 1;
        JsValue::UNDEFINED
    }) as Box<dyn FnMut() -> JsValue>);
    let effect2_fn: Function = effect2.as_ref().clone().unchecked_into();
    let source_for_deps2 = source.clone();
    let render2 = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        let deps = Array::new();
        deps.push(&JsValue::from(source_for_deps2.clone()));
        use_effect(effect2_fn.clone(), Some(deps.into()), None);
        JsValue::UNDEFINED
    }) as Box<dyn FnMut() -> JsValue>);
    let _ = vapor_with_hook_id(
        JsValue::from_str("useEffect:reuse"),
        render2.as_ref().clone().unchecked_into(),
    );
    effect2.forget();
    render2.forget();
    assert_eq!(*first_hits.borrow(), 1);
    assert_eq!(*second_hits.borrow(), 0);
    assert_eq!(pop_effect_scope(), Some(scope2));
    dispose_effect_scope(scope2);

    source.set_js(JsValue::from_f64(1.0));
    assert_eq!(*first_hits.borrow(), 1);
    assert_eq!(*second_hits.borrow(), 1);
    set_current_instance(JsValue::UNDEFINED);
}
