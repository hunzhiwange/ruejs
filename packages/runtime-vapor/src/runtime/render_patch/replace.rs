use super::super::Rue;
use super::super::types::VNode;
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsValue;

// 替换策略（当 key/type 变化时触发）：
// - Fragment：移除旧片段子节点，再插入新片段子节点或占位元素。
// - Vapor/VaporWithSetup：优先清理 __fragNodes，插入新节点（片段走子节点插入）。
// - Component：先尝试清理 __fragNodes 或子树，再按锚点/父节点关系插入新宿主。
// - Element/Text：在旧 el 前插入新节点并移除旧节点；若找不到旧 el，清空父片段后追加。
// - _Phantom：仅按照锚点插入，不涉及旧节点移除。

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    /// 替换片段节点：移除旧片段子节点并插入新片段子节点或占位
    ///
    /// 参数：
    /// - old：旧片段 VNode
    /// - new_el：新节点（可能是片段或普通元素）
    /// - dest_parent：目标父元素（可能解析自片段/锚点）
    /// - insert_anchor：插入锚点（优先在其前插入）
    fn replace_fragment(
        &mut self,
        old: &mut VNode<A>,
        new_el: &A::Element,
        dest_parent: &mut A::Element,
        insert_anchor: &Option<A::Element>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 片段替换：先移除旧片段的所有子节点；再插入新片段的子节点或占位
        if let Some(adapter) = self.get_dom_adapter_mut() {
            if let Some(ref el_oldfrag) = old.el {
                let kids = adapter.collect_fragment_children(el_oldfrag);
                for n in kids.iter() {
                    let mut p2 = dest_parent.clone();
                    adapter.remove_child(&mut p2, n);
                }
            }
        }
        if let Some(adapter) = self.get_dom_adapter() {
            if adapter.is_fragment(new_el) {
                self.insert_fragment_children_preferring_end(dest_parent, new_el, insert_anchor);
            } else {
                if let Some(adapter2) = self.get_dom_adapter_mut() {
                    if let Some(ref el_old) = old.el {
                        if adapter2.contains(dest_parent, el_old) {
                            // 旧占位存在于父：在其前插入新节点并移除旧占位
                            adapter2.insert_before(dest_parent, new_el, el_old);
                            let mut p2 = dest_parent.clone();
                            adapter2.remove_child(&mut p2, el_old);
                        } else {
                            // 找不到旧占位：清空父片段内容，直接追加新节点
                            let kids = adapter2.collect_fragment_children(dest_parent);
                            for n in kids.iter() {
                                let mut p2 = dest_parent.clone();
                                adapter2.remove_child(&mut p2, n);
                            }
                            adapter2.append_child(dest_parent, new_el);
                        }
                    } else {
                        // 无旧占位记录：直接追加新节点
                        adapter2.append_child(dest_parent, new_el);
                    }
                }
            }
        }
    }

    /// 替换 Vapor/VaporWithSetup 节点：优先清理片段残留后插入新节点
    ///
    /// 参数：
    /// - old：旧 Vapor 类 VNode
    /// - new_el：新节点（可能是片段或普通元素）
    /// - parent：父元素
    /// - insert_anchor：插入锚点
    fn replace_vapor_like(
        &mut self,
        old: &mut VNode<A>,
        new_el: &A::Element,
        parent: &mut A::Element,
        insert_anchor: &Option<A::Element>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // Vapor 类节点：优先清理 __fragNodes，以避免片段残留影响插入位置
        let cleared = self.clear_vapor_frag_nodes(parent, old);
        if !cleared {
            if let Some(adapter) = self.get_dom_adapter_mut() {
                if let Some(ref el_old) = old.el {
                    if adapter.contains(parent, el_old) {
                        // 未清理片段：在旧 el 前插入新节点并移除旧节点
                        adapter.insert_before(parent, new_el, el_old);
                        let mut p2 = parent.clone();
                        adapter.remove_child(&mut p2, el_old);
                    }
                }
            }
        }
        if let Some(adapter2) = self.get_dom_adapter() {
            if adapter2.is_fragment(new_el) {
                self.insert_fragment_children_preferring_end(parent, new_el, insert_anchor);
            } else {
                // 普通节点：根据锚点插入或尾部追加
                self.insert_with_end_anchor_opt(parent, new_el, insert_anchor);
            }
        }
    }

    /// 替换组件宿主：清理片段或子树后，依据锚点插入新宿主
    ///
    /// 参数：
    /// - old：旧组件 VNode
    /// - new_el：新宿主元素
    /// - dest_parent/_parent：目标父元素与原父元素（插入与移除参照）
    /// - insert_anchor：插入锚点
    fn replace_component(
        &mut self,
        old: &mut VNode<A>,
        new_el: &A::Element,
        dest_parent: &mut A::Element,
        _parent: &mut A::Element,
        insert_anchor: &Option<A::Element>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 第一步：统一清理旧片段子节点（优先 __fragNodes；否则尝试组件子树）
        let mut cleared = self.clear_vapor_frag_nodes(dest_parent, old);
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "replace_component: cleared old frag node") {
                // 打印清理结果
                crate::log::log(
                    "debug",
                    &format!("replace_component: cleared old frag nodes: {:?}", cleared),
                );
            }
        }
        if !cleared {
            if let Some(sub) = old.comp_subtree.as_deref_mut() {
                cleared = self.clear_vapor_frag_nodes(dest_parent, sub);
                #[cfg(feature = "dev")]
                {
                    if crate::log::want_log(
                        "debug",
                        "replace_component: cleared old comp subtree nodes",
                    ) {
                        // 打印清理结果
                        crate::log::log(
                            "debug",
                            &format!(
                                "replace_component: cleared old comp subtree nodes: {:?}",
                                cleared
                            ),
                        );
                    }
                }
            }
        }
        // 第二步：插入新节点，片段则插入其子节点；否则按锚点插入宿主
        if let Some(adapter) = self.get_dom_adapter() {
            if adapter.is_fragment(new_el) {
                if let Some(ref el_old) = old.el {
                    let effective_anchor = self.current_anchor.clone().or(insert_anchor.clone());
                    let mut real_parent =
                        self.resolve_dest_parent(dest_parent, None, effective_anchor.clone());
                    // 在范围内插入前，先清理 start/end 之间的旧内容（保留锚点）
                    self.clear_current_named_range_if_present(&mut real_parent);
                    self.clear_old_el_if_present(&mut real_parent, el_old);
                    self.insert_fragment_children_preferring_end(
                        &mut real_parent,
                        new_el,
                        &effective_anchor,
                    );
                } else {
                    // 无旧 el：在范围内插入前同样清理旧内容，避免重复
                    self.clear_current_named_range_if_present(dest_parent);
                    self.insert_fragment_children_preferring_end(
                        dest_parent,
                        new_el,
                        insert_anchor,
                    );
                }
            } else {
                if !cleared {
                    if let Some(adapter2) = self.get_dom_adapter_mut() {
                        if let Some(ref el_old) = old.el {
                            if adapter2.contains(dest_parent, el_old) {
                                // 能找到旧 el：在其前插入新节点后移除旧节点
                                adapter2.insert_before(dest_parent, new_el, el_old);
                                let mut p2 = dest_parent.clone();
                                adapter2.remove_child(&mut p2, el_old);
                                return;
                            }
                        }
                    }
                }
                self.insert_with_end_anchor_opt(dest_parent, new_el, insert_anchor);
                if let Some(ref el_old) = old.el {
                    self.clear_old_el_if_present(dest_parent, el_old);
                }
                if let Some(sub) = old.comp_subtree.as_deref() {
                    if let Some(ref sub_el) = sub.el {
                        self.clear_old_el_if_present(dest_parent, sub_el);
                    }
                }
            }
        }
    }

    /// 替换普通元素：在旧 el 前插入新节点并移除旧节点
    fn replace_element(
        &mut self,
        old: &mut VNode<A>,
        new_el: &A::Element,
        dest_parent: &mut A::Element,
    ) {
        // 普通元素替换：通用的非片段替换逻辑
        self.replace_non_fragment_with_fallback(old, new_el, dest_parent);
    }

    /// 替换文本节点：流程同普通元素，重点在插入位置
    fn replace_text(
        &mut self,
        old: &mut VNode<A>,
        new_el: &A::Element,
        dest_parent: &mut A::Element,
    ) {
        // 文本节点替换：与元素相同流程，重点在于 text 节点的插入位置
        self.replace_non_fragment_with_fallback(old, new_el, dest_parent);
    }

    /// 替换 Phantom：仅按锚点插入，不涉及旧节点移除
    fn replace_phantom(
        &mut self,
        new_el: &A::Element,
        dest_parent: &mut A::Element,
        anchor_opt: &Option<A::Element>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // Phantom 类型：仅依据锚点插入新节点，不涉及旧节点移除
        self.insert_with_end_anchor_opt(dest_parent, new_el, anchor_opt);
    }

    /// 通用非片段替换逻辑：可定位旧 el 则前插后移除；否则清空片段后追加
    fn replace_non_fragment_with_fallback(
        &mut self,
        old: &mut VNode<A>,
        new_el: &A::Element,
        dest_parent: &mut A::Element,
    ) {
        // 通用替换流程：若能定位到旧 el，则前插+移除；否则清空片段子节点后追加
        if let Some(adapter) = self.get_dom_adapter_mut() {
            if let Some(ref el_old) = old.el {
                if adapter.contains(dest_parent, el_old) {
                    adapter.insert_before(dest_parent, new_el, el_old);
                    let mut p2 = dest_parent.clone();
                    adapter.remove_child(&mut p2, el_old);
                } else {
                    let kids = adapter.collect_fragment_children(dest_parent);
                    for n in kids.iter() {
                        let mut p2 = dest_parent.clone();
                        adapter.remove_child(&mut p2, n);
                    }
                    adapter.append_child(dest_parent, new_el);
                }
            } else {
                adapter.append_child(dest_parent, new_el);
            }
        }
    }

    /// 替换入口：创建新节点并按旧类型分派具体替换策略
    ///
    /// 参数：
    /// - old/new：旧/新 VNode
    /// - parent：原父元素
    /// 行为：
    /// - 触发卸载前钩子，创建新真实节点，分派替换策略，触发卸载后钩子
    pub(super) fn patch_replace(
        &mut self,
        old: &mut VNode<A>,
        new: &mut VNode<A>,
        parent: &mut A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 替换入口：先触发卸载前钩子，再创建新真实节点，最后按类型分派具体替换策略
        let eager_unmounted = matches!(
            &old.r#type,
            super::super::types::VNodeType::Vapor
                | super::super::types::VNodeType::VaporWithSetup(_)
        );
        self.invoke_before_unmount_vnode(old);
        if eager_unmounted {
            let anchor_opt = self.current_anchor.clone();
            let mut preclear_parent =
                self.resolve_dest_parent(parent, old.el.clone(), anchor_opt.clone());
            // 旧 vapor 根若以 fragment 形式存在，先把 __fragNodes 代表的旧 DOM 与内部锚点子树摘掉，
            // 避免新 setup 执行时与旧的 renderAnchor/renderBetween 子树并存。
            self.clear_vapor_frag_nodes(&mut preclear_parent, old);
            // Vapor 类替换需要先完成旧副作用与跨容器清理，再创建新的子树。
            // 否则旧 Teleport/onUnmounted 这类清理逻辑可能会把刚挂上的新内容一并清掉。
            self.invoke_unmounted_vnode(old);
        }
        if let Some(el_new) = self.create_real_dom(new) {
            let anchor_opt = self.current_anchor.clone();
            let mut dest_parent =
                self.resolve_dest_parent(parent, old.el.clone(), anchor_opt.clone());
            let insert_anchor = old.el.clone().or(anchor_opt.clone());
            match &old.r#type {
                super::super::types::VNodeType::Fragment => {
                    self.replace_fragment(old, &el_new, &mut dest_parent, &insert_anchor);
                }
                super::super::types::VNodeType::Vapor => {
                    self.replace_vapor_like(old, &el_new, &mut dest_parent, &insert_anchor);
                }
                super::super::types::VNodeType::VaporWithSetup(_) => {
                    self.replace_vapor_like(old, &el_new, &mut dest_parent, &insert_anchor);
                }
                super::super::types::VNodeType::Component(_) => {
                    self.replace_component(old, &el_new, &mut dest_parent, parent, &insert_anchor);
                }
                super::super::types::VNodeType::Element(_) => {
                    self.replace_element(old, &el_new, &mut dest_parent);
                }
                super::super::types::VNodeType::Text => {
                    self.replace_text(old, &el_new, &mut dest_parent);
                }
                super::super::types::VNodeType::_Phantom(_) => {
                    self.replace_phantom(&el_new, &mut dest_parent, &insert_anchor);
                }
            }
            // 绑定新 el 引用，供后续逻辑使用
            new.el = Some(el_new);
        }
        // 替换完成：触发卸载完成钩子
        if !eager_unmounted {
            self.invoke_unmounted_vnode(old);
        }
    }
}
