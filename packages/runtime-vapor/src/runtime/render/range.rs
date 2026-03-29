use super::super::Rue;
use super::super::types::VNode;
#[cfg(feature = "dev")]
use crate::log::{log, want_log};
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::throw_str;
use crate::reactive::core::batch_scope;

// 区间渲染（render_between）：
// - 在父元素的 start/end 两个锚点之间渲染 vnode，适合片段/动态局部更新
// - 维护 range_map：记录每个区间的起点与当前 vnode，便于后续增量更新
// - Vapor 命中时采用“清理旧区间 + 原子插入新范围”的快速路径
// - Miss 时创建真实 DOM，清理区间并插入到 end 前；最后记录到 range_map

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    /// 在父元素的两个锚点之间渲染 vnode（支持增量更新）
    ///
    /// 参数：
    /// - vnode：待渲染的虚拟节点
    /// - parent：父元素
    /// - start/end：区间起止锚点
    /// 行为：
    /// - 命中 range_map 走命中路径；未命中则创建并插入后记录
    pub fn render_between(
        &mut self,
        mut vnode: VNode<A>,
        parent: &mut A::Element,
        start: A::Element,
        end: A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 崩溃防护：与容器渲染一致，优先抛出钩子或运行时错误
        if self.crashed || crate::runtime::is_runtime_crashed() {
            if let Some(e) = crate::runtime::last_hook_error() {
                wasm_bindgen::throw_val(e);
            } else if let Some(e) = self.last_error.clone() {
                wasm_bindgen::throw_val(e);
            } else {
                throw_str("Rue runtime crashed");
            }
        }

        batch_scope(|| {
            // 设置当前锚点为 end，以便后续插入遵循 end 前规则
            self.current_anchor = Some(end.clone());
            // 生命周期：挂载前，清理过期区间映射后尝试命中
            self.call_hooks("before_mount");
            self.compact_range_map();
            if let Some(idx) = self.find_range_index(&start) {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "runtime:renderBetween range_map hit") {
                        log("debug", &format!("runtime:renderBetween range_map hit idx={}", idx));
                    }
                }
                // 命中：根据旧类型选择 Vapor 快速路径或常规 patch
                self.render_between_hit(idx, vnode, parent, start, end);
            } else {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "runtime:renderBetween range_map miss") {
                        log("debug", "runtime:renderBetween range_map miss, creating new range");
                    }
                }
                // 未命中：创建真实 DOM 并插入到 end 前，同时记录映射
                self.render_between_miss(vnode, parent, start, end);
            }
            // 生命周期：挂载完成；清理当前锚点
            self.call_hooks("mounted");
            self.current_anchor = None;
        });
        #[cfg(feature = "dev")]
        {
            if want_log("debug", "runtime:renderBetween end") {
                log("debug", "runtime:renderBetween end");
            }
        }
    }

    /// 命中区间映射后的更新流程：Vapor 快速路径或常规 patch
    fn render_between_hit(
        &mut self,
        idx: usize,
        mut vnode: VNode<A>,
        parent: &mut A::Element,
        start: A::Element,
        end: A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 取出旧 vnode，判断是否 Vapor -> Vapor 的快速替换路径
        let taken = {
            let entry = self.range_map.get_mut(idx).unwrap();
            entry.1.take()
        };
        if let Some(mut old_vnode) = taken {
            let mut parent_clone = parent.clone();
            let vapor_to_vapor = matches!(
                (&old_vnode.r#type, &vnode.r#type),
                (super::super::types::VNodeType::Vapor, super::super::types::VNodeType::Vapor)
                    | (
                        super::super::types::VNodeType::VaporWithSetup(_),
                        super::super::types::VNodeType::VaporWithSetup(_)
                    )
            );
            if vapor_to_vapor {
                // Vapor 快速路径：卸载前钩子 -> 清理旧范围 -> 插入新范围
                self.invoke_before_unmount_vnode(&mut old_vnode);
                {
                    let mut dest_parent = self.resolve_dest_parent_for_end(parent, &end);
                    if let Some(adapter) = self.get_dom_adapter() {
                        if adapter.contains(&dest_parent, &start)
                            && adapter.contains(&dest_parent, &end)
                        {
                            self.clear_dom_between_anchors(&mut dest_parent, &start, &end);
                        } else {
                            let _ = self.vapor_clear_old_range(parent, &end, &mut old_vnode);
                        }
                    } else {
                        let _ = self.vapor_clear_old_range(parent, &end, &mut old_vnode);
                    }
                }
                self.invoke_unmounted_vnode(&mut old_vnode);
                let el = if let Some(el) = self.create_real_dom(&mut vnode) {
                    el
                } else {
                    // 出错：构造错误并交由运行时处理，随后退出
                    let err_to_handle = if let Some(e) = self.last_error.clone() {
                        e
                    } else {
                        js_sys::Error::new(
                            "Rue vapor: renderBetween failed (vapor hit, create_real_dom=None)",
                        )
                        .into()
                    };
                    self.handle_error(err_to_handle);
                    self.current_anchor = None;
                    return;
                };
                // 将新范围插入到 end 前，并写回 range_map
                self.vapor_insert_new_range(parent, &end, &el);
                {
                    let entry_opt = self.range_map.get_mut(idx);
                    if let Some(entry) = entry_opt {
                        entry.1 = Some(vnode);
                    } else {
                        let err = js_sys::Error::new(
                            "Rue vapor: renderBetween range_map index out of bounds (store)",
                        )
                        .into();
                        self.handle_error(err);
                        self.current_anchor = None;
                        return;
                    }
                }
            } else {
                // 常规路径：更新前钩子 -> patch -> 更新后钩子，写回映射
                self.call_hooks("before_update");
                self.patch(&mut old_vnode, &mut vnode, &mut parent_clone);
                self.call_hooks("updated");
                {
                    let entry_opt = self.range_map.get_mut(idx);
                    if let Some(entry) = entry_opt {
                        entry.1 = Some(vnode);
                    }
                }
            }
        }
    }

    /// 未命中区间映射：创建真实 DOM，清理区间并插入，最后记录映射
    fn render_between_miss(
        &mut self,
        mut vnode: VNode<A>,
        parent: &mut A::Element,
        start: A::Element,
        end: A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(el) = self.create_real_dom(&mut vnode) {
            #[cfg(feature = "dev")]
            {
                if want_log("debug", "runtime:renderBetween create_real_dom ok") {
                    let mut tag = String::new();
                    if let Some(adapter) = self.get_dom_adapter() {
                        tag = adapter.get_tag_name(&el);
                    }
                    log("debug", &format!("runtime:renderBetween create_real_dom el_tag={}", tag));
                }
            }
            // 解析 end 的真实父元素；若已有其他范围，先清理 start 到 end 的 DOM
            let mut dest_parent = self.resolve_dest_parent_for_end(parent, &end);
            // 清理 start 与 end 之间的所有兄弟节点（不包含起止锚点）
            self.clear_dom_between_anchors(&mut dest_parent, &start, &end);
            // 插入：片段走子节点插入，普通元素直接在 end 前插入
            if let Some(adapter) = self.get_dom_adapter() {
                if adapter.is_fragment(&el) {
                    self.insert_fragment_children_preferring_end(
                        &mut dest_parent,
                        &el,
                        &Some(end.clone()),
                    );
                } else {
                    self.insert_new_dom_before_end(&mut dest_parent, &el, &end);
                }
            } else {
                // 无适配器：直接采用备用插入逻辑
                self.insert_new_dom_before_end(&mut dest_parent, &el, &end);
            }
        } else {
            // 创建失败：构造错误并交由运行时处理，随后退出
            let err_to_handle = if let Some(e) = self.last_error.clone() {
                e
            } else {
                js_sys::Error::new(
                    "Rue vapor: renderBetween failed (range miss, create_real_dom=None)",
                )
                .into()
            };
            self.handle_error(err_to_handle);
            self.current_anchor = None;
            return;
        }
        // 记录到 range_map，供后续增量更新复用
        self.range_map.push((start, Some(vnode)));
        #[cfg(feature = "dev")]
        {
            if want_log("debug", "runtime:renderBetween push range") {
                log(
                    "debug",
                    &format!("runtime:renderBetween push range new_len={}", self.range_map.len()),
                );
            }
        }
    }
}
