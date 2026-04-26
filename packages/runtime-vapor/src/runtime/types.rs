/*
运行时输入与 compat 类型体系
---------------------------
默认主路径现在围绕 MountInput 组织：
- MountInputType：默认挂载协议的节点语义（文本、片段、元素、组件、Vapor）
- MountInput：默认调度/挂载/bridge 运输的数据货币
- MountInputChild：默认 children 形状，文本直接保留为文本，不再要求先包装成额外树节点

types.rs 现在只保留默认挂载协议、mounted snapshot 与生命周期记录；
默认运行时不再把历史树对象契约当作并列数据货币。

关键点：
- el_hint: MountInput 可携带宿主提示节点，供 Vapor/host-node bridge 直接复用
- key: 仍用于 keyed 更新稳定性判断
- FRAGMENT 常量：JS 桥接时用于识别片段构造
*/
use crate::runtime::dom_adapter::DomAdapter;
use js_sys::{Array, Object, Reflect};
use std::collections::HashMap;
use std::marker::PhantomData;
use wasm_bindgen::JsValue;

pub type ComponentProps = HashMap<String, JsValue>;
pub type PropsWithChildren = ComponentProps;

#[derive(Clone)]
pub enum MountInputType<A: DomAdapter> {
    Text(String),
    Fragment,
    Vapor,
    VaporWithSetup(JsValue),
    Element(String),
    Component(JsValue),
    _Phantom(PhantomData<A>),
}

#[derive(Clone)]
pub enum MountInputChild<A: DomAdapter> {
    Input(MountInput<A>),
    Text(String),
}

#[derive(Clone)]
pub struct MountInput<A: DomAdapter> {
    pub r#type: MountInputType<A>,
    pub props: ComponentProps,
    pub children: Vec<MountInputChild<A>>,
    pub key: Option<String>,
    pub mount_cleanup_bucket: Option<JsValue>,
    pub mount_effect_scope_id: Option<usize>,
    pub el_hint: Option<A::Element>,
}

#[derive(Clone)]
pub enum MountLifecycleKind {
    Other,
    Vapor,
    Fragment,
    Element,
    Component,
}

/// 挂载生命周期记录。
///
/// 这一层把“卸载时需要执行什么”从历史树对象结构中抽出来：
/// - Vapor/Fragment 的 cleanup bucket 与 effect scope
/// - Component 的 before_unmount/unmounted hooks 与实例 scope
/// - 子级的卸载顺序
///
/// 这样卸载路径不必再递归读取旧树对象的 props/comp_subtree，就能完成 cleanup 与生命周期派发。
#[derive(Clone)]
pub struct MountLifecycleRecord {
    pub kind: MountLifecycleKind,
    pub cleanup_bucket: Option<JsValue>,
    pub effect_scope_id: Option<usize>,
    pub component_before_unmount_hooks: Vec<JsValue>,
    pub component_unmounted_hooks: Vec<JsValue>,
    pub component_inst_index: Option<usize>,
    pub children: Vec<MountLifecycleRecord>,
}

/// 顶层块级挂载状态。
///
/// 这类状态用于“命中更新时不必保留完整旧树”的节点，当前覆盖
/// Text/Fragment/Vapor/VaporWithSetup：
/// - `host` 保存单宿主节点身份
/// - `fragment_nodes` 保存片段形式插入的真实子节点身份
/// - `lifecycle` 保存卸载时所需的 cleanup/scope/hook 信息
///
/// 这样 container/anchor/range 对这类整块替换根不必继续保留整颗旧树对象。
pub struct MountedBlock<A: DomAdapter> {
    pub host: Option<A::Element>,
    pub fragment_nodes: Vec<A::Element>,
    pub lifecycle: MountLifecycleRecord,
}

/// 顶层元素边界挂载状态。
///
/// 这类状态只保留元素根命中更新所需的 patch 边界：
/// - `tag/key` 用于类型与 keyed 更新判断
/// - `props/children` 作为元素 patch 的旧输入
/// - `host` 保存当前元素宿主节点身份
/// - `lifecycle` 保存卸载时对子树需要派发的生命周期信息
pub struct MountedElement<A: DomAdapter> {
    pub tag: String,
    pub key: Option<String>,
    pub host: Option<A::Element>,
    pub props: ComponentProps,
    pub children: Vec<MountedSubtreeChild<A>>,
    pub lifecycle: MountLifecycleRecord,
}

