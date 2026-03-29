use super::super::{ComponentInternalInstance, Rue, VNode, VNodeType};
use crate::hook::reactive::props_reactive_js;
use crate::reactive::context::set_current_instance_ci;
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Function, Object, Reflect};
use wasm_bindgen::{JsCast, JsValue};

/// 准备组件实例栈与响应式 props
///
/// 返回 (host, propsRO, index)。如果不存在实例则创建并入库；
/// 将当前实例设置为活跃，以保证后续 hooks 在正确上下文执行。
fn prepare_instance<A: DomAdapter>(
    rue: &mut Rue<A>,
    vnode: &mut VNode<A>,
    props_js: JsValue,
) -> (Object, JsValue, usize)
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    // 读取或构建只读响应式 props：组件多次渲染时复用，避免重复构建
    let props_ro = vnode
        .comp_props_ro
        .clone()
        .unwrap_or_else(|| props_reactive_js(props_js.clone(), Some(true)));
    // 读取或创建组件宿主对象：用于存放 hooks 状态等运行期数据
    let host: Object = vnode
        .comp_host
        .clone()
        .filter(|h| h.is_object())
        .map(Object::from)
        .unwrap_or_else(Object::new);
    // 将 propsRO 注入宿主，供组件函数与 hooks 访问
    let _ = Reflect::set(&host, &JsValue::from_str("propsRO"), &props_ro);
    // 重置 hooks 调用索引，确保本次渲染从 0 开始
    super::helpers::reset_hook_index(&host);
    // 回写 vnode 的宿主与只读 props，便于后续复用
    vnode.comp_host = Some(host.clone().into());
    vnode.comp_props_ro = Some(props_ro.clone());
    // 计算实例 index：优先复用已有索引，否则创建新实例并入仓
    let idx = if let Some(i) = vnode.comp_inst_index {
        i
    } else {
        // 新建实例：初始化挂载标记与 hooks 容器
        let new_idx = rue.instance_store.len();
        let new_inst = ComponentInternalInstance::<A> {
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
            is_mounted: false,
            hooks: super::super::instance::LifecycleHooks(std::collections::HashMap::new()),
            props_ro: props_ro.clone(),
            host: host.clone().into(),
            error: None,
            error_handlers: Vec::new(),
            index: new_idx,
        };
        // 将实例放入实例仓库，记录索引
        rue.instance_store.insert(new_idx, new_inst);
        new_idx
    };
    // 将索引写回 vnode，便于后续获取同一实例
    vnode.comp_inst_index = Some(idx);
    // 对应索引的实例入栈，表示当前渲染上下文
    if let Some(inst_ref) = rue.instance_store.get_mut(&idx) {
        inst_ref.props_ro = props_ro.clone();
        inst_ref.host = host.clone().into();
        inst_ref.is_mounted = false;
    }
    // 将实例索引压入实例栈，用于嵌套组件场景的上下文管理
    rue.instance_stack.push(idx);
    // 将当前实例设置到全局上下文，确保 hooks 能拿到正确的组件实例
    if let Some(top_idx) = rue.instance_stack.last() {
        if let Some(inst_ref) = rue.instance_store.get_mut(top_idx) {
            set_current_instance_ci(inst_ref);
        }
    }
    (host, props_ro, idx)
}

/// 合并挂起的生命周期 hooks 到当前实例
fn merge_pending_hooks<A: DomAdapter>(rue: &mut Rue<A>) {
    // 读取全局挂起的 hooks 列表（由 runtime 收集）
    let pending = crate::runtime::take_pending_hooks();
    for (name, f) in pending.into_iter() {
        // 优先写入当前实例；若没有显式 current_instance，则写入栈顶实例
        if let Some(ci) = rue.current_instance.as_mut() {
            let list = ci.hooks.0.entry(name.clone()).or_insert_with(Vec::new);
            list.push(f.clone());
        } else if let Some(top_idx) = rue.instance_stack.last() {
            if let Some(inst) = rue.instance_store.get_mut(top_idx) {
                let list = inst.hooks.0.entry(name.clone()).or_insert_with(Vec::new);
                list.push(f.clone());
            }
        }
    }
}

