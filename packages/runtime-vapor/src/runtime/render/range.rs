use super::super::Rue;
use super::super::types::{MountInput, MountedState, RangeMountState};
#[cfg(feature = "dev")]
use crate::log::{log, want_log};
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsValue;
use wasm_bindgen::throw_str;
use crate::reactive::core::batch_scope;

// 区间渲染（render_between）：
// - 在父元素的 start/end 两个锚点之间渲染输入子树，适合片段/动态局部更新
// - 维护 range_map：记录每个区间的起点与当前挂载状态，便于后续命中更新
// - 顶层 Vapor/VaporWithSetup 命中时直接按 block identity 替换，不再依赖旧树对象 patch
// - Miss 时创建真实 DOM，清理区间并插入到 end 前；最后记录到 range_map

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    pub fn clear_range(
        &mut self,
        parent: &mut A::Element,
        start: A::Element,
        end: A::Element,
    ) where
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

        batch_scope(|| {
            self.current_anchor = Some(end.clone());
            self.compact_range_map();

            let mut dest_parent = self.resolve_dest_parent_for_end(parent, &end);
            if let Some(idx) = self.find_range_index(&start) {
                let taken = {
                    let entry = self.range_map.get_mut(idx).unwrap();
                    entry.end = end.clone();
                    entry.take_mount()
                };

                if let Some(old_mount) = taken {
                    self.clear_mounted_state(&mut dest_parent, old_mount);
                }
            }

            self.clear_dom_between_anchors(&mut dest_parent, &start, &end);
            self.current_anchor = None;
        });
    }

    /// 在父元素的两个锚点之间渲染 MountInput（支持增量更新）。
    ///
    /// 默认公开路径已经切到 MountInput-first；当前 render/patch 内核只在局部
    /// 边界恢复 mounted snapshot。
    pub fn render_between_input(
        &mut self,
        input: MountInput<A>,
        parent: &mut A::Element,
        start: A::Element,
        end: A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        self.render_between_impl(&input, parent, start, end);
    }

    fn render_between_impl(
        &mut self,
        input: &MountInput<A>,
        parent: &mut A::Element,
        start: A::Element,
        end: A::Element,
    ) where
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

        batch_scope(|| {
            self.current_anchor = Some(end.clone());
            self.call_hooks("before_mount");
            self.compact_range_map();
            if let Some(idx) = self.find_range_index(&start) {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "runtime:renderBetween range_map hit") {
                        log("debug", &format!("runtime:renderBetween range_map hit idx={}", idx));
                    }
                }
                self.render_between_hit(idx, input, parent, start, end);
            } else {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "runtime:renderBetween range_map miss") {
                        log("debug", "runtime:renderBetween range_map miss, creating new range");
                    }
                }
                self.render_between_miss(input, parent, start, end);
            }
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
    /// 命中区间映射后的更新流程：block 替换或常规 tree patch
    fn render_between_hit(
        &mut self,
        idx: usize,
        input: &MountInput<A>,
        parent: &mut A::Element,
        _start: A::Element,
        end: A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 取出旧挂载状态：顶层 Vapor 根走 block identity 替换，其余节点保留 tree patch
        let taken = {
            let entry = self.range_map.get_mut(idx).unwrap();
            entry.end = end.clone();
            entry.take_mount()
        };
        if let Some(old_mount) = taken {
            match old_mount {
                MountedState::Block(old_block) => {
                    let mut dest_parent = self.resolve_dest_parent_for_end(parent, &end);
                    self.clear_mounted_state(&mut dest_parent, MountedState::Block(old_block));
                    let mounted = if let Some(mounted) = self.mount_from_input(input) {
                        mounted
                    } else {
                        let err_to_handle = if let Some(e) = self.last_error.clone() {
                            e
                        } else {
                            js_sys::Error::new(
                                "Rue vapor: renderBetween failed (block hit, create_real_dom=None)",
                            )
                            .into()
                        };
                        self.handle_error(err_to_handle);
                        self.current_anchor = None;
                        return;
                    };
                    let Some(el) = mounted.host_cloned() else {
                        self.current_anchor = None;
                        return;
                    };
                    self.vapor_insert_new_range(parent, &end, &el);
                    let entry_opt = self.range_map.get_mut(idx);
                    if let Some(entry) = entry_opt {
                        entry.end = end.clone();
                        entry.store_mount(MountedState::from_subtree_root(mounted));
                    } else {
                        let err = js_sys::Error::new(
                            "Rue vapor: renderBetween range_map index out of bounds (store)",
                        )
                        .into();
                        self.handle_error(err);
                        self.current_anchor = None;
                    }
                }
                MountedState::Component(old_component) => {
                    let mut parent_clone = parent.clone();
                    let mut old_patch = old_component.into_patch_state();
                    self.call_hooks("before_update");
                    self.patch(&mut old_patch, input, &mut parent_clone);
                    self.call_hooks("updated");
                    let entry_opt = self.range_map.get_mut(idx);
                    if let Some(entry) = entry_opt {
                        entry.end = end.clone();
                        entry.store_mount(MountedState::from_subtree_root(old_patch));
                    }
                }
                MountedState::Element(old_element) => {
                    let mut parent_clone = parent.clone();
                    let mut old_patch = old_element.into_patch_state();
                    // 常规路径：更新前钩子 -> patch -> 更新后钩子，写回映射
                    self.call_hooks("before_update");
                    self.patch(&mut old_patch, input, &mut parent_clone);
                    self.call_hooks("updated");
                    let entry_opt = self.range_map.get_mut(idx);
                    if let Some(entry) = entry_opt {
                        entry.end = end.clone();
                        entry.store_mount(MountedState::from_subtree_root(old_patch));
                    }
                }
            }
        }
    }

    /// 未命中区间映射：创建真实 DOM，清理区间并插入，最后记录映射
    fn render_between_miss(
        &mut self,
        input: &MountInput<A>,
        parent: &mut A::Element,
        start: A::Element,
        end: A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        if let Some(mounted) = self.mount_from_input(input) {
            let Some(el) = mounted.host_cloned() else {
                self.current_anchor = None;
                return;
            };
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
            self.range_map.push(RangeMountState::new(
                start,
                end,
                MountedState::from_subtree_root(mounted),
            ));
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
