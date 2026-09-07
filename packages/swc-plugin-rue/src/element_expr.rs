// SWC 常量与上下文：DUMMY_SP（稳定 span）、SyntaxContext（统一 empty）
use std::collections::HashSet;

use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（JSXExprContainer/CondExpr/BinExpr/ArrowExpr 等）
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitMutWith, VisitWith};

use crate::emit::*;
use crate::log;
use crate::utils::is_static_empty_like;
use crate::vapor::VaporTransform;

pub(crate) fn is_global_scalar_constructor_name(name: &str) -> bool {
    matches!(name, "String" | "Number" | "Boolean")
}

fn make_vapor_expr_from_child_body(child_body: Vec<Stmt>, compiled_anchor: bool) -> Expr {
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
    let mut args = vec![arrow];
    if compiled_anchor {
        args.push(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })));
    }
    call_ident("vapor", args)
}

struct ReactiveKeyDetector {
    found: bool,
}

impl Visit for ReactiveKeyDetector {
    fn visit_member_expr(&mut self, member: &MemberExpr) {
        if let MemberProp::Ident(prop) = &member.prop
            && prop.sym.as_ref() == "value"
        {
            self.found = true;
            return;
        }
        member.visit_children_with(self);
    }

    fn visit_call_expr(&mut self, call: &CallExpr) {
        if call.args.is_empty()
            && let Callee::Expr(callee) = &call.callee
            && let Expr::Member(member) = crate::utils::unwrap_expr(callee.as_ref())
            && let MemberProp::Ident(prop) = &member.prop
            && prop.sym.as_ref() == "get"
        {
            self.found = true;
            return;
        }
        call.visit_children_with(self);
    }
}

pub(crate) fn extract_reactive_jsx_key_expr(jsx_el: &JSXElement) -> Option<Expr> {
    jsx_el.opening.attrs.iter().find_map(|attr| {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            return None;
        };
        let JSXAttrName::Ident(name) = &attr.name else {
            return None;
        };
        if name.sym.as_ref() != "key" {
            return None;
        }
        let Some(JSXAttrValue::JSXExprContainer(container)) = &attr.value else {
            return None;
        };
        let JSXExpr::Expr(expr) = &container.expr else {
            return None;
        };
        let mut detector = ReactiveKeyDetector { found: false };
        expr.visit_with(&mut detector);
        detector.found.then(|| crate::utils::unwrap_expr(expr.as_ref()).clone())
    })
}

fn jsx_element_to_slot_expr(vt: &mut VaporTransform, jsx_el: &JSXElement) -> Expr {
    if crate::utils::is_component(&jsx_el.opening.name) {
        if let Some(dynamic) =
            crate::element_component::build_compiled_dynamic_component_expr(vt, jsx_el)
        {
            return dynamic;
        }
        if crate::element_component::is_compiled_component_element(vt, jsx_el)
            && let JSXElementName::Ident(component) = &jsx_el.opening.name
            && let Some(read_props) =
                crate::element_component::build_compiled_component_read_props(vt, jsx_el)
        {
            return call_ident(
                "_$compiledComponent",
                vec![Expr::Ident(component.clone()), read_props],
            );
        }
        let mut component = jsx_el.clone();
        let rewrite =
            crate::element_component::rewrite_component_children_to_props(vt, &mut component);
        let mount_expr = rewrite
            .direct_render_expr
            .unwrap_or_else(|| crate::element_component::build_component_mount_expr(&component));
        return crate::element_component::component_expr_with_prelude(rewrite.stmts, mount_expr);
    }
    if !vt.current_function_is_async()
        && crate::element_children::is_compiled_safe_element(vt, jsx_el)
    {
        let block = crate::element_children::compiled_scalar_element_to_block(vt, jsx_el);
        let compiled_expr = crate::element_children::compiled_block_to_root_expr(block);
        return match extract_reactive_jsx_key_expr(jsx_el) {
            Some(key_expr) => call_ident("_$compiledWithKey", vec![compiled_expr, key_expr]),
            None => compiled_expr,
        };
    }
    if vt.static_templates
        && !vt.current_function_is_async()
        && let Some((handle, reserved_elements)) =
            crate::vapor::template::static_root_handle_expr(jsx_el)
    {
        vt.next_el += reserved_elements;
        return match extract_reactive_jsx_key_expr(jsx_el) {
            Some(key_expr) => call_ident("_$compiledWithKey", vec![handle, key_expr]),
            None => handle,
        };
    }
    let child_root = ident("_root");
    let mut child_body: Vec<Stmt> =
        vec![const_decl(child_root.clone(), call_ident("_$createDocumentFragment", vec![]))];
    crate::elements::build_element(vt, jsx_el, &child_root, &mut child_body);
    if vt.is_once_context() {
        crate::vapor::flatten_once_watch_effects(&mut child_body);
    }
    child_body.push(return_root(child_root.clone()));
    // Component setup can synchronously restore state from onErrorCaptured. Keep its
    // historical deferred replacement boundary so that recovery schedules after the
    // failing render; native compiled branches can replace their stable anchor in place.
    let vapor_expr = make_vapor_expr_from_child_body(
        child_body,
        !crate::utils::is_component(&jsx_el.opening.name),
    );
    match extract_reactive_jsx_key_expr(jsx_el) {
        Some(key_expr) => call_ident("_$compiledWithKey", vec![vapor_expr, key_expr]),
        None => vapor_expr,
    }
}

fn jsx_fragment_to_slot_expr(vt: &mut VaporTransform, frag: &JSXFragment) -> Expr {
    if !vt.current_function_is_async()
        && crate::element_children::is_compiled_safe_fragment(vt, frag)
    {
        let block = crate::element_children::compiled_fragment_to_block(vt, frag);
        return crate::element_children::compiled_block_to_root_expr(block);
    }
    let child_root = ident("_root");
    let mut child_body: Vec<Stmt> =
        vec![const_decl(child_root.clone(), call_ident("_$createDocumentFragment", vec![]))];
    crate::element_fragment::emit_fragment_children(
        vt,
        &child_root,
        &frag.children,
        &mut child_body,
    );
    if vt.is_once_context() {
        crate::vapor::flatten_once_watch_effects(&mut child_body);
    }
    child_body.push(return_root(child_root.clone()));
    make_vapor_expr_from_child_body(child_body, true)
}

fn jsx_expr_to_slot_expr(vt: &mut VaporTransform, inner: &Expr) -> Option<Expr> {
    match inner {
        Expr::JSXElement(jsx_el) => Some(jsx_element_to_slot_expr(vt, jsx_el)),
        Expr::JSXFragment(frag) => Some(jsx_fragment_to_slot_expr(vt, frag)),
        _ => None,
    }
}

pub(crate) fn is_compiled_slot_source_expr(expr: &Expr) -> bool {
    let inner = crate::utils::unwrap_expr(expr);
    matches!(
        inner,
        Expr::Member(MemberExpr { obj, prop: MemberProp::Ident(_), .. })
            if matches!(
                    crate::utils::unwrap_expr(obj.as_ref()),
                    Expr::Ident(id)
                        if matches!(id.sym.as_ref(), "props" | "__rue_props")
                )
    ) || matches!(
        inner,
        Expr::Call(CallExpr { callee: Callee::Expr(callee), args, .. })
            if args.is_empty()
                && matches!(
                    crate::utils::unwrap_expr(callee.as_ref()),
                    Expr::Member(MemberExpr { obj, prop: MemberProp::Ident(prop), .. })
                        if prop.sym.as_ref() == "get"
                            && matches!(crate::utils::unwrap_expr(obj.as_ref()), Expr::Ident(id) if id.sym.as_ref().starts_with("_$rueCompiledSlot"))
                )
    )
}

