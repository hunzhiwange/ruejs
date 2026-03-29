use super::Rue;
use super::types::VNode;
#[cfg(feature = "dev")]
use crate::log::{log, want_log};
use crate::runtime::dom_adapter::DomAdapter;
#[cfg(feature = "dev")]
use js_sys::Function;
#[cfg(feature = "dev")]
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

// 设计总览：
// - 本模块负责 VNode 的增量更新（patch），在不变更类型/键值的前提下尽可能复用已有 DOM。
// - 若 key 或类型发生变化，走替换流程（patch_replace），以确保结构一致性。
// - 同类型更新：文本更新、片段更新、元素更新（属性 + 子节点 key diff）、组件更新。
// - 所有真实 DOM 操作都经由 DomAdapter 抽象，保证跨环境（浏览器/测试）一致的行为。
// - 锚点（anchor）与片段（fragment）处理贯穿整个流程，用于精准插入与移动。

mod children;
mod component;
mod replace;
mod replace_utils;
mod text;

/// 渲染补丁（增量更新）核心：在不改变节点类型与 key 的情况下复用已有 DOM。
///
/// 主要职责：
/// - 判定 key 或类型变化并分派到替换流程
/// - 文本、片段、元素、组件的同类型增量更新
/// - 通过 DomAdapter 执行跨环境一致的 DOM 操作
impl<A: DomAdapter> Rue<A>
where
    A::Element: Clone,
{
    /// 仅对元素的属性进行补丁更新与后置处理
    ///
    /// 参数：
    /// - el：目标元素（可能被适配器内部借用，内部使用克隆）
    /// - old/new：旧/新 props，用于计算增量变化
    /// 行为：
    /// - 调用 patch_props 与 post_patch_element 完成属性与后置修正
    fn patch_props_only(
        &mut self,
        el: &mut A::Element,
        old: &super::props::Props,
        new: &super::props::Props,
    ) {
        // 仅更新元素属性：拆分为“属性变更”与“变更后处理（例如 class 合并、样式后置修复）”
        // 通过 get_dom_adapter_mut 获取适配器的可变引用，避免在不可用时产生错误。
        let mut res_patch: Option<Result<(), JsValue>> = None;
        let mut res_post: Option<Result<(), JsValue>> = None;
        if let Some(adapter) = self.get_dom_adapter_mut() {
            // 由于适配器可能在内部持有/借用元素，这里使用克隆的副本进行变更，规避借用冲突
            let mut el_clone = el.clone();
            res_patch = Some(super::props::patch_props(adapter, &mut el_clone, old, new));
            res_post = Some(super::props::post_patch_element(adapter, &mut el_clone, new));
        }
        // 将适配器返回的错误统一交给运行时错误处理，以避免 panic 并保留堆栈
        if let Some(Err(e)) = res_patch {
            self.handle_error(e);
        }
        if let Some(Err(e)) = res_post {
            self.handle_error(e);
        }
    }

    /// 对两个同位置 VNode 执行增量更新或替换
    ///
    /// 参数：
    /// - old/new：旧/新 VNode
    /// - parent：父元素，用于插入/移动
    /// 行为：
    /// - 若 key 或类型变化，走替换；否则按类型进行同类更新
    pub fn patch(&mut self, old: &mut VNode<A>, new: &mut VNode<A>, parent: &mut A::Element)
    where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        use super::types::VNodeType;
        // 先进行快速判定：key 是否变化（表示列表重排或节点身份变化）
        let keys_changed = match (&old.key, &new.key) {
            (Some(ko), Some(kn)) => ko != kn,
            (None, Some(_)) | (Some(_), None) => true,
            _ => false,
        };
        // 类型是否变化：不同类型节点不可复用，需要走替换流程
        let type_changed = match (&old.r#type, &new.r#type) {
            (VNodeType::Text, VNodeType::Text) => false,
            (VNodeType::Fragment, VNodeType::Fragment) => false,
            (VNodeType::Element(ot), VNodeType::Element(nt)) => ot != nt,
            (VNodeType::Vapor, VNodeType::Vapor) => false,
            (VNodeType::VaporWithSetup(_), VNodeType::VaporWithSetup(_)) => false,
            (VNodeType::Component(of), VNodeType::Component(nf)) => !of.eq(nf),
            _ => true,
        };
        #[cfg(feature = "dev")]
        {
            // 开发模式下输出调试信息：便于理解为何进入替换或同类更新
            if want_log("debug", "runtime:patch type_check") {
                let parent_desc = if let Some(adapter) = self.get_dom_adapter() {
                    adapter.get_tag_name(parent)
                } else {
                    String::from("<no-adapter>")
                };
                log("debug", &format!("runtime:patch type_check parent_tag={}", parent_desc));
                let type_to_str = |v: &VNodeType<A>| -> String {
                    match v {
                        VNodeType::Text => "Text".to_string(),
                        VNodeType::Fragment => "Fragment".to_string(),
                        VNodeType::Vapor => "Vapor".to_string(),
                        VNodeType::VaporWithSetup(_) => "VaporWithSetup".to_string(),
                        VNodeType::Element(tag) => format!("Element({})", tag),
                        VNodeType::Component(_) => "Component".to_string(),
                        VNodeType::_Phantom(_) => "_Phantom".to_string(),
                    }
                };
                let old_key = old.key.clone().unwrap_or_default();
                let new_key = new.key.clone().unwrap_or_default();
                if let (VNodeType::Component(of), VNodeType::Component(nf)) =
                    (&old.r#type, &new.r#type)
                {
                    // 组件类型的判断基于 Function 指针相等性；输出函数名辅助定位
                    let old_name = of
                        .dyn_ref::<Function>()
                        .map(|f| {
                            let n: js_sys::JsString = f.name();
                            String::from(n)
                        })
                        .unwrap_or_else(|| String::from("<non-fn>"));
                    let new_name = nf
                        .dyn_ref::<Function>()
                        .map(|f| {
                            let n: js_sys::JsString = f.name();
                            String::from(n)
                        })
                        .unwrap_or_else(|| String::from("<non-fn>"));
                    log(
                        "debug",
                        &format!(
                            "runtime:patch type_check component of_name={} nf_name={} ptr_eq={}",
                            old_name,
                            new_name,
                            of.eq(nf)
                        ),
                    );
                }
                log(
                    "debug",
                    &format!(
                        "runtime:patch type_check old_type={} new_type={} keys_changed={} type_changed={} old_key={} new_key={}",
                        type_to_str(&old.r#type),
                        type_to_str(&new.r#type),
                        keys_changed,
                        type_changed,
                        old_key,
                        new_key
                    ),
                );
            }
        }
        // 若 key 或类型变更，进行整体替换（包含片段/锚点处理）
        if keys_changed || type_changed {
            self.patch_replace(old, new, parent);
            return;
        }
        // 同类型增量更新：根据节点类型分派到具体处理函数
        match (&old.r#type, &new.r#type) {
            (VNodeType::Text, VNodeType::Text) => {
                // 文本节点：仅替换 textContent，不动结构
                self.patch_text(old, new);
            }
            (VNodeType::Fragment, VNodeType::Fragment) => {
                // 片段：清理旧片段子节点并插入新片段子节点，保留占位
                self.patch_fragment_same(old, new, parent);
            }
            (VNodeType::Element(_), VNodeType::Element(_)) => {
                if let Some(ref el_old) = old.el {
                    // 元素节点：优先复用旧 el，先 patch 属性，再进行子节点 key diff
                    let mut el = el_old.clone();
                    self.patch_props_only(&mut el, &old.props, &new.props);
                    let mut old_children = old.children.clone();
                    let mut new_children = new.children.clone();
                    self.patch_children_keyed(&mut el, &mut old_children, &mut new_children);
                    new.children = new_children;
                    // 复用旧 el 的引用（避免不必要替换），保持 new.el 与真实 DOM 对应
                    new.el = Some(el_old.clone());
                } else {
                    // 缺少旧 el（例如开发态或特殊路径），重建并插入
                    self.patch_rebuild_same(old, new, parent);
                }
            }
            (VNodeType::Component(_), VNodeType::Component(_)) => {
                // 组件：执行组件函数，收集 hooks 与返回的子树，然后递归更新
                self.patch_component_same(old, new, parent);
            }
            _ => {
                // 其他边界情况：走重建逻辑（保守策略）
                self.patch_rebuild_same(old, new, parent);
            }
        }
    }

    /// 同类型片段的增量更新：清理旧片段子节点并插入新片段子节点
    ///
    /// 参数：
    /// - old/new：旧/新 VNode（均为 Fragment）
    /// - parent：用于确定真实插入父元素
    fn patch_fragment_same(
        &mut self,
        old: &mut VNode<A>,
        new: &mut VNode<A>,
        parent: &mut A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 构建新的真实 DOM（片段占位），随后根据旧 el 与锚点决策插入位置
        if let Some(el_new) = self.create_real_dom(new) {
            let anchor_opt = self.current_anchor.clone();
            let mut dest_parent =
                self.resolve_dest_parent(parent, old.el.clone(), anchor_opt.clone());
            let insert_anchor = old.el.clone().or(anchor_opt);
            // 先清理旧片段的子节点（片段只负责子节点内容，不直接替换占位）
            self.clear_vapor_frag_nodes(&mut dest_parent, old);
            // 插入新片段的子节点到目标父节点；必要时参照锚点前插
            self.insert_fragment_children(&mut dest_parent, &el_new, &insert_anchor);
            if let Some(ref el_old) = old.el {
                // 若旧占位仍存在于父节点中，清理之以避免重复
                self.clear_old_el_if_present(&mut dest_parent, el_old);
            }
            // 记录新的占位引用（el），供后续递归或替换使用
            new.el = Some(el_new);
        }
    }

    /// 无法复用旧节点时的保守重建逻辑
    ///
    /// 参数：
    /// - old/new：旧/新 VNode
    /// - parent：父元素
    /// 行为：
    /// - 创建新 DOM，结合锚点决定插入位置；若有旧 el，前插后移除旧 el
    fn patch_rebuild_same(
        &mut self,
        old: &mut VNode<A>,
        new: &mut VNode<A>,
        parent: &mut A::Element,
    ) where
        <A as DomAdapter>::Element: From<JsValue> + Into<JsValue>,
    {
        // 当无法复用旧节点（缺失 el 或上下文不一致）时，重建并插入新节点
        if let Some(el_new) = self.create_real_dom(new) {
            let anchor_opt = self.current_anchor.clone();
            if let Some(a) = self.get_dom_adapter_mut() {
                if let Some(ref el_old) = old.el {
                    // 旧节点存在：先在其前插入新节点，再移除旧节点，保持位置稳定
                    a.insert_before(parent, &el_new, el_old);
                    let mut p = parent.clone();
                    a.remove_child(&mut p, el_old);
                } else {
                    // 旧节点不存在：根据锚点插入，否则尾部追加
                    if let Some(anchor) = anchor_opt {
                        if a.contains(parent, &anchor) {
                            a.insert_before(parent, &el_new, &anchor);
                        } else {
                            a.append_child(parent, &el_new);
                        }
                    } else {
                        a.append_child(parent, &el_new);
                    }
                }
            }
            // 绑定新 el 到 new.vnode，保证后续逻辑能获取真实引用
            new.el = Some(el_new);
        }
    }
}
