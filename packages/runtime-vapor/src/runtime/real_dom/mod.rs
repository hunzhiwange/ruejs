//! 真实 DOM 创建的入口与分发（中文增强版）
//!
//! - 按 VNode 类型分发到具体构建函数
//! - 无 DomAdapter 时走降级路径（fallback）
//! - 复用已缓存元素，避免重复创建
//! - 组件场景预计算 props（含 children）以便 JS 调用
//! - 兼容 Vapor setup 返回语义（对象/直接元素）
use super::{Rue, VNode, VNodeType};
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsValue;
mod component;
pub(crate) mod convert;
mod element;
mod fallback;
mod fragment;
pub(crate) mod helpers;
mod text;
mod vapor;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    /// 为给定 VNode 创建真实 DOM 元素
    ///
    /// - 缺少 DomAdapter 时走降级路径
    /// - 已构建元素则直接复用
    /// - 组件调用前预备 JS 侧 props
    /// - 按 VNodeType 分发到具体构建函数
    pub fn create_real_dom(&mut self, vnode: &mut VNode<A>) -> Option<A::Element>
    where
        A::Element: From<JsValue> + Into<JsValue>,
    {
        // 无适配器：委托到基于全局 document 的降级逻辑
        if self.get_dom_adapter_mut().is_none() {
            return fallback::create_real_dom_fallback(self, vnode);
        }
        // 已存在元素：复用以避免重复创建
        if let Some(ref el) = vnode.el {
            return Some(el.clone());
        }
        // 预构建组件的 props+children 对象，便于 JS 侧调用
        let pre_props_for_component = if let VNodeType::Component(_) = &vnode.r#type {
            Some(self.props_with_children_to_jsobject(&vnode))
        } else {
            None
        };
        // 按 VNode 类型分发到具体构建函数
        match &vnode.r#type {
            VNodeType::Text => text::real_dom_text(self, vnode),
            VNodeType::Fragment => fragment::real_dom_fragment(self, vnode),
            VNodeType::Vapor => vnode.el.clone(),
            VNodeType::VaporWithSetup(f) => {
                // 克隆函数句柄以满足借用规则
                let f2 = f.clone();
                vapor::real_dom_vapor_with_setup(self, vnode, &f2)
            }
            VNodeType::Component(f) => {
                // 克隆函数句柄并传入预备好的 props
                let f2 = f.clone();
                component::real_dom_component(
                    self,
                    vnode,
                    &f2,
                    pre_props_for_component.unwrap_or_default(),
                )
            }
            VNodeType::Element(tag) => {
                // 克隆标签字符串并构建元素
                let t2 = tag.clone();
                element::real_dom_element(self, vnode, &t2)
            }
            _ => None,
        }
    }
}
