use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith, VisitWith};

use crate::emit::{call_ident, call_member, const_decl, ident, ident_name, string_expr};
use crate::utils;

pub(crate) struct RowTemplate {
    getter: Ident,
    html: String,
}

pub(crate) fn mark_simple_native_row_template(
    expr: &mut Expr,
    scope: usize,
) -> Option<RowTemplate> {
    let Expr::JSXElement(element) = expr else { return None };
    let template = crate::vapor::template::StaticTemplate::classify_simple_row(element)?;
    // Module template collection cannot see JSX nested inside a list callback. Give the row
    // skeleton a list-local id and bind its getter around the reusable factory below.
    let id = 1_000_000usize.checked_add(scope)?;
    element.opening.attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr {
        span: DUMMY_SP,
        name: JSXAttrName::Ident(ident("__rue_static_template_id__").into()),
        value: Some(JSXAttrValue::Str(Str {
            span: DUMMY_SP,
            value: id.to_string().into(),
            raw: None,
        })),
    }));
    Some(RowTemplate { getter: ident(&format!("_$getTemplate{id}")), html: template.html })
}

pub(crate) fn row_template_decl(template: RowTemplate) -> Stmt {
    const_decl(template.getter, call_ident("_$template", vec![string_expr(&template.html)]))
}

pub(crate) fn direct_row_item_decl(slot: Ident, item: Ident) -> Stmt {
    Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        kind: VarDeclKind::Let,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent { id: slot, type_ann: None }),
            init: Some(Box::new(Expr::Ident(item))),
            definite: false,
        }],
    })))
}

pub(crate) fn direct_row_item_update(slot: Ident, next: Ident) -> Stmt {
    Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Assign(AssignExpr {
            span: DUMMY_SP,
            op: AssignOp::Assign,
            left: AssignTarget::Simple(SimpleAssignTarget::Ident(slot.into())),
            right: Box::new(Expr::Ident(next)),
        })),
    })
}

struct DirectRowItemReadRewriter {
    slot: Ident,
}

impl VisitMut for DirectRowItemReadRewriter {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Call(call) = expr
            && call.args.is_empty()
            && let Callee::Expr(callee) = &call.callee
            && let Expr::Member(member) = utils::unwrap_expr(callee.as_ref())
            && let Expr::Ident(object) = utils::unwrap_expr(member.obj.as_ref())
            && object.to_id() == self.slot.to_id()
            && matches!(&member.prop, MemberProp::Ident(prop) if prop.sym == *"get")
        {
            *expr = Expr::Ident(self.slot.clone());
            return;
        }
        expr.visit_mut_children_with(self);
    }
}

pub(crate) fn rewrite_direct_row_item_reads_in_expr(expr: &mut Expr, slot: &Ident) {
    expr.visit_mut_with(&mut DirectRowItemReadRewriter { slot: slot.clone() });
}

pub(crate) fn rewrite_direct_row_item_reads_in_stmt(stmt: &mut Stmt, slot: &Ident) {
    stmt.visit_mut_with(&mut DirectRowItemReadRewriter { slot: slot.clone() });
}

fn direct_row_field(expr: &Expr, row: &Ident) -> bool {
    matches!(
        utils::unwrap_expr(expr),
        Expr::Member(MemberExpr {
            obj,
            prop: MemberProp::Ident(_),
            ..
        }) if matches!(utils::unwrap_expr(obj), Expr::Ident(object) if object.to_id() == row.to_id())
    )
}

fn compiled_row_selector(expr: &Expr, row: &Ident) -> bool {
    fn classify(expr: &Expr, row: &Ident) -> Option<bool> {
        match utils::unwrap_expr(expr) {
            Expr::Lit(_) => Some(false),
            expr if direct_row_field(expr, row) => Some(false),
            Expr::Call(call) => {
                let Callee::Expr(callee) = &call.callee else {
                    return None;
                };
                (matches!(utils::unwrap_expr(callee.as_ref()), Expr::Ident(name) if name.sym.ends_with("_selector"))
                    && !call.args.is_empty()
                    && call.args.iter().all(|arg| {
                        arg.spread.is_none()
                            && (matches!(utils::unwrap_expr(arg.expr.as_ref()), Expr::Lit(_))
                                || direct_row_field(arg.expr.as_ref(), row))
                    }))
                .then_some(true)
            }
            Expr::Cond(cond) => {
                let test = classify(&cond.test, row)?;
                let cons = classify(&cond.cons, row)?;
                let alt = classify(&cond.alt, row)?;
                Some(test || cons || alt)
            }
            _ => None,
        }
    }

    classify(expr, row) == Some(true)
}

