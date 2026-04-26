use super::super::types::{
    MountInput, MountedSubtreeState, MountedVaporSubtree, MountedVaporSubtreeType,
};
use super::super::Rue;
use crate::reactive::core::{create_effect_scope, pop_effect_scope, push_effect_scope};
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Function, Object, Reflect};
use wasm_bindgen::{JsCast, JsValue};

impl<A: DomAdapter> Rue<A>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    /// 解析 setup 返回对象：提取其中的 `__rue_host_node` bridge（若存在）
    pub(super) fn parse_vapor_with_setup_return(&self, ret: &JsValue) -> Option<A::Element> {
        if ret.is_object() {
            let obj = Object::from(ret.clone());
            let host = Reflect::get(&obj, &JsValue::from_str("__rue_host_node"))
                .unwrap_or(JsValue::UNDEFINED);
            if !host.is_undefined() && !host.is_null() {
                let el: A::Element = host.into();
                return Some(el);
            }
        }
        None
    }

    pub(super) fn setup_return_uses_legacy_vapor_wrapper(&self, ret: &JsValue) -> bool {
        if ret.is_object() {
            let obj = Object::from(ret.clone());
            let legacy = Reflect::get(&obj, &JsValue::from_str("vaporElement"))
                .unwrap_or(JsValue::UNDEFINED);
            return !legacy.is_undefined() && !legacy.is_null();
        }

        false
    }

    /// 非对象返回时：直接将 setup 返回值强制转换为元素类型
    pub(super) fn coerce_setup_return_to_element(&self, ret: &JsValue) -> A::Element {
        ret.clone().into()
    }

    pub(super) fn fragment_nodes_for_element(&self, el: &A::Element) -> Vec<A::Element> {
        self.get_dom_adapter()
            .filter(|adapter| adapter.is_fragment(el))
            .map(|adapter| adapter.collect_fragment_children(el))
            .unwrap_or_default()
    }

    pub(super) fn set_owner_scope_on_element(&self, scope_id: Option<usize>, el: &A::Element) {
        if let Some(scope_id) = scope_id {
            let el_js: JsValue = el.clone().into();
            let _ = Reflect::set(
                &el_js,
                &JsValue::from_str("__rue_effect_scope_id"),
                &JsValue::from_f64(scope_id as f64),
            );
        }
    }
}

pub(crate) fn mount_vapor<A: DomAdapter>(
    rue: &mut Rue<A>,
    input: &MountInput<A>,
) -> Option<MountedSubtreeState<A>>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    let host = input.el_hint.clone()?;
    let fragment_nodes = rue.fragment_nodes_for_element(&host);

    Some(MountedSubtreeState::Vapor(MountedVaporSubtree {
        r#type: MountedVaporSubtreeType::Vapor,
        host: Some(host),
        key: input.key.clone(),
        fragment_nodes,
        cleanup_bucket: input.mount_cleanup_bucket.clone(),
        effect_scope_id: input.mount_effect_scope_id,
    }))
}

pub(crate) fn mount_vapor_with_setup<A: DomAdapter>(
    rue: &mut Rue<A>,
    input: &MountInput<A>,
    f: &JsValue,
) -> Option<MountedSubtreeState<A>>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    if let Some(existing_host) = input.el_hint.clone() {
        let fragment_nodes = rue.fragment_nodes_for_element(&existing_host);
        return Some(MountedSubtreeState::Vapor(MountedVaporSubtree {
            r#type: MountedVaporSubtreeType::VaporWithSetup(f.clone()),
            host: Some(existing_host),
            key: input.key.clone(),
            fragment_nodes,
            cleanup_bucket: input.mount_cleanup_bucket.clone(),
            effect_scope_id: input.mount_effect_scope_id,
        }));
    }

    if let Some(func) = f.dyn_ref::<Function>() {
        let scope_id = input.mount_effect_scope_id.unwrap_or_else(create_effect_scope);
        push_effect_scope(scope_id);
        let ret = func.call0(&JsValue::UNDEFINED);
        pop_effect_scope();

        match ret {
            Ok(ret) => {
                if let Some(el) = rue.parse_vapor_with_setup_return(&ret) {
                    rue.set_owner_scope_on_element(Some(scope_id), &el);
                    let fragment_nodes = rue.fragment_nodes_for_element(&el);
                    return Some(MountedSubtreeState::Vapor(MountedVaporSubtree {
                        r#type: MountedVaporSubtreeType::VaporWithSetup(f.clone()),
                        host: Some(el),
                        key: input.key.clone(),
                        fragment_nodes,
                        cleanup_bucket: input.mount_cleanup_bucket.clone(),
                        effect_scope_id: Some(scope_id),
                    }));
                }

                if rue.setup_return_uses_legacy_vapor_wrapper(&ret) {
                    let error = JsValue::from_str(
                        "Unsupported object returns are no longer accepted for vapor setup on the default path. Return a raw node, fragment, or mount handle instead.",
                    );
                    rue.handle_error(error.clone());
                    wasm_bindgen::throw_val(error);
                }

                let el: A::Element = rue.coerce_setup_return_to_element(&ret);
                rue.set_owner_scope_on_element(Some(scope_id), &el);
                let fragment_nodes = rue.fragment_nodes_for_element(&el);
                return Some(MountedSubtreeState::Vapor(MountedVaporSubtree {
                    r#type: MountedVaporSubtreeType::VaporWithSetup(f.clone()),
                    host: Some(el),
                    key: input.key.clone(),
                    fragment_nodes,
                    cleanup_bucket: input.mount_cleanup_bucket.clone(),
                    effect_scope_id: Some(scope_id),
                }));
            }
            Err(e) => {
                rue.handle_error(e.clone());
                wasm_bindgen::throw_val(e.clone());
            }
        }
    }

    if let Some(adapter) = rue.get_dom_adapter_mut() {
        let el = adapter.create_element("div");
        return Some(MountedSubtreeState::Vapor(MountedVaporSubtree {
            r#type: MountedVaporSubtreeType::VaporWithSetup(f.clone()),
            host: Some(el),
            key: input.key.clone(),
            fragment_nodes: Vec::new(),
            cleanup_bucket: input.mount_cleanup_bucket.clone(),
            effect_scope_id: input.mount_effect_scope_id,
        }));
    }

    rue.handle_error(JsValue::from_str(
        "runtime:mount VaporWithSetup fallback no adapter",
    ));
    None
}
