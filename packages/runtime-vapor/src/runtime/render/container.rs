use super::super::Rue;
use super::super::types::VNode;
#[cfg(feature = "dev")]
use crate::log::{log, want_log};
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsValue;
use wasm_bindgen::throw_str;
use crate::reactive::core::batch_scope;

// 容器渲染入口（render）：
// - 维护 container_map，将容器与其当前 vnode 绑定，支持后续增量更新
// - 首次挂载：清空容器 innerHTML 并插入真实 DOM（片段需插入子节点）
// - 后续更新：命中 container_map 时走 patch 以复用 DOM，触发生命周期钩子
// - 崩溃防护：检测运行时异常并抛出最后的钩子错误/运行时错误

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    /// 将 vnode 渲染到指定容器；支持首次挂载与后续增量更新
    ///
    /// 参数：
    /// - vnode：待渲染的虚拟节点
    /// - container：目标容器元素
    /// 行为：
    /// - 崩溃防护与钩子调用
    /// - 命中 container_map 走 patch；未命中则首次挂载并记录映射
    pub fn render(&mut self, mut vnode: VNode<A>, container: &mut A::Element)
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        #[cfg(feature = "dev")]
        {
            // 进入渲染日志（开发模式）
            if want_log("debug", "runtime:render enter") {
                log("debug", "runtime:render enter");
            }
        }
        // 运行时崩溃防护：优先抛出最后的钩子错误，其次运行时错误
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
            // 记录当前容器，并清理过期的容器映射与执行延迟队列
            self.current_container = Some(container.clone());
            self.compact_container_map();
            self.compact_anchor_map();
            if !self.deferred_queue.is_empty() {
                // 将延迟队列中的任务搬移到局部变量并执行，避免借用冲突
                let mut queue = Vec::new();
                queue.append(&mut self.deferred_queue);
                for mut f in queue.into_iter() {
                    // 逐个执行延迟的闭包任务（可能包含副作用）
                    f();
                }
            }
            // 生命周期：挂载前
            self.call_hooks("before_mount");
            if let Some(idx) = self.find_container_index(container) {
                #[cfg(feature = "dev")]
                {
                    // 命中容器映射：走增量更新
                    if want_log("debug", "runtime:render container_map hit") {
                        log("debug", &format!("runtime:render container_map hit idx={}", idx));
                    }
                }
                let taken = {
                    let entry = self.container_map.get_mut(idx).unwrap();
                    entry.1.take()
                };
                if let Some(mut old_vnode) = taken {
                    let mut parent = container.clone();
                    // 生命周期：更新前 -> patch -> 更新后
                    self.call_hooks("before_update");
                    #[cfg(feature = "dev")]
                    {
                        if want_log("debug", "runtime:render patch") {
                            log("debug", "runtime:render patch");
                        }
                    }
                    self.patch(&mut old_vnode, &mut vnode, &mut parent);
                    self.call_hooks("updated");
                } else {
                    #[cfg(feature = "dev")]
                    {
                        // 没有旧 vnode：进入初次追加路径
                        if want_log("debug", "runtime:render initial append") {
                            log("debug", "runtime:render initial append");
                        }
                    }
                    if let Some(el) = self.create_real_dom(&mut vnode) {
                        if let Some(adapter) = self.get_dom_adapter() {
                            if adapter.is_fragment(&el) {
                                // 片段：清空容器并插入片段子节点
                                if let Some(adapter2) = self.get_dom_adapter_mut() {
                                    adapter2.set_inner_html(container, "");
                                }
                                self.insert_fragment_children(container, &el, &None);
                            } else {
                                // 普通元素：直接追加到容器
                                if let Some(adapter2) = self.get_dom_adapter_mut() {
                                    adapter2.append_child(container, &el);
                                } else {
                                    // 无适配器不可继续：抛错并停止
                                    throw_str("Rue runtime: no DOM adapter for initial append");
                                }
                            }
                        } else {
                            // 无适配器不可继续：抛错并停止
                            throw_str("Rue runtime: no DOM adapter for initial append");
                        }
                    }
                }
                {
                    // 写回容器映射，记录新的 vnode
                    let entry = self.container_map.get_mut(idx).unwrap();
                    entry.1 = Some(vnode);
                }
            } else {
                #[cfg(feature = "dev")]
                {
                    // 首次挂载：容器未记录在映射中
                    if want_log("debug", "runtime:render first mount") {
                        log("debug", "runtime:render first mount");
                    }
                }
                if let Some(el) = self.create_real_dom(&mut vnode) {
                    if let Some(adapter) = self.get_dom_adapter() {
                        if adapter.is_fragment(&el) {
                            // 片段：清空容器后插入片段子节点
                            if let Some(adapter2) = self.get_dom_adapter_mut() {
                                adapter2.set_inner_html(container, "");
                            }
                            self.insert_fragment_children(container, &el, &None);
                        } else {
                            // 普通元素：清空容器并插入新元素
                            if let Some(adapter2) = self.get_dom_adapter_mut() {
                                adapter2.set_inner_html(container, "");
                                adapter2.append_child(container, &el);
                            } else {
                                // 无适配器不可继续：抛错并停止
                                throw_str("Rue runtime: no DOM adapter for first mount");
                            }
                        }
                    } else {
                        // 无适配器不可继续：抛错并停止
                        throw_str("Rue runtime: no DOM adapter for first mount");
                    }
                }
                // 记录到容器映射：后续增量更新可复用
                self.container_map.push((container.clone(), Some(vnode)));
            }
            // 生命周期：挂载完成
            self.call_hooks("mounted");
        });
        #[cfg(feature = "dev")]
        {
            if want_log("debug", "runtime:render exit") {
                log("debug", "runtime:render exit");
            }
        }
    }
}
