use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitWith};

use crate::log;
use crate::vapor::VaporTransform;

#[derive(Clone, Copy)]
enum CompiledListSafety {
    Probing,
    Resolved(bool),
}

thread_local! {
    static COMPILED_LIST_SAFETY_CACHE: std::cell::RefCell<
        std::collections::HashMap<(u32, u32), CompiledListSafety>,
    > = std::cell::RefCell::new(std::collections::HashMap::new());
}

pub(crate) fn reset_compiled_list_safety_cache() {
    COMPILED_LIST_SAFETY_CACHE.with(|cache| cache.borrow_mut().clear());
}

/*
元素子节点编译：
- 目标：将 JSXElement 的 children 编译为原生 DOM 操作并附加到父元素；
- 空白策略：normalize_text 归一化段内空白，结合前后邻居（文本/表达式/纯空白）决定插入、保留或修剪；
- 分派路径：文本 → 规范化并插入；片段 → 递归；表达式容器 → 插槽渲染；嵌套元素 → 构建为原生 DOM；
- 设计宗旨：与 Vapor 块体的 children 编译保持一致，避免不同入口出现渲染差异。
*/
/// 元素子节点编译总览
/// - 职责：将 JSX 子节点编译为附加到当前元素的原生 DOM 操作
/// - 文本：使用 normalize_text + 上下文判断，精细保留/修剪空白，避免无意义节点
/// - 片段/表达式/嵌套元素：委托到各自模块，保持职责清晰
pub fn emit_element_children(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    children: &[JSXElementChild],
    stmts: &mut Vec<Stmt>,
) {
    log::debug(&format!("children: count={}", children.len()));
    // 子节点遍历入口：
    // - 逐一检查当前文本及其前后邻居，配合下方空白处理策略决定：
    //   1) 仅空白是否需要插入一个空格（使用 `$createTextNode(" ")` + `$appendChild`）
    //   2) 含可见字符的首尾空白在行内拼接或块级场景中的保留/修剪
    let mut i = 0;
    while i < children.len() {
        let c = &children[i];
        if let JSXElementChild::JSXExprContainer(_) = c {
            let mut group_end = i;
            let mut exprs = Vec::new();
            let mut cursor = i;
            while cursor < children.len() {
                match &children[cursor] {
                    JSXElementChild::JSXText(text)
                        if crate::text::normalize_text(&text.value).trim().is_empty() => {}
                    JSXElementChild::JSXExprContainer(container) => {
                        let JSXExpr::Expr(expr) = &container.expr else {
                            break;
                        };
                        exprs.push(crate::utils::unwrap_expr(expr.as_ref()));
                        group_end = cursor;
                    }
                    _ => break,
                }
                cursor += 1;
            }
            if let Some(branch) =
                crate::element_expr::try_make_compiled_literal_sibling_branch_expr(vt, &exprs)
            {
                let branch_ident = vt.next_el_ident();
                stmts.push(crate::emit::const_decl(branch_ident.clone(), branch));
                stmts.push(Stmt::Expr(ExprStmt {
                    span: DUMMY_SP,
                    expr: Box::new(call_member_expr(
                        Expr::Ident(branch_ident),
                        "__rue_compiled_mount",
                        vec![Expr::Ident(el_ident.clone())],
                    )),
                }));
                i = group_end + 1;
                continue;
            }
        }
        match c {
            JSXElementChild::JSXText(t) => {
                let txt = crate::text::normalize_text(&t.value);
                if let Some(content) = crate::text::compute_jsx_text_content(children, i, &txt) {
                    let text_node = crate::emit::call_ident(
                        "_$createTextNode",
                        vec![crate::emit::string_expr(&content)],
                    );
                    stmts.push(crate::emit::append_child(el_ident.clone(), text_node));
                }
            }
            JSXElementChild::JSXFragment(frag) => {
                crate::element_fragment::emit_fragment_children(
                    vt,
                    el_ident,
                    &frag.children,
                    stmts,
                );
            }
            JSXElementChild::JSXExprContainer(ec) => {
                crate::element_expr::emit_element_expr_container_child(vt, el_ident, ec, stmts);
            }
            JSXElementChild::JSXElement(nested) => {
                crate::elements::build_element(vt, nested, el_ident, stmts);
            }
            JSXElementChild::JSXSpreadChild(_) => {}
        }
        i += 1;
    }
}

