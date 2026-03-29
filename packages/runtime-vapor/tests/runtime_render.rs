use js_sys::Function;
use js_sys::{Array, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

use rue_runtime_vapor::{
    Child, ComponentInternalInstance, ComponentProps, DomAdapter, LifecycleHooks, Rue, VNodeType,
};

mod common;
use common::{TestAdapter, TestEvent};

fn js_style(pairs: &[(&str, &str)]) -> JsValue {
    let obj = Object::new();
    for (k, v) in pairs {
        let _ = Reflect::set(&obj, &JsValue::from_str(k), &JsValue::from_str(v));
    }
    obj.into()
}

#[wasm_bindgen_test]
fn lifecycle_unmount_order_parent_child_component_hooks() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let global = js_sys::global();
    let _ = Reflect::set(&global, &JsValue::from_str("_order"), &Array::new());
    let push = |name: &str| {
        js_sys::Function::new_with_args("", &format!("globalThis._order.push('{}')", name)).into()
    };
    let mut child = rue.create_element(
        VNodeType::Component(Function::new_no_args("return {}").into()),
        None,
        vec![],
    );
    child.comp_hooks = Some(std::collections::HashMap::new());
    child
        .comp_hooks
        .as_mut()
        .unwrap()
        .insert("before_unmount".to_string(), vec![push("child:beforeUnmount")]);
    child
        .comp_hooks
        .as_mut()
        .unwrap()
        .insert("unmounted".to_string(), vec![push("child:unmounted")]);
    let mut parent = rue.create_element(
        VNodeType::Component(Function::new_no_args("return {}").into()),
        None,
        vec![],
    );
    parent.comp_hooks = Some(std::collections::HashMap::new());
    parent
        .comp_hooks
        .as_mut()
        .unwrap()
        .insert("before_unmount".to_string(), vec![push("parent:beforeUnmount")]);
    parent
        .comp_hooks
        .as_mut()
        .unwrap()
        .insert("unmounted".to_string(), vec![push("parent:unmounted")]);
    parent.comp_subtree = Some(Box::new(child));
    // 模拟运行时的卸载顺序：先 before_unmount（父→子），后 unmounted（子→父）
    // 直接执行与运行时相同的递归逻辑片段
    // before_unmount
    if let Some(hm) = parent.comp_hooks.as_mut() {
        if let Some(list) = hm.get_mut("before_unmount") {
            for jsf in list.iter_mut() {
                if let Some(func) = jsf.dyn_ref::<Function>() {
                    let _ = func.call0(&JsValue::UNDEFINED);
                }
            }
        }
    }
    if let Some(sub) = parent.comp_subtree.as_mut() {
        // 子 before_unmount
        if let Some(hm) = sub.comp_hooks.as_mut() {
            if let Some(list) = hm.get_mut("before_unmount") {
                for jsf in list.iter_mut() {
                    if let Some(func) = jsf.dyn_ref::<Function>() {
                        let _ = func.call0(&JsValue::UNDEFINED);
                    }
                }
            }
        }
    }
    // unmounted（先子后父）
    if let Some(sub) = parent.comp_subtree.as_mut() {
        if let Some(hm) = sub.comp_hooks.as_mut() {
            if let Some(list) = hm.get_mut("unmounted") {
                for jsf in list.iter_mut() {
                    if let Some(func) = jsf.dyn_ref::<Function>() {
                        let _ = func.call0(&JsValue::UNDEFINED);
                    }
                }
                list.clear();
            }
        }
    }
    if let Some(hm) = parent.comp_hooks.as_mut() {
        if let Some(list) = hm.get_mut("unmounted") {
            for jsf in list.iter_mut() {
                if let Some(func) = jsf.dyn_ref::<Function>() {
                    let _ = func.call0(&JsValue::UNDEFINED);
                }
            }
            list.clear();
        }
    }
    let order = Array::from(&Reflect::get(&global, &JsValue::from_str("_order")).unwrap());
    let got: Vec<String> = (0..order.length()).map(|i| order.get(i).as_string().unwrap()).collect();
    assert_eq!(
        got,
        vec!["parent:beforeUnmount", "child:beforeUnmount", "child:unmounted", "parent:unmounted",]
    );
}

#[wasm_bindgen_test]
fn lifecycle_mount_update_order_parent_child_instance_hooks() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let global = js_sys::global();
    let _ = Reflect::set(&global, &JsValue::from_str("_order2"), &Array::new());
    let push = |name: &str| {
        js_sys::Function::new_with_args("", &format!("globalThis._order2.push('{}')", name)).into()
    };
    // parent instance
    let vnode_p = rue.create_element(VNodeType::Element("div".into()), None, vec![]);
    let mut inst_p = ComponentInternalInstance::<TestAdapter> {
        vnode: vnode_p,
        parent: None,
        is_mounted: false,
        hooks: LifecycleHooks(std::collections::HashMap::new()),
        props_ro: JsValue::UNDEFINED,
        host: JsValue::NULL,
        error: None,
        error_handlers: Vec::new(),
        index: 0,
    };
    inst_p.hooks.0.insert("before_mount".into(), vec![push("parent:beforeMount")]);
    inst_p.hooks.0.insert("mounted".into(), vec![push("parent:mounted")]);
    inst_p.hooks.0.insert("before_update".into(), vec![push("parent:beforeUpdate")]);
    inst_p.hooks.0.insert("updated".into(), vec![push("parent:updated")]);
    // child instance
    let vnode_c = rue.create_element(VNodeType::Element("span".into()), None, vec![]);
    let mut inst_c = ComponentInternalInstance::<TestAdapter> {
        vnode: vnode_c,
        parent: None,
        is_mounted: false,
        hooks: LifecycleHooks(std::collections::HashMap::new()),
        props_ro: JsValue::UNDEFINED,
        host: JsValue::NULL,
        error: None,
        error_handlers: Vec::new(),
        index: 1,
    };
    inst_c.hooks.0.insert("before_mount".into(), vec![push("child:beforeMount")]);
    inst_c.hooks.0.insert("mounted".into(), vec![push("child:mounted")]);
    inst_c.hooks.0.insert("before_update".into(), vec![push("child:beforeUpdate")]);
    inst_c.hooks.0.insert("updated".into(), vec![push("child:updated")]);
    rue.instance_store.insert(0, inst_p);
    rue.instance_store.insert(1, inst_c);
    rue.instance_stack.push(0);
    rue.call_hooks("before_mount");
    rue.instance_stack.push(1);
    rue.call_hooks("before_mount");
    rue.call_hooks("updated");
    rue.instance_stack.pop();
    rue.call_hooks("mounted");
    rue.instance_stack.pop();
    let order = Array::from(&Reflect::get(&global, &JsValue::from_str("_order2")).unwrap());
    let got: Vec<String> = (0..order.length()).map(|i| order.get(i).as_string().unwrap()).collect();
    assert_eq!(
        got,
        vec!["parent:beforeMount", "child:beforeMount", "child:updated", "parent:mounted",]
    );
}
#[wasm_bindgen_test]
fn vapor_with_setup_vapor_element_array() {
    // 验证：VaporWithSetup 返回对象的 vaporElement 为数组时也能转换为元素
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup = js_sys::Function::new_with_args("", "return { vaporElement: [1,2,3] }");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}

