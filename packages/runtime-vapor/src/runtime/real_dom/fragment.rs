use super::super::{Child, Rue, VNode};
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::Array;
use wasm_bindgen::JsValue;

/// 构建 DocumentFragment 并追加解析后的子节点
///
/// 通过 DomAdapter 创建片段，渲染子 VNode/文本到其中，
/// 并将片段真实子节点收集进 `__fragNodes`，用于后续区间操作。
pub(crate) fn real_dom_fragment<A: DomAdapter>(
    rue: &mut Rue<A>,
    vnode: &mut VNode<A>,
) -> Option<A::Element>
where
    A::Element: Clone + From<JsValue> + Into<JsValue>,
{
    // 通过适配器创建片段；若缺少适配器则记录错误并返回 None
    let mut frag = {
        match rue.get_dom_adapter_mut() {
            Some(a) => a.create_document_fragment(),
            None => {
                rue.handle_error(JsValue::from_str("runtime:create_real_dom Fragment no adapter"));
                return None;
            }
        }
    };
    // 将片段元素缓存到 VNode，避免重复创建
    vnode.el = Some(frag.clone());
    // 渲染子节点：VNode 子节点递归创建，文本子节点直接创建/追加
    for c in vnode.children.iter_mut() {
        if let Child::VNode(ref mut n) = c {
            if let Some(child_el) = rue.create_real_dom(n) {
                if let Some(a) = rue.get_dom_adapter_mut() {
                    a.append_child(&mut frag, &child_el);
                } else {
                    rue.handle_error(JsValue::from_str(
                        "runtime:create_real_dom Fragment append no adapter",
                    ));
                }
            } else {
                rue.handle_error(JsValue::from_str(
                    "runtime:create_real_dom Fragment child create failed",
                ));
            }
        } else if let Child::Text(s) = c {
            if let Some(a) = rue.get_dom_adapter_mut() {
                let tn = a.create_text_node(s);
                a.append_child(&mut frag, &tn);
            } else {
                rue.handle_error(JsValue::from_str(
                    "runtime:create_real_dom Fragment text no adapter",
                ));
            }
        }
    }
    // 若元素确为片段，则收集其真实子节点并存入 props，供后续区间操作使用
    if let Some(a) = rue.get_dom_adapter() {
        if a.is_fragment(&frag) {
            let list = a.collect_fragment_children(&frag);
            let js_arr = Array::new();
            for item in list.into_iter() {
                let v: JsValue = item.into();
                js_arr.push(&v);
            }
            vnode.props.insert("__fragNodes".to_string(), js_arr.into());
        }
    }
    Some(frag)
}