/// Build the closed compiled slot ABI: `(target, slotProps, owner) -> CompiledBlock`.
/// The mount helper receives a compiler-generated block factory, never a Renderable value.
pub(crate) fn compiled_slot_factory_expr(vt: &mut VaporTransform, inner: &Expr) -> Option<Expr> {
    let compiled = compiled_branch_result(vt, inner)?;
    let create = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(compiled))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    let body = call_ident(
        "_$mountCompiledSlotFactory",
        vec![Expr::Ident(ident("target")), Expr::Ident(ident("owner")), create],
    );
    Some(Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![
            Pat::Ident(BindingIdent { id: ident("target"), type_ann: None }),
            Pat::Ident(BindingIdent { id: ident("slotProps"), type_ann: None }),
            Pat::Ident(BindingIdent { id: ident("owner"), type_ann: None }),
        ],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(body))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    }))
}

fn compiled_root_from_stmts(stmts: Vec<Stmt>) -> Expr {
    crate::element_children::compiled_block_to_root_expr(BlockStmt {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        stmts,
    })
}

fn empty_compiled_root_expr() -> Expr {
    let root = ident("_root");
    compiled_root_from_stmts(vec![
        const_decl(root.clone(), call_ident("_$createDocumentFragment", vec![])),
        return_root(root),
    ])
}

fn typeof_is(value: Expr, expected: &str) -> Expr {
    Expr::Bin(BinExpr {
        span: DUMMY_SP,
        op: BinaryOp::EqEqEq,
        left: Box::new(Expr::Unary(UnaryExpr {
            span: DUMMY_SP,
            op: UnaryOp::TypeOf,
            arg: Box::new(value),
        })),
        right: Box::new(string_expr(expected)),
    })
}

fn scalar_text_value(value: Expr) -> Expr {
    let is_string_or_number = Expr::Bin(BinExpr {
        span: DUMMY_SP,
        op: BinaryOp::LogicalOr,
        left: Box::new(typeof_is(value.clone(), "string")),
        right: Box::new(typeof_is(value.clone(), "number")),
    });
    let is_text = Expr::Bin(BinExpr {
        span: DUMMY_SP,
        op: BinaryOp::LogicalOr,
        left: Box::new(is_string_or_number),
        right: Box::new(typeof_is(value.clone(), "bigint")),
    });
    Expr::Cond(CondExpr {
        span: DUMMY_SP,
        test: Box::new(is_text),
        cons: Box::new(value),
        alt: Box::new(string_expr("")),
    })
}

fn scalar_compiled_root_expr(value: Expr) -> Expr {
    let root = ident("_root");
    compiled_root_from_stmts(vec![
        const_decl(
            root.clone(),
            call_ident("_$compiledCreateTextNode", vec![scalar_text_value(value)]),
        ),
        return_root(root),
    ])
}

fn return_expr(expr: Expr) -> Stmt {
    Stmt::Return(ReturnStmt { span: DUMMY_SP, arg: Some(Box::new(expr)) })
}

fn compiled_branch_factory(stmts: Vec<Stmt>) -> Expr {
    call_ident(
        "_$compiledBranch",
        vec![Expr::Arrow(ArrowExpr {
            span: DUMMY_SP,
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
            ctxt: SyntaxContext::empty(),
        })],
    )
}

fn compiled_branch_case_with_refresh(key: Expr, result: Expr, refresh: bool) -> Expr {
    let mut props = vec![
        PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(ident_name("__rue_compiled_branch_key")),
            value: Box::new(key),
        }))),
        PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(ident_name("create")),
            value: Box::new(Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                params: vec![],
                body: Box::new(BlockStmtOrExpr::Expr(Box::new(result))),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
                ctxt: SyntaxContext::empty(),
            })),
        }))),
    ];
    if refresh {
        props.insert(
            1,
            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(ident_name("__rue_compiled_branch_refresh")),
                value: Box::new(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true }))),
            }))),
        );
    }
    Expr::Object(ObjectLit { span: DUMMY_SP, props })
}

pub(crate) fn compiled_branch_case(key: Expr, result: Expr) -> Expr {
    compiled_branch_case_with_refresh(key, result, false)
}

pub(crate) fn refreshing_compiled_branch_case(key: Expr, result: Expr) -> Expr {
    compiled_branch_case_with_refresh(key, result, true)
}

pub(crate) fn compiled_branch_result(vt: &mut VaporTransform, expr: &Expr) -> Option<Expr> {
    let inner = crate::utils::unwrap_expr(expr);
    match inner {
        Expr::JSXElement(element)
            if crate::element_component::build_compiled_dynamic_component_expr(vt, element)
                .is_some() =>
        {
            crate::element_component::build_compiled_dynamic_component_expr(vt, element)
        }
        Expr::JSXElement(element)
            if ((!crate::utils::is_component(&element.opening.name)
                && crate::element_children::is_compiled_safe_element(vt, element))
                || crate::element_component::is_compiled_component_element(vt, element)) =>
        {
            Some(jsx_element_to_slot_expr(vt, element))
        }
        Expr::JSXFragment(fragment)
            if crate::element_children::is_compiled_safe_fragment(vt, fragment) =>
        {
            Some(jsx_fragment_to_slot_expr(vt, fragment))
        }
        Expr::Call(call) if crate::element_children::compiled_list_call_is_safe(vt, call) => {
            let root = ident("_root");
            let mut stmts =
                vec![const_decl(root.clone(), call_ident("_$createDocumentFragment", vec![]))];
            if !crate::element_list::try_build_list_from_map(vt, &root, call, &mut stmts) {
                return None;
            }
            stmts.push(return_root(root));
            Some(compiled_root_from_stmts(stmts))
        }
        _ if is_compiled_slot_source_expr(inner) => Some(call_ident(
            "_$compiledSlotValue",
            vec![Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                params: vec![],
                body: Box::new(BlockStmtOrExpr::Expr(Box::new(inner.clone()))),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
                ctxt: SyntaxContext::empty(),
            })],
        )),
        _ if is_static_empty_like(inner) => Some(empty_compiled_root_expr()),
        _ if crate::vapor::is_compiled_reactive_scalar_expr(
            vt,
            inner,
            &vt.current_scalar_constructor_shadows(),
        ) =>
        {
            Some(scalar_compiled_root_expr(inner.clone()))
        }
        Expr::Cond(_) | Expr::Bin(_) => try_make_compiled_branch_expr(vt, inner),
        _ => None,
    }
}

fn literal_sibling_branch_parts<'a>(expr: &'a Expr) -> Option<(&'a Expr, Expr, &'a Expr)> {
    let Expr::Bin(logical) = crate::utils::unwrap_expr(expr) else {
        return None;
    };
    if logical.op != BinaryOp::LogicalAnd {
        return None;
    }
    let Expr::Bin(equality) = crate::utils::unwrap_expr(logical.left.as_ref()) else {
        return None;
    };
    if equality.op != BinaryOp::EqEqEq {
        return None;
    }
    let Expr::Lit(literal) = crate::utils::unwrap_expr(equality.right.as_ref()) else {
        return None;
    };
    Some((
        crate::utils::unwrap_expr(equality.left.as_ref()),
        Expr::Lit(literal.clone()),
        logical.right.as_ref(),
    ))
}

