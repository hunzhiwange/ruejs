use js_sys::{Function, Object, Reflect};
use rue_runtime_vapor::{
    computed_js as computed_hook, is_reactive as is_reactive_hook, reactive_js as reactive_hook,
    readonly_js as readonly_hook, ref_js as ref_hook, set_current_instance,
    set_reactive_scheduling, shallow_reactive_js as shallow_reactive_hook,
    shallow_readonly_js as shallow_readonly_hook, signal_js as signal_hook,
    to_raw_js as to_raw_hook,
};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

use rue_runtime_vapor::vapor_with_hook_id;
use rue_runtime_vapor::with_hook_slot as with_slot;

#[wasm_bindgen_test]
fn hook_ref_basic_value_read_write() {
    set_reactive_scheduling("sync");
    set_current_instance(Object::new().into());
    let r = ref_hook(JsValue::from_f64(1.0), None, None);
    let v1 = Reflect::get(&r, &JsValue::from_str("value")).unwrap().as_f64().unwrap();
    assert_eq!(v1, 1.0);
    let _ = Reflect::set(&r, &JsValue::from_str("value"), &JsValue::from_f64(2.0));
    let v2 = Reflect::get(&r, &JsValue::from_str("value")).unwrap().as_f64().unwrap();
    assert_eq!(v2, 2.0);
}

#[wasm_bindgen_test]
fn hook_reactive_nested_write_triggers() {
    set_reactive_scheduling("sync");
    set_current_instance(Object::new().into());
    let root = Object::new();
    let user = Object::new();
    let _ = Reflect::set(&user, &JsValue::from_str("name"), &JsValue::from_str("A"));
    let _ = Reflect::set(&root, &JsValue::from_str("user"), &user);
    let proxy = reactive_hook(root.into(), None, None);
    // 写入嵌套字段
    let u2 = Reflect::get(&proxy, &JsValue::from_str("user")).unwrap();
    let _ = Reflect::set(&u2, &JsValue::from_str("name"), &JsValue::from_str("B"));
    let name = Reflect::get(&u2, &JsValue::from_str("name")).unwrap().as_string().unwrap();
    assert_eq!(name, "B");
}

#[wasm_bindgen_test]
fn hook_vapor_with_hook_id_assigns_stable_slot() {
    set_reactive_scheduling("sync");
    let inst = Object::new();
    set_current_instance(inst.clone().into());
    // 第一次为 id=a 创建插槽，内容为 "A"
    let make_a = wasm_bindgen::closure::Closure::wrap(Box::new(|| {
        with_slot(Function::new_no_args("return 'A'"))
    }) as Box<dyn FnMut() -> JsValue>);
    let ra = vapor_with_hook_id(JsValue::from_str("a"), make_a.as_ref().clone().unchecked_into());
    make_a.forget();
    assert_eq!(ra.as_string().unwrap(), "A");
    // 第二次为 id=b 创建插槽，内容为 "B"
    let make_b = wasm_bindgen::closure::Closure::wrap(Box::new(|| {
        with_slot(Function::new_no_args("return 'B'"))
    }) as Box<dyn FnMut() -> JsValue>);
    let rb = vapor_with_hook_id(JsValue::from_str("b"), make_b.as_ref().clone().unchecked_into());
    make_b.forget();
    assert_eq!(rb.as_string().unwrap(), "B");
    // 第三次再次使用 id=a，尝试覆盖为 "A2"；应复用原插槽返回 "A"
    let make_a2 = wasm_bindgen::closure::Closure::wrap(Box::new(|| {
        with_slot(Function::new_no_args("return 'A2'"))
    }) as Box<dyn FnMut() -> JsValue>);
    let ra2 = vapor_with_hook_id(JsValue::from_str("a"), make_a2.as_ref().clone().unchecked_into());
    make_a2.forget();
    assert_eq!(ra2.as_string().unwrap(), "A");
}

