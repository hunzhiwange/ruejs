use super::WasmRue;
use crate::runtime::dom_adapter::DomAdapter;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::{ComponentProps, VNode, VNodeType};
use js_sys::{Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    /// 规范化传入的 vnode 标识值（数字/字符串数字/对象）
    fn initial_id_value_static(&self, vnode_id: &JsValue) -> JsValue {
        if vnode_id.as_f64().is_some() {
            vnode_id.clone()
        } else if let Some(s) = vnode_id.as_string() {
            match s.parse::<f64>() {
                Ok(n) => JsValue::from_f64(n),
                Err(_) => JsValue::UNDEFINED,
            }
        } else if vnode_id.is_object() {
            let obj = Object::from(vnode_id.clone());
            Reflect::get(&obj, &JsValue::from_str("__rue_vnode_id"))
                .unwrap_or(JsValue::UNDEFINED)
        } else {
            JsValue::UNDEFINED
        }
    }

    /// 将函数组件转换为注册表中的 VNode
    fn vnode_from_function_component_static(&self, vnode_id: &JsValue) -> Option<VNode<JsDomAdapter>> {
        if !vnode_id.is_function() {
            return None;
        }
        let empty_props = Object::new();
        let id = self.create_element_wasm(vnode_id.clone(), empty_props.into(), JsValue::UNDEFINED);
        let mut id_unwrapped = id.clone();
        if id_unwrapped.is_object() {
            let obj_id = Object::from(id_unwrapped.clone());
            id_unwrapped = Reflect::get(&obj_id, &JsValue::from_str("__rue_vnode_id"))
                .unwrap_or(JsValue::UNDEFINED);
        }
        WasmRue::take_vnode_from_registry(&id_unwrapped)
    }

    /// 从对象解析为 VNode：支持 { vaporElement } 与开发态对象
    fn vnode_from_object_static(
        &self,
        vnode_id: &JsValue,
        idv: &mut JsValue,
    ) -> Option<VNode<JsDomAdapter>> {
        if !vnode_id.is_object() {
            return None;
        }
        let obj = Object::from(vnode_id.clone());
        let ve =
            Reflect::get(&obj, &JsValue::from_str("vaporElement")).unwrap_or(JsValue::UNDEFINED);
        if !ve.is_undefined() && !ve.is_null() {
            let el: <JsDomAdapter as DomAdapter>::Element = ve.into();
            return Some(VNode {
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
            });
        }
        let tt2 = Reflect::get(&obj, &JsValue::from_str("type")).unwrap_or(JsValue::UNDEFINED);
        let mut pp2 = Reflect::get(&obj, &JsValue::from_str("props")).unwrap_or(JsValue::UNDEFINED);
        let mut cc2 =
            Reflect::get(&obj, &JsValue::from_str("children")).unwrap_or(JsValue::UNDEFINED);
        let tagged =
            Reflect::get(&obj, &JsValue::from_str("__rue_vnode_id")).unwrap_or(JsValue::UNDEFINED);
        if tagged.as_f64().is_some() {
            *idv = tagged;
            return WasmRue::take_vnode_from_registry(idv);
        }
        if (cc2.is_undefined() || cc2.is_null()) && pp2.is_object() {
            let pobj = Object::from(pp2.clone());
            cc2 = Reflect::get(&pobj, &JsValue::from_str("children")).unwrap_or(JsValue::UNDEFINED);
            let _ = js_sys::Reflect::delete_property(&pobj, &JsValue::from_str("children"));
            pp2 = pobj.into();
        }
        let id = self.create_element_wasm(tt2, pp2, cc2);
        let mut id_unwrapped = id.clone();
        if id_unwrapped.is_object() {
            let obj_id = Object::from(id_unwrapped.clone());
            id_unwrapped = Reflect::get(&obj_id, &JsValue::from_str("__rue_vnode_id"))
                .unwrap_or(JsValue::UNDEFINED);
        }
        WasmRue::take_vnode_from_registry(&id_unwrapped)
    }

    /// 入队一次静态锚点渲染并调度异步刷新
    fn enqueue_static_and_schedule(&self, vnode: VNode<JsDomAdapter>, parent: JsValue, anchor: JsValue) {
        self.pending_static.borrow_mut().push((vnode, parent, anchor));
        self.schedule_flush();
    }

    #[wasm_bindgen(js_name = "renderStatic")]
    /// 单锚点静态渲染入口：解析 id/函数组件/对象为 VNode，并提交静态挂载信息
    pub fn render_static_wasm(&self, vnode_id: JsValue, parent: JsValue, anchor: JsValue) {
        let mut idv = self.initial_id_value_static(&vnode_id);
        let mut maybe_vnode = WasmRue::take_vnode_from_registry(&idv);
        if maybe_vnode.is_none() {
            maybe_vnode = self.vnode_from_function_component_static(&vnode_id);
        }
        if maybe_vnode.is_none() {
            maybe_vnode = self.vnode_from_object_static(&vnode_id, &mut idv);
        }
        if maybe_vnode.is_none() {
            #[cfg(feature = "dev")]
            {
                crate::log::warning("Rue runtime: renderStatic vnode not found");
            }
            return;
        }

        let vnode = maybe_vnode.unwrap();
        self.enqueue_static_and_schedule(vnode, parent, anchor);
    }
}