fn compiled_tag_name(element: &JSXElement) -> Option<String> {
    let JSXElementName::Ident(name) = &element.opening.name else {
        return None;
    };
    let tag = name.sym.to_string();
    ((crate::vapor::template::is_native_html_tag(&tag)
        || matches!(tag.as_str(), "style" | "textarea")
        || crate::element_node::is_native_svg_tag(&tag))
        && !crate::custom_element::is_custom_element_tag(&tag))
    .then_some(tag)
}

fn compiled_child_is_safe(
    vt: &VaporTransform,
    child: &JSXElementChild,
    shadowed_names: &std::collections::HashSet<String>,
) -> bool {
    match child {
        JSXElementChild::JSXText(_) => true,
        JSXElementChild::JSXFragment(fragment) => {
            fragment.children.iter().all(|child| compiled_child_is_safe(vt, child, shadowed_names))
        }
        JSXElementChild::JSXExprContainer(container) => match &container.expr {
            JSXExpr::JSXEmptyExpr(_) => true,
            JSXExpr::Expr(expr) => match crate::utils::unwrap_expr(expr.as_ref()) {
                expr if crate::element_expr::is_compiled_slot_expr(vt, expr) => true,
                Expr::Call(call) if compiled_list_call_is_safe(vt, call) => true,
                // A generic `.get()` has no return-type proof and may yield a Vapor renderable.
                Expr::Call(call) if crate::element_expr::is_accessor_get_call_expr(call) => {
                    crate::compiled_component::is_static_prop_get_call(call)
                        || crate::vapor::is_compiled_reactive_scalar_expr(
                            vt,
                            expr.as_ref(),
                            shadowed_names,
                        )
                }
                expr if crate::vapor::is_compiled_reactive_scalar_expr(
                    vt,
                    expr,
                    shadowed_names,
                ) =>
                {
                    true
                }
                // Row-local derived members and synchronous formatter calls are emitted by
                // `emit_element_expr_container_child` as either a compiled text effect or a
                // nested render anchor. Rejecting them here forces the enclosing `map()` back
                // to the Vapor path, which recreates every row whenever any row-local reactive
                // dependency changes.
                Expr::Member(_) | Expr::Call(_) if reads_compiled_row_signal(expr) => true,
                expr => crate::element_expr::is_compiled_branch_expr(vt, expr),
            },
        },
        JSXElementChild::JSXElement(element) => {
            crate::element_component::is_compiled_component_element(vt, element)
                || crate::element_component::is_compiled_opaque_component_element(element)
                || compiled_scalar_element_is_safe(vt, element, shadowed_names)
        }
        JSXElementChild::JSXSpreadChild(_) => false,
    }
}

/// A closed capability check for the task-7 tier. Any structural/renderable
/// capability causes the whole root to stay on the existing Vapor path.
fn compiled_scalar_element_is_safe(
    vt: &VaporTransform,
    element: &JSXElement,
    shadowed_names: &std::collections::HashSet<String>,
) -> bool {
    if crate::vapor::template::marked_static_template(element).is_some() {
        return true;
    }
    compiled_tag_name(element).is_some()
        && crate::attrs::attrs_support_compiled_scalar(vt, &element.opening, shadowed_names)
        && element.children.iter().all(|child| compiled_child_is_safe(vt, child, shadowed_names))
}

struct CompiledRowSignalRead {
    found: bool,
}

impl Visit for CompiledRowSignalRead {
    fn visit_cond_expr(&mut self, _: &CondExpr) {
        // Defaulted/destructured callback parameters are represented as conditionals and
        // retain their existing fallback path; this exception is only for direct row reads.
    }

    fn visit_call_expr(&mut self, call: &CallExpr) {
        if self.found {
            return;
        }
        if call.args.is_empty()
            && let Callee::Expr(callee) = &call.callee
            && let Expr::Member(member) = crate::utils::unwrap_expr(callee.as_ref())
            && let Expr::Ident(object) = crate::utils::unwrap_expr(member.obj.as_ref())
            && object.sym.starts_with("_$row")
            && matches!(&member.prop, MemberProp::Ident(prop) if prop.sym == *"get")
        {
            self.found = true;
            return;
        }
        call.visit_children_with(self);
    }
}

fn reads_compiled_row_signal(expr: &Expr) -> bool {
    let mut collector = CompiledRowSignalRead { found: false };
    expr.visit_with(&mut collector);
    collector.found
}

