use super::WasmRue;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::MountInput;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    /// 入队一次静态锚点渲染并调度异步刷新
    fn enqueue_static_and_schedule(&self, input: MountInput<JsDomAdapter>, parent: JsValue, anchor: JsValue) {
        self.pending_static.borrow_mut().push((input, parent, anchor));
        self.schedule_flush();
    }

    #[wasm_bindgen(js_name = "renderStatic")]
    /// 单锚点静态渲染入口：解析 mount handle、函数组件、raw node 或合法数组，并提交静态挂载信息
    pub fn render_static_wasm(&self, input_value: JsValue, parent: JsValue, anchor: JsValue) {
        let Some(input) = self.default_mount_input_from_input(&input_value, true) else {
            #[cfg(feature = "dev")]
            {
                crate::log::warning("Rue runtime: renderStatic input not supported on the default path");
            }
            return;
        };

        self.enqueue_static_and_schedule(input, parent, anchor);
    }
}