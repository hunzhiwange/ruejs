use super::super::Rue;
use super::super::types::{ContainerMountState, MountInput, MountedState};
#[cfg(feature = "dev")]
use crate::log::{log, want_log};
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsValue;
use wasm_bindgen::throw_str;
use crate::reactive::core::batch_scope;

// 容器渲染入口（render）：
// - 维护 container_map，将容器与其当前挂载状态绑定，支持后续增量更新
// - 首次挂载：清空容器 innerHTML 并插入真实 DOM（片段需插入子节点）
// - 后续更新：命中 container_map 时走 patch 以复用 DOM，触发生命周期钩子
// - 崩溃防护：检测运行时异常并抛出最后的钩子错误/运行时错误

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    pub fn clear_container(&mut self, container: &mut A::Element)
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if self.crashed || crate::runtime::is_runtime_crashed() {
            if let Some(e) = crate::runtime::last_hook_error() {
                wasm_bindgen::throw_val(e);
            } else if let Some(e) = self.last_error.clone() {
                wasm_bindgen::throw_val(e);
            } else {
                throw_str("Rue runtime crashed");
            }
        }

        if self.get_dom_adapter().is_none() || self.get_dom_adapter_mut().is_none() {
            throw_str("Rue runtime: no DOM adapter for render");
        }

        batch_scope(|| {
            self.current_container = Some(container.clone());
            self.compact_container_map();

            if let Some(idx) = self.find_container_index(container) {
                let taken = {
                    let entry = self.container_map.get_mut(idx).unwrap();
                    entry.take_mount()
                };

                if let Some(old_mount) = taken {
                    self.clear_mounted_state(container, old_mount);
                }
            }

            if let Some(adapter) = self.get_dom_adapter_mut() {
                adapter.set_inner_html(container, "");
            }
        });
    }

    /// 默认公开入口：直接渲染 MountInput。
    ///
    /// 这层让默认调用方直接沿用 MountInput-first 协议；命中更新时会把旧 mounted
    /// 边界恢复为 patch snapshot，而不是再绕回额外树对象。
    pub fn render_input(&mut self, input: MountInput<A>, container: &mut A::Element)
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        self.render_impl(&input, container);
    }

    fn render_impl(&mut self, input: &MountInput<A>, container: &mut A::Element)
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        #[cfg(feature = "dev")]
        {
            if want_log("debug", "runtime:render enter") {
                log("debug", "runtime:render enter");
            }
        }
        if self.crashed || crate::runtime::is_runtime_crashed() {
            if let Some(e) = crate::runtime::last_hook_error() {
                wasm_bindgen::throw_val(e);
            } else if let Some(e) = self.last_error.clone() {
                wasm_bindgen::throw_val(e);
            } else {
                throw_str("Rue runtime crashed");
            }
        }

        if self.get_dom_adapter().is_none() || self.get_dom_adapter_mut().is_none() {
            throw_str("Rue runtime: no DOM adapter for render");
        }

        batch_scope(|| {
            self.current_container = Some(container.clone());
            self.compact_container_map();
            self.compact_anchor_map();
            if !self.deferred_queue.is_empty() {
                let mut queue = Vec::new();
                queue.append(&mut self.deferred_queue);
                for mut f in queue.into_iter() {
                    f();
                }
            }
            self.call_hooks("before_mount");
            if let Some(idx) = self.find_container_index(container) {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "runtime:render container_map hit") {
                        log("debug", &format!("runtime:render container_map hit idx={}", idx));
                    }
                }
                let taken = {
                    let entry = self.container_map.get_mut(idx).unwrap();
                    entry.take_mount()
                };
                match taken {
                    Some(MountedState::Element(old_element)) => {
                        let mut old_patch = old_element.into_patch_state();
                        let mut parent = container.clone();
                        self.call_hooks("before_update");
                        #[cfg(feature = "dev")]
                        {
                            if want_log("debug", "runtime:render patch") {
                                log("debug", "runtime:render patch");
                            }
                        }
                        self.patch(&mut old_patch, input, &mut parent);
                        self.call_hooks("updated");
                        let entry = self.container_map.get_mut(idx).unwrap();
                        entry.store_mount(MountedState::from_subtree_root(old_patch));
                    }
                    Some(MountedState::Component(old_component)) => {
                        let mut parent = container.clone();
                        let mut old_patch = old_component.into_patch_state();
                        self.call_hooks("before_update");
                        #[cfg(feature = "dev")]
                        {
                            if want_log("debug", "runtime:render patch component boundary") {
                                log("debug", "runtime:render patch component boundary");
                            }
                        }
                        self.patch(&mut old_patch, input, &mut parent);
                        self.call_hooks("updated");
                        let entry = self.container_map.get_mut(idx).unwrap();
                        entry.store_mount(MountedState::from_subtree_root(old_patch));
                    }
                    Some(MountedState::Block(old_block)) => {
                        self.call_hooks("before_update");
                        self.clear_mounted_state(container, MountedState::Block(old_block));
                        if let Some(mounted) = self.render_container_mount(input, container) {
                            self.call_hooks("updated");
                            let entry = self.container_map.get_mut(idx).unwrap();
                            entry.store_mount(mounted);
                        }
                    }
                    None => {
                        #[cfg(feature = "dev")]
                        {
                            if want_log("debug", "runtime:render initial append") {
                                log("debug", "runtime:render initial append");
                            }
                        }
                        if let Some(mounted) = self.render_container_mount(input, container) {
                            let entry = self.container_map.get_mut(idx).unwrap();
                            entry.store_mount(mounted);
                        }
                    }
                }
            } else {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "runtime:render first mount") {
                        log("debug", "runtime:render first mount");
                    }
                }
                if let Some(mounted) = self.render_container_mount(input, container) {
                    self.container_map.push(ContainerMountState::new(container.clone(), mounted));
                }
            }
            self.call_hooks("mounted");
        });
        #[cfg(feature = "dev")]
        {
            if want_log("debug", "runtime:render exit") {
                log("debug", "runtime:render exit");
            }
        }
    }

    fn render_container_mount(
        &mut self,
        input: &MountInput<A>,
        container: &mut A::Element,
    ) -> Option<MountedState<A>>
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(mounted) = self.mount_from_input(input) {
            let Some(el) = mounted.host_cloned() else {
                return None;
            };
            let is_fragment = self
                .get_dom_adapter()
                .map(|adapter| adapter.is_fragment(&el))
                .unwrap_or(false);

            if is_fragment {
                if let Some(adapter) = self.get_dom_adapter_mut() {
                    adapter.set_inner_html(container, "");
                } else {
                    throw_str("Rue runtime: no DOM adapter for render mount");
                }
                self.insert_fragment_children(container, &el, &None);
            } else if let Some(adapter) = self.get_dom_adapter_mut() {
                adapter.set_inner_html(container, "");
                adapter.append_child(container, &el);
            } else {
                throw_str("Rue runtime: no DOM adapter for render mount");
            }

            Some(MountedState::from_subtree_root(mounted))
        } else {
            let err_to_handle = if let Some(e) = self.last_error.clone() {
                e
            } else {
                js_sys::Error::new("Rue vapor: render failed (create_real_dom=None)").into()
            };
            self.handle_error(err_to_handle);
            None
        }
    }
}
