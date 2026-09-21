use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::atoms::Atom;

use crate::emit::*;
use crate::vapor::VaporTransform;

const COMPONENT_NATIVE_EVENT_PREFIX: &str = "__rueNativeOn";

/*
元素级组件编译：
- 目标：在父元素下以注释锚点占位，通过 compiled slot ABI 将组件输出插到锚点前；
- children 处理：默认编译为 props.children 的 DocumentFragment；对于默认需要原始 keyed JSX children 的内建组件（如 TransitionGroup），保留原始 JSX children；
- 内建 Fragment：若 children 已被改写为独立可挂载值，则直接渲染该值，不再额外包一层 <Fragment children={...}/>；
- 组件输出统一交给 compiled slot/component ABI；响应式 props 由组件挂载协议更新。
*/
pub(crate) struct ComponentChildrenRewrite {
    pub(crate) stmts: Vec<Stmt>,
    pub(crate) direct_render_expr: Option<Expr>,
}

pub(crate) fn component_expr_with_prelude(mut stmts: Vec<Stmt>, expr: Expr) -> Expr {
    if stmts.is_empty() {
        return expr;
    }

    stmts.push(Stmt::Return(ReturnStmt { span: DUMMY_SP, arg: Some(Box::new(expr)) }));
    Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Paren(ParenExpr {
            span: DUMMY_SP,
            expr: Box::new(Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                params: vec![],
                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    stmts,
                })),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
            })),
        }))),
        args: vec![],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    })
}

pub(crate) fn jsx_name_to_expr(name: &JSXElementName) -> Option<Expr> {
    fn jsx_object_to_expr(obj: &JSXObject) -> Option<Expr> {
        match obj {
            JSXObject::Ident(id) => Some(Expr::Ident(id.clone())),
            JSXObject::JSXMemberExpr(member) => Some(Expr::Member(MemberExpr {
                span: DUMMY_SP,
                obj: Box::new(jsx_object_to_expr(&member.obj)?),
                prop: MemberProp::Ident(member.prop.clone()),
            })),
        }
    }

    match name {
        JSXElementName::Ident(id) => Some(Expr::Ident(id.clone())),
        JSXElementName::JSXMemberExpr(member) => Some(Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(jsx_object_to_expr(&member.obj)?),
            prop: MemberProp::Ident(member.prop.clone()),
        })),
        JSXElementName::JSXNamespacedName(_) => None,
    }
}

fn jsx_name_root_ident(name: &JSXElementName) -> Option<&Ident> {
    fn object_root(object: &JSXObject) -> &Ident {
        match object {
            JSXObject::Ident(ident) => ident,
            JSXObject::JSXMemberExpr(member) => object_root(&member.obj),
        }
    }

    match name {
        JSXElementName::Ident(ident) => Some(ident),
        JSXElementName::JSXMemberExpr(member) => Some(object_root(&member.obj)),
        JSXElementName::JSXNamespacedName(_) => None,
    }
}

fn jsx_name_leaf(name: &JSXElementName) -> Option<&str> {
    match name {
        JSXElementName::Ident(ident) => Some(ident.sym.as_ref()),
        JSXElementName::JSXMemberExpr(member) => Some(member.prop.sym.as_ref()),
        JSXElementName::JSXNamespacedName(_) => None,
    }
}

fn jsx_attr_value_to_expr(value: &JSXAttrValue) -> Option<Expr> {
    match value {
        JSXAttrValue::Str(s) => {
            Some(Expr::Lit(Lit::Str(Str { span: DUMMY_SP, value: s.value.clone(), raw: None })))
        }
        JSXAttrValue::JSXExprContainer(ec) => match &ec.expr {
            JSXExpr::Expr(expr) => Some(crate::utils::unwrap_expr(expr.as_ref()).clone()),
            JSXExpr::JSXEmptyExpr(_) => None,
        },
        JSXAttrValue::JSXElement(el) => Some(Expr::JSXElement(el.clone())),
        JSXAttrValue::JSXFragment(frag) => Some(Expr::JSXFragment(frag.clone())),
    }
}

fn is_safe_prop_ident(name: &str) -> bool {
    let mut chars = name.chars();
    let Some(first) = chars.next() else {
        return false;
    };

    let is_ident_start = |ch: char| ch == '$' || ch == '_' || ch.is_ascii_alphabetic();
    let is_ident_continue = |ch: char| is_ident_start(ch) || ch.is_ascii_digit();

    is_ident_start(first) && chars.all(is_ident_continue)
}

fn jsx_attr_name_to_prop_name(name: &JSXAttrName) -> Option<PropName> {
    match name {
        JSXAttrName::Ident(id) => {
            let raw = id.sym.as_ref();
            if is_safe_prop_ident(raw) {
                Some(PropName::Ident(id.clone()))
            } else {
                Some(PropName::Str(str_lit(raw)))
            }
        }
        JSXAttrName::JSXNamespacedName(_) => None,
    }
}

fn jsx_attrs_has_ident(attrs: &[JSXAttrOrSpread], name: &str) -> bool {
    attrs.iter().any(|attr| {
        matches!(attr, JSXAttrOrSpread::JSXAttr(JSXAttr {
            name: JSXAttrName::Ident(id),
            ..
        }) if id.sym.as_ref() == name)
    })
}

pub(crate) fn remove_jsx_attr_ident(attrs: &mut Vec<JSXAttrOrSpread>, name: &str) {
    attrs.retain(|attr| {
        !matches!(attr, JSXAttrOrSpread::JSXAttr(JSXAttr {
            name: JSXAttrName::Ident(id),
            ..
        }) if id.sym.as_ref() == name)
    });
}

pub(crate) fn extract_slot_name_expr(attrs: &[JSXAttrOrSpread]) -> Option<Expr> {
    for attr in attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            continue;
        };
        let JSXAttrName::Ident(name) = &attr.name else {
            continue;
        };
        if name.sym.as_ref() != "slot" {
            continue;
        }
        return attr.value.as_ref().and_then(jsx_attr_value_to_expr);
    }
    None
}

fn is_slot_component(el: &JSXElement) -> bool {
    match &el.opening.name {
        JSXElementName::Ident(id) => id.sym.as_ref() == "Slot",
        JSXElementName::JSXMemberExpr(expr) => expr.prop.sym.as_ref() == "Slot",
        _ => false,
    }
}

fn is_template_component(el: &JSXElement) -> bool {
    match &el.opening.name {
        JSXElementName::Ident(id) => id.sym.as_ref() == "Template",
        JSXElementName::JSXMemberExpr(expr) => expr.prop.sym.as_ref() == "Template",
        _ => false,
    }
}

fn is_slot_carrier_wrapper(el: &JSXElement) -> bool {
    crate::utils::is_builtin_fragment_element(el) || is_template_component(el)
}

fn current_instance_props_ro_expr() -> Expr {
    let current_instance_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("getCurrentInstance")))),
        args: vec![],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });

    Expr::Bin(BinExpr {
        span: DUMMY_SP,
        op: BinaryOp::LogicalAnd,
        left: Box::new(current_instance_call.clone()),
        right: Box::new(Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(current_instance_call),
            prop: MemberProp::Ident(ident_name("propsRO")),
        })),
    })
}

fn make_source_attr() -> JSXAttrOrSpread {
    JSXAttrOrSpread::JSXAttr(JSXAttr {
        span: DUMMY_SP,
        name: JSXAttrName::Ident(IdentName { span: DUMMY_SP, sym: Atom::from("source") }),
        value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
            span: DUMMY_SP,
            expr: JSXExpr::Expr(Box::new(current_instance_props_ro_expr())),
        })),
    })
}

fn is_function_literal_expr(expr: &Expr) -> bool {
    matches!(crate::utils::unwrap_expr(expr), Expr::Arrow(_) | Expr::Fn(_))
}

pub(crate) struct LoweredSlotValue {
    pub(crate) stmts: Vec<Stmt>,
    pub(crate) expr: Expr,
    pub(crate) is_function: bool,
}