/// 组件已渲染子树的递归 patch 快照。
///
/// 这层状态用于顶层 Component 根命中更新时恢复“旧子树 patch 输入”，
/// 但会按节点类型拆成更薄的旧输入形状：
/// - Text 只保留宿主身份与必要的 mount 元信息
/// - Vapor/VaporWithSetup 只保留宿主身份、片段节点身份与 mount 元信息
/// - Fragment/Element/Component 仍保留递归 patch 所需的 props/children，但不再附带 live runtime 字段
/// - Component 仅保留 before_unmount/unmounted 两类卸载钩子，而不是整张 hooks map
#[derive(Clone)]
pub enum MountedPatchSubtreeType {
    Fragment,
    Element(String),
    Component(JsValue),
}

#[derive(Clone)]
pub enum MountedVaporSubtreeType {
    Vapor,
    VaporWithSetup(JsValue),
}

#[derive(Clone)]
pub struct MountedTextSubtree<A: DomAdapter> {
    pub host: Option<A::Element>,
    pub key: Option<String>,
    pub cleanup_bucket: Option<JsValue>,
    pub effect_scope_id: Option<usize>,
}

#[derive(Clone)]
pub struct MountedVaporSubtree<A: DomAdapter> {
    pub r#type: MountedVaporSubtreeType,
    pub host: Option<A::Element>,
    pub key: Option<String>,
    pub fragment_nodes: Vec<A::Element>,
    pub cleanup_bucket: Option<JsValue>,
    pub effect_scope_id: Option<usize>,
}

#[derive(Clone)]
pub struct MountedPatchSubtree<A: DomAdapter> {
    pub r#type: MountedPatchSubtreeType,
    pub props: ComponentProps,
    pub children: Vec<MountedSubtreeChild<A>>,
    pub el: Option<A::Element>,
    pub key: Option<String>,
    pub fragment_nodes: Vec<A::Element>,
    pub mount_cleanup_bucket: Option<JsValue>,
    pub mount_effect_scope_id: Option<usize>,
    pub component_before_unmount_hooks: Vec<JsValue>,
    pub component_unmounted_hooks: Vec<JsValue>,
    pub comp_subtree: Option<Box<MountedSubtreeState<A>>>,
    pub comp_inst_index: Option<usize>,
}

#[derive(Clone)]
pub enum MountedSubtreeChild<A: DomAdapter> {
    Subtree(MountedSubtreeState<A>),
    Text(String),
    Bool(bool),
    Null,
}

#[derive(Clone)]
pub enum MountedSubtreeState<A: DomAdapter> {
    Text(MountedTextSubtree<A>),
    Vapor(MountedVaporSubtree<A>),
    Patch(MountedPatchSubtree<A>),
}

/// 顶层组件边界挂载状态。
///
/// 这类状态只保留同组件更新与卸载所需的边界信息：
/// - 组件函数与 key：用于判断是否还能走同类型更新
/// - 组件实例定位信息：inst_index
/// - 已渲染子树的 patch 快照：用于后续递归 patch，但不再保留完整 live 树对象
/// - 当前 DOM 身份：host / fragment_nodes，用于整块卸载
/// - lifecycle：卸载时所需的 hook / subtree cleanup 信息
pub struct MountedComponent<A: DomAdapter> {
    pub render_fn: JsValue,
    pub key: Option<String>,
    pub host: Option<A::Element>,
    pub fragment_nodes: Vec<A::Element>,
    pub subtree: Option<Box<MountedSubtreeState<A>>>,
    pub inst_index: Option<usize>,
    pub lifecycle: MountLifecycleRecord,
}

