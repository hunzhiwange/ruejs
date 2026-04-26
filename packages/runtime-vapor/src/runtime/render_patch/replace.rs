use super::super::Rue;
use super::super::types::{MountInput, MountedPatchSubtree, MountedSubtreeState};
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsValue;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    fn replace_fragment(
        &mut self,
        old: &MountedPatchSubtree<A>,
        new_el: &A::Element,
        dest_parent: &mut A::Element,
        insert_anchor: &Option<A::Element>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        self.clear_fragment_nodes(dest_parent, &old.fragment_nodes);
        if let Some(adapter) = self.get_dom_adapter() {
            if adapter.is_fragment(new_el) {
                self.insert_fragment_children_preferring_end(dest_parent, new_el, insert_anchor);
            } else if let Some(adapter2) = self.get_dom_adapter_mut() {
                if let Some(ref el_old) = old.el {
                    if adapter2.contains(dest_parent, el_old) {
                        adapter2.insert_before(dest_parent, new_el, el_old);
                        let mut p2 = dest_parent.clone();
                        adapter2.remove_child(&mut p2, el_old);
                    } else {
                        let kids = adapter2.collect_fragment_children(dest_parent);
                        for n in kids.iter() {
                            let mut p2 = dest_parent.clone();
                            adapter2.remove_child(&mut p2, n);
                        }
                        adapter2.append_child(dest_parent, new_el);
                    }
                } else {
                    adapter2.append_child(dest_parent, new_el);
                }
            }
        }
    }

    fn replace_vapor_like(
        &mut self,
        old_host: Option<&A::Element>,
        old_fragment_nodes: &[A::Element],
        new_el: &A::Element,
        parent: &mut A::Element,
        insert_anchor: &Option<A::Element>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        let cleared = self.clear_fragment_nodes(parent, old_fragment_nodes);
        if !cleared {
            if let Some(adapter) = self.get_dom_adapter_mut() {
                if let Some(el_old) = old_host {
                    if adapter.contains(parent, el_old) {
                        adapter.insert_before(parent, new_el, el_old);
                        let mut p2 = parent.clone();
                        adapter.remove_child(&mut p2, el_old);
                        return;
                    }
                }
            }
        }
        if let Some(adapter2) = self.get_dom_adapter() {
            if adapter2.is_fragment(new_el) {
                self.insert_fragment_children_preferring_end(parent, new_el, insert_anchor);
            } else {
                self.insert_with_end_anchor_opt(parent, new_el, insert_anchor);
            }
        }
    }

    fn replace_component(
        &mut self,
        old: &MountedPatchSubtree<A>,
        new_el: &A::Element,
        dest_parent: &mut A::Element,
        _parent: &mut A::Element,
        insert_anchor: &Option<A::Element>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        let cleared = self.clear_fragment_nodes(dest_parent, &old.fragment_nodes);
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "replace_component: cleared old frag node") {
                crate::log::log(
                    "debug",
                    &format!("replace_component: cleared old frag nodes: {:?}", cleared),
                );
            }
        }
        if let Some(adapter) = self.get_dom_adapter() {
            if adapter.is_fragment(new_el) {
                if let Some(ref el_old) = old.el {
                    let effective_anchor = self.current_anchor.clone().or(insert_anchor.clone());
                    let mut real_parent =
                        self.resolve_dest_parent(dest_parent, None, effective_anchor.clone());
                    self.clear_current_named_range_if_present(&mut real_parent);
                    self.clear_old_el_if_present(&mut real_parent, el_old);
                    self.insert_fragment_children_preferring_end(
                        &mut real_parent,
                        new_el,
                        &effective_anchor,
                    );
                } else {
                    self.clear_current_named_range_if_present(dest_parent);
                    self.insert_fragment_children_preferring_end(dest_parent, new_el, insert_anchor);
                }
            } else {
                let effective_anchor = self.current_anchor.clone().or(insert_anchor.clone());
                let mut real_parent =
                    self.resolve_dest_parent(dest_parent, old.el.clone(), effective_anchor.clone());

                if !cleared {
                    if let Some(adapter2) = self.get_dom_adapter_mut() {
                        if let Some(ref el_old) = old.el {
                            if adapter2.contains(&real_parent, el_old) {
                                adapter2.insert_before(&mut real_parent, new_el, el_old);
                                let mut p2 = real_parent.clone();
                                adapter2.remove_child(&mut p2, el_old);
                                return;
                            }
                        }
                    }
                }
                self.insert_with_end_anchor_opt(&mut real_parent, new_el, &effective_anchor);
                if let Some(ref el_old) = old.el {
                    self.clear_old_el_if_present(&mut real_parent, el_old);
                }
            }
        }
    }

    fn replace_element(
        &mut self,
        old_host: Option<&A::Element>,
        new_el: &A::Element,
        dest_parent: &mut A::Element,
    ) {
        self.replace_non_fragment_with_fallback(old_host, new_el, dest_parent);
    }

    fn replace_text(
        &mut self,
        old_host: Option<&A::Element>,
        new_el: &A::Element,
        dest_parent: &mut A::Element,
    ) {
        self.replace_non_fragment_with_fallback(old_host, new_el, dest_parent);
    }

    fn replace_non_fragment_with_fallback(
        &mut self,
        old_host: Option<&A::Element>,
        new_el: &A::Element,
        dest_parent: &mut A::Element,
    ) {
        if let Some(adapter) = self.get_dom_adapter_mut() {
            if let Some(el_old) = old_host {
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

    pub(super) fn patch_replace(
        &mut self,
        old: &mut MountedSubtreeState<A>,
        new: &MountInput<A>,
        parent: &mut A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        let lifecycle = old.lifecycle_record();
        let eager_unmounted = matches!(old, MountedSubtreeState::Vapor(_));
        self.invoke_before_unmount_record(&lifecycle);
        if eager_unmounted {
            let anchor_opt = self.current_anchor.clone();
            let mut preclear_parent =
                self.resolve_dest_parent(parent, old.host_cloned(), anchor_opt.clone());
            self.clear_fragment_nodes(&mut preclear_parent, old.fragment_nodes());
            self.invoke_unmounted_record(&lifecycle);
        }
        if let Some(mounted) = self.mount_from_input(new) {
            let Some(el_new) = mounted.host_cloned() else {
                *old = mounted;
                if !eager_unmounted {
                    self.invoke_unmounted_record(&lifecycle);
                }
                return;
            };
            let anchor_opt = self.current_anchor.clone();
            let mut dest_parent =
                self.resolve_dest_parent(parent, old.host_cloned(), anchor_opt.clone());
            let insert_anchor = old.host_cloned().or(anchor_opt.clone());
            match old {
                MountedSubtreeState::Patch(node)
                    if matches!(node.r#type, super::super::types::MountedPatchSubtreeType::Fragment) =>
                {
                    self.replace_fragment(node, &el_new, &mut dest_parent, &insert_anchor);
                }
                MountedSubtreeState::Vapor(vapor) => {
                    self.replace_vapor_like(
                        vapor.host.as_ref(),
                        vapor.fragment_nodes.as_slice(),
                        &el_new,
                        &mut dest_parent,
                        &insert_anchor,
                    );
                }
                MountedSubtreeState::Patch(node)
                    if matches!(node.r#type, super::super::types::MountedPatchSubtreeType::Component(_)) =>
                {
                    self.replace_component(node, &el_new, &mut dest_parent, parent, &insert_anchor);
                }
                MountedSubtreeState::Patch(node)
                    if matches!(node.r#type, super::super::types::MountedPatchSubtreeType::Element(_)) =>
                {
                    self.replace_element(node.el.as_ref(), &el_new, &mut dest_parent);
                }
                MountedSubtreeState::Text(text) => {
                    self.replace_text(text.host.as_ref(), &el_new, &mut dest_parent);
                }
                MountedSubtreeState::Patch(_) => {
                    unreachable!("mounted patch state should not contain phantom nodes")
                }
            }
            *old = mounted;
        }
        if !eager_unmounted {
            self.invoke_unmounted_record(&lifecycle);
        }
    }
}