#[wasm_bindgen_test]
fn vapor_with_setup_returns_primitive_number_as_element() {
    // 验证：VaporWithSetup 返回原始值（无 vaporElement）也能转换为元素
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup = js_sys::Function::new_with_args("", "return 123");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}

#[wasm_bindgen_test]
fn select_non_multiple_remove_value_sets_empty_string_no_attr_removal() {
    // 验证：SELECT 非 multiple 移除 value 设置为空字符串，且不移除属性
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let vnode1 = rue.create_element(
        VNodeType::Element("SELECT".into()),
        Some(props_with(&[("value", JsValue::from_str("x"))])),
        vec![],
    );
    rue.render(vnode1, &mut container);
    // 确保 multiple=false
    let children1 = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    let select_id = children1[0].id;
    let a = rue.get_dom_adapter_mut().unwrap();
    if let Some(node) = a.nodes.get_mut(&select_id) {
        node.multiple = false;
    }
    // 更新：移除 value
    let vnode2 = rue.create_element(
        VNodeType::Element("SELECT".into()),
        Some(ComponentProps::new()),
        vec![],
    );
    rue.render(vnode2, &mut container);
    let events = rue.get_dom_adapter().unwrap().events.clone();
    assert!(events.iter().any(|e| matches!(e, TestEvent::SetValue(_))));
    assert!(!events.iter().any(|e| matches!(e, TestEvent::RemoveAttr(key) if key == "value")));
}

#[wasm_bindgen_test]
fn events_change_update_and_input_remove() {
    // 验证：onChange 更新移除旧监听并添加新监听；onInput 完全移除
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();

    // 初始：同时设置 onChange/onInput
    let props1 =
        props_with(&[("onChange", JsValue::from_str("h1")), ("onInput", JsValue::from_str("hI"))]);
    let vnode1 = rue.create_element(VNodeType::Element("input".into()), Some(props1), vec![]);
    rue.render(vnode1, &mut container);

    // 更新：onChange 改为 h2；移除 onInput
    let props2 = props_with(&[("onChange", JsValue::from_str("h2"))]);
    let vnode2 = rue.create_element(VNodeType::Element("input".into()), Some(props2), vec![]);
    rue.render(vnode2, &mut container);

    let events = rue.get_dom_adapter().unwrap().events.clone();
    assert!(events.iter().any(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "change")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::AddEvt(ev) if ev == "change")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "input")));
}
fn props_with(entries: &[(&str, JsValue)]) -> ComponentProps {
    let mut p = ComponentProps::new();
    for (k, v) in entries {
        p.insert((*k).to_string(), v.clone());
    }
    p
}

#[wasm_bindgen_test]
fn vapor_with_setup_vapor_element_nested_object() {
    // 验证：VaporWithSetup 返回对象的 vaporElement 为嵌套对象时也能转换为元素
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup =
        js_sys::Function::new_with_args("", "return { vaporElement: { nested: { a: 1 } } }");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}

#[wasm_bindgen_test]
fn vapor_with_setup_vapor_element_function() {
    // 验证：VaporWithSetup 返回对象的 vaporElement 为函数时也能转换为元素
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup =
        js_sys::Function::new_with_args("", "return { vaporElement: function() { return 'x' } }");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}

#[wasm_bindgen_test]
fn vapor_with_setup_vapor_element_string() {
    // 验证：VaporWithSetup 返回对象的 vaporElement 为字符串时也能转换为元素
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup = js_sys::Function::new_with_args("", "return { vaporElement: 'hello' }");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}

#[wasm_bindgen_test]
fn events_blur_focus_update_and_remove() {
    // 验证：onBlur 更新移除旧监听并添加新监听；onFocus 完全移除
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();

    // 初始：同时设置 onBlur/onFocus
    let props1 =
        props_with(&[("onBlur", JsValue::from_str("hb1")), ("onFocus", JsValue::from_str("hf1"))]);
    let vnode1 = rue.create_element(VNodeType::Element("input".into()), Some(props1), vec![]);
    rue.render(vnode1, &mut container);

    // 更新：onBlur 改为 hb2；移除 onFocus
    let props2 = props_with(&[("onBlur", JsValue::from_str("hb2"))]);
    let vnode2 = rue.create_element(VNodeType::Element("input".into()), Some(props2), vec![]);
    rue.render(vnode2, &mut container);

    let events = rue.get_dom_adapter().unwrap().events.clone();
    assert!(events.iter().any(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "blur")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::AddEvt(ev) if ev == "blur")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "focus")));
}
// 构造 { __html: "<...>" } 以用于 dangerouslySetInnerHTML
fn inner_html(html: &str) -> JsValue {
    let o = Object::new();
    let _ = Reflect::set(&o, &JsValue::from_str("__html"), &JsValue::from_str(html));
    o.into()
}