fn same_literal_sibling_source(left: &Expr, right: &Expr) -> bool {
    match (crate::utils::unwrap_expr(left), crate::utils::unwrap_expr(right)) {
        (Expr::Ident(left), Expr::Ident(right)) => left.sym == right.sym,
        (Expr::Member(left), Expr::Member(right)) => {
            same_literal_sibling_source(left.obj.as_ref(), right.obj.as_ref())
                && match (&left.prop, &right.prop) {
                    (MemberProp::Ident(left), MemberProp::Ident(right)) => left.sym == right.sym,
                    (MemberProp::PrivateName(left), MemberProp::PrivateName(right)) => {
                        left.name == right.name
                    }
                    (MemberProp::Computed(left), MemberProp::Computed(right)) => {
                        same_literal_sibling_source(left.expr.as_ref(), right.expr.as_ref())
                    }
                    _ => false,
                }
        }
        (Expr::Call(left), Expr::Call(right)) if left.args.is_empty() && right.args.is_empty() => {
            match (&left.callee, &right.callee) {
                (Callee::Expr(left), Callee::Expr(right)) => {
                    same_literal_sibling_source(left.as_ref(), right.as_ref())
                }
                _ => false,
            }
        }
        (Expr::Lit(left), Expr::Lit(right)) => left == right,
        _ => false,
    }
}

pub(crate) fn try_make_compiled_literal_sibling_branch_expr(
    vt: &mut VaporTransform,
    exprs: &[&Expr],
) -> Option<Expr> {
    if exprs.len() < 2 || vt.current_function_is_async() {
        return None;
    }

    let mut probe = vt.clone();
    let (source, _, _) = literal_sibling_branch_parts(exprs[0])?;
    if !crate::vapor::is_compiled_reactive_scalar_expr(
        &probe,
        source,
        &probe.current_scalar_constructor_shadows(),
    ) {
        return None;
    }

    let value = ident("__rue_branch_value");
    let mut stmts = vec![const_decl(value.clone(), source.clone())];
    for expr in exprs {
        let (candidate_source, literal, result) = literal_sibling_branch_parts(expr)?;
        if !same_literal_sibling_source(source, candidate_source) {
            return None;
        }
        let case =
            compiled_branch_case(literal.clone(), compiled_branch_result(&mut probe, result)?);
        stmts.push(Stmt::If(IfStmt {
            span: DUMMY_SP,
            test: Box::new(Expr::Bin(BinExpr {
                span: DUMMY_SP,
                op: BinaryOp::EqEqEq,
                left: Box::new(Expr::Ident(value.clone())),
                right: Box::new(literal),
            })),
            cons: Box::new(return_expr(case)),
            alt: None,
        }));
    }
    stmts.push(return_expr(compiled_branch_case(Expr::Ident(value), empty_compiled_root_expr())));
    *vt = probe;
    Some(compiled_branch_factory(stmts))
}

pub(crate) fn try_make_compiled_branch_expr(vt: &mut VaporTransform, expr: &Expr) -> Option<Expr> {
    if vt.current_function_is_async() {
        return None;
    }
    let shadows = vt.current_scalar_constructor_shadows();
    if crate::vapor::is_compiled_reactive_scalar_expr(vt, expr, &shadows) {
        return None;
    }
    match crate::utils::unwrap_expr(expr) {
        Expr::Cond(cond) => {
            let consequent = compiled_branch_case(
                Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
                compiled_branch_result(vt, cond.cons.as_ref())?,
            );
            let alternate = compiled_branch_case(
                Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: false })),
                compiled_branch_result(vt, cond.alt.as_ref())?,
            );
            Some(compiled_branch_factory(vec![
                Stmt::If(IfStmt {
                    span: DUMMY_SP,
                    test: cond.test.clone(),
                    cons: Box::new(return_expr(consequent)),
                    alt: None,
                }),
                return_expr(alternate),
            ]))
        }
        Expr::Bin(binary)
            if matches!(
                binary.op,
                BinaryOp::LogicalAnd | BinaryOp::LogicalOr | BinaryOp::NullishCoalescing
            ) =>
        {
            let value = ident("__rue_branch_value");
            let value_expr = Expr::Ident(value.clone());
            let right = compiled_branch_result(vt, binary.right.as_ref())?;
            let mut stmts = vec![const_decl(value, *binary.left.clone())];
            match binary.op {
                BinaryOp::LogicalAnd => {
                    let right = compiled_branch_case(
                        Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
                        right,
                    );
                    stmts.push(Stmt::If(IfStmt {
                        span: DUMMY_SP,
                        test: Box::new(value_expr.clone()),
                        cons: Box::new(return_expr(right)),
                        alt: None,
                    }));
                    let is_number = Expr::Bin(BinExpr {
                        span: DUMMY_SP,
                        op: BinaryOp::LogicalOr,
                        left: Box::new(typeof_is(value_expr.clone(), "number")),
                        right: Box::new(typeof_is(value_expr.clone(), "bigint")),
                    });
                    stmts.push(Stmt::If(IfStmt {
                        span: DUMMY_SP,
                        test: Box::new(is_number),
                        cons: Box::new(return_expr(compiled_branch_case(
                            value_expr.clone(),
                            scalar_compiled_root_expr(value_expr),
                        ))),
                        alt: None,
                    }));
                    stmts.push(return_expr(compiled_branch_case(
                        Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: false })),
                        empty_compiled_root_expr(),
                    )));
                }
                BinaryOp::LogicalOr => {
                    stmts.push(Stmt::If(IfStmt {
                        span: DUMMY_SP,
                        test: Box::new(value_expr.clone()),
                        cons: Box::new(return_expr(compiled_branch_case(
                            value_expr.clone(),
                            scalar_compiled_root_expr(value_expr),
                        ))),
                        alt: None,
                    }));
                    stmts.push(return_expr(compiled_branch_case(
                        Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: false })),
                        right,
                    )));
                }
                BinaryOp::NullishCoalescing => {
                    stmts.push(Stmt::If(IfStmt {
                        span: DUMMY_SP,
                        test: Box::new(Expr::Bin(BinExpr {
                            span: DUMMY_SP,
                            op: BinaryOp::NotEq,
                            left: Box::new(value_expr.clone()),
                            right: Box::new(Expr::Lit(Lit::Null(Null { span: DUMMY_SP }))),
                        })),
                        cons: Box::new(return_expr(compiled_branch_case(
                            value_expr.clone(),
                            scalar_compiled_root_expr(value_expr),
                        ))),
                        alt: None,
                    }));
                    stmts.push(return_expr(compiled_branch_case(
                        Expr::Lit(Lit::Null(Null { span: DUMMY_SP })),
                        right,
                    )));
                }
                _ => unreachable!(),
            }
            Some(compiled_branch_factory(stmts))
        }
        _ => None,
    }
}

pub(crate) fn compiled_branch_reader_from_handle(expr: &Expr) -> Option<Expr> {
    let Expr::Call(call) = crate::utils::unwrap_expr(expr) else {
        return None;
    };
    if call_callee_ident_name(call) != Some("_$compiledBranch") || call.args.len() != 1 {
        return None;
    }
    let arg = call.args.first()?;
    arg.spread.is_none().then(|| *arg.expr.clone())
}

pub(crate) fn try_make_compiled_branch_reader(
    vt: &mut VaporTransform,
    expr: &Expr,
) -> Option<Expr> {
    let handle = try_make_compiled_branch_expr(vt, expr)?;
    compiled_branch_reader_from_handle(&handle)
}

