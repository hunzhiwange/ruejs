use super::super::Rue;
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsValue;

// 子节点按 key 的增量更新（Keyed Diff）：
// - 根据旧 children 构建 key -> index 映射，便于定位可复用的旧节点。
// - 逆向遍历新 children，借助 cursor（光标）与 anchor（锚点）控制插入位置。
// - 片段（Fragment）特殊处理：移动/插入的是其子节点列表而非片段占位本身。
// - 遍历结束后清理旧 children 中已移除的节点，触发卸载钩子并移除真实 DOM。

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    /// 在 Keyed Diff 中插入文本节点，并更新光标位置
    ///
    /// 参数：
    /// - parent：父元素
    /// - s：文本内容
    /// - cursor：当前光标（用于保持插入顺序）
    /// - anchor_opt：可选锚点（优先插入到锚点之前）
    fn keyed_insert_text(
        &mut self,
        parent: &mut A::Element,
        s: &str,
        cursor: &mut Option<A::Element>,
        anchor_opt: &Option<A::Element>,
    ) {
        // 文本节点插入：创建文本节点，根据 cursor/anchor 决定插入前或尾部追加
        if let Some(a) = self.get_dom_adapter_mut() {
            let tn = a.create_text_node(s);
            if let Some(am) = self.get_dom_adapter_mut() {
                match cursor {
                    Some(ref cur) => am.insert_before(parent, &tn, cur),
                    None => {
                        // 若存在锚点，则插在锚点前；否则直接追加
                        if let Some(ref anchor) = anchor_opt {
                            am.insert_before(parent, &tn, anchor);
                        } else {
                            am.append_child(parent, &tn);
                        }
                    }
                }
            }
            // 更新 cursor，使后续插入保持相对顺序
            *cursor = Some(tn);
        }
    }

    /// 复用旧 VNode：递归 patch 后，将对应真实节点移动到目标位置
    ///
    /// 参数：
    /// - parent：父元素
    /// - nc：新 VNode（带 key）
    /// - old_children：旧 children 列表
    /// - old_key_map：旧 key -> index 映射
    /// - cursor/anchor_opt：插入位置控制
    fn keyed_move_or_create_vnode_existing(
        &mut self,
        parent: &mut A::Element,
        nc: &mut super::super::types::VNode<A>,
        old_children: &mut [super::super::types::Child<A>],
        old_key_map: &std::collections::HashMap<String, usize>,
        cursor: &mut Option<A::Element>,
        anchor_opt: &Option<A::Element>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        use super::super::types::{Child, VNodeType};
        // 已存在的旧 VNode：先对其执行递归 patch，再将对应真实节点移动到正确位置
        if let Some(Child::VNode(oldv)) =
            old_children.get_mut(*old_key_map.get(&nc.key.clone().unwrap()).unwrap())
        {
            self.patch(oldv, nc, parent);
            let mut node_for_move: Option<A::Element> = None;
            if let VNodeType::Fragment = nc.r#type {
                // 片段：移动其子节点列表（collect_fragment_children）
                if let Some(a) = self.get_dom_adapter() {
                    if let Some(ref el_c) = nc.el {
                        let list = a.collect_fragment_children(el_c);
                        if let Some(am) = self.get_dom_adapter_mut() {
                            for n in list.iter() {
                                match cursor {
                                    Some(ref cur) => am.insert_before(parent, n, cur),
                                    None => {
                                        if let Some(ref anchor) = anchor_opt {
                                            am.insert_before(parent, n, anchor);
                                        } else {
                                            am.append_child(parent, n);
                                        }
                                    }
                                }
                            }
                        }
                        // 取首个子节点作为 cursor 更新的参照
                        node_for_move = list.first().cloned();
                    }
                }
            } else {
                if let Some(ref el_c) = nc.el {
                    if let Some(am) = self.get_dom_adapter_mut() {
                        match cursor {
                            Some(ref cur) => am.insert_before(parent, el_c, cur),
                            None => {
                                if let Some(ref anchor) = anchor_opt {
                                    am.insert_before(parent, el_c, anchor);
                                } else {
                                    am.append_child(parent, el_c);
                                }
                            }
                        }
                    }
                    // 非片段：直接以自身 el 作为移动参照
                    node_for_move = Some(el_c.clone());
                }
            }
            // 更新 cursor：确保后续节点都能插到当前节点之前或锚点之前
            *cursor = node_for_move.clone().or(cursor.clone());
        }
    }

    /// 新建 VNode：创建真实 DOM 并按光标/锚点插入
    ///
    /// 参数：
    /// - parent：父元素
    /// - nc：新 VNode（可能无 key）
    /// - cursor/anchor_opt：插入位置控制
    fn keyed_create_vnode_new(
        &mut self,
        parent: &mut A::Element,
        nc: &mut super::super::types::VNode<A>,
        cursor: &mut Option<A::Element>,
        anchor_opt: &Option<A::Element>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 新 VNode（在旧 key 集不存在）：创建真实 DOM 并插入到正确位置
        if let Some(child_el) = self.create_real_dom(nc) {
            if let Some(am) = self.get_dom_adapter_mut() {
                match cursor {
                    Some(ref cur) => am.insert_before(parent, &child_el, cur),
                    None => {
                        if let Some(ref anchor) = anchor_opt {
                            am.insert_before(parent, &child_el, anchor);
                        } else {
                            am.append_child(parent, &child_el);
                        }
                    }
                }
            }
            // 更新 cursor 到新创建的节点
            *cursor = Some(child_el);
        }
    }

    /// 清理旧 children 中已移除的节点，并触发卸载生命周期
    ///
    /// 参数：
    /// - parent：父元素
    /// - old_children：旧 children 列表
    /// - new_key_set：新 key 集合（用于判断是否保留）
    fn keyed_cleanup_old_removed(
        &mut self,
        parent: &mut A::Element,
        old_children: &mut [super::super::types::Child<A>],
        new_key_set: &std::collections::HashSet<String>,
    ) {
        use super::super::types::{Child, VNodeType};
        // 清理旧 children 中键不存在于新集合的节点：触发生命周期卸载并移除 DOM
        for oc in old_children.iter_mut() {
            if let Child::VNode(ov) = oc {
                let k = ov.key.clone().unwrap_or_default();
                if k.is_empty() || !new_key_set.contains(&k) {
                    self.invoke_before_unmount_vnode(ov);
                    if let Some(am) = self.get_dom_adapter_mut() {
                        match &ov.r#type {
                            VNodeType::Fragment => {
                                if let Some(ref el_f) = ov.el {
                                    let list = am.collect_fragment_children(el_f);
                                    for n in list.iter() {
                                        let mut p2 = parent.clone();
                                        am.remove_child(&mut p2, n);
                                    }
                                }
                            }
                            _ => {
                                if let Some(ref el_old) = ov.el {
                                    let mut p2 = parent.clone();
                                    am.remove_child(&mut p2, el_old);
                                }
                            }
                        }
                        // 卸载后续钩子：确保组件/片段等按约定完成清理
                        self.invoke_unmounted_vnode(ov);
                    }
                }
            }
        }
    }

    /// Keyed 子节点的主增量更新：构建映射、倒序遍历并插入/移动/创建
    ///
    /// 参数：
    /// - parent：父元素
    /// - old_children/new_children：旧/新 children 列表
    /// 行为：
    /// - 构建旧 key 映射，倒序遍历新 children
    /// - 复用或创建节点并保持顺序，最后清理已移除节点
    pub(super) fn patch_children_keyed(
        &mut self,
        parent: &mut A::Element,
        old_children: &mut [super::super::types::Child<A>],
        new_children: &mut [super::super::types::Child<A>],
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        use super::super::types::Child;
        // 预备阶段：收集锚点、构建旧 key 映射（便于 O(1) 定位旧节点）
        let anchor_opt = self.current_anchor.clone();
        let mut old_key_map = std::collections::HashMap::new();
        for (idx, ch) in old_children.iter_mut().enumerate() {
            if let Child::VNode(v) = ch {
                if let Some(k) = &v.key {
                    old_key_map.insert(k.clone(), idx);
                }
            }
        }
        // 新 key 集用于后续删除判断
        let mut new_key_set = std::collections::HashSet::new();
        let mut cursor: Option<A::Element> = None;
        // 倒序遍历：保证按从尾到头的稳定插入，避免频繁移动
        let mut i: i32 = (new_children.len() as i32) - 1;
        while i >= 0 {
            let ch = &mut new_children[i as usize];
            match ch {
                Child::Text(s) => {
                    // 文本直接插入：作为稳定占位参与 cursor 更新
                    self.keyed_insert_text(parent, s.as_str(), &mut cursor, &anchor_opt);
                }
                Child::VNode(nc) => {
                    let key = nc.key.clone().unwrap_or_default();
                    new_key_set.insert(key.clone());
                    if nc.key.is_some() && old_key_map.contains_key(&key) {
                        // 可复用旧节点：执行递归 patch 并移动到目标位置
                        self.keyed_move_or_create_vnode_existing(
                            parent,
                            nc,
                            old_children,
                            &old_key_map,
                            &mut cursor,
                            &anchor_opt,
                        );
                    } else {
                        // 新节点：创建并插入到正确位置
                        self.keyed_create_vnode_new(parent, nc, &mut cursor, &anchor_opt);
                    }
                }
                _ => {}
            }
            i -= 1;
        }
        // 遍历结束：清理旧集合中已不在新集合的节点
        self.keyed_cleanup_old_removed(parent, old_children, &new_key_set);
    }
}