/// 挂载状态：
/// - `Block` 仅保留整块替换根的 host/block identity 与 lifecycle
/// - `Element` 保留元素根 patch 所需的最小边界，而不是完整旧树对象
/// - `Component` 保留组件根的边界状态，而不是完整外层树对象
pub enum MountedState<A: DomAdapter> {
    Block(MountedBlock<A>),
    Element(MountedElement<A>),
    Component(MountedComponent<A>),
}

/// 容器级挂载状态。
pub struct ContainerMountState<A: DomAdapter> {
    pub container: A::Element,
    pub mounted: Option<MountedState<A>>,
}

/// 单锚点挂载状态。
pub struct AnchorMountState<A: DomAdapter> {
    pub anchor: A::Element,
    pub mounted: Option<MountedState<A>>,
}

/// 区间挂载状态。
///
/// `start/end` 作为显式边界保存下来，后续整块替换时可直接围绕边界做块级替换。
pub struct RangeMountState<A: DomAdapter> {
    pub start: A::Element,
    pub end: A::Element,
    pub mounted: Option<MountedState<A>>,
}

pub type FC<A> = fn(PropsWithChildren) -> MountInput<A>;
pub const FRAGMENT: &str = "fragment";

impl<A: DomAdapter> MountInputType<A> {
    #[cfg(feature = "dev")]
    pub(crate) fn debug_name(&self) -> String {
        match self {
            Self::Text(_) => "Text".to_string(),
            Self::Fragment => "Fragment".to_string(),
            Self::Vapor => "Vapor".to_string(),
            Self::VaporWithSetup(_) => "VaporWithSetup".to_string(),
            Self::Element(tag) => format!("Element({})", tag),
            Self::Component(_) => "Component".to_string(),
            Self::_Phantom(_) => "_Phantom".to_string(),
        }
    }
}

impl<A: DomAdapter> MountInput<A> {
    /// 构造规范化后的默认挂载输入。
    ///
    /// 这层与旧的 compat `create_element` 做同样的收口工作，但结果直接落成
    /// `MountInput`：
    /// - 提取 `key`
    /// - 把挂载元信息从 props 中剥离到专用字段
    /// - 保留已经归一化好的 children
    pub(crate) fn new_normalized(
        r#type: MountInputType<A>,
        mut props: ComponentProps,
        children: Vec<MountInputChild<A>>,
    ) -> Self {
        let mount_cleanup_bucket = props
            .get("__rue_cleanup_bucket")
            .cloned()
            .filter(|value| Array::is_array(value));
        if mount_cleanup_bucket.is_some() {
            props.remove("__rue_cleanup_bucket");
        }

        let mount_effect_scope_id = props
            .get("__rue_effect_scope_id")
            .and_then(|value| value.as_f64().map(|scope_id| scope_id as usize));
        if mount_effect_scope_id.is_some() {
            props.remove("__rue_effect_scope_id");
        }

        let key = props.get("key").and_then(|value| {
            if let Some(text) = value.as_string() {
                Some(text)
            } else {
                value.as_f64().map(|number| number.to_string())
            }
        });

        Self {
            r#type,
            props,
            children,
            key,
            mount_cleanup_bucket,
            mount_effect_scope_id,
            el_hint: None,
        }
    }
}

impl<A: DomAdapter> MountInput<A>
where
    A::Element: Clone,
{
    /// 从 bridge/source 对象同步挂载元信息。
    ///
    /// 默认主路径不再把 cleanup/effect scope 藏在历史树对象里运输，
    /// 但这些挂载元信息仍要跟随 MountInput 一起进入调度与卸载边界。
    pub fn attach_mount_metadata_from_source(&mut self, source: &Object) {
        let key = Reflect::get(source, &JsValue::from_str("key")).unwrap_or(JsValue::UNDEFINED);
        if !key.is_undefined() && !key.is_null() {
            self.key = key.as_string().or_else(|| key.as_f64().map(|number| number.to_string()));
        }

        let cleanup_bucket = Reflect::get(source, &JsValue::from_str("__rue_cleanup_bucket"))
            .unwrap_or(JsValue::UNDEFINED);
        if Array::is_array(&cleanup_bucket) {
            self.mount_cleanup_bucket = Some(cleanup_bucket);
        }

        let scope_id = Reflect::get(source, &JsValue::from_str("__rue_effect_scope_id"))
            .unwrap_or(JsValue::UNDEFINED);
        self.mount_effect_scope_id = scope_id.as_f64().map(|scope_id| scope_id as usize);
    }
}