#[wasm_bindgen_test]
fn hook_signal_and_computed_work() {
    set_reactive_scheduling("sync");
    set_current_instance(Object::new().into());
    let s = signal_hook(JsValue::from_f64(1.0), None, None);
    let _c = computed_hook(Function::new_with_args("", "return this.get()*2").into(), None);
    // 绑定 computed 的 this 到 s 对象的 get；此处直接通过闭包创建更可靠
    let s1 = s.clone();
    let getter = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        let v = s1.get_js().as_f64().unwrap();
        JsValue::from_f64(v * 2.0)
    }) as Box<dyn FnMut() -> JsValue>);
    let c2 = computed_hook(getter.as_ref().clone().unchecked_into::<Function>().into(), None);
    getter.forget();
    // 初值
    let v0 = c2.get_js().as_f64().unwrap();
    assert_eq!(v0, 2.0);
    // 更新源信号
    s.set_js(JsValue::from_f64(3.0));
    let v1 = c2.get_js().as_f64().unwrap();
    assert_eq!(v1, 6.0);
}

#[wasm_bindgen_test]
fn hook_is_reactive_and_to_raw_smoke() {
    set_reactive_scheduling("sync");
    set_current_instance(Object::new().into());
    let obj = Object::new();
    let _ = Reflect::set(&obj, &JsValue::from_str("a"), &JsValue::from_f64(1.0));
    let proxy = reactive_hook(obj.into(), None, None);
    let _ = is_reactive_hook(proxy.clone());
    let _ = to_raw_hook(proxy.clone());
    // Ref 场景
    let r = ref_hook(JsValue::from_str("x"), None, None);
    let _ = to_raw_hook(r.clone());
}

#[wasm_bindgen_test]
fn hook_readonly_blocks_top_level_set() {
    set_reactive_scheduling("sync");
    set_current_instance(Object::new().into());
    let obj = Object::new();
    let _ = Reflect::set(&obj, &JsValue::from_str("a"), &JsValue::from_f64(1.0));
    let ro = readonly_hook(obj.into(), None);
    let _ = Reflect::set(&ro, &JsValue::from_str("a"), &JsValue::from_f64(2.0));
    let a = Reflect::get(&ro, &JsValue::from_str("a")).unwrap().as_f64().unwrap();
    assert_eq!(a, 1.0);
}

#[wasm_bindgen_test]
fn hook_shallow_reactive_child_not_reactive_and_mutates() {
    set_reactive_scheduling("sync");
    set_current_instance(Object::new().into());
    let root = Object::new();
    let nested = Object::new();
    let _ = Reflect::set(&nested, &JsValue::from_str("name"), &JsValue::from_str("A"));
    let _ = Reflect::set(&root, &JsValue::from_str("nested"), &nested);
    let proxy = shallow_reactive_hook(root.into(), None, None);
    let child = Reflect::get(&proxy, &JsValue::from_str("nested")).unwrap();
    assert!(!is_reactive_hook(child.clone()));
    let _ = Reflect::set(&child, &JsValue::from_str("name"), &JsValue::from_str("B"));
    let name = Reflect::get(&child, &JsValue::from_str("name")).unwrap().as_string().unwrap();
    assert_eq!(name, "B");
}

#[wasm_bindgen_test]
fn hook_shallow_readonly_top_level_block_child_raw_mutates() {
    set_reactive_scheduling("sync");
    set_current_instance(Object::new().into());
    let root = Object::new();
    let nested = Object::new();
    let _ = Reflect::set(&nested, &JsValue::from_str("name"), &JsValue::from_str("A"));
    let _ = Reflect::set(&root, &JsValue::from_str("nested"), &nested);
    let proxy = shallow_readonly_hook(root.into(), None);
    // 顶层写入被阻止
    let _ = Reflect::set(&proxy, &JsValue::from_str("x"), &JsValue::from_f64(1.0));
    let x = Reflect::get(&proxy, &JsValue::from_str("x")).unwrap_or(JsValue::UNDEFINED);
    assert!(x.is_undefined());
    // 子对象为原始对象，可直接修改
    let child = Reflect::get(&proxy, &JsValue::from_str("nested")).unwrap();
    let _ = Reflect::set(&child, &JsValue::from_str("name"), &JsValue::from_str("B"));
    let name = Reflect::get(&child, &JsValue::from_str("name")).unwrap().as_string().unwrap();
    assert_eq!(name, "B");
}
