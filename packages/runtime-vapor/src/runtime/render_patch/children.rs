use super::super::Rue;
use super::super::types::{
    MountInput, MountInputChild, MountedSubtreeChild, MountedSubtreeState, MountedTextSubtree,
};
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsValue;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    fn keyed_first_dom_node_for_mounted(
        &self,
        mounted: &MountedSubtreeState<A>,
    ) -> Option<A::Element> {
        match mounted {
            MountedSubtreeState::Vapor(vapor) if !vapor.fragment_nodes.is_empty() => {
                vapor.fragment_nodes.first().cloned().or_else(|| vapor.host.clone())
            }
            MountedSubtreeState::Patch(node)
                if matches!(
                    node.r#type,
                    super::super::types::MountedPatchSubtreeType::Fragment
                ) => node.fragment_nodes.first().cloned().or_else(|| node.el.clone()),
            _ => mounted.host_cloned(),
        }
    }

    fn keyed_insert_text(
        &mut self,
        parent: &mut A::Element,
        s: &str,
        cursor: &mut Option<A::Element>,
        anchor_opt: &Option<A::Element>,
    ) -> MountedTextSubtree<A> {
        if let Some(a) = self.get_dom_adapter_mut() {
            let tn = a.create_text_node(s);
            if let Some(am) = self.get_dom_adapter_mut() {
                match cursor {
                    Some(ref cur) => am.insert_before(parent, &tn, cur),
                    None => {
                        if let Some(ref anchor) = anchor_opt {
                            am.insert_before(parent, &tn, anchor);
                        } else {
                            am.append_child(parent, &tn);
                        }
                    }
                }
            }
            *cursor = Some(tn.clone());
            MountedTextSubtree {
                host: Some(tn),
                key: None,
                cleanup_bucket: None,
                effect_scope_id: None,
            }
        } else {
            MountedTextSubtree {
                host: None,
                key: None,
                cleanup_bucket: None,
                effect_scope_id: None,
            }
        }
    }

    fn keyed_patch_existing_text(
        &mut self,
        parent: &mut A::Element,
        old_text: &MountedTextSubtree<A>,
        s: &str,
        cursor: &mut Option<A::Element>,
        anchor_opt: &Option<A::Element>,
    ) -> MountedTextSubtree<A> {
        let mut mounted = old_text.clone();
        if let Some(mut text_node) = mounted.host.clone() {
            if let Some(adapter) = self.get_dom_adapter_mut() {
                adapter.set_text_content(&mut text_node, s);
                match cursor {
                    Some(ref cur) => adapter.insert_before(parent, &text_node, cur),
                    None => {
                        if let Some(ref anchor) = anchor_opt {
                            adapter.insert_before(parent, &text_node, anchor);
                        } else {
                            adapter.append_child(parent, &text_node);
                        }
                    }
                }
            }
            mounted.host = Some(text_node.clone());
            *cursor = Some(text_node);
        }

        mounted
    }

    fn keyed_move_or_create_input_existing(
        &mut self,
        parent: &mut A::Element,
        nc: &MountInput<A>,
        old_children: &mut [MountedSubtreeChild<A>],
        old_key_map: &std::collections::HashMap<String, usize>,
        cursor: &mut Option<A::Element>,
        anchor_opt: &Option<A::Element>,
    ) -> Option<MountedSubtreeState<A>>
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(MountedSubtreeChild::Subtree(oldv)) =
            old_children.get_mut(*old_key_map.get(&nc.key.clone().unwrap()).unwrap())
        {
            self.patch(oldv, nc, parent);
            let mounted = oldv.clone();
            let mut node_for_move: Option<A::Element> = None;
            let fragment_move = match &mounted {
                MountedSubtreeState::Vapor(vapor) if !vapor.fragment_nodes.is_empty() => {
                    Some((vapor.fragment_nodes.as_slice(), vapor.host.as_ref()))
                }
                MountedSubtreeState::Patch(node)
                    if matches!(
                        node.r#type,
                        super::super::types::MountedPatchSubtreeType::Fragment
                    ) =>
                {
                    Some((node.fragment_nodes.as_slice(), node.el.as_ref()))
                }
                _ => None,
            };
            if let Some((fragment_nodes, host_opt)) = fragment_move {
                if let Some(am) = self.get_dom_adapter_mut() {
                    for n in fragment_nodes.iter() {
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
                node_for_move = fragment_nodes.first().cloned().or_else(|| host_opt.cloned());
            }

            if node_for_move.is_none() {
                if let Some(ref el_c) = mounted.host_cloned() {
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
                    node_for_move = Some(el_c.clone());
                }
            }
            *cursor = node_for_move.clone().or(cursor.clone());
            Some(mounted)
        } else {
            None
        }
    }

    fn keyed_create_input_new(
        &mut self,
        parent: &mut A::Element,
        nc: &MountInput<A>,
        cursor: &mut Option<A::Element>,
        anchor_opt: &Option<A::Element>,
    ) -> Option<MountedSubtreeState<A>>
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(mounted) = self.mount_from_input(nc) {
            let first_dom_node = self.keyed_first_dom_node_for_mounted(&mounted);
            let fragment_insert = match &mounted {
                MountedSubtreeState::Vapor(vapor) if !vapor.fragment_nodes.is_empty() => {
                    Some(vapor.fragment_nodes.as_slice())
                }
                MountedSubtreeState::Patch(node)
                    if matches!(
                        node.r#type,
                        super::super::types::MountedPatchSubtreeType::Fragment
                    ) =>
                {
                    Some(node.fragment_nodes.as_slice())
                }
                _ => None,
            };
            if let Some(fragment_nodes) = fragment_insert {
                if let Some(am) = self.get_dom_adapter_mut() {
                    for n in fragment_nodes.iter() {
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
            } else if let Some(child_el) = mounted.host_cloned() {
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
            }
            *cursor = first_dom_node.or(cursor.clone());
            Some(mounted)
        } else {
            None
        }
    }

    fn keyed_cleanup_old_removed(
        &mut self,
        parent: &mut A::Element,
        old_children: &mut [MountedSubtreeChild<A>],
        new_key_set: &std::collections::HashSet<String>,
        reused_old_indexes: &std::collections::HashSet<usize>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        for (idx, oc) in old_children.iter_mut().enumerate() {
            if reused_old_indexes.contains(&idx) {
                continue;
            }
            if let MountedSubtreeChild::Subtree(ov) = oc {
                let k = ov.key().cloned().unwrap_or_default();
                if k.is_empty() || !new_key_set.contains(&k) {
                    let lifecycle = ov.lifecycle_record();
                    let host = ov.host_cloned();
                    let fragment_nodes = ov.fragment_nodes_cloned();

                    self.invoke_before_unmount_record(&lifecycle);
                    self.clear_mounted_dom_identity(parent, host.as_ref(), &fragment_nodes);
                    self.invoke_unmounted_record(&lifecycle);
                }
            }
        }
    }

    pub(super) fn patch_children_keyed(
        &mut self,
        parent: &mut A::Element,
        old_children: &mut [MountedSubtreeChild<A>],
        new_children: &[MountInputChild<A>],
    ) -> Vec<MountedSubtreeChild<A>>
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        let anchor_opt = match self.current_anchor.clone() {
            Some(anchor) => {
                let use_anchor = if let Some(adapter) = self.get_dom_adapter() {
                    adapter.contains(parent, &anchor)
                } else {
                    false
                };
                if use_anchor {
                    Some(anchor)
                } else {
                    None
                }
            }
            None => None,
        };
        let mut old_key_map = std::collections::HashMap::new();
        for (idx, ch) in old_children.iter_mut().enumerate() {
            if let MountedSubtreeChild::Subtree(v) = ch {
                if let Some(k) = v.key() {
                    old_key_map.insert(k.clone(), idx);
                }
            }
        }

        let mut new_key_set = std::collections::HashSet::new();
        let mut reused_old_indexes = std::collections::HashSet::new();
        let mut cursor: Option<A::Element> = None;
        let mut mounted_children_rev: Vec<MountedSubtreeChild<A>> = Vec::new();
        let mut i: i32 = (new_children.len() as i32) - 1;
        while i >= 0 {
            let ch = &new_children[i as usize];
            match ch {
                MountInputChild::Text(s) => {
                    if let Some(MountedSubtreeChild::Subtree(MountedSubtreeState::Text(old_text))) =
                        old_children.get(i as usize)
                    {
                        reused_old_indexes.insert(i as usize);
                        let mounted_text = self.keyed_patch_existing_text(
                            parent,
                            old_text,
                            s.as_str(),
                            &mut cursor,
                            &anchor_opt,
                        );
                        mounted_children_rev.push(MountedSubtreeChild::Subtree(
                            MountedSubtreeState::Text(mounted_text),
                        ));
                    } else {
                        let mounted_text =
                            self.keyed_insert_text(parent, s.as_str(), &mut cursor, &anchor_opt);
                        mounted_children_rev.push(MountedSubtreeChild::Subtree(
                            MountedSubtreeState::Text(mounted_text),
                        ));
                    }
                }
                MountInputChild::Input(nc) => {
                    let key = nc.key.clone().unwrap_or_default();
                    new_key_set.insert(key.clone());
                    if nc.key.is_some() && old_key_map.contains_key(&key) {
                        reused_old_indexes.insert(*old_key_map.get(&key).unwrap());
                        if let Some(mounted) = self.keyed_move_or_create_input_existing(
                            parent,
                            nc,
                            old_children,
                            &old_key_map,
                            &mut cursor,
                            &anchor_opt,
                        ) {
                            mounted_children_rev.push(MountedSubtreeChild::Subtree(mounted));
                        }
                    } else if nc.key.is_none() {
                        if let Some(MountedSubtreeChild::Subtree(oldv)) =
                            old_children.get_mut(i as usize)
                        {
                            if oldv.key().is_none() {
                                reused_old_indexes.insert(i as usize);
                                self.patch(oldv, nc, parent);
                                cursor = self.keyed_first_dom_node_for_mounted(oldv).or(cursor.clone());
                                mounted_children_rev.push(MountedSubtreeChild::Subtree(oldv.clone()));
                                i -= 1;
                                continue;
                            }
                        }
                        if let Some(mounted) =
                            self.keyed_create_input_new(parent, nc, &mut cursor, &anchor_opt)
                        {
                            mounted_children_rev.push(MountedSubtreeChild::Subtree(mounted));
                        }
                    } else if let Some(mounted) =
                        self.keyed_create_input_new(parent, nc, &mut cursor, &anchor_opt)
                    {
                        mounted_children_rev.push(MountedSubtreeChild::Subtree(mounted));
                    }
                }
            }
            i -= 1;
        }

        self.keyed_cleanup_old_removed(parent, old_children, &new_key_set, &reused_old_indexes);
        mounted_children_rev.reverse();
        mounted_children_rev
    }
}
