use super::WasmRue;
use crate::runtime::DEFAULT_MOUNT_HANDLE_KEY;
#[cfg(feature = "dev")]
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::MountInput;
#[cfg(feature = "dev")]
use crate::runtime::types::MountInputType;
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

mod create_element_children;
mod create_element_handle_out;
mod create_element_helpers;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "createElement")]
    /// 创建元素/组件的默认挂载输入句柄（tagged mount handle）。
    ///
    /// - 默认主路径写入的是 MountInput 注册表句柄
    /// - 组件函数：构建组件输入并输出注册表 ID
    /// - 普通标签：解析类型与 children，输出注册表句柄
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
        // 组件函数：解析 props+children，输出组件 MountInput 的注册表引用
        if type_tag.is_function() {
            #[cfg(feature = "dev")]
            {
                if crate::log::want_log("debug", "runtime:createElement function_component") {
                    crate::log::log("debug", "runtime:createElement function_component");
                }
            }
            let props_map = create_element_helpers::build_props_map(self, &props, &children);
            let func = type_tag.dyn_ref::<Function>().unwrap().clone();
            return create_element_handle_out::create_function_component_out(self, func, props_map);
        }
        // 普通标签：构建 props 映射（children 单独交由 effective_children 处理）
        let props_map = create_element_helpers::build_props_map(self, &props, &JsValue::UNDEFINED);
        let tt = create_element_helpers::resolve_type(self, &type_tag, &props_map);
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:createElement mount_input_build") {
                crate::log::log("debug", "runtime:createElement mount_input_build");
            }
            if crate::log::want_log("debug", "runtime:createElement tag_resolved") {
                let ty = match &tt {
                    MountInputType::<JsDomAdapter>::Text(_) => "Text",
                    MountInputType::<JsDomAdapter>::Fragment => "Fragment",
                    MountInputType::<JsDomAdapter>::Vapor => "Vapor",
                    MountInputType::<JsDomAdapter>::VaporWithSetup(_) => "VaporWithSetup",
                    MountInputType::<JsDomAdapter>::Element(s) => s.as_str(),
                    MountInputType::<JsDomAdapter>::Component(_) => "Component",
                    MountInputType::<JsDomAdapter>::_Phantom(_) => "_Phantom",
                };
                crate::log::log(
                    "debug",
                    &format!("runtime:createElement tag_resolved type={}", ty),
                );
            }
        }
        // 计算 children 的有效值：优先显式传入，否则回退到 props.children
        let children_eff = create_element_helpers::effective_children(self, &children, &props_map);
        // children 归一化为 MountInputChild：数组或单值两种路径
        let child_vec = if Array::is_array(&children_eff) {
            create_element_children::build_children_vec_array(self, Array::from(&children_eff))
        } else {
            create_element_children::build_children_vec_single(self, children_eff.clone())
        };
        let input = MountInput::new_normalized(tt, props_map, child_vec);
        let key = input.key.clone();
        let id = crate::runtime::MOUNT_INPUT_REGISTRY.with(|reg| {
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
                    r[i] = Some(input);
                    i as u32
                }
                None => {
                    r.push(Some(input));
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
            &JsValue::from_str(DEFAULT_MOUNT_HANDLE_KEY),
            &JsValue::from_f64(id as f64),
        );
        if let Some(key) = key {
            let _ = Reflect::set(&out, &JsValue::from_str("key"), &JsValue::from_str(&key));
        }
        out.into()
    }
}