fn is_compiled_row_text_call(vt: &VaporTransform, expr: &Expr) -> bool {
    matches!(crate::utils::unwrap_expr(expr), Expr::Call(_))
        && reads_compiled_row_signal(expr)
        && !crate::element_expr::is_known_renderable_call_expr(vt, expr)
}

#[derive(Default)]
struct VaporCapabilityDetector {
    found: bool,
}

impl Visit for VaporCapabilityDetector {
    fn visit_expr(&mut self, expr: &Expr) {
        if let Expr::Ident(ident) = expr
            && crate::compiled_capabilities::requires_component_context(ident.sym.as_ref())
        {
            self.found = true;
            return;
        }
        expr.visit_children_with(self);
    }
}

pub(crate) fn compiled_list_call_is_safe(vt: &VaporTransform, call: &CallExpr) -> bool {
    let cache_key = (call.span.lo.0, call.span.hi.0);
    if let Some(cached) =
        COMPILED_LIST_SAFETY_CACHE.with(|cache| cache.borrow().get(&cache_key).copied())
    {
        return match cached {
            // Probe lowering checks the row JSX through this same predicate.
            // The completed probe below still rejects emitted Vapor helpers.
            CompiledListSafety::Probing => true,
            CompiledListSafety::Resolved(safe) => safe,
        };
    }
    COMPILED_LIST_SAFETY_CACHE
        .with(|cache| cache.borrow_mut().insert(cache_key, CompiledListSafety::Probing));
    let mut probe = vt.clone();
    let mut stmts = Vec::new();
    if !crate::element_list::try_build_list_from_map(
        &mut probe,
        &crate::emit::ident("_$compiledListProbe"),
        call,
        &mut stmts,
    ) {
        COMPILED_LIST_SAFETY_CACHE.with(|cache| {
            cache.borrow_mut().insert(cache_key, CompiledListSafety::Resolved(false));
        });
        return false;
    }
    let emitted = !stmts.is_empty();
    let block = BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts };
    let mut detector = VaporCapabilityDetector::default();
    block.visit_with(&mut detector);
    let safe = emitted && !detector.found;
    COMPILED_LIST_SAFETY_CACHE.with(|cache| {
        cache.borrow_mut().insert(cache_key, CompiledListSafety::Resolved(safe));
    });
    safe
}

pub(crate) fn is_compiled_safe_element(vt: &VaporTransform, element: &JSXElement) -> bool {
    let shadowed_names = vt.current_scalar_constructor_shadows();
    compiled_scalar_element_is_safe(vt, element, &shadowed_names)
}

pub(crate) fn is_compiled_safe_fragment(vt: &VaporTransform, fragment: &JSXFragment) -> bool {
    let shadowed_names = vt.current_scalar_constructor_shadows();
    fragment.children.iter().all(|child| compiled_child_is_safe(vt, child, &shadowed_names))
}

fn append_direct(parent: &Ident, child: Expr, stmts: &mut Vec<Stmt>) {
    stmts.push(Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(crate::emit::call_ident(
            "_$compiledAppendChild",
            vec![Expr::Ident(parent.clone()), child],
        )),
    }));
}

fn create_text_node(value: Expr) -> Expr {
    crate::emit::call_ident("_$compiledCreateTextNode", vec![value])
}

fn emit_compiled_static_expr_child(
    parent: &Ident,
    expression: &Expr,
    stmts: &mut Vec<Stmt>,
) -> bool {
    if crate::utils::is_static_empty_like(expression) {
        append_direct(parent, create_text_node(crate::emit::string_expr("")), stmts);
        return true;
    }
    if let Some(value) = crate::utils::get_static_text_literal_expr(expression) {
        append_direct(parent, create_text_node(value), stmts);
        return true;
    }
    false
}