pub(crate) fn is_compiled_branch_expr(vt: &VaporTransform, expr: &Expr) -> bool {
    fn result_is_safe(vt: &VaporTransform, expr: &Expr) -> bool {
        let inner = crate::utils::unwrap_expr(expr);
        match inner {
            Expr::JSXElement(element) => {
                (crate::utils::is_component(&element.opening.name)
                    && crate::element_component::is_compiled_component_element(vt, element))
                    || (!crate::utils::is_component(&element.opening.name)
                        && extract_reactive_jsx_key_expr(element).is_none()
                        && crate::element_children::is_compiled_safe_element(vt, element))
            }
            Expr::JSXFragment(fragment) => {
                crate::element_children::is_compiled_safe_fragment(vt, fragment)
            }
            Expr::Call(call) => crate::element_children::compiled_list_call_is_safe(vt, call),
            _ if is_compiled_slot_source_expr(inner) => true,
            _ if is_static_empty_like(inner) => true,
            _ if crate::vapor::is_compiled_reactive_scalar_expr(
                vt,
                inner,
                &vt.current_scalar_constructor_shadows(),
            ) =>
            {
                true
            }
            Expr::Cond(_) | Expr::Bin(_) => branch_is_safe(vt, inner),
            _ => false,
        }
    }

    fn branch_is_safe(vt: &VaporTransform, expr: &Expr) -> bool {
        if vt.current_function_is_async() {
            return false;
        }
        match crate::utils::unwrap_expr(expr) {
            Expr::Cond(cond) => {
                result_is_safe(vt, cond.cons.as_ref()) && result_is_safe(vt, cond.alt.as_ref())
            }
            Expr::Bin(binary)
                if matches!(
                    binary.op,
                    BinaryOp::LogicalAnd | BinaryOp::LogicalOr | BinaryOp::NullishCoalescing
                ) =>
            {
                result_is_safe(vt, binary.right.as_ref())
            }
            _ => false,
        }
    }

    branch_is_safe(vt, expr)
}

fn call_callee_ident_name(call: &CallExpr) -> Option<&str> {
    match &call.callee {
        Callee::Expr(expr) => match crate::utils::unwrap_expr(expr.as_ref()) {
            Expr::Ident(id) => Some(id.sym.as_ref()),
            _ => None,
        },
        _ => None,
    }
}

fn arrow_expr_body_expr(arrow: &ArrowExpr) -> Option<&Expr> {
    match arrow.body.as_ref() {
        BlockStmtOrExpr::Expr(expr) => Some(crate::utils::unwrap_expr(expr.as_ref())),
        _ => None,
    }
}

fn stmt_returns_jsx_renderable(stmt: &Stmt) -> bool {
    match stmt {
        Stmt::Return(ret) => {
            ret.arg.as_ref().map(|expr| expr_returns_jsx_renderable(expr.as_ref())).unwrap_or(false)
        }
        Stmt::Block(block) => block_returns_jsx_renderable(block),
        Stmt::If(if_stmt) => {
            stmt_returns_jsx_renderable(if_stmt.cons.as_ref())
                || if_stmt
                    .alt
                    .as_ref()
                    .map(|alt| stmt_returns_jsx_renderable(alt.as_ref()))
                    .unwrap_or(false)
        }
        Stmt::Switch(switch_stmt) => {
            switch_stmt.cases.iter().any(|case| case.cons.iter().any(stmt_returns_jsx_renderable))
        }
        Stmt::Try(try_stmt) => {
            block_returns_jsx_renderable(&try_stmt.block)
                || try_stmt
                    .handler
                    .as_ref()
                    .map(|handler| block_returns_jsx_renderable(&handler.body))
                    .unwrap_or(false)
                || try_stmt.finalizer.as_ref().map(block_returns_jsx_renderable).unwrap_or(false)
        }
        Stmt::While(while_stmt) => stmt_returns_jsx_renderable(while_stmt.body.as_ref()),
        Stmt::DoWhile(do_while_stmt) => stmt_returns_jsx_renderable(do_while_stmt.body.as_ref()),
        Stmt::For(for_stmt) => stmt_returns_jsx_renderable(for_stmt.body.as_ref()),
        Stmt::ForIn(for_in_stmt) => stmt_returns_jsx_renderable(for_in_stmt.body.as_ref()),
        Stmt::ForOf(for_of_stmt) => stmt_returns_jsx_renderable(for_of_stmt.body.as_ref()),
        Stmt::Labeled(labeled_stmt) => stmt_returns_jsx_renderable(labeled_stmt.body.as_ref()),
        _ => false,
    }
}

fn block_returns_jsx_renderable(block: &BlockStmt) -> bool {
    block.stmts.iter().any(stmt_returns_jsx_renderable)
}

fn expr_returns_jsx_renderable(expr: &Expr) -> bool {
    let inner = crate::utils::unwrap_expr(expr);
    match inner {
        Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            expr_returns_jsx_renderable(cons.as_ref()) || expr_returns_jsx_renderable(alt.as_ref())
        }
        Expr::Bin(BinExpr {
            op: BinaryOp::LogicalOr | BinaryOp::NullishCoalescing,
            left,
            right,
            ..
        }) => {
            expr_returns_jsx_renderable(left.as_ref())
                || expr_returns_jsx_renderable(right.as_ref())
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, right, .. }) => {
            expr_returns_jsx_renderable(right.as_ref())
        }
        Expr::Call(call) => call_returns_jsx_renderable(call),
        _ => false,
    }
}

fn arrow_returns_jsx_renderable(expr: &Expr) -> bool {
    match crate::utils::unwrap_expr(expr) {
        Expr::Arrow(arrow) => match arrow.body.as_ref() {
            BlockStmtOrExpr::Expr(expr) => expr_returns_jsx_renderable(expr.as_ref()),
            BlockStmtOrExpr::BlockStmt(block) => block_returns_jsx_renderable(block),
        },
        Expr::Fn(fn_expr) => {
            fn_expr.function.body.as_ref().map(block_returns_jsx_renderable).unwrap_or(false)
        }
        _ => false,
    }
}

fn map_call_returns_jsx_renderable(call: &CallExpr) -> bool {
    let Callee::Expr(callee) = &call.callee else {
        return false;
    };

    let Expr::Member(MemberExpr { prop: MemberProp::Ident(prop_ident), .. }) =
        crate::utils::unwrap_expr(callee.as_ref())
    else {
        return false;
    };

    prop_ident.sym.as_ref() == "map"
        && call
            .args
            .first()
            .map(|arg| arrow_returns_jsx_renderable(arg.expr.as_ref()))
            .unwrap_or(false)
}

fn compiled_memo_call_returns_jsx_renderable(call: &CallExpr) -> bool {
    call_callee_ident_name(call) == Some("_$compiledMemo")
        && call
            .args
            .get(1)
            .map(|arg| arrow_returns_jsx_renderable(arg.expr.as_ref()))
            .unwrap_or(false)
}

fn hook_wrapped_call_returns_jsx_renderable(call: &CallExpr) -> bool {
    if call_callee_ident_name(call) != Some("_$compiledWithHookId") {
        return false;
    }

    call.args.get(1).map(|arg| arrow_returns_jsx_renderable(arg.expr.as_ref())).unwrap_or(false)
}

fn call_returns_jsx_renderable(call: &CallExpr) -> bool {
    compiled_memo_call_returns_jsx_renderable(call)
        || hook_wrapped_call_returns_jsx_renderable(call)
        || map_call_returns_jsx_renderable(call)
        || match &call.callee {
            Callee::Expr(callee) => arrow_returns_jsx_renderable(callee.as_ref()),
            _ => false,
        }
}