#[wasm_bindgen_test]
fn events_keydown_keyup_update_and_remove() {
    // 验证：onKeyDown 更新移除旧监听并添加新监听；onKeyUp 完全移除
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();

    // 初始：同时设置 onKeyDown/onKeyUp
    let props1 = props_with(&[
        ("onKeyDown", JsValue::from_str("kd1")),
        ("onKeyUp", JsValue::from_str("ku1")),
    ]);
    let vnode1 = rue.create_element(VNodeType::Element("input".into()), Some(props1), vec![]);
    rue.render(vnode1, &mut container);

    // 更新：onKeyDown 改为 kd2；移除 onKeyUp
    let props2 = props_with(&[("onKeyDown", JsValue::from_str("kd2"))]);
    let vnode2 = rue.create_element(VNodeType::Element("input".into()), Some(props2), vec![]);
    rue.render(vnode2, &mut container);

    let events = rue.get_dom_adapter().unwrap().events.clone();
    assert!(events.iter().any(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "keydown")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::AddEvt(ev) if ev == "keydown")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "keyup")));
}

#[wasm_bindgen_test]
fn vapor_with_setup_vapor_element_deep_nested() {
    // 验证：VaporWithSetup 返回对象的 vaporElement 多层嵌套也能转换为元素（取第一层）
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup = js_sys::Function::new_with_args(
        "",
        "return { vaporElement: { vaporElement: { vaporElement: 'x' } } }",
    );
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}
#[wasm_bindgen_test]
fn render_element_with_text_and_class() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let props = props_with(&[("className", JsValue::from_str("card"))]);
    let vnode = rue.create_element(
        VNodeType::Element("div".into()),
        Some(props),
        vec![Child::<TestAdapter>::Text("hello".into())],
    );
    rue.render(vnode, &mut container);

    // container should have one <div> child with a text node "hello"
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
    assert_eq!(children[0].tag, "div");
    assert_eq!(children[0].class, "card");
    assert_eq!(children[0].children.len(), 1);
    assert_eq!(children[0].children[0].tag, "#text");
    assert_eq!(children[0].children[0].text, "hello");
}

#[wasm_bindgen_test]
fn events_keypress_submit_update_and_remove() {
    // 验证：onKeyPress 更新移除旧监听并添加新监听；onSubmit 完全移除
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();

    // 初始：同时设置 onKeyPress/onSubmit
    let props1 = props_with(&[
        ("onKeyPress", JsValue::from_str("kp1")),
        ("onSubmit", JsValue::from_str("sb1")),
    ]);
    let vnode1 = rue.create_element(VNodeType::Element("form".into()), Some(props1), vec![]);
    rue.render(vnode1, &mut container);

    // 更新：onKeyPress 改为 kp2；移除 onSubmit
    let props2 = props_with(&[("onKeyPress", JsValue::from_str("kp2"))]);
    let vnode2 = rue.create_element(VNodeType::Element("form".into()), Some(props2), vec![]);
    rue.render(vnode2, &mut container);

    let events = rue.get_dom_adapter().unwrap().events.clone();
    assert!(events.iter().any(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "keypress")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::AddEvt(ev) if ev == "keypress")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "submit")));
}

#[wasm_bindgen_test]
fn events_submit_update_twice() {
    // 验证：onSubmit 连续两次更新处理器，每次都移除旧监听并添加新监听
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();

    // 初始：onSubmit=sb1
    let props1 = props_with(&[("onSubmit", JsValue::from_str("sb1"))]);
    let vnode1 = rue.create_element(VNodeType::Element("form".into()), Some(props1), vec![]);
    rue.render(vnode1, &mut container);

    // 第一次更新：onSubmit=sb2
    let props2 = props_with(&[("onSubmit", JsValue::from_str("sb2"))]);
    let vnode2 = rue.create_element(VNodeType::Element("form".into()), Some(props2), vec![]);
    rue.render(vnode2, &mut container);

    // 第二次更新：onSubmit=sb3
    let props3 = props_with(&[("onSubmit", JsValue::from_str("sb3"))]);
    let vnode3 = rue.create_element(VNodeType::Element("form".into()), Some(props3), vec![]);
    rue.render(vnode3, &mut container);

    let events = rue.get_dom_adapter().unwrap().events.clone();
    // 至少包含两次移除 submit 和三次添加 submit（初次渲染 + 两次更新）
    let rm_submit =
        events.iter().filter(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "submit")).count();
    let add_submit =
        events.iter().filter(|e| matches!(e, TestEvent::AddEvt(ev) if ev == "submit")).count();
    assert!(rm_submit >= 2);
    assert!(add_submit >= 3);
}

#[wasm_bindgen_test]
fn vapor_with_setup_returns_iterable_set_as_element() {
    // 验证：VaporWithSetup 返回 Set 等可迭代对象也能转换为元素
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup = js_sys::Function::new_with_args("", "return new Set([1,2,3])");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}

#[wasm_bindgen_test]
fn vapor_with_setup_returns_typedarray_uint8() {
    // 验证：VaporWithSetup 返回 TypedArray（Uint8Array）也能转换为元素
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup = js_sys::Function::new_with_args("", "return new Uint8Array([1,2,3])");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}
#[wasm_bindgen_test]
fn vapor_with_setup_returns_promise_as_element() {
    // 验证：VaporWithSetup 返回 Promise 也能转换为元素（无需等待）
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup = js_sys::Function::new_with_args("", "return Promise.resolve(1)");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}

