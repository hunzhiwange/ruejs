use super::super::{Child, Rue, VNode};
use crate::runtime::dom_adapter::DomAdapter;

/// Build a Text node from VNode children
///
/// Extracts the first textual content, supports nested Text VNode,
/// creates a platform text node via DomAdapter, and caches it on VNode.
/// 从 VNode children 构建文本节点
///
/// 优先提取直接文本，兼容嵌套 Text VNode；通过 DomAdapter 创建平台文本节点，
/// 并将结果缓存到 VNode 以便后续复用。
pub(crate) fn real_dom_text<A: DomAdapter>(
    rue: &mut Rue<A>,
    vnode: &mut VNode<A>,
) -> Option<A::Element>
where
    A::Element: Clone,
{
    // 解析文本内容：优先使用直接 Child::Text，其次支持嵌套 Text VNode
    let mut text = String::new();
    for c in vnode.children.iter() {
        match c {
            Child::Text(s) => {
                text = s.clone();
                break;
            }
            Child::VNode(n) => {
                if let super::super::VNodeType::Text = n.r#type {
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
    // 通过适配器创建平台文本节点
    let el = {
        let a = rue.get_dom_adapter_mut().unwrap();
        a.create_text_node(&text)
    };
    // 将文本节点缓存到 VNode，避免重复创建
    vnode.el = Some(el.clone());
    Some(el)
}
