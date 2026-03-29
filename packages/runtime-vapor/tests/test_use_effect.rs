// 用例说明：
// - 验证 useEffect 的四种核心行为：
//   1) 空依赖数组：首次立即运行一次（旧值为 undefined），后续无触发
//   2) 依赖为信号句柄：变化后 effect 重跑，且上一次返回的清理函数会在重跑前执行一次
//   3) 依赖为 Ref（含 value 字段）：当 value 改变时触发
//   4) 自定义数组相等性（equals）：当 equals 返回 true 时不触发
use js_sys::{Array, Function, Object, Reflect};
use rue_runtime_vapor::reactive::signal::create_ref;
use rue_runtime_vapor::{create_signal, set_reactive_scheduling, use_effect};
use wasm_bindgen::prelude::*;
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
/// 空依赖数组：仅在创建时运行一次（旧值为 `undefined`）。
fn use_effect_empty_deps_runs_once() {
    // 配置为同步调度，方便断言立即行为
    set_reactive_scheduling("sync");
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