fn emit_compiled_children(
    vt: &mut VaporTransform,
    parent: &Ident,
    children: &[JSXElementChild],
    stmts: &mut Vec<Stmt>,
) {
    let mut index = 0;
    while index < children.len() {
        let child = &children[index];
        if let JSXElementChild::JSXExprContainer(_) = child {
            let mut group_end = index;
            let mut exprs = Vec::new();
            let mut cursor = index;
            while cursor < children.len() {
                match &children[cursor] {
                    JSXElementChild::JSXText(text)
                        if crate::text::normalize_text(&text.value).trim().is_empty() => {}
                    JSXElementChild::JSXExprContainer(container) => {
                        let JSXExpr::Expr(expr) = &container.expr else {
                            break;
                        };
                        exprs.push(crate::utils::unwrap_expr(expr.as_ref()));
                        group_end = cursor;
                    }
                    _ => break,
                }
                cursor += 1;
            }
            if let Some(branch) =
                crate::element_expr::try_make_compiled_literal_sibling_branch_expr(vt, &exprs)
            {
                let branch_ident = vt.next_el_ident();
                stmts.push(crate::emit::const_decl(branch_ident.clone(), branch));
                stmts.push(Stmt::Expr(ExprStmt {
                    span: DUMMY_SP,
                    expr: Box::new(call_member_expr(
                        Expr::Ident(branch_ident),
                        "__rue_compiled_mount",
                        vec![Expr::Ident(parent.clone())],
                    )),
                }));
                index = group_end + 1;
                continue;
            }
        }
        match child {
            JSXElementChild::JSXText(text) => {
                let normalized = crate::text::normalize_text(&text.value);
                if let Some(content) =
                    crate::text::compute_jsx_text_content(children, index, &normalized)
                {
                    append_direct(
                        parent,
                        create_text_node(crate::emit::string_expr(&content)),
                        stmts,
                    );
                }
            }
            JSXElementChild::JSXFragment(fragment) => {
                emit_compiled_children(vt, parent, &fragment.children, stmts)
            }
            JSXElementChild::JSXExprContainer(container) => {
                if let JSXExpr::Expr(expr) = &container.expr
                    && crate::element_expr::is_compiled_slot_expr(vt, expr.as_ref())
                {
                    let anchor = vt.next_el_ident();
                    stmts.push(crate::emit::const_decl(
                        anchor.clone(),
                        crate::emit::call_ident(
                            "_$compiledCreateComment",
                            vec![crate::emit::string_expr("rue:compiled-slot")],
                        ),
                    ));
                    append_direct(parent, Expr::Ident(anchor.clone()), stmts);
                    crate::element_slot::render_between_for_slot_at(
                        vt,
                        parent,
                        &anchor,
                        expr.as_ref(),
                        stmts,
                    );
                    index += 1;
                    continue;
                }
                let list_stmt_start = stmts.len();
                if let JSXExpr::Expr(expr) = &container.expr
                    && let Expr::Call(call) = crate::utils::unwrap_expr(expr.as_ref())
                    && crate::element_list::try_build_list_from_map(vt, parent, call, stmts)
                    && stmts.len() > list_stmt_start
                {
                    index += 1;
                    continue;
                }
                if let JSXExpr::Expr(expr) = &container.expr
                    && emit_compiled_static_expr_child(parent, expr.as_ref(), stmts)
                {
                    index += 1;
                    continue;
                }
                if let JSXExpr::Expr(expr) = &container.expr
                    && let Some(branch) = crate::element_expr::try_make_compiled_branch_expr(
                        vt,
                        crate::utils::unwrap_expr(expr.as_ref()),
                    )
                {
                    let branch_ident = vt.next_el_ident();
                    stmts.push(crate::emit::const_decl(branch_ident.clone(), branch));
                    stmts.push(Stmt::Expr(ExprStmt {
                        span: DUMMY_SP,
                        expr: Box::new(call_member_expr(
                            Expr::Ident(branch_ident),
                            "__rue_compiled_mount",
                            vec![Expr::Ident(parent.clone())],
                        )),
                    }));
                    index += 1;
                    continue;
                }
                if crate::vapor::emit_compiled_text_binding(vt, parent, container, stmts).is_none()
                    && let JSXExpr::Expr(expr) = &container.expr
                {
                    let anchor = vt.next_el_ident();
                    stmts.push(crate::emit::const_decl(
                        anchor.clone(),
                        crate::emit::call_ident(
                            "_$compiledCreateComment",
                            vec![crate::emit::string_expr("rue:compiled-slot")],
                        ),
                    ));
                    append_direct(parent, Expr::Ident(anchor.clone()), stmts);
                    crate::element_slot::render_between_for_slot_at(
                        vt,
                        parent,
                        &anchor,
                        expr.as_ref(),
                        stmts,
                    );
                }
            }
            JSXElementChild::JSXElement(element) => {
                if !crate::element_component::try_build_compiled_component_element(
                    vt, element, parent, stmts,
                ) && !crate::element_component::try_build_compiled_opaque_component_element(
                    vt, element, parent, stmts,
                ) {
                    emit_compiled_element(vt, element, parent, stmts);
                }
            }
            JSXElementChild::JSXSpreadChild(_) => {}
        }
        index += 1;
    }
}

