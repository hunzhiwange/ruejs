use super::super::{
    DEFAULT_MOUNT_HANDLE_KEY,
    JsDomAdapter,
    MOUNT_INPUT_REGISTRY,
    Rue,
};
use super::super::types::{MountInput, MountInputChild, MountInputType};
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Array, Object, Reflect};
use wasm_bindgen::JsValue;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    fn host_node_value(&self, obj: &Object) -> JsValue {
        Reflect::get(obj, &JsValue::from_str("__rue_host_node")).unwrap_or(JsValue::UNDEFINED)
    }

    fn element_value_to_vapor_input(
        &mut self,
        source: &Object,
        element_value: JsValue,
    ) -> MountInput<A>
    where
        A::Element: From<JsValue> + Into<JsValue>,
    {
        let el: A::Element = element_value.into();
        let mut input = MountInput {
            r#type: MountInputType::<A>::Vapor,
            props: self.raw_object_to_vnode_props(source, &el),
            children: vec![],
            key: None,
            mount_cleanup_bucket: None,
            mount_effect_scope_id: None,
            el_hint: Some(el),
        };
        input.attach_mount_metadata_from_source(source);
        input
    }

    pub(crate) fn compat_value_to_input(&mut self, value: &JsValue) -> Option<MountInput<A>>
    where
        A::Element: From<JsValue> + Into<JsValue>,
    {
        if Array::is_array(value) {
            let source = Object::from(value.clone());
            let mut input = MountInput::new_normalized(
                MountInputType::<A>::Fragment,
                Default::default(),
                self.children_from_js_input(value),
            );
            input.attach_mount_metadata_from_source(&source);
            return Some(input);
        }

        if value.is_object() {
            let obj = Object::from(value.clone());
            if let Some(input) = self.take_tagged_input::<A>(&obj) {
                return Some(input);
            }

            let host = self.host_node_value(&obj);
            if !host.is_undefined() && !host.is_null() {
                return Some(self.element_value_to_vapor_input(&obj, host));
            }

            let node_type = Reflect::get(&obj, &JsValue::from_str("nodeType"))
                .unwrap_or(JsValue::UNDEFINED);
            if node_type.as_f64().is_some() {
                return Some(self.element_value_to_vapor_input(&obj, JsValue::from(obj.clone())));
            }

            return None;
        }

        None
    }

    fn raw_object_to_vnode_props(
        &self,
        _source: &Object,
        el: &A::Element,
    ) -> super::super::types::ComponentProps
    where
        A::Element: Into<JsValue>,
    {
        let mut props = super::super::types::ComponentProps::new();

        if let Some(adapter) = self.get_dom_adapter() {
            if adapter.is_fragment(el) {
                let nodes = adapter.collect_fragment_children(el);
                let arr = Array::new();
                for node in nodes.into_iter() {
                    let value: JsValue = node.into();
                    arr.push(&value);
                }
                props.insert("__fragNodes".to_string(), arr.clone().into());

                let el_js: JsValue = el.clone().into();
                let _ = Reflect::set(&el_js, &JsValue::from_str("__rue_frag_nodes_ref"), &arr);
            }
        }

        props
    }

    /// 取出默认输入注册表中已打标的句柄，并在局部边界恢复成 MountInput。
    fn take_tagged_input<A2: DomAdapter>(&mut self, obj: &Object) -> Option<MountInput<A2>>
    where
        A2::Element: From<JsValue>,
    {
        for key in [DEFAULT_MOUNT_HANDLE_KEY] {
            if let Ok(tagged) = Reflect::get(obj, &JsValue::from_str(key)) {
                if let Some(idf) = tagged.as_f64() {
                    let idx = idf as usize;
                    let taken = MOUNT_INPUT_REGISTRY.with(|reg| {
                        let mut r = reg.borrow_mut();
                        if idx < r.len() { r[idx].take() } else { None }
                    });
                    if let Some(input_js) = taken {
                        fn convert_input<B: DomAdapter>(input: MountInput<JsDomAdapter>) -> MountInput<B>
                        where
                            B::Element: From<JsValue>,
                        {
                            MountInput {
                                r#type: match input.r#type {
                                    MountInputType::<JsDomAdapter>::Text(text) => MountInputType::<B>::Text(text),
                                    MountInputType::<JsDomAdapter>::Fragment => MountInputType::<B>::Fragment,
                                    MountInputType::<JsDomAdapter>::Vapor => MountInputType::<B>::Vapor,
                                    MountInputType::<JsDomAdapter>::VaporWithSetup(f) => {
                                        MountInputType::<B>::VaporWithSetup(f)
                                    }
                                    MountInputType::<JsDomAdapter>::Element(tag) => MountInputType::<B>::Element(tag),
                                    MountInputType::<JsDomAdapter>::Component(f) => MountInputType::<B>::Component(f),
                                    MountInputType::<JsDomAdapter>::_Phantom(_) => {
                                        MountInputType::<B>::_Phantom(std::marker::PhantomData)
                                    }
                                },
                                props: input.props,
                                children: input
                                    .children
                                    .into_iter()
                                    .map(|child| match child {
                                        MountInputChild::Input(node) => {
                                            MountInputChild::Input(convert_input::<B>(node))
                                        }
                                        MountInputChild::Text(text) => MountInputChild::Text(text),
                                    })
                                    .collect(),
                                key: input.key,
                                mount_cleanup_bucket: input.mount_cleanup_bucket,
                                mount_effect_scope_id: input.mount_effect_scope_id,
                                el_hint: input.el_hint.map(|e| {
                                    let js: JsValue = e.into();
                                    <B::Element as From<JsValue>>::from(js)
                                }),
                            }
                        }
                        return Some(convert_input::<A2>(input_js));
                    }
                }
            }
        }

        None
    }

    fn child_object_to_input(&mut self, iobj: &Object) -> MountInput<A>
    where
        A::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(input) = self.take_tagged_input::<A>(iobj) {
            return input;
        }

        let host = self.host_node_value(iobj);
        if !host.is_undefined() && !host.is_null() {
            return self.element_value_to_vapor_input(iobj, host);
        }

        let node_type =
            Reflect::get(iobj, &JsValue::from_str("nodeType")).unwrap_or(JsValue::UNDEFINED);
        if node_type.as_f64().is_some() {
            return self.element_value_to_vapor_input(iobj, JsValue::from(iobj.clone()));
        }

        let error = JsValue::from_str(
            "Unsupported object child on the default path. Return a raw node, fragment, host-node bridge, or tagged mount handle instead.",
        );
        self.handle_error(error.clone());
        wasm_bindgen::throw_val(error);
    }

    fn children_from_js_input(&mut self, cc: &JsValue) -> Vec<MountInputChild<A>>
    where
        A::Element: From<JsValue> + Into<JsValue>,
    {
        let mut child_vec: Vec<MountInputChild<A>> = Vec::new();
        let push_value = |child_vec: &mut Vec<MountInputChild<A>>, item: JsValue, this: &mut Self| {
            if let Some(s) = item.as_string() {
                child_vec.push(MountInputChild::<A>::Text(s));
            } else if let Some(n) = item.as_f64() {
                child_vec.push(MountInputChild::<A>::Text(n.to_string()));
            } else if item.is_object() {
                let iobj = Object::from(item.clone());
                let input_child = this.child_object_to_input(&iobj);
                child_vec.push(MountInputChild::<A>::Input(input_child));
            }
        };

        if Array::is_array(cc) {
            let arr = Array::from(cc);
            for i in 0..arr.length() {
                push_value(&mut child_vec, arr.get(i), self);
            }
        } else {
            push_value(&mut child_vec, cc.clone(), self);
        }

        child_vec
    }

    fn append_existing_children_prop(&self, props: &super::super::types::ComponentProps, arr: &Array) {
        if let Some(v) = props.get("children") {
            if Array::is_array(v) {
                let existing = Array::from(v);
                for i in 0..existing.length() {
                    arr.push(&existing.get(i));
                }
            } else if v.is_undefined() || v.is_null() {
            } else {
                arr.push(v);
            }
        }
    }

    /// 从 MountInput 生成包含 props 与归一化 children 的 JS 对象。
    ///
    /// 默认组件挂载主路径已经切到 MountInput，这里把嵌套非文本子项
    /// 序列化为 tagged mount handle，而不是再恢复成 type/props/children 对象协议。
    pub(crate) fn props_with_children_input_to_jsobject(&mut self, input: &MountInput<A>) -> JsValue
    where
        A::Element: From<JsValue> + Into<JsValue> + Clone,
    {
        let obj = Object::new();
        for (k, v) in input.props.iter() {
            let _ = Reflect::set(&obj, &JsValue::from_str(k.as_str()), v);
        }

        let arr = Array::new();
        if !input.children.is_empty() {
            for child in input.children.iter() {
                match child {
                    MountInputChild::Text(text) => {
                        arr.push(&JsValue::from_str(text));
                    }
                    MountInputChild::Input(node) => match &node.r#type {
                        MountInputType::Text(text) => {
                            arr.push(&JsValue::from_str(text));
                        }
                        _ => {
                            let handle = self.input_to_mount_handle_value(node);
                            arr.push(&handle);
                        }
                    },
                }
            }
        } else {
            self.append_existing_children_prop(&input.props, &arr);
        }

        let _ = Reflect::set(&obj, &JsValue::from_str("children"), &arr.into());
        obj.into()
    }

    pub(crate) fn input_to_mount_handle_value(&self, input: &MountInput<A>) -> JsValue
    where
        A::Element: From<JsValue> + Into<JsValue> + Clone,
    {
        fn convert_input<B: DomAdapter>(input: &MountInput<B>) -> MountInput<JsDomAdapter>
        where
            B::Element: Into<JsValue> + Clone,
        {
            MountInput {
                r#type: match &input.r#type {
                    MountInputType::<B>::Text(text) => MountInputType::<JsDomAdapter>::Text(text.clone()),
                    MountInputType::<B>::Fragment => MountInputType::<JsDomAdapter>::Fragment,
                    MountInputType::<B>::Vapor => MountInputType::<JsDomAdapter>::Vapor,
                    MountInputType::<B>::VaporWithSetup(f) => {
                        MountInputType::<JsDomAdapter>::VaporWithSetup(f.clone())
                    }
                    MountInputType::<B>::Element(tag) => {
                        MountInputType::<JsDomAdapter>::Element(tag.clone())
                    }
                    MountInputType::<B>::Component(f) => {
                        MountInputType::<JsDomAdapter>::Component(f.clone())
                    }
                    MountInputType::<B>::_Phantom(_) => {
                        MountInputType::<JsDomAdapter>::_Phantom(std::marker::PhantomData)
                    }
                },
                props: input.props.clone(),
                children: input
                    .children
                    .iter()
                    .map(|child| match child {
                        MountInputChild::Input(node) => {
                            MountInputChild::Input(convert_input(node))
                        }
                        MountInputChild::Text(text) => MountInputChild::Text(text.clone()),
                    })
                    .collect(),
                key: input.key.clone(),
                mount_cleanup_bucket: input.mount_cleanup_bucket.clone(),
                mount_effect_scope_id: input.mount_effect_scope_id,
                el_hint: input.el_hint.clone().map(|el| {
                    <JsDomAdapter as DomAdapter>::Element::from(el.into())
                }),
            }
        }

        let input_js = convert_input(input);
        let key = input_js.key.clone();
        let id = MOUNT_INPUT_REGISTRY.with(|reg| {
            let mut registry = reg.borrow_mut();
            for (idx, slot) in registry.iter_mut().enumerate() {
                if slot.is_none() {
                    *slot = Some(input_js);
                    return idx as u32;
                }
            }

            registry.push(Some(input_js));
            (registry.len() - 1) as u32
        });

        let obj = Object::new();
        let _ = Reflect::set(
            &obj,
            &JsValue::from_str(DEFAULT_MOUNT_HANDLE_KEY),
            &JsValue::from_f64(id as f64),
        );
        if let Some(key) = key {
            let _ = Reflect::set(&obj, &JsValue::from_str("key"), &JsValue::from_str(&key));
        }
        obj.into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use js_sys::{Function, Object as JsObject};
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn vapor_with_setup_mount_handle_roundtrip_preserves_setup_marker() {
        let mut rue: Rue<JsDomAdapter> = Rue::new();
        let setup = Function::new_no_args("return 1;");
        let input = MountInput::new_normalized(
            MountInputType::VaporWithSetup(setup.into()),
            Default::default(),
            vec![],
        );

        let handle = rue.input_to_mount_handle_value(&input);
        let roundtrip = rue
            .compat_value_to_input(&handle)
            .expect("vapor-with-setup mount handle should roundtrip");
        assert!(matches!(roundtrip.r#type, MountInputType::VaporWithSetup(_)));
    }

    #[wasm_bindgen_test]
    fn vapor_with_existing_element_mount_handle_roundtrip_preserves_element_hint() {
        let mut rue: Rue<JsDomAdapter> = Rue::new();
        let el: JsValue = JsObject::new().into();
        let input = MountInput {
            r#type: MountInputType::Vapor,
            props: Default::default(),
            children: vec![],
            key: None,
            mount_cleanup_bucket: None,
            mount_effect_scope_id: None,
            el_hint: Some(el.clone()),
        };

        let handle = rue.input_to_mount_handle_value(&input);
        let roundtrip = rue
            .compat_value_to_input(&handle)
            .expect("tagged mount handle should roundtrip");
        assert!(matches!(roundtrip.r#type, MountInputType::Vapor));
        assert!(roundtrip.el_hint.is_some());
        assert!(js_sys::Object::is(&roundtrip.el_hint.unwrap(), &el));
    }

    #[wasm_bindgen_test]
    fn props_with_children_input_to_jsobject_uses_tagged_mount_handles() {
        let mut rue: Rue<JsDomAdapter> = Rue::new();
        let child = MountInput::new_normalized(
            MountInputType::Element("strong".to_string()),
            Default::default(),
            vec![MountInputChild::Text("A".to_string())],
        );
        let parent = MountInput::new_normalized(
            MountInputType::Fragment,
            Default::default(),
            vec![MountInputChild::Input(child)],
        );

        let props = Object::from(rue.props_with_children_input_to_jsobject(&parent));
        let children = Array::from(
            &Reflect::get(&props, &JsValue::from_str("children")).unwrap_or(JsValue::UNDEFINED),
        );
        let child_object = Object::from(children.get(0));

        assert!(Reflect::has(&child_object, &JsValue::from_str(DEFAULT_MOUNT_HANDLE_KEY))
            .unwrap_or(false));
        let type_value = Reflect::get(&child_object, &JsValue::from_str("type"))
            .unwrap_or(JsValue::UNDEFINED);
        assert!(type_value.is_undefined());
    }

    #[wasm_bindgen_test]
    fn host_node_bridge_input_lifts_mount_metadata_off_props() {
        let mut rue: Rue<JsDomAdapter> = Rue::new();
        let host: JsValue = JsObject::new().into();
        let cleanup_bucket = Array::new();
        cleanup_bucket.push(&JsValue::from_str("cleanup"));

        let bridge = JsObject::new();
        Reflect::set(&bridge, &JsValue::from_str("__rue_host_node"), &host).unwrap();
        Reflect::set(
            &bridge,
            &JsValue::from_str("__rue_cleanup_bucket"),
            &cleanup_bucket.clone().into(),
        )
        .unwrap();
        Reflect::set(
            &bridge,
            &JsValue::from_str("__rue_effect_scope_id"),
            &JsValue::from_f64(11.0),
        )
        .unwrap();

        let input = rue
            .compat_value_to_input(&bridge.clone().into())
            .expect("host-node bridge should convert");

        assert!(matches!(input.r#type, MountInputType::Vapor));
        assert!(input.mount_cleanup_bucket.is_some());
        assert_eq!(input.mount_effect_scope_id, Some(11));
        assert!(!input.props.contains_key("__rue_cleanup_bucket"));
        assert!(!input.props.contains_key("__rue_effect_scope_id"));
    }

}
