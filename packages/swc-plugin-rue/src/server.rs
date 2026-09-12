use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitMut, VisitMutWith, VisitWith};

use crate::emit::{call_ident, str_lit, string_expr};

/// JSX lowering for the server renderer's compiler-only operation protocol.
pub(crate) struct ServerTransform {
    pub(crate) did_transform: bool,
    pub(crate) hydrate: bool,
    pub(crate) next_node: usize,
    pub(crate) slot_props: std::collections::HashSet<(Id, String)>,
    pub(crate) builtins: std::collections::HashMap<Id, String>,
    pub(crate) component_spans: Vec<swc_core::common::Span>,
}

impl ServerTransform {
    fn is_slot_read(&self, member: &MemberExpr) -> bool {
        let name = match &member.prop {
            MemberProp::Ident(i) => i.sym.to_string(),
            MemberProp::Computed(c) => match c.expr.as_ref() {
                Expr::Lit(Lit::Str(s)) => s.value.to_string_lossy().to_string(),
                _ => return false,
            },
            _ => return false,
        };
        name == "children"
            || matches!(member.obj.as_ref(), Expr::Ident(i) if self.slot_props.contains(&(i.to_id(), name)))
    }

    fn jsx_object_to_expr(object: &JSXObject) -> Expr {
        match object {
            JSXObject::Ident(ident) => Expr::Ident(ident.clone()),
            JSXObject::JSXMemberExpr(member) => Expr::Member(MemberExpr {
                span: DUMMY_SP,
                obj: Box::new(Self::jsx_object_to_expr(&member.obj)),
                prop: MemberProp::Ident(member.prop.clone()),
            }),
        }
    }

    fn component_name_to_expr(name: &JSXElementName) -> Expr {
        match name {
            JSXElementName::Ident(ident) => Expr::Ident(ident.clone()),
            JSXElementName::JSXMemberExpr(member) => Expr::Member(MemberExpr {
                span: DUMMY_SP,
                obj: Box::new(Self::jsx_object_to_expr(&member.obj)),
                prop: MemberProp::Ident(member.prop.clone()),
            }),
            JSXElementName::JSXNamespacedName(name) => {
                string_expr(&format!("{}:{}", name.ns.sym, name.name.sym))
            }
        }
    }

    fn native_name_to_expr(name: &JSXElementName) -> Expr {
        match name {
            JSXElementName::Ident(ident) => string_expr(ident.sym.as_ref()),
            JSXElementName::JSXNamespacedName(name) => {
                string_expr(&format!("{}:{}", name.ns.sym, name.name.sym))
            }
            JSXElementName::JSXMemberExpr(_) => Self::component_name_to_expr(name),
        }
    }

    fn attr_name(name: &JSXAttrName) -> PropName {
        match name {
            JSXAttrName::Ident(ident) => {
                let raw = ident.sym.as_ref();
                let mut chars = raw.chars();
                let safe = chars
                    .next()
                    .is_some_and(|ch| ch == '$' || ch == '_' || ch.is_ascii_alphabetic())
                    && chars.all(|ch| ch == '$' || ch == '_' || ch.is_ascii_alphanumeric());
                if safe { PropName::Ident(ident.clone()) } else { PropName::Str(str_lit(raw)) }
            }
            JSXAttrName::JSXNamespacedName(name) => {
                PropName::Str(str_lit(&format!("{}:{}", name.ns.sym, name.name.sym)))
            }
        }
    }

    fn lower_attr_value(&mut self, value: Option<JSXAttrValue>) -> Expr {
        match value {
            None => Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
            Some(JSXAttrValue::Str(value)) => {
                Expr::Lit(Lit::Str(Str { span: value.span, value: value.value, raw: None }))
            }
            Some(JSXAttrValue::JSXExprContainer(container)) => match container.expr {
                JSXExpr::Expr(mut expr) => {
                    expr.visit_mut_with(self);
                    *expr
                }
                JSXExpr::JSXEmptyExpr(_) => Expr::Ident(crate::emit::ident("undefined")),
            },
            Some(JSXAttrValue::JSXElement(element)) => self.lower_element(*element),
            Some(JSXAttrValue::JSXFragment(fragment)) => self.lower_fragment(fragment),
        }
    }

