use super::super::WasmRue;
use crate::runtime::globals::VNODE_REGISTRY;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::{Child, ComponentProps, VNode, VNodeType};
use js_sys::{Function, Object, Reflect};
use wasm_bindgen::JsValue;

pub(super) fn build_inline_vnode_out(
    this: &WasmRue,
    tt: VNodeType<JsDomAdapter>,
    props_map: ComponentProps,
    child_vec: Vec<Child<JsDomAdapter>>,
) -> JsValue {
    // 归一化 children：将文本包装为 Text VNode，其余直接复制
    let mut normalized_children: Vec<Child<JsDomAdapter>> = Vec::new();
    for ch in child_vec.into_iter() {
        match ch {
            Child::<JsDomAdapter>::Text(s) => {
                let vnode_text = VNode {
                    r#type: VNodeType::<JsDomAdapter>::Text,
                    props: ComponentProps::new(),
                    children: vec![Child::<JsDomAdapter>::Text(s)],
                    el: None,
                    key: None,
                    comp_hooks: None,
                    comp_subtree: None,
                    comp_host: None,
                    comp_props_ro: None,
                    comp_inst_index: None,
                };
                normalized_children.push(Child::<JsDomAdapter>::VNode(vnode_text));
            }
            Child::<JsDomAdapter>::VNode(v) => {
                normalized_children.push(Child::<JsDomAdapter>::VNode(v))
            }
            Child::<JsDomAdapter>::Null => {}
            Child::<JsDomAdapter>::Bool(_) => {}
        }
    }
    // 解析 key：支持字符串与数字
    let key_opt = props_map.get("key").and_then(|v| {
        if let Some(s) = v.as_string() {
            Some(s)
        } else if let Some(n) = v.as_f64() {
            Some(n.to_string())
        } else {
            None
        }
    });
    // 构建内联 VNode 并写入注册表，返回 { __rue_vnode_id }
    let vnode = VNode {
        r#type: tt,
        props: props_map,
        children: normalized_children,
        el: None,
        key: key_opt,
        comp_hooks: None,
        comp_subtree: None,
        comp_host: None,
        comp_props_ro: None,
        comp_inst_index: None,
    };
    let id = VNODE_REGISTRY.with(|reg| {
        let mut r = reg.borrow_mut();
        r.push(Some(vnode));
        (r.len() - 1) as u32
    });
    let out = Object::new();
    let _ = Reflect::set(&out, &JsValue::from_str("__rue_vnode_id"), &JsValue::from_f64(id as f64));
    out.into()
}

pub(super) fn create_function_component_out(
    this: &WasmRue,
    func: Function,
    props_map: ComponentProps,
) -> JsValue {
    // 若可借用 inner：通过 Rue.create_element 构建组件 VNode 并入注册表
    if let Ok(mut rue) = this.inner.try_borrow_mut() {
        let vnode = rue.create_element(
            VNodeType::<JsDomAdapter>::Component(func.clone().into()),
            Some(props_map),
            Vec::new(),
        );
        let id = VNODE_REGISTRY.with(|reg| {
            let mut r = reg.borrow_mut();
            r.push(Some(vnode));
            (r.len() - 1) as u32
        });
        let out = Object::new();
        let _ =
            Reflect::set(&out, &JsValue::from_str("__rue_vnode_id"), &JsValue::from_f64(id as f64));
        out.into()
    } else {
        // 借用失败（重入）：构建内联组件 VNode 并入注册表
        let key_opt = props_map.get("key").and_then(|v| {
            if let Some(s) = v.as_string() {
                Some(s)
            } else if let Some(n) = v.as_f64() {
                Some(n.to_string())
            } else {
                None
            }
        });
        let vnode = VNode {
            r#type: VNodeType::<JsDomAdapter>::Component(func.clone().into()),
            props: props_map,
            children: Vec::new(),
            el: None,
            key: key_opt,
            comp_hooks: None,
            comp_subtree: None,
            comp_host: None,
            comp_props_ro: None,
            comp_inst_index: None,
        };
        let id = VNODE_REGISTRY.with(|reg| {
            let mut r = reg.borrow_mut();
            r.push(Some(vnode));
            (r.len() - 1) as u32
        });
        let out = Object::new();
        let _ =
            Reflect::set(&out, &JsValue::from_str("__rue_vnode_id"), &JsValue::from_f64(id as f64));
        out.into()
    }
}