fn undefined_expr() -> Expr {
    Expr::Ident(ident("undefined"))
}

fn is_substantive_slot_child(child: &JSXElementChild) -> bool {
    match child {
        JSXElementChild::JSXText(text) => {
            !crate::text::normalize_text(&text.value).trim().is_empty()
        }
        JSXElementChild::JSXExprContainer(ec) => match &ec.expr {
            JSXExpr::JSXEmptyExpr(_) => false,
            JSXExpr::Expr(expr) => {
                !crate::utils::is_static_empty_like(crate::utils::unwrap_expr(expr.as_ref()))
            }
        },
        _ => true,
    }
}

fn lower_expr_slot_value(vt: &mut VaporTransform, expr: &Expr) -> Option<LoweredSlotValue> {
    match crate::utils::unwrap_expr(expr) {
        Expr::JSXElement(jsx_el) => {
            if crate::element_children::is_compiled_safe_element(vt, jsx_el) {
                let block = crate::element_children::compiled_scalar_element_to_block(vt, jsx_el);
                let child_ident = vt.next_child_ident();
                return Some(LoweredSlotValue {
                    stmts: vec![const_decl(
                        child_ident.clone(),
                        crate::element_children::compiled_block_to_root_expr(block),
                    )],
                    expr: Expr::Ident(child_ident),
                    is_function: false,
                });
            }
            // 表达式本身就是 JSX：把它临时当成一个 child 交给统一 slot lowering。
            let wrapped = vec![JSXElementChild::JSXElement(jsx_el.clone())];
            lower_slot_value(vt, &wrapped)
        }
        Expr::JSXFragment(jsx_frag) => {
            // Fragment 与 JSXElement 一样，最终都要变成可挂载的 slot 值。
            let wrapped = vec![JSXElementChild::JSXFragment(jsx_frag.clone())];
            lower_slot_value(vt, &wrapped)
        }
        Expr::Cond(CondExpr { test, cons, alt, .. }) => {
            let cons_inner = crate::utils::unwrap_expr(cons.as_ref());
            let alt_inner = crate::utils::unwrap_expr(alt.as_ref());

            let branch_uses_router_fast_path = |branch: &Expr| {
                matches!(branch, Expr::JSXElement(element)
                    if crate::router_link::rewrite_router_link_fast_path(element).is_some())
            };
            if (branch_uses_router_fast_path(cons_inner) || branch_uses_router_fast_path(alt_inner))
                && let (Some(lowered_cons), Some(lowered_alt)) =
                    (lower_expr_slot_value(vt, cons_inner), lower_expr_slot_value(vt, alt_inner))
            {
                let mut stmts = lowered_cons.stmts;
                stmts.extend(lowered_alt.stmts);
                return Some(LoweredSlotValue {
                    stmts,
                    expr: Expr::Cond(CondExpr {
                        span: DUMMY_SP,
                        test: test.clone(),
                        cons: Box::new(lowered_cons.expr),
                        alt: Box::new(lowered_alt.expr),
                    }),
                    is_function: false,
                });
            }

            // 只在“一边是 slot，一边是静态空值”的情况下折叠。
            // 两边都复杂时交给上层插槽表达式编译，避免丢失分支语义。
            if let Some(lowered_cons) = lower_expr_slot_value(vt, cons_inner)
                && crate::utils::is_static_empty_like(alt_inner)
            {
                return Some(LoweredSlotValue {
                    stmts: lowered_cons.stmts,
                    expr: Expr::Cond(CondExpr {
                        span: DUMMY_SP,
                        test: test.clone(),
                        cons: Box::new(lowered_cons.expr),
                        alt: Box::new(undefined_expr()),
                    }),
                    is_function: false,
                });
            }

            if let Some(lowered_alt) = lower_expr_slot_value(vt, alt_inner)
                && crate::utils::is_static_empty_like(cons_inner)
            {
                return Some(LoweredSlotValue {
                    stmts: lowered_alt.stmts,
                    expr: Expr::Cond(CondExpr {
                        span: DUMMY_SP,
                        test: test.clone(),
                        cons: Box::new(undefined_expr()),
                        alt: Box::new(lowered_alt.expr),
                    }),
                    is_function: false,
                });
            }

            None
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, left, right, .. }) => {
            // `ok && <Slot/>` 转成 `ok ? loweredSlot : undefined`，
            // 让 slot bag 不渲染空分支，而不是塞入布尔值。
            let lowered_right =
                lower_expr_slot_value(vt, crate::utils::unwrap_expr(right.as_ref()))?;

            Some(LoweredSlotValue {
                stmts: lowered_right.stmts,
                expr: Expr::Cond(CondExpr {
                    span: DUMMY_SP,
                    test: left.clone(),
                    cons: Box::new(lowered_right.expr),
                    alt: Box::new(undefined_expr()),
                }),
                is_function: false,
            })
        }
        Expr::Call(call)
            if crate::element_expr::contains_jsx_in_expr(&Expr::Call(call.clone())) =>
        {
            // memoized/map/自定义 render helper 若返回 JSX，统一转成可挂载 slot 表达式。
            Some(LoweredSlotValue {
                stmts: vec![],
                expr: crate::element_expr::make_expr_for_slot(vt, expr),
                is_function: false,
            })
        }
        _ => None,
    }
}

pub(crate) fn lower_slot_value(
    vt: &mut VaporTransform,
    children: &[JSXElementChild],
) -> Option<LoweredSlotValue> {
    let has_substantive_child = children.iter().any(is_substantive_slot_child);

    if !has_substantive_child {
        // 纯空白、空表达式、null/false 这类 children 不生成 slot prop。
        return None;
    }

    let simple_children: Vec<&JSXElementChild> =
        children.iter().filter(|child| is_substantive_slot_child(child)).collect();

    if simple_children.len() == 1 {
        match simple_children[0] {
            JSXElementChild::JSXElement(el_box)
                if crate::utils::is_component(&el_box.opening.name)
                    && crate::router_link::rewrite_router_link_fast_path(el_box).is_none() =>
            {
                // 单个组件 child 可以先创建组件实例，再把实例标识符直接作为 children。
                // 这样避免额外包一层 DocumentFragment，slot 结构更薄。
                let mut child_component = (**el_box).clone();
                let rewrite = rewrite_component_children_to_props(vt, &mut child_component);
                let mount_expr = rewrite
                    .direct_render_expr
                    .clone()
                    .unwrap_or_else(|| build_component_mount_expr(&child_component));
                let child_ident = vt.next_child_ident();
                let mut stmts = rewrite.stmts;
                stmts.push(const_decl(child_ident.clone(), mount_expr));

                return Some(LoweredSlotValue {
                    stmts,
                    expr: Expr::Ident(child_ident),
                    is_function: false,
                });
            }
            JSXElementChild::JSXText(text) => {
                // 单个文本 child 直接降为字符串 prop，组件无需再执行 _$compiledRoot setup。
                let normalized = crate::text::normalize_text(&text.value);
                if let Some(content) =
                    crate::text::compute_jsx_text_content(children, 0, &normalized)
                {
                    return Some(LoweredSlotValue {
                        stmts: vec![],
                        expr: string_expr(&content),
                        is_function: false,
                    });
                }
            }
            JSXElementChild::JSXExprContainer(ec) => {
                if let JSXExpr::Expr(expr) = &ec.expr {
                    let inner = crate::utils::unwrap_expr(expr.as_ref());
                    // 表达式里如果能继续降成 slot 值，优先复用递归 lowering。
                    if let Some(lowered) = lower_expr_slot_value(vt, inner) {
                        return Some(lowered);
                    }
                    match inner {
                        Expr::Lit(Lit::Str(_)) | Expr::Lit(Lit::Num(_)) => {
                            return Some(LoweredSlotValue {
                                stmts: vec![],
                                expr: inner.clone(),
                                is_function: false,
                            });
                        }
                        _ if !crate::element_expr::contains_jsx_in_expr(inner) => {
                            // 普通表达式（含函数字面量）直接作为 children；
                            // 函数字面量会触发 slot bag，保留 scoped slot 语义。
                            return Some(LoweredSlotValue {
                                stmts: vec![],
                                expr: inner.clone(),
                                is_function: is_function_literal_expr(inner),
                            });
                        }
                        _ => {}
                    }
                }
            }
            _ => {}
        }
    }

    if simple_children.len() > 1 {
        let mut stmts = Vec::new();
        let mut elems = Vec::with_capacity(simple_children.len());
        let mut lowered_all = true;
        for child in &simple_children {
            let compiled_native = match child {
                JSXElementChild::JSXElement(element)
                    if crate::element_children::is_compiled_safe_element(vt, element) =>
                {
                    if vt.static_templates
                        && let Some((expr, reserved_elements)) =
                            crate::vapor::template::static_root_handle_expr(element)
                    {
                        vt.next_el += reserved_elements;
                        Some(LoweredSlotValue { stmts: vec![], expr, is_function: false })
                    } else {
                        let block =
                            crate::element_children::compiled_scalar_element_to_block(vt, element);
                        Some(LoweredSlotValue {
                            stmts: vec![],
                            expr: crate::element_children::compiled_block_to_root_expr(block),
                            is_function: false,
                        })
                    }
                }
                _ => None,
            };
            let recursively_lowered = if compiled_native.is_none() {
                let single = vec![(*child).clone()];
                lower_slot_value(vt, &single)
            } else {
                None
            };
            let Some(lowered) = compiled_native.or(recursively_lowered) else {
                lowered_all = false;
                break;
            };
            stmts.extend(lowered.stmts);
            elems.push(Some(ExprOrSpread { spread: None, expr: Box::new(lowered.expr) }));
        }
        if lowered_all {
            return Some(LoweredSlotValue {
                stmts,
                expr: Expr::Array(ArrayLit { span: DUMMY_SP, elems }),
                is_function: false,
            });
        }
    }

    let child_ident = vt.next_child_ident();
    let child_root = ident("_root");
    // 多 child 或复杂 child 需要包装成独立 _$compiledRoot 片段，作为可挂载 children 值传入组件。
    let mut child_body: Vec<Stmt> =
        vec![const_decl(child_root.clone(), call_ident("_$createDocumentFragment", vec![]))];
    crate::element_children::emit_element_children(vt, &child_root, children, &mut child_body);
    child_body.push(return_root(child_root.clone()));
    let arrow = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: child_body,
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    let child_vapor = call_ident("_$compiledRoot", vec![arrow]);

    Some(LoweredSlotValue {
        stmts: vec![const_decl(child_ident.clone(), child_vapor)],
        expr: Expr::Ident(child_ident),
        is_function: false,
    })
}