fn is_event(name: &str) -> bool {
    name.starts_with("on") && name.chars().nth(2).is_some_and(char::is_uppercase)
}

fn simple_children(children: &[JSXElementChild], row: &Ident) -> bool {
    children.iter().all(|child| match child {
        JSXElementChild::JSXText(_) => true,
        JSXElementChild::JSXElement(element) => simple_native_element(element, row, false),
        JSXElementChild::JSXExprContainer(JSXExprContainer {
            expr: JSXExpr::JSXEmptyExpr(_),
            ..
        }) => true,
        JSXElementChild::JSXExprContainer(JSXExprContainer {
            expr: JSXExpr::Expr(expr), ..
        }) => direct_row_field(expr, row),
        JSXElementChild::JSXFragment(_) | JSXElementChild::JSXSpreadChild(_) => false,
    })
}

fn simple_native_element(element: &JSXElement, row: &Ident, root: bool) -> bool {
    if utils::is_component(&element.opening.name) || utils::is_builtin_fragment_element(element) {
        return false;
    }
    if !matches!(&element.opening.name, JSXElementName::Ident(name) if name.sym.chars().next().is_some_and(|ch| ch.is_ascii_lowercase()))
    {
        return false;
    }
    let attrs = element.opening.attrs.iter().all(|attr| match attr {
        JSXAttrOrSpread::SpreadElement(_) => false,
        JSXAttrOrSpread::JSXAttr(attr) => {
            let JSXAttrName::Ident(name) = &attr.name else { return false };
            let name = name.sym.as_ref();
            if name == "key" {
                return root;
            }
            if name == "ref" {
                return false;
            }
            if is_event(name) {
                return true;
            }
            match &attr.value {
                None | Some(JSXAttrValue::Str(_)) => true,
                Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                    expr: JSXExpr::JSXEmptyExpr(_),
                    ..
                })) => true,
                Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                    expr: JSXExpr::Expr(expr),
                    ..
                })) => {
                    direct_row_field(expr, row)
                        || (matches!(name, "class" | "className")
                            && compiled_row_selector(expr, row))
                }
                _ => false,
            }
        }
    });
    attrs && simple_children(&element.children, row)
}

pub(crate) fn accepts_simple_native_row(expr: &Expr, row: &Ident) -> bool {
    matches!(utils::unwrap_expr(expr), Expr::JSXElement(element) if simple_native_element(element, row, true))
}

fn ownerless_event_handler(attr: &JSXAttr) -> bool {
    let JSXAttrName::Ident(name) = &attr.name else { return false };
    if !is_event(name.sym.as_ref()) {
        return true;
    }
    let Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
        expr: JSXExpr::Expr(handler), ..
    })) = &attr.value
    else {
        return false;
    };
    crate::attrs::is_compiled_delegated_event(name.sym.as_ref(), handler)
}

fn ownerless_native_resources(element: &JSXElement) -> bool {
    element.opening.attrs.iter().all(|attr| match attr {
        JSXAttrOrSpread::SpreadElement(_) => false,
        JSXAttrOrSpread::JSXAttr(attr) => ownerless_event_handler(attr),
    }) && element.children.iter().all(|child| match child {
        JSXElementChild::JSXElement(child) => ownerless_native_resources(child),
        JSXElementChild::JSXFragment(_) | JSXElementChild::JSXSpreadChild(_) => false,
        _ => true,
    })
}

/// The stricter resource proof used by the ownerless single-row ABI.
///
/// The existing simple-row classifier is intentionally broader because the owned
/// direct-patch path supports capture listeners and event-parameter handlers.
pub(crate) fn accepts_ownerless_simple_native_row(expr: &Expr, row: &Ident) -> bool {
    matches!(
        utils::unwrap_expr(expr),
        Expr::JSXElement(element)
            if simple_native_element(element, row, true) && ownerless_native_resources(element)
    )
}

fn call_name(call: &CallExpr) -> Option<&str> {
    let Callee::Expr(callee) = &call.callee else { return None };
    let Expr::Ident(name) = callee.as_ref() else { return None };
    Some(name.sym.as_ref())
}

