use super::super::WasmRue;
use crate::runtime::dom_adapter::DomAdapter;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::{Child, ComponentProps, VNode, VNodeType};
use js_sys::{Array, Object, Reflect};
use wasm_bindgen::JsValue;

fn push_child_value(
    this: &WasmRue,
    item: JsValue,
    child_vec: &mut Vec<Child<JsDomAdapter>>,
) {
    if Array::is_array(&item) {
        let nested = Array::from(&item);
        for i in 0..nested.length() {
            push_child_value(this, nested.get(i), child_vec);
        }
        return;
    }

    if let Some(s) = item.as_string() {
        child_vec.push(Child::<JsDomAdapter>::Text(s));
    } else if let Some(_n) = item.as_f64() {
        // 数字：可能是注册表 id；否则转字符串文本
        if let Some(vnode) = WasmRue::take_vnode_from_registry(&item) {
            child_vec.push(Child::<JsDomAdapter>::VNode(vnode));
        } else {
            child_vec.push(Child::<JsDomAdapter>::Text(_n.to_string()));
        }
    } else if let Some(b) = item.as_bool() {
        child_vec.push(Child::<JsDomAdapter>::Bool(b));
    } else if item.is_null() || item.is_undefined() {
        child_vec.push(Child::<JsDomAdapter>::Null);
    } else if item.is_object() {
        let obj = Object::from(item.clone());
        let idv = Reflect::get(&obj, &JsValue::from_str("__rue_vnode_id"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(_idf) = idv.as_f64() {
            // 对象带注册表 id：取出对应 VNode
            if let Some(vnode) = WasmRue::take_vnode_from_registry(&idv) {
                child_vec.push(Child::<JsDomAdapter>::VNode(vnode));
            } else {
                child_vec.push(Child::<JsDomAdapter>::Null);
            }
        } else {
            let ve = Reflect::get(&obj, &JsValue::from_str("vaporElement"))
                .unwrap_or(JsValue::UNDEFINED);
            if !ve.is_undefined() && !ve.is_null() {
                // 对象带 vaporElement：构建 Vapor VNode 并作为子节点
                let el: <JsDomAdapter as DomAdapter>::Element = ve.into();
                let vnode = VNode {
                    r#type: VNodeType::<JsDomAdapter>::Vapor,
                    props: ComponentProps::new(),
                    children: vec![],
                    el: Some(el),
                    key: None,
                    comp_hooks: None,
                    comp_subtree: None,
                    comp_host: None,
                    comp_props_ro: None,
                    comp_inst_index: None,
                };
                child_vec.push(Child::<JsDomAdapter>::VNode(vnode));
            } else {
                // 开发态对象：递归调用 createElement，并解包注册表 id
                let tt2 = Reflect::get(&obj, &JsValue::from_str("type"))
                    .unwrap_or(JsValue::UNDEFINED);
                let mut pp2 = Reflect::get(&obj, &JsValue::from_str("props"))
                    .unwrap_or(JsValue::UNDEFINED);
                let mut cc2 = Reflect::get(&obj, &JsValue::from_str("children"))
                    .unwrap_or(JsValue::UNDEFINED);
                if (cc2.is_undefined() || cc2.is_null()) && pp2.is_object() {
                    let pobj = Object::from(pp2.clone());
                    cc2 = Reflect::get(&pobj, &JsValue::from_str("children"))
                        .unwrap_or(JsValue::UNDEFINED);
                    let _ = js_sys::Reflect::delete_property(&pobj, &JsValue::from_str("children"));
                    pp2 = pobj.into();
                }
                let id = this.create_element_wasm(tt2, pp2, cc2);
                let mut id_unwrapped = id.clone();
                if id_unwrapped.is_object() {
                    let obj_id = Object::from(id_unwrapped.clone());
                    id_unwrapped = Reflect::get(&obj_id, &JsValue::from_str("__rue_vnode_id"))
                        .unwrap_or(JsValue::UNDEFINED);
                }
                if let Some(vnode) = WasmRue::take_vnode_from_registry(&id_unwrapped) {
                    child_vec.push(Child::<JsDomAdapter>::VNode(vnode));
                } else {
                    child_vec.push(Child::<JsDomAdapter>::Null);
                }
            }
        }
    }
}

pub(super) fn build_children_vec_array(this: &WasmRue, arr: Array) -> Vec<Child<JsDomAdapter>> {
    // 遍历数组项，按类型归一化为 Child<JsDomAdapter>
    let mut child_vec: Vec<Child<JsDomAdapter>> = Vec::new();
    for i in 0..arr.length() {
        push_child_value(this, arr.get(i), &mut child_vec);
    }
    child_vec
}

pub(super) fn build_children_vec_single(this: &WasmRue, item: JsValue) -> Vec<Child<JsDomAdapter>> {
    // 单值 children 的归一化逻辑（与数组分支一致）
    let mut child_vec: Vec<Child<JsDomAdapter>> = Vec::new();
    push_child_value(this, item, &mut child_vec);
    child_vec
}