fn lower_named_slot_element(
    vt: &mut VaporTransform,
    jsx_el: &JSXElement,
) -> Option<(Expr, LoweredSlotValue)> {
    let slot_name_expr = extract_slot_name_expr(&jsx_el.opening.attrs)?;
    let mut slot_el = jsx_el.clone();
    // slot 属性只用于编译期决定 slot 名，传给真实 child 前必须移除。
    remove_jsx_attr_ident(&mut slot_el.opening.attrs, "slot");
    let lowered = if is_slot_carrier_wrapper(&slot_el) {
        // Fragment/Template 是 slot 内容承载壳，本身不应该成为 slot 子节点。
        lower_slot_value(vt, &slot_el.children)
    } else {
        let wrapped = vec![JSXElementChild::JSXElement(Box::new(slot_el))];
        lower_slot_value(vt, &wrapped)
    }?;
    Some((slot_name_expr, lowered))
}

pub(crate) fn lower_named_slot_expr(
    vt: &mut VaporTransform,
    expr: &Expr,
) -> Option<(Expr, LoweredSlotValue)> {
    match crate::utils::unwrap_expr(expr) {
        Expr::JSXElement(jsx_el) => lower_named_slot_element(vt, jsx_el),
        Expr::Cond(CondExpr { test, cons, alt, .. }) => {
            let cons_inner = crate::utils::unwrap_expr(cons.as_ref());
            let alt_inner = crate::utils::unwrap_expr(alt.as_ref());

            if let Some((slot_name_expr, lowered_cons)) = lower_named_slot_expr(vt, cons_inner)
                && crate::utils::is_static_empty_like(alt_inner)
            {
                return Some((
                    slot_name_expr,
                    LoweredSlotValue {
                        stmts: lowered_cons.stmts,
                        expr: Expr::Cond(CondExpr {
                            span: DUMMY_SP,
                            test: test.clone(),
                            cons: Box::new(lowered_cons.expr),
                            alt: Box::new(undefined_expr()),
                        }),
                        is_function: false,
                    },
                ));
            }

            if let Some((slot_name_expr, lowered_alt)) = lower_named_slot_expr(vt, alt_inner)
                && crate::utils::is_static_empty_like(cons_inner)
            {
                return Some((
                    slot_name_expr,
                    LoweredSlotValue {
                        stmts: lowered_alt.stmts,
                        expr: Expr::Cond(CondExpr {
                            span: DUMMY_SP,
                            test: test.clone(),
                            cons: Box::new(undefined_expr()),
                            alt: Box::new(lowered_alt.expr),
                        }),
                        is_function: false,
                    },
                ));
            }

            None
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, left, right, .. }) => {
            let (slot_name_expr, lowered_right) =
                lower_named_slot_expr(vt, crate::utils::unwrap_expr(right.as_ref()))?;

            Some((
                slot_name_expr,
                LoweredSlotValue {
                    stmts: lowered_right.stmts,
                    expr: Expr::Cond(CondExpr {
                        span: DUMMY_SP,
                        test: left.clone(),
                        cons: Box::new(lowered_right.expr),
                        alt: Box::new(undefined_expr()),
                    }),
                    is_function: false,
                },
            ))
        }
        _ => None,
    }
}

pub(crate) fn slot_prop_name(name_expr: Expr) -> PropName {
    match crate::utils::unwrap_expr(&name_expr) {
        Expr::Lit(Lit::Str(str_lit)) => PropName::Str(str_lit.clone()),
        _ => PropName::Computed(ComputedPropName { span: DUMMY_SP, expr: Box::new(name_expr) }),
    }
}

pub(crate) fn build_component_mount_expr(comp_el: &JSXElement) -> Expr {
    let type_expr = jsx_name_to_expr(&comp_el.opening.name).unwrap_or_else(|| string_expr("div"));
    let mut attrs = comp_el.opening.attrs.clone();
    if is_slot_component(comp_el) && !jsx_attrs_has_ident(&attrs, "source") {
        // <Slot> 默认从当前实例的只读 props 上取 slot source，调用方未传时自动补齐。
        attrs.push(make_source_attr());
    }
    let props = attrs
        .iter()
        .filter_map(|attr| match attr {
            JSXAttrOrSpread::SpreadElement(spread) => Some(PropOrSpread::Spread(SpreadElement {
                dot3_token: DUMMY_SP,
                expr: spread.expr.clone(),
            })),
            JSXAttrOrSpread::JSXAttr(attr) => {
                // 无值属性按 JSX 约定视为 true；其它值统一转成 JS 表达式进入 props 对象。
                let value = match &attr.value {
                    Some(value) => jsx_attr_value_to_expr(value)?,
                    None => Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
                };

                if let JSXAttrName::Ident(name) = &attr.name
                    && let Some(event_name) =
                        name.sym.as_ref().strip_prefix(COMPONENT_NATIVE_EVENT_PREFIX)
                {
                    // Imported components do not expose a statically known DOM event target.
                    // Require an explicit DOM boundary instead of scanning their runtime output.
                    let message = format!("Rue component .native event '{event_name}' requires an explicit DOM event boundary; bind the event on a wrapping element instead");
                    if swc_core::common::errors::HANDLER.is_set() {
                        swc_core::common::errors::HANDLER.with(|handler| {
                            handler.struct_span_err(attr.span, &message).emit();
                        });
                    } else {
                        panic!("{message}");
                    }
                    return None;
                }

                let key = jsx_attr_name_to_prop_name(&attr.name)?;
                Some(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key,
                    value: Box::new(value),
                }))))
            }
        })
        .collect();
    // Keep the object explicitly parenthesized. SWC's emitter can otherwise print an arrow
    // expression body containing slot objects as a labelled block (`()=>{ __rue_slots: ... }`),
    // which is syntactically invalid once the nested slot value is itself an object literal.
    let props_expr = Expr::Paren(ParenExpr {
        span: DUMMY_SP,
        expr: Box::new(Expr::Object(ObjectLit { span: DUMMY_SP, props })),
    });
    let read_props = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(props_expr))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    call_ident("_$createComponent", vec![type_expr, read_props])
}

