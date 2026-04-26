//! 默认 MountInput-first Rust 入口测试
//!
//! 覆盖 render / anchor / between / static 四类默认公开渲染入口，
//! 确保默认公开面不需要显式构造历史 compat 对象输出。
use crate::common::TestAdapter;
use rue_runtime_vapor::{
    ComponentProps, DomAdapter, MountInput, MountInputChild, MountInputType, Rue,
};
use wasm_bindgen_test::*;

mod common;

fn text_input(text: &str) -> MountInput<TestAdapter> {
    MountInput {
        r#type: MountInputType::Text(text.to_string()),
        props: ComponentProps::new(),
        children: Vec::new(),
        key: None,
        mount_cleanup_bucket: None,
        mount_effect_scope_id: None,
        el_hint: None,
    }
}

fn element_input(tag: &str, children: Vec<MountInputChild<TestAdapter>>) -> MountInput<TestAdapter> {
    MountInput {
        r#type: MountInputType::Element(tag.to_string()),
        props: ComponentProps::new(),
        children,
        key: None,
        mount_cleanup_bucket: None,
        mount_effect_scope_id: None,
        el_hint: None,
    }
}

#[wasm_bindgen_test]
fn render_input_mounts_element_tree_without_vnode() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut container = rue.get_dom_adapter_mut().unwrap().create_document_fragment();

    let input = element_input("div", vec![MountInputChild::Text("hello".into())]);
    rue.render_input(input, &mut container);

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&container);
    assert_eq!(children.len(), 1);
    assert_eq!(children[0].tag, "div");
    let div_children = rue.get_dom_adapter().unwrap().collect_fragment_children(&children[0]);
    assert_eq!(div_children.len(), 1);
    assert_eq!(div_children[0].tag, "#text");
    assert_eq!(div_children[0].text, "hello");
    assert_eq!(rue.container_map.len(), 1);
}

#[wasm_bindgen_test]
fn render_anchor_input_records_anchor_mount_without_vnode() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let anchor = rue.get_dom_adapter_mut().unwrap().create_element("comment_anchor");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &anchor);

    let input = element_input("span", vec![MountInputChild::Text("A".into())]);
    rue.render_anchor_input(input, &mut parent, anchor.clone());

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    assert!(children.iter().any(|node| node.tag == "comment_anchor"));
    assert!(children.iter().any(|node| node.tag == "span"));
    assert_eq!(rue.anchor_map.len(), 1);
}

#[wasm_bindgen_test]
fn render_between_input_records_range_mount_without_vnode() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("comment_start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("comment_end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);

    let input = element_input("span", vec![MountInputChild::Text("B".into())]);
    rue.render_between_input(input, &mut parent, start.clone(), end.clone());

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    assert!(children.iter().any(|node| node.tag == "comment_start"));
    assert!(children.iter().any(|node| node.tag == "comment_end"));
    assert!(children.iter().any(|node| node.tag == "span"));
    assert_eq!(rue.range_map.len(), 1);
}

#[wasm_bindgen_test]
fn render_static_input_removes_anchor_without_vnode() {
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let anchor = rue.get_dom_adapter_mut().unwrap().create_element("comment_anchor");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &anchor);

    let input = element_input("span", vec![MountInputChild::Input(text_input("static"))]);
    rue.render_static_input(input, &mut parent, anchor.clone());

    let children = rue.get_dom_adapter().unwrap().collect_fragment_children(&parent);
    assert!(!children.iter().any(|node| node.id == anchor.id));
    assert!(children.iter().any(|node| node.tag == "span"));
}