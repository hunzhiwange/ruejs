//! Close component props reads over explicit key and snapshot operations after JSX lowering.
use crate::reactive_provenance::{self as provenance, ReactiveKind};
use std::collections::HashSet;
use swc_core::common::Span;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitMut, VisitMutWith, VisitWith};

#[derive(Default)]
struct Components {
    spans: Vec<Span>,
}
impl Visit for Components {
    fn visit_fn_decl(&mut self, decl: &FnDecl) {
        if decl.function.body.as_ref().is_some_and(crate::pre::has_component_render_return_in_block)
        {
            self.spans.push(decl.function.span);
        }
        decl.visit_children_with(self);
    }
    fn visit_export_default_decl(&mut self, decl: &ExportDefaultDecl) {
        if let DefaultDecl::Fn(function) = &decl.decl
            && function
                .function
                .body
                .as_ref()
                .is_some_and(crate::pre::has_component_render_return_in_block)
        {
            self.spans.push(function.function.span);
        }
        decl.visit_children_with(self);
    }
    fn visit_export_default_expr(&mut self, decl: &ExportDefaultExpr) {
        if let Expr::Arrow(arrow) = decl.expr.as_ref()
            && crate::pre::is_untyped_arrow_component_decl(&VarDeclarator {
                span: decl.span,
                name: Pat::Invalid(Invalid { span: decl.span }),
                init: Some(decl.expr.clone()),
                definite: false,
            })
        {
            self.spans.push(arrow.span);
        }
        if let Expr::Fn(function) = decl.expr.as_ref()
            && function
                .function
                .body
                .as_ref()
                .is_some_and(crate::pre::has_component_render_return_in_block)
        {
            self.spans.push(function.function.span);
        }
        decl.visit_children_with(self);
    }
    fn visit_var_declarator(&mut self, decl: &VarDeclarator) {
        if (crate::pre::is_fc_pat(&decl.name) || crate::pre::is_untyped_arrow_component_decl(decl))
            && let Some(Expr::Arrow(arrow)) = decl.init.as_deref()
        {
            self.spans.push(arrow.span);
        }
        decl.visit_children_with(self);
    }
}
pub(crate) fn components(program: &Program) -> Vec<Span> {
    let mut collector = Components::default();
    program.visit_with(&mut collector);
    collector.spans
}

pub(crate) fn lower(module: &mut Module, components: Vec<Span>) {
    let emit_names = module
        .body
        .iter()
        .filter_map(|item| match item {
            ModuleItem::ModuleDecl(ModuleDecl::Import(import))
                if import.src.value.to_string_lossy().starts_with("@rue-js/") =>
            {
                Some(import)
            }
            _ => None,
        })
        .flat_map(|import| &import.specifiers)
        .filter_map(|specifier| match specifier {
            ImportSpecifier::Named(named)
                if match &named.imported {
                    Some(ModuleExportName::Ident(id)) => id.sym == "useEmit",
                    None => named.local.sym == "useEmit",
                    _ => false,
                } =>
            {
                Some(named.local.to_id())
            }
            _ => None,
        })
        .collect();
    module.visit_mut_with(&mut PropsReads {
        components,
        emit_names,
        scopes: Vec::new(),
        snapshot_only: false,
    });
}
struct PropsReads {
    components: Vec<Span>,
    emit_names: HashSet<Id>,
    scopes: Vec<HashSet<String>>,
    snapshot_only: bool,
}
impl PropsReads {
    fn is_props(&self, expr: &Expr) -> bool {
        matches!(crate::utils::unwrap_expr(expr), Expr::Ident(id)
            if matches!(provenance::reactive_kind(&self.scopes, id.sym.as_ref()), Some(ReactiveKind::PropsValue | ReactiveKind::SlotsValue)))
    }
    fn parameters<'a>(&mut self, span: Span, params: impl Iterator<Item = &'a Pat>) {
        self.scopes.push(if self.components.contains(&span) {
            provenance::collect_component_parameter_scope(params)
        } else {
            provenance::collect_parameter_scope(params)
        });
    }
}
impl VisitMut for PropsReads {
    fn visit_mut_var_declarator(&mut self, decl: &mut VarDeclarator) {
        // A direct alias keeps the controller identity. Snapshot only actual spread/rest.
        if matches!(&decl.name, Pat::Ident(_))
            && decl.init.as_deref().is_some_and(|expr| self.is_props(expr))
        {
            return;
        }
        decl.visit_mut_children_with(self);
    }

