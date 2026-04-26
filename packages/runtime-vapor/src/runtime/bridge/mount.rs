use super::WasmRue;
use js_sys::{Array, Function, Object};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    /// 记录最近容器（克隆一份 JsValue）
    fn set_last_container_clone(&self, cont: &JsValue) {
        let mut lc = self.last_container.borrow_mut();
        *lc = Some(cont.clone());
    }

    /// 挂载前刷新延迟队列：设置当前容器并执行 deferred_queue
    fn pre_flush_deferred(&self, cont: &JsValue) {
        // deferred_queue 的来源：
        // - 运行时某些路径会把“需要在真实挂载前执行的任务”延迟入队（例如插件、hook 包装等）
        // - mount 的语义是“把应用挂到指定容器”，因此在第一次 render 前需要先把这些任务跑完
        //
        // 注意：这里用 std::mem::take 把队列直接搬走，避免在执行过程中 re-entrant 再次借用 inner。
        let pre_queue = {
            let mut inner = self.inner.borrow_mut();
            inner.current_container = Some(cont.clone().into());
            std::mem::take(&mut inner.deferred_queue)
        };
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:mount pre_flush") {
                crate::log::log(
                    "debug",
                    &format!("runtime:mount pre_flush deferred_queue_len={}", pre_queue.len()),
                );
            }
        }
        for mut f in pre_queue.into_iter() {
            f();
        }
    }

    /// 若 app 为函数：调用并将返回值交由 render 处理
    fn try_call_app_and_render(&self, app: &JsValue, cont: &JsValue) -> bool {
        // 这里传给 app 的 props 目前是空对象：
        // - 通常会传入 props + children
        // - Rust/wasm 这层目前主要是兼容 “app(props) -> MountInput/raw node/handle” 的签名
        //
        // 关键点：app 函数内部通常会“读取响应式数据”（signal/ref/computed 等）。
        // 在 mount_wasm 中我们会把 try_call_app_and_render 包进 create_effect 里，
        // 因此这些读取会被依赖追踪，从而实现 root 级别的自动重渲染。
        let props = Object::new();
        if let Some(func) = app.dyn_ref::<Function>() {
            if let Ok(v) = func.call1(&JsValue::UNDEFINED, &props.into()) {
                #[cfg(feature = "dev")]
                {
                    if crate::log::want_log("debug", "runtime:mount app return") {
                        let is_num = v.as_f64().is_some();
                        let is_str = v.as_string().is_some();
                        let is_obj = v.is_object();
                        crate::log::log(
                            "debug",
                            &format!(
                                "runtime:mount app return type num={} str={} obj={}",
                                is_num, is_str, is_obj
                            ),
                        );
                    }
                }
                // 将 app 的返回值交给 render_wasm：
                // - v 可以是 registry id / raw DOM node / fragment / mount handle 等
                // - render_wasm 会解析成 MountInput 并入队，随后通过 Promise.then 异步 flush
                self.render_wasm(v, cont.clone());
                return true;
            }
        }
        false
    }

    /// 渲染一个空 Fragment 到容器，用于无 app 场景
    fn render_empty_fragment_to(&self, cont: &JsValue) {
        let mount_handle = self.create_element_wasm(
            JsValue::from_str("fragment"),
            JsValue::UNDEFINED,
            Array::new().into(),
        );
        let mount_id = self.mount_registry_id(&mount_handle);
        if let Some(input) = super::WasmRue::take_mount_input_from_registry(&mount_id) {
            self.pending_render.borrow_mut().push((input, cont.clone()));
            self.schedule_flush();
        }
    }

    #[wasm_bindgen(js_name = "mount")]
    /// 挂载入口：预刷新延迟任务 → 调用 app → 回退到空片段
    pub fn mount_wasm(&self, app: JsValue, container: JsValue) {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:mount") {
                let has_app = app.is_function();
                let has_cont = !container.is_undefined() && !container.is_null();
                crate::log::log(
                    "debug",
                    &format!("runtime:mount has_app_fn={} has_container={}", has_app, has_cont),
                );
            }
        }
        let cont: JsValue = container;
        // mount 可能被重复调用（例如热更新、路由切换、用户手动重新挂载）：
        // - 为避免一个 WasmRue 实例存在多个 root effect 同时运行导致重复 render
        // - 这里先释放上一次 mount 创建的 root effect（如果存在）
        self.dispose_root_effect();
        self.set_last_container_clone(&cont);
        if app.is_function() {
            // 创建 root scope 以管理所有应用层级的 effect
            let scope_id = crate::reactive::core::create_effect_scope();
            crate::reactive::core::push_effect_scope(scope_id);

            // 1. 在 root scope 内运行延迟任务（插件）
            // 这确保插件创建的 effect 能被正确收集
            self.pre_flush_deferred(&cont);

            // 2. 直接运行 app (setup) 一次
            // 不要用 create_effect 包裹，因为 setup 应该只运行一次。
            // 响应式更新由 setup 内部创建的细粒度 effect 处理。
            if !self.try_call_app_and_render(&app, &cont) {
                self.render_empty_fragment_to(&cont);
            }

            crate::reactive::core::pop_effect_scope();

            // 保存 scope_id 用于 unmount 清理
            *self.root_effect_scope.borrow_mut() = Some(scope_id);
            // root_effect 和 root_effect_closure 不再用于主应用执行，
            // 但保留这些字段以备将来使用或兼容性。
            // 这里显式设置为 None。
            *self.root_effect.borrow_mut() = None;
            *self.root_effect_closure.borrow_mut() = None;
        } else {
            self.pre_flush_deferred(&cont);
            self.render_empty_fragment_to(&cont);
        }
    }
}