    fn lower_props(&mut self, attrs: Vec<JSXAttrOrSpread>) -> Expr {
        if attrs.is_empty() {
            return Expr::Lit(Lit::Null(Null { span: DUMMY_SP }));
        }

        let props = attrs
            .into_iter()
            .map(|attr| match attr {
                JSXAttrOrSpread::SpreadElement(mut spread) => {
                    spread.expr.visit_mut_with(self);
                    PropOrSpread::Spread(spread)
                }
                JSXAttrOrSpread::JSXAttr(attr) => {
                    PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                        key: Self::attr_name(&attr.name),
                        value: Box::new(self.lower_attr_value(attr.value)),
                    })))
                }
            })
            .collect();
        Expr::Object(ObjectLit { span: DUMMY_SP, props })
    }

    fn arrow(&self, params: Vec<Pat>, body: BlockStmtOrExpr, asynchronous: bool) -> Expr {
        Expr::Arrow(ArrowExpr {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            params,
            body: Box::new(body),
            is_async: asynchronous,
            is_generator: false,
            type_params: None,
            return_type: None,
        })
    }

    fn getter(&self, expression: Expr) -> Expr {
        self.arrow(vec![], BlockStmtOrExpr::Expr(Box::new(expression)), false)
    }

    fn instruction(&self, kind: &str, args: Vec<Expr>) -> Stmt {
        let call =
            call_ident(&format!("_${}{kind}", if self.hydrate { "claim" } else { "write" }), args);
        Stmt::Expr(ExprStmt {
            span: DUMMY_SP,
            expr: Box::new(if self.hydrate {
                call
            } else {
                Expr::Await(AwaitExpr { span: DUMMY_SP, arg: Box::new(call) })
            }),
        })
    }

    fn context() -> Expr {
        Expr::Ident(crate::emit::ident("_$ctx"))
    }
    fn id(&mut self) -> Expr {
        let id = self.next_node;
        self.next_node += 1;
        string_expr(&id.to_string())
    }
    fn plan(&mut self, children: Vec<JSXElementChild>) -> Expr {
        let stmts = self.instructions(children);
        self.arrow(
            vec![Pat::Ident(crate::emit::ident("_$ctx").into())],
            BlockStmtOrExpr::BlockStmt(BlockStmt {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                stmts,
            }),
            !self.hydrate,
        )
    }
    fn expression_plan(&mut self, expression: Expr) -> Expr {
        self.plan(vec![JSXElementChild::JSXExprContainer(JSXExprContainer {
            span: DUMMY_SP,
            expr: JSXExpr::Expr(Box::new(expression)),
        })])
    }
    fn instructions(&mut self, children: Vec<JSXElementChild>) -> Vec<Stmt> {
        let siblings = children.clone();
        let mut stmts = vec![];
        for (index, child) in children.into_iter().enumerate() {
            match child {
                JSXElementChild::JSXText(text) => {
                    let normalized = crate::text::normalize_text(text.value.as_ref());
                    if let Some(text) =
                        crate::text::compute_jsx_text_content(&siblings, index, &normalized)
                    {
                        self.expression(string_expr(&text), &mut stmts);
                    }
                }
                JSXElementChild::JSXElement(el) => self.element(*el, &mut stmts),
                JSXElementChild::JSXFragment(fragment) => {
                    stmts.extend(self.instructions(fragment.children))
                }
                JSXElementChild::JSXExprContainer(container) => {
                    if let JSXExpr::Expr(expr) = container.expr {
                        self.expression(*expr, &mut stmts);
                    }
                }
                JSXElementChild::JSXSpreadChild(_) => panic!(
                    "Rue SSR/claim requires statically compiled children; JSX spread children are unsupported"
                ),
            }
        }
        stmts
    }
    fn expression(&mut self, expression: Expr, stmts: &mut Vec<Stmt>) {
        match expression {
            Expr::Paren(p) => self.expression(*p.expr, stmts),
            Expr::TsAs(p) => self.expression(*p.expr, stmts),
            Expr::TsTypeAssertion(p) => self.expression(*p.expr, stmts),
            Expr::TsNonNull(p) => self.expression(*p.expr, stmts),
            Expr::TsSatisfies(p) => self.expression(*p.expr, stmts),
            Expr::JSXElement(el) => self.element(*el, stmts),
            Expr::JSXFragment(f) => stmts.extend(self.instructions(f.children)),
            Expr::Lit(Lit::Null(_) | Lit::Bool(_)) => {}
            Expr::Ident(ref id) if id.sym == *"undefined" => {}
            Expr::Object(_) => {
                panic!("Rue SSR/claim rejects object children; use a compiled component")
            }
            Expr::Array(array) => {
                for item in array.elems.into_iter().flatten() {
                    if item.spread.is_some() {
                        panic!("Rue SSR/claim rejects spread child arrays");
                    }
                    self.expression(*item.expr, stmts);
                }
            }
            Expr::Cond(cond) => {
                let id = self.id();
                let yes = self.expression_plan(*cond.cons);
                let no = self.expression_plan(*cond.alt);
                let choose = self.getter(Expr::Cond(CondExpr {
                    span: DUMMY_SP,
                    test: cond.test,
                    cons: Box::new(Expr::Lit(Lit::Num(Number {
                        span: DUMMY_SP,
                        value: 1.0,
                        raw: None,
                    }))),
                    alt: Box::new(Expr::Lit(Lit::Num(Number {
                        span: DUMMY_SP,
                        value: 0.0,
                        raw: None,
                    }))),
                }));
                stmts.push(self.instruction("Range", vec![Self::context(), id, choose, yes, no]));
            }
            Expr::Bin(bin) if bin.op == BinaryOp::LogicalAnd => self.expression(
                Expr::Cond(CondExpr {
                    span: DUMMY_SP,
                    test: bin.left,
                    cons: bin.right,
                    alt: Box::new(Expr::Lit(Lit::Null(Null { span: DUMMY_SP }))),
                }),
                stmts,
            ),
            Expr::Call(call) if matches!(&call.callee, Callee::Expr(c) if matches!(c.as_ref(), Expr::Member(m) if matches!(&m.prop, MemberProp::Ident(i) if i.sym == *"map"))) =>
            {
                let Callee::Expr(callee) = call.callee else { unreachable!() };
                let Expr::Member(member) = *callee else { unreachable!() };
                let Some(arg) = call.args.first() else {
                    panic!("Rue SSR/claim list requires a row function")
                };
                let Expr::Arrow(row) = arg.expr.as_ref() else {
                    panic!("Rue SSR/claim list requires an inline row factory")
                };
                let mut row_body = (*row.body).clone();
                let key_body = row_body.clone();
                let id = self.id();
                let key_params = row.params.clone();
                let mut reads = std::collections::HashMap::new();
                let mut params = Vec::new();
                struct RowNames(std::collections::HashSet<String>);
                impl Visit for RowNames {
                    fn visit_ident(&mut self, ident: &Ident) {
                        self.0.insert(ident.sym.to_string());
                    }
                }
                let mut used = RowNames(std::collections::HashSet::new());
                row_body.visit_with(&mut used);
                for (index, pattern) in row.params.iter().enumerate() {
                    let mut local = format!("_$rowArg{index}");
                    while used.0.contains(&local) {
                        local.push('_');
                    }
                    used.0.insert(local.clone());
                    let name = crate::emit::ident(&local);
                    let getter = call_ident(name.sym.as_ref(), vec![]);
                    collect_row_pattern_reads(pattern, getter, &mut reads);
                    params.push(Pat::Ident(BindingIdent { id: name, type_ann: None }));
                }
                let mut prop_reads = PlanPropReads(reads);
                row_body.visit_mut_with(&mut prop_reads);
                let row_factory_body = match row_body {
                    BlockStmtOrExpr::Expr(body) => {
                        BlockStmtOrExpr::Expr(Box::new(self.expression_plan(*body)))
                    }
                    BlockStmtOrExpr::BlockStmt(mut block) => {
                        block.visit_mut_with(&mut ServerListBlockReturns { transform: self });
                        block.stmts.push(Stmt::Return(ReturnStmt {
                            span: DUMMY_SP,
                            arg: Some(Box::new(self.plan(vec![]))),
                        }));
                        BlockStmtOrExpr::BlockStmt(block)
                    }
                };
                let row_factory = self.arrow(params.clone(), row_factory_body, false);
                let key_fn = match key_body {
                    BlockStmtOrExpr::Expr(body) => list_row_key(body.as_ref()).map_or_else(
                        || Expr::Lit(Lit::Null(Null { span: DUMMY_SP })),
                        |key| self.arrow(key_params, BlockStmtOrExpr::Expr(Box::new(key)), false),
                    ),
                    BlockStmtOrExpr::BlockStmt(mut block) => {
                        let mut keys = ServerListBlockKeys { count: 0 };
                        block.visit_mut_with(&mut keys);
                        if keys.count == 0 {
                            Expr::Lit(Lit::Null(Null { span: DUMMY_SP }))
                        } else {
                            block.stmts.push(Stmt::Return(ReturnStmt {
                                span: DUMMY_SP,
                                arg: Some(Box::new(Expr::Lit(Lit::Null(Null { span: DUMMY_SP })))),
                            }));
                            self.arrow(key_params, BlockStmtOrExpr::BlockStmt(block), false)
                        }
                    }
                };
                stmts.push(self.instruction(
                    "List",
                    vec![Self::context(), id, self.getter(*member.obj), row_factory, key_fn],
                ));
            }
            Expr::Member(ref member) if self.is_slot_read(member) => {
                let id = self.id();
                stmts.push(
                    self.instruction("Slot", vec![Self::context(), id, self.getter(expression)]),
                );
            }
            expression => {
                let id = self.id();
                stmts.push(
                    self.instruction("Text", vec![Self::context(), id, self.getter(expression)]),
                );
            }
        }
    }
    fn element(&mut self, element: JSXElement, stmts: &mut Vec<Stmt>) {
        let local_name = match &element.opening.name {
            JSXElementName::Ident(i) => i.sym.to_string(),
            _ => String::new(),
        };
        let name = self
            .builtins
            .get(&match &element.opening.name {
                JSXElementName::Ident(i) => i.to_id(),
                _ => ("".into(), SyntaxContext::empty()),
            })
            .cloned()
            .unwrap_or(local_name.clone());
        if (name == "Fragment" || name == "Template")
            && matches!(&element.opening.name, JSXElementName::Ident(i) if self.builtins.contains_key(&i.to_id()))
        {
            stmts.extend(self.instructions(element.children));
            return;
        }
        let id = self.id();
        let component = crate::utils::is_component(&element.opening.name);
        let builtin = self.builtins.contains_key(&match &element.opening.name {
            JSXElementName::Ident(i) => i.to_id(),
            _ => ("".into(), SyntaxContext::empty()),
        }) && ["Teleport", "Transition", "TransitionGroup", "KeepAlive", "Suspense"]
            .contains(&name.as_str());
        let props = self.lower_props(element.opening.attrs);
        if !component && ["textarea", "title", "script", "style"].contains(&name.as_str()) {
            let mut values = vec![];
            for child in element.children {
                let value = match child {
                    JSXElementChild::JSXText(text) => string_expr(text.value.as_ref()),
                    JSXElementChild::JSXExprContainer(JSXExprContainer {
                        expr: JSXExpr::Expr(expr),
                        ..
                    }) => *expr,
                    JSXElementChild::JSXExprContainer(_) => continue,
                    _ => panic!("Rue raw text elements require scalar children"),
                };
                values.push(Some(ExprOrSpread { spread: None, expr: Box::new(value) }));
            }
            let raw_id = self.id();
            let raw = self.instruction(
                "RawText",
                vec![
                    Self::context(),
                    raw_id,
                    self.getter(Expr::Array(ArrayLit { span: DUMMY_SP, elems: values })),
                ],
            );
            let children = self.arrow(
                vec![Pat::Ident(crate::emit::ident("_$ctx").into())],
                BlockStmtOrExpr::BlockStmt(BlockStmt {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    stmts: vec![raw],
                }),
                !self.hydrate,
            );
            stmts.push(self.instruction(
                "Element",
                vec![Self::context(), id, string_expr(&name), self.getter(props), children],
            ));
            return;
        }
        let meaningful: Vec<_> = element
            .children
            .iter()
            .filter(
                |child| !matches!(child, JSXElementChild::JSXText(t) if t.value.trim().is_empty()),
            )
            .cloned()
            .collect();
        let mut selection = None;
        if builtin && ["Transition", "KeepAlive"].contains(&name.as_str()) && meaningful.len() == 1
        {
            if let JSXElementChild::JSXExprContainer(JSXExprContainer {
                expr: JSXExpr::Expr(expr),
                ..
            }) = &meaningful[0]
            {
                match expr.as_ref() {
                    Expr::Cond(cond) => {
                        selection =
                            Some(((*cond.test).clone(), (*cond.cons).clone(), (*cond.alt).clone()))
                    }
                    Expr::Bin(bin) if bin.op == BinaryOp::LogicalAnd => {
                        selection = Some((
                            (*bin.left).clone(),
                            (*bin.right).clone(),
                            Expr::Lit(Lit::Null(Null { span: DUMMY_SP })),
                        ))
                    }
                    _ => {}
                }
            }
        }
        let (children, extra) = if let Some((test, yes, no)) = selection {
            let yes = self.expression_plan(yes);
            let no = self.expression_plan(no);
            (yes, vec![self.getter(test), no])
        } else {
            (
                if component && !builtin && meaningful.is_empty() {
                    Expr::Lit(Lit::Null(Null { span: DUMMY_SP }))
                } else {
                    self.plan(element.children)
                },
                vec![],
            )
        };
        let type_expr = if component {
            Self::component_name_to_expr(&element.opening.name)
        } else {
            Self::native_name_to_expr(&element.opening.name)
        };
        stmts.push(self.instruction(
            if builtin {
                &name
            } else if component {
                "Component"
            } else {
                "Element"
            },
            if builtin {
                let mut args = vec![Self::context(), id, self.getter(props), children];
                args.extend(extra);
                args
            } else {
                vec![Self::context(), id, type_expr, self.getter(props), children]
            },
        ));
    }
    fn lower_element(&mut self, element: JSXElement) -> Expr {
        self.did_transform = true;
        self.plan(vec![JSXElementChild::JSXElement(Box::new(element))])
    }
    fn lower_fragment(&mut self, fragment: JSXFragment) -> Expr {
        self.did_transform = true;
        self.plan(fragment.children)
    }
}

