/*
VNode 与类型体系
-----------------
虚拟节点（VNode）是运行时在内存中表达“界面”的结构：
- VNodeType：节点的语义类型（文本、片段、原生元素、Vapor 特例等）
- VNode：包含类型、props、children、宿主元素句柄（el）与 diff 键（key）
- Child：VNode 的子项可以是 VNode、本地文本、布尔或空（用于占位/条件）

关键点：
- el: Option<A::Element> 是对宿主元素的可选引用；create_real_dom 时会填充。
- key: 用于有序列表的稳定性（patch_children_keyed 通过 key 做最小移动）。
- FRAGMENT 常量：JS 桥接时用于识别片段构造。
*/
use crate::runtime::dom_adapter::DomAdapter;
use std::collections::HashMap;
use std::marker::PhantomData;
use wasm_bindgen::JsValue;

pub type ComponentProps = HashMap<String, JsValue>;
pub type PropsWithChildren = ComponentProps;

pub enum VNodeType<A: DomAdapter> {
    Text,
    Fragment,
    Vapor,
    VaporWithSetup(JsValue),
    Element(String),
    Component(JsValue),
    _Phantom(PhantomData<A>),
}

pub enum Child<A: DomAdapter> {
    VNode(VNode<A>),
    Text(String),
    Bool(bool),
    Null,
}

pub struct VNode<A: DomAdapter> {
    pub r#type: VNodeType<A>,
    pub props: ComponentProps,
    pub children: Vec<Child<A>>,
    pub el: Option<A::Element>,
    pub key: Option<String>,
    pub comp_hooks: Option<HashMap<String, Vec<JsValue>>>,
    pub comp_subtree: Option<Box<VNode<A>>>,
    pub comp_host: Option<JsValue>,
    pub comp_props_ro: Option<JsValue>,
    pub comp_inst_index: Option<usize>,
}

pub type FC<A> = fn(PropsWithChildren) -> VNode<A>;
pub const FRAGMENT: &str = "fragment";

impl<A: DomAdapter> Clone for VNode<A>
where
    A::Element: Clone,
{
    fn clone(&self) -> Self {
        VNode {
            r#type: match &self.r#type {
                VNodeType::Text => VNodeType::Text,
                VNodeType::Fragment => VNodeType::Fragment,
                VNodeType::Vapor => VNodeType::Vapor,
                VNodeType::VaporWithSetup(f) => VNodeType::VaporWithSetup(f.clone()),
                VNodeType::Element(s) => VNodeType::Element(s.clone()),
                VNodeType::Component(f) => VNodeType::Component(f.clone()),
                VNodeType::_Phantom(_) => VNodeType::_Phantom(PhantomData),
            },
            props: self.props.clone(),
            children: self.children.clone(),
            el: self.el.clone(),
            key: self.key.clone(),
            comp_hooks: self.comp_hooks.clone(),
            comp_subtree: self.comp_subtree.clone(),
            comp_host: self.comp_host.clone(),
            comp_props_ro: self.comp_props_ro.clone(),
            comp_inst_index: self.comp_inst_index.clone(),
        }
    }
}

impl<A: DomAdapter> Clone for Child<A>
where
    A::Element: Clone,
{
    fn clone(&self) -> Self {
        match self {
            Child::VNode(v) => Child::VNode(v.clone()),
            Child::Text(s) => Child::Text(s.clone()),
            Child::Bool(b) => Child::Bool(*b),
            Child::Null => Child::Null,
        }
    }
}