fn arrow_call_body(call: &CallExpr) -> Option<Vec<Stmt>> {
    let Expr::Arrow(arrow) = call.args.first()?.expr.as_ref() else { return None };
    Some(match arrow.body.as_ref() {
        BlockStmtOrExpr::BlockStmt(block) => block.stmts.clone(),
        BlockStmtOrExpr::Expr(expr) => {
            vec![Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: expr.clone() })]
        }
    })
}

fn text_value(value: Expr) -> Expr {
    let nullish = Expr::Bin(BinExpr {
        span: DUMMY_SP,
        op: BinaryOp::EqEq,
        left: Box::new(value.clone()),
        right: Box::new(Expr::Lit(Lit::Null(Null { span: DUMMY_SP }))),
    });
    let boolean = Expr::Bin(BinExpr {
        span: DUMMY_SP,
        op: BinaryOp::EqEqEq,
        left: Box::new(Expr::Unary(UnaryExpr {
            span: DUMMY_SP,
            op: UnaryOp::TypeOf,
            arg: Box::new(value.clone()),
        })),
        right: Box::new(string_expr("boolean")),
    });
    Expr::Cond(CondExpr {
        span: DUMMY_SP,
        test: Box::new(Expr::Bin(BinExpr {
            span: DUMMY_SP,
            op: BinaryOp::LogicalOr,
            left: Box::new(nullish),
            right: Box::new(boolean),
        })),
        cons: Box::new(string_expr("")),
        alt: Box::new(call_ident("String", vec![value])),
    })
}

fn assignment(target: Expr, value: Expr) -> Stmt {
    Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Assign(AssignExpr {
            span: DUMMY_SP,
            op: AssignOp::Assign,
            left: AssignTarget::Simple(SimpleAssignTarget::Member(MemberExpr {
                span: DUMMY_SP,
                obj: Box::new(target),
                prop: MemberProp::Ident(ident_name("textContent")),
            })),
            right: Box::new(value),
        })),
    })
}

fn guarded_text_binding(target: Expr, reader: Expr, index: usize) -> (Vec<Stmt>, Stmt) {
    let value = ident(&format!("_$rowTextValue{index}"));
    let next = ident(&format!("_$rowTextNext{index}"));
    let init = Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        kind: VarDeclKind::Let,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent { id: value.clone(), type_ann: None }),
            init: Some(Box::new(text_value(reader.clone()))),
            definite: false,
        }],
    })));
    let next_decl = const_decl(next.clone(), text_value(reader));
    let write = Stmt::If(IfStmt {
        span: DUMMY_SP,
        test: Box::new(Expr::Unary(UnaryExpr {
            span: DUMMY_SP,
            op: UnaryOp::Bang,
            arg: Box::new(call_member(
                ident("Object"),
                "is",
                vec![Expr::Ident(value.clone()), Expr::Ident(next.clone())],
            )),
        })),
        cons: Box::new(Stmt::Block(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: vec![
                assignment(target.clone(), Expr::Ident(next.clone())),
                Stmt::Expr(ExprStmt {
                    span: DUMMY_SP,
                    expr: Box::new(Expr::Assign(AssignExpr {
                        span: DUMMY_SP,
                        op: AssignOp::Assign,
                        left: AssignTarget::Simple(SimpleAssignTarget::Ident(value.clone().into())),
                        right: Box::new(Expr::Ident(next)),
                    })),
                }),
            ],
        })),
        alt: None,
    });
    let block = Stmt::Block(BlockStmt {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        stmts: vec![next_decl, write],
    });
    (vec![init, assignment(target, Expr::Ident(value))], block)
}

struct DirectBindingCollector {
    patch_impl: Ident,
    next_text: usize,
    found: bool,
}

#[derive(Default)]
struct CompiledSelectorRead {
    found: bool,
    selector: Option<Ident>,
    key: Option<Expr>,
    ambiguous: bool,
}