fn dynamic_attr_expr(element: &JSXElement, target: &str) -> Option<Expr> {
    element.opening.attrs.iter().find_map(|attr| {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else { return None };
        let JSXAttrName::Ident(name) = &attr.name else { return None };
        if name.sym.as_ref() != target {
            return None;
        }
        let Some(JSXAttrValue::JSXExprContainer(container)) = &attr.value else { return None };
        let JSXExpr::Expr(expr) = &container.expr else { return None };
        Some(crate::utils::unwrap_expr(expr.as_ref()).clone())
    })
}

pub(crate) fn build_compiled_dynamic_component_expr(
    vt: &mut VaporTransform,
    element: &JSXElement,
) -> Option<Expr> {
    let JSXElementName::Ident(name) = &element.opening.name else { return None };
    if name.sym.as_ref() != "Component" {
        return None;
    }
    let key = dynamic_attr_expr(element, "is")
        .unwrap_or_else(|| panic!("Rue dynamic component requires an explicit is key"));
    let registry = dynamic_attr_expr(element, "registry");
    let mut normalized = element.clone();
    normalized.opening.name = JSXElementName::Ident(ident("__rueDynamicSelected"));
    normalized.opening.attrs.retain(|attr| {
        !matches!(attr, JSXAttrOrSpread::JSXAttr(JSXAttr { name: JSXAttrName::Ident(name), .. }) if matches!(name.sym.as_ref(), "is" | "registry"))
    });
    let read_props = build_compiled_component_read_props(vt, &normalized)?;
    let Some(registry) = registry else {
        let create = Expr::Arrow(ArrowExpr {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            params: vec![],
            body: Box::new(BlockStmtOrExpr::Expr(Box::new(call_ident(
                "_$createDynamicElement",
                vec![key.clone(), read_props],
            )))),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
        });
        let selected = Expr::Object(ObjectLit {
            span: DUMMY_SP,
            props: vec![
                PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident(ident_name("__rue_compiled_branch_key")),
                    value: Box::new(key),
                }))),
                PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident(ident_name("create")),
                    value: Box::new(create),
                }))),
            ],
        });
        let select = Expr::Arrow(ArrowExpr {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            params: vec![],
            body: Box::new(BlockStmtOrExpr::Expr(Box::new(selected))),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
        });
        return Some(call_ident("_$compiledBranch", vec![select]));
    };
    let Expr::Object(registry) = registry else {
        panic!("Rue dynamic component registry must be a literal, finite factory map");
    };
    let mut cases = Vec::new();
    for entry in registry.props {
        let PropOrSpread::Prop(entry) = entry else {
            panic!("Rue dynamic component registry cannot contain spreads");
        };
        let (key, factory) = match *entry {
            Prop::KeyValue(KeyValueProp { key: PropName::Ident(key), value }) => {
                (string_expr(key.sym.as_ref()), *value)
            }
            Prop::KeyValue(KeyValueProp { key: PropName::Str(key), value }) => {
                (Expr::Lit(Lit::Str(key)), *value)
            }
            Prop::Shorthand(id) => (string_expr(id.sym.as_ref()), Expr::Ident(id)),
            _ => panic!(
                "Rue dynamic component registry requires static keys and function references"
            ),
        };
        if !matches!(&factory, Expr::Ident(id) if vt.is_compiled_component(id.sym.as_ref())) {
            panic!("Rue dynamic component registry values must be static component factories");
        }
        let block = call_ident("_$compiledComponent", vec![factory, read_props.clone()]);
        let create = Expr::Arrow(ArrowExpr {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            params: vec![],
            body: Box::new(BlockStmtOrExpr::Expr(Box::new(block))),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
        });
        let case = Expr::Object(ObjectLit {
            span: DUMMY_SP,
            props: vec![
                PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident(ident_name("__rue_compiled_branch_key")),
                    value: Box::new(key.clone()),
                }))),
                PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident(ident_name("create")),
                    value: Box::new(create),
                }))),
            ],
        });
        cases.push(SwitchCase {
            span: DUMMY_SP,
            test: Some(Box::new(key)),
            cons: vec![Stmt::Return(ReturnStmt { span: DUMMY_SP, arg: Some(Box::new(case)) })],
        });
    }
    cases.push(SwitchCase {
        span: DUMMY_SP,
        test: None,
        cons: vec![Stmt::Throw(ThrowStmt {
            span: DUMMY_SP,
            arg: Box::new(call_ident("Error", vec![string_expr("Unknown compiled component key")])),
        })],
    });
    let select = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: vec![Stmt::Switch(SwitchStmt {
                span: DUMMY_SP,
                discriminant: Box::new(key),
                cases,
            })],
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
    });
    Some(call_ident("_$compiledBranch", vec![select]))
}

pub(crate) fn is_compiled_component_element(vt: &VaporTransform, element: &JSXElement) -> bool {
    let Some(root) = jsx_name_root_ident(&element.opening.name) else {
        return false;
    };
    let is_compiled_builtin = matches!(
        jsx_name_leaf(&element.opening.name),
        Some(
            "RouterLink"
                | "Teleport"
                | "Suspense"
                | "KeepAlive"
                | "Transition"
                | "TransitionGroup"
                | "Template"
        )
    );
    if !is_compiled_builtin && !vt.is_compiled_component(root.sym.as_ref()) {
        return false;
    }
    let substantive_children = element.children.iter().any(is_substantive_slot_child);
    if substantive_children {
        let fragment = JSXFragment {
            span: DUMMY_SP,
            opening: JSXOpeningFragment { span: DUMMY_SP },
            children: element.children.clone(),
            closing: JSXClosingFragment { span: DUMMY_SP },
        };
        if !crate::element_children::is_compiled_safe_fragment(vt, &fragment) {
            return false;
        }
    }
    element.opening.attrs.iter().all(|attr| match attr {
        JSXAttrOrSpread::SpreadElement(_) => true,
        JSXAttrOrSpread::JSXAttr(attr) => match &attr.name {
            JSXAttrName::Ident(name) => {
                !matches!(name.sym.as_ref(), "key" | "ref" | "dangerouslySetInnerHTML")
                    && !name.sym.as_ref().starts_with("__rue_")
                    && !name.sym.as_ref().starts_with(COMPONENT_NATIVE_EVENT_PREFIX)
            }
            JSXAttrName::JSXNamespacedName(_) => false,
        },
    })
}

pub(crate) fn is_compiled_opaque_component_element(element: &JSXElement) -> bool {
    crate::utils::is_component(&element.opening.name)
        && crate::router_link::rewrite_router_link_fast_path(element).is_none()
        && crate::utils::component_has_no_dynamic_props_excluding_children(element)
        && element.opening.attrs.iter().all(|attr| match attr {
            JSXAttrOrSpread::JSXAttr(JSXAttr {
                value: Some(JSXAttrValue::JSXElement(_) | JSXAttrValue::JSXFragment(_)),
                ..
            }) => false,
            JSXAttrOrSpread::JSXAttr(JSXAttr {
                value:
                    Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                        expr: JSXExpr::Expr(expr),
                        ..
                    })),
                ..
            }) => !crate::element_expr::contains_jsx_in_expr(expr.as_ref()),
            _ => true,
        })
        && element.children.iter().all(
            |child| matches!(child, JSXElementChild::JSXText(text) if text.value.trim().is_empty()),
        )
}

