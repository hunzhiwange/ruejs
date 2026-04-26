use super::super::Rue;
use super::super::types::{MountInput, MountInputType, MountedTextSubtree};
use crate::runtime::dom_adapter::DomAdapter;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    pub(super) fn patch_text(
        &mut self,
        old_host: Option<A::Element>,
        new: &MountInput<A>,
    ) -> MountedTextSubtree<A> {
        let text = match &new.r#type {
            MountInputType::Text(text) => text.clone(),
            _ => String::new(),
        };

        if let Some(mut el_old) = old_host {
            if let Some(adapter) = self.get_dom_adapter_mut() {
                adapter.set_text_content(&mut el_old, &text);
            }
            MountedTextSubtree {
                host: Some(el_old),
                key: new.key.clone(),
                cleanup_bucket: new.mount_cleanup_bucket.clone(),
                effect_scope_id: new.mount_effect_scope_id,
            }
        } else {
            let parent_opt = self.get_current_container();
            if let Some(adapter) = self.get_dom_adapter_mut() {
                let text_el = adapter.create_text_node(text.as_str());
                if let Some(mut parent) = parent_opt {
                    adapter.append_child(&mut parent, &text_el);
                }
                MountedTextSubtree {
                    host: Some(text_el),
                    key: new.key.clone(),
                    cleanup_bucket: new.mount_cleanup_bucket.clone(),
                    effect_scope_id: new.mount_effect_scope_id,
                }
            } else {
                MountedTextSubtree {
                    host: None,
                    key: new.key.clone(),
                    cleanup_bucket: new.mount_cleanup_bucket.clone(),
                    effect_scope_id: new.mount_effect_scope_id,
                }
            }
        }
    }
}
