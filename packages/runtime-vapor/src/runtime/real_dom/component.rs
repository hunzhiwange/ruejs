use super::super::types::{MountInput, MountedPatchSubtree, MountedPatchSubtreeType, MountedSubtreeState};
use super::super::{ComponentInternalInstance, Rue};
use crate::hook::reactive::props_reactive_js;
use crate::reactive::core::{pop_effect_scope, push_effect_scope};
use crate::reactive::context::set_current_instance_ci;
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Function, Object, Reflect};
use wasm_bindgen::{JsCast, JsValue};

pub(crate) fn mount_component<A: DomAdapter>(
    rue: &mut Rue<A>,
    input: &MountInput<A>,
    render_fn: &JsValue,
) -> Option<MountedSubtreeState<A>>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    let props_js = rue.props_with_children_input_to_jsobject(input);
    let (_host, props_ro, idx) = prepare_instance_from_input(rue, props_js);
    let render_scope_id = rue.renew_component_render_scope(idx);
    push_effect_scope(render_scope_id);
    let func = render_fn.dyn_ref::<Function>().unwrap();
    let ret = match func.call1(&JsValue::UNDEFINED, &props_ro) {
        Ok(value) => value,
        Err(error) => {
            let _ = pop_effect_scope();
            rue.handle_error(error.clone());
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
    let _ = pop_effect_scope();

    merge_pending_hooks(rue);
    rue.call_hooks("before_create");
    rue.call_hooks("created");
    rue.call_hooks("before_mount");

    let mounted_subtree = if let Some(sub_input) = rue.compat_value_to_input(&ret) {
        rue.mount_from_input(&sub_input)
    } else if ret.is_object() {
        let error = JsValue::from_str(
            "Unsupported object returns are no longer accepted on the default component path. Return a raw node, fragment, or mount handle instead.",
        );
        rue.handle_error(error.clone());
        wasm_bindgen::throw_val(error);
    } else {
        let el: A::Element = ret.into();
        Some(MountedSubtreeState::Vapor(super::super::types::MountedVaporSubtree {
            r#type: super::super::types::MountedVaporSubtreeType::Vapor,
            host: Some(el),
            key: None,
            fragment_nodes: Vec::new(),
            cleanup_bucket: None,
            effect_scope_id: None,
        }))
    }?;

    let (before_unmount_hooks, unmounted_hooks) = if let Some(top_idx) = rue.instance_stack.last() {
        if let Some(ci) = rue.instance_store.get(top_idx) {
            (
                ci.hooks
                    .0
                    .get("before_unmount")
                    .cloned()
                    .unwrap_or_default(),
                ci.hooks.0.get("unmounted").cloned().unwrap_or_default(),
            )
        } else {
            (Vec::new(), Vec::new())
        }
    } else {
        (Vec::new(), Vec::new())
    };

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

    Some(MountedSubtreeState::Patch(MountedPatchSubtree {
        r#type: MountedPatchSubtreeType::Component(render_fn.clone()),
        props: input.props.clone(),
        children: Vec::new(),
        el: mounted_subtree.host_cloned(),
        key: input.key.clone(),
        fragment_nodes: mounted_subtree.fragment_nodes_cloned(),
        mount_cleanup_bucket: None,
        mount_effect_scope_id: None,
        component_before_unmount_hooks: before_unmount_hooks,
        component_unmounted_hooks: unmounted_hooks,
        comp_subtree: Some(Box::new(mounted_subtree)),
        comp_inst_index: Some(idx),
    }))
}

/// 挂载阶段根据 MountInput 准备组件实例。
///
/// 默认挂载主路径已经不再缓存外层 live 树对象，这里直接基于 MountInput
/// 创建 propsRO、宿主对象与实例索引，并把实例压入当前上下文。
fn prepare_instance_from_input<A: DomAdapter>(
    rue: &mut Rue<A>,
    props_js: JsValue,
) -> (Object, JsValue, usize)
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    let props_ro = props_reactive_js(props_js.clone(), Some(true));
    let host = Object::new();
    let _ = Reflect::set(&host, &JsValue::from_str("propsRO"), &props_ro);
    super::helpers::reset_hook_index(&host);

    let idx = rue.instance_store.len();
    let new_inst = ComponentInternalInstance::<A> {
        parent: None,
        is_mounted: false,
        hooks: super::super::instance::LifecycleHooks(std::collections::HashMap::new()),
        props_ro: props_ro.clone(),
        host: host.clone().into(),
        render_scope_id: None,
        error: None,
        error_handlers: Vec::new(),
        index: idx,
        _marker: std::marker::PhantomData,
    };
    rue.instance_store.insert(idx, new_inst);
    rue.instance_stack.push(idx);

    if let Some(inst_ref) = rue.instance_store.get_mut(&idx) {
        set_current_instance_ci(inst_ref);
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

