//! 组件实例结构与生命周期卸载行为测试
//!
//! 覆盖两个核心场景：
//! - ComponentInternalInstance 字段构造与默认值断言
//! - 调用 unmount 时，触发 before_unmount 与 unmounted 钩子的顺序与效果
use crate::common::TestAdapter;
use js_sys::{Array, Function, Reflect};
use rue_runtime_vapor::{
    Child, ComponentInternalInstance, ComponentProps, DomAdapter, LifecycleHooks, Rue, VNodeType,
};
use wasm_bindgen_test::*;

mod common;

/// 构造基础的组件实例并检查字段默认值
#[wasm_bindgen_test]
fn construct_component_internal_instance_fields() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let vnode = rue.create_element(
        VNodeType::Element("div".into()),
        Some(ComponentProps::new()),
        vec![Child::<TestAdapter>::Text("x".into())],
    );
    let hooks = LifecycleHooks(std::collections::HashMap::new());
    let inst: ComponentInternalInstance<TestAdapter> = ComponentInternalInstance {
        vnode,
        parent: None,
        is_mounted: false,
        hooks,
        props_ro: wasm_bindgen::JsValue::UNDEFINED,
        host: wasm_bindgen::JsValue::NULL,
        error_handlers: Vec::new(),
        error: None,
        index: 0,
    };
    assert_eq!(inst.is_mounted, false);
    assert_eq!(inst.index, 0);
}

/// 卸载流程：当前实例的 before_unmount 与 unmounted 钩子依次被调用
#[wasm_bindgen_test]
fn unmount_calls_before_and_after_hooks_on_current_instance() {
    let global = js_sys::global();
    let bucket = Array::new();
    let _ =
        Reflect::set(&global, &wasm_bindgen::JsValue::from_str("_life"), &bucket.clone().into());

    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());

    let vnode = rue.create_element(VNodeType::Element("div".into()), None, vec![]);
    let hooks = LifecycleHooks(std::collections::HashMap::new());
    rue.current_instance = Some(ComponentInternalInstance::<TestAdapter> {
        vnode,
        parent: None,
        is_mounted: false,
        hooks,
        props_ro: wasm_bindgen::JsValue::UNDEFINED,
        host: wasm_bindgen::JsValue::NULL,
        error_handlers: Vec::new(),
        error: None,
        index: 0,
    });

    let before = Function::new_no_args("globalThis._life.push('before')");
    let after = Function::new_no_args("globalThis._life.push('after')");
    rue.on_before_unmount(before.into());
    rue.on_unmounted(after.into());

    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let vnode_m = rue.create_element(
        VNodeType::Element("div".into()),
        Some(ComponentProps::new()),
        vec![Child::<TestAdapter>::Text("x".into())],
    );
    rue.render(vnode_m, &mut container);
    rue.unmount(&mut container);

    let got =
        Array::from(&Reflect::get(&global, &wasm_bindgen::JsValue::from_str("_life")).unwrap());
    assert_eq!(got.length(), 2);
    assert_eq!(got.get(0).as_string().unwrap(), "before");
    assert_eq!(got.get(1).as_string().unwrap(), "after");
}