impl MountedPatchSubtreeType {
    pub(crate) fn matches_input_type<A: DomAdapter>(
        &self,
        input_type: &MountInputType<A>,
    ) -> bool {
        match (self, input_type) {
            (Self::Fragment, MountInputType::Fragment) => true,
            (Self::Element(old_tag), MountInputType::Element(new_tag)) => old_tag == new_tag,
            (Self::Component(old_render), MountInputType::Component(new_render)) => {
                old_render.eq(new_render)
            }
            _ => false,
        }
    }

    pub fn debug_name(&self) -> String {
        match self {
            Self::Fragment => "Fragment".to_string(),
            Self::Element(tag) => format!("Element({})", tag),
            Self::Component(_) => "Component".to_string(),
        }
    }
}

impl MountedVaporSubtreeType {
    pub(crate) fn matches_input_type<A: DomAdapter>(
        &self,
        input_type: &MountInputType<A>,
    ) -> bool {
        match (self, input_type) {
            (Self::Vapor, MountInputType::Vapor) => true,
            (Self::VaporWithSetup(_), MountInputType::VaporWithSetup(_)) => true,
            _ => false,
        }
    }

    pub fn debug_name(&self) -> String {
        match self {
            Self::Vapor => "Vapor".to_string(),
            Self::VaporWithSetup(_) => "VaporWithSetup".to_string(),
        }
    }
}

impl<A: DomAdapter> MountedSubtreeChild<A>
where
    A::Element: Clone,
{
    pub fn lifecycle_record(&self) -> Option<MountLifecycleRecord> {
        match self {
            Self::Subtree(subtree) => Some(subtree.lifecycle_record()),
            Self::Text(_) | Self::Bool(_) | Self::Null => None,
        }
    }
}

impl<A: DomAdapter> MountedSubtreeState<A>
where
    A::Element: Clone,
{
    pub fn key(&self) -> Option<&String> {
        match self {
            Self::Text(text) => text.key.as_ref(),
            Self::Vapor(vapor) => vapor.key.as_ref(),
            Self::Patch(node) => node.key.as_ref(),
        }
    }

    pub fn host(&self) -> Option<&A::Element> {
        match self {
            Self::Text(text) => text.host.as_ref(),
            Self::Vapor(vapor) => vapor.host.as_ref(),
            Self::Patch(node) => node.el.as_ref(),
        }
    }

    pub fn host_cloned(&self) -> Option<A::Element> {
        self.host().cloned()
    }

    pub fn fragment_nodes(&self) -> &[A::Element] {
        match self {
            Self::Text(_) => &[],
            Self::Vapor(vapor) => vapor.fragment_nodes.as_slice(),
            Self::Patch(node) => node.fragment_nodes.as_slice(),
        }
    }

    pub fn fragment_nodes_cloned(&self) -> Vec<A::Element> {
        self.fragment_nodes().to_vec()
    }

    pub fn component_render_fn(&self) -> Option<&JsValue> {
        match self {
            Self::Patch(node) => match &node.r#type {
                MountedPatchSubtreeType::Component(render_fn) => Some(render_fn),
                _ => None,
            },
            _ => None,
        }
    }

    pub(crate) fn matches_input_type(&self, input_type: &MountInputType<A>) -> bool {
        match self {
            Self::Text(_) => matches!(input_type, MountInputType::Text(_)),
            Self::Vapor(vapor) => vapor.r#type.matches_input_type(input_type),
            Self::Patch(node) => node.r#type.matches_input_type(input_type),
        }
    }

    pub fn debug_type_name(&self) -> String {
        match self {
            Self::Text(_) => "Text".to_string(),
            Self::Vapor(vapor) => vapor.r#type.debug_name(),
            Self::Patch(node) => node.r#type.debug_name(),
        }
    }

    pub fn lifecycle_record(&self) -> MountLifecycleRecord {
        match self {
            Self::Text(text) => MountLifecycleRecord {
                kind: MountLifecycleKind::Other,
                cleanup_bucket: text.cleanup_bucket.clone(),
                effect_scope_id: text.effect_scope_id,
                component_before_unmount_hooks: Vec::new(),
                component_unmounted_hooks: Vec::new(),
                component_inst_index: None,
                children: Vec::new(),
            },
            Self::Vapor(vapor) => MountLifecycleRecord {
                kind: MountLifecycleKind::Vapor,
                cleanup_bucket: vapor.cleanup_bucket.clone(),
                effect_scope_id: vapor.effect_scope_id,
                component_before_unmount_hooks: Vec::new(),
                component_unmounted_hooks: Vec::new(),
                component_inst_index: None,
                children: Vec::new(),
            },
            Self::Patch(node) => node.lifecycle_record(),
        }
    }
}