pub(crate) fn try_build_compiled_opaque_component_element(
    vt: &mut VaporTransform,
    element: &JSXElement,
    parent: &Ident,
    stmts: &mut Vec<Stmt>,
) -> bool {
    if !is_compiled_opaque_component_element(element) {
        return false;
    }

    let mount = build_component_mount_expr(element);
    let factory = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(mount))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    let child = vt.next_el_ident();
    stmts.push(const_decl(child.clone(), call_ident("_$compiledRootFactory", vec![factory])));
    stmts.push(Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(call_member(
            child,
            "__rue_compiled_mount",
            vec![Expr::Ident(parent.clone())],
        )),
    }));
    true
}

pub(crate) fn try_build_compiled_component_element(
    vt: &mut VaporTransform,
    element: &JSXElement,
    parent: &Ident,
    stmts: &mut Vec<Stmt>,
) -> bool {
    try_build_compiled_component_element_with_anchor(vt, element, parent, None, stmts)
}

pub(crate) fn try_build_compiled_component_element_at(
    vt: &mut VaporTransform,
    element: &JSXElement,
    parent: &Ident,
    anchor: &Ident,
    stmts: &mut Vec<Stmt>,
) -> bool {
    try_build_compiled_component_element_with_anchor(vt, element, parent, Some(anchor), stmts)
}

pub(crate) fn build_compiled_component_read_props(
    vt: &mut VaporTransform,
    element: &JSXElement,
) -> Option<Expr> {
    // Native root listeners have their own event lowering; do not turn them into ordinary props.
    if element.opening.attrs.iter().any(|attr| {
        matches!(attr, JSXAttrOrSpread::JSXAttr(JSXAttr { name: JSXAttrName::Ident(name), .. })
            if name.sym.starts_with(COMPONENT_NATIVE_EVENT_PREFIX))
    }) {
        return None;
    }
    if jsx_name_to_expr(&element.opening.name).is_none() {
        return None;
    }
    let is_suspense = jsx_name_leaf(&element.opening.name) == Some("Suspense");
    let is_keep_alive = jsx_name_leaf(&element.opening.name) == Some("KeepAlive");
    let mut props: Vec<PropOrSpread> = element
        .opening
        .attrs
        .iter()
        .filter_map(|attr| {
            let JSXAttrOrSpread::JSXAttr(attr) = attr else {
                let JSXAttrOrSpread::SpreadElement(spread) = attr else { unreachable!() };
                return Some(PropOrSpread::Spread(SpreadElement {
                    dot3_token: spread.dot3_token,
                    expr: spread.expr.clone(),
                }));
            };
            let value = match &attr.value {
                Some(JSXAttrValue::JSXElement(element)) => {
                    let expr = Expr::JSXElement(element.clone());
                    crate::element_expr::compiled_slot_factory_expr(vt, &expr)?
                }
                Some(JSXAttrValue::JSXFragment(fragment)) => {
                    let expr = Expr::JSXFragment(fragment.clone());
                    crate::element_expr::compiled_slot_factory_expr(vt, &expr)?
                }
                Some(JSXAttrValue::JSXExprContainer(container))
                    if matches!(
                        &container.expr,
                        JSXExpr::Expr(expr)
                            if matches!(crate::utils::unwrap_expr(expr.as_ref()), Expr::JSXElement(_) | Expr::JSXFragment(_))
                    ) =>
                {
                    let JSXExpr::Expr(expr) = &container.expr else { unreachable!() };
                    crate::element_expr::compiled_slot_factory_expr(vt, expr)?
                }
                Some(JSXAttrValue::JSXExprContainer(container))
                    if matches!(&attr.name, JSXAttrName::Ident(name) if name.sym == "children" || (is_suspense && name.sym == "fallback")) => {
                    let JSXExpr::Expr(expr) = &container.expr else { return None };
                    if crate::element_expr::is_compiled_slot_expr(vt, expr) {
                        *expr.clone()
                    } else {
                        crate::element_expr::compiled_slot_factory_expr(vt, expr)
                            .unwrap_or_else(|| panic!("Rue component children must be a compiler-proven slot factory"))
                    }
                }
                Some(JSXAttrValue::Str(text))
                    if matches!(&attr.name, JSXAttrName::Ident(name) if name.sym == "children") => {
                    crate::element_expr::compiled_slot_factory_expr(vt, &Expr::Lit(Lit::Str(text.clone())))?
                }
                Some(value) => jsx_attr_value_to_expr(value)?,
                None => Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
            };
            let key = jsx_attr_name_to_prop_name(&attr.name)?;
            Some(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                key,
                value: Box::new(value),
            }))))
        })
        .collect();
    let mut substantive_children = Vec::new();
    let mut named_slots = Vec::new();
    for child in element.children.iter().filter(|child| is_substantive_slot_child(child)) {
        if let JSXElementChild::JSXElement(child) = child
            && let Some(name) = extract_jsx_attr_expr(child, "slot")
        {
            let name = match name {
                Expr::Lit(Lit::Str(name)) => PropName::Str(name),
                expr => {
                    PropName::Computed(ComputedPropName { span: DUMMY_SP, expr: Box::new(expr) })
                }
            };
            let mut child = *child.clone();
            child.opening.attrs.retain(|attr| !matches!(attr, JSXAttrOrSpread::JSXAttr(JSXAttr { name: JSXAttrName::Ident(name), .. }) if name.sym == "slot"));
            let content = if matches!(&child.opening.name, JSXElementName::Ident(id) if id.sym == "Template")
            {
                Expr::JSXFragment(JSXFragment {
                    span: DUMMY_SP,
                    opening: JSXOpeningFragment { span: DUMMY_SP },
                    closing: JSXClosingFragment { span: DUMMY_SP },
                    children: child.children,
                })
            } else {
                Expr::JSXElement(Box::new(child))
            };
            let factory = crate::element_expr::compiled_slot_factory_expr(vt, &content)
                .unwrap_or_else(|| panic!("Rue named slots require a compiler-proven factory"));
            named_slots.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                key: name,
                value: Box::new(factory),
            }))));
        } else {
            substantive_children.push(child.clone());
        }
    }
    if !named_slots.is_empty() {
        props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(ident_name("__rue_slots")),
            value: Box::new(Expr::Object(ObjectLit { span: DUMMY_SP, props: named_slots })),
        }))));
    }
    if !substantive_children.is_empty() {
        let nullish_conditional = if substantive_children.len() == 1 {
            match &substantive_children[0] {
                JSXElementChild::JSXExprContainer(JSXExprContainer {
                    expr: JSXExpr::Expr(expr),
                    ..
                }) => match crate::utils::unwrap_expr(expr.as_ref()) {
                    Expr::Cond(CondExpr { cons, alt, .. })
                        if crate::utils::is_static_empty_like(crate::utils::unwrap_expr(
                            cons.as_ref(),
                        )) || crate::utils::is_static_empty_like(crate::utils::unwrap_expr(
                            alt.as_ref(),
                        )) =>
                    {
                        lower_expr_slot_value(vt, expr.as_ref())
                    }
                    _ => None,
                },
                _ => None,
            }
        } else {
            None
        };
        let compile_children = |vt: &mut VaporTransform, children: Vec<JSXElementChild>| {
            let fragment = Expr::JSXFragment(JSXFragment {
                span: DUMMY_SP,
                opening: JSXOpeningFragment { span: DUMMY_SP },
                children,
                closing: JSXClosingFragment { span: DUMMY_SP },
            });
            crate::element_expr::compiled_slot_factory_expr(vt, &fragment)
        };
        let children = if let Some(lowered) = nullish_conditional {
            let mut body = lowered.stmts;
            body.push(Stmt::Return(ReturnStmt {
                span: DUMMY_SP,
                arg: Some(Box::new(lowered.expr)),
            }));
            Expr::Call(CallExpr {
                span: DUMMY_SP,
                callee: Callee::Expr(Box::new(Expr::Paren(ParenExpr {
                    span: DUMMY_SP,
                    expr: Box::new(Expr::Arrow(ArrowExpr {
                        span: DUMMY_SP,
                        params: vec![],
                        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                            span: DUMMY_SP,
                            ctxt: SyntaxContext::empty(),
                            stmts: body,
                        })),
                        is_async: false,
                        is_generator: false,
                        type_params: None,
                        return_type: None,
                        ctxt: SyntaxContext::empty(),
                    })),
                }))),
                args: vec![],
                type_args: None,
                ctxt: SyntaxContext::empty(),
            })
        } else {
            compile_children(vt, substantive_children)?
        };
        props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(ident_name("children")),
            value: Box::new(children),
        }))));
    }
    if is_keep_alive {
        let direct_child = element.children.iter().find_map(|child| match child {
            JSXElementChild::JSXElement(child) => Some(child.as_ref()),
            _ => None,
        });
        if !jsx_attrs_has_ident(&element.opening.attrs, "cacheKey")
            && let Some(child) = direct_child
        {
            let identity = extract_jsx_key_expr(child).or_else(|| match &child.opening.name {
                JSXElementName::Ident(name) => Some(string_expr(name.sym.as_ref())),
                _ => None,
            });
            if let Some(identity) = identity {
                props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident(ident_name("cacheKey")),
                    value: Box::new(identity),
                }))));
            }
        }
        if !jsx_attrs_has_ident(&element.opening.attrs, "cacheName")
            && let Some(JSXElement {
                opening: JSXOpeningElement { name: JSXElementName::Ident(name), .. },
                ..
            }) = direct_child
        {
            props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(ident_name("cacheName")),
                value: Box::new(string_expr(name.sym.as_ref())),
            }))));
        }
    }
    Some(Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Paren(ParenExpr {
            span: DUMMY_SP,
            expr: Box::new(Expr::Object(ObjectLit { span: DUMMY_SP, props })),
        })))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    }))
}

