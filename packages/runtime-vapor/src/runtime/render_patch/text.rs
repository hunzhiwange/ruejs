use super::super::Rue;
use super::super::types::VNode;
use crate::runtime::dom_adapter::DomAdapter;

// 文本节点更新策略：
// - 优先复用已有的文本节点（old.el），只更新 textContent。
// - 若不存在旧节点或容器缺失，则创建新的文本节点并追加到当前容器。
// - 文本来源统一从 new.children 中提取，兼容嵌套 Text VNode 的场景。

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    /// 文本节点的增量更新：尽量复用旧文本节点，仅更新 textContent
    ///
    /// 参数：
    /// - old/new：旧/新 VNode（Text 或含单文本的 VNode）
    /// 行为：
    /// - 若存在旧 el 与容器，直接 set_text_content
    /// - 否则创建新文本节点并追加到当前容器
    pub(super) fn patch_text(&mut self, old: &mut VNode<A>, new: &mut VNode<A>) {
        if let (Some(mut el_old), Some(_parent)) = (old.el.clone(), self.current_container.clone())
        {
            // 已存在旧文本节点：从 new.children 提取文本内容，设置到旧节点上
            let text = new
                .children
                .iter()
                .find_map(|c| match c {
                    super::super::types::Child::Text(s) => Some(s.clone()),
                    super::super::types::Child::VNode(v) => {
                        // 若子节点是 Text 类型的 VNode，则在其 children 中继续查找文本
                        if let super::super::types::VNodeType::Text = v.r#type {
                            v.children.iter().find_map(|cc| match cc {
                                super::super::types::Child::Text(ss) => Some(ss.clone()),
                                _ => None,
                            })
                        } else {
                            None
                        }
                    }
                    _ => None,
                })
                .unwrap_or_default();
            if let Some(adapter) = self.get_dom_adapter_mut() {
                // 通过适配器更新 textContent；复用旧节点避免结构变动
                adapter.set_text_content(&mut el_old, &text);
            }
            // 将更新后的节点引用绑定到 new.el 以维持一致性
            new.el = Some(el_old);
        } else {
            // 缺少旧节点或容器：创建新的文本节点并插入到当前容器尾部
            let parent_opt = self.get_current_container();
            if let Some(adapter) = self.get_dom_adapter_mut() {
                let text_el = adapter.create_text_node(
                    new.children
                        .iter()
                        .find_map(|c| match c {
                            super::super::types::Child::Text(s) => Some(s.clone()),
                            _ => None,
                        })
                        .unwrap_or_default()
                        .as_str(),
                );
                // 记录新创建的文本节点引用
                new.el = Some(text_el.clone());
                if let Some(mut parent) = parent_opt {
                    // 追加到容器；若需锚点插入，可在更高层统一处理
                    adapter.append_child(&mut parent, &text_el);
                }
            }
        }
    }
}
