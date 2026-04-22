use super::super::{Child, JsDomAdapter, Rue, VNODE_REGISTRY, VNode, VNodeType};
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Array, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    /// 取出注册表中已打标的 VNode，并转换其适配器类型
    fn take_tagged_vnode<A2: DomAdapter>(&mut self, obj: &Object) -> Option<VNode<A2>>
    where
        A2::Element: From<JsValue>,
    {
        if let Ok(tagged) = Reflect::get(obj, &JsValue::from_str("__rue_vnode_id")) {
            if let Some(idf) = tagged.as_f64() {
                let idx = idf as usize;
                let taken = VNODE_REGISTRY.with(|reg| {
                    let mut r = reg.borrow_mut();
                    if idx < r.len() { r[idx].take() } else { None }
                });
                if let Some(v_js) = taken {
                    // 将 JsDomAdapter 的 VNode 递归转换为目标适配器类型
                    fn convert_child<B: DomAdapter>(n: VNode<JsDomAdapter>) -> VNode<B>
                    where
                        B::Element: From<JsValue>,
                    {
                        let mut out_children: Vec<Child<B>> = Vec::new();
                        for c in n.children.into_iter() {
                            match c {
                                Child::<JsDomAdapter>::VNode(vsub) => {
                                    out_children.push(Child::<B>::VNode(convert_child::<B>(vsub)))
                                }
                                Child::<JsDomAdapter>::Text(s) => {
                                    out_children.push(Child::<B>::Text(s))
                                }
                                Child::<JsDomAdapter>::Bool(b) => {
                                    out_children.push(Child::<B>::Bool(b))
                                }
                                Child::<JsDomAdapter>::Null => out_children.push(Child::<B>::Null),
                            }
                        }
                        let el_converted = n.el.map(|e| {
                            let js: JsValue = e.into();
                            <B::Element as From<JsValue>>::from(js)
                        });
                        VNode {
                            r#type: match n.r#type {
                                VNodeType::<JsDomAdapter>::Text => VNodeType::<B>::Text,
                                VNodeType::<JsDomAdapter>::Fragment => VNodeType::<B>::Fragment,
                                VNodeType::<JsDomAdapter>::Vapor => VNodeType::<B>::Vapor,
                                VNodeType::<JsDomAdapter>::VaporWithSetup(f) => {
                                    VNodeType::<B>::VaporWithSetup(f)
                                }
                                VNodeType::<JsDomAdapter>::Element(s) => VNodeType::<B>::Element(s),
                                VNodeType::<JsDomAdapter>::Component(f) => {
                                    VNodeType::<B>::Component(f)
                                }
                                VNodeType::<JsDomAdapter>::_Phantom(_) => {
                                    VNodeType::<B>::_Phantom(std::marker::PhantomData)
                                }
                            },
                            props: n.props,
                            children: out_children,
                            el: el_converted,
                            key: n.key,
                            comp_hooks: None,
                            comp_subtree: None,
                            comp_host: None,
                            comp_props_ro: None,
                            comp_inst_index: None,
                        }
                    }
                    return Some(convert_child::<A2>(v_js));
                }
            }
        }
        None
    }

    /// 将 JS 的 props 对象转换为内部属性映射
    fn props_map_from_js(&self, pp: &JsValue) -> super::super::types::ComponentProps {
        let mut props_map: super::super::types::ComponentProps =
            super::super::types::ComponentProps::new();
        if pp.is_object() {
            let pobj = Object::from(pp.clone());
            let keys = js_sys::Object::keys(&pobj);
            for i in 0..keys.length() {
                let k = keys.get(i);
                if let Some(ks) = k.as_string() {
                    let v = Reflect::get(&pobj, &k).unwrap_or(JsValue::UNDEFINED);
                    props_map.insert(ks, v);
                }
            }
        }
        props_map
    }

    /// 从子对象构建 VNode，处理 vaporElement 的快速路径
    fn child_object_to_vnode(&mut self, iobj: &Object) -> VNode<A>
    where
        A::Element: From<JsValue>,
    {
        let ve =
            Reflect::get(&iobj, &JsValue::from_str("vaporElement")).unwrap_or(JsValue::UNDEFINED);
        if !ve.is_undefined() && !ve.is_null() {
            let el: A::Element = ve.into();
            VNode {
                r#type: VNodeType::<A>::Vapor,
                props: super::super::types::ComponentProps::new(),
                children: vec![],
                el: Some(el),
                key: None,
                comp_hooks: None,
                comp_subtree: None,
                comp_host: None,
                comp_props_ro: None,
                comp_inst_index: None,
            }
        } else {
            self.dev_object_to_vnode(iobj)
        }
    }

    /// 从 JS 值解析 children，生成类型化的 Child<A> 列表
    fn children_from_js(&mut self, cc: &JsValue) -> Vec<Child<A>>
    where
        A::Element: From<JsValue>,
    {
        let mut child_vec: Vec<Child<A>> = Vec::new();
        if Array::is_array(&cc) {
            let arr = Array::from(&cc);
            for i in 0..arr.length() {
                let item = arr.get(i);
                if let Some(s) = item.as_string() {
                    child_vec.push(Child::<A>::Text(s));
                } else if let Some(n) = item.as_f64() {
                    child_vec.push(Child::<A>::Text(n.to_string()));
                } else if let Some(b) = item.as_bool() {
                    child_vec.push(Child::<A>::Bool(b));
                } else if item.is_null() || item.is_undefined() {
                    child_vec.push(Child::<A>::Null);
                } else if item.is_object() {
                    let iobj = Object::from(item.clone());
                    let vnode_child = self.child_object_to_vnode(&iobj);
                    child_vec.push(Child::<A>::VNode(vnode_child));
                } else {
                    child_vec.push(Child::<A>::Null);
                }
            }
        } else {
            let item = cc.clone();
            if let Some(s) = item.as_string() {
                child_vec.push(Child::<A>::Text(s));
            } else if let Some(n) = item.as_f64() {
                child_vec.push(Child::<A>::Text(n.to_string()));
            } else if let Some(b) = item.as_bool() {
                child_vec.push(Child::<A>::Bool(b));
            } else if item.is_null() || item.is_undefined() {
                child_vec.push(Child::<A>::Null);
            } else if item.is_object() {
                let iobj = Object::from(item.clone());
                let vnode_child = self.child_object_to_vnode(&iobj);
                child_vec.push(Child::<A>::VNode(vnode_child));
            } else {
                child_vec.push(Child::<A>::Null);
            }
        }
        child_vec
    }

    /// 根据 JS 的 `type` 和 props 上下文决定 VNodeType
    fn tag_from_js(
        &self,
        tt: &JsValue,
        props_map: &super::super::types::ComponentProps,
    ) -> VNodeType<A> {
        if let Some(s) = tt.as_string() {
            if s == super::super::types::FRAGMENT {
                VNodeType::<A>::Fragment
            } else if s == "vapor" {
                if let Some(setup) = props_map.get("setup") {
                    if let Some(f) = setup.dyn_ref::<js_sys::Function>() {
                        VNodeType::<A>::VaporWithSetup(f.clone().into())
                    } else {
                        VNodeType::<A>::Vapor
                    }
                } else {
                    VNodeType::<A>::Vapor
                }
            } else {
                VNodeType::<A>::Element(s)
            }
        } else if tt.is_function() {
            let f = tt.dyn_ref::<js_sys::Function>().unwrap().clone();
            VNodeType::<A>::Component(f.into())
        } else {
            VNodeType::<A>::Element("div".to_string())
        }
    }

    /// 从 VNode 生成包含 props 与归一化 children 的 JS 对象
    pub(crate) fn props_with_children_to_jsobject(&mut self, vnode: &VNode<A>) -> JsValue
    where
        A::Element: From<JsValue> + Into<JsValue>,
    {
        let obj = Object::new();
        for (k, v) in vnode.props.iter() {
            let _ = Reflect::set(&obj, &JsValue::from_str(k.as_str()), v);
        }
        let arr = Array::new();
        if !vnode.children.is_empty() {
            for c in vnode.children.iter() {
                match c {
                    Child::Text(s) => {
                        arr.push(&JsValue::from_str(s));
                    }
                    Child::Bool(b) => {
                        arr.push(&JsValue::from_bool(*b));
                    }
                    Child::Null => {
                        arr.push(&JsValue::NULL);
                    }
                    Child::VNode(v) => {
                        let o = self.vnode_to_dev_object(v);
                        arr.push(&o.into());
                    }
                }
            }
        } else if let Some(v) = vnode.props.get("children") {
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
        let _ = Reflect::set(&obj, &JsValue::from_str("children"), &arr.into());
        obj.into()
    }

    /// 将 VNode 转换为开发态友好的 JS 对象表示
    pub(crate) fn vnode_to_dev_object(&self, vnode: &VNode<A>) -> Object
    where
        A::Element: From<JsValue> + Into<JsValue>,
    {
        let obj = Object::new();
        match &vnode.r#type {
            VNodeType::Text => {
                let _ = Reflect::set(
                    &obj,
                    &JsValue::from_str("type"),
                    &JsValue::from_str(super::super::types::FRAGMENT),
                );
                let carr = Array::new();
                for c in vnode.children.iter() {
                    if let Child::Text(s) = c {
                        carr.push(&JsValue::from_str(s));
                    }
                }
                let _ = Reflect::set(&obj, &JsValue::from_str("children"), &carr.into());
            }
            VNodeType::Fragment => {
                let _ = Reflect::set(
                    &obj,
                    &JsValue::from_str("type"),
                    &JsValue::from_str(super::super::types::FRAGMENT),
                );
                let carr = Array::new();
                for c in vnode.children.iter() {
                    match c {
                        Child::Text(s) => {
                            carr.push(&JsValue::from_str(s));
                        }
                        Child::VNode(v) => {
                            let o = self.vnode_to_dev_object(v);
                            carr.push(&o.into());
                        }
                        Child::Bool(b) => {
                            carr.push(&JsValue::from_bool(*b));
                        }
                        Child::Null => {
                            carr.push(&JsValue::NULL);
                        }
                    }
                }
                let _ = Reflect::set(&obj, &JsValue::from_str("children"), &carr.into());
            }
            VNodeType::Element(tag) => {
                let _ = Reflect::set(
                    &obj,
                    &JsValue::from_str("type"),
                    &JsValue::from_str(tag.as_str()),
                );
                let p = Object::new();
                for (k, v) in vnode.props.iter() {
                    let _ = Reflect::set(&p, &JsValue::from_str(k.as_str()), v);
                }
                let _ = Reflect::set(&obj, &JsValue::from_str("props"), &p.into());
                let carr = Array::new();
                for c in vnode.children.iter() {
                    match c {
                        Child::Text(s) => {
                            carr.push(&JsValue::from_str(s));
                        }
                        Child::VNode(v) => {
                            let o = self.vnode_to_dev_object(v);
                            carr.push(&o.into());
                        }
                        Child::Bool(b) => {
                            carr.push(&JsValue::from_bool(*b));
                        }
                        Child::Null => {
                            carr.push(&JsValue::NULL);
                        }
                    }
                }
                let _ = Reflect::set(&obj, &JsValue::from_str("children"), &carr.into());
            }
            VNodeType::Vapor => {
                if let Some(ref el) = vnode.el {
                    let js_el: JsValue = el.clone().into();
                    let _ = Reflect::set(&obj, &JsValue::from_str("vaporElement"), &js_el);
                } else {
                    let _ = Reflect::set(
                        &obj,
                        &JsValue::from_str("type"),
                        &JsValue::from_str("vapor"),
                    );
                    let p = Object::new();
                    if let Some(key) = vnode.props.get("key") {
                        let _ = Reflect::set(&p, &JsValue::from_str("key"), key);
                    }
                    let _ = Reflect::set(&obj, &JsValue::from_str("props"), &p.into());
                }
                let carr = Array::new();
                let _ = Reflect::set(&obj, &JsValue::from_str("children"), &carr.into());
            }
            VNodeType::VaporWithSetup(f) => {
                let _ = Reflect::set(&obj, &JsValue::from_str("type"), &JsValue::from_str("vapor"));
                let p = Object::new();
                let _ = Reflect::set(&p, &JsValue::from_str("setup"), f);
                if let Some(key) = vnode.props.get("key") {
                    let _ = Reflect::set(&p, &JsValue::from_str("key"), key);
                }
                let _ = Reflect::set(&obj, &JsValue::from_str("props"), &p.into());
                let carr = Array::new();
                let _ = Reflect::set(&obj, &JsValue::from_str("children"), &carr.into());
            }
            VNodeType::Component(f) => {
                let _ = Reflect::set(&obj, &JsValue::from_str("type"), f);
                let p = Object::new();
                for (k, v) in vnode.props.iter() {
                    let _ = Reflect::set(&p, &JsValue::from_str(k.as_str()), v);
                }
                let _ = Reflect::set(&obj, &JsValue::from_str("props"), &p.into());
                let carr = Array::new();
                for c in vnode.children.iter() {
                    match c {
                        Child::Text(s) => {
                            carr.push(&JsValue::from_str(s));
                        }
                        Child::VNode(v) => {
                            let o = self.vnode_to_dev_object(v);
                            carr.push(&o.into());
                        }
                        Child::Bool(b) => {
                            carr.push(&JsValue::from_bool(*b));
                        }
                        Child::Null => {
                            carr.push(&JsValue::NULL);
                        }
                    }
                }
                let _ = Reflect::set(&obj, &JsValue::from_str("children"), &carr.into());
            }
            VNodeType::_Phantom(_) => {}
        }
        obj
    }

    /// 将开发态 JS 对象转换为当前适配器的 VNode
    pub(crate) fn dev_object_to_vnode(&mut self, obj: &Object) -> VNode<A>
    where
        A::Element: From<JsValue>,
    {
        if let Some(v) = self.take_tagged_vnode::<A>(obj) {
            return v;
        }
        let ve = Reflect::get(obj, &JsValue::from_str("vaporElement"))
            .unwrap_or(JsValue::UNDEFINED);
        if !ve.is_undefined() && !ve.is_null() {
            return self.child_object_to_vnode(obj);
        }
        let tt = Reflect::get(obj, &JsValue::from_str("type")).unwrap_or(JsValue::UNDEFINED);
        let mut pp = Reflect::get(obj, &JsValue::from_str("props")).unwrap_or(JsValue::UNDEFINED);
        let mut cc =
            Reflect::get(obj, &JsValue::from_str("children")).unwrap_or(JsValue::UNDEFINED);
        if (cc.is_undefined() || cc.is_null()) && pp.is_object() {
            let pobj = Object::from(pp.clone());
            // 将 children 从 props 提升到顶层，并从 props 中删除该字段
            cc = Reflect::get(&pobj, &JsValue::from_str("children")).unwrap_or(JsValue::UNDEFINED);
            let _ = js_sys::Reflect::delete_property(&pobj, &JsValue::from_str("children"));
            pp = pobj.into();
        }
        let props_map = self.props_map_from_js(&pp);
        let child_vec = self.children_from_js(&cc);
        let tag = self.tag_from_js(&tt, &props_map);
        self.create_element(tag, Some(props_map), child_vec)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runtime::types::ComponentProps;
    use js_sys::{Function, Object as JsObject};
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn vapor_with_setup_roundtrip_preserves_setup_marker() {
        let mut rue: Rue<JsDomAdapter> = Rue::new();
        let setup = Function::new_no_args("return 1;");
        let vnode = VNode {
            r#type: VNodeType::VaporWithSetup(setup.into()),
            props: ComponentProps::new(),
            children: vec![],
            el: None,
            key: None,
            comp_hooks: None,
            comp_subtree: None,
            comp_host: None,
            comp_props_ro: None,
            comp_inst_index: None,
        };

        let obj = rue.vnode_to_dev_object(&vnode);
        let props = Object::from(
            Reflect::get(&obj, &JsValue::from_str("props")).unwrap_or(JsValue::UNDEFINED),
        );
        let setup_value = Reflect::get(&props, &JsValue::from_str("setup"))
            .unwrap_or(JsValue::UNDEFINED);
        assert!(setup_value.is_function());

        let roundtrip = rue.dev_object_to_vnode(&obj);
        assert!(matches!(roundtrip.r#type, VNodeType::VaporWithSetup(_)));
    }

    #[wasm_bindgen_test]
    fn vapor_with_existing_element_roundtrip_preserves_element() {
        let mut rue: Rue<JsDomAdapter> = Rue::new();
        let el: JsValue = JsObject::new().into();
        let vnode = VNode {
            r#type: VNodeType::Vapor,
            props: ComponentProps::new(),
            children: vec![],
            el: Some(el.clone()),
            key: None,
            comp_hooks: None,
            comp_subtree: None,
            comp_host: None,
            comp_props_ro: None,
            comp_inst_index: None,
        };

        let obj = rue.vnode_to_dev_object(&vnode);
        let serialized_el = Reflect::get(&obj, &JsValue::from_str("vaporElement"))
            .unwrap_or(JsValue::UNDEFINED);
        assert!(js_sys::Object::is(&serialized_el, &el));

        let roundtrip = rue.dev_object_to_vnode(&obj);
        assert!(matches!(roundtrip.r#type, VNodeType::Vapor));
        assert!(roundtrip.el.is_some());
        assert!(js_sys::Object::is(&roundtrip.el.unwrap(), &el));
    }
}