fn root_jsx(expression: &Expr) -> bool {
    match expression {
        Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
        Expr::Paren(p) => root_jsx(&p.expr),
        Expr::Cond(c) => root_jsx(&c.cons) || root_jsx(&c.alt),
        Expr::Bin(b) if b.op == BinaryOp::LogicalAnd => root_jsx(&b.right),
        Expr::Array(a) => a.elems.iter().flatten().any(|e| root_jsx(&e.expr)),
        _ => false,
    }
}

fn list_row_key(expression: &Expr) -> Option<Expr> {
    let element = match expression {
        Expr::Paren(value) => return list_row_key(value.expr.as_ref()),
        Expr::TsAs(value) => return list_row_key(value.expr.as_ref()),
        Expr::TsTypeAssertion(value) => return list_row_key(value.expr.as_ref()),
        Expr::TsNonNull(value) => return list_row_key(value.expr.as_ref()),
        Expr::TsSatisfies(value) => return list_row_key(value.expr.as_ref()),
        Expr::JSXElement(element) => element,
        _ => return None,
    };
    element.opening.attrs.iter().find_map(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(JSXAttr {
            name: JSXAttrName::Ident(name),
            value:
                Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                    expr: JSXExpr::Expr(value),
                    ..
                })),
            ..
        }) if name.sym == *"key" => Some((**value).clone()),
        _ => None,
    })
}