fn compiled_memo_call_has_empty_deps(call: &CallExpr) -> bool {
    call_callee_ident_name(call) == Some("_$compiledMemo")
        && call.args.get(2).map(|arg| {
            matches!(crate::utils::unwrap_expr(arg.expr.as_ref()), Expr::Array(arr) if arr.elems.is_empty())
        }).unwrap_or(false)
}

fn hook_wrapped_call_has_empty_memo_deps(call: &CallExpr) -> bool {
    if call_callee_ident_name(call) != Some("_$compiledWithHookId") {
        return false;
    }

    let Some(runner) = call.args.get(1) else {
        return false;
    };
    let Expr::Arrow(arrow) = crate::utils::unwrap_expr(runner.expr.as_ref()) else {
        return false;
    };
    let Some(body_expr) = arrow_expr_body_expr(arrow) else {
        return false;
    };
    let Expr::Call(memo_call) = crate::utils::unwrap_expr(body_expr) else {
        return false;
    };
    compiled_memo_call_has_empty_deps(memo_call)
}

fn is_empty_deps_memoized_jsx_expr(expr: &Expr) -> bool {
    match crate::utils::unwrap_expr(expr) {
        Expr::Call(call) => {
            compiled_memo_call_has_empty_deps(call)
                || hook_wrapped_call_has_empty_memo_deps(call)
                || call.args.iter().any(|arg| is_empty_deps_memoized_jsx_expr(arg.expr.as_ref()))
        }
        Expr::Arrow(arrow) => {
            arrow_expr_body_expr(arrow).map(is_empty_deps_memoized_jsx_expr).unwrap_or(false)
        }
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            is_empty_deps_memoized_jsx_expr(cons.as_ref())
                || is_empty_deps_memoized_jsx_expr(alt.as_ref())
        }
        Expr::Bin(BinExpr { left, right, .. }) => {
            is_empty_deps_memoized_jsx_expr(left.as_ref())
                || is_empty_deps_memoized_jsx_expr(right.as_ref())
        }
        _ => false,
    }
}

fn rewrite_arrow_expr_body_for_slot(vt: &mut VaporTransform, expr: &Expr) -> Option<Expr> {
    match crate::utils::unwrap_expr(expr) {
        Expr::Arrow(arrow) => {
            let body_expr = arrow_expr_body_expr(arrow)?;
            if !expr_returns_jsx_renderable(body_expr) {
                return None;
            }

            let mut next = arrow.clone();
            next.body =
                Box::new(BlockStmtOrExpr::Expr(Box::new(make_expr_for_slot(vt, body_expr))));
            Some(Expr::Arrow(next))
        }
        _ => None,
    }
}

fn rewrite_use_memo_call_for_slot(vt: &mut VaporTransform, call: &CallExpr) -> Option<Expr> {
    if call_callee_ident_name(call) != Some("_$compiledMemo") {
        return None;
    }

    let mut next = call.clone();
    let first = next.args.get_mut(1)?;
    let rewritten =
        vt.with_once_context(|vt| rewrite_arrow_expr_body_for_slot(vt, first.expr.as_ref()))?;
    *first.expr = rewritten;
    Some(Expr::Call(next))
}

fn rewrite_hook_wrapped_call_for_slot(vt: &mut VaporTransform, call: &CallExpr) -> Option<Expr> {
    if call_callee_ident_name(call) != Some("_$compiledWithHookId") {
        return None;
    }

    let mut next = call.clone();
    let runner = next.args.get_mut(1)?;
    let rewritten = rewrite_arrow_expr_body_for_slot(vt, runner.expr.as_ref())?;
    *runner.expr = rewritten;
    Some(Expr::Call(next))
}

fn rewrite_map_call_for_slot(vt: &mut VaporTransform, call: &CallExpr) -> Option<Expr> {
    if !map_call_returns_jsx_renderable(call) {
        return None;
    }

    let mut next = call.clone();
    let callback = next.args.first_mut()?;
    let Expr::Arrow(arrow) = crate::utils::unwrap_expr(callback.expr.as_ref()) else {
        return None;
    };
    let mut rewritten = arrow.clone();
    match rewritten.body.as_mut() {
        BlockStmtOrExpr::Expr(expr) => {
            **expr = make_expr_for_slot(vt, crate::utils::unwrap_expr(expr.as_ref()));
        }
        BlockStmtOrExpr::BlockStmt(block) => block.visit_mut_with(vt),
    }
    callback.expr = Box::new(Expr::Arrow(rewritten));
    Some(Expr::Call(next))
}

fn rewrite_call_for_slot(vt: &mut VaporTransform, call: &CallExpr) -> Option<Expr> {
    rewrite_use_memo_call_for_slot(vt, call)
        .or_else(|| rewrite_hook_wrapped_call_for_slot(vt, call))
        .or_else(|| rewrite_map_call_for_slot(vt, call))
        .or_else(|| {
            let Callee::Expr(callee) = &call.callee else {
                return None;
            };
            if !arrow_returns_jsx_renderable(callee.as_ref()) {
                return None;
            }
            let mut next = call.clone();
            let Callee::Expr(next_callee) = &mut next.callee else {
                return None;
            };
            *next_callee = Box::new(rewrite_arrow_expr_body_for_slot(vt, next_callee.as_ref())?);
            Some(Expr::Call(next))
        })
}

fn is_svg_tag(tag: &str) -> bool {
    matches!(
        tag,
        "svg"
            | "g"
            | "circle"
            | "ellipse"
            | "line"
            | "path"
            | "polygon"
            | "polyline"
            | "rect"
            | "text"
            | "tspan"
            | "defs"
            | "clipPath"
            | "mask"
            | "pattern"
            | "linearGradient"
            | "radialGradient"
            | "stop"
            | "use"
            | "symbol"
            | "marker"
            | "foreignObject"
    )
}

fn is_non_ref_member_expr(inner: &Expr) -> bool {
    match inner {
        Expr::Member(member) => match &member.prop {
            MemberProp::Ident(prop) => prop.sym.as_ref() != "value",
            _ => true,
        },
        _ => false,
    }
}

fn member_root_ident(member: &MemberExpr) -> Option<&Ident> {
    let mut current = crate::utils::unwrap_expr(member.obj.as_ref());
    loop {
        match current {
            Expr::Ident(ident) => return Some(ident),
            Expr::Member(parent) => {
                current = crate::utils::unwrap_expr(parent.obj.as_ref());
            }
            _ => return None,
        }
    }
}

fn is_plain_local_member_expr(vt: &VaporTransform, inner: &Expr) -> bool {
    let Expr::Member(member) = inner else {
        return false;
    };
    member_root_ident(member)
        .map(|ident| vt.current_plain_local_names().contains(ident.sym.as_ref()))
        .unwrap_or(false)
}

fn is_text_coercion_call_name(name: &str) -> bool {
    matches!(name, "String" | "Number" | "Boolean" | "BigInt" | "Date" | "parseInt" | "parseFloat")
}

pub(crate) fn is_accessor_get_call_expr(call: &CallExpr) -> bool {
    if !call.args.is_empty() {
        return false;
    }

    let Callee::Expr(callee) = &call.callee else {
        return false;
    };

    let Expr::Member(MemberExpr { prop: MemberProp::Ident(prop), .. }) =
        crate::utils::unwrap_expr(callee.as_ref())
    else {
        return false;
    };

    prop.sym.as_ref() == "get"
}