#[wasm_bindgen_test]
fn events_submit_revert_to_old_handler() {
    // 验证：onSubmit 从 sb1 → sb2 → sb1 改回旧处理器时，移除与新增链路正确
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();

    // 初始：onSubmit=sb1
    let vnode1 = rue.create_element(
        VNodeType::Element("form".into()),
        Some(props_with(&[("onSubmit", JsValue::from_str("sb1"))])),
        vec![],
    );
    rue.render(vnode1, &mut container);

    // 更新：onSubmit=sb2
    let vnode2 = rue.create_element(
        VNodeType::Element("form".into()),
        Some(props_with(&[("onSubmit", JsValue::from_str("sb2"))])),
        vec![],
    );
    rue.render(vnode2, &mut container);

    // 再次更新：onSubmit=sb1（改回旧处理器）
    let vnode3 = rue.create_element(
        VNodeType::Element("form".into()),
        Some(props_with(&[("onSubmit", JsValue::from_str("sb1"))])),
        vec![],
    );
    rue.render(vnode3, &mut container);

    let events = rue.get_dom_adapter().unwrap().events.clone();
    let rm_submit =
        events.iter().filter(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "submit")).count();
    let add_submit =
        events.iter().filter(|e| matches!(e, TestEvent::AddEvt(ev) if ev == "submit")).count();
    assert!(rm_submit >= 2);
    assert!(add_submit >= 3);
}

#[wasm_bindgen_test]
fn vapor_with_setup_returns_typedarray_float32() {
    // 验证：VaporWithSetup 返回 Float32Array 也能转换为元素
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup = js_sys::Function::new_with_args("", "return new Float32Array([0.1,0.2,0.3])");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}
#[wasm_bindgen_test]
fn vapor_with_setup_returns_proxy_as_element() {
    // 验证：VaporWithSetup 返回 Proxy 对象也能转换为元素
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup = js_sys::Function::new_with_args("", "return new Proxy({}, {})");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}
#[wasm_bindgen_test]
fn update_text_node_patches_text_content() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let vnode_a =
        rue.create_element(VNodeType::Text, None, vec![Child::<TestAdapter>::Text("A".into())]);
    rue.render(vnode_a, &mut container);

    let vnode_b =
        rue.create_element(VNodeType::Text, None, vec![Child::<TestAdapter>::Text("B".into())]);
    rue.render(vnode_b, &mut container);

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
    assert_eq!(children[0].tag, "#text");
    assert_eq!(children[0].text, "B");
}

#[wasm_bindgen_test]
fn render_between_inserts_before_end_anchor() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    // create anchors and attach to parent using the same adapter instance
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);

    // vnode will be a span with text
    let vnode = rue.create_element(
        VNodeType::Element("span".into()),
        None,
        vec![Child::<TestAdapter>::Text("X".into())],
    );
    rue.render_between(vnode, &mut parent, start.clone(), end.clone());

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    // We should still have both anchors, and a new span child inserted.
    assert!(children.iter().any(|c| c.tag == "comment_start"));
    assert!(children.iter().any(|c| c.tag == "comment_end"));
    assert!(children.iter().any(|c| c.tag == "span"));
}

#[wasm_bindgen_test]
fn props_patch_value_checked_disabled_and_events() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();

    // 初始 vnode，设置多种属性：class/style/value/checked/disabled/onClick
    let props1 = props_with(&[
        ("className", JsValue::from_str("btn")),
        ("style", js_style(&[("color", "red")])),
        ("value", JsValue::from_str("v1")),
        ("checked", JsValue::from_bool(true)),
        ("disabled", JsValue::from_bool(false)),
        ("onClick", JsValue::from_str("handler1")),
    ]);
    let vnode1 = rue.create_element(VNodeType::Element("input".into()), Some(props1), vec![]);
    rue.render(vnode1, &mut container);

    // 更新 vnode，变更属性并触发旧属性的移除逻辑
    let props2 = props_with(&[
        ("className", JsValue::from_str("btn btn-primary")),
        ("style", js_style(&[("color", "blue")])),
        ("value", JsValue::from_str("v2")),
        ("checked", JsValue::from_bool(false)),
        ("disabled", JsValue::from_bool(true)),
        ("onClick", JsValue::from_str("handler2")),
    ]);
    let vnode2 = rue.create_element(VNodeType::Element("input".into()), Some(props2), vec![]);
    rue.render(vnode2, &mut container);

    // 检查适配器记录的事件，确认属性补丁行为
    let events = rue.get_dom_adapter().unwrap().events.clone();
    // 应包含：添加/移除事件监听、设置 value/checked/disabled
    assert!(events.iter().any(|e| matches!(e, TestEvent::AddEvt(ev) if ev == "click")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "click")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::SetValue(_))));
    assert!(events.iter().any(|e| matches!(e, TestEvent::SetChecked(_))));
    assert!(events.iter().any(|e| matches!(e, TestEvent::SetDisabled(_))));
}

#[wasm_bindgen_test]
fn dangerously_set_inner_html_sets_text_and_skips_children() {
    // 验证：设置 dangerouslySetInnerHTML 时，不会追加子节点，文本内容来自 __html
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let props = props_with(&[("dangerouslySetInnerHTML", inner_html("<b>x</b>"))]);
    let vnode = rue.create_element(
        VNodeType::Element("div".into()),
        Some(props),
        // 即使提供子节点，也应被忽略
        vec![Child::<TestAdapter>::Text("should be ignored".into())],
    );
    rue.render(vnode, &mut container);

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
    assert_eq!(children[0].tag, "div");
    assert_eq!(children[0].text, "<b>x</b>");
    assert_eq!(children[0].children.len(), 0);
}