struct ServerListBlockReturns<'a> {
    transform: &'a mut ServerTransform,
}

impl VisitMut for ServerListBlockReturns<'_> {
    fn visit_mut_function(&mut self, _: &mut Function) {}

    fn visit_mut_arrow_expr(&mut self, _: &mut ArrowExpr) {}

    fn visit_mut_return_stmt(&mut self, statement: &mut ReturnStmt) {
        let result = statement
            .arg
            .take()
            .map(|value| *value)
            .unwrap_or(Expr::Lit(Lit::Null(Null { span: DUMMY_SP })));
        statement.arg = Some(Box::new(self.transform.expression_plan(result)));
    }
}

struct ServerListBlockKeys {
    count: usize,
}

impl VisitMut for ServerListBlockKeys {
    fn visit_mut_function(&mut self, _: &mut Function) {}

    fn visit_mut_arrow_expr(&mut self, _: &mut ArrowExpr) {}

    fn visit_mut_return_stmt(&mut self, statement: &mut ReturnStmt) {
        let key = statement.arg.as_deref().and_then(list_row_key);
        if key.is_some() {
            self.count += 1;
        }
        statement.arg =
            Some(Box::new(key.unwrap_or(Expr::Lit(Lit::Null(Null { span: DUMMY_SP })))));
    }
}

