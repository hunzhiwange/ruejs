use super::super::{Rue, VNode};
use crate::reactive::core::{create_effect_scope, pop_effect_scope, push_effect_scope};
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::{JsCast, JsValue};

impl<A: DomAdapter> Rue<A>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    /// 解析 setup 返回对象：提取其中的 `vaporElement`（若存在）
    pub(super) fn parse_vapor_with_setup_return(&self, ret: &JsValue) -> Option<A::Element> {
        if ret.is_object() {
            let obj = Object::from(ret.clone());
            let ve = Reflect::get(&obj, &JsValue::from_str("vaporElement"))
                .unwrap_or(JsValue::UNDEFINED);
            if !ve.is_undefined() && !ve.is_null() {
                let el: A::Element = ve.into();
                return Some(el);
            }
        }
        None
    }

    /// 非对象返回时：直接将 setup 返回值强制转换为元素类型
    pub(super) fn coerce_setup_return_to_element(&self, ret: &JsValue) -> A::Element {
        ret.clone().into()
    }

    /// 当元素为片段时：填充 `__fragNodes`（片段的真实子节点）
    pub(super) fn set_vnode_fragment_nodes(&mut self, vnode: &mut VNode<A>, el: &A::Element) {
        if let Some(a) = self.get_dom_adapter() {
            if a.is_fragment(el) {
                let list = a.collect_fragment_children(el);
                let js_arr = js_sys::Array::new();
                for item in list.into_iter() {
                    let v: JsValue = item.into();
                    js_arr.push(&v);
                }
                vnode.props.insert("__fragNodes".to_string(), js_arr.into());
            }
        }
    }
}

/// 构建 Vapor 元素（可选 setup 函数）
///
/// 若提供 setup：调用并支持两种返回形式（{ vaporElement } 对象/直接元素）。
/// 将元素缓存到 VNode，并在元素为片段时收集子节点。
pub(crate) fn real_dom_vapor_with_setup<A: DomAdapter>(
    rue: &mut Rue<A>,
    vnode: &mut VNode<A>,
    f: &JsValue,
) -> Option<A::Element>
where
    A::Element: From<JsValue> + Into<JsValue> + Clone,
{
    // 若已有缓存元素则直接返回，避免重复创建
    if let Some(ref el_existing) = vnode.el {
        return Some(el_existing.clone());
    }
    // 若传入的是函数，调用 setup（无参）
    if let Some(func) = f.dyn_ref::<Function>() {
        // 复用或创建 scope：
        // - 首次在 JS bridge 的 vapor() 中会写入 __rue_effect_scope_id
        // - 但某些路径下（例如直接构造 VNodeType::VaporWithSetup 或旧产物）可能缺失该字段，因此这里兜底创建
        //
        // 重要：同一个 VNode 的多次 setup 调用必须复用同一个 scope id，
        // 否则卸载时 dispose 的 scope 与实际注册 effect 的 scope 不一致，会导致清理失败。
        let scope_id = vnode
            .props
            .get("__rue_effect_scope_id")
            .and_then(|v| v.as_f64().map(|n| n as usize))
            .unwrap_or_else(|| {
                let id = create_effect_scope();
                vnode
                    .props
                    .insert("__rue_effect_scope_id".to_string(), JsValue::from_f64(id as f64));
                id
            });
        // setup 执行期间将 scope 压栈，使内部创建的 watchEffect/createEffect 自动归属该 scope。
        push_effect_scope(scope_id);
        let ret = func.call0(&JsValue::UNDEFINED);
        pop_effect_scope();
        match ret {
            Ok(ret) => {
                // 优先处理带 vaporElement 的对象返回
                if let Some(el) = rue.parse_vapor_with_setup_return(&ret) {
                    vnode.el = Some(el.clone());
                    rue.set_vnode_fragment_nodes(vnode, &el);
                    return Some(el);
                }
                // 退化：将返回值直接视为元素
                let el: A::Element = rue.coerce_setup_return_to_element(&ret);
                vnode.el = Some(el.clone());
                rue.set_vnode_fragment_nodes(vnode, &el);
                return Some(el);
            }
            Err(e) => {
                rue.handle_error(e.clone());
                wasm_bindgen::throw_val(e.clone());
            }
        }
    }
    // 降级：若存在适配器则创建一个 div；否则记录错误
    if let Some(a) = rue.get_dom_adapter_mut() {
        let el = a.create_element("div");
        vnode.el = Some(el.clone());
        return Some(el);
    } else {
        rue.handle_error(JsValue::from_str(
            "runtime:create_real_dom VaporWithSetup fallback no adapter",
        ));
    }
    vnode.el.clone()
}
