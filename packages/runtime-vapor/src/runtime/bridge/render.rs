use super::WasmRue;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::MountInput;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    /// 入队一次渲染并调度异步刷新
    fn enqueue_render_and_schedule(&self, input: MountInput<JsDomAdapter>, cont: &JsValue) {
        self.pending_render.borrow_mut().push((input, cont.clone()));
        self.schedule_flush();
    }

    #[wasm_bindgen(js_name = "render")]
    /// 渲染入口：接受 mount handle、raw node 或合法数组，解析为 MountInput 并异步提交
    pub fn render_wasm(&self, input_value: JsValue, container: JsValue) {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:render") {
                let has_id = !input_value.is_undefined() && !input_value.is_null();
                let has_cont = !container.is_undefined() && !container.is_null();
                crate::log::log(
                    "debug",
                    &format!("runtime:render has_input_value={} has_container={}", has_id, has_cont),
                );
            }
        }
        let Some(input) = self.default_mount_input_from_input(&input_value, false) else {
            #[cfg(feature = "dev")]
            {
                crate::log::warning("Rue runtime: render input not supported on the default path");
            }

            {
                let mut lc = self.last_container.borrow_mut();
                *lc = Some(container.clone());
            }

            if let Ok(mut inner) = self.inner.try_borrow_mut() {
                let mut container_value = container.clone();
                inner.clear_container((&mut container_value).into());
            }
            return;
        };
        // 记录最近容器（用于 getCurrentContainer）
        let cont: JsValue = container;
        {
            let mut lc = self.last_container.borrow_mut();
            *lc = Some(cont.clone());
        }
        // 提交渲染并调度
        self.enqueue_render_and_schedule(input, &cont);
    }
}