fn collect_row_pattern_reads(
    pattern: &Pat,
    read: Expr,
    reads: &mut std::collections::HashMap<Id, Expr>,
) {
    match pattern {
        Pat::Ident(binding) => {
            reads.insert(binding.id.to_id(), read);
        }
        Pat::Array(array) => {
            for (index, item) in array.elems.iter().enumerate() {
                let Some(item) = item else { continue };
                let member = Expr::Member(MemberExpr {
                    span: DUMMY_SP,
                    obj: Box::new(read.clone()),
                    prop: MemberProp::Computed(ComputedPropName {
                        span: DUMMY_SP,
                        expr: Box::new(Expr::Lit(Lit::Num(Number {
                            span: DUMMY_SP,
                            value: index as f64,
                            raw: None,
                        }))),
                    }),
                });
                collect_row_pattern_reads(item, member, reads);
            }
        }
        Pat::Object(object) => {
            for property in &object.props {
                let (key, binding) = match property {
                    ObjectPatProp::Assign(p) if p.value.is_none() => {
                        (p.key.id.sym.to_string(), Pat::Ident(p.key.clone()))
                    }
                    ObjectPatProp::KeyValue(p) => (
                        match &p.key {
                            PropName::Ident(i) => i.sym.to_string(),
                            PropName::Str(s) => s.value.to_string_lossy().to_string(),
                            _ => panic!("Rue SSR/claim list destructuring requires static keys"),
                        },
                        *p.value.clone(),
                    ),
                    _ => panic!("Rue SSR/claim list destructuring requires explicit bindings"),
                };
                let member = Expr::Member(MemberExpr {
                    span: DUMMY_SP,
                    obj: Box::new(read.clone()),
                    prop: MemberProp::Computed(ComputedPropName {
                        span: DUMMY_SP,
                        expr: Box::new(string_expr(&key)),
                    }),
                });
                collect_row_pattern_reads(&binding, member, reads);
            }
        }
        _ => panic!("Rue SSR/claim list destructuring requires explicit bindings"),
    }
}

