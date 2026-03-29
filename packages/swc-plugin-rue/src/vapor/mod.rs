mod block;
mod component;
mod helpers;
mod visitor;

/*
Vapor 深编译转换器说明：
- 职责：遍历箭头函数与返回 JSX 的位置，替换为 `vapor(() => { ... })`，并在块体中生成原生 DOM 构造语句。
- 片段渲染：通过在父节点插入 `start/end` 注释（`_listX`）作为锚点，结合 `renderBetween` 在两者之间插入片段。
- 命名策略：使用递增计数生成稳定的局部标识符，避免与用户代码冲突，并提升可读性与调试体验。
- Import 注入：当 `did_transform` 为 true 时，模块级访问会按需注入 `@rue-js/rue` 的运行时 import。
- 选择注释锚点的原因：原生 DOM 没有“片段占位”概念，注释节点可作为轻量且不影响布局的边界标记，配合 `parentNode` 枚举进行精准插入与复用。
+
结构体字段说明：
- next_el/next_list/next_map/next_child：各类计数器用于生成稳定名称；
- did_transform：标记是否发生 Vapor 转换，模块访问阶段据此注入运行时 import；
- el_tag_by_ident：记录元素标识符与标签名的映射，便于特殊处理（如 style 文本）；
- optimize_static_slots：静态插槽/组件优化标志，避免多余的 watch 包裹。
*/

/// Vapor 转换器：将箭头函数返回的 JSX 转换为 Vapor DOM 构造代码
/// 工作流程（参考 `tests/basic.rs`）：
/// - 访问箭头函数体；若返回 JSX/Fragment，替换为 `vapor(() => { ... })`
/// - 在块体内调用 `elements::build_element` 递归生成原生 DOM 创建与插入代码
/// - 标记 `did_transform = true` 以便模块级注入运行时 import
pub struct VaporTransform {
    /// 递增的原生元素计数，用于生成 `_elX` 名称
    pub next_el: usize,
    /// 递增的占位注释计数，用于生成 `_listX` 名称
    pub next_list: usize,
    /// 递增的 map 计数，用于生成 `_mapX` 前缀
    pub next_map: usize,
    /// 递增的 children 片段计数，用于生成 `__childX` 名称
    pub next_child: usize,
    /// 标记当前模块是否发生过 Vapor 转换，用于触发运行时 import 注入
    pub did_transform: bool,
    /// 记录已创建元素的标识符与标签名，用于特殊处理（例如 style 子文本）
    pub el_tag_by_ident: std::collections::HashMap<String, String>,
    /// 优化：静态插槽/组件不包裹 watchEffect
    #[allow(dead_code)]
    pub optimize_static_slots: bool,
}

impl VaporTransform {}