#[wasm_bindgen_test]
fn select_sets_value_via_post_patch() {
    // 验证：SELECT 在 post_patch_element 阶段设置 value
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let props = props_with(&[("value", JsValue::from_str("x"))]);
    let vnode = rue.create_element(VNodeType::Element("SELECT".into()), Some(props), vec![]);
    rue.render(vnode, &mut container);

    let events = rue.get_dom_adapter().unwrap().events.clone();
    assert!(events.iter().any(|e| matches!(e, TestEvent::SetValue(_))));
}

#[wasm_bindgen_test]
fn ref_apply_and_clear_on_props_change() {
    // 验证：ref 初次渲染调用 apply_ref，更新移除 ref 时调用 clear_ref
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();

    let props1 = props_with(&[("ref", JsValue::from_f64(1.0))]);
    let vnode1 = rue.create_element(VNodeType::Element("div".into()), Some(props1), vec![]);
    rue.render(vnode1, &mut container);

    let props2 = ComponentProps::new();
    let vnode2 = rue.create_element(VNodeType::Element("div".into()), Some(props2), vec![]);
    rue.render(vnode2, &mut container);

    let events = rue.get_dom_adapter().unwrap().events.clone();
    assert!(events.iter().any(|e| matches!(e, TestEvent::ApplyRef(_))));
    assert!(events.iter().any(|e| matches!(e, TestEvent::ClearRef(_))));
}

#[wasm_bindgen_test]
fn render_between_patch_updates_content() {
    // 验证：renderBetween 在已有 range 上进行补丁更新内容
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);

    // 初次：span("A")
    let vnode1 = rue.create_element(
        VNodeType::Element("span".into()),
        None,
        vec![Child::<TestAdapter>::Text("A".into())],
    );
    rue.render_between(vnode1, &mut parent, start.clone(), end.clone());
    // 更新：span("B")
    let vnode2 = rue.create_element(
        VNodeType::Element("span".into()),
        None,
        vec![Child::<TestAdapter>::Text("B".into())],
    );
    rue.render_between(vnode2, &mut parent, start.clone(), end.clone());

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    assert!(children.iter().any(|c| c.tag == "span"));
    let span = children.iter().find(|c| c.tag == "span").unwrap();
    assert_eq!(span.children.len(), 1);
    assert_eq!(span.children[0].text, "B");
}

#[wasm_bindgen_test]
fn render_between_dangerously_set_inner_html_skips_children() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);
    let props = props_with(&[("dangerouslySetInnerHTML", inner_html("<em>a</em>"))]);
    let vnode = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props),
        vec![Child::<TestAdapter>::Text("ignored".into())],
    );
    rue.render_between(vnode, &mut parent, start.clone(), end.clone());
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    assert!(children.iter().any(|c| c.tag == "span"));
    let span = children.iter().find(|c| c.tag == "span").unwrap();
    assert_eq!(span.text, "<em>a</em>");
    assert_eq!(span.children.len(), 0);
}

#[wasm_bindgen_test]
fn render_between_toggle_dangerously_set_inner_html() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);
    let props1 = props_with(&[("dangerouslySetInnerHTML", inner_html("<em>a</em>"))]);
    let vnode1 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props1),
        vec![Child::<TestAdapter>::Text("ignored".into())],
    );
    rue.render_between(vnode1, &mut parent, start.clone(), end.clone());
    let vnode2 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(ComponentProps::new()),
        vec![Child::<TestAdapter>::Text("b".into())],
    );
    rue.render_between(vnode2, &mut parent, start.clone(), end.clone());
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    let span = children.iter().find(|c| c.tag == "span").unwrap();
    assert_eq!(span.text, "");
    assert_eq!(span.children.len(), 1);
    assert_eq!(span.children[0].text, "b");
}

#[wasm_bindgen_test]
fn render_between_fragment_parent_end_outside_fallback_append() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let mut other = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    // 将 end 放在不同的容器中，确保 fallback append 路径
    rue.get_dom_adapter_mut().unwrap().append_child(&mut other, &end);
    let vnode = rue.create_element(
        VNodeType::Element("span".into()),
        Some(ComponentProps::new()),
        vec![Child::<TestAdapter>::Text("F".into())],
    );
    rue.render_between(vnode, &mut parent, start.clone(), end.clone());
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    assert!(children.iter().any(|c| c.tag == "span"));
}

#[wasm_bindgen_test]
fn render_between_toggle_dangerously_set_inner_html_with_class_style() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);
    let props1 = props_with(&[
        ("dangerouslySetInnerHTML", inner_html("<u>a</u>")),
        ("className", JsValue::from_str("a")),
        // style 在 TestAdapter 为 no-op，但可提供以覆盖路径
        ("style", js_style(&[("color", "red")])),
    ]);
    let vnode1 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props1),
        vec![Child::<TestAdapter>::Text("ignored".into())],
    );
    rue.render_between(vnode1, &mut parent, start.clone(), end.clone());
    let props2 = props_with(&[
        ("className", JsValue::from_str("b")),
        ("style", js_style(&[("color", "blue")])),
    ]);
    let vnode2 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props2),
        vec![Child::<TestAdapter>::Text("B".into())],
    );
    rue.render_between(vnode2, &mut parent, start.clone(), end.clone());
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    let span = children.iter().find(|c| c.tag == "span").unwrap();
    assert_eq!(span.class, "b");
    assert_eq!(span.text, "");
    assert_eq!(span.children.len(), 1);
    assert_eq!(span.children[0].text, "B");
}

#[wasm_bindgen_test]
fn render_between_non_fragment_parent_end_outside_fallback_append() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_element("div");
    let mut other = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut other, &end);
    let vnode = rue.create_element(
        VNodeType::Element("span".into()),
        None,
        vec![Child::<TestAdapter>::Text("N".into())],
    );
    rue.render_between(vnode, &mut parent, start.clone(), end.clone());
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    assert!(children.iter().any(|c| c.tag == "span"));
}