fn try_build_compiled_component_element_with_anchor(
    vt: &mut VaporTransform,
    element: &JSXElement,
    parent: &Ident,
    anchor: Option<&Ident>,
    stmts: &mut Vec<Stmt>,
) -> bool {
    if crate::element_builtin::mount(vt, element, parent, anchor, stmts) {
        return true;
    }
    if !is_compiled_component_element(vt, element) {
        return false;
    }
    let Some(component) = jsx_name_to_expr(&element.opening.name) else {
        return false;
    };
    if let Some(anchor) = anchor {
        let component_expr = Expr::JSXElement(Box::new(element.clone()));
        let Some(factory) = crate::element_expr::compiled_slot_factory_expr(vt, &component_expr)
        else {
            return false;
        };
        if crate::compiled_invariants::compiled_slot_factory_proof(&factory)
            != crate::compiled_invariants::CompiledSlotMountProof::Mountable
        {
            return false;
        }
        crate::element_slot::render_compiled_factory_for_slot_at(
            vt, parent, anchor, factory, stmts,
        );
        return true;
    }
    let Some(read_props) = build_compiled_component_read_props(vt, element) else {
        return false;
    };
    let mount = call_ident(
        "_$mountCompiledComponent",
        vec![Expr::Ident(parent.clone()), component, read_props],
    );
    stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(mount) }));
    true
}

fn extract_jsx_key_expr(jsx_el: &JSXElement) -> Option<Expr> {
    for attr in &jsx_el.opening.attrs {
        if let JSXAttrOrSpread::JSXAttr(attr) = attr
            && let JSXAttrName::Ident(name) = &attr.name
        {
            if name.sym.as_ref() != "key" {
                continue;
            }
            match &attr.value {
                Some(JSXAttrValue::Str(s)) => {
                    return Some(Expr::Lit(Lit::Str(Str {
                        span: DUMMY_SP,
                        value: s.value.clone(),
                        raw: None,
                    })));
                }
                Some(JSXAttrValue::JSXExprContainer(ec)) => {
                    if let JSXExpr::Expr(expr) = &ec.expr {
                        return Some(crate::utils::unwrap_expr(expr.as_ref()).clone());
                    }
                }
                _ => {}
            }
        }
    }
    None
}

fn extract_jsx_attr_expr(jsx_el: &JSXElement, expected: &str) -> Option<Expr> {
    jsx_el.opening.attrs.iter().find_map(|attr| {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else { return None };
        let JSXAttrName::Ident(name) = &attr.name else { return None };
        if name.sym.as_ref() != expected {
            return None;
        }
        attr.value.as_ref().and_then(jsx_attr_value_to_expr)
    })
}

fn keep_alive_inferred_props(element: &JSXElement) -> (Option<Expr>, Option<Expr>) {
    let Some(child) = element.children.iter().find_map(|child| match child {
        JSXElementChild::JSXElement(child) => Some(child.as_ref()),
        _ => None,
    }) else {
        return (None, None);
    };
    let identity = extract_jsx_key_expr(child).or_else(|| match &child.opening.name {
        JSXElementName::Ident(name) => Some(string_expr(name.sym.as_ref())),
        _ => None,
    });
    let name = match &child.opening.name {
        JSXElementName::Ident(component) if component.sym.as_ref() == "Component" => {
            extract_jsx_attr_expr(child, "is").map(|value| {
                Expr::Member(MemberExpr {
                    span: DUMMY_SP,
                    obj: Box::new(value),
                    prop: MemberProp::Ident(ident_name("name")),
                })
            })
        }
        JSXElementName::Ident(name) => Some(string_expr(name.sym.as_ref())),
        _ => None,
    };
    (identity, name)
}

fn wrap_transition_group_child_expr(expr: Expr, key_expr: Option<Expr>) -> Expr {
    if let Some(key_expr) = key_expr {
        call_ident("_$compiledWithKey", vec![expr, key_expr])
    } else {
        expr
    }
}

fn rewrite_transition_group_render_expr(vt: &mut VaporTransform, expr: &Expr) -> Expr {
    let inner = crate::utils::unwrap_expr(expr);
    if let Expr::Call(call) = inner
        && let Some(mapped) = rewrite_transition_group_map_expr(vt, call)
    {
        return mapped;
    }

    match inner {
        Expr::JSXElement(jsx_el) => wrap_transition_group_child_expr(
            crate::element_expr::make_expr_for_slot(vt, inner),
            extract_jsx_key_expr(jsx_el),
        ),
        Expr::JSXFragment(_) => crate::element_expr::make_expr_for_slot(vt, inner),
        Expr::Cond(CondExpr { test, cons, alt, .. }) => Expr::Cond(CondExpr {
            span: DUMMY_SP,
            test: test.clone(),
            cons: Box::new(rewrite_transition_group_render_expr(vt, cons.as_ref())),
            alt: Box::new(rewrite_transition_group_render_expr(vt, alt.as_ref())),
        }),
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, left, right, .. }) => Expr::Cond(CondExpr {
            span: DUMMY_SP,
            test: left.clone(),
            cons: Box::new(rewrite_transition_group_render_expr(vt, right.as_ref())),
            alt: Box::new(string_expr("")),
        }),
        _ => inner.clone(),
    }
}

fn rewrite_transition_group_map_callback_body(
    vt: &mut VaporTransform,
    body: &BlockStmtOrExpr,
) -> BlockStmtOrExpr {
    match body {
        BlockStmtOrExpr::Expr(expr) => {
            Box::new(rewrite_transition_group_render_expr(vt, expr.as_ref())).into()
        }
        BlockStmtOrExpr::BlockStmt(block) => {
            let mut next_block = block.clone();
            rewrite_transition_group_returns_in_block(vt, &mut next_block);
            BlockStmtOrExpr::BlockStmt(next_block)
        }
    }
}

