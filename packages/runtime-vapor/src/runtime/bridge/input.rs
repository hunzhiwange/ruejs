use super::WasmRue;
use crate::runtime::DEFAULT_MOUNT_HANDLE_KEY;
use crate::runtime::dom_adapter::DomAdapter;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::{ComponentProps, MountInput, MountInputType};
use js_sys::{Array, Object, Reflect};
use wasm_bindgen::JsValue;

impl WasmRue {
    fn registry_handle_value(&self, obj: &Object) -> JsValue {
        Reflect::get(obj, &JsValue::from_str(DEFAULT_MOUNT_HANDLE_KEY))
            .unwrap_or(JsValue::UNDEFINED)
    }

    fn host_node_value(&self, obj: &Object) -> JsValue {
        Reflect::get(obj, &JsValue::from_str("__rue_host_node")).unwrap_or(JsValue::UNDEFINED)
    }

    fn mount_input_from_array(&self, input_array: &JsValue) -> Option<MountInput<JsDomAdapter>> {
        if !Array::is_array(input_array) {
            return None;
        }

        let empty_props = Object::new();
        let id = self.create_element_wasm(
            JsValue::from_str(crate::runtime::types::FRAGMENT),
            empty_props.into(),
            input_array.clone(),
        );
        let id_unwrapped = self.mount_registry_id(&id);
        let mut input = WasmRue::take_mount_input_from_registry(&id_unwrapped)?;

        let source = Object::from(input_array.clone());
        input.attach_mount_metadata_from_source(&source);

        Some(input)
    }

    pub(super) fn mount_registry_id(&self, vnode_id: &JsValue) -> JsValue {
        if vnode_id.as_f64().is_some() {
            vnode_id.clone()
        } else if let Some(text) = vnode_id.as_string() {
            match text.parse::<f64>() {
                Ok(number) => JsValue::from_f64(number),
                Err(_) => JsValue::UNDEFINED,
            }
        } else if vnode_id.is_object() {
            let obj = Object::from(vnode_id.clone());
            self.registry_handle_value(&obj)
        } else {
            JsValue::UNDEFINED
        }
    }

    pub(super) fn mount_input_from_function_component(
        &self,
        vnode_id: &JsValue,
    ) -> Option<MountInput<JsDomAdapter>> {
        if !vnode_id.is_function() {
            return None;
        }

        let empty_props = Object::new();
        let id = self.create_element_wasm(vnode_id.clone(), empty_props.into(), JsValue::UNDEFINED);
        let id_unwrapped = self.mount_registry_id(&id);
        WasmRue::take_mount_input_from_registry(&id_unwrapped)
    }

    fn props_from_vapor_source(
        &self,
        _source: &Object,
        el: &<JsDomAdapter as DomAdapter>::Element,
    ) -> ComponentProps {
        let mut props = ComponentProps::new();

        if let Ok(inner) = self.inner.try_borrow() {
            if let Some(adapter) = inner.get_dom_adapter() {
                if adapter.is_fragment(el) {
                    let nodes = adapter.collect_fragment_children(el);
                    let arr = Array::new();
                    for node in nodes.into_iter() {
                        arr.push(&node);
                    }
                    props.insert("__fragNodes".to_string(), arr.clone().into());

                    let el_js: JsValue = el.clone().into();
                    let _ = Reflect::set(
                        &el_js,
                        &JsValue::from_str("__rue_frag_nodes_ref"),
                        &arr,
                    );
                }
            }
        }

        props
    }

    fn mount_input_from_host_node_object(
        &self,
        obj: &Object,
    ) -> Option<MountInput<JsDomAdapter>> {
        let host = self.host_node_value(obj);
        if host.is_undefined() || host.is_null() {
            return None;
        }

        let el: <JsDomAdapter as DomAdapter>::Element = host.into();
        let props = self.props_from_vapor_source(obj, &el);
        let mut input = MountInput {
            r#type: MountInputType::<JsDomAdapter>::Vapor,
            props,
            children: vec![],
            key: None,
            mount_cleanup_bucket: None,
            mount_effect_scope_id: None,
            el_hint: Some(el),
        };
        input.attach_mount_metadata_from_source(obj);
        Some(input)
    }

    fn mount_input_from_raw_element(
        &self,
        vnode_id: &JsValue,
    ) -> Option<MountInput<JsDomAdapter>> {
        if !vnode_id.is_object() {
            return None;
        }

        let obj = Object::from(vnode_id.clone());
        let node_type = Reflect::get(&obj, &JsValue::from_str("nodeType"))
            .unwrap_or(JsValue::UNDEFINED);
        if node_type.as_f64().is_none() {
            return None;
        }

        let el: <JsDomAdapter as DomAdapter>::Element = vnode_id.clone().into();
        let props = self.props_from_vapor_source(&obj, &el);
        let mut input = MountInput {
            r#type: MountInputType::<JsDomAdapter>::Vapor,
            props,
            children: vec![],
            key: None,
            mount_cleanup_bucket: None,
            mount_effect_scope_id: None,
            el_hint: Some(el),
        };
        input.attach_mount_metadata_from_source(&obj);
        Some(input)
    }

    pub(super) fn default_mount_input_from_input(
        &self,
        input_value: &JsValue,
        allow_function_component: bool,
    ) -> Option<MountInput<JsDomAdapter>> {
        let id_value = self.mount_registry_id(input_value);
        if let Some(mut input) = WasmRue::take_mount_input_from_registry(&id_value) {
            if input_value.is_object() {
                let source = Object::from(input_value.clone());
                input.attach_mount_metadata_from_source(&source);
            }
            return Some(input);
        }

        if let Some(input) = self.mount_input_from_array(input_value) {
            return Some(input);
        }

        if allow_function_component {
            if let Some(input) = self.mount_input_from_function_component(input_value) {
                return Some(input);
            }
        }

        if input_value.is_object() {
            let obj = Object::from(input_value.clone());
            return self
                .mount_input_from_host_node_object(&obj)
                .or_else(|| self.mount_input_from_raw_element(input_value));
        }

        None
    }
}
