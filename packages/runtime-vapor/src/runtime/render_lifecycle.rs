use super::Rue;
use super::types::{ComponentProps, VNode};
use crate::reactive::core::{batch_scope, dispose_effect_scope};
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Array, Function};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
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
    /// 卸载容器内容：触发钩子、清理 container_map 记录，并递归处理 vnode 的子树
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
                entry.1.take()
            };
            if let Some(mut vnode) = taken {
                self.invoke_before_unmount_vnode(&mut vnode);
                self.invoke_unmounted_vnode(&mut vnode);
            }
            if let Some(entry) = self.container_map.get_mut(idx) {
                entry.1 = None;
            }
        }
        self.call_hooks("unmounted");
    }

    /// 递归调用 vnode 子树的 before_unmount 钩子
    pub fn invoke_before_unmount_vnode(&mut self, v: &mut VNode<A>) {
        use super::types::Child;
        use super::types::VNodeType;
        match &v.r#type {
            VNodeType::Vapor | VNodeType::VaporWithSetup(_) => {
                // Vapor 子树的副作用清理点：
                // - Vapor 编译产物通常会在创建/渲染阶段注册 watchEffect 等副作用
                // - 路由切换/区间替换时旧 Vapor 的 DOM 会被移除，但组件本身未必销毁（或销毁不触发 JS 清理）
                // - 因此在 VNode before_unmount 时通过 scope id 一次性 dispose，避免副作用泄漏与累加
                if let Some(vv) = v.props.get("__rue_effect_scope_id") {
                    if let Some(n) = vv.as_f64() {
                        let sid = n as usize;
                        #[cfg(feature = "dev")]
                        {
                            if crate::log::want_log("debug", "runtime:vnode before_unmount vapor") {
                                crate::log::log(
                                    "debug",
                                    &format!("runtime:vnode before_unmount vapor scope={}", sid),
                                );
                            }
                        }
                        dispose_effect_scope(sid);
                    }
                }
            }
            VNodeType::Component(_) => {
                if let Some(hm) = v.comp_hooks.as_mut() {
                    if let Some(list) = hm.get_mut("before_unmount") {
                        for jsf in list.iter_mut() {
                            if let Some(func) = jsf.dyn_ref::<Function>() {
                                let _ = func.call0(&JsValue::UNDEFINED);
                            }
                        }
                    }
                }
                if let Some(sub) = v.comp_subtree.as_mut() {
                    self.invoke_before_unmount_vnode(sub);
                }
            }
            VNodeType::Fragment => {
                for c in v.children.iter_mut() {
                    if let Child::VNode(ref mut n) = c {
                        self.invoke_before_unmount_vnode(n);
                    }
                }
            }
            VNodeType::Element(_) => {
                for c in v.children.iter_mut() {
                    if let Child::VNode(ref mut n) = c {
                        self.invoke_before_unmount_vnode(n);
                    }
                }
            }
            _ => {}
        }
    }

    /// 递归调用 vnode 子树的 unmounted 钩子，并清空组件的该钩子列表
    pub fn invoke_unmounted_vnode(&mut self, v: &mut VNode<A>) {
        use super::types::Child;
        use super::types::VNodeType;
        match &v.r#type {
            VNodeType::Component(_) => {
                if let Some(sub) = v.comp_subtree.as_mut() {
                    self.invoke_unmounted_vnode(sub);
                }
                if let Some(hm) = v.comp_hooks.as_mut() {
                    if let Some(list) = hm.get_mut("unmounted") {
                        for jsf in list.iter_mut() {
                            if let Some(func) = jsf.dyn_ref::<Function>() {
                                let _ = func.call0(&JsValue::UNDEFINED);
                            }
                        }
                        list.clear();
                    }
                }
            }
            VNodeType::Fragment => {
                for c in v.children.iter_mut() {
                    if let Child::VNode(ref mut n) = c {
                        self.invoke_unmounted_vnode(n);
                    }
                }
            }
            VNodeType::Element(_) => {
                for c in v.children.iter_mut() {
                    if let Child::VNode(ref mut n) = c {
                        self.invoke_unmounted_vnode(n);
                    }
                }
            }
            _ => {}
        }
    }

    /// 挂载入口：将 app(props) 产生的 vnode 渲染到容器
    pub fn mount<F>(&mut self, _app: F, _container: &mut A::Element)
    where
        F: Fn(ComponentProps) -> VNode<A>,
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        batch_scope(|| {
            let props = ComponentProps::new();
            let vnode = _app(props);
            self.render(vnode, _container);
        });
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

    /// Vapor 构建辅助：调用 setup 生成元素并在片段场景收集子节点
    pub fn vapor<F>(&self, setup: F) -> VNode<A>
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
                props.insert("__fragNodes".to_string(), arr.into());
            }
        }
        VNode {
            r#type: super::types::VNodeType::Vapor,
            props,
            children: vec![],
            el: Some(el),
            key: None,
            comp_hooks: None,
            comp_subtree: None,
            comp_host: None,
            comp_props_ro: None,
            comp_inst_index: None,
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