impl<A: DomAdapter> MountedPatchSubtree<A>
where
    A::Element: Clone,
{
    pub fn lifecycle_record(&self) -> MountLifecycleRecord {
        match &self.r#type {
            MountedPatchSubtreeType::Fragment => MountLifecycleRecord {
                kind: MountLifecycleKind::Fragment,
                cleanup_bucket: self.mount_cleanup_bucket.clone(),
                effect_scope_id: self.mount_effect_scope_id,
                component_before_unmount_hooks: Vec::new(),
                component_unmounted_hooks: Vec::new(),
                component_inst_index: None,
                children: self
                    .children
                    .iter()
                    .filter_map(MountedSubtreeChild::lifecycle_record)
                    .collect(),
            },
            MountedPatchSubtreeType::Element(_) => MountLifecycleRecord {
                kind: MountLifecycleKind::Element,
                cleanup_bucket: None,
                effect_scope_id: None,
                component_before_unmount_hooks: Vec::new(),
                component_unmounted_hooks: Vec::new(),
                component_inst_index: None,
                children: self
                    .children
                    .iter()
                    .filter_map(MountedSubtreeChild::lifecycle_record)
                    .collect(),
            },
            MountedPatchSubtreeType::Component(_) => MountLifecycleRecord {
                kind: MountLifecycleKind::Component,
                cleanup_bucket: None,
                effect_scope_id: None,
                component_before_unmount_hooks: self.component_before_unmount_hooks.clone(),
                component_unmounted_hooks: self.component_unmounted_hooks.clone(),
                component_inst_index: self.comp_inst_index,
                children: self
                    .comp_subtree
                    .as_deref()
                    .map(|subtree| vec![subtree.lifecycle_record()])
                    .unwrap_or_default(),
            },
        }
    }
}

impl<A: DomAdapter> MountedElement<A>
where
    A::Element: Clone,
{
    pub fn into_patch_state(self) -> MountedSubtreeState<A> {
        MountedSubtreeState::Patch(MountedPatchSubtree {
            r#type: MountedPatchSubtreeType::Element(self.tag),
            props: self.props,
            children: self.children,
            el: self.host,
            key: self.key,
            fragment_nodes: Vec::new(),
            mount_cleanup_bucket: None,
            mount_effect_scope_id: None,
            component_before_unmount_hooks: Vec::new(),
            component_unmounted_hooks: Vec::new(),
            comp_subtree: None,
            comp_inst_index: None,
        })
    }
}

impl<A: DomAdapter> MountedComponent<A>
where
    A::Element: Clone,
{
    pub fn into_patch_state(self) -> MountedSubtreeState<A> {
        MountedSubtreeState::Patch(MountedPatchSubtree {
            r#type: MountedPatchSubtreeType::Component(self.render_fn),
            props: ComponentProps::new(),
            children: Vec::new(),
            el: self.host,
            key: self.key,
            fragment_nodes: self.fragment_nodes,
            mount_cleanup_bucket: None,
            mount_effect_scope_id: None,
            component_before_unmount_hooks: self.lifecycle.component_before_unmount_hooks,
            component_unmounted_hooks: self.lifecycle.component_unmounted_hooks,
            comp_subtree: self.subtree,
            comp_inst_index: self.inst_index,
        })
    }
}

