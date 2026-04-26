use super::WasmRue;
use crate::reactive::core::create_effect_scope;
use crate::runtime::DEFAULT_MOUNT_HANDLE_KEY;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::{ComponentProps, MountInput, MountInputType};
use js_sys::{Function, Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "vapor")]
    /// 返回 Vapor/VaporWithSetup 的注册表句柄
    ///
    /// - 若传入 setup 函数：构建 VaporWithSetup，并预分配 effect scope id
    /// - 不在这里立即执行 setup，保持与挂载阶段一致的时机语义
    /// - 否则构建普通 Vapor MountInput
    pub fn vapor_wasm(&self, setup: JsValue) -> JsValue {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:vapor") {
                crate::log::log("debug", "runtime:vapor");
            }
        }
        // setup 为函数：构建 VaporWithSetup，但延后到真实挂载阶段再执行 setup
        let input = if let Some(func) = setup.dyn_ref::<Function>() {
            // 为该 Vapor 子树创建一个“副作用作用域（effect scope）”：
            // - setup 执行期间注册的 watchEffect/watch/createEffect 会自动绑定到该 scope
            // - 当该 Vapor 子树卸载时，会通过 mounted lifecycle 统一 dispose 掉这个 scope，防止副作用泄漏
            let scope_id = create_effect_scope();
            MountInput {
                r#type: MountInputType::<JsDomAdapter>::VaporWithSetup(func.clone().into()),
                props: ComponentProps::new(),
                children: vec![],
                key: None,
                mount_cleanup_bucket: None,
                mount_effect_scope_id: Some(scope_id),
                el_hint: None,
            }
        } else {
            // 非函数：构建普通 Vapor MountInput
            MountInput {
                r#type: MountInputType::<JsDomAdapter>::Vapor,
                props: ComponentProps::new(),
                children: vec![],
                key: None,
                mount_cleanup_bucket: None,
                mount_effect_scope_id: None,
                el_hint: None,
            }
        };
        // 写入默认输入注册表并返回默认 mount handle。
        let id = crate::runtime::MOUNT_INPUT_REGISTRY.with(|reg| {
            let mut r = reg.borrow_mut();
            r.push(Some(input));
            (r.len() - 1) as u32
        });
        let out = Object::new();
        let _ = Reflect::set(
            &out,
            &JsValue::from_str(DEFAULT_MOUNT_HANDLE_KEY),
            &JsValue::from_f64(id as f64),
        );
        out.into()
    }
}
