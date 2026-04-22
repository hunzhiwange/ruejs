use super::super::Rue;
use super::super::types::{ComponentProps, VNode};
use crate::reactive::core::{create_effect_scope, dispose_effect_scope};
use crate::reactive::signal::signal_from_proxy;
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::throw_str;

// 渲染辅助方法：
// - reset_hook_index：重置组件宿主上的 hooks 索引，确保从头执行
// - compact_container_map / compact_anchor_map / compact_range_map：清理容器/单锚点/区间映射中过期项
// - sync_props_children：将新 props 与 children 同步到只读 reactive 视图
// - find_container_index / find_anchor_index / find_range_index：在映射中定位容器、单锚点或区间
// - get_current_container：读取当前渲染容器

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    /// 为组件开启新一轮渲染作用域，并回收上一轮渲染期间创建的副作用。
    ///
    /// 这层作用域专门解决“组件函数每次重跑都再次创建 computed/useEffect/watchEffect，
    /// 但旧的一轮没有释放”导致的持续堆积问题。
    pub(crate) fn renew_component_render_scope(&mut self, inst_index: usize) -> usize {
        if let Some(inst) = self.instance_store.get_mut(&inst_index) {
            if let Some(prev_scope_id) = inst.render_scope_id.take() {
                dispose_effect_scope(prev_scope_id);
            }
            let scope_id = create_effect_scope();
            inst.render_scope_id = Some(scope_id);
            scope_id
        } else {
            create_effect_scope()
        }
    }

    /// 在组件卸载时释放最后一轮渲染作用域。
    pub(crate) fn dispose_component_render_scope(&mut self, inst_index: usize) {
        if let Some(inst) = self.instance_store.get_mut(&inst_index) {
            if let Some(scope_id) = inst.render_scope_id.take() {
                dispose_effect_scope(scope_id);
            }
        }
    }

    /// 将宿主对象上的 __hooks.index 重置为 0
    ///
    /// 参数：
    /// - host：组件宿主对象（JS 对象）
    /// 行为：
    /// - 若存在 __hooks，则把其 index 设为 0
    pub fn reset_hook_index(host: &Object) {
        let hooks = Reflect::get(host, &JsValue::from_str("__hooks")).unwrap_or(JsValue::UNDEFINED);
        if hooks.is_undefined() || hooks.is_null() {
            return;
        }
        let hooks_obj = Object::from(hooks);
        let _ = Reflect::set(&hooks_obj, &JsValue::from_str("index"), &JsValue::from_f64(0.0));
    }

    /// 清理容器映射中过期记录（预留）
    ///
    /// 说明：
    /// - 当前实现为空；可在需要时对 container_map 做一致性压缩
    pub(super) fn compact_container_map(&mut self)
    where
        <A as DomAdapter>::Element: Into<JsValue>,
    {
    }

    /// 清理单锚点映射中过期记录，并触发对应 vnode 的卸载生命周期
    pub(crate) fn compact_anchor_map(&mut self)
    where
        <A as DomAdapter>::Element: Into<JsValue>,
    {
        fn in_detached_fragment(node: &JsValue) -> bool {
            let mut cur = node.clone();
            for _ in 0..16 {
                let pn = js_sys::Reflect::get(&cur, &JsValue::from_str("parentNode"))
                    .unwrap_or(JsValue::UNDEFINED);
                if pn.is_undefined() || pn.is_null() {
                    return false;
                }
                let nt = js_sys::Reflect::get(&pn, &JsValue::from_str("nodeType"))
                    .unwrap_or(JsValue::UNDEFINED)
                    .as_f64()
                    .unwrap_or(0.0) as i32;
                if nt == 11 {
                    let has_host =
                        js_sys::Reflect::has(&pn, &JsValue::from_str("host")).unwrap_or(false);
                    return !has_host;
                }
                cur = pn;
            }
            false
        }

        fn has_detached_fragment_ancestor_by_adapter<B: DomAdapter>(
            adapter: &B,
            anchor: &B::Element,
        ) -> bool {
            let mut cur = anchor.clone();
            for _ in 0..16 {
                let parent = match adapter.get_parent_node(&cur) {
                    Some(p) => p,
                    None => return false,
                };
                if adapter.is_fragment(&parent) {
                    return true;
                }
                cur = parent;
            }
            false
        }

        let adapter_owned = self.get_dom_adapter().cloned();
        let drained = std::mem::take(&mut self.anchor_map);
        let mut kept: Vec<(A::Element, Option<VNode<A>>)> = Vec::with_capacity(drained.len());

        for (anchor, mut vnode_opt) in drained.into_iter() {
            let av: JsValue = anchor.clone().into();
            let connected = Reflect::get(&av, &JsValue::from_str("isConnected"))
                .ok()
                .and_then(|v| v.as_bool());
            let keep = match connected {
                Some(true) => true,
                Some(false) => false,
                None => {
                    if let Some(adapter) = adapter_owned.as_ref() {
                        adapter.get_parent_node(&anchor).is_some()
                            && !has_detached_fragment_ancestor_by_adapter(adapter, &anchor)
                    } else {
                        let ret = js_sys::Reflect::get(&av, &JsValue::from_str("parentNode"))
                            .unwrap_or(JsValue::UNDEFINED);
                        !ret.is_undefined() && !ret.is_null() && !in_detached_fragment(&av)
                    }
                }
            };

            if keep {
                kept.push((anchor, vnode_opt));
            } else if let Some(mut vnode) = vnode_opt.take() {
                self.invoke_before_unmount_vnode(&mut vnode);
                self.invoke_unmounted_vnode(&mut vnode);
            }
        }

        self.anchor_map = kept;
    }

    /// 清理区间映射中过期记录
    ///
    /// 为什么需要“带卸载的 compact”：
    /// - `renderBetween(start,end)` 会把 (start -> vnode) 记录到 `range_map`，用于后续命中做 patch。
    /// - 在路由切换/条件分支切换等场景里，旧的 Vapor 子树会被 DOM 删除，但：
    ///   - 旧的 `range_map` entry 可能仍残留（仅靠 `find_range_index` 可能匹配不到新的 start）。
    ///   - 若残留的 entry 没有走 `before_unmount/unmounted`，它在内部注册的响应式副作用（watchEffect 等）
    ///     就不会被清理，最终表现为“每次切换都多注册一批 effect，越来越卡”。
    ///
    /// 因此这里做两件事：
    /// 1) 判定一个 range 的 start 锚点是否仍“连接在文档中”；
    /// 2) 对已断开的 range：除了从 `range_map` 删除，还要主动触发 vnode 的卸载生命周期，
    ///    让 Vapor scope / effect cleanup 有机会运行，完成资源回收。
    ///
    /// 连接性判定策略（从强到弱）：
    /// - 优先读取 DOM 的 `node.isConnected`（最准确：直接表示该节点是否还在文档树里）。
    /// - 若无 `isConnected`（例如测试适配器的 Element 不是原生 DOM）：退化到 `DomAdapter.get_parent_node`。
    /// - 若也没有适配器：最后再反射 `parentNode` 是否存在。
    pub(super) fn compact_range_map(&mut self)
    where
        <A as DomAdapter>::Element: Into<JsValue>,
    {
        // 判定节点是否位于“未挂载的 DocumentFragment/片段树”中：
        // - 这类节点沿 parentNode 仍可向上遍历，但不属于已挂载的文档树；
        // - 需要排除 ShadowRoot（nodeType 也是 11，但它拥有 host，属于已挂载场景）。
        fn in_detached_fragment(node: &JsValue, current_anchor: Option<&JsValue>) -> bool {
            let mut cur = node.clone();
            for _ in 0..16 {
                let pn = js_sys::Reflect::get(&cur, &JsValue::from_str("parentNode"))
                    .unwrap_or(JsValue::UNDEFINED);
                if pn.is_undefined() || pn.is_null() {
                    return false;
                }
                let nt = js_sys::Reflect::get(&pn, &JsValue::from_str("nodeType"))
                    .unwrap_or(JsValue::UNDEFINED)
                    .as_f64()
                    .unwrap_or(0.0) as i32;
                if nt == 11 {
                    // ShadowRoot 的 nodeType 也是 11，但它会有 host 字段；这里不把它当作“待挂载 fragment”
                    let has_host =
                        js_sys::Reflect::has(&pn, &JsValue::from_str("host")).unwrap_or(false);
                    if has_host {
                        return false;
                    }
                    if let Some(ca) = current_anchor {
                        let mut cur2 = ca.clone();
                        for _ in 0..16 {
                            if js_sys::Object::is(&pn, &cur2) {
                                return false;
                            }
                            let up = js_sys::Reflect::get(&cur2, &JsValue::from_str("parentNode"))
                                .unwrap_or(JsValue::UNDEFINED);
                            if up.is_undefined() || up.is_null() {
                                break;
                            }
                            cur2 = up;
                        }
                    }
                    return true;
                }
                cur = pn;
            }
            false
        }

        // 通过适配器沿祖先链判定是否存在“fragment”祖先：
        // - 若存在，说明该 start 当前位于一个临时片段容器中，视为未挂载，应当被清理。
        fn has_detached_fragment_ancestor_by_adapter<B: DomAdapter>(
            adapter: &B,
            start: &B::Element,
            current_anchor: Option<&B::Element>,
        ) -> bool {
            let mut cur = start.clone();
            for _ in 0..16 {
                let parent = match adapter.get_parent_node(&cur) {
                    Some(p) => p,
                    None => return false,
                };
                if adapter.is_fragment(&parent) {
                    if let Some(ca) = current_anchor {
                        if adapter.contains(&parent, ca) {
                            return false;
                        }
                    }
                    return true;
                }
                cur = parent;
            }
            false
        }

        // 这里不能简单 `retain`：
        // - `retain` 的闭包只拿到 `&(start, vnode_opt)` 的不可变引用；
        // - 我们需要在“丢弃 entry”时把 `vnode_opt` move 出来并执行卸载钩子；
        // 所以使用 `take + for` 的方式把所有 entry 搬出来处理，再回填保留项。
        let adapter_owned = self.get_dom_adapter().cloned();
        let drained = std::mem::take(&mut self.range_map);
        let original_len = drained.len();
        let mut kept: Vec<(A::Element, Option<VNode<A>>)> = Vec::with_capacity(original_len);

        for (s, mut vnode_opt) in drained.into_iter() {
            let sv: JsValue = s.clone().into();
            // 尝试读取 `isConnected`：
            // - 浏览器 DOM 节点上该字段是 boolean；
            // - 若不是 DOM 节点（例如测试的 TestNode），Reflect::get 会返回 undefined，
            //   这时我们会走 adapter / parentNode 的降级分支。
            let connected =
                Reflect::get(&sv, &JsValue::from_str("isConnected")).ok().and_then(|v| v.as_bool());
            // keep 判定逻辑（强到弱）：
            // 1) isConnected === true：保留
            // 2) isConnected === false：丢弃
            // 3) isConnected 缺失：用适配器或 parentNode 继续判定，同时排除“未挂载的 fragment”情形
            let keep = match connected {
                Some(true) => true,
                Some(false) => false,
                None => {
                    if let Some(adapter) = adapter_owned.as_ref() {
                        let anchor_opt = self.current_anchor.as_ref();
                        adapter.get_parent_node(&s).is_some()
                            && !has_detached_fragment_ancestor_by_adapter(adapter, &s, anchor_opt)
                    } else {
                        // 无适配器时，额外通过 JS 反射判定是否处于“未挂载的 fragment”
                        let ca_js_opt = self.current_anchor.as_ref().map(|e| {
                            let j: JsValue = e.clone().into();
                            j
                        });
                        let ca_js_ref = ca_js_opt.as_ref();
                        if in_detached_fragment(&sv, ca_js_ref) {
                            false
                        } else {
                            let ret = js_sys::Reflect::get(&sv, &JsValue::from_str("parentNode"))
                                .unwrap_or(JsValue::UNDEFINED);
                            !ret.is_undefined() && !ret.is_null()
                        }
                    }
                }
            };

            if keep {
                kept.push((s, vnode_opt));
            } else {
                // 关键：丢弃 range 前必须触发卸载生命周期。
                // - 这能保证 Vapor 子树的 `before_unmount` 被调用，从而 dispose scope，
                //   清理 watchEffect/createEffect 注册的副作用；
                // - 也能让组件的 `unmounted` 正常执行，清理事件/定时器等资源。
                if let Some(mut vnode) = vnode_opt.take() {
                    // 为什么这个代码会影响切换路由后组件的生命周期无法恢复了。
                    // 说明：在丢弃过期区间前调用卸载钩子，确保 Vapor scope 与副作用得到释放，
                    // 否则切换场景中旧副作用残留会导致生命周期异常与资源泄漏。
                    self.invoke_before_unmount_vnode(&mut vnode);
                    self.invoke_unmounted_vnode(&mut vnode);
                }
            }
        }

        let _dropped = original_len.saturating_sub(kept.len());
        #[cfg(feature = "dev")]
        {
            if _dropped > 0 && crate::log::want_log("debug", "runtime:compact_range_map dropped") {
                crate::log::log(
                    "debug",
                    &format!("runtime:compact_range_map dropped={} kept={}", _dropped, kept.len()),
                );
            }
        }

        self.range_map = kept;
    }

    /// 将新 props 与 children 同步写入只读 reactive 视图（props_ro）
    ///
    /// 参数：
    /// - props_ro：只读 reactive 视图（JS proxy）
    /// - new_props/new_children：需同步的属性与子节点
    /// 行为：
    /// - 对非 children 的属性做浅比较后再写入
    /// - children 序列化为 Array，避免空写造成多余更新
    pub fn sync_props_children(
        &self,
        props_ro: &JsValue,
        new_props: &ComponentProps,
        new_children: &Vec<super::super::types::Child<A>>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        use super::super::types::Child;
        use crate::hook::reactive::shallow_equal_prop;
        let sig = match signal_from_proxy(props_ro) {
            Some(s) => s,
            None => return,
        };
        // 提取 peekPath/setPath 方法，以路径写入只读视图
        let peek = Reflect::get(&sig, &JsValue::from_str("peekPath")).unwrap_or(JsValue::UNDEFINED);
        let set = Reflect::get(&sig, &JsValue::from_str("setPath")).unwrap_or(JsValue::UNDEFINED);
        let peek_f = match peek.dyn_ref::<Function>() {
            Some(f) => f,
            None => return,
        };
        let set_f = match set.dyn_ref::<Function>() {
            Some(f) => f,
            None => return,
        };
        // 非 children 属性的浅比较与写入
        for (k, nv) in new_props.iter() {
            if k == "children" {
                // children 将在后续专门序列化与比较，跳过此处
                continue;
            }
            let path = Array::new();
            path.push(&JsValue::from_str(k));
            // 读取旧值并进行浅比较，避免无意义写入触发更新
            let ov = peek_f.call1(&sig, &path.clone().into()).unwrap_or(JsValue::UNDEFINED);
            if !shallow_equal_prop(&ov, nv) {
                let _ = set_f.call2(&sig, &path.clone().into(), &nv.clone());
            }
        }
        // 将 children 序列化为 Array，避免写入空数组的无效更新
        let ncv = Array::new();
        for c in new_children.iter() {
            match c {
                Child::Text(s) => {
                    ncv.push(&JsValue::from_str(s));
                }
                Child::Bool(b) => {
                    ncv.push(&JsValue::from_bool(*b));
                }
                Child::Null => {
                    ncv.push(&JsValue::NULL);
                }
                Child::VNode(v) => {
                    let o = self.vnode_to_dev_object(v);
                    ncv.push(&o.into());
                }
            }
        }
        let path_children = Array::new();
        path_children.push(&JsValue::from_str("children"));
        let ov_c = peek_f.call1(&sig, &path_children.clone().into()).unwrap_or(JsValue::UNDEFINED);
        let skip_empty_children_write =
            (ov_c.is_undefined() || ov_c.is_null()) && ncv.length() == 0;
        let ncv_value: JsValue = ncv.clone().into();
        // 避免空 children 写入：减少无效信号更新
        if !skip_empty_children_write && !shallow_equal_prop(&ov_c, &ncv_value) {
            let _ = set_f.call2(&sig, &path_children.clone().into(), &ncv_value);
        }
    }

    /// 在容器映射中查找与目标容器等价的记录下标
    ///
    /// 参数：
    /// - container：目标容器
    /// 返回：
    /// - Some(index) 或 None
    pub(crate) fn find_container_index(&mut self, container: &A::Element) -> Option<usize> {
        if let Some(adapter) = self.get_dom_adapter() {
            for (i, (c, _)) in self.container_map.iter().enumerate() {
                // 双向 contains 作为“等价容器”的判定准则
                if adapter.contains(c, container) && adapter.contains(container, c) {
                    return Some(i);
                }
            }
        }
        None
    }

    /// 在单锚点映射中查找与目标 anchor 等价的记录下标
    pub(super) fn find_anchor_index(&mut self, anchor: &A::Element) -> Option<usize>
    where
        <A as DomAdapter>::Element: Into<JsValue>,
    {
        if self.anchor_map.is_empty() {
            return None;
        }
        for (i, (a, _)) in self.anchor_map.iter().enumerate() {
            let av: JsValue = a.clone().into();
            let at: JsValue = anchor.clone().into();
            if js_sys::Object::is(&av, &at) {
                return Some(i);
            }
            if let Some(adapter) = self.get_dom_adapter() {
                if adapter.contains(a, anchor) && adapter.contains(anchor, a) {
                    return Some(i);
                }
            }
        }
        None
    }

    /// 在区间映射中查找以 start 为起点的记录下标
    ///
    /// 参数：
    /// - start：区间起点
    /// 返回：
    /// - Some(index) 或 None
    pub(super) fn find_range_index(&mut self, start: &A::Element) -> Option<usize>
    where
        <A as DomAdapter>::Element: Into<JsValue>,
    {
        if self.range_map.is_empty() {
            return None;
        }
        // 优先对象同一性（Object::is），其次用适配器双向 contains 判断等价
        for (i, (s, _)) in self.range_map.iter().enumerate() {
            let sv: JsValue = s.clone().into();
            let st: JsValue = start.clone().into();
            if js_sys::Object::is(&sv, &st) {
                return Some(i);
            }
            if let Some(adapter) = self.get_dom_adapter() {
                if adapter.contains(s, start) && adapter.contains(start, s) {
                    return Some(i);
                }
            }
        }
        None
    }

    /// 获取当前渲染容器（若存在）
    pub fn get_current_container(&self) -> Option<A::Element> {
        self.current_container.clone()
    }
}