fn is_opaque_renderable_call_expr(call: &CallExpr) -> bool {
    if is_accessor_get_call_expr(call) {
        return true;
    }

    let Some(callee_name) = call_callee_ident_name(call) else {
        return false;
    };

    !is_text_coercion_call_name(callee_name)
}

fn arrow_returns_known_renderable(vt: &VaporTransform, expr: &Expr) -> bool {
    let Expr::Arrow(arrow) = crate::utils::unwrap_expr(expr) else {
        return false;
    };
    let BlockStmtOrExpr::Expr(body) = arrow.body.as_ref() else {
        return false;
    };
    let Expr::Call(call) = crate::utils::unwrap_expr(body.as_ref()) else {
        return false;
    };
    call_callee_ident_name(call)
        .map(|name| vt.current_renderable_local_names().contains(name))
        .unwrap_or(false)
}

fn map_call_returns_known_renderable(vt: &VaporTransform, call: &CallExpr) -> bool {
    let Callee::Expr(callee) = &call.callee else {
        return false;
    };
    let Expr::Member(MemberExpr { prop: MemberProp::Ident(prop), .. }) =
        crate::utils::unwrap_expr(callee.as_ref())
    else {
        return false;
    };
    prop.sym.as_ref() == "map"
        && call
            .args
            .first()
            .map(|arg| arrow_returns_known_renderable(vt, arg.expr.as_ref()))
            .unwrap_or(false)
}

fn expr_is_renderable_local_alias_source(
    inner: &Expr,
    known_renderable_locals: &HashSet<String>,
) -> bool {
    let unwrapped = crate::utils::unwrap_expr(inner);
    if crate::utils::is_static_empty_like(unwrapped) {
        return false;
    }

    match unwrapped {
        Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
        Expr::Ident(id) => known_renderable_locals.contains(id.sym.as_ref()),
        Expr::Call(call) => {
            call_returns_jsx_renderable(call) || is_opaque_renderable_call_expr(call)
        }
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            expr_is_renderable_local_alias_source(cons.as_ref(), known_renderable_locals)
                || expr_is_renderable_local_alias_source(alt.as_ref(), known_renderable_locals)
        }
        Expr::Bin(BinExpr {
            op: BinaryOp::LogicalAnd | BinaryOp::LogicalOr | BinaryOp::NullishCoalescing,
            left,
            right,
            ..
        }) => {
            expr_is_renderable_local_alias_source(left.as_ref(), known_renderable_locals)
                || expr_is_renderable_local_alias_source(right.as_ref(), known_renderable_locals)
        }
        _ => false,
    }
}

pub(crate) fn collect_renderable_local_alias_names<'a>(
    stmts: impl IntoIterator<Item = &'a Stmt>,
    outer_renderable_locals: &HashSet<String>,
) -> HashSet<String> {
    let mut known_renderable_locals = outer_renderable_locals.clone();
    let mut aliases = HashSet::new();

    for stmt in stmts {
        let Stmt::Decl(Decl::Var(var)) = stmt else {
            continue;
        };
        if var.kind != VarDeclKind::Const {
            continue;
        }

        for decl in &var.decls {
            let Pat::Ident(binding) = &decl.name else {
                continue;
            };
            let Some(init) = &decl.init else {
                continue;
            };

            if expr_is_renderable_local_alias_source(init.as_ref(), &known_renderable_locals) {
                let name = binding.id.sym.to_string();
                known_renderable_locals.insert(name.clone());
                aliases.insert(name);
            }
        }
    }

    aliases
}

fn contains_nested_opaque_renderable_expr(vt: &VaporTransform, inner: &Expr) -> bool {
    let unwrapped = crate::utils::unwrap_expr(inner);
    if crate::utils::is_static_empty_like(unwrapped) {
        return false;
    }

    match unwrapped {
        Expr::Ident(id) => {
            let name = id.sym.as_ref();
            if vt.current_renderable_local_names().contains(name) {
                true
            } else {
                !vt.current_plain_local_names().contains(name)
            }
        }
        Expr::Member(_) => {
            !is_plain_local_member_expr(vt, unwrapped) && is_non_ref_member_expr(unwrapped)
        }
        Expr::Call(call) => {
            is_opaque_renderable_call_expr(call) || map_call_returns_known_renderable(vt, call)
        }
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            contains_nested_opaque_renderable_expr(vt, cons.as_ref())
                || contains_nested_opaque_renderable_expr(vt, alt.as_ref())
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, right, .. }) => {
            contains_nested_opaque_renderable_expr(vt, right.as_ref())
        }
        Expr::Bin(BinExpr {
            op: BinaryOp::LogicalOr | BinaryOp::NullishCoalescing,
            left,
            right,
            ..
        }) => {
            contains_nested_opaque_renderable_expr(vt, left.as_ref())
                || contains_nested_opaque_renderable_expr(vt, right.as_ref())
        }
        _ => false,
    }
}

fn contains_opaque_renderable_expr(vt: &VaporTransform, inner: &Expr) -> bool {
    let unwrapped = crate::utils::unwrap_expr(inner);
    if crate::utils::is_static_empty_like(unwrapped) {
        return false;
    }

    match unwrapped {
        Expr::Ident(id) => {
            let name = id.sym.as_ref();
            if vt.current_renderable_local_names().contains(name) {
                true
            } else {
                !vt.current_plain_local_names().contains(name)
            }
        }
        Expr::Member(_) => {
            !is_plain_local_member_expr(vt, unwrapped) && is_non_ref_member_expr(unwrapped)
        }
        Expr::Call(call) => {
            is_opaque_renderable_call_expr(call) || map_call_returns_known_renderable(vt, call)
        }
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            contains_nested_opaque_renderable_expr(vt, cons.as_ref())
                || contains_nested_opaque_renderable_expr(vt, alt.as_ref())
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, right, .. }) => {
            contains_nested_opaque_renderable_expr(vt, right.as_ref())
        }
        Expr::Bin(BinExpr {
            op: BinaryOp::LogicalOr | BinaryOp::NullishCoalescing,
            left,
            right,
            ..
        }) => {
            contains_nested_opaque_renderable_expr(vt, left.as_ref())
                || contains_nested_opaque_renderable_expr(vt, right.as_ref())
        }
        _ => false,
    }
}

