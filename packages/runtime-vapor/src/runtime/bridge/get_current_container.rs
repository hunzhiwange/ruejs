use super::WasmRue;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "getCurrentContainer")]
    /// 获取当前容器：优先返回最近一次渲染或挂载设置的容器
    pub fn get_current_container_wasm(&self) -> JsValue {
        // 若 last_container 有值，直接返回
        if let Some(c) = self.last_container.borrow().as_ref() {
            return c.clone();
        }
        // 尝试只读借用 inner，从 Rue 查询当前容器
        if let Ok(inner) = self.inner.try_borrow() {
            #[cfg(feature = "dev")]
            {
                if crate::log::want_log("debug", "runtime:getCurrentContainer start") {
                    crate::log::log("debug", "runtime:getCurrentContainer start");
                }
            }
            let res = inner.get_current_container();
            #[cfg(feature = "dev")]
            {
                if crate::log::want_log("debug", "runtime:getCurrentContainer") {
                    let has = res.is_some();
                    crate::log::log(
                        "debug",
                        &format!("runtime:getCurrentContainer has_container={}", has),
                    );
                }
            }
            // 转换返回元素为 JsValue；若无则返回 UNDEFINED
            res.map(|el| JsValue::from(el)).unwrap_or(JsValue::UNDEFINED)
        } else {
            #[cfg(feature = "dev")]
            {
                crate::log::warning("runtime:getCurrentContainer reentrant borrow");
            }
            JsValue::UNDEFINED
        }
    }
}
