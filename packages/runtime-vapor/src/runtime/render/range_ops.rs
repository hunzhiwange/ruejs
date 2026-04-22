use super::super::Rue;
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

// 区间渲染的原子操作集合：
// - vapor_clear_old_range：清理旧范围（优先片段子节点，再移除旧宿主）
// - vapor_insert_new_range：将新范围插入到 end 前（片段走子节点原子插入）
// - collect_fragment_children_atomic / insert_fragment_children_atomic：片段子节点的原子化收集与插入
// - resolve_dest_parent_for_end：解析 end 的真实父元素（片段/不包含 end 时）
// - clear_dom_between_anchors：移除 start 与 end 之间的所有节点
// - insert_new_dom_before_end：在 end 前插入新节点或尾部追加

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    fn drain_range_entries_within_root(
        &mut self,
        root: &A::Element,
        pending_unmounted: &mut Vec<super::super::types::VNode<A>>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        let adapter_owned = self.get_dom_adapter().cloned();
        let root_js: JsValue = root.clone().into();

        let should_remove = |start: &A::Element| {
            let start_js: JsValue = start.clone().into();
            if js_sys::Object::is(&root_js, &start_js) {
                return true;
            }
            if let Some(adapter) = adapter_owned.as_ref() {
                return adapter.contains(root, start);
            }
            let contains = js_sys::Reflect::get(&root_js, &JsValue::from_str("contains"))
                .unwrap_or(JsValue::UNDEFINED);
            if let Some(func) = contains.dyn_ref::<js_sys::Function>() {
                let result = func.call1(&root_js, &start_js).unwrap_or(JsValue::FALSE);
                return result.as_bool().unwrap_or(false);
            }
            false
        };

        let drained = std::mem::take(&mut self.range_map);
        let mut kept = Vec::with_capacity(drained.len());
        for (start, mut vnode_opt) in drained.into_iter() {
            if should_remove(&start) {
                if let Some(mut vnode) = vnode_opt.take() {
                    self.invoke_before_unmount_vnode(&mut vnode);
                    pending_unmounted.push(vnode);
                }
            } else {
                kept.push((start, vnode_opt));
            }
        }
        self.range_map = kept;
    }

    /// Vapor 快速路径：清理旧范围并返回真实父元素
    ///
    /// 参数：
    /// - parent/end：原父元素与区间结束锚点
    /// - old_vnode：旧 vnode（可能携带片段子节点或子树）
    /// 返回：
    /// - 解析后的真实父元素，用于后续插入
    pub(super) fn vapor_clear_old_range(
        &mut self,
        parent: &A::Element,
        end: &A::Element,
        old_vnode: &mut super::super::types::VNode<A>,
    ) -> A::Element
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 解析 end 的真实父元素
        let mut dest_parent = self.resolve_dest_parent_for_end(parent, end);
        // 优先清理旧 vnode 的片段子节点；若未清理成功则尝试其子树
        let mut cleared = self.clear_vapor_frag_nodes(&mut dest_parent, old_vnode);
        if !cleared {
            if let Some(sub) = old_vnode.comp_subtree.as_deref_mut() {
                cleared = self.clear_vapor_frag_nodes(&mut dest_parent, sub);
            }
        }
        // 仍未清理：若旧 el 存在且在父内，直接移除
        if !cleared {
            if let Some(ref el_old) = old_vnode.el {
                if let Some(adapter) = self.get_dom_adapter_mut() {
                    if adapter.contains(&dest_parent, el_old) {
                        let mut p2 = dest_parent.clone();
                        adapter.remove_child(&mut p2, el_old);
                    }
                }
            }
        }
        dest_parent
    }

    /// 将新范围插入到 end 前：片段走原子化插入，普通节点直接插入
    pub(super) fn vapor_insert_new_range(
        &mut self,
        parent: &A::Element,
        end: &A::Element,
        el: &A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        let mut dest_parent = self.resolve_dest_parent_for_end(parent, end);
        if let Some(adapter) = self.get_dom_adapter() {
            if adapter.is_fragment(el) {
                let nodes = self.collect_fragment_children_atomic(el);
                self.insert_fragment_children_atomic(&mut dest_parent, &nodes, end);
            } else {
                self.insert_new_dom_before_end(&mut dest_parent, el, end);
            }
        } else {
            self.insert_new_dom_before_end(&mut dest_parent, el, end);
        }
    }

    /// 原子化收集片段的子节点列表
    pub(super) fn collect_fragment_children_atomic(&self, el: &A::Element) -> Vec<A::Element>
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(adapter) = self.get_dom_adapter() {
            adapter.collect_fragment_children(el)
        } else {
            vec![]
        }
    }

    /// 原子化插入片段的子节点到 end 前
    pub(super) fn insert_fragment_children_atomic(
        &mut self,
        dest_parent: &mut A::Element,
        nodes: &[A::Element],
        end: &A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        for n in nodes.iter() {
            self.insert_new_dom_before_end(dest_parent, n, end);
        }
    }

    /// 解析 end 的真实父元素：父为片段或不包含 end 时溯源 parentNode
    pub(super) fn resolve_dest_parent_for_end(
        &self,
        parent: &A::Element,
        end: &A::Element,
    ) -> A::Element
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(adapter) = self.get_dom_adapter() {
            let mut dest = parent.clone();
            if adapter.is_fragment(&dest) || !adapter.contains(&dest, end) {
                let pn =
                    js_sys::Reflect::get(&end.clone().into(), &JsValue::from_str("parentNode"))
                        .unwrap_or(JsValue::UNDEFINED);
                if !pn.is_undefined() && !pn.is_null() {
                    dest = pn.into();
                }
            }
            dest
        } else {
            let mut dest = parent.clone();
            let pn = js_sys::Reflect::get(&end.clone().into(), &JsValue::from_str("parentNode"))
                .unwrap_or(JsValue::UNDEFINED);
            if !pn.is_undefined() && !pn.is_null() {
                dest = pn.into();
            }
            dest
        }
    }

    /// 清理 start 与 end 之间的所有 DOM 节点
    pub(super) fn clear_dom_between_anchors(
        &mut self,
        dest_parent: &mut A::Element,
        start: &A::Element,
        end: &A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        let start_js: JsValue = start.clone().into();
        let end_js: JsValue = end.clone().into();
        let mut pending_unmounted: Vec<super::super::types::VNode<A>> = Vec::new();

        let mut cur = js_sys::Reflect::get(&start_js, &JsValue::from_str("nextSibling"))
            .unwrap_or(JsValue::UNDEFINED);
        while !cur.is_undefined() && !cur.is_null() {
            if js_sys::Object::is(&cur, &end_js) {
                break;
            }
            let next = js_sys::Reflect::get(&cur, &JsValue::from_str("nextSibling"))
                .unwrap_or(JsValue::UNDEFINED);

            let node_el: A::Element = cur.clone().into();
            self.drain_range_entries_within_root(&node_el, &mut pending_unmounted);

            if let Some(adapter) = self.get_dom_adapter_mut() {
                if adapter.contains(dest_parent, &node_el) {
                    let mut p2 = dest_parent.clone();
                    adapter.remove_child(&mut p2, &node_el);
                }
            }

            cur = next;
        }

        for mut vnode in pending_unmounted.into_iter() {
            self.invoke_unmounted_vnode(&mut vnode);
        }
    }

    /// 在 end 前插入新节点；若 end 不在父内则尾部追加
    pub(super) fn insert_new_dom_before_end(
        &mut self,
        dest_parent: &mut A::Element,
        new_el: &A::Element,
        end: &A::Element,
    ) {
        if let Some(adapter) = self.get_dom_adapter_mut() {
            if adapter.contains(dest_parent, end) {
                adapter.insert_before(dest_parent, new_el, end);
            } else {
                adapter.append_child(dest_parent, new_el);
            }
        }
    }
}
