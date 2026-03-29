use super::super::{Child, Rue, VNode, VNodeType};
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Function, Reflect};
use wasm_bindgen::{JsCast, JsValue};

/// 降级：在缺少适配器时通过全局 document 创建文本节点
fn fb_text<A: DomAdapter>(vnode: &mut VNode<A>, doc: &JsValue) -> Option<A::Element>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    // 解析文本内容：优先直接文本，其次支持嵌套 Text VNode
    let mut text = String::new();
    for c in vnode.children.iter() {
        match c {
            Child::Text(s) => {
                text = s.clone();
                break;
            }
            Child::VNode(n) => {
                if let VNodeType::Text = n.r#type {
                    for cc in n.children.iter() {
                        if let Child::Text(s2) = cc {
                            text = s2.clone();
                            break;
                        }
                    }
                }
            }
            _ => {}
        }
    }
    // 通过 document.createTextNode 创建文本节点
    let f = Reflect::get(doc, &JsValue::from_str("createTextNode")).unwrap_or(JsValue::UNDEFINED);
    if let Some(func) = f.dyn_ref::<Function>() {
        if let Ok(elv) = func.call1(doc, &JsValue::from_str(&text)) {
            let el: A::Element = elv.into();
            vnode.el = Some(el.clone());
            return Some(el);
        }
    }
    None
}

/// 降级：通过全局 document 创建 DocumentFragment
fn fb_fragment<A: DomAdapter>(vnode: &mut VNode<A>, doc: &JsValue) -> Option<A::Element>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    let f = Reflect::get(doc, &JsValue::from_str("createDocumentFragment"))
        .unwrap_or(JsValue::UNDEFINED);
    if let Some(func) = f.dyn_ref::<Function>() {
        if let Ok(elv) = func.call0(doc) {
            let el: A::Element = elv.into();
            vnode.el = Some(el.clone());
            return Some(el);
        }
    }
    None
}

/// 降级：通过全局 document 根据标签创建元素
fn fb_element<A: DomAdapter>(
    vnode: &mut VNode<A>,
    doc: &JsValue,
    tag: &String,
) -> Option<A::Element>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    let f = Reflect::get(doc, &JsValue::from_str("createElement")).unwrap_or(JsValue::UNDEFINED);
    if let Some(func) = f.dyn_ref::<Function>() {
        if let Ok(elv) = func.call1(doc, &JsValue::from_str(tag.as_str())) {
            let el: A::Element = elv.into();
            vnode.el = Some(el.clone());
            return Some(el);
        }
    }
    None
}

/// 无 DomAdapter 时的真实 DOM 创建降级方案
///
/// 使用全局 `document` 创建 Text/Fragment/Element；Vapor 类型若已缓存元素则直接返回，
/// 其他类型在此不做支持。
pub(crate) fn create_real_dom_fallback<A: DomAdapter>(
    _rue: &mut Rue<A>,
    vnode: &mut VNode<A>,
) -> Option<A::Element>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    // 取得全局 document；若不可用则直接返回 None
    let doc = js_sys::Reflect::get(&js_sys::global(), &JsValue::from_str("document"))
        .unwrap_or(JsValue::UNDEFINED);
    if doc.is_undefined() || doc.is_null() {
        return None;
    }
    match &vnode.r#type {
        VNodeType::Text => return fb_text(vnode, &doc),
        VNodeType::Fragment => return fb_fragment(vnode, &doc),
        VNodeType::Element(tag) => {
            let t = tag.clone();
            return fb_element(vnode, &doc, &t);
        }
        VNodeType::Vapor | VNodeType::VaporWithSetup(_) => {
            if let Some(ref el) = vnode.el {
                return Some(el.clone());
            }
        }
        _ => {}
    }
    None
}
