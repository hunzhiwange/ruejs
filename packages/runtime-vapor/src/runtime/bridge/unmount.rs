use super::WasmRue;
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "unmount")]
    /// 卸载入口：清空容器 innerHTML，并解除 container_map 绑定
    pub fn unmount_wasm(&self, container: JsValue) {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:unmount") {
                crate::log::log("debug", "runtime:unmount");
            }
        }
        // unmount 语义是“停止这棵应用”：
        // - 如果之前通过 mount 创建过 root effect，需要在这里释放
        // - 否则响应式依赖变更仍会触发 effect 运行，从而继续尝试 render，造成“卸载后又渲染”的异常行为
        //
        // 这里释放的是 root effect，不等同于每个组件/Vapor 子树的 effect scope；
        // Vapor 子树的 scope 会在对应 vnode unmount 生命周期里处理。
        self.dispose_root_effect();
        let mut inner = self.inner.borrow_mut();
        let mut cont: JsValue = container.clone();
        if let Some(adapter) = inner.get_dom_adapter_mut() {
            // 清空容器内容
            adapter.set_inner_html((&mut cont).into(), "");
        }
        if let Some(adapter_ro) = inner.get_dom_adapter() {
            // 遍历 container_map，找到与目标容器相互包含的条目并清除绑定
            let mut to_remove: Option<usize> = None;
            for (i, (c, _)) in inner.container_map.iter().enumerate() {
                if adapter_ro.contains(c, (&cont).into()) && adapter_ro.contains((&cont).into(), c)
                {
                    to_remove = Some(i);
                    break;
                }
            }
            if let Some(i) = to_remove {
                inner.container_map[i].1 = None;
            }
        }
    }
}
