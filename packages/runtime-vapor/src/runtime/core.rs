//! 运行时核心：Rue 结构（中文注释增强）
//!
//! 本模块定义 Rue 运行时的核心数据结构与全局状态。
//! 注释采用中文高密度风格，便于团队内阅读与维护。
use crate::runtime::dom_adapter::DomAdapter;
use crate::runtime::instance::ComponentInternalInstance;
use crate::runtime::types::{AnchorMountState, ContainerMountState, RangeMountState};
use std::collections::{HashMap, HashSet};
use wasm_bindgen::JsValue;

/// Rue 运行时核心结构
///
/// - 负责容器、实例栈、生命周期钩子、插件与错误处理等全局状态
/// - 通过 dom_adapter 抽象底层 DOM/宿主环境操作
pub struct Rue<A: DomAdapter>
where
    A::Element: Clone,
{
    /// 容器与其当前挂载记录的映射
    pub container_map: Vec<ContainerMountState<A>>,
    /// 单锚点渲染映射（anchor -> mount），用于组件等可由尾锚点定位的增量更新
    pub anchor_map: Vec<AnchorMountState<A>>,
    /// 当前活跃组件实例（用于钩子、错误处理等）
    pub current_instance: Option<ComponentInternalInstance<A>>,
    /// 当前已关联的容器计数
    pub current_container_count: usize,
    /// 组件实例栈（用于嵌套组件钩子上下文）
    pub instance_stack: Vec<usize>,
    /// 实例存储（索引 -> 实例）
    pub instance_store: HashMap<usize, ComponentInternalInstance<A>>,
    /// 挂载完成后需要执行的队列（如 onMounted）
    pub mounted_queue: Vec<Box<dyn FnMut()>>,
    /// 区间渲染的挂载映射（start/end -> mount）
    pub range_map: Vec<RangeMountState<A>>,
    /// 当前区间锚点（渲染 Between 时使用）
    pub current_anchor: Option<A::Element>,
    /// 错误处理器集合（按实例索引）
    pub error_handlers: HashSet<usize>,
    /// 当前渲染的容器
    pub current_container: Option<A::Element>,
    /// 延迟执行队列（插件安装等）
    pub deferred_queue: Vec<Box<dyn FnMut()>>,
    /// 已安装插件及其参数（按实例索引）
    pub installed_plugins: HashMap<usize, Vec<JsValue>>,
    /// 运行时是否已崩溃（全局标记）
    pub crashed: bool,
    /// DOM 适配器（可选，需先设置）
    pub dom_adapter: Option<A>,
    /// 最近一次错误（用于上报与调试）
    pub last_error: Option<JsValue>,
    /// 全局错误处理器列表
    pub global_error_handlers: Vec<JsValue>,
    /// 全局生命周期钩子（名称 -> JS 函数列表）
    pub lifecycle_hooks: HashMap<String, Vec<JsValue>>,
}

impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    /// 构建默认 Rue 实例（各状态初始化为空）
    pub fn new() -> Self {
        Rue {
            container_map: Vec::new(),
            anchor_map: Vec::new(),
            current_instance: None,
            current_container_count: 0,
            instance_stack: Vec::new(),
            instance_store: HashMap::new(),
            mounted_queue: Vec::new(),
            range_map: Vec::new(),
            current_anchor: None,
            error_handlers: HashSet::new(),
            current_container: None,
            deferred_queue: Vec::new(),
            installed_plugins: HashMap::new(),
            crashed: false,
            dom_adapter: None,
            last_error: None,
            global_error_handlers: Vec::new(),
            lifecycle_hooks: HashMap::new(),
        }
    }

    /// 设置 DOM 适配器（绑定宿主环境能力）
    pub fn set_dom_adapter(&mut self, adapter: A) {
        self.dom_adapter = Some(adapter);
    }

    /// 只读获取 DOM 适配器
    pub fn get_dom_adapter(&self) -> Option<&A> {
        self.dom_adapter.as_ref()
    }

    /// 可变获取 DOM 适配器
    pub fn get_dom_adapter_mut(&mut self) -> Option<&mut A> {
        self.dom_adapter.as_mut()
    }
}