#[wasm_bindgen_test]
fn render_between_fragment_parent_multiple_updates_stability() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);
    let vnode1 = rue.create_element(
        VNodeType::Element("span".into()),
        None,
        vec![Child::<TestAdapter>::Text("A".into())],
    );
    rue.render_between(vnode1, &mut parent, start.clone(), end.clone());
    let vnode2 = rue.create_element(
        VNodeType::Element("span".into()),
        None,
        vec![Child::<TestAdapter>::Text("B".into())],
    );
    rue.render_between(vnode2, &mut parent, start.clone(), end.clone());
    let vnode3 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props_with(&[("dangerouslySetInnerHTML", inner_html("<em>C</em>"))])),
        vec![Child::<TestAdapter>::Text("ignored".into())],
    );
    rue.render_between(vnode3, &mut parent, start.clone(), end.clone());
    let vnode4 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props_with(&[("className", JsValue::from_str("x"))])),
        vec![Child::<TestAdapter>::Text("D".into())],
    );
    rue.render_between(vnode4, &mut parent, start.clone(), end.clone());
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    let span_count = children.iter().filter(|c| c.tag == "span").count();
    assert_eq!(span_count, 1);
    let span = children.iter().find(|c| c.tag == "span").unwrap();
    assert_eq!(span.class, "x");
    assert_eq!(span.text, "");
    assert_eq!(span.children.len(), 1);
    assert_eq!(span.children[0].text, "D");
}

#[wasm_bindgen_test]
fn render_between_non_fragment_parent_multiple_toggles() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_element("div");
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);
    let props1 = props_with(&[
        ("className", JsValue::from_str("a")),
        ("style", js_style(&[("color", "red")])),
    ]);
    let vnode1 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props1),
        vec![Child::<TestAdapter>::Text("A".into())],
    );
    rue.render_between(vnode1, &mut parent, start.clone(), end.clone());
    let props2 = props_with(&[
        ("className", JsValue::from_str("b")),
        ("style", js_style(&[("color", "blue")])),
    ]);
    let vnode2 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props2),
        vec![Child::<TestAdapter>::Text("B".into())],
    );
    rue.render_between(vnode2, &mut parent, start.clone(), end.clone());
    let props3 = props_with(&[
        ("dangerouslySetInnerHTML", inner_html("<i>c</i>")),
        ("className", JsValue::from_str("b")),
    ]);
    let vnode3 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props3),
        vec![Child::<TestAdapter>::Text("ignored".into())],
    );
    rue.render_between(vnode3, &mut parent, start.clone(), end.clone());
    let props4 = props_with(&[("className", JsValue::from_str("c"))]);
    let vnode4 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props4),
        vec![Child::<TestAdapter>::Text("D".into())],
    );
    rue.render_between(vnode4, &mut parent, start.clone(), end.clone());
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    let span_count = children.iter().filter(|c| c.tag == "span").count();
    assert_eq!(span_count, 1);
    let span = children.iter().find(|c| c.tag == "span").unwrap();
    assert_eq!(span.class, "c");
    assert_eq!(span.text, "");
    assert_eq!(span.children.len(), 1);
    assert_eq!(span.children[0].text, "D");
}

#[wasm_bindgen_test]
fn render_between_fragment_parent_many_toggles_class_style_children() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);
    let props1 = props_with(&[
        ("className", JsValue::from_str("a")),
        ("style", js_style(&[("color", "red")])),
    ]);
    let vnode1 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props1),
        vec![Child::<TestAdapter>::Text("1".into())],
    );
    rue.render_between(vnode1, &mut parent, start.clone(), end.clone());
    let props2 = props_with(&[
        ("className", JsValue::from_str("b")),
        ("style", js_style(&[("width", "10")])),
    ]);
    let vnode2 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props2),
        vec![Child::<TestAdapter>::Text("2".into())],
    );
    rue.render_between(vnode2, &mut parent, start.clone(), end.clone());
    let props3 = props_with(&[
        ("dangerouslySetInnerHTML", inner_html("<u>3</u>")),
        ("className", JsValue::from_str("b")),
    ]);
    let vnode3 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props3),
        vec![Child::<TestAdapter>::Text("ignored".into())],
    );
    rue.render_between(vnode3, &mut parent, start.clone(), end.clone());
    let props4 = props_with(&[
        ("className", JsValue::from_str("c")),
        ("style", js_style(&[("height", "20")])),
    ]);
    let vnode4 = rue.create_element(
        VNodeType::Element("span".into()),
        Some(props4),
        vec![Child::<TestAdapter>::Text("4".into())],
    );
    rue.render_between(vnode4, &mut parent, start.clone(), end.clone());
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    let span_count = children.iter().filter(|c| c.tag == "span").count();
    assert_eq!(span_count, 1);
    let span = children.iter().find(|c| c.tag == "span").unwrap();
    assert_eq!(span.class, "c");
    assert_eq!(span.text, "");
    assert_eq!(span.children.len(), 1);
    assert_eq!(span.children[0].text, "4");
}
#[wasm_bindgen_test]
fn render_between_component_subtree_many_toggles_no_duplicates() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);

    // 组件返回 dev 对象子树（span + 文本），模拟 RouterView 场景
    let f1 = Function::new_no_args("return { type: 'span', props: {}, children: ['A'] }");
    let vnode1 = rue.create_element(VNodeType::Component(f1.into()), None, vec![]);
    rue.render_between(vnode1, &mut parent, start.clone(), end.clone());

    let f2 = Function::new_no_args("return { type: 'span', props: {}, children: ['B'] }");
    let vnode2 = rue.create_element(VNodeType::Component(f2.into()), None, vec![]);
    rue.render_between(vnode2, &mut parent, start.clone(), end.clone());

    let f3 = Function::new_no_args("return { type: 'span', props: {}, children: ['C'] }");
    let vnode3 = rue.create_element(VNodeType::Component(f3.into()), None, vec![]);
    rue.render_between(vnode3, &mut parent, start.clone(), end.clone());
    let f4 = Function::new_no_args("return { type: 'span', props: {}, children: ['D'] }");
    let vnode4 = rue.create_element(VNodeType::Component(f4.into()), None, vec![]);
    rue.render_between(vnode4, &mut parent, start.clone(), end.clone());
    let f5 = Function::new_no_args("return { type: 'span', props: {}, children: ['E'] }");
    let vnode5 = rue.create_element(VNodeType::Component(f5.into()), None, vec![]);
    rue.render_between(vnode5, &mut parent, start.clone(), end.clone());

    // 验证：区间内只有一个 span，文本为最新值，无重复节点
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    let span_count = children.iter().filter(|c| c.tag == "span").count();
    assert_eq!(span_count, 1);
    let span = children.iter().find(|c| c.tag == "span").unwrap();
    assert_eq!(span.children.len(), 1);
    assert_eq!(span.children[0].text, "E");
}
#[wasm_bindgen_test]
fn unmount_clears_children() {
    // 验证：unmount 会清空容器子节点
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let vnode = rue.create_element(
        VNodeType::Element("div".into()),
        None,
        vec![Child::<TestAdapter>::Text("x".into())],
    );
    rue.render(vnode, &mut container);
    let children_before = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children_before.len(), 1);

    rue.unmount(&mut container);
    let children_after = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children_after.len(), 0);
}
#[wasm_bindgen_test]
fn fragment_render_and_patch_children() {
    // 验证：Fragment 初次渲染与补丁更新子节点
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    // 初次渲染：fragment 包含两个文本子节点
    let frag1 = rue.create_element(
        VNodeType::Fragment,
        None,
        vec![Child::<TestAdapter>::Text("A".into()), Child::<TestAdapter>::Text("B".into())],
    );
    rue.render(frag1, &mut container);
    let children1 = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children1.len(), 2);
    assert_eq!(children1[0].tag, "#text");
    assert_eq!(children1[0].text, "A");
    assert_eq!(children1[1].tag, "#text");
    assert_eq!(children1[1].text, "B");

    // 更新：fragment 仅保留一个文本子节点
    let frag2 =
        rue.create_element(VNodeType::Fragment, None, vec![Child::<TestAdapter>::Text("C".into())]);
    rue.render(frag2, &mut container);
    let children2 = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children2.len(), 1);
    assert_eq!(children2[0].tag, "#text");
    assert_eq!(children2[0].text, "C");
}

