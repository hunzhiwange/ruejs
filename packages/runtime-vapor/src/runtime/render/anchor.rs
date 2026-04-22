use super::super::Rue;
use super::super::types::VNode;
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
    fn render_anchor_mount(
        &mut self,
        vnode: &mut VNode<A>,
        parent: &mut A::Element,
        anchor: &A::Element,
    ) -> bool
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(el) = self.create_real_dom(vnode) {
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
            true
        } else {
            let err_to_handle = if let Some(e) = self.last_error.clone() {
                e
            } else {
                js_sys::Error::new("Rue vapor: renderAnchor failed (create_real_dom=None)").into()
            };
            self.handle_error(err_to_handle);
            false
        }
    }

    /// 在单个尾锚点前渲染 vnode，并基于锚点复用旧子树
    pub fn render_anchor(
        &mut self,
        mut vnode: VNode<A>,
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
            self.compact_anchor_map();

            if let Some(idx) = self.find_anchor_index(&anchor) {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "runtime:renderAnchor anchor_map hit") {
                        log("debug", &format!("runtime:renderAnchor anchor_map hit idx={}", idx));
                    }
                }
                let taken = {
                    let entry = self.anchor_map.get_mut(idx).unwrap();
                    entry.1.take()
                };
                if let Some(mut old_vnode) = taken {
                    let mut parent_clone = parent.clone();
                    self.call_hooks("before_update");
                    self.patch(&mut old_vnode, &mut vnode, &mut parent_clone);
                    self.call_hooks("updated");
                    if let Some(entry) = self.anchor_map.get_mut(idx) {
                        entry.1 = Some(vnode);
                    }
                } else if self.render_anchor_mount(&mut vnode, parent, &anchor) {
                    if let Some(entry) = self.anchor_map.get_mut(idx) {
                        entry.1 = Some(vnode);
                    }
                }
            } else {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "runtime:renderAnchor anchor_map miss") {
                        log("debug", "runtime:renderAnchor anchor_map miss, creating new anchor entry");
                    }
                }
                if self.render_anchor_mount(&mut vnode, parent, &anchor) {
                    self.anchor_map.push((anchor, Some(vnode)));
                }
            }

            self.call_hooks("mounted");
            self.current_anchor = None;
        });
    }
}