struct PlanPropReads(std::collections::HashMap<Id, Expr>);
impl VisitMut for PlanPropReads {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Ident(id) = expr
            && let Some(value) = self.0.get(&id.to_id())
        {
            *expr = value.clone();
        } else {
            expr.visit_mut_children_with(self);
        }
    }
    fn visit_mut_prop(&mut self, prop: &mut Prop) {
        if let Prop::Shorthand(id) = prop
            && let Some(value) = self.0.get(&id.to_id())
        {
            *prop = Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(id.clone().into()),
                value: Box::new(value.clone()),
            });
        } else {
            prop.visit_mut_children_with(self);
        }
    }
}
fn plan_prop_reads(pattern: &mut Pat) -> PlanPropReads {
    let mut reads = std::collections::HashMap::new();
    if let Pat::Object(object) = pattern {
        let props = crate::emit::ident("_$planProps");
        let excluded: Vec<String> = object
            .props
            .iter()
            .filter_map(|property| match property {
                ObjectPatProp::Assign(p) => Some(p.key.id.sym.to_string()),
                ObjectPatProp::KeyValue(p) => Some(match &p.key {
                    PropName::Ident(i) => i.sym.to_string(),
                    PropName::Str(s) => s.value.to_string_lossy().to_string(),
                    _ => panic!("Rue SSR/claim destructured props require static keys"),
                }),
                ObjectPatProp::Rest(_) => None,
            })
            .collect();
        for property in &object.props {
            if let ObjectPatProp::Rest(rest) = property {
                let Pat::Ident(binding) = rest.arg.as_ref() else {
                    panic!("Rue SSR/claim requires an identifier for rest props");
                };
                reads.insert(
                    binding.id.to_id(),
                    crate::compiled_component::omitted_props_expr(props.clone(), &excluded),
                );
                continue;
            }
            let (binding, key, default) = match property {
                ObjectPatProp::Assign(p) => {
                    (p.key.id.clone(), p.key.id.sym.to_string(), p.value.clone())
                }
                ObjectPatProp::KeyValue(p) => {
                    let key = match &p.key {
                        PropName::Ident(i) => i.sym.to_string(),
                        PropName::Str(s) => s.value.to_string_lossy().to_string(),
                        _ => panic!("Rue SSR/claim destructured props require static keys"),
                    };
                    match p.value.as_ref() {
                        Pat::Ident(i) => (i.id.clone(), key, None),
                        Pat::Assign(a) => match a.left.as_ref() {
                            Pat::Ident(i) => (i.id.clone(), key, Some(a.right.clone())),
                            _ => panic!("Rue SSR/claim requires shallow destructured props"),
                        },
                        _ => panic!("Rue SSR/claim requires shallow destructured props"),
                    }
                }
                ObjectPatProp::Rest(_) => unreachable!(),
            };
            let read = Expr::Member(MemberExpr {
                span: DUMMY_SP,
                obj: Box::new(Expr::Ident(props.clone())),
                prop: MemberProp::Computed(ComputedPropName {
                    span: DUMMY_SP,
                    expr: Box::new(string_expr(&key)),
                }),
            });
            let value = if let Some(default) = default {
                Expr::Cond(CondExpr {
                    span: DUMMY_SP,
                    test: Box::new(Expr::Bin(BinExpr {
                        span: DUMMY_SP,
                        op: BinaryOp::EqEqEq,
                        left: Box::new(read.clone()),
                        right: Box::new(Expr::Ident(crate::emit::ident("undefined"))),
                    })),
                    cons: default,
                    alt: Box::new(read),
                })
            } else {
                read
            };
            reads.insert(binding.to_id(), value);
        }
        *pattern = Pat::Ident(BindingIdent { id: props, type_ann: object.type_ann.clone() });
    }
    PlanPropReads(reads)
}