/// 完成挂载：缓存元素、标记实例已挂载、快照 hooks，并恢复上下文
fn finalize_mount<A: DomAdapter>(
    rue: &mut Rue<A>,
    vnode: &mut VNode<A>,
    el: A::Element,
) -> Option<A::Element>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    // 将生成的元素缓存到 vnode，避免重复创建
    vnode.el = Some(el.clone());
    // 将栈顶实例标记为已挂载
    if let Some(top_idx) = rue.instance_stack.last() {
        if let Some(ci) = rue.instance_store.get_mut(top_idx) {
            ci.is_mounted = true;
        }
    }
    // 捕获当前实例的 hooks 快照，保存在 vnode 上
    if let Some(top_idx) = rue.instance_stack.last() {
        if let Some(ci) = rue.instance_store.get(top_idx) {
            vnode.comp_hooks = Some(ci.hooks.0.clone());
        }
    }
    // 触发 mounted 生命周期，随后将实例弹栈
    rue.call_hooks("mounted");
    rue.instance_stack.pop();
    // 恢复当前实例上下文：若有上层实例则设置，否则清空
    if let Some(top_idx) = rue.instance_stack.last() {
        if let Some(inst_ref) = rue.instance_store.get_mut(top_idx) {
            set_current_instance_ci(inst_ref);
        } else {
            crate::set_current_instance(JsValue::UNDEFINED);
        }
    } else {
        crate::set_current_instance(JsValue::UNDEFINED);
    }
    Some(el)
}

/// 通过组件函数执行创建真实 DOM
///
/// 完成实例准备，使用 propsRO 调用组件函数，依次触发生命周期，
/// 并根据返回值（元素或开发态对象）执行挂载或子树渲染。
pub(crate) fn real_dom_component<A: DomAdapter>(
    rue: &mut Rue<A>,
    vnode: &mut VNode<A>,
    f: &JsValue,
    props_js: JsValue,
) -> Option<A::Element>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    // 1) 组件实例准备（宿主、只读 props、实例栈/上下文）
    let (_host, props_ro, _idx) = prepare_instance(rue, vnode, props_js.clone());
    // 2) 调用组件函数：传入只读 propsRO，获取返回值
    let func = f.dyn_ref::<Function>().unwrap();
    let ret = match func.call1(&JsValue::UNDEFINED, &props_ro) {
        Ok(v) => v,
        Err(e) => {
            // 组件执行报错：记录错误并弹栈恢复上下文
            rue.handle_error(e.clone());
            rue.instance_stack.pop();
            if let Some(top_idx) = rue.instance_stack.last() {
                if let Some(inst_ref) = rue.instance_store.get_mut(top_idx) {
                    set_current_instance_ci(inst_ref);
                } else {
                    crate::set_current_instance(JsValue::UNDEFINED);
                }
            } else {
                crate::set_current_instance(JsValue::UNDEFINED);
            }
            return None;
        }
    };
    // 3) 合并挂起的 hooks 并触发生命周期（before_create/created/before_mount）
    merge_pending_hooks(rue);
    rue.call_hooks("before_create");
    rue.call_hooks("created");
    rue.call_hooks("before_mount");
    // 4) 解释返回值：优先识别 { vaporElement }；否则可能是元素或开发态对象
    let mut sub_vnode_opt: Option<VNode<A>> = None;
    if ret.is_object() {
        let robj = Object::from(ret.clone());
        let ve =
            Reflect::get(&robj, &JsValue::from_str("vaporElement")).unwrap_or(JsValue::UNDEFINED);
        if !ve.is_undefined() && !ve.is_null() {
            // 返回直接元素：完成挂载与上下文恢复
            let el: A::Element = ve.into();
            return finalize_mount(rue, vnode, el);
        } else {
            // 返回开发态对象：转换为 VNode 以便继续渲染
            sub_vnode_opt = Some(rue.dev_object_to_vnode(&robj));
        }
    }
    // 若不为对象，则视为直接元素返回
    if sub_vnode_opt.is_none() {
        let el: A::Element = ret.into();
        return finalize_mount(rue, vnode, el);
    }
    // 5) 渲染子树：create_real_dom 子 VNode，记录到 comp_subtree 并缓存元素
    let mut sub_vnode = sub_vnode_opt.unwrap();
    let el = rue.create_real_dom(&mut sub_vnode);
    vnode.comp_subtree = Some(Box::new(sub_vnode));
    vnode.el = el.clone();
    // 6) 标记已挂载并快照 hooks
    if let Some(top_idx) = rue.instance_stack.last() {
        if let Some(ci) = rue.instance_store.get_mut(top_idx) {
            ci.is_mounted = true;
        }
    }
    if let Some(top_idx) = rue.instance_stack.last() {
        if let Some(ci) = rue.instance_store.get(top_idx) {
            vnode.comp_hooks = Some(ci.hooks.0.clone());
        }
    }
    // 7) 触发 mounted 并恢复上下文
    rue.call_hooks("mounted");
    rue.instance_stack.pop();
    if let Some(top_idx) = rue.instance_stack.last() {
        if let Some(inst_ref) = rue.instance_store.get_mut(top_idx) {
            set_current_instance_ci(inst_ref);
        } else {
            crate::set_current_instance(JsValue::UNDEFINED);
        }
    } else {
        crate::set_current_instance(JsValue::UNDEFINED);
    }
    el
}
