use super::WasmRue;
use crate::runtime::globals::VNODE_REGISTRY;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::VNodeType;
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

mod create_element_children;
mod create_element_helpers;
mod create_element_vnode_out;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "createElement")]
    /// 创建元素/组件的 VNode（开发态对象或注册表引用）
    ///
    /// - 组件函数：构建 Component 类型并输出注册表 ID
    /// - 普通标签：构建 VNodeType，归一化 children，入注册表或内联对象
    pub fn create_element_wasm(
        &self,
        type_tag: JsValue,
        props: JsValue,
        children: JsValue,
    ) -> JsValue {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:createElement") {
                let tt_s = type_tag.as_string().unwrap_or_default();
                let mut ck = 0usize;
                if props.is_object() {
                    let obj = Object::from(props.clone());
                    ck = Object::keys(&obj).length() as usize;
                }
                let mut clen = 0usize;
                if Array::is_array(&children) {
                    let arr = Array::from(&children);
                    clen = arr.length() as usize;
                }
                crate::log::log(
                    "debug",
                    &format!(
                        "runtime:createElement type_tag={} props_keys={} children_count={}",
                        tt_s, ck, clen
                    ),
                );
            }
        }
        // 组件函数：解析 props+children，输出组件 VNode 的注册表引用
        if type_tag.is_function() {
            #[cfg(feature = "dev")]
            {
                if crate::log::want_log("debug", "runtime:createElement function_component") {
                    crate::log::log("debug", "runtime:createElement function_component");
                }
            }
            let props_map = create_element_helpers::build_props_map(self, &props, &children);
            let func = type_tag.dyn_ref::<Function>().unwrap().clone();
            return create_element_vnode_out::create_function_component_out(self, func, props_map);
        }
        // 普通标签：构建 props 映射（children 单独交由 effective_children 处理）
        let props_map = create_element_helpers::build_props_map(self, &props, &JsValue::UNDEFINED);
        let tt = create_element_helpers::resolve_type(self, &type_tag, &props_map);
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:createElement vnode_build") {
                crate::log::log("debug", "runtime:createElement vnode_build");
            }
            if crate::log::want_log("debug", "runtime:createElement tag_resolved") {
                let ty = match &tt {
                    VNodeType::<JsDomAdapter>::Text => "Text",
                    VNodeType::<JsDomAdapter>::Fragment => "Fragment",
                    VNodeType::<JsDomAdapter>::Vapor => "Vapor",
                    VNodeType::<JsDomAdapter>::VaporWithSetup(_) => "VaporWithSetup",
                    VNodeType::<JsDomAdapter>::Element(s) => s.as_str(),
                    VNodeType::<JsDomAdapter>::Component(_) => "Component",
                    VNodeType::<JsDomAdapter>::_Phantom(_) => "_Phantom",
                };
                crate::log::log(
                    "debug",
                    &format!("runtime:createElement tag_resolved type={}", ty),
                );
            }
        }
        // 计算 children 的有效值：优先显式传入，否则回退到 props.children
        let children_eff = create_element_helpers::effective_children(self, &children, &props_map);
        // children 归一化为 Child<Vec>：数组或单值两种路径
        let child_vec = if Array::is_array(&children_eff) {
            create_element_children::build_children_vec_array(self, Array::from(&children_eff))
        } else {
            create_element_children::build_children_vec_single(self, children_eff.clone())
        };

        // 尝试借用 inner：成功时使用 Rue.create_element 并入注册表
        if let Ok(mut rue) = self.inner.try_borrow_mut() {
            #[cfg(feature = "dev")]
            {
                if crate::log::want_log("debug", "runtime:createElement adapter_presence") {
                    let has = rue.get_dom_adapter().is_some();
                    crate::log::log(
                        "debug",
                        &format!("runtime:createElement adapter_present={}", has),
                    );
                }
                if crate::log::want_log("debug", "runtime:createElement before rue.create_element")
                {
                    crate::log::log("debug", "runtime:createElement before rue.create_element");
                }
                if crate::log::want_log("debug", "runtime:createElement vnode_meta") {
                    let ty = match &tt {
                        VNodeType::<JsDomAdapter>::Text => "Text",
                        VNodeType::<JsDomAdapter>::Fragment => "Fragment",
                        VNodeType::<JsDomAdapter>::Vapor => "Vapor",
                        VNodeType::<JsDomAdapter>::VaporWithSetup(_) => "VaporWithSetup",
                        VNodeType::<JsDomAdapter>::Element(s) => s.as_str(),
                        VNodeType::<JsDomAdapter>::Component(_) => "Component",
                        VNodeType::<JsDomAdapter>::_Phantom(_) => "_Phantom",
                    };
                    crate::log::log(
                        "debug",
                        &format!(
                            "runtime:createElement vnode_meta type={} children_len={} props_len={}",
                            ty,
                            child_vec.len(),
                            props_map.len()
                        ),
                    );
                }
            }
            let vnode = rue.create_element(tt, Some(props_map), child_vec);
            #[cfg(feature = "dev")]
            {
                if crate::log::want_log("debug", "runtime:createElement after rue.create_element") {
                    crate::log::log("debug", "runtime:createElement after rue.create_element");
                }
            }
            let id = VNODE_REGISTRY.with(|reg| {
                let mut r = reg.borrow_mut();
                let mut idx = None;
                for (i, slot) in r.iter().enumerate() {
                    if slot.is_none() {
                        idx = Some(i);
                        break;
                    }
                }
                match idx {
                    Some(i) => {
                        r[i] = Some(vnode);
                        i as u32
                    }
                    None => {
                        r.push(Some(vnode));
                        (r.len() - 1) as u32
                    }
                }
            });
            #[cfg(feature = "dev")]
            {
                if crate::log::want_log("debug", "runtime:createElement id") {
                    crate::log::log("debug", &format!("runtime:createElement id={}", id));
                }
                if crate::log::want_log("debug", "runtime:createElement id_info") {
                    crate::log::log("debug", &format!("runtime:createElement id_info id={}", id));
                }
            }
            let out = Object::new();
            let _ = Reflect::set(
                &out,
                &JsValue::from_str("__rue_vnode_id"),
                &JsValue::from_f64(id as f64),
            );
            out.into()
        } else {
            #[cfg(feature = "dev")]
            {
                if crate::log::want_log("debug", "runtime:createElement build_inline_vnode") {
                    crate::log::log("debug", "runtime:createElement build_inline_vnode");
                }
            }
            // 借用失败（重入）：构建内联开发态对象作为返回
            create_element_vnode_out::build_inline_vnode_out(self, tt, props_map, child_vec)
        }
    }
}