impl swc_core::ecma::visit::Visit for CompiledSelectorRead {
    fn visit_call_expr(&mut self, call: &CallExpr) {
        let Callee::Expr(callee) = &call.callee else {
            call.visit_children_with(self);
            return;
        };
        let Expr::Ident(ident) = crate::utils::unwrap_expr(callee) else {
            call.visit_children_with(self);
            return;
        };
        if ident.sym.ends_with("_selector") && call.args.len() == 1 && call.args[0].spread.is_none()
        {
            self.found = true;
            if self.selector.as_ref().is_some_and(|selector| selector.to_id() != ident.to_id())
                || self.key.is_some()
            {
                self.ambiguous = true;
            } else {
                self.selector = Some(ident.clone());
                self.key = Some((*call.args[0].expr).clone());
            }
        }
        call.visit_children_with(self);
    }
}

fn compiled_selector_read(call: &CallExpr) -> Option<(Ident, Expr)> {
    use swc_core::ecma::visit::VisitWith;

    let mut read = CompiledSelectorRead::default();
    call.visit_with(&mut read);
    (read.found && !read.ambiguous).then(|| read.selector.zip(read.key)).flatten()
}

impl VisitMut for DirectBindingCollector {
    fn visit_mut_block_stmt(&mut self, block: &mut BlockStmt) {
        for stmt in &mut block.stmts {
            stmt.visit_mut_children_with(self);
        }
        let stmts = &mut block.stmts;
        let mut next_stmts = Vec::with_capacity(stmts.len());
        let mut patch_blocks = Vec::new();
        for stmt in std::mem::take(stmts) {
            if let Stmt::Expr(expr_stmt) = &stmt
                && let Expr::Call(call) = expr_stmt.expr.as_ref()
            {
                if call_name(call) == Some("effect")
                    && let Some(body) = arrow_call_body(call)
                {
                    let block = Stmt::Block(BlockStmt {
                        span: DUMMY_SP,
                        ctxt: SyntaxContext::empty(),
                        stmts: body,
                    });
                    if let Some((selector, key)) = compiled_selector_read(call) {
                        let callback =
                            call.args.first().expect("effect callback").expr.as_ref().clone();
                        next_stmts.push(Stmt::Expr(ExprStmt {
                            span: DUMMY_SP,
                            expr: Box::new(call_ident(
                                "onOwnerCleanup",
                                vec![call_member(
                                    selector,
                                    "subscribeKeyUnique",
                                    vec![key, callback],
                                )],
                            )),
                        }));
                    } else {
                        next_stmts.push(block.clone());
                        patch_blocks.push(block);
                    }
                    self.found = true;
                    continue;
                }
                if call_name(call) == Some("_$compiledText")
                    && call.args.len() == 2
                    && call.args.iter().all(|arg| arg.spread.is_none())
                    && let Expr::Arrow(reader) = call.args[1].expr.as_ref()
                    && let BlockStmtOrExpr::Expr(value) = reader.body.as_ref()
                {
                    let (decls, block) = guarded_text_binding(
                        call.args[0].expr.as_ref().clone(),
                        value.as_ref().clone(),
                        self.next_text,
                    );
                    self.next_text += 1;
                    next_stmts.extend(decls);
                    patch_blocks.push(block);
                    self.found = true;
                    continue;
                }
            }
            next_stmts.push(stmt);
        }
        if !patch_blocks.is_empty() {
            let assignment = Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(Expr::Assign(AssignExpr {
                    span: DUMMY_SP,
                    op: AssignOp::Assign,
                    left: AssignTarget::Simple(SimpleAssignTarget::Ident(
                        self.patch_impl.clone().into(),
                    )),
                    right: Box::new(Expr::Arrow(ArrowExpr {
                        span: DUMMY_SP,
                        params: Vec::new(),
                        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                            span: DUMMY_SP,
                            ctxt: SyntaxContext::empty(),
                            stmts: patch_blocks,
                        })),
                        is_async: false,
                        is_generator: false,
                        type_params: None,
                        return_type: None,
                        ctxt: SyntaxContext::empty(),
                    })),
                })),
            });
            let insert_at = next_stmts
                .iter()
                .rposition(|stmt| matches!(stmt, Stmt::Return(_)))
                .unwrap_or(next_stmts.len());
            next_stmts.insert(insert_at, assignment);
        }
        *stmts = next_stmts;
    }
}

pub(crate) fn lower_simple_native_row_factory(factory: &mut Expr, patch_impl: Ident) -> bool {
    let mut collector = DirectBindingCollector { patch_impl, next_text: 1, found: false };
    factory.visit_mut_with(&mut collector);
    collector.found
}
