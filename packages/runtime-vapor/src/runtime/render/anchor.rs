use super::super::Rue;
use super::super::types::{AnchorMountState, MountInput, MountedState};
#[cfg(feature = "dev")]
use crate::log::{log, want_log};
use crate::runtime::dom_adapter::DomAdapter;
use crate::reactive::core::batch_scope;
use wasm_bindgen::JsValue;
use wasm_bindgen::throw_str;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    pub fn clear_anchor(&mut self, parent: &mut A::Element, anchor: A::Element)
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if self.crashed || crate::runtime::is_runtime_crashed() {
            if let Some(e) = crate::runtime::last_hook_error() {
                wasm_bindgen::throw_val(e);
            } else if let Some(e) = self.last_error.clone() {
                wasm_bindgen::throw_val(e);
            } else {
                throw_str("Rue runtime crashed");
            }
        }

        if self.get_dom_adapter().is_none() {
            throw_str("Rue runtime: no DOM adapter for renderAnchor");
        }

        batch_scope(|| {
            self.current_anchor = Some(anchor.clone());
            self.compact_anchor_map_preserving(Some(&anchor));

            if let Some(idx) = self.find_anchor_index(&anchor) {
                let taken = {
                    let entry = self.anchor_map.get_mut(idx).unwrap();
                    entry.take_mount()
                };

                if let Some(old_mount) = taken {
                    let mut dest_parent = self.resolve_dest_parent_for_end(parent, &anchor);
                    self.clear_mounted_state(&mut dest_parent, old_mount);
                }
            }

            self.current_anchor = None;
        });
    }

    /// 默认公开入口：在单个尾锚点前渲染 MountInput。
    ///
    /// 这层让默认调用方沿用 MountInput-first 协议；底层 patch 内核只恢复 mounted
    /// snapshot，不再临时构造额外树对象。
    pub fn render_anchor_input(
        &mut self,
        input: MountInput<A>,
        parent: &mut A::Element,
        anchor: A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        self.render_anchor_impl(&input, parent, anchor);
    }

    fn render_anchor_impl(
        &mut self,
        input: &MountInput<A>,
        parent: &mut A::Element,
        anchor: A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if self.crashed || crate::runtime::is_runtime_crashed() {
            if let Some(e) = crate::runtime::last_hook_error() {
                wasm_bindgen::throw_val(e);
            } else if let Some(e) = self.last_error.clone() {
                wasm_bindgen::throw_val(e);
            } else {
                throw_str("Rue runtime crashed");
            }
        }

        if self.get_dom_adapter().is_none() {
            throw_str("Rue runtime: no DOM adapter for renderAnchor");
        }

        batch_scope(|| {
            self.current_anchor = Some(anchor.clone());
            self.call_hooks("before_mount");
            self.compact_anchor_map_preserving(Some(&anchor));

            if let Some(idx) = self.find_anchor_index(&anchor) {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "runtime:renderAnchor anchor_map hit") {
                        log("debug", &format!("runtime:renderAnchor anchor_map hit idx={}", idx));
                    }
                }
                let taken = {
                    let entry = self.anchor_map.get_mut(idx).unwrap();
                    entry.take_mount()
                };
                match taken {
                    Some(MountedState::Element(old_element)) => {
                        let mut old_patch = old_element.into_patch_state();
                        let mut parent_clone = parent.clone();
                        self.call_hooks("before_update");
                        self.patch(&mut old_patch, input, &mut parent_clone);
                        self.call_hooks("updated");
                        if let Some(entry) = self.anchor_map.get_mut(idx) {
                            entry.store_mount(MountedState::from_subtree_root(old_patch));
                        }
                    }
                    Some(MountedState::Component(old_component)) => {
                        let mut parent_clone = parent.clone();
                        let mut old_patch = old_component.into_patch_state();
                        self.call_hooks("before_update");
                        self.patch(&mut old_patch, input, &mut parent_clone);
                        self.call_hooks("updated");
                        if let Some(entry) = self.anchor_map.get_mut(idx) {
                            entry.store_mount(MountedState::from_subtree_root(old_patch));
                        }
                    }
                    Some(MountedState::Block(old_block)) => {
                        let mut dest_parent = self.resolve_dest_parent_for_end(parent, &anchor);
                        self.call_hooks("before_update");
                        self.clear_mounted_state(&mut dest_parent, MountedState::Block(old_block));
                        if let Some(mounted) = self.render_anchor_mount(input, parent, &anchor) {
                            self.call_hooks("updated");
                            if let Some(entry) = self.anchor_map.get_mut(idx) {
                                entry.store_mount(mounted);
                            }
                        }
                    }
                    None => {
                        if let Some(mounted) = self.render_anchor_mount(input, parent, &anchor) {
                            if let Some(entry) = self.anchor_map.get_mut(idx) {
                                entry.store_mount(mounted);
                            }
                        }
                    }
                }
            } else {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "runtime:renderAnchor anchor_map miss") {
                        log("debug", "runtime:renderAnchor anchor_map miss, creating new anchor entry");
                    }
                }
                if let Some(mounted) = self.render_anchor_mount(input, parent, &anchor) {
                    self.anchor_map.push(AnchorMountState::new(anchor, mounted));
                }
            }

            self.call_hooks("mounted");
            self.current_anchor = None;
        });
    }

    fn render_anchor_mount(
        &mut self,
        input: &MountInput<A>,
        parent: &mut A::Element,
        anchor: &A::Element,
    ) -> Option<MountedState<A>>
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(mounted) = self.mount_from_input(input) {
            let Some(el) = mounted.host_cloned() else {
                return None;
            };
            let mut dest_parent = self.resolve_dest_parent_for_end(parent, anchor);
            if let Some(adapter) = self.get_dom_adapter() {
                if adapter.is_fragment(&el) {
                    self.insert_fragment_children_preferring_end(
                        &mut dest_parent,
                        &el,
                        &Some(anchor.clone()),
                    );
                } else {
                    self.insert_new_dom_before_end(&mut dest_parent, &el, anchor);
                }
            } else {
                self.insert_new_dom_before_end(&mut dest_parent, &el, anchor);
            }
            Some(MountedState::from_subtree_root(mounted))
        } else {
            let err_to_handle = if let Some(e) = self.last_error.clone() {
                e
            } else {
                js_sys::Error::new("Rue vapor: renderAnchor failed (create_real_dom=None)").into()
            };
            self.handle_error(err_to_handle);
            None
        }
    }
}