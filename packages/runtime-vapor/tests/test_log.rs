use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

// 文件说明（面向 Rust 小白）：
// 这里以“黑盒方式”验证日志模块：
// - 通过注入 localStorage 配置来启用日志与设置级别
// - 重写 console.log 以捕获输出文本，并断言是否符合预期
// - 使用公开的配置函数控制包含/排除过滤

#[wasm_bindgen_test]
fn log_basic_and_context_outputs() {
    // 直接启用日志与级别，避免依赖 localStorage 注入
    rue_runtime_vapor::log::set_log_enabled(true);
    rue_runtime_vapor::log::set_log_level("debug");
    rue_runtime_vapor::log::clear_log_include();
    rue_runtime_vapor::log::clear_log_exclude();
    let global = js_sys::global();

    // 捕获 console.log 输出到一个数组
    let bucket: Array = Array::new();
    Reflect::set(&global, &JsValue::from_str("__capturedLogs"), &bucket.clone().into()).ok();
    let logger = wasm_bindgen::closure::Closure::wrap(Box::new(move |s: JsValue| {
        let arr = js_sys::Reflect::get(&js_sys::global(), &JsValue::from_str("__capturedLogs"))
            .unwrap_or(Array::new().into())
            .unchecked_into::<Array>();
        arr.push(&s);
    }) as Box<dyn FnMut(JsValue)>);
    let console = Object::new();
    let logf: Function = logger.as_ref().clone().into();
    Reflect::set(&console, &JsValue::from_str("log"), &logf).ok();
    // 提供 error 以满足测试运行时依赖
    let noop = wasm_bindgen::closure::Closure::wrap(
        Box::new(move |_s: JsValue| {}) as Box<dyn FnMut(JsValue)>
    );
    let noopf: Function = noop.as_ref().clone().into();
    Reflect::set(&console, &JsValue::from_str("error"), &noopf).ok();
    Reflect::set(&global, &JsValue::from_str("console"), &console).ok();
    logger.forget();

    // 调用日志入口
    rue_runtime_vapor::log::log("debug", "hello {name}");
    let ctx = Object::new();
    Reflect::set(&ctx, &JsValue::from_str("name"), &JsValue::from_str("Rue")).unwrap();
    rue_runtime_vapor::log::log_with_context("info", "hi {name}", ctx.into());

    // 验证捕获内容数量与包含插值
    let captured: Array = Reflect::get(&global, &JsValue::from_str("__capturedLogs"))
        .unwrap_or(Array::new().into())
        .unchecked_into();
    assert!(captured.length() >= 1);
    let mut has_rue = false;
    let mut has_hi = false;
    for i in 0..captured.length() {
        let s = captured.get(i).as_string().unwrap_or_default();
        if s.contains("Rue") {
            has_rue = true;
        }
        if s.contains("hi") {
            has_hi = true;
        }
    }
    assert!(has_rue);
    assert!(has_hi);
}