struct EmptyPlanReturns(Expr);
impl VisitMut for EmptyPlanReturns {
    fn visit_mut_function(&mut self, _: &mut Function) {}
    fn visit_mut_arrow_expr(&mut self, _: &mut ArrowExpr) {}
    fn visit_mut_return_stmt(&mut self, statement: &mut ReturnStmt) {
        if statement.arg.as_ref().is_none_or(|value| {
            matches!(
                value.as_ref(),
                Expr::Lit(Lit::Null(_)) | Expr::Lit(Lit::Bool(Bool { value: false, .. }))
            )
        }) {
            statement.arg = Some(Box::new(self.0.clone()));
        }
    }
}

fn named_slot_props(pattern: &Pat) -> Vec<String> {
    let annotation = match pattern {
        Pat::Object(p) => p.type_ann.as_ref(),
        Pat::Ident(p) => p.type_ann.as_ref(),
        _ => None,
    };
    let Some(annotation) = annotation else { return vec![] };
    let TsType::TsTypeLit(literal) = annotation.type_ann.as_ref() else { return vec![] };
    struct SlotType(bool);
    impl Visit for SlotType {
        fn visit_ident(&mut self, ident: &Ident) {
            self.0 |= matches!(ident.sym.as_ref(), "RenderableOutput" | "ServerPlan" | "ClaimPlan");
        }
    }
    literal
        .members
        .iter()
        .filter_map(|member| {
            let TsTypeElement::TsPropertySignature(property) = member else { return None };
            let mut slot = SlotType(false);
            property.type_ann.as_ref()?.visit_with(&mut slot);
            if !slot.0 {
                return None;
            }
            match property.key.as_ref() {
                Expr::Ident(i) => Some(i.sym.to_string()),
                Expr::Lit(Lit::Str(s)) => Some(s.value.to_string_lossy().to_string()),
                _ => None,
            }
        })
        .collect()
}

