use super::super::Rue;
use super::super::types::{
    MountInput, MountInputType, MountedPatchSubtree, MountedPatchSubtreeType,
    MountedSubtreeState,
};
use crate::hook::reactive::props_reactive_js;
use crate::reactive::core::{pop_effect_scope, push_effect_scope};
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    fn comp_prepare_instance(
        &mut self,
        old_inst_index: Option<usize>,
        new: &MountInput<A>,
    ) -> (JsValue, Object, usize)
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        let existing_idx = old_inst_index;
        let (stored_props_ro, stored_host, stored_hooks) = if let Some(idx) = existing_idx {
            if let Some(inst) = self.instance_store.get(&idx) {
                (
                    Some(inst.props_ro.clone()),
                    Some(inst.host.clone()),
                    Some(inst.hooks.0.clone()),
                )
            } else {
                (None, None, None)
            }
        } else {
            (None, None, None)
        };

        let props_ro = stored_props_ro.unwrap_or_else(|| {
            let props_js = self.props_with_children_input_to_jsobject(new);
            props_reactive_js(props_js.clone(), Some(true))
        });
        let host: Object = stored_host
            .filter(|h| h.is_object())
            .map(Object::from)
            .unwrap_or_else(Object::new);
        let _ = Reflect::set(&host, &JsValue::from_str("propsRO"), &props_ro);
        Self::reset_hook_index(&host);

        let hooks = stored_hooks.unwrap_or_default();
        let idx = if let Some(i) = existing_idx {
            i
        } else {
            let new_idx = self.instance_store.len();
            let new_inst = super::super::instance::ComponentInternalInstance::<A> {
                parent: None,
                is_mounted: true,
                hooks: super::super::instance::LifecycleHooks(hooks.clone()),
                props_ro: props_ro.clone(),
                host: host.clone().into(),
                render_scope_id: None,
                error: None,
                error_handlers: Vec::new(),
                index: new_idx,
                _marker: std::marker::PhantomData,
            };
            self.instance_store.insert(new_idx, new_inst);
            new_idx
        };

        if let Some(inst_ref) = self.instance_store.get_mut(&idx) {
            inst_ref.props_ro = props_ro.clone();
            inst_ref.host = host.clone().into();
            inst_ref.hooks = super::super::instance::LifecycleHooks(hooks.clone());
            inst_ref.is_mounted = true;
        }
        self.sync_props_children_input(&props_ro, &new.props, &new.children);
        self.instance_stack.push(idx);
        if let Some(top_idx) = self.instance_stack.last() {
            if let Some(inst_ref) = self.instance_store.get_mut(top_idx) {
                crate::reactive::context::set_current_instance_ci(inst_ref);
            }
        }
        self.call_hooks("before_update");
        (props_ro, host, idx)
    }

    fn comp_execute_and_collect(
        &mut self,
        render_fn: &JsValue,
        props_ro: &JsValue,
        idx: usize,
    ) -> JsValue {
        let func = render_fn.dyn_ref::<Function>().unwrap();
        let render_scope_id = self.renew_component_render_scope(idx);
        push_effect_scope(render_scope_id);
        let ret = match func.call1(&JsValue::UNDEFINED, props_ro) {
            Ok(v) => v,
            Err(e) => {
                let _ = pop_effect_scope();
                self.handle_error(e.clone());
                self.instance_stack.pop();
                if let Some(top_idx) = self.instance_stack.last() {
                    if let Some(inst_ref) = self.instance_store.get_mut(top_idx) {
                        crate::reactive::context::set_current_instance_ci(inst_ref);
                    } else {
                        crate::set_current_instance(JsValue::UNDEFINED);
                    }
                } else {
                    crate::set_current_instance(JsValue::UNDEFINED);
                }
                wasm_bindgen::throw_val(e.clone());
            }
        };
        let _ = pop_effect_scope();
        let pending = crate::runtime::take_pending_hooks();
        if let Some(top_idx) = self.instance_stack.last() {
            if let Some(inst) = self.instance_store.get_mut(top_idx) {
                for (name, f) in pending.into_iter() {
                    let list = inst.hooks.0.entry(name).or_insert_with(Vec::new);
                    list.push(f);
                }
            }
        }
        ret
    }

    fn comp_make_sub_from_ret(&mut self, ret: &JsValue) -> Option<MountInput<A>>
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(input) = self.compat_value_to_input(ret) {
            Some(input)
        } else if ret.is_object() {
            let error = JsValue::from_str(
                "Unsupported object returns are no longer accepted on the default component path. Return a raw node, fragment, or mount handle instead.",
            );
            self.handle_error(error.clone());
            wasm_bindgen::throw_val(error);
        } else {
            let el: A::Element = ret.clone().into();
            Some(MountInput {
                r#type: MountInputType::<A>::Vapor,
                props: super::super::types::ComponentProps::new(),
                children: vec![],
                key: None,
                mount_cleanup_bucket: None,
                mount_effect_scope_id: None,
                el_hint: Some(el),
            })
        }
    }

    fn comp_mount_or_patch_subtree(
        &mut self,
        old: &mut MountedPatchSubtree<A>,
        parent: &mut A::Element,
        new_sub: MountInput<A>,
    ) -> Option<MountedSubtreeState<A>>
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(old_sub) = old.comp_subtree.as_deref_mut() {
            self.patch(old_sub, &new_sub, parent);
            Some(old_sub.clone())
        } else if let Some(mounted_subtree) = self.mount_from_input(&new_sub) {
            if let Some(el_new) = mounted_subtree.host_cloned() {
                let anchor_opt = self.current_anchor.clone();
                let mut dest_parent =
                    self.resolve_dest_parent(parent, old.el.clone(), anchor_opt.clone());
                self.clear_fragment_nodes(&mut dest_parent, &old.fragment_nodes);

                if let Some(a) = self.get_dom_adapter_mut() {
                    if let Some(ref el_old) = old.el {
                        if a.contains(&dest_parent, el_old) {
                            let mut p2 = dest_parent.clone();
                            a.remove_child(&mut p2, el_old);
                        }
                    }
                    if let Some(anchor) = anchor_opt {
                        if a.contains(&dest_parent, &anchor) {
                            a.insert_before(&mut dest_parent, &el_new, &anchor);
                        } else {
                            a.append_child(&mut dest_parent, &el_new);
                        }
                    } else {
                        a.append_child(&mut dest_parent, &el_new);
                    }
                }
            }
            Some(mounted_subtree)
        } else {
            None
        }
    }

    fn comp_finalize(&mut self) -> std::collections::HashMap<String, Vec<JsValue>> {
        let hooks = self
            .instance_stack
            .last()
            .and_then(|top_idx| self.instance_store.get(top_idx))
            .map(|ci| ci.hooks.0.clone())
            .unwrap_or_default();
        self.call_hooks("updated");
        self.instance_stack.pop();
        if let Some(top_idx) = self.instance_stack.last() {
            if let Some(inst_ref) = self.instance_store.get_mut(top_idx) {
                crate::reactive::context::set_current_instance_ci(inst_ref);
            } else {
                crate::set_current_instance(JsValue::UNDEFINED);
            }
        } else {
            crate::set_current_instance(JsValue::UNDEFINED);
        }
        hooks
    }

    pub(super) fn patch_component_same(
        &mut self,
        old: &mut MountedPatchSubtree<A>,
        new: &MountInput<A>,
        parent: &mut A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        let render_fn = match &new.r#type {
            MountInputType::Component(render_fn) => render_fn,
            _ => unreachable!(),
        };
        let (props_ro, _host, idx) = self.comp_prepare_instance(old.comp_inst_index, new);
        let ret = self.comp_execute_and_collect(render_fn, &props_ro, idx);
        let new_sub_opt = self.comp_make_sub_from_ret(&ret);
        let mut mounted_subtree = old.comp_subtree.as_deref().cloned();
        if let Some(new_sub) = new_sub_opt {
            mounted_subtree = self.comp_mount_or_patch_subtree(old, parent, new_sub);
        }
        let hooks = self.comp_finalize();
        old.key = new.key.clone();
        old.mount_cleanup_bucket = new.mount_cleanup_bucket.clone();
        old.mount_effect_scope_id = new.mount_effect_scope_id;
        old.comp_inst_index = Some(idx);
        old.component_before_unmount_hooks = hooks
            .get("before_unmount")
            .cloned()
            .unwrap_or_default();
        old.component_unmounted_hooks = hooks.get("unmounted").cloned().unwrap_or_default();

        if let Some(subtree) = mounted_subtree {
            old.el = subtree.host_cloned();
            old.fragment_nodes = subtree.fragment_nodes_cloned();
            old.comp_subtree = Some(Box::new(subtree));
        }

        old.r#type = MountedPatchSubtreeType::Component(render_fn.clone());
    }
}