fn emit_compiled_element(
    vt: &mut VaporTransform,
    element: &JSXElement,
    parent: &Ident,
    stmts: &mut Vec<Stmt>,
) {
    if crate::vapor::template::emit_marked_template_child(vt, element, parent, stmts) {
        return;
    }
    let tag = compiled_tag_name(element).expect("compiled element must have a native HTML tag");
    let target = vt.next_el_ident();
    let create = crate::emit::call_ident(
        "_$compiledCreateElement",
        vec![crate::emit::string_expr(&tag), Expr::Ident(parent.clone())],
    );
    stmts.push(crate::emit::const_decl(target.clone(), create));
    append_direct(parent, Expr::Ident(target.clone()), stmts);
    crate::attrs::emit_compiled_attrs_for(vt, stmts, &target, &element.opening);
    emit_compiled_children(vt, &target, &element.children, stmts);
}

fn member_expr(object: Expr, property: &str) -> Expr {
    Expr::Member(MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(object),
        prop: MemberProp::Ident(crate::emit::ident_name(property)),
    })
}

fn call_member_expr(object: Expr, property: &str, args: Vec<Expr>) -> Expr {
    Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(member_expr(object, property))),
        args: args
            .into_iter()
            .map(|expr| ExprOrSpread { spread: None, expr: Box::new(expr) })
            .collect(),
        type_args: None,
        ctxt: SyntaxContext::empty(),
    })
}

fn child_node_path(root: &Ident, path: &[usize]) -> Expr {
    path.iter().fold(Expr::Ident(root.clone()), |node, index| {
        Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(member_expr(node, "childNodes")),
            prop: MemberProp::Computed(ComputedPropName {
                span: DUMMY_SP,
                expr: Box::new(Expr::Lit(Lit::Num(Number {
                    span: DUMMY_SP,
                    value: *index as f64,
                    raw: None,
                }))),
            }),
        })
    })
}

fn adjacent_sibling_paths(left: &[usize], right: &[usize]) -> bool {
    left.len() == right.len()
        && !left.is_empty()
        && left[..left.len() - 1] == right[..right.len() - 1]
        && right[right.len() - 1] == left[left.len() - 1] + 1
}

fn materialize_compiled_hole_anchor(
    vt: &mut VaporTransform,
    parent: &Ident,
    before: &Expr,
    stmts: &mut Vec<Stmt>,
) -> Ident {
    let anchor = vt.next_el_ident();
    stmts.push(crate::emit::const_decl(
        anchor.clone(),
        crate::emit::call_ident(
            "_$compiledCreateComment",
            vec![crate::emit::string_expr("rue:compiled-slot")],
        ),
    ));
    stmts.push(Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(call_member_expr(
            Expr::Ident(parent.clone()),
            "insertBefore",
            vec![Expr::Ident(anchor.clone()), before.clone()],
        )),
    }));
    anchor
}