impl VisitMut for ServerTransform {
    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        let component = self.component_spans.contains(&arrow.span)
            || match arrow.body.as_ref() {
                BlockStmtOrExpr::Expr(expr) => root_jsx(expr),
                BlockStmtOrExpr::BlockStmt(block) => {
                    crate::pre::has_component_render_return_in_block(block)
                }
            };
        let previous_slots = self.slot_props.clone();
        let mut prop_reads = PlanPropReads(std::collections::HashMap::new());
        if component {
            if let Some(pattern) = arrow.params.first_mut() {
                let names = named_slot_props(pattern);
                prop_reads = plan_prop_reads(pattern);
                arrow.body.visit_mut_with(&mut prop_reads);
                if let Pat::Ident(binding) = pattern {
                    self.slot_props
                        .extend(names.into_iter().map(|name| (binding.id.to_id(), name)));
                }
            }
            if let BlockStmtOrExpr::BlockStmt(body) = arrow.body.as_mut() {
                body.visit_mut_with(&mut EmptyPlanReturns(self.plan(vec![])));
            }
        }
        arrow.visit_mut_children_with(self);
        arrow.body.visit_mut_with(&mut prop_reads);
        self.slot_props = previous_slots;
    }
    fn visit_mut_function(&mut self, function: &mut Function) {
        let previous_slots = self.slot_props.clone();
        let mut prop_reads = PlanPropReads(std::collections::HashMap::new());
        if let Some(body) = &mut function.body
            && (self.component_spans.contains(&function.span)
                || crate::pre::has_component_render_return_in_block(body))
        {
            if let Some(parameter) = function.params.first_mut() {
                let names = named_slot_props(&parameter.pat);
                prop_reads = plan_prop_reads(&mut parameter.pat);
                body.visit_mut_with(&mut prop_reads);
                if let Pat::Ident(binding) = &parameter.pat {
                    self.slot_props
                        .extend(names.into_iter().map(|name| (binding.id.to_id(), name)));
                }
            }
            body.visit_mut_with(&mut EmptyPlanReturns(self.plan(vec![])));
        }
        function.visit_mut_children_with(self);
        function.body.visit_mut_with(&mut prop_reads);
        self.slot_props = previous_slots;
    }
    fn visit_mut_expr(&mut self, expression: &mut Expr) {
        if root_jsx(expression) && !matches!(expression, Expr::JSXElement(_) | Expr::JSXFragment(_))
        {
            self.did_transform = true;
            *expression = self.expression_plan(expression.clone());
            return;
        }
        let lowered = match expression {
            Expr::JSXElement(element) => Some(self.lower_element((**element).clone())),
            Expr::JSXFragment(fragment) => Some(self.lower_fragment(fragment.clone())),
            _ => None,
        };
        if let Some(lowered) = lowered {
            *expression = lowered;
        } else {
            expression.visit_mut_children_with(self);
        }
    }
}

pub(crate) fn builtin_bindings(program: &Program) -> std::collections::HashMap<Id, String> {
    let mut result = std::collections::HashMap::new();
    if let Program::Module(module) = program {
        for item in &module.body {
            if let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item {
                if !matches!(import.src.value.as_str(), Some("@rue-js/rue" | "@rue-js/runtime")) {
                    continue;
                }
                for spec in &import.specifiers {
                    if let ImportSpecifier::Named(spec) = spec {
                        let imported = match &spec.imported {
                            Some(ModuleExportName::Ident(i)) => i.sym.to_string(),
                            _ => spec.local.sym.to_string(),
                        };
                        if [
                            "Teleport",
                            "Transition",
                            "TransitionGroup",
                            "KeepAlive",
                            "Suspense",
                            "Template",
                            "Fragment",
                        ]
                        .contains(&imported.as_str())
                        {
                            result.insert(spec.local.to_id(), imported);
                        }
                    }
                }
            }
        }
    }
    result
}

pub(crate) fn route_context_imports(module: &mut Module, hydrate: bool) {
    if !hydrate {
        struct IgnoreEffect;
        impl VisitMut for IgnoreEffect {
            fn visit_mut_expr(&mut self, expr: &mut Expr) {
                if let Expr::Ident(id) = expr
                    && id.sym == *"_$compiledUseEffect"
                {
                    id.sym = "_$writeIgnoreLifecycle".into();
                } else {
                    expr.visit_mut_children_with(self);
                }
            }
        }
        module.visit_mut_with(&mut IgnoreEffect);
    }

    for item in &mut module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item {
            if !matches!(import.src.value.as_str(), Some("@rue-js/rue" | "@rue-js/runtime")) {
                continue;
            }
            for spec in &mut import.specifiers {
                if let ImportSpecifier::Named(spec) = spec {
                    let name = match &spec.imported {
                        Some(ModuleExportName::Ident(i)) => i.sym.as_ref(),
                        _ => spec.local.sym.as_ref(),
                    };
                    let helper = match name {
                        "onServerPrefetch" => {
                            if hydrate {
                                "_$claimIgnoreLifecycle"
                            } else {
                                "_$writePrefetch"
                            }
                        }
                        "onBeforeMount" | "onMounted" | "onBeforeUpdate" | "onUpdated"
                        | "onBeforeUnmount" | "onUnmounted" | "onActivated" | "onDeactivated"
                        | "useEffect"
                            if !hydrate =>
                        {
                            "_$writeIgnoreLifecycle"
                        }
                        "createContext" => "_$planContext",
                        "useContext" => "_$planUseContext",
                        "useComponent" => "_$planAsyncComponent",
                        _ => continue,
                    };
                    spec.imported = Some(ModuleExportName::Ident(crate::emit::ident(helper)));
                }
            }
        }
    }
}
