use swc_core::ecma::ast::Ident;

use crate::emit::*;

use super::VaporTransform;

/*
命名与计数器说明（中文）：
- 通过在转换器中维护递增计数，生成稳定且可读的局部标识符：
  - `_elX`：原生元素节点
  - `_listX`：注释锚点（列表/插槽/children）
  - `__childX`：组件 children 片段
  - `__slotX` / `__vnodeX`：插槽值与规范化 vnode
  - `_mapX*`：列表渲染内部使用的当前项数组与元素映射
*/
impl VaporTransform {
    /// 生成下一个元素标识符：`_elX`
    /// - 命名策略：以 `_el` 前缀加递增序号，确保同块体内唯一且可读
    pub(crate) fn next_el_ident(&mut self) -> Ident {
        // 递增元素计数，并返回 `_el{n}`
        self.next_el += 1;
        ident(&format!("_el{}", self.next_el))
    }
    /// 标识符命名约定说明：
    ///   - `_elX`：原生元素节点
    ///   - `_listX`：注释锚点（list/slot/children）
    ///   - `__childX`：组件 children 片段
    ///   - `_mapX*`：列表渲染内部使用的当前项数组与元素映射（如 `_map1_current`/`_map1_elements`）
    ///     生成下一个注释标识符：`_listX`
    /// - 用途：作为注释锚点标识符插入 DOM，供 renderBetween/列表渲染定位边界
    pub(crate) fn next_list_ident(&mut self) -> Ident {
        // 递增注释锚点计数，并返回 `_list{n}`
        self.next_list += 1;
        ident(&format!("_list{}", self.next_list))
    }
    /// 生成下一个 children 片段标识符：`__childX`
    /// - 用途：组件 children 的片段根返回对象中的 `vaporElement` 对应标识符
    pub(crate) fn next_child_ident(&mut self) -> Ident {
        // 递增 children 计数，并返回 `__child{n}`
        self.next_child += 1;
        ident(&format!("__child{}", self.next_child))
    }
    /// 生成下一个 slot 标识符：`__slotX`（复用计数器保证唯一性）
    /// - 用途：表达式容器/列表项渲染时的临时插槽值保存
    pub(crate) fn next_slot_ident(&mut self) -> Ident {
        // 复用 next_list 计数以保持唯一性
        self.next_list += 1;
        ident(&format!("__slot{}", self.next_list))
    }
    /// 生成下一个 vnode 标识符：`__vnodeX`（复用计数器保证唯一性）
    /// - 用途：统一将任意插槽值规范为 vnode 以供 renderBetween 渲染
    #[allow(dead_code)]
    pub(crate) fn next_vnode_ident(&mut self) -> Ident {
        // 复用 next_list 计数以保持唯一性
        self.next_list += 1;
        ident(&format!("__vnode{}", self.next_list))
    }
    /// 生成下一个 map 基名：`_mapX`
    /// - 用途：列表渲染持久 Map 与临时数组命名（如 `_map1_elements`/`_map1_current`）
    pub(crate) fn next_map_base(&mut self) -> String {
        // 递增列表渲染计数，并返回 `_map{n}` 作为基名
        self.next_map += 1;
        format!("_map{}", self.next_map)
    }
}