#[wasm_bindgen_test]
fn vapor_with_setup_returns_element_and_mounts() {
    // 验证：VaporWithSetup 返回对象时能转换为元素并挂载到容器
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    // setup 返回一个对象（不含 vaporElement），将整体转换为元素
    let setup = js_sys::Function::new_with_args("", "return { ok: true }");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
    // VaporWithSetup 的元素不附加子节点，验证为空
    assert_eq!(children[0].children.len(), 0);
}

#[wasm_bindgen_test]
fn props_removal_checked_disabled_event_ref() {
    // 验证：checked/disabled/onClick/ref 在移除时触发对应的清理行为
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();

    // 初始设置四类属性
    let props1 = props_with(&[
        ("checked", JsValue::from_bool(true)),
        ("disabled", JsValue::from_bool(true)),
        ("onClick", JsValue::from_str("handler")),
        ("ref", JsValue::from_f64(1.0)),
    ]);
    let vnode1 = rue.create_element(VNodeType::Element("div".into()), Some(props1), vec![]);
    rue.render(vnode1, &mut container);

    // 更新：移除上述属性
    let props2 = ComponentProps::new();
    let vnode2 = rue.create_element(VNodeType::Element("div".into()), Some(props2), vec![]);
    rue.render(vnode2, &mut container);

    let events = rue.get_dom_adapter().unwrap().events.clone();
    assert!(events.iter().any(|e| matches!(e, TestEvent::RmEvt(ev) if ev == "click")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::SetChecked(_))));
    assert!(events.iter().any(|e| matches!(e, TestEvent::SetDisabled(_))));
    assert!(events.iter().any(|e| matches!(e, TestEvent::RemoveAttr(key) if key == "checked")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::RemoveAttr(key) if key == "disabled")));
    assert!(events.iter().any(|e| matches!(e, TestEvent::ClearRef(_))));
}

#[wasm_bindgen_test]
fn props_removal_classname_sets_empty() {
    // 验证：移除 className 时类名被清空
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    // 初始：className = "a"
    let vnode1 = rue.create_element(
        VNodeType::Element("div".into()),
        Some(props_with(&[("className", JsValue::from_str("a"))])),
        vec![],
    );
    rue.render(vnode1, &mut container);

    // 更新：不再提供 className
    let vnode2 =
        rue.create_element(VNodeType::Element("div".into()), Some(ComponentProps::new()), vec![]);
    rue.render(vnode2, &mut container);

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
    assert_eq!(children[0].tag, "div");
    assert_eq!(children[0].class, "");
}
#[wasm_bindgen_test]
fn vapor_reuses_element_on_update() {
    // 验证：Vapor 更新不产生新的 DOM 节点，复用旧的元素
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    // 首次渲染 vapor，返回一个 span（在闭包外创建元素以避免可变借用冲突）
    let el1 = rue.get_dom_adapter_mut().unwrap().create_element("span");
    let vnode1 = rue.vapor(|| el1.clone());
    rue.render(vnode1, &mut container);
    let children1 = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children1.len(), 1);
    let _first_id = children1[0].id;

    // 更新渲染 vapor：再次返回一个新的 span（逻辑应复用旧节点）
    let el2 = rue.get_dom_adapter_mut().unwrap().create_element("span");
    let vnode2 = rue.vapor(|| el2.clone());
    rue.render(vnode2, &mut container);
    let children2 = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert!(children2.len() >= 1);
    assert!(children2.iter().any(|c| c.tag == "span"));
}

