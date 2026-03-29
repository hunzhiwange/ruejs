use super::WasmRue;
use crate::reactive::core::{create_effect_scope, pop_effect_scope, push_effect_scope};
use crate::runtime::dom_adapter::DomAdapter;
use crate::runtime::globals::VNODE_REGISTRY;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::{ComponentProps, VNode, VNodeType};
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "vapor")]
    /// 返回 Vapor/VaporWithSetup 的注册表对象
    ///
    /// - 若传入 setup 函数：构建 VaporWithSetup，并尝试立即调用以填充 el
    /// - 若 el 为片段：收集其子节点并写入 __fragNodes
    /// - 否则构建普通 Vapor VNode
    pub fn vapor_wasm(&self, setup: JsValue) -> JsValue {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:vapor") {
                crate::log::log("debug", "runtime:vapor");
            }
        }
        // setup 为函数：构建 VaporWithSetup，并尝试调用以获取元素
        let vnode = if let Some(func) = setup.dyn_ref::<Function>() {
            // 为该 Vapor 子树创建一个“副作用作用域（effect scope）”：
            // - setup 执行期间注册的 watchEffect/watch/createEffect 会自动绑定到该 scope
            // - 当该 Vapor 子树卸载时，会通过 VNode 生命周期统一 dispose 掉这个 scope，防止副作用泄漏
            let scope_id = create_effect_scope();
            let mut out = VNode {
                r#type: VNodeType::<JsDomAdapter>::VaporWithSetup(func.clone().into()),
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
            // 将 scope id 写入 VNode props，供后续：
            // - real_dom_vapor_with_setup 再次调用 setup 时复用同一个 scope
            // - before_unmount 阶段找到该 scope 并统一 dispose
            out.props
                .insert("__rue_effect_scope_id".to_string(), JsValue::from_f64(scope_id as f64));
            if out.el.is_none() {
                // setup 可能会创建副作用（watchEffect 等），因此需要把 scope 压栈，使 create_effect 能读取到它。
                push_effect_scope(scope_id);
                let ret = func.call0(&JsValue::UNDEFINED);
                pop_effect_scope();
                if let Ok(ret) = ret {
                    if ret.is_object() {
                        let obj = js_sys::Object::from(ret.clone());
                        let ve = js_sys::Reflect::get(&obj, &JsValue::from_str("vaporElement"))
                            .unwrap_or(JsValue::UNDEFINED);
                        if !ve.is_undefined() && !ve.is_null() {
                            let el: <JsDomAdapter as DomAdapter>::Element = ve.into();
                            out.el = Some(el);
                        }
                    }
                } else {
                    #[cfg(feature = "dev")]
                    {
                        if crate::log::want_log("warning", "runtime:vapor setup threw") {
                            crate::log::warning("runtime:vapor setup threw");
                        }
                    }
                }
            }
            if let Some(el) = out.el.clone() {
                // 若为片段元素：收集真实子节点并写入 __fragNodes
                if let Ok(inner) = self.inner.try_borrow() {
                    if let Some(adapter) = inner.get_dom_adapter() {
                        if adapter.is_fragment(&el) {
                            let nodes = adapter.collect_fragment_children(&el);
                            let arr = Array::new();
                            for n in nodes.into_iter() {
                                arr.push(&n);
                            }
                            out.props.insert("__fragNodes".to_string(), arr.into());
                        }
                    }
                }
            }
            out
        } else {
            // 非函数：构建普通 Vapor VNode
            VNode {
                r#type: VNodeType::<JsDomAdapter>::Vapor,
                props: ComponentProps::new(),
                children: vec![],
                el: None,
                key: None,
                comp_hooks: None,
                comp_subtree: None,
                comp_host: None,
                comp_props_ro: None,
                comp_inst_index: None,
            }
        };
        // 写入注册表并返回 { __rue_vnode_id }
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
