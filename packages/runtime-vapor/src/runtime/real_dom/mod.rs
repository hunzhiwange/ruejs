//! 真实 DOM 创建的入口与分发（中文增强版）
//!
//! - 按 MountInputType 分发到具体构建函数
//! - 无 DomAdapter 时走降级路径（fallback）
//! - 复用已缓存元素，避免重复创建
//! - 组件场景预计算 props（含 children）以便 JS 调用
//! - 兼容 Vapor setup 返回语义（对象/直接元素）
use super::types::{MountInput, MountInputType, MountedSubtreeState};
use super::Rue;
use crate::runtime::dom_adapter::DomAdapter;
use wasm_bindgen::JsValue;
mod component;
pub(crate) mod convert;
mod element;
mod fragment;
pub(crate) mod helpers;
mod text;
mod vapor;

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    pub fn mount_from_input(&mut self, input: &MountInput<A>) -> Option<MountedSubtreeState<A>>
    where
        A::Element: From<JsValue> + Into<JsValue>,
    {
        if self.get_dom_adapter_mut().is_none() {
            return None;
        }

        match &input.r#type {
            MountInputType::Text(_) => text::mount_text(self, input),
            MountInputType::Fragment => fragment::mount_fragment(self, input),
            MountInputType::Vapor => vapor::mount_vapor(self, input),
            MountInputType::VaporWithSetup(setup) => vapor::mount_vapor_with_setup(self, input, setup),
            MountInputType::Component(render_fn) => {
                component::mount_component(self, input, render_fn)
            }
            MountInputType::Element(tag) => element::mount_element(self, input, tag),
            MountInputType::_Phantom(_) => None,
        }
    }
}
