//! 运行时类型与归一化行为测试
//!
//! 覆盖 key 提取、文本子节点归一化、Fragment 常量与过滤 null/bool 子节点等逻辑。
use crate::common::TestAdapter;
use rue_runtime_vapor::{Child, ComponentProps, FRAGMENT, Rue, VNodeType};
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

mod common;

/// 从数字与字符串 props 中正确提取 key
#[wasm_bindgen_test]
fn key_extracted_from_numeric_and_string() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut p1 = ComponentProps::new();
    p1.insert("key".into(), wasm_bindgen::JsValue::from_f64(1.0));
    let v1 = rue.create_element(VNodeType::Element("div".into()), Some(p1), vec![]);
    assert_eq!(v1.key.as_deref(), Some("1"));
    let mut p2 = ComponentProps::new();
    p2.insert("key".into(), wasm_bindgen::JsValue::from_str("k"));
    let v2 = rue.create_element(VNodeType::Element("div".into()), Some(p2), vec![]);
    assert_eq!(v2.key.as_deref(), Some("k"));
}

/// 文本子节点被归一化为 Text 类型的 VNode
#[wasm_bindgen_test]
fn text_child_normalized_to_vnode() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let v = rue.create_element(
        VNodeType::Element("span".into()),
        None,
        vec![Child::<TestAdapter>::Text("x".into())],
    );
    assert_eq!(v.children.len(), 1);
    match &v.children[0] {
        Child::VNode(n) => match n.r#type {
            VNodeType::Text => {}
            _ => panic!(),
        },
        _ => panic!(),
    }
}

/// Fragment 常量值符合约定
#[wasm_bindgen_test]
fn fragment_const_is_fragment() {
    assert_eq!(FRAGMENT, "fragment");
}

/// 归一化时过滤 Null/Bool 子节点，仅保留有效文本/节点
#[wasm_bindgen_test]
fn create_element_filters_null_and_bool_children() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let v = rue.create_element(
        VNodeType::Element("div".into()),
        None,
        vec![
            Child::<TestAdapter>::Null,
            Child::<TestAdapter>::Bool(true),
            Child::<TestAdapter>::Text("x".into()),
        ],
    );
    assert_eq!(v.children.len(), 1);
}

/// 文本子节点归一化后会创建文本节点引用（el 为 #text）
#[wasm_bindgen_test]
fn text_child_normalization_creates_text_node_el() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let v = rue.create_element(
        VNodeType::Element("span".into()),
        None,
        vec![Child::<TestAdapter>::Text("hello".into())],
    );
    assert_eq!(v.children.len(), 1);
    match &v.children[0] {
        Child::VNode(n) => {
            match n.r#type {
                VNodeType::Text => {}
                _ => panic!(),
            }
            assert!(n.el.is_some());
            let el = n.el.clone().unwrap();
            assert_eq!(el.tag, "#text");
        }
        _ => panic!(),
    }
}

/// 缺失或类型不为字符串/数字的 key 应为 None
#[wasm_bindgen_test]
fn key_missing_or_non_string_number_results_in_none() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let v1 = rue.create_element(VNodeType::Element("div".into()), None, vec![]);
    assert_eq!(v1.key, None);
    let mut props = ComponentProps::new();
    props.insert("key".into(), JsValue::from_bool(true));
    let v2 = rue.create_element(VNodeType::Element("div".into()), Some(props), vec![]);
    assert_eq!(v2.key, None);
}
