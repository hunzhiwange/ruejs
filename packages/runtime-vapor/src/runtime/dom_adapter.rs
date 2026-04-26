/*
系统架构概览（DomAdapter）
--------------------------------
Rue 运行时的核心思想是“将挂载输入与补丁计划驱动到底层宿主 DOM/平台”。为实现跨平台（浏览器、JS 模拟 DOM、原生组件等），
定义了 DomAdapter 这一抽象接口。运行时的所有渲染、补丁、事件绑定、属性更新都只面向该接口，而不直接依赖具体的宿主环境。

设计要点：
- 纯抽象：DomAdapter 是一个 trait，所有平台具体实现（如 JsDomAdapter）通过实现该 trait 完成适配。
- Element 关联类型：使适配器能够返回平台自有的“元素”类型（如 JsValue、原生句柄等）。
- 职责分层：创建元素/文本/片段；树结构操作（append/insert/remove/contains）；属性与事件；选择器与表单特性等。
- 可测试性：tests/common/TestAdapter 即为一个纯 Rust 的假实现，便于在 wasm 测试中验证运行时逻辑。
*/
use std::collections::HashMap;
use wasm_bindgen::JsValue;

pub trait DomAdapter: Clone {
    type Element: Clone;

    // 创建节点相关：统一由运行时调用，用于构造最基本的宿主节点
    fn create_element(&mut self, tag: &str) -> Self::Element;
    fn create_text_node(&mut self, text: &str) -> Self::Element;
    fn create_document_fragment(&mut self) -> Self::Element;

    // 片段相关：用于识别与枚举片段内部子节点（例如 DocumentFragment 的 children）
    fn is_fragment(&self, el: &Self::Element) -> bool;
    fn collect_fragment_children(&self, el: &Self::Element) -> Vec<Self::Element>;

    // 文本与树结构操作：运行时补丁算法依靠这些原语完成节点更新与插入删除
    fn set_text_content(&mut self, el: &mut Self::Element, text: &str);
    fn append_child(&mut self, parent: &mut Self::Element, child: &Self::Element);
    fn insert_before(
        &mut self,
        parent: &mut Self::Element,
        child: &Self::Element,
        before: &Self::Element,
    );
    fn remove_child(&mut self, parent: &mut Self::Element, child: &Self::Element);
    fn contains(&self, parent: &Self::Element, child: &Self::Element) -> bool;
    // 为精确替换提供的父节点读取能力
    // - 优先使用适配器内的 getParentNode 方法；
    // - 若宿主不提供，则回退读取元素的 parentNode 字段；
    // - 用于在“非区间渲染”场景下定位插入位置。
    fn get_parent_node(&self, node: &Self::Element) -> Option<Self::Element>;
    // 为精确替换提供的替换原语
    // - 优先调用宿主 replaceChild(new, old) 以原子替换；
    // - 若缺失，则退化为 insert_before(new, old) + remove_child(old)；
    // - 统一封装替换语义，减少上层逻辑分支。
    fn replace_child(
        &mut self,
        parent: &mut Self::Element,
        new_child: &Self::Element,
        old_child: &Self::Element,
    );

    // 外观与内容：class、style、innerHTML 的设置
    fn set_class_name(&mut self, el: &mut Self::Element, value: &str);
    fn patch_style(
        &mut self,
        el: &mut Self::Element,
        old_style: &HashMap<String, String>,
        new_style: &HashMap<String, String>,
    );
    fn set_inner_html(&mut self, el: &mut Self::Element, html: &str);

    // 表单与属性：value/checked/disabled 为常见的动态属性；ref 用于回调式获取节点句柄
    fn set_value(&mut self, el: &mut Self::Element, value: JsValue);
    fn set_checked(&mut self, el: &mut Self::Element, checked: bool);
    fn set_disabled(&mut self, el: &mut Self::Element, disabled: bool);

    fn clear_ref(&mut self, ref_handle: JsValue);
    fn apply_ref(&mut self, el: &mut Self::Element, ref_handle: JsValue);

    // 通用属性与事件：运行时将 props 翻译为这里的调用
    fn set_attribute(&mut self, el: &mut Self::Element, key: &str, value: &str);
    fn remove_attribute(&mut self, el: &mut Self::Element, key: &str);
    fn get_tag_name(&self, el: &Self::Element) -> String;

    fn add_event_listener(&mut self, el: &mut Self::Element, event: &str, handler: JsValue);
    fn remove_event_listener(&mut self, el: &mut Self::Element, event: &str, handler: JsValue);

    // 能力探测与选择器：特定行为差异（如 SELECT multiple），以及查询容器节点
    fn has_value_property(&self, el: &Self::Element) -> bool;
    fn is_select_multiple(&self, el: &Self::Element) -> bool;

    fn query_selector(&self, selector: &str) -> Option<Self::Element>;
}