impl<A: DomAdapter> MountedState<A>
where
    A::Element: Clone,
{
    pub fn into_patch_state(self) -> Option<MountedSubtreeState<A>> {
        match self {
            Self::Element(element) => Some(element.into_patch_state()),
            Self::Component(component) => Some(component.into_patch_state()),
            Self::Block(_) => None,
        }
    }

    pub fn from_subtree_root(subtree: MountedSubtreeState<A>) -> Self {
        match subtree {
            MountedSubtreeState::Text(text) => Self::Block(MountedBlock {
                host: text.host.clone(),
                fragment_nodes: Vec::new(),
                lifecycle: MountedSubtreeState::Text(text).lifecycle_record(),
            }),
            MountedSubtreeState::Vapor(vapor) => Self::Block(MountedBlock {
                host: vapor.host.clone(),
                fragment_nodes: vapor.fragment_nodes.clone(),
                lifecycle: MountedSubtreeState::Vapor(vapor).lifecycle_record(),
            }),
            MountedSubtreeState::Patch(node) => match &node.r#type {
                MountedPatchSubtreeType::Fragment => Self::Block(MountedBlock {
                    host: node.el.clone(),
                    fragment_nodes: node.fragment_nodes.clone(),
                    lifecycle: node.lifecycle_record(),
                }),
                MountedPatchSubtreeType::Element(tag) => Self::Element(MountedElement {
                    tag: tag.clone(),
                    key: node.key.clone(),
                    host: node.el.clone(),
                    props: node.props.clone(),
                    children: node.children.clone(),
                    lifecycle: node.lifecycle_record(),
                }),
                MountedPatchSubtreeType::Component(render_fn) => Self::Component(MountedComponent {
                    render_fn: render_fn.clone(),
                    key: node.key.clone(),
                    host: node.el.clone(),
                    fragment_nodes: node.fragment_nodes.clone(),
                    subtree: node.comp_subtree.clone(),
                    inst_index: node.comp_inst_index,
                    lifecycle: node.lifecycle_record(),
                }),
            },
        }
    }
}

impl<A: DomAdapter> MountedState<A> {
    pub fn into_lifecycle(self) -> MountLifecycleRecord {
        match self {
            Self::Block(block) => block.lifecycle,
            Self::Element(element) => element.lifecycle,
            Self::Component(component) => component.lifecycle,
        }
    }
}

impl<A: DomAdapter> ContainerMountState<A> {
    pub fn new(container: A::Element, mounted: MountedState<A>) -> Self {
        Self {
            container,
            mounted: Some(mounted),
        }
    }

    pub fn take_mount(&mut self) -> Option<MountedState<A>> {
        self.mounted.take()
    }

    pub fn store_mount(&mut self, mounted: MountedState<A>) {
        self.mounted = Some(mounted);
    }

    pub fn clear(&mut self) {
        self.mounted = None;
    }
}

impl<A: DomAdapter> AnchorMountState<A> {
    pub fn new(anchor: A::Element, mounted: MountedState<A>) -> Self {
        Self {
            anchor,
            mounted: Some(mounted),
        }
    }

    pub fn take_mount(&mut self) -> Option<MountedState<A>> {
        self.mounted.take()
    }

    pub fn store_mount(&mut self, mounted: MountedState<A>) {
        self.mounted = Some(mounted);
    }

    pub fn clear(&mut self) {
        self.mounted = None;
    }
}

impl<A: DomAdapter> RangeMountState<A> {
    pub fn new(start: A::Element, end: A::Element, mounted: MountedState<A>) -> Self {
        Self {
            start,
            end,
            mounted: Some(mounted),
        }
    }

    pub fn take_mount(&mut self) -> Option<MountedState<A>> {
        self.mounted.take()
    }

    pub fn store_mount(&mut self, mounted: MountedState<A>) {
        self.mounted = Some(mounted);
    }

    pub fn clear(&mut self) {
        self.mounted = None;
    }
}
