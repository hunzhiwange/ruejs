use super::super::WasmRue;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::{ComponentProps, VNodeType};
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

pub(super) fn build_props_map(
    this: &WasmRue,
    props: &JsValue,
    children: &JsValue,
) -> ComponentProps {
    // 将 props 对象转为映射：遍历 keys 并取值
    let mut props_map: ComponentProps = ComponentProps::new();
    if props.is_object() {
        let obj = Object::from(props.clone());
        let keys = Object::keys(&obj);
        for i in 0..keys.length() {
            let k = keys.get(i);
            if let Some(ks) = k.as_string() {
                let v = Reflect::get(&obj, &k).unwrap_or(JsValue::UNDEFINED);
                props_map.insert(ks, v);
            }
        }
    }
    // children 归一化：数组直接使用；单值包裹为数组
    if Array::is_array(children) {
        props_map.insert("children".to_string(), children.clone());
    } else if !children.is_undefined() && !children.is_null() {
        let arr = Array::new();
        arr.push(children);
        props_map.insert("children".to_string(), arr.into());
    }
    props_map
}

pub(super) fn resolve_type(
    this: &WasmRue,
    type_tag: &JsValue,
    props_map: &ComponentProps,
) -> VNodeType<JsDomAdapter> {
    // 字符串标签解析：fragment/vapor/普通标签
    if let Some(s) = type_tag.as_string() {
        if s == "fragment" {
            VNodeType::<JsDomAdapter>::Fragment
        } else if s == "vapor" {
            // vapor 可带 setup 函数：若存在返回 VaporWithSetup
            if let Some(setup) = props_map.get("setup") {
                if let Some(f) = setup.dyn_ref::<Function>() {
                    VNodeType::<JsDomAdapter>::VaporWithSetup(f.clone().into())
                } else {
                    VNodeType::<JsDomAdapter>::Vapor
                }
            } else {
                VNodeType::<JsDomAdapter>::Vapor
            }
        } else {
            VNodeType::<JsDomAdapter>::Element(s)
        }
    } else {
        // 非字符串：回退为 div
        VNodeType::<JsDomAdapter>::Element("div".into())
    }
}

pub(super) fn effective_children(
    this: &WasmRue,
    children: &JsValue,
    props_map: &ComponentProps,
) -> JsValue {
    // children 的有效值：若显式为空（空数组/undefined/null），回退到 props.children
    let mut children_eff = children.clone();
    if Array::is_array(&children_eff) {
        let arr0 = Array::from(&children_eff);
        if arr0.length() == 0 {
            if let Some(ch) = props_map.get("children") {
                children_eff = ch.clone();
            }
        }
    } else if children_eff.is_undefined() || children_eff.is_null() {
        if let Some(ch) = props_map.get("children") {
            children_eff = ch.clone();
        }
    }
    children_eff
}