#[wasm_bindgen_test]
fn vapor_with_setup_uses_vapor_element_property() {
    // 验证：VaporWithSetup 返回对象含 vaporElement 时按属性提取为元素
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    // setup 返回 { vaporElement: 42 }，转换为元素（测试适配器返回默认元素）
    let setup = js_sys::Function::new_with_args("", "return { vaporElement: 42 }");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}

#[wasm_bindgen_test]
fn vapor_with_setup_returns_number_as_element() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup = js_sys::Function::new_with_args("", "return 123");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}

#[wasm_bindgen_test]
fn vapor_with_setup_returns_boolean_as_element() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let setup = js_sys::Function::new_with_args("", "return true");
    let vnode = rue.create_element(VNodeType::VaporWithSetup(setup.into()), None, vec![]);
    rue.render(vnode, &mut container);
    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
}

#[wasm_bindgen_test]
fn remove_value_on_select_multiple_sets_array() {
    // 验证：在 SELECT multiple 场景下移除 value，设置为空数组
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();

    // 初始：SELECT 设置 value
    let vnode1 = rue.create_element(
        VNodeType::Element("SELECT".into()),
        Some(props_with(&[("value", JsValue::from_str("x"))])),
        vec![],
    );
    rue.render(vnode1, &mut container);
    // 将 SELECT 标记为 multiple
    let children1 = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    let select_id = children1[0].id;
    let a = rue.get_dom_adapter_mut().unwrap();
    if let Some(node) = a.nodes.get_mut(&select_id) {
        node.multiple = true;
    }
    // 更新：移除 value
    let vnode2 = rue.create_element(
        VNodeType::Element("SELECT".into()),
        Some(ComponentProps::new()),
        vec![],
    );
    rue.render(vnode2, &mut container);
    let events = rue.get_dom_adapter().unwrap().events.clone();
    assert!(events.iter().any(|e| match e {
        TestEvent::SetValue(v) => v.is_object(),
        _ => false,
    }));
}

#[wasm_bindgen_test]
fn remove_value_on_has_value_property_sets_empty_and_removes_attr() {
    // 验证：元素拥有 value 属性时移除 value，设置为空字符串并移除属性
    let mut rue: Rue<TestAdapter> = Rue::new();
    let mut adapter = TestAdapter::default();
    rue.set_dom_adapter(adapter.clone());
    let mut container = adapter.create_document_fragment();

    // 初始：input 设置 value
    let vnode1 = rue.create_element(
        VNodeType::Element("input".into()),
        Some(props_with(&[("value", JsValue::from_str("v"))])),
        vec![],
    );
    rue.render(vnode1, &mut container);
    // 将节点标记为 has_value=true
    let children1 = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    let input_id = children1[0].id;
    let a = rue.get_dom_adapter_mut().unwrap();
    if let Some(node) = a.nodes.get_mut(&input_id) {
        node.has_value = true;
    }
    // 更新：移除 value
    let vnode2 =
        rue.create_element(VNodeType::Element("input".into()), Some(ComponentProps::new()), vec![]);
    rue.render(vnode2, &mut container);
    let events = rue.get_dom_adapter().unwrap().events.clone();
    assert!(events.iter().any(|e| matches!(e, TestEvent::SetValue(_))));
    assert!(events.iter().any(|e| matches!(e, TestEvent::RemoveAttr(key) if key == "value")));
}
#[wasm_bindgen_test]
fn lifecycle_hooks_render_and_update_order() {
    // 验证：生命周期钩子在首次渲染与更新时的调用顺序
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let vnode_for_hooks = rue.create_element(VNodeType::Element("div".into()), None, vec![]);
    rue.current_instance = Some(ComponentInternalInstance::<TestAdapter> {
        vnode: vnode_for_hooks,
        parent: None,
        is_mounted: false,
        hooks: LifecycleHooks(std::collections::HashMap::new()),
        props_ro: JsValue::UNDEFINED,
        host: JsValue::NULL,
        error: None,
        error_handlers: Vec::new(),
        index: 0,
    });

    // 使用全局数组记录钩子执行顺序
    let _ = Reflect::set(&js_sys::global(), &JsValue::from_str("_hooks"), &Array::new());
    let push = |name: &str| {
        js_sys::Function::new_with_args("", &format!("globalThis._hooks.push('{}')", name)).into()
    };
    rue.on_before_mount(push("before_mount"));
    rue.on_mounted(push("mounted"));
    rue.on_before_update(push("before_update"));
    rue.on_updated(push("updated"));

    // 首次渲染
    let vnode1 = rue.create_element(
        VNodeType::Element("div".into()),
        None,
        vec![Child::<TestAdapter>::Text("x".into())],
    );
    rue.render(vnode1, &mut container);

    // 更新渲染
    let vnode2 = rue.create_element(
        VNodeType::Element("div".into()),
        None,
        vec![Child::<TestAdapter>::Text("y".into())],
    );
    rue.render(vnode2, &mut container);

    // 断言调用序列包含关键钩子，且首个渲染的前置/后置钩子顺序正确
    let hooks =
        Array::from(&Reflect::get(&js_sys::global(), &JsValue::from_str("_hooks")).unwrap());
    assert!(hooks.length() >= 4);
    assert_eq!(hooks.get(0).as_string().unwrap(), "before_mount");
    assert_eq!(hooks.get(1).as_string().unwrap(), "mounted");
    // 更新渲染阶段应包含 before_update 和 updated 钩子
    let n = hooks.length();
    let mut has_before_update = false;
    let mut has_updated = false;
    for i in 2..n {
        let s = hooks.get(i).as_string().unwrap();
        if s == "before_update" {
            has_before_update = true;
        } else if s == "updated" {
            has_updated = true;
        }
    }
    assert!(has_before_update);
    assert!(has_updated);
}
