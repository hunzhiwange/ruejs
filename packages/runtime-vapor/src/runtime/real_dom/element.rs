use super::super::{Child, Rue, VNode};
use crate::runtime::dom_adapter::DomAdapter;
use crate::runtime::props::{Props as RuntimeProps, patch_props, post_patch_element};
use wasm_bindgen::JsValue;

/// 通过 DomAdapter 根据标签创建元素
fn build_element<A: DomAdapter>(rue: &mut Rue<A>, tag: &String) -> Option<A::Element> {
    match rue.get_dom_adapter_mut() {
        Some(a) => Some(a.create_element(tag.as_str())),
        None => {
            rue.handle_error(JsValue::from_str("runtime:create_real_dom Element no adapter"));
            None
        }
    }
}

/// 将 VNode 的 props 收集为运行时属性映射
fn collect_props<A: DomAdapter>(vnode: &VNode<A>) -> RuntimeProps {
    let mut new_props: RuntimeProps = RuntimeProps::new();
    for (k, v) in vnode.props.iter() {
        new_props.insert(k.clone(), v.clone());
    }
    new_props
}

/// 应用初始属性（与空映射 diff）到元素
fn apply_initial_props<A: DomAdapter>(
    rue: &mut Rue<A>,
    el: &mut A::Element,
    new_props: &RuntimeProps,
) {
    if let Some(a) = rue.get_dom_adapter_mut() {
        let empty = RuntimeProps::new();
        if let Err(e) = patch_props(a, el, &empty, new_props) {
            rue.handle_error(e);
        }
    } else {
        rue.handle_error(JsValue::from_str(
            "runtime:create_real_dom Element patch_props no adapter",
        ));
    }
}

/// 渲染子节点：文本直接创建、VNode 递归创建追加
fn render_children<A: DomAdapter>(rue: &mut Rue<A>, el: &mut A::Element, vnode: &mut VNode<A>)
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    for c in vnode.children.iter_mut() {
        match c {
            Child::Text(s) => {
                if let Some(a) = rue.get_dom_adapter_mut() {
                    let tn = a.create_text_node(s);
                    a.append_child(el, &tn);
                } else {
                    rue.handle_error(JsValue::from_str(
                        "runtime:create_real_dom Element text no adapter",
                    ));
                }
            }
            Child::VNode(ref mut n) => {
                if let Some(child_el) = rue.create_real_dom(n) {
                    if let Some(a) = rue.get_dom_adapter_mut() {
                        a.append_child(el, &child_el);
                    } else {
                        rue.handle_error(JsValue::from_str(
                            "runtime:create_real_dom Element append no adapter",
                        ));
                    }
                } else {
                    rue.handle_error(JsValue::from_str(
                        "runtime:create_real_dom Element child create failed",
                    ));
                }
            }
            _ => {}
        }
    }
}

/// 元素级别后置补丁：执行元素特定的最终处理
fn post_patch<A: DomAdapter>(rue: &mut Rue<A>, el: &mut A::Element, new_props: &RuntimeProps) {
    if let Some(a) = rue.get_dom_adapter_mut() {
        if let Err(e) = post_patch_element(a, el, new_props) {
            rue.handle_error(e);
        }
    } else {
        rue.handle_error(JsValue::from_str(
            "runtime:create_real_dom Element post_patch no adapter",
        ));
    }
}

/// 从 VNode 的 Element 类型构建真实 DOM 元素
///
/// 创建元素、应用初始属性；若未使用危险内联 HTML，则渲染子节点；
/// 执行后置补丁；最后将元素缓存到 VNode。
pub(crate) fn real_dom_element<A: DomAdapter>(
    rue: &mut Rue<A>,
    vnode: &mut VNode<A>,
    tag: &String,
) -> Option<A::Element>
where
    A::Element: Clone + From<JsValue> + Into<JsValue>,
{
    let mut el = match build_element(rue, tag) {
        Some(e) => e,
        None => return None,
    };
    let new_props = collect_props(vnode);
    apply_initial_props(rue, &mut el, &new_props);
    if !new_props.contains_key("dangerouslySetInnerHTML") {
        render_children(rue, &mut el, vnode);
    }
    post_patch(rue, &mut el, &new_props);
    // 将元素缓存到 VNode，便于后续复用
    vnode.el = Some(el.clone());
    Some(el)
}
