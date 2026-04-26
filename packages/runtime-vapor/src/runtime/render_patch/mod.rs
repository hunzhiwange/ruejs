use super::Rue;
use super::types::{MountInput, MountedPatchSubtree, MountedSubtreeState};
#[cfg(feature = "dev")]
use crate::log::{log, want_log};
use crate::runtime::dom_adapter::DomAdapter;
#[cfg(feature = "dev")]
use js_sys::Function;
#[cfg(feature = "dev")]
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

mod children;
mod component;
mod replace;
mod replace_utils;
mod text;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    fn patch_props_only(
        &mut self,
        el: &mut A::Element,
        old: &super::props::Props,
        new: &super::props::Props,
    ) {
        let mut res_patch: Option<Result<(), JsValue>> = None;
        let mut res_post: Option<Result<(), JsValue>> = None;
        if let Some(adapter) = self.get_dom_adapter_mut() {
            let mut el_clone = el.clone();
            res_patch = Some(super::props::patch_props(adapter, &mut el_clone, old, new));
            res_post = Some(super::props::post_patch_element(adapter, &mut el_clone, new));
        }
        if let Some(Err(e)) = res_patch {
            self.handle_error(e);
        }
        if let Some(Err(e)) = res_post {
            self.handle_error(e);
        }
    }

    pub fn patch(
        &mut self,
        old: &mut MountedSubtreeState<A>,
        new: &MountInput<A>,
        parent: &mut A::Element,
    )
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        let keys_changed = match (old.key(), &new.key) {
            (Some(ko), Some(kn)) => ko != kn,
            (None, Some(_)) | (Some(_), None) => true,
            _ => false,
        };
        let type_changed = !old.matches_input_type(&new.r#type);
        #[cfg(feature = "dev")]
        {
            if want_log("debug", "runtime:patch type_check") {
                let parent_desc = if let Some(adapter) = self.get_dom_adapter() {
                    adapter.get_tag_name(parent)
                } else {
                    String::from("<no-adapter>")
                };
                log("debug", &format!("runtime:patch type_check parent_tag={}", parent_desc));
                let old_key = old.key().cloned().unwrap_or_default();
                let new_key = new.key.clone().unwrap_or_default();
                if let (Some(of), super::types::MountInputType::Component(nf)) =
                    (old.component_render_fn(), &new.r#type)
                {
                    let old_name = of
                        .dyn_ref::<Function>()
                        .map(|f| String::from(f.name()))
                        .unwrap_or_else(|| String::from("<non-fn>"));
                    let new_name = nf
                        .dyn_ref::<Function>()
                        .map(|f| String::from(f.name()))
                        .unwrap_or_else(|| String::from("<non-fn>"));
                    log(
                        "debug",
                        &format!(
                            "runtime:patch type_check component of_name={} nf_name={} ptr_eq={}",
                            old_name,
                            new_name,
                            of.eq(nf)
                        ),
                    );
                }
                log(
                    "debug",
                    &format!(
                        "runtime:patch type_check old_type={} new_type={} keys_changed={} type_changed={} old_key={} new_key={}",
                        old.debug_type_name(),
                        new.r#type.debug_name(),
                        keys_changed,
                        type_changed,
                        old_key,
                        new_key
                    ),
                );
            }
        }
        if keys_changed || type_changed {
            self.patch_replace(old, new, parent);
            return;
        }
        match old {
            MountedSubtreeState::Text(text) => {
                let mounted_text = self.patch_text(text.host.clone(), new);
                *old = MountedSubtreeState::Text(mounted_text);
            }
            MountedSubtreeState::Patch(node)
                if matches!((&node.r#type, &new.r#type), (super::types::MountedPatchSubtreeType::Fragment, super::types::MountInputType::Fragment)) =>
            {
                if let Some(mounted) = self.patch_fragment_same(node, new, parent) {
                    *old = mounted;
                }
            }
            MountedSubtreeState::Patch(node)
                if matches!((&node.r#type, &new.r#type), (super::types::MountedPatchSubtreeType::Element(_), super::types::MountInputType::Element(_))) =>
            {
                if let Some(ref el_old) = node.el {
                    let mut el = el_old.clone();
                    self.patch_props_only(&mut el, &node.props, &new.props);
                    let mounted_children =
                        self.patch_children_keyed(&mut el, &mut node.children, &new.children);
                    node.props = new.props.clone();
                    node.children = mounted_children;
                    node.el = Some(el_old.clone());
                    node.key = new.key.clone();
                    node.mount_cleanup_bucket = new.mount_cleanup_bucket.clone();
                    node.mount_effect_scope_id = new.mount_effect_scope_id;
                    if let super::types::MountInputType::Element(tag) = &new.r#type {
                        node.r#type = super::types::MountedPatchSubtreeType::Element(tag.clone());
                    }
                } else if let Some(mounted) = self.patch_rebuild_same(node.el.clone(), new, parent) {
                    *old = mounted;
                }
            }
            MountedSubtreeState::Patch(node)
                if matches!((&node.r#type, &new.r#type), (super::types::MountedPatchSubtreeType::Component(_), super::types::MountInputType::Component(_))) =>
            {
                self.patch_component_same(node, new, parent);
            }
            MountedSubtreeState::Vapor(_) => {
                self.patch_replace(old, new, parent);
            }
            _ => {
                if let Some(mounted) = self.patch_rebuild_same(old.host_cloned(), new, parent) {
                    *old = mounted;
                }
            }
        }
    }

    fn patch_fragment_same(
        &mut self,
        old: &MountedPatchSubtree<A>,
        new: &MountInput<A>,
        parent: &mut A::Element,
    ) -> Option<MountedSubtreeState<A>>
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(mounted) = self.mount_from_input(new) {
            let Some(el_new) = mounted.host_cloned() else {
                return Some(mounted);
            };
            let anchor_opt = self.current_anchor.clone();
            let mut dest_parent =
                self.resolve_dest_parent(parent, old.el.clone(), anchor_opt.clone());
            let insert_anchor = if let Some(ref el_old) = old.el {
                if let Some(adapter) = self.get_dom_adapter() {
                    if !adapter.is_fragment(el_old) && adapter.contains(&dest_parent, el_old) {
                        Some(el_old.clone())
                    } else {
                        anchor_opt.clone()
                    }
                } else {
                    anchor_opt.clone().or_else(|| Some(el_old.clone()))
                }
            } else {
                anchor_opt.clone()
            };
            let lifecycle = old.lifecycle_record();
            self.invoke_before_unmount_record(&lifecycle);
            self.clear_fragment_nodes(&mut dest_parent, &old.fragment_nodes);
            self.insert_fragment_children(&mut dest_parent, &el_new, &insert_anchor);
            if let Some(ref el_old) = old.el {
                self.clear_old_el_if_present(&mut dest_parent, el_old);
            }
            self.invoke_unmounted_record(&lifecycle);
            Some(mounted)
        } else {
            None
        }
    }

    fn patch_rebuild_same(
        &mut self,
        old_host: Option<A::Element>,
        new: &MountInput<A>,
        parent: &mut A::Element,
    ) -> Option<MountedSubtreeState<A>>
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(mounted) = self.mount_from_input(new) {
            let Some(el_new) = mounted.host_cloned() else {
                return Some(mounted);
            };
            let anchor_opt = self.current_anchor.clone();
            if let Some(a) = self.get_dom_adapter_mut() {
                if let Some(ref el_old) = old_host {
                    a.insert_before(parent, &el_new, el_old);
                    let mut p = parent.clone();
                    a.remove_child(&mut p, el_old);
                } else if let Some(anchor) = anchor_opt {
                    if a.contains(parent, &anchor) {
                        a.insert_before(parent, &el_new, &anchor);
                    } else {
                        a.append_child(parent, &el_new);
                    }
                } else {
                    a.append_child(parent, &el_new);
                }
            }
            Some(mounted)
        } else {
            None
        }
    }
}
