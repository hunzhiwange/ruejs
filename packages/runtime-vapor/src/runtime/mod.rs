mod bridge;
mod core;
mod dom_adapter;
mod globals;
mod instance;
mod js_adapter;
mod props;
mod real_dom;
mod render;
mod render_lifecycle;
mod render_patch;
mod types;

pub(crate) const DEFAULT_MOUNT_HANDLE_KEY: &str = "__rue_mount_id";

pub use bridge::{WasmRue, createRue};
pub use core::Rue;
pub use dom_adapter::DomAdapter;
pub use globals::{MOUNT_INPUT_REGISTRY, push_pending_hook, take_pending_hooks};
pub use globals::{is_runtime_crashed, last_hook_error, mark_crashed_from_hook};
pub use instance::*;
pub use js_adapter::JsDomAdapter;
pub use props::*;
pub use types::{
	AnchorMountState, ComponentProps, ContainerMountState, FC, FRAGMENT, MountInput,
	MountInputChild, MountInputType, MountLifecycleKind, MountLifecycleRecord, MountedBlock,
	MountedComponent, MountedElement, MountedPatchSubtree, MountedPatchSubtreeType,
	MountedState, MountedSubtreeChild, MountedSubtreeState, MountedTextSubtree,
	MountedVaporSubtree, MountedVaporSubtreeType, PropsWithChildren, RangeMountState,
};