/// 将任意表达式（可能包含 JSX、条件、逻辑运算）改写为用于插槽渲染的表达式：
/// - 若是 JSXElement / JSXFragment，则编译为 `vapor(()=>{ ... })` 返回 DocumentFragment
/// - 若是三元表达式，则对 cons/alt 分支中的 JSX 进行同样改写
/// - 若是逻辑与（&&），对右侧为 JSX 的情况进行改写
/// - 其它情况保持原表达式
///   生成示例（参考 `tests/conditional_rendering*.rs`）：
/// - `cond ? <A/> : <B/>` => `cond ? vapor(()=>{...}) : vapor(()=>{...})`
/// - `ok && <X/>` => `ok ? vapor(()=>{...}) : ""`
///
/// 设计动机：在表达式中内嵌 JSX 时，统一转化为可挂载块值以复用同一套插槽渲染路径，避免多种表达式形态下的分支爆炸。
pub fn make_expr_for_slot(vt: &mut VaporTransform, inner: &Expr) -> Expr {
    match inner {
        Expr::JSXElement(jsx_el) => {
            log::debug("element_expr: slot JSXElement");
            jsx_element_to_slot_expr(vt, jsx_el)
        }
        Expr::JSXFragment(frag) => {
            log::debug("element_expr: slot JSXFragment");
            jsx_fragment_to_slot_expr(vt, frag)
        }
        Expr::Cond(CondExpr { test, cons, alt, .. }) => {
            log::debug("element_expr: slot CondExpr");
            // 条件表达式：分支中若含 JSX，分别编译为 vapor 片段
            let cons_inner = crate::utils::unwrap_expr(cons.as_ref());
            let alt_inner = crate::utils::unwrap_expr(alt.as_ref());
            // 每个分支独立判断：
            // - 直接 JSX：立即编译成 vapor 片段；
            // - 间接 JSX（memoized/map 等）：递归规范；
            // - 静态空值：统一转成空字符串，避免 runtime 渲染 undefined/null。
            let new_cons: Expr = if let Some(slot_expr) = jsx_expr_to_slot_expr(vt, cons_inner) {
                slot_expr
            } else if expr_returns_jsx_renderable(cons_inner) {
                make_expr_for_slot(vt, cons_inner)
            } else if is_static_empty_like(cons_inner) {
                string_expr("")
            } else {
                *cons.clone()
            };
            let new_alt: Expr = if let Some(slot_expr) = jsx_expr_to_slot_expr(vt, alt_inner) {
                slot_expr
            } else if expr_returns_jsx_renderable(alt_inner) {
                make_expr_for_slot(vt, alt_inner)
            } else if is_static_empty_like(alt_inner) {
                string_expr("")
            } else {
                *alt.clone()
            };
            Expr::Cond(CondExpr {
                span: DUMMY_SP,
                test: test.clone(),
                cons: Box::new(new_cons),
                alt: Box::new(new_alt),
            })
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, left, right, .. }) => {
            log::debug("element_expr: slot LogicalAnd");
            // 逻辑与：右侧为 JSX 则编译为 vapor 片段；否则保持原表达式
            let right_inner = crate::utils::unwrap_expr(right.as_ref());
            let new_cons: Expr = if let Some(slot_expr) = jsx_expr_to_slot_expr(vt, right_inner) {
                slot_expr
            } else if expr_returns_jsx_renderable(right_inner) {
                make_expr_for_slot(vt, right_inner)
            } else {
                *right.clone()
            };
            let left_inner = crate::utils::unwrap_expr(left.as_ref());
            // JS 的 `0 && <A/>` 会返回 0；React 类语义里 0 常需要显示。
            // 因此数值/NaN 的 false 分支保留左值，其它 falsey 情况用空字符串。
            let new_alt: Expr = match left_inner {
                Expr::Lit(Lit::Num(_)) => *left.clone(),
                Expr::Ident(id) if id.sym.as_ref() == "NaN" => *left.clone(),
                _ => string_expr(""),
            };
            Expr::Cond(CondExpr {
                span: DUMMY_SP,
                test: left.clone(),
                cons: Box::new(new_cons),
                alt: Box::new(new_alt),
            })
        }
        Expr::Bin(BinExpr { op, left, right, .. })
            if matches!(op, BinaryOp::LogicalOr | BinaryOp::NullishCoalescing) =>
        {
            log::debug("element_expr: slot LogicalOr/NullishCoalescing");
            let left_inner = crate::utils::unwrap_expr(left.as_ref());
            let right_inner = crate::utils::unwrap_expr(right.as_ref());
            let new_left: Expr = if let Some(slot_expr) = jsx_expr_to_slot_expr(vt, left_inner) {
                slot_expr
            } else if expr_returns_jsx_renderable(left_inner) {
                make_expr_for_slot(vt, left_inner)
            } else {
                *left.clone()
            };
            let new_right: Expr = if let Some(slot_expr) = jsx_expr_to_slot_expr(vt, right_inner) {
                slot_expr
            } else if expr_returns_jsx_renderable(right_inner) {
                make_expr_for_slot(vt, right_inner)
            } else {
                *right.clone()
            };
            Expr::Bin(BinExpr {
                span: DUMMY_SP,
                op: *op,
                left: Box::new(new_left),
                right: Box::new(new_right),
            })
        }
        Expr::Call(call) if call_returns_jsx_renderable(call) => {
            log::debug("element_expr: slot CallExpr");
            // 对会返回 JSX 的调用做定向改写；无法识别时保持原调用，交给运行时兼容层。
            rewrite_call_for_slot(vt, call).unwrap_or_else(|| inner.clone())
        }
        _ => inner.clone(),
    }
}

pub fn contains_jsx_in_expr(inner_top: &Expr) -> bool {
    // 判定一个表达式是否包含 JSX：
    // - 直接是 JSXElement / JSXFragment
    // - 条件表达式分支包含 JSXElement / JSXFragment
    // - 逻辑与的右侧为 JSXElement / JSXFragment
    // - 外层括号包裹的这些情况
    match inner_top {
        Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            let cons_inner = crate::utils::unwrap_expr(cons.as_ref());
            let alt_inner = crate::utils::unwrap_expr(alt.as_ref());
            expr_returns_jsx_renderable(cons_inner) || expr_returns_jsx_renderable(alt_inner)
        }
        Expr::Bin(BinExpr {
            op: BinaryOp::LogicalOr | BinaryOp::NullishCoalescing,
            left,
            right,
            ..
        }) => {
            let left_inner = crate::utils::unwrap_expr(left.as_ref());
            let right_inner = crate::utils::unwrap_expr(right.as_ref());
            expr_returns_jsx_renderable(left_inner) || expr_returns_jsx_renderable(right_inner)
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, right, .. }) => {
            let right_inner = crate::utils::unwrap_expr(right.as_ref());
            expr_returns_jsx_renderable(right_inner)
        }
        Expr::Call(call) => call_returns_jsx_renderable(call),
        Expr::Paren(ParenExpr { expr, .. }) => {
            let inner = crate::utils::unwrap_expr(expr.as_ref());
            match inner {
                Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
                Expr::Cond(CondExpr { cons, alt, .. }) => {
                    let cons_inner = crate::utils::unwrap_expr(cons.as_ref());
                    let alt_inner = crate::utils::unwrap_expr(alt.as_ref());
                    expr_returns_jsx_renderable(cons_inner)
                        || expr_returns_jsx_renderable(alt_inner)
                }
                Expr::Bin(BinExpr {
                    op: BinaryOp::LogicalOr | BinaryOp::NullishCoalescing,
                    left,
                    right,
                    ..
                }) => {
                    let left_inner = crate::utils::unwrap_expr(left.as_ref());
                    let right_inner = crate::utils::unwrap_expr(right.as_ref());
                    expr_returns_jsx_renderable(left_inner)
                        || expr_returns_jsx_renderable(right_inner)
                }
                Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, right, .. }) => {
                    let right_inner = crate::utils::unwrap_expr(right.as_ref());
                    expr_returns_jsx_renderable(right_inner)
                }
                Expr::Call(call) => call_returns_jsx_renderable(call),
                _ => false,
            }
        }
        _ => false,
    }
}

