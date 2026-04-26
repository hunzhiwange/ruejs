use super::super::types::{MountInput, MountInputType, MountedSubtreeState, MountedTextSubtree};
use super::super::Rue;
use crate::runtime::dom_adapter::DomAdapter;

fn text_content_from_input<A: DomAdapter>(input: &MountInput<A>) -> String {
    match &input.r#type {
        MountInputType::Text(text) => text.clone(),
        _ => String::new(),
    }
}

pub(crate) fn mount_text<A: DomAdapter>(
    rue: &mut Rue<A>,
    input: &MountInput<A>,
) -> Option<MountedSubtreeState<A>>
where
    A::Element: Clone,
{
    let text = text_content_from_input(input);
    let host = if let Some(adapter) = rue.get_dom_adapter_mut() {
        Some(adapter.create_text_node(&text))
    } else {
        None
    };

    Some(MountedSubtreeState::Text(MountedTextSubtree {
        host,
        key: input.key.clone(),
        cleanup_bucket: input.mount_cleanup_bucket.clone(),
        effect_scope_id: input.mount_effect_scope_id,
    }))
}