fn collect_transition_group_callback_plain_locals(
    params: &[Pat],
) -> std::collections::HashSet<String> {
    fn collect_from_pat(pat: &Pat, out: &mut std::collections::HashSet<String>) {
        match pat {
            Pat::Ident(binding) => {
                out.insert(binding.id.sym.to_string());
            }
            Pat::Array(arr) => {
                for elem in arr.elems.iter().flatten() {
                    collect_from_pat(elem, out);
                }
            }
            Pat::Object(obj) => {
                for prop in &obj.props {
                    match prop {
                        ObjectPatProp::KeyValue(kv) => collect_from_pat(&kv.value, out),
                        ObjectPatProp::Assign(assign) => {
                            out.insert(assign.key.sym.to_string());
                        }
                        ObjectPatProp::Rest(rest) => collect_from_pat(&rest.arg, out),
                    }
                }
            }
            Pat::Assign(assign) => collect_from_pat(&assign.left, out),
            Pat::Rest(rest) => collect_from_pat(&rest.arg, out),
            _ => {}
        }
    }

    let mut out = std::collections::HashSet::new();
    for param in params {
        collect_from_pat(param, &mut out);
    }
    out
}

fn rewrite_transition_group_returns_in_block(vt: &mut VaporTransform, block: &mut BlockStmt) {
    for stmt in &mut block.stmts {
        rewrite_transition_group_returns_in_stmt(vt, stmt);
    }
}

fn rewrite_transition_group_returns_in_stmt(vt: &mut VaporTransform, stmt: &mut Stmt) {
    match stmt {
        Stmt::Return(ret) => {
            if let Some(arg) = &ret.arg {
                ret.arg = Some(Box::new(rewrite_transition_group_render_expr(vt, arg.as_ref())));
            }
        }
        Stmt::Block(block) => rewrite_transition_group_returns_in_block(vt, block),
        Stmt::If(if_stmt) => {
            rewrite_transition_group_returns_in_stmt(vt, &mut if_stmt.cons);
            if let Some(alt) = &mut if_stmt.alt {
                rewrite_transition_group_returns_in_stmt(vt, alt);
            }
        }
        Stmt::Switch(switch_stmt) => {
            for case in &mut switch_stmt.cases {
                for cons in &mut case.cons {
                    rewrite_transition_group_returns_in_stmt(vt, cons);
                }
            }
        }
        Stmt::Try(try_stmt) => {
            rewrite_transition_group_returns_in_block(vt, &mut try_stmt.block);
            if let Some(handler) = &mut try_stmt.handler {
                rewrite_transition_group_returns_in_block(vt, &mut handler.body);
            }
            if let Some(finalizer) = &mut try_stmt.finalizer {
                rewrite_transition_group_returns_in_block(vt, finalizer);
            }
        }
        _ => {}
    }
}

fn rewrite_transition_group_map_expr(vt: &mut VaporTransform, call: &CallExpr) -> Option<Expr> {
    let Callee::Expr(callee) = &call.callee else {
        return None;
    };
    let Expr::Member(MemberExpr { obj, prop: MemberProp::Ident(prop_ident), .. }) = &**callee
    else {
        return None;
    };
    if prop_ident.sym.as_ref() != "map" || call.args.len() != 1 {
        return None;
    }
    let callback_expr = crate::utils::unwrap_expr(call.args[0].expr.as_ref());
    let Expr::Arrow(arrow) = callback_expr else {
        return None;
    };
    let plain_locals = collect_transition_group_callback_plain_locals(&arrow.params);
    vt.push_plain_local_scope(plain_locals);
    let rewritten_body = rewrite_transition_group_map_callback_body(vt, arrow.body.as_ref());
    vt.pop_plain_local_scope();
    let rewritten_arrow = Expr::Arrow(ArrowExpr {
        span: arrow.span,
        params: arrow.params.clone(),
        body: Box::new(rewritten_body),
        is_async: arrow.is_async,
        is_generator: arrow.is_generator,
        type_params: arrow.type_params.clone(),
        return_type: arrow.return_type.clone(),
        ctxt: arrow.ctxt,
    });
    Some(Expr::Call(CallExpr {
        span: call.span,
        callee: Callee::Expr(Box::new(Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: obj.clone(),
            prop: MemberProp::Ident(prop_ident.clone()),
        }))),
        args: vec![ExprOrSpread { spread: None, expr: Box::new(rewritten_arrow) }],
        type_args: call.type_args.clone(),
        ctxt: call.ctxt,
    }))
}

fn build_transition_group_children_expr(
    vt: &mut VaporTransform,
    children: &[JSXElementChild],
) -> Option<Expr> {
    let mut out: Vec<Option<Expr>> = Vec::new();
    for child in children {
        let expr = match child {
            JSXElementChild::JSXText(text) => {
                let normalized = crate::text::normalize_text(&text.value);
                if normalized.trim().is_empty() { None } else { Some(string_expr(&normalized)) }
            }
            JSXElementChild::JSXElement(el) => {
                Some(rewrite_transition_group_render_expr(vt, &Expr::JSXElement(el.clone())))
            }
            JSXElementChild::JSXFragment(frag) => {
                Some(rewrite_transition_group_render_expr(vt, &Expr::JSXFragment(frag.clone())))
            }
            JSXElementChild::JSXExprContainer(ec) => match &ec.expr {
                JSXExpr::JSXEmptyExpr(_) => None,
                JSXExpr::Expr(expr) => {
                    Some(rewrite_transition_group_render_expr(vt, expr.as_ref()))
                }
            },
            JSXElementChild::JSXSpreadChild(_) => None,
        };
        out.push(expr);
    }

    let mut exprs: Vec<Expr> = out.into_iter().flatten().collect();
    if exprs.is_empty() {
        return None;
    }
    if exprs.len() == 1 {
        return exprs.pop();
    }
    Some(Expr::Array(ArrayLit {
        span: DUMMY_SP,
        elems: exprs
            .into_iter()
            .map(|expr| Some(ExprOrSpread { spread: None, expr: Box::new(expr) }))
            .collect(),
    }))
}

fn wrap_transition_child_factory(expr: Expr) -> Expr {
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(expr))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    })
}