pub fn emit_element_expr_container_child(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    ec: &JSXExprContainer,
    stmts: &mut Vec<Stmt>,
) {
    log::debug("element_expr: emit container child");
    // 处理元素子节点中的表达式容器：
    // - 若为 `obj.map(cb)` 且回调返回 JSX，生成 compiled keyed row factory
    // - 若为 `props.children` 或普通插槽，生成单个注释并以 `renderAnchor` 渲染
    // - 若表达式包含 JSX（条件/逻辑），统一改写为可挂载槽值再作为插槽渲染
    // - 若不含 JSX：
    //   - 父标签为 `style`：直接设置一次或 watch 更新 `textContent`
    //   - 其它：使用包装元素（`text`/`span`）并 watch 更新 `textContent`
    // 生成代码参考：`tests/spec14.rs`、`tests/lists_and_keys*.rs`
    match &ec.expr {
        JSXExpr::JSXEmptyExpr(_) => {}
        JSXExpr::Expr(expr) => {
            let inner = crate::utils::unwrap_expr(expr.as_ref());
            let list_stmt_start = stmts.len();
            if let Expr::Call(call) = inner.clone()
                && crate::element_list::try_build_list_from_map(vt, el_ident, &call, stmts)
                && stmts.len() > list_stmt_start
            {
                log::debug("element_expr: list map path");
                // map(JSX) 已经被列表模块完整接管，后续不再当普通表达式处理。
                return;
            }

            let inner_expr = crate::utils::unwrap_expr(expr.as_ref()).clone();
            // 识别任意对象的 .children 作为插槽（不再局限 props.children）
            if crate::utils::is_children_member_expr(&inner_expr) {
                log::debug("element_expr: children member expr (slot)");
                let is_children = true;
                crate::element_slot::render_between_for_slot(
                    vt,
                    el_ident,
                    &inner_expr,
                    is_children,
                    stmts,
                );
            } else {
                let inner_top = crate::utils::unwrap_expr(&inner_expr).clone();
                let contains_jsx = crate::element_expr::contains_jsx_in_expr(&inner_top);
                let parent_tag = vt.el_tag_by_ident.get(&el_ident.sym.to_string()).cloned();
                let parent_is_style = matches!(parent_tag.as_deref(), Some("style"));
                let parent_is_svg = parent_tag.as_deref().map(is_svg_tag).unwrap_or(false);
                let is_opaque_renderable_expr =
                    crate::element_expr::contains_opaque_renderable_expr(vt, &inner_top);
                if contains_jsx || (!parent_is_style && !parent_is_svg && is_opaque_renderable_expr)
                {
                    // 含 JSX 或“可能返回可挂载内容”的不透明表达式走 slot path；
                    // style/svg 文本环境例外，那里表达式更可能是纯文本内容。
                    log::debug("element_expr: renderable-like expr -> slot");
                    if let Some(compiled_branch) = try_make_compiled_branch_expr(vt, &inner_top) {
                        crate::element_slot::render_compiled_branch_for_slot(
                            vt,
                            el_ident,
                            &compiled_branch,
                            stmts,
                        );
                        return;
                    }
                    let expr_for_slot = crate::element_expr::make_expr_for_slot(vt, &inner_top);
                    let render_once = is_empty_deps_memoized_jsx_expr(&inner_top)
                        || is_empty_deps_memoized_jsx_expr(&expr_for_slot);
                    if render_once {
                        // 空依赖 memo wrapper 包住的 JSX 在语义上只创建一次，可直接一次性渲染。
                        crate::element_slot::render_once_for_slot(
                            vt,
                            el_ident,
                            &expr_for_slot,
                            stmts,
                        );
                    } else {
                        crate::element_slot::render_between_for_slot(
                            vt,
                            el_ident,
                            &expr_for_slot,
                            false,
                            stmts,
                        );
                    }
                } else {
                    log::debug("element_expr: text content path");
                    if matches!(parent_tag.as_deref(), Some("style")) {
                        // <style>{css}</style> 不能插入包装节点，只能直接改 style 元素的 textContent。
                        if crate::utils::is_static_empty_like(&inner_expr) {
                            let set_text = Expr::Call(CallExpr {
                                span: DUMMY_SP,
                                callee: Callee::Expr(Box::new(Expr::Ident(ident(
                                    "_$settextContent",
                                )))),
                                args: vec![
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Ident(el_ident.clone())),
                                    },
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Lit(Lit::Str(Str {
                                            span: DUMMY_SP,
                                            value: "".into(),
                                            raw: None,
                                        }))),
                                    },
                                ],
                                type_args: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(set_text),
                            }));
                        } else if crate::utils::is_static_text_literal(&inner_expr) {
                            if let Some(val_expr) =
                                crate::utils::get_static_text_literal_expr(&inner_expr)
                            {
                                let set_text = Expr::Call(CallExpr {
                                    span: DUMMY_SP,
                                    callee: Callee::Expr(Box::new(Expr::Ident(ident(
                                        "_$settextContent",
                                    )))),
                                    args: vec![
                                        ExprOrSpread {
                                            spread: None,
                                            expr: Box::new(Expr::Ident(el_ident.clone())),
                                        },
                                        ExprOrSpread { spread: None, expr: Box::new(val_expr) },
                                    ],
                                    type_args: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(set_text),
                                }));
                            }
                        } else {
                            let set_text = Expr::Call(CallExpr {
                                span: DUMMY_SP,
                                callee: Callee::Expr(Box::new(Expr::Ident(ident(
                                    "_$settextContent",
                                )))),
                                args: vec![
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Ident(el_ident.clone())),
                                    },
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(inner_expr.clone()),
                                    },
                                ],
                                type_args: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            if vt.is_once_context() {
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(set_text),
                                }));
                                return;
                            }
                            let arrow = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![],
                                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                    span: DUMMY_SP,
                                    ctxt: SyntaxContext::empty(),
                                    stmts: vec![Stmt::Expr(ExprStmt {
                                        span: DUMMY_SP,
                                        expr: Box::new(set_text),
                                    })],
                                })),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            let watch = call_ident("effect", vec![arrow]);
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(watch),
                            }));
                        }
                    } else {
                        crate::element_text::render_text_between_with_watch(
                            vt,
                            el_ident,
                            &inner_expr,
                            stmts,
                        );
                    }
                }
            }
        }
    }
}

pub(crate) fn emit_element_expr_container_child_at(
    vt: &mut VaporTransform,
    parent: &Ident,
    anchor: &Ident,
    ec: &JSXExprContainer,
    stmts: &mut Vec<Stmt>,
) {
    let JSXExpr::Expr(expr) = &ec.expr else {
        return;
    };
    let inner = crate::utils::unwrap_expr(expr.as_ref());
    let list_stmt_start = stmts.len();
    if let Expr::Call(call) = inner
        && crate::element_list::try_build_list_from_map_at(vt, parent, anchor, call, stmts)
        && stmts.len() > list_stmt_start
    {
        return;
    }

    let is_children = crate::utils::is_children_member_expr(inner);
    if !is_children && let Some(compiled_branch) = try_make_compiled_branch_expr(vt, inner) {
        crate::element_slot::render_compiled_branch_for_slot_at(
            vt,
            parent,
            &Expr::Ident(anchor.clone()),
            &compiled_branch,
            stmts,
        );
        return;
    }
    let expr_for_slot = if is_children { inner.clone() } else { make_expr_for_slot(vt, inner) };
    let render_once =
        is_empty_deps_memoized_jsx_expr(inner) || is_empty_deps_memoized_jsx_expr(&expr_for_slot);
    if render_once {
        crate::element_slot::render_once_for_slot_at(vt, parent, anchor, &expr_for_slot, stmts);
    } else {
        crate::element_slot::render_between_for_slot_at(vt, parent, anchor, &expr_for_slot, stmts);
    }
}

#[cfg(test)]
#[path = "element_expr_tests.rs"]
mod tests;
