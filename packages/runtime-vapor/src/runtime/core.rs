//! 运行时核心：Rue 结构与元素创建（中文注释增强）
//!
//! 本模块定义 Rue 运行时的核心数据结构与元素归一化创建逻辑。
//! 注释采用中文高密度风格，便于团队内阅读与维护。
use crate::runtime::dom_adapter::DomAdapter;
use crate::runtime::instance::ComponentInternalInstance;
use crate::runtime::types::{Child, ComponentProps, VNode, VNodeType};
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
    /// 容器与其当前 vnode 的映射
    pub container_map: Vec<(A::Element, Option<VNode<A>>)>,
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
    /// 区间渲染的锚点映射（父元素 -> 子树 vnode）
    pub range_map: Vec<(A::Element, Option<VNode<A>>)>,
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

    /// 创建归一化的 VNode
    ///
    /// - 规范化 props 与 children（将纯文本包装为 Text VNode）
    /// - 提取 key（字符串或数字），用于后续 diff
    pub fn create_element(
        &mut self,
        type_tag: VNodeType<A>,
        props: Option<ComponentProps>,
        children: Vec<Child<A>>,
    ) -> VNode<A> {
        #[cfg(feature = "dev")]
        {
            use crate::log::{log, want_log};
            if want_log("debug", "runtime:rue.create_element enter") {
                let ty = match &type_tag {
                    VNodeType::Text => "Text",
                    VNodeType::Fragment => "Fragment",
                    VNodeType::Vapor => "Vapor",
                    VNodeType::VaporWithSetup(_) => "VaporWithSetup",
                    VNodeType::Element(_) => "Element",
                    VNodeType::Component(_) => "Component",
                    VNodeType::_Phantom(_) => "_Phantom",
                };
                log(
                    "debug",
                    &format!("runtime:rue.create_element type={} children={}", ty, children.len()),
                );
            }
        }
        // 归一化 props：缺省则创建空对象
        let normalized_props = props.unwrap_or_else(ComponentProps::new);
        // 归一化 children：将纯文本转为 Text VNode，其余保持
        let mut normalized_children: Vec<Child<A>> = Vec::new();
        {
            let mut push_child = |c: Child<A>| match c {
                Child::Null => {}
                Child::Bool(_) => {}
                Child::Text(s) => {
                    // 若存在适配器，则生成对应文本节点引用
                    let mut el_opt = None;
                    if let Some(adapter) = self.get_dom_adapter_mut() {
                        let el = adapter.create_text_node(&s);
                        el_opt = Some(el);
                    }
                    // 构造 Text VNode 并压入 children
                    let vnode = VNode {
                        r#type: VNodeType::Text,
                        props: ComponentProps::new(),
                        children: vec![Child::Text(s)],
                        el: el_opt,
                        key: None,
                        comp_hooks: None,
                        comp_subtree: None,
                        comp_host: None,
                        comp_props_ro: None,
                        comp_inst_index: None,
                    };
                    normalized_children.push(Child::VNode(vnode));
                }
                Child::VNode(v) => {
                    normalized_children.push(Child::VNode(v));
                }
            };
            // 逐个处理原 children
            for ch in children.into_iter() {
                push_child(ch);
            }
        }
        // 提取 key：字符串或数字（数字转字符串）
        let key = normalized_props.get("key").and_then(|v| {
            if let Some(s) = v.as_string() {
                Some(s)
            } else if let Some(n) = v.as_f64() {
                Some(n.to_string())
            } else {
                None
            }
        });
        // 输出归一化后的 VNode
        let out = VNode {
            r#type: type_tag,
            props: normalized_props,
            children: normalized_children,
            el: None,
            key,
            comp_hooks: None,
            comp_subtree: None,
            comp_host: None,
            comp_props_ro: None,
            comp_inst_index: None,
        };
        #[cfg(feature = "dev")]
        {
            use crate::log::{log, want_log};
            if want_log("debug", "runtime:rue.create_element exit") {
                log("debug", "runtime:rue.create_element exit");
            }
        }
        out
    }
}

/// h 函数占位：与 create_element 行为一致（开发态/JSX 辅助）
pub fn h<A: DomAdapter>(
    _type_tag: VNodeType<A>,
    _props: Option<ComponentProps>,
    _children: Vec<Child<A>>,
) -> VNode<A>
where
    A::Element: Clone,
{
    todo!()
}

/// 构建 Rue 实例占位：可在外部注入适配器与配置
pub fn create_rue<A: DomAdapter>() -> Rue<A>
where
    A::Element: Clone,
{
    todo!()
}