fn compiled_dynamic_template_to_block(
    vt: &mut VaporTransform,
    element: &JSXElement,
) -> Option<BlockStmt> {
    let (template_id, holes, targets) = crate::vapor::template::marked_dynamic_template(element)?;
    let fragment = crate::emit::ident("_fragment");
    let root = crate::emit::ident("_root");
    let mut stmts = vec![
        crate::emit::const_decl(
            fragment.clone(),
            crate::vapor::template::clone_template_expr(template_id),
        ),
        crate::emit::const_decl(root.clone(), member_expr(Expr::Ident(fragment), "firstChild")),
    ];
    let targets = targets
        .into_iter()
        .map(|target| {
            let ident = vt.next_el_ident();
            stmts
                .push(crate::emit::const_decl(ident.clone(), child_node_path(&root, &target.path)));
            (target, ident)
        })
        .collect::<Vec<_>>();
    let anchors = holes
        .iter()
        .map(|hole| {
            if let Some(parent_path) = &hole.parent_path {
                let parent = vt.next_el_ident();
                stmts.push(crate::emit::const_decl(
                    parent.clone(),
                    child_node_path(&root, parent_path),
                ));
                let before = hole
                    .before_path
                    .as_ref()
                    .map(|path| child_node_path(&root, path))
                    .unwrap_or(Expr::Lit(Lit::Null(Null { span: DUMMY_SP })));
                return (hole, parent, before, None, false);
            }
            let anchor = vt.next_el_ident();
            stmts.push(crate::emit::const_decl(anchor.clone(), child_node_path(&root, &hole.path)));
            let parent = vt.next_el_ident();
            stmts.push(crate::emit::const_decl(
                parent.clone(),
                member_expr(Expr::Ident(anchor.clone()), "parentNode"),
            ));
            let direct_text = hole.reuse_text
                && matches!(
                    &hole.source,
                    crate::vapor::template::MarkedHoleSource::Expression(container)
                        if crate::vapor::is_compiled_text_container(vt, container)
                );
            let anchor = if hole.reuse_text && !direct_text {
                crate::element_text::replace_template_text_marker_with_comment(
                    vt,
                    &parent,
                    &anchor,
                    hole.index,
                    "_$compiledCreateComment",
                    &mut stmts,
                )
            } else {
                anchor
            };
            (hole, parent, Expr::Ident(anchor.clone()), Some(anchor), direct_text)
        })
        .collect::<Vec<_>>();

    for (target, ident) in targets {
        crate::attrs::emit_compiled_attrs_for(vt, &mut stmts, &ident, target.opening);
    }
    let mut anchor_index = 0;
    while anchor_index < anchors.len() {
        let (hole, parent, before, anchor, direct_text) = &anchors[anchor_index];
        let expected_index = anchor_index;
        if hole.index != expected_index {
            return None;
        }
        if *direct_text {
            let crate::vapor::template::MarkedHoleSource::Expression(container) = &hole.source
            else {
                return None;
            };
            crate::vapor::emit_compiled_text_effect(
                vt,
                anchor.as_ref().expect("direct text keeps its text node"),
                container,
                &mut stmts,
            )?;
            anchor_index += 1;
            continue;
        }
        if anchor.is_some()
            && matches!(hole.source, crate::vapor::template::MarkedHoleSource::Expression(_))
        {
            let mut group_end = anchor_index;
            let mut exprs = Vec::new();
            while group_end < anchors.len() {
                let candidate = anchors[group_end].0;
                if group_end > anchor_index
                    && !adjacent_sibling_paths(
                        anchors[group_end - 1].0.path.as_slice(),
                        candidate.path.as_slice(),
                    )
                {
                    break;
                }
                let crate::vapor::template::MarkedHoleSource::Expression(container) =
                    &candidate.source
                else {
                    break;
                };
                let JSXExpr::Expr(expr) = &container.expr else {
                    break;
                };
                exprs.push(crate::utils::unwrap_expr(expr.as_ref()));
                group_end += 1;
            }
            if let Some(branch) =
                crate::element_expr::try_make_compiled_literal_sibling_branch_expr(vt, &exprs)
            {
                let reader = crate::element_expr::compiled_branch_reader_from_handle(&branch)
                    .expect("literal sibling branch must expose a reader");
                crate::element_slot::render_compiled_branch_for_slot_at(
                    vt, parent, before, &reader, &mut stmts,
                );
                for (_, extra_parent, _, extra_anchor, _) in
                    anchors.iter().take(group_end).skip(anchor_index + 1)
                {
                    stmts.push(Stmt::Expr(ExprStmt {
                        span: DUMMY_SP,
                        expr: Box::new(call_member_expr(
                            Expr::Ident(extra_parent.clone()),
                            "removeChild",
                            vec![Expr::Ident(
                                extra_anchor.clone().expect("grouped holes retain comments"),
                            )],
                        )),
                    }));
                }
                anchor_index = group_end;
                continue;
            }
        }
        match &hole.source {
            crate::vapor::template::MarkedHoleSource::Expression(container) => {
                if let JSXExpr::Expr(expr) = &container.expr
                    && !crate::vapor::is_compiled_reactive_scalar_expr(
                        vt,
                        expr.as_ref(),
                        &vt.current_scalar_constructor_shadows(),
                    )
                    && !crate::element_expr::is_proven_plain_call_expr(vt, expr.as_ref())
                    && !is_compiled_row_text_call(vt, expr.as_ref())
                    && let Some(branch) =
                        crate::element_expr::try_make_compiled_branch_reader(vt, expr.as_ref())
                {
                    crate::element_slot::render_compiled_branch_for_slot_at(
                        vt, parent, before, &branch, &mut stmts,
                    );
                    anchor_index += 1;
                    continue;
                }
                let list_stmt_start = stmts.len();
                if let JSXExpr::Expr(expr) = &container.expr
                    && anchor.is_none()
                    && crate::element_expr::is_compiled_slot_expr(vt, expr.as_ref())
                {
                    crate::element_slot::render_compiled_slot_for_at(
                        vt,
                        parent,
                        before,
                        expr.as_ref(),
                        &mut stmts,
                    );
                    anchor_index += 1;
                    continue;
                }
                let anchor = anchor.clone().unwrap_or_else(|| {
                    materialize_compiled_hole_anchor(vt, parent, before, &mut stmts)
                });
                if let JSXExpr::Expr(expr) = &container.expr
                    && let Expr::Call(call) = crate::utils::unwrap_expr(expr.as_ref())
                    && crate::element_list::try_build_list_from_map_at(
                        vt, parent, &anchor, call, &mut stmts,
                    )
                    && stmts.len() > list_stmt_start
                {
                    anchor_index += 1;
                    continue;
                }
                if let JSXExpr::Expr(expr) = &container.expr
                    && (crate::element_expr::is_compiled_slot_expr(vt, expr.as_ref())
                        || (!crate::vapor::is_compiled_reactive_scalar_expr(
                            vt,
                            expr.as_ref(),
                            &vt.current_scalar_constructor_shadows(),
                        ) && !crate::element_expr::is_proven_plain_call_expr(
                            vt,
                            expr.as_ref(),
                        ) && !is_compiled_row_text_call(vt, expr.as_ref())))
                {
                    crate::element_slot::render_between_for_slot_at(
                        vt,
                        parent,
                        &anchor,
                        expr.as_ref(),
                        &mut stmts,
                    );
                    anchor_index += 1;
                    continue;
                }
                let text = vt.next_el_ident();
                stmts.push(crate::emit::const_decl(
                    text.clone(),
                    crate::emit::call_ident(
                        "_$compiledCreateTextNode",
                        vec![crate::emit::string_expr("")],
                    ),
                ));
                stmts.push(Stmt::Expr(ExprStmt {
                    span: DUMMY_SP,
                    expr: Box::new(call_member_expr(
                        Expr::Ident(parent.clone()),
                        "insertBefore",
                        vec![Expr::Ident(text.clone()), Expr::Ident(anchor.clone())],
                    )),
                }));
                stmts.push(Stmt::Expr(ExprStmt {
                    span: DUMMY_SP,
                    expr: Box::new(call_member_expr(
                        Expr::Ident(parent.clone()),
                        "removeChild",
                        vec![Expr::Ident(anchor.clone())],
                    )),
                }));
                crate::vapor::emit_compiled_text_effect(vt, &text, container, &mut stmts)?;
            }
            crate::vapor::template::MarkedHoleSource::OpaqueElement(element) => {
                let anchor = anchor.clone().unwrap_or_else(|| {
                    materialize_compiled_hole_anchor(vt, parent, before, &mut stmts)
                });
                crate::elements::build_element_at(vt, element, parent, &anchor, &mut stmts);
            }
        }
        anchor_index += 1;
    }
    stmts.push(crate::emit::return_root(root));
    Some(BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts })
}