    fn visit_mut_module(&mut self, module: &mut Module) {
        self.scopes.push(provenance::collect_module_scope(module, &[]));
        module.visit_mut_children_with(self);
        self.scopes.pop();
    }
    fn visit_mut_catch_clause(&mut self, clause: &mut CatchClause) {
        self.scopes.push(provenance::collect_parameter_scope(clause.param.iter()));
        clause.visit_mut_children_with(self);
        self.scopes.pop();
    }
    fn visit_mut_for_of_stmt(&mut self, stmt: &mut ForOfStmt) {
        stmt.right.visit_mut_with(self);
        let patterns = match &stmt.left {
            ForHead::VarDecl(var) => var.decls.iter().map(|d| &d.name).collect::<Vec<_>>(),
            _ => vec![],
        };
        self.scopes.push(provenance::collect_parameter_scope(patterns));
        stmt.left.visit_mut_with(self);
        stmt.body.visit_mut_with(self);
        self.scopes.pop();
    }
    fn visit_mut_for_in_stmt(&mut self, stmt: &mut ForInStmt) {
        stmt.right.visit_mut_with(self);
        let patterns = match &stmt.left {
            ForHead::VarDecl(var) => var.decls.iter().map(|d| &d.name).collect::<Vec<_>>(),
            _ => vec![],
        };
        self.scopes.push(provenance::collect_parameter_scope(patterns));
        stmt.left.visit_mut_with(self);
        stmt.body.visit_mut_with(self);
        self.scopes.pop();
    }
    fn visit_mut_for_stmt(&mut self, stmt: &mut ForStmt) {
        let patterns = match &stmt.init {
            Some(VarDeclOrExpr::VarDecl(var)) => {
                var.decls.iter().map(|d| &d.name).collect::<Vec<_>>()
            }
            _ => vec![],
        };
        self.scopes.push(provenance::collect_parameter_scope(patterns));
        stmt.visit_mut_children_with(self);
        self.scopes.pop();
    }
    fn visit_mut_function(&mut self, function: &mut Function) {
        self.parameters(function.span, function.params.iter().map(|p| &p.pat));
        function.visit_mut_children_with(self);
        if self.components.contains(&function.span) {
            let mut used = std::collections::HashSet::new();
            struct Names<'a>(&'a mut std::collections::HashSet<String>);
            impl Visit for Names<'_> {
                fn visit_ident(&mut self, id: &Ident) {
                    self.0.insert(id.sym.to_string());
                }
            }
            function.visit_with(&mut Names(&mut used));
            while function.params.len() < 3 {
                let base = ["_$rueProps", "_$rueSlots", "_$rueOwner"][function.params.len()];
                let mut name = base.to_string();
                while used.contains(&name) {
                    name.push('_');
                }
                function.params.push(Param {
                    span: function.span,
                    decorators: vec![],
                    pat: Pat::Ident(BindingIdent { id: crate::emit::ident(&name), type_ann: None }),
                });
            }
        }
        self.scopes.pop();
    }
    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        self.parameters(arrow.span, arrow.params.iter());
        arrow.visit_mut_children_with(self);
        if self.components.contains(&arrow.span) {
            let mut used = std::collections::HashSet::new();
            struct Names<'a>(&'a mut std::collections::HashSet<String>);
            impl Visit for Names<'_> {
                fn visit_ident(&mut self, id: &Ident) {
                    self.0.insert(id.sym.to_string());
                }
            }
            arrow.visit_with(&mut Names(&mut used));
            while arrow.params.len() < 3 {
                let base = ["_$rueProps", "_$rueSlots", "_$rueOwner"][arrow.params.len()];
                let mut name = base.to_string();
                while used.contains(&name) {
                    name.push('_');
                }
                arrow.params.push(Pat::Ident(BindingIdent {
                    id: crate::emit::ident(&name),
                    type_ann: None,
                }));
            }
        }
        self.scopes.pop();
    }
    fn visit_mut_block_stmt(&mut self, block: &mut BlockStmt) {
        self.scopes.push(provenance::collect_stmt_scope(block.stmts.iter(), &self.scopes));
        block.visit_mut_children_with(self);
        self.scopes.pop();
    }
    fn visit_mut_prop(&mut self, prop: &mut Prop) {
        if let Prop::Shorthand(id) = prop
            && self.is_props(&Expr::Ident(id.clone()))
        {
            *prop = Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(id.clone().into()),
                value: Box::new(crate::emit::call_ident(
                    "_$compiledPropsSnapshot",
                    vec![Expr::Ident(id.clone())],
                )),
            });
            return;
        }
        prop.visit_mut_children_with(self);
    }
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Call(call) = expr
            && matches!(&call.callee, Callee::Expr(callee) if matches!(callee.as_ref(), Expr::Ident(id) if self.emit_names.contains(&id.to_id())))
        {
            // Emit must retain the live controller, not a snapshot of callbacks.
            return;
        }

        if self.snapshot_only {
            if self.is_props(expr) {
                *expr = crate::emit::call_ident("_$compiledPropsSnapshot", vec![expr.clone()]);
            } else {
                expr.visit_mut_children_with(self);
            }
            return;
        }

        if let Expr::OptChain(chain) = expr
            && chain.optional
            && let OptChainBase::Member(member) = chain.base.as_ref()
            && self.is_props(&member.obj)
        {
            let mut read = Expr::Member(member.clone());
            read.visit_mut_with(self);
            *expr = Expr::Cond(CondExpr {
                span: chain.span,
                test: Box::new(Expr::Bin(BinExpr {
                    span: chain.span,
                    op: BinaryOp::EqEq,
                    left: member.obj.clone(),
                    right: Box::new(Expr::Lit(Lit::Null(Null { span: chain.span }))),
                })),
                cons: Box::new(Expr::Unary(UnaryExpr {
                    span: chain.span,
                    op: UnaryOp::Void,
                    arg: Box::new(Expr::Lit(Lit::Num(Number {
                        span: chain.span,
                        value: 0.0,
                        raw: None,
                    }))),
                })),
                alt: Box::new(read),
            });
            return;
        }

        if matches!(expr, Expr::OptChain(_)) {
            self.snapshot_only = true;
            expr.visit_mut_children_with(self);
            self.snapshot_only = false;
            return;
        }
        if let Expr::Call(call) = expr
            && let Callee::Expr(callee) = &call.callee
            && let Expr::Member(member) = callee.as_ref()
            && self.is_props(&member.obj)
        {
            let receiver = *member.obj.clone();
            let mut callee = *callee.clone();
            callee.visit_mut_with(self);
            call.args.visit_mut_with(self);
            let args = Expr::Array(ArrayLit {
                span: call.span,
                elems: call.args.iter().cloned().map(Some).collect(),
            });
            *expr = crate::emit::call_ident("_$compiledPropsCall", vec![callee, receiver, args]);
            return;
        }

        if let Expr::Member(member) = expr
            && self.is_props(&member.obj)
        {
            let mut key = match &member.prop {
                MemberProp::Ident(id) => Expr::Lit(Lit::Str(crate::emit::str_lit(id.sym.as_ref()))),
                MemberProp::Computed(key) => *key.expr.clone(),
                _ => {
                    return;
                }
            };
            key.visit_mut_with(self);
            *expr = crate::emit::call_ident("_$compiledPropsGet", vec![*member.obj.clone(), key]);
            return;
        }
        if let Expr::Bin(bin) = expr
            && bin.op == BinaryOp::In
            && self.is_props(&bin.right)
        {
            bin.left.visit_mut_with(self);
            *expr = crate::emit::call_ident(
                "_$compiledPropsHas",
                vec![*bin.right.clone(), *bin.left.clone()],
            );
            return;
        }
        if let Expr::Call(call) = expr
            && call.args.len() == 1
            && call.args[0].spread.is_none()
            && self.is_props(&call.args[0].expr)
            && let Callee::Expr(callee) = &call.callee
            && let Expr::Member(member) = callee.as_ref()
            && !provenance::has_binding(&self.scopes, "Object")
            && matches!(member.obj.as_ref(), Expr::Ident(id) if id.sym == "Object")
            && matches!(&member.prop, MemberProp::Ident(id) if id.sym == "keys")
        {
            *expr =
                crate::emit::call_ident("_$compiledPropsKeys", vec![*call.args[0].expr.clone()]);
            return;
        }
        if self.is_props(expr) {
            *expr = crate::emit::call_ident("_$compiledPropsSnapshot", vec![expr.clone()]);
            return;
        }
        expr.visit_mut_children_with(self);
    }
}