/// 处理 JSX 组件元素：
/// - 在父节点下插入单个占位注释
/// - 若组件存在内联 children，将其改写为 children 属性传入一个原生 DocumentFragment，
///   并在调用处直接编译这些子节点为原生 DOM 以便递归渲染
/// - 使用 compiled slot ABI 在占位锚点前挂载组件 block
///   示例（参考 `tests/spec11.rs` 等）：
/// - 插入占位：`const _anchor = _$createComment("rue:slot:anchor");`
/// - 包裹 children：`children={_$compiledRoot(()=>{ const _root = _$createDocumentFragment(); ... return _root })}`
/// - 渲染：`_$mountCompiledSlotAt({ parent, before: anchor }, readFactory, readProps)`
///
/// 组件 children 默认会被改写为 `children` 属性传入；
/// `Transition` / `TransitionGroup` 这类依赖原始 keyed JSX children 的组件在此处保留原始 children。
pub(crate) fn rewrite_component_children_to_props(
    vt: &mut VaporTransform,
    comp_el: &mut JSXElement,
) -> ComponentChildrenRewrite {
    if let Some(builtin) = crate::element_builtin::build(vt, comp_el) {
        return ComponentChildrenRewrite { stmts: vec![], direct_render_expr: Some(builtin) };
    }
    let mut child_stmts: Vec<Stmt> = vec![];
    let mut direct_render_expr: Option<Expr> = None;

    let is_transition = crate::utils::is_transition_component(comp_el);
    let keep_alive_props = match &comp_el.opening.name {
        JSXElementName::Ident(name) if name.sym.as_ref() == "KeepAlive" => {
            Some(keep_alive_inferred_props(comp_el))
        }
        _ => None,
    };
    let needs_raw_transition_children = crate::utils::is_transition_raw_children_component(comp_el);

    if !comp_el.children.is_empty() && needs_raw_transition_children {
        // Transition/TransitionGroup 需要直接看原始 keyed children 做过渡编排；
        // 因此这里只把 children 整体表达式塞进 prop，不走普通 slot bag lowering。
        if let Some(children_expr) = build_transition_group_children_expr(vt, &comp_el.children) {
            let (children_prop_name, children_expr) = if is_transition {
                ("__rueTransitionChildFactory", wrap_transition_child_factory(children_expr))
            } else {
                ("children", children_expr)
            };
            let mut new_attrs = comp_el.opening.attrs.clone();
            new_attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr {
                span: DUMMY_SP,
                name: JSXAttrName::Ident(IdentName {
                    span: DUMMY_SP,
                    sym: Atom::from(children_prop_name),
                }),
                value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                    span: DUMMY_SP,
                    expr: JSXExpr::Expr(Box::new(children_expr)),
                })),
            }));
            comp_el.opening.attrs = new_attrs;
            comp_el.children = vec![];
            comp_el.opening.self_closing = true;
            comp_el.closing = None;
        }
        return ComponentChildrenRewrite { stmts: child_stmts, direct_render_expr };
    }

    if !comp_el.children.is_empty() {
        let mut default_children: Vec<JSXElementChild> = Vec::new();
        let mut named_slots: Vec<(Expr, LoweredSlotValue)> = Vec::new();

        for child in comp_el.children.iter().cloned() {
            match child {
                JSXElementChild::JSXElement(el_box) => {
                    let slot_name = extract_slot_name_expr(&el_box.opening.attrs);
                    if let Some(slot_name_expr) = slot_name {
                        // 带 `slot="name"` 的元素从默认 children 中分流到具名 slot。
                        let mut slot_el = (*el_box).clone();
                        remove_jsx_attr_ident(&mut slot_el.opening.attrs, "slot");
                        let lowered = if is_slot_carrier_wrapper(&slot_el) {
                            lower_slot_value(vt, &slot_el.children)
                        } else {
                            let wrapped = vec![JSXElementChild::JSXElement(Box::new(slot_el))];
                            lower_slot_value(vt, &wrapped)
                        };
                        if let Some(lowered) = lowered {
                            named_slots.push((slot_name_expr, lowered));
                        }
                        continue;
                    }
                    default_children.push(JSXElementChild::JSXElement(el_box));
                }
                JSXElementChild::JSXExprContainer(ec) => {
                    if let JSXExpr::Expr(expr) = &ec.expr
                        && let Some((slot_name_expr, lowered)) =
                            lower_named_slot_expr(vt, expr.as_ref())
                    {
                        // 条件/逻辑表达式包着具名 slot 时，同样保留 slot 名并 lowering 分支内容。
                        named_slots.push((slot_name_expr, lowered));
                        continue;
                    }
                    default_children.push(JSXElementChild::JSXExprContainer(ec));
                }
                other => default_children.push(other),
            }
        }

        let default_slot = lower_slot_value(vt, &default_children);
        let has_named_slots = !named_slots.is_empty();
        let default_requires_slot_bag =
            default_slot.as_ref().map(|slot| slot.is_function).unwrap_or(false);

        let mut new_attrs = comp_el.opening.attrs.clone();

        if let Some((identity, name)) = keep_alive_props {
            if !jsx_attrs_has_ident(&new_attrs, "cacheKey")
                && let Some(identity) = identity
            {
                new_attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr {
                    span: DUMMY_SP,
                    name: JSXAttrName::Ident(ident_name("cacheKey")),
                    value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                        span: DUMMY_SP,
                        expr: JSXExpr::Expr(Box::new(identity)),
                    })),
                }));
            }
            if !jsx_attrs_has_ident(&new_attrs, "cacheName")
                && let Some(name) = name
            {
                new_attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr {
                    span: DUMMY_SP,
                    name: JSXAttrName::Ident(ident_name("cacheName")),
                    value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                        span: DUMMY_SP,
                        expr: JSXExpr::Expr(Box::new(name)),
                    })),
                }));
            }
        }

        let default_in_slot_bag = has_named_slots || default_requires_slot_bag;

        if default_in_slot_bag {
            // 只要存在具名 slot，或者默认 slot 本身是函数，就统一走 __rue_slots 对象。
            // 这样组件内部拿到的 slot 结构保持一致。
            let mut slot_props: Vec<PropOrSpread> = Vec::new();

            if let Some(default_slot_value) = &default_slot {
                child_stmts.extend(default_slot_value.stmts.iter().cloned());
                slot_props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Str(Str {
                        span: DUMMY_SP,
                        value: Atom::from("default").into(),
                        raw: None,
                    }),
                    value: Box::new(default_slot_value.expr.clone()),
                }))));
            }

            for (slot_name_expr, lowered) in named_slots {
                child_stmts.extend(lowered.stmts);
                slot_props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: slot_prop_name(slot_name_expr),
                    value: Box::new(lowered.expr),
                }))));
            }

            new_attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr {
                span: DUMMY_SP,
                name: JSXAttrName::Ident(IdentName {
                    span: DUMMY_SP,
                    sym: Atom::from("__rue_slots"),
                }),
                value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                    span: DUMMY_SP,
                    expr: JSXExpr::Expr(Box::new(Expr::Object(ObjectLit {
                        span: DUMMY_SP,
                        props: slot_props,
                    }))),
                })),
            }));
        }

        if let Some(default_slot_value) = default_slot
            && !default_slot_value.is_function
        {
            if !default_in_slot_bag {
                child_stmts.extend(default_slot_value.stmts.iter().cloned());
            }
            if crate::utils::is_builtin_fragment_element(comp_el) {
                // 内建 Fragment 只是透明容器，可直接渲染 children，避免再创建组件实例。
                direct_render_expr = Some(default_slot_value.expr.clone());
            }
            new_attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr {
                span: DUMMY_SP,
                name: JSXAttrName::Ident(IdentName { span: DUMMY_SP, sym: Atom::from("children") }),
                value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                    span: DUMMY_SP,
                    expr: JSXExpr::Expr(Box::new(default_slot_value.expr)),
                })),
            }));
        }

        // children 已经全部改写进 props/slot bag，原 JSX children 清空，避免后续重复编译。
        comp_el.opening.attrs = new_attrs;
        comp_el.children = vec![];
        comp_el.opening.self_closing = true;
        comp_el.closing = None;
    }

    ComponentChildrenRewrite { stmts: child_stmts, direct_render_expr }
}

pub fn build_component_element(
    vt: &mut VaporTransform,
    jsx_el: &JSXElement,
    parent: &Ident,
    stmts: &mut Vec<Stmt>,
) {
    build_component_element_with_anchor(vt, jsx_el, parent, None, stmts);
}

pub(crate) fn build_component_element_at(
    vt: &mut VaporTransform,
    jsx_el: &JSXElement,
    parent: &Ident,
    anchor: &Ident,
    stmts: &mut Vec<Stmt>,
) {
    build_component_element_with_anchor(vt, jsx_el, parent, Some(anchor), stmts);
}

fn build_component_element_with_anchor(
    vt: &mut VaporTransform,
    jsx_el: &JSXElement,
    parent: &Ident,
    preset_anchor: Option<&Ident>,
    stmts: &mut Vec<Stmt>,
) {
    let mut comp_el = jsx_el.clone();
    let rewrite = rewrite_component_children_to_props(vt, &mut comp_el);
    let slot_init_expr =
        rewrite.direct_render_expr.clone().unwrap_or_else(|| build_component_mount_expr(&comp_el));
    let child_stmts = rewrite.stmts;

    let anchor = if let Some(anchor) = preset_anchor {
        anchor.clone()
    } else {
        let anchor = vt.next_list_ident();
        let make_anchor = call_ident("_$createComment", vec![string_expr("rue:component:anchor")]);
        stmts.push(const_decl(anchor.clone(), make_anchor));
        stmts.push(append_child(parent.clone(), Expr::Ident(anchor.clone())));
        anchor
    };

    stmts.extend(child_stmts);
    crate::element_slot::render_compiled_slot_for_at(
        vt,
        parent,
        &Expr::Ident(anchor),
        &slot_init_expr,
        stmts,
    );
}

#[cfg(test)]
#[path = "element_component_tests.rs"]
mod tests;