/// Build the setup body consumed by `_$compiledRoot`.
pub(crate) fn compiled_scalar_element_to_block(
    vt: &mut VaporTransform,
    element: &JSXElement,
) -> BlockStmt {
    if let Some(block) = compiled_dynamic_template_to_block(vt, element) {
        return block;
    }
    let root = crate::emit::ident("_root");
    let tag = compiled_tag_name(element).expect("compiled root must have a native HTML tag");
    let create = crate::emit::call_ident(
        "_$compiledCreateElement",
        vec![
            crate::emit::string_expr(&tag),
            Expr::Ident(crate::emit::ident("__rue_parent_context")),
        ],
    );
    let mut stmts = vec![crate::emit::const_decl(root.clone(), create)];
    crate::attrs::emit_compiled_attrs_for(vt, &mut stmts, &root, &element.opening);
    emit_compiled_children(vt, &root, &element.children, &mut stmts);
    stmts.push(crate::emit::return_root(root));
    BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts }
}

/// Build a safe Fragment setup body without pulling in the Vapor DOM layer.
pub(crate) fn compiled_fragment_to_block(
    vt: &mut VaporTransform,
    fragment: &JSXFragment,
) -> BlockStmt {
    let root = crate::emit::ident("_root");
    let create = crate::emit::call_ident("_$createDocumentFragment", vec![]);
    let mut stmts = vec![crate::emit::const_decl(root.clone(), create)];
    emit_compiled_children(vt, &root, &fragment.children, &mut stmts);
    stmts.push(crate::emit::return_root(root));
    BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts }
}

