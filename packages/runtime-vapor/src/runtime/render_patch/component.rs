use super::super::Rue;
use super::super::types::{VNode, VNodeType};
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

use crate::hook::reactive::props_reactive_js;

// 组件更新流程：
// - 准备实例：构造/复用组件内部实例（propsRO、host、hooks、inst_index），同步 props 与 children。
// - 执行组件函数：以 propsRO 调用，捕获可能的错误，将本次产生的生命周期 hooks 收集入实例。
// - 将返回值转换为子树 VNode：支持 Vapor 节点（含 fragment）与开发态对象。
// - 挂载或递归更新子树：根据是否存在旧子树决定新子树的 patch 或创建。
// - 完成更新：写回 hooks、host、propsRO；维护实例栈与当前组件上下文。

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    /// 准备或复用组件内部实例，并同步上下文
    ///
    /// 参数：
    /// - old/new：旧/新组件 VNode
    /// 返回：
    /// - (propsRO, host, inst_index)：组件执行所需的只读 props、宿主对象与实例索引
    fn comp_prepare_instance(
        &mut self,
        old: &mut VNode<A>,
        new: &mut VNode<A>,
    ) -> (JsValue, Object, usize)
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // propsRO：只读 reactive 封装；若旧实例已有则复用，否则从 new 派生
        let props_ro = old.comp_props_ro.clone().unwrap_or_else(|| {
            let props_js = self.props_with_children_to_jsobject(&new);
            props_reactive_js(props_js.clone(), Some(true))
        });
        // host 对象：挂载运行时元信息（如 propsRO、hooks 索引等）
        let host: Object = old
            .comp_host
            .clone()
            .filter(|h| h.is_object())
            .map(Object::from)
            .unwrap_or_else(Object::new);
        let _ = Reflect::set(&host, &JsValue::from_str("propsRO"), &props_ro);
        Self::reset_hook_index(&host);

        // 实例索引：优先复用旧/新上的 comp_inst_index，否则分配新的
        let idx = if let Some(i) = old.comp_inst_index.or(new.comp_inst_index) {
            i
        } else {
            let new_idx = self.instance_store.len();
            let new_inst = super::super::instance::ComponentInternalInstance::<A> {
                vnode: VNode {
                    r#type: VNodeType::<A>::Fragment,
                    props: super::super::types::ComponentProps::new(),
                    children: Vec::new(),
                    el: None,
                    key: None,
                    comp_hooks: None,
                    comp_subtree: None,
                    comp_host: None,
                    comp_props_ro: None,
                    comp_inst_index: None,
                },
                parent: None,
                is_mounted: true,
                hooks: super::super::instance::LifecycleHooks(
                    old.comp_hooks.clone().unwrap_or_default(),
                ),
                props_ro: props_ro.clone(),
                host: host.clone().into(),
                error: None,
                error_handlers: Vec::new(),
                index: new_idx,
            };
            self.instance_store.insert(new_idx, new_inst);
            new_idx
        };
        // 写回新 VNode 的实例索引，并同步实例存储中的必要字段
        new.comp_inst_index = Some(idx);
        if let Some(inst_ref) = self.instance_store.get_mut(&idx) {
            inst_ref.props_ro = props_ro.clone();
            inst_ref.host = host.clone().into();
            inst_ref.hooks =
                super::super::instance::LifecycleHooks(old.comp_hooks.clone().unwrap_or_default());
            inst_ref.is_mounted = true;
        }
        // 同步 props 与 children 的只读视图，确保组件函数拿到一致的输入
        self.sync_props_children(&props_ro, &new.props, &new.children);
        // 维护实例调用栈，设置当前组件上下文，便于 hooks 正常工作
        self.instance_stack.push(idx);
        if let Some(top_idx) = self.instance_stack.last() {
            if let Some(inst_ref) = self.instance_store.get_mut(top_idx) {
                crate::reactive::context::set_current_instance_ci(inst_ref);
            }
        }
        // 调用 before_update 钩子：组件更新开始
        self.call_hooks("before_update");
        (props_ro, host, idx)
    }

    /// 执行组件函数并收集生命周期钩子
    ///
    /// 参数：
    /// - new：新组件 VNode（提供函数入口）
    /// - props_ro：只读 props（作为调用参数）
    /// 返回：
    /// - 组件返回的 JS 值（可能是 Vapor Element 或开发态对象）
    fn comp_execute_and_collect(&mut self, new: &VNode<A>, props_ro: &JsValue) -> JsValue {
        // 将组件类型解析为 JS 函数并以 propsRO 调用；捕获错误并还原上下文
        let func = match &new.r#type {
            VNodeType::Component(f_new) => f_new.dyn_ref::<Function>().unwrap(),
            _ => unreachable!(),
        };
        let ret = match func.call1(&JsValue::UNDEFINED, props_ro) {
            Ok(v) => v,
            Err(e) => {
                self.handle_error(e.clone());
                self.instance_stack.pop();
                if let Some(top_idx) = self.instance_stack.last() {
                    if let Some(inst_ref) = self.instance_store.get_mut(top_idx) {
                        crate::reactive::context::set_current_instance_ci(inst_ref);
                    } else {
                        crate::set_current_instance(JsValue::UNDEFINED);
                    }
                } else {
                    crate::set_current_instance(JsValue::UNDEFINED);
                }
                wasm_bindgen::throw_val(e.clone());
            }
        };
        {
            // 收集本次执行过程中注册的生命周期钩子，记录到实例 hooks 映射
            let pending = crate::runtime::take_pending_hooks();
            if let Some(top_idx) = self.instance_stack.last() {
                if let Some(inst) = self.instance_store.get_mut(top_idx) {
                    for (name, f) in pending.into_iter() {
                        let list = inst.hooks.0.entry(name).or_insert_with(Vec::new);
                        list.push(f);
                    }
                }
            }
        }
        ret
    }

    /// 将组件的返回值转换成可渲染子树 VNode
    ///
    /// 参数：
    /// - ret：组件执行返回的 JS 值
    /// 返回：
    /// - 转换后的子树 VNode（可能为 Vapor/Fragment 或开发态对象），或 None
    fn comp_make_sub_from_ret(&mut self, ret: &JsValue) -> Option<VNode<A>>
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 将组件返回值转换为子树 VNode：
        // - 对象且含 vaporElement：视为 Vapor 节点；若是 fragment，占用 __fragNodes。
        // - 开发态对象：转 dev 对象表述为 VNode。
        // - 其他：直接视为 Element（Vapor）。
        if ret.is_object() {
            let robj = Object::from(ret.clone());
            let ve = Reflect::get(&robj, &JsValue::from_str("vaporElement"))
                .unwrap_or(JsValue::UNDEFINED);
            if !ve.is_undefined() && !ve.is_null() {
                let el: A::Element = ve.into();
                let mut props = super::super::types::ComponentProps::new();
                if let Some(adapter) = self.get_dom_adapter() {
                    if adapter.is_fragment(&el) {
                        let nodes = adapter.collect_fragment_children(&el);
                        let arr = Array::new();
                        for n in nodes.into_iter() {
                            let v: JsValue = n.into();
                            arr.push(&v);
                        }
                        props.insert("__fragNodes".to_string(), arr.into());
                    }
                }
                Some(VNode {
                    r#type: VNodeType::<A>::Vapor,
                    props,
                    children: vec![],
                    el: Some(el),
                    key: None,
                    comp_hooks: None,
                    comp_subtree: None,
                    comp_host: None,
                    comp_props_ro: None,
                    comp_inst_index: None,
                })
            } else {
                // 开发态对象：交由 dev_object_to_vnode 进行常规转译
                Some(self.dev_object_to_vnode(&robj))
            }
        } else {
            let el: A::Element = ret.clone().into();
            Some(VNode {
                r#type: VNodeType::<A>::Vapor,
                props: super::super::types::ComponentProps::new(),
                children: vec![],
                el: Some(el),
                key: None,
                comp_hooks: None,
                comp_subtree: None,
                comp_host: None,
                comp_props_ro: None,
                comp_inst_index: None,
            })
        }
    }

    /// 挂载或递归更新组件返回的子树
    ///
    /// 参数：
    /// - old/new：旧/新组件 VNode
    /// - parent：父元素
    /// - new_sub：新子树 VNode
    fn comp_mount_or_patch_subtree(
        &mut self,
        old: &mut VNode<A>,
        new: &mut VNode<A>,
        parent: &mut A::Element,
        mut new_sub: VNode<A>,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 若存在旧子树，递归 patch；否则创建并插入新子树到目标父节点（考虑锚点与片段父亲）
        if let Some(old_sub) = old.comp_subtree.as_deref_mut() {
            self.patch(old_sub, &mut new_sub, parent);
        } else if let Some(el_new) = self.create_real_dom(&mut new_sub) {
            new_sub.el = Some(el_new.clone());
            let anchor_opt = self.current_anchor.clone();
            if let Some(a) = self.get_dom_adapter_mut() {
                let mut dest_parent = parent.clone();
                if let Some(anchor) = anchor_opt.clone() {
                    // 若父为片段或锚点不在父内，则需要解析真实父节点
                    if a.is_fragment(&dest_parent) || !a.contains(&dest_parent, &anchor) {
                        let pn = js_sys::Reflect::get(
                            &anchor.clone().into(),
                            &JsValue::from_str("parentNode"),
                        )
                        .unwrap_or(JsValue::UNDEFINED);
                        if !pn.is_undefined() && !pn.is_null() {
                            dest_parent = pn.into();
                        }
                    }
                }
                // 如果旧节点记录了片段子节点（__fragNodes），需先清理
                if let Some(jsv) = old.props.get("__fragNodes") {
                    let arr = js_sys::Array::from(jsv);
                    let len = arr.length();
                    if len > 0 {
                        for i in 0..len {
                            let v = arr.get(i);
                            let node_el: A::Element = v.into();
                            if a.contains(&dest_parent, &node_el) {
                                let mut p2 = dest_parent.clone();
                                a.remove_child(&mut p2, &node_el);
                            }
                        }
                    }
                }
                // 若旧 el 仍存在于父节点：移除以避免重复
                if let Some(ref el_old) = old.el {
                    if a.contains(&dest_parent, el_old) {
                        let mut p2 = dest_parent.clone();
                        a.remove_child(&mut p2, el_old);
                    }
                }
                // 依据锚点插入新子树的根节点，保证相对次序不变
                if let Some(anchor) = anchor_opt {
                    if a.contains(&dest_parent, &anchor) {
                        a.insert_before(&mut dest_parent, &el_new, &anchor);
                    } else {
                        a.append_child(&mut dest_parent, &el_new);
                    }
                } else {
                    a.append_child(&mut dest_parent, &el_new);
                }
            }
        }
        // 写回新子树引用与 el，供后续递归与生命周期使用
        new.el = new_sub.el.clone();
        new.comp_subtree = Some(Box::new(new_sub));
    }

    /// 完成一次组件更新：写回 hooks/host/propsRO 并维护调用栈与上下文
    ///
    /// 参数：
    /// - new：新组件 VNode
    /// - host：组件宿主对象
    /// - props_ro：只读 props
    fn comp_finalize(&mut self, new: &mut VNode<A>, host: &Object, props_ro: &JsValue) {
        // 将本次执行过程收集的 hooks 写回到新 VNode，维持生命周期一致性
        if let Some(top_idx) = self.instance_stack.last() {
            if let Some(ci) = self.instance_store.get(top_idx) {
                new.comp_hooks = Some(ci.hooks.0.clone());
            } else {
                new.comp_hooks = new.comp_hooks.clone();
            }
        }
        // 写回 host 与 propsRO 引用，触发 updated 钩子，并维护实例栈/上下文
        new.comp_host = Some(host.clone().into());
        new.comp_props_ro = Some(props_ro.clone());
        self.call_hooks("updated");
        self.instance_stack.pop();
        if let Some(top_idx) = self.instance_stack.last() {
            if let Some(inst_ref) = self.instance_store.get_mut(top_idx) {
                crate::reactive::context::set_current_instance_ci(inst_ref);
            } else {
                crate::set_current_instance(JsValue::UNDEFINED);
            }
        } else {
            crate::set_current_instance(JsValue::UNDEFINED);
        }
    }

    /// 同类型组件的增量更新主流程
    ///
    /// 参数：
    /// - old/new：旧/新组件 VNode
    /// - parent：父元素
    /// 行为：
    /// - 准备实例、执行组件函数并生成子树
    /// - 递归更新或挂载子树，最后完成更新
    pub(super) fn patch_component_same(
        &mut self,
        old: &mut VNode<A>,
        new: &mut VNode<A>,
        parent: &mut A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 组件更新主流程：准备实例 -> 执行组件函数 -> 生成新子树 -> 挂载/更新 -> 完成
        let (props_ro, host, _idx) = self.comp_prepare_instance(old, new);
        let ret = self.comp_execute_and_collect(new, &props_ro);
        let new_sub_opt = self.comp_make_sub_from_ret(&ret);
        if let Some(new_sub) = new_sub_opt {
            self.comp_mount_or_patch_subtree(old, new, parent, new_sub);
        } else {
            // 若组件返回为空：复用旧的 el 与子树（保持静默更新）
            new.el = old.el.clone();
            new.comp_subtree = old.comp_subtree.clone();
        }
        self.comp_finalize(new, &host, &props_ro);
    }
}