#[wasm_bindgen_test]
fn log_filters_include_exclude_and_level() {
    // 启用日志，级别为 warning（info 不应输出）
    rue_runtime_vapor::log::set_log_enabled(true);
    rue_runtime_vapor::log::set_log_level("warning");

    // 重置捕获容器
    let global = js_sys::global();
    let arr = Array::new();
    Reflect::set(&global, &JsValue::from_str("__capturedLogs2"), &arr.clone().into()).ok();
    let logger = wasm_bindgen::closure::Closure::wrap(Box::new(move |s: JsValue| {
        let a = js_sys::Reflect::get(&js_sys::global(), &JsValue::from_str("__capturedLogs2"))
            .unwrap_or(Array::new().into())
            .unchecked_into::<Array>();
        a.push(&s);
    }) as Box<dyn FnMut(JsValue)>);
    let console = Object::new();
    let logf: Function = logger.as_ref().clone().into();
    Reflect::set(&console, &JsValue::from_str("log"), &logf).ok();
    let noop2 = wasm_bindgen::closure::Closure::wrap(
        Box::new(move |_s: JsValue| {}) as Box<dyn FnMut(JsValue)>
    );
    let noopf2: Function = noop2.as_ref().clone().into();
    Reflect::set(&console, &JsValue::from_str("error"), &noopf2).ok();
    Reflect::set(&global, &JsValue::from_str("console"), &console).ok();
    logger.forget();

    // info 级别不会输出
    rue_runtime_vapor::log::log("info", "abc");
    let bucket: Array =
        Reflect::get(&global, &JsValue::from_str("__capturedLogs2")).unwrap().unchecked_into();
    assert_eq!(bucket.length(), 0);

    // 调整级别为 debug，并设置包含/排除过滤
    rue_runtime_vapor::log::set_log_level("debug");
    rue_runtime_vapor::log::clear_log_include();
    rue_runtime_vapor::log::add_log_include("abc");
    rue_runtime_vapor::log::clear_log_exclude();
    rue_runtime_vapor::log::add_log_exclude("x");

    rue_runtime_vapor::log::log("debug", "abc"); // 输出
    rue_runtime_vapor::log::log("debug", "hello"); // 不输出（不包含 abc）
    rue_runtime_vapor::log::log("debug", "abcx"); // 不输出（命中排除）

    let bucket2: Array =
        Reflect::get(&global, &JsValue::from_str("__capturedLogs2")).unwrap().unchecked_into();
    assert_eq!(bucket2.length(), 1);
    let s = bucket2.get(0).as_string().unwrap_or_default();
    assert!(s.contains("abc"));
}

#[wasm_bindgen_test]
fn noisy_runtime_vapor_debug_is_silent_unless_included() {
    rue_runtime_vapor::log::set_log_enabled(true);
    rue_runtime_vapor::log::set_log_level("debug");
    rue_runtime_vapor::log::clear_log_include();
    rue_runtime_vapor::log::clear_log_exclude();

    let global = js_sys::global();
    let bucket = Array::new();
    Reflect::set(&global, &JsValue::from_str("__capturedLogs3"), &bucket.clone().into()).ok();
    let logger = wasm_bindgen::closure::Closure::wrap(Box::new(move |s: JsValue| {
        let arr = js_sys::Reflect::get(&js_sys::global(), &JsValue::from_str("__capturedLogs3"))
            .unwrap_or(Array::new().into())
            .unchecked_into::<Array>();
        arr.push(&s);
    }) as Box<dyn FnMut(JsValue)>);
    let console = Object::new();
    let logf: Function = logger.as_ref().clone().into();
    Reflect::set(&console, &JsValue::from_str("log"), &logf).ok();
    let noop = wasm_bindgen::closure::Closure::wrap(
        Box::new(move |_s: JsValue| {}) as Box<dyn FnMut(JsValue)>
    );
    let noopf: Function = noop.as_ref().clone().into();
    Reflect::set(&console, &JsValue::from_str("error"), &noopf).ok();
    Reflect::set(&global, &JsValue::from_str("console"), &console).ok();
    logger.forget();

    rue_runtime_vapor::log::log("debug", "runtime:vapor");

    let captured: Array = Reflect::get(&global, &JsValue::from_str("__capturedLogs3"))
        .unwrap_or(Array::new().into())
        .unchecked_into();
    assert_eq!(captured.length(), 0);

    rue_runtime_vapor::log::add_log_include("runtime:vapor");
    rue_runtime_vapor::log::log("debug", "runtime:vapor");

    let captured_after_include: Array =
        Reflect::get(&global, &JsValue::from_str("__capturedLogs3"))
            .unwrap_or(Array::new().into())
            .unchecked_into();
    assert_eq!(captured_after_include.length(), 1);
    let entry = captured_after_include.get(0).as_string().unwrap_or_default();
    assert!(entry.contains("runtime:vapor"));
}