/// Every root setup has one compiler-known return range; no runtime value classification.
pub(crate) fn close_root_setup(mut setup: Expr) -> Expr {
    let Expr::Arrow(arrow) = &mut setup else { return setup };
    let BlockStmtOrExpr::BlockStmt(block) = arrow.body.as_mut() else { return setup };
    let Some(Stmt::Return(ReturnStmt { arg: Some(host), .. })) = block.stmts.last() else {
        return setup;
    };
    if matches!(host.as_ref(), Expr::Array(_)) {
        return setup;
    }
    let host = host.as_ref().clone();
    let fragment = if let Expr::Ident(root) = &host {
        block.stmts.iter().any(|stmt| {
            let Stmt::Decl(Decl::Var(decl)) = stmt else { return false };
            decl.decls.iter().any(|decl| {
                let Pat::Ident(binding) = &decl.name else { return false };
                if binding.id.sym != root.sym { return false; }
                let Some(init) = &decl.init else { return false };
                let Expr::Call(call) = init.as_ref() else { return false };
                let Callee::Expr(callee) = &call.callee else { return false };
                matches!(callee.as_ref(), Expr::Ident(id) if id.sym == *"_$createDocumentFragment") ||
                matches!(callee.as_ref(), Expr::Member(member) if matches!(&member.prop, MemberProp::Ident(id) if id.sym == *"createDocumentFragment"))
            })
        })
    } else {
        false
    };
    if fragment && block.stmts.len() > 2 {
        // Stable empty text boundaries survive replacement of a fragment's edge branches.
        let first = crate::emit::ident("__rue_first");
        let last = crate::emit::ident("__rue_last");
        let at = block.stmts.len() - 1;
        let statements = vec![
            crate::emit::const_decl(
                first.clone(),
                crate::emit::call_ident(
                    "_$compiledCreateTextNode",
                    vec![crate::emit::string_expr("")],
                ),
            ),
            crate::emit::const_decl(
                last.clone(),
                crate::emit::call_ident(
                    "_$compiledCreateTextNode",
                    vec![crate::emit::string_expr("")],
                ),
            ),
            Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(call_member_expr(
                    host.clone(),
                    "insertBefore",
                    vec![Expr::Ident(first), member_expr(host.clone(), "firstChild")],
                )),
            }),
            Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(call_member_expr(
                    host.clone(),
                    "appendChild",
                    vec![Expr::Ident(last)],
                )),
            }),
        ];
        block.stmts.splice(at..at, statements);
    }
    let first = if fragment { member_expr(host.clone(), "firstChild") } else { host.clone() };
    let last = if fragment { member_expr(host, "lastChild") } else { host };
    *block.stmts.last_mut().unwrap() = Stmt::Return(ReturnStmt {
        span: DUMMY_SP,
        arg: Some(Box::new(Expr::Array(ArrayLit {
            span: DUMMY_SP,
            elems: vec![
                Some(ExprOrSpread { spread: None, expr: Box::new(first) }),
                Some(ExprOrSpread { spread: None, expr: Box::new(last) }),
            ],
        }))),
    });
    setup
}

pub(crate) fn compiled_block_to_root_expr(block: BlockStmt) -> Expr {
    let setup = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![Pat::Ident(BindingIdent {
            id: crate::emit::ident("__rue_parent_context"),
            type_ann: None,
        })],
        body: Box::new(BlockStmtOrExpr::BlockStmt(block)),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    crate::emit::call_ident("_$compiledRoot", vec![setup])
}

#[cfg(test)]
#[path = "element_children_tests.rs"]
mod tests;
