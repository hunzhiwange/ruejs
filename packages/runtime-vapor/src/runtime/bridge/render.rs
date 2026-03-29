use super::WasmRue;
use crate::runtime::dom_adapter::DomAdapter;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::{ComponentProps, VNode, VNodeType};
use js_sys::{Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    /// 规范化传入的 vnode 标识值（数字/对象/不合法）
    fn initial_id_value_render(&self, vnode_id: &JsValue) -> JsValue {
        if vnode_id.as_f64().is_some() {
            vnode_id.clone()
        } else if vnode_id.is_object() {
            let obj = Object::from(vnode_id.clone());
            Reflect::get(&obj, &JsValue::from_str("__rue_vnode_id")).unwrap_or(JsValue::UNDEFINED)
        } else {
            JsValue::UNDEFINED
        }
    }

    /// 从 { vaporElement } 对象生成 Vapor 类型的 VNode
    fn vnode_from_vapor_element(&self, obj: &Object) -> Option<VNode<JsDomAdapter>> {
        let ve =
            Reflect::get(obj, &JsValue::from_str("vaporElement")).unwrap_or(JsValue::UNDEFINED);
        if !ve.is_undefined() && !ve.is_null() {
            let el: <JsDomAdapter as DomAdapter>::Element = ve.into();
            Some(VNode {
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
            })
        } else {
            None
        }
    }

    /// 从开发态对象或注册表条目生成 VNode
    ///
    /// - 若对象带 __rue_vnode_id：直接读取注册表
    /// - 否则将对象按 type/props/children 走 createElement，再取注册表
    fn vnode_from_dev_object_or_registry(
        &self,
        obj: &Object,
        idv: &mut JsValue,
    ) -> Option<VNode<JsDomAdapter>> {
        let tt2 = Reflect::get(obj, &JsValue::from_str("type")).unwrap_or(JsValue::UNDEFINED);
        let mut pp2 = Reflect::get(obj, &JsValue::from_str("props")).unwrap_or(JsValue::UNDEFINED);
        let mut cc2 =
            Reflect::get(obj, &JsValue::from_str("children")).unwrap_or(JsValue::UNDEFINED);
        let tagged =
            Reflect::get(obj, &JsValue::from_str("__rue_vnode_id")).unwrap_or(JsValue::UNDEFINED);
        if tagged.as_f64().is_some() {
            // 对象内联了注册表 id：直接读取 VNode
            *idv = tagged;
            WasmRue::take_vnode_from_registry(idv)
        } else {
            // children 提升：若 children 在 props 中，提取到顶层并删除属性
            if (cc2.is_undefined() || cc2.is_null()) && pp2.is_object() {
                let pobj = Object::from(pp2.clone());
                cc2 = Reflect::get(&pobj, &JsValue::from_str("children"))
                    .unwrap_or(JsValue::UNDEFINED);
                let _ = js_sys::Reflect::delete_property(&pobj, &JsValue::from_str("children"));
                pp2 = pobj.into();
            }
            // 调用 createElement，得到注册表 id 或对象，再统一解包 id
            let id = self.create_element_wasm(tt2, pp2, cc2);
            let mut id_unwrapped = id.clone();
            if id_unwrapped.is_object() {
                let obj_id = Object::from(id_unwrapped.clone());
                id_unwrapped = Reflect::get(&obj_id, &JsValue::from_str("__rue_vnode_id"))
                    .unwrap_or(JsValue::UNDEFINED);
            }
            WasmRue::take_vnode_from_registry(&id_unwrapped)
        }
    }

    /// 入队一次渲染并调度异步刷新
    fn enqueue_render_and_schedule(&self, vnode: VNode<JsDomAdapter>, cont: &JsValue) {
        self.pending_render.borrow_mut().push((vnode, cont.clone()));
        self.schedule_flush();
    }

    #[wasm_bindgen(js_name = "render")]
    /// 渲染入口：接受 id/对象/vaporElement，解析为 VNode 并异步提交
    pub fn render_wasm(&self, vnode_id: JsValue, container: JsValue) {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:render") {
                let has_id = !vnode_id.is_undefined() && !vnode_id.is_null();
                let has_cont = !container.is_undefined() && !container.is_null();
                crate::log::log(
                    "debug",
                    &format!("runtime:render has_vnode_id={} has_container={}", has_id, has_cont),
                );
            }
        }
        // 规范化 vnode 标识为数字 id 或 UNDEFINED
        let mut idv = self.initial_id_value_render(&vnode_id);
        // 优先从注册表取；若未命中且是对象，则尝试 vaporElement 或开发态对象路径
        let mut maybe_vnode = WasmRue::take_vnode_from_registry(&idv);
        if maybe_vnode.is_none() && vnode_id.is_object() {
            let obj = Object::from(vnode_id.clone());
            maybe_vnode = self
                .vnode_from_vapor_element(&obj)
                .or_else(|| self.vnode_from_dev_object_or_registry(&obj, &mut idv));
        }
        if maybe_vnode.is_none() {
            #[cfg(feature = "dev")]
            {
                crate::log::warning("Rue runtime: render vnode not found");
            }
            return;
        }
        // 解包 VNode；若缺失说明解析失败，直接返回
        let vnode: VNode<JsDomAdapter> = match maybe_vnode {
            Some(v) => v,
            None => {
                #[cfg(feature = "dev")]
                {
                    crate::log::warning("Rue runtime: render vnode missing after registry lookup");
                }
                return;
            }
        };
        // 记录最近容器（用于 getCurrentContainer）
        let cont: JsValue = container;
        {
            let mut lc = self.last_container.borrow_mut();
            *lc = Some(cont.clone());
        }
        // 提交渲染并调度
        self.enqueue_render_and_schedule(vnode, &cont);
    }
}
