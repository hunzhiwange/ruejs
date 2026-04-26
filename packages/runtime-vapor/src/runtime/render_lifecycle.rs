use super::Rue;
use super::types::{ComponentProps, MountInput, MountInputType, MountLifecycleKind, MountLifecycleRecord};
use crate::reactive::core::dispose_effect_scope;
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Array, Function};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    fn dispose_mounted_component_scopes(&mut self, inst_index: usize) {
        self.dispose_component_render_scope(inst_index);
        crate::reactive::context::dispose_component_hook_scope(inst_index);
    }

    fn call_lifecycle_hooks(&mut self, hooks: &[JsValue]) {
        for hook in hooks.iter() {
            if let Some(func) = hook.dyn_ref::<Function>() {
                let _ = func.call0(&JsValue::UNDEFINED);
            }
        }
    }

    fn invoke_cleanup_bucket(&mut self, bucket: &JsValue) {
        if !Array::is_array(bucket) {
            return;
        }

        let arr = Array::from(bucket);
        let len = arr.length();
        let mut callbacks = Vec::with_capacity(len as usize);
        for index in 0..len {
            callbacks.push(arr.get(index));
        }
        arr.set_length(0);

        for callback in callbacks.into_iter() {
            if let Some(func) = callback.dyn_ref::<Function>() {
                let _ = func.call0(&JsValue::UNDEFINED);
            }
        }
    }

    fn invoke_mount_owned_resources(&mut self, record: &MountLifecycleRecord) {
        if let Some(bucket) = record.cleanup_bucket.as_ref() {
            self.invoke_cleanup_bucket(bucket);
        }
        if let Some(scope_id) = record.effect_scope_id {
            self.dispose_vapor_scope_id(scope_id);
        }
    }

    fn dispose_vapor_scope_id(&mut self, scope_id: usize) {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:mount before_unmount vapor") {
                crate::log::log(
                    "debug",
                    &format!("runtime:mount before_unmount vapor scope={}", scope_id),
                );
            }
        }
        dispose_effect_scope(scope_id);
    }

    /// 推入一个生命周期钩子：名称 -> JS 函数
    pub fn push_hook(&mut self, name: &str, f: JsValue) {
        let list = self.lifecycle_hooks.entry(name.to_string()).or_insert_with(Vec::new);
        list.push(f);
    }

    /// 调用生命周期钩子
    ///
    /// - 优先调用当前实例栈顶的组件实例 hooks
    /// - 若无栈顶实例，则调用全局 hooks（Rue.lifecycle_hooks）
    pub fn call_hooks(&mut self, name: &str) {
        use js_sys::Function;
        if let Some(top_idx) = self.instance_stack.last() {
            if let Some(inst) = self.instance_store.get_mut(top_idx) {
                if let Some(list) = inst.hooks.0.get_mut(name) {
                    for jsf in list.iter_mut() {
                        if let Some(func) = jsf.dyn_ref::<Function>() {
                            let _ = func.call0(&JsValue::UNDEFINED);
                        }
                    }
                }
                return;
            }
        }
        if let Some(list) = self.lifecycle_hooks.get_mut(name) {
            for jsf in list.iter_mut() {
                if let Some(func) = jsf.dyn_ref::<Function>() {
                    let _ = func.call0(&JsValue::UNDEFINED);
                }
            }
        }
    }

    /// 注册：卸载前（before_unmount）
    pub fn on_before_unmount(&mut self, f: JsValue) {
        self.push_hook("before_unmount", f);
    }
    /// 注册：已卸载（unmounted）
    pub fn on_unmounted(&mut self, f: JsValue) {
        self.push_hook("unmounted", f);
    }
    /// 注册：错误处理器（全局）
    pub fn on_error(&mut self, f: JsValue) {
        self.global_error_handlers.push(f);
    }

    /// 处理错误并派发到实例或全局错误处理器
    pub fn handle_error(&mut self, err: JsValue) {
        self.last_error = Some(err.clone());
        let mut handled = false;
        if let Some(ci) = self.current_instance.as_mut() {
            for h in ci.error_handlers.iter_mut() {
                if let Some(func) = h.dyn_ref::<js_sys::Function>() {
                    let _ = func.call1(&JsValue::UNDEFINED, &err);
                    handled = true;
                }
            }
            ci.error = Some(err.clone());
        }
        if !handled {
            for h in self.global_error_handlers.iter_mut() {
                if let Some(func) = h.dyn_ref::<js_sys::Function>() {
                    let _ = func.call1(&JsValue::UNDEFINED, &err);
                }
            }
        }
    }
    /// 卸载容器内容：触发钩子、清理 container_map 记录，并递归处理 mounted subtree
    pub fn unmount(&mut self, container: &mut A::Element)
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        self.call_hooks("before_unmount");
        if let Some(adapter) = self.get_dom_adapter_mut() {
            adapter.set_inner_html(container, "");
        }
        if let Some(idx) = self.find_container_index(container) {
            let taken = {
                let entry = self.container_map.get_mut(idx).unwrap();
                entry.take_mount()
            };
            if let Some(mount) = taken {
                let lifecycle = mount.into_lifecycle();
                self.invoke_before_unmount_record(&lifecycle);
                self.invoke_unmounted_record(&lifecycle);
            }
            if let Some(entry) = self.container_map.get_mut(idx) {
                entry.clear();
            }
        }
        self.compact_anchor_map();
        self.call_hooks("unmounted");
    }

    /// 按 mount lifecycle record 执行 before_unmount。
    pub(crate) fn invoke_before_unmount_record(&mut self, record: &MountLifecycleRecord) {
        match record.kind {
            MountLifecycleKind::Vapor => {
                self.invoke_mount_owned_resources(record);
            }
            MountLifecycleKind::Fragment => {
                self.invoke_mount_owned_resources(record);
                for child in record.children.iter() {
                    self.invoke_before_unmount_record(child);
                }
            }
            MountLifecycleKind::Element => {
                for child in record.children.iter() {
                    self.invoke_before_unmount_record(child);
                }
            }
            MountLifecycleKind::Component => {
                self.call_lifecycle_hooks(&record.component_before_unmount_hooks);
                if let Some(inst_index) = record.component_inst_index {
                    self.dispose_mounted_component_scopes(inst_index);
                }
                for child in record.children.iter() {
                    self.invoke_before_unmount_record(child);
                }
            }
            MountLifecycleKind::Other => {
                self.invoke_mount_owned_resources(record);
            }
        }
    }

    /// 按 mount lifecycle record 执行 unmounted。
    pub(crate) fn invoke_unmounted_record(&mut self, record: &MountLifecycleRecord) {
        match record.kind {
            MountLifecycleKind::Component => {
                for child in record.children.iter() {
                    self.invoke_unmounted_record(child);
                }
                self.call_lifecycle_hooks(&record.component_unmounted_hooks);
            }
            MountLifecycleKind::Fragment | MountLifecycleKind::Element => {
                for child in record.children.iter() {
                    self.invoke_unmounted_record(child);
                }
            }
            MountLifecycleKind::Vapor | MountLifecycleKind::Other => {}
        }
    }

    /// 挂载入口：将 app(props) 产生的默认 MountInput 渲染到容器。
    pub fn mount<F>(&mut self, _app: F, _container: &mut A::Element)
    where
        F: Fn(ComponentProps) -> MountInput<A>,
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        let props = ComponentProps::new();
        let input = _app(props);
        self.render_input(input, _container);
    }

    /// 使用插件：将安装动作入队（deferred_queue）
    pub fn use_plugin(&mut self, _plugin: JsValue, _options: Vec<JsValue>) -> &mut Self {
        let plugin = _plugin.clone();
        let options = _options.clone();
        self.deferred_queue.push(Box::new(move || {
            let install = js_sys::Reflect::get(&plugin, &JsValue::from_str("install"))
                .unwrap_or(JsValue::UNDEFINED);
            if let Some(func) = install.dyn_ref::<Function>() {
                let arr = Array::new();
                for o in options.iter() {
                    arr.push(o);
                }
                let _ = func.call2(&plugin, &JsValue::UNDEFINED, &arr.into());
            }
        }));
        self
    }

    /// 事件发射器：根据 props 中 onXxx/onxxx 找到处理器并调用
    pub fn emitted(&self, _props: &ComponentProps) -> Box<dyn FnMut(String, Vec<JsValue>)> {
        let props = _props.clone();
        Box::new(move |evt: String, args: Vec<JsValue>| {
            let lower = format!("on{}", evt.to_lowercase());
            let mut camel = String::from("on");
            for part in evt.split(|c| c == '-' || c == '_' || c == ' ') {
                if part.is_empty() {
                    continue;
                }
                let mut it = part.chars();
                if let Some(f) = it.next() {
                    camel.push_str(&f.to_uppercase().to_string());
                    let rest: String = it.collect();
                    camel.push_str(&rest);
                }
            }
            let mut names: Vec<String> = Vec::new();
            names.push(camel.clone());
            if lower != camel {
                names.push(lower.clone());
            } else {
                names.push(lower.clone());
            }
            for name in names.iter() {
                if let Some(handler) = props.get(name) {
                    if let Some(func) = handler.dyn_ref::<Function>() {
                        let arr = Array::new();
                        for a in args.iter() {
                            arr.push(a);
                        }
                        let _ = func.apply(&JsValue::UNDEFINED, &arr.into());
                    }
                }
            }
        })
    }

    /// Vapor 构建辅助：调用 setup 生成默认 MountInput。
    pub fn vapor<F>(&self, setup: F) -> MountInput<A>
    where
        F: Fn() -> A::Element,
        A::Element: Into<JsValue>,
    {
        let el = setup();
        let mut props = ComponentProps::new();
        if let Some(adapter) = self.get_dom_adapter() {
            if adapter.is_fragment(&el) {
                let nodes = adapter.collect_fragment_children(&el);
                let arr = js_sys::Array::new();
                for n in nodes.into_iter() {
                    let v: JsValue = n.into();
                    arr.push(&v);
                }
                props.insert("__fragNodes".to_string(), arr.clone().into());
                let el_js: JsValue = el.clone().into();
                let _ = js_sys::Reflect::set(
                    &el_js,
                    &JsValue::from_str("__rue_frag_nodes_ref"),
                    &arr,
                );
            }
        }
        MountInput {
            r#type: MountInputType::Vapor,
            props,
            children: vec![],
            key: None,
            mount_cleanup_bucket: None,
            mount_effect_scope_id: None,
            el_hint: Some(el),
        }
    }

    /// 注册各生命周期钩子（组件或全局）
    pub fn on_before_create(&mut self, _f: JsValue) {
        self.push_hook("before_create", _f);
    }
    pub fn on_created(&mut self, _f: JsValue) {
        self.push_hook("created", _f);
    }
    pub fn on_before_mount(&mut self, _f: JsValue) {
        self.push_hook("before_mount", _f);
    }
    pub fn on_mounted(&mut self, _f: JsValue) {
        self.push_hook("mounted", _f);
    }
    pub fn on_before_update(&mut self, _f: JsValue) {
        self.push_hook("before_update", _f);
    }
    pub fn on_updated(&mut self, _f: JsValue) {
        self.push_hook("updated", _f);
    }
}
