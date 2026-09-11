use std::fmt;

use swc_core::common::Span;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitWith};

pub(crate) const COMPILER_INVARIANT_DIAGNOSTIC_PREFIX: &str = "__RUE_COMPILER_INVARIANT__";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum CompiledRootRangeProof {
    Single,
    Multi,
    Unknown,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum CompiledSlotMountProof {
    Mountable,
    Unknown,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum CompiledInvariantCategory {
    ScalarRootRange,
    SlotMountAbi,
    ComponentAnchorTarget,
}

impl fmt::Display for CompiledInvariantCategory {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let name = match self {
            Self::ScalarRootRange => "scalar-root-range",
            Self::SlotMountAbi => "slot-mount-abi",
            Self::ComponentAnchorTarget => "component-anchor-target",
        };
        formatter.write_str(name)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct CompiledInvariantViolation {
    pub(crate) category: CompiledInvariantCategory,
    pub(crate) helper: String,
    pub(crate) span: Span,
    pub(crate) reason: String,
}

impl CompiledInvariantViolation {
    pub(crate) fn diagnostic(&self) -> String {
        format!(
            "{}{}",
            COMPILER_INVARIANT_DIAGNOSTIC_PREFIX,
            serde_json::json!({
                "category": self.category.to_string(),
                "helper": self.helper,
                "start": self.span.lo.0,
                "end": self.span.hi.0,
                "message": self.reason,
            })
        )
    }
}

impl fmt::Display for CompiledInvariantViolation {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "category={} helper={} span={}..{} reason={}",
            self.category, self.helper, self.span.lo.0, self.span.hi.0, self.reason
        )
    }
}

fn call_helper(call: &CallExpr) -> Option<&str> {
    let Callee::Expr(callee) = &call.callee else {
        return None;
    };
    let Expr::Ident(ident) = crate::utils::unwrap_expr(callee) else {
        return None;
    };
    Some(ident.sym.as_ref())
}

fn returned_expr(arrow: &ArrowExpr) -> Option<&Expr> {
    match arrow.body.as_ref() {
        BlockStmtOrExpr::Expr(expr) => Some(crate::utils::unwrap_expr(expr)),
        BlockStmtOrExpr::BlockStmt(block) => block.stmts.iter().rev().find_map(|stmt| match stmt {
            Stmt::Return(ReturnStmt { arg: Some(expr), .. }) => {
                Some(crate::utils::unwrap_expr(expr))
            }
            _ => None,
        }),
    }
}

fn root_range_proof(expr: &Expr) -> CompiledRootRangeProof {
    let Expr::Array(array) = crate::utils::unwrap_expr(expr) else {
        return CompiledRootRangeProof::Unknown;
    };
    let [Some(first), Some(last)] = array.elems.as_slice() else {
        return CompiledRootRangeProof::Unknown;
    };
    if first.spread.is_some() || last.spread.is_some() {
        return CompiledRootRangeProof::Unknown;
    }
    match (
        crate::utils::unwrap_expr(first.expr.as_ref()),
        crate::utils::unwrap_expr(last.expr.as_ref()),
    ) {
        (Expr::Ident(first), Expr::Ident(last)) if first.sym == last.sym => {
            CompiledRootRangeProof::Single
        }
        (Expr::Ident(_), Expr::Ident(_)) => CompiledRootRangeProof::Multi,
        _ => CompiledRootRangeProof::Unknown,
    }
}

pub(crate) fn compiled_root_range_proof(call: &CallExpr) -> CompiledRootRangeProof {
    if call.args.len() != 1 || call.args[0].spread.is_some() {
        return CompiledRootRangeProof::Unknown;
    }
    let Expr::Arrow(arrow) = crate::utils::unwrap_expr(call.args[0].expr.as_ref()) else {
        return CompiledRootRangeProof::Unknown;
    };
    returned_expr(arrow).map_or(CompiledRootRangeProof::Unknown, root_range_proof)
}

pub(crate) fn compiled_slot_mount_proof(call: &CallExpr) -> CompiledSlotMountProof {
    if call_helper(call) != Some("_$mountCompiledSlotFactory")
        || call.args.len() != 3
        || call.args.iter().any(|arg| arg.spread.is_some())
    {
        return CompiledSlotMountProof::Unknown;
    }
    let target = crate::utils::unwrap_expr(call.args[0].expr.as_ref());
    let owner = crate::utils::unwrap_expr(call.args[1].expr.as_ref());
    let create = crate::utils::unwrap_expr(call.args[2].expr.as_ref());
    if matches!(target, Expr::Ident(_) | Expr::Object(_))
        && matches!(owner, Expr::Ident(_))
        && matches!(create, Expr::Ident(_) | Expr::Arrow(_))
    {
        CompiledSlotMountProof::Mountable
    } else {
        CompiledSlotMountProof::Unknown
    }
}

pub(crate) fn compiled_slot_factory_proof(expr: &Expr) -> CompiledSlotMountProof {
    let Expr::Arrow(factory) = crate::utils::unwrap_expr(expr) else {
        return CompiledSlotMountProof::Unknown;
    };
    if factory.params.len() != 3
        || !factory.params.iter().all(|param| matches!(param, Pat::Ident(_)))
    {
        return CompiledSlotMountProof::Unknown;
    }
    let Some(Expr::Cond(result)) = returned_expr(factory) else {
        return CompiledSlotMountProof::Unknown;
    };
    let Expr::Call(mount) = crate::utils::unwrap_expr(result.alt.as_ref()) else {
        return CompiledSlotMountProof::Unknown;
    };
    compiled_slot_mount_proof(mount)
}

fn prop_name(prop: &PropName) -> Option<&str> {
    match prop {
        PropName::Ident(name) => Some(name.sym.as_ref()),
        PropName::Str(name) => Some(name.value.as_str().unwrap_or_default()),
        _ => None,
    }
}

fn is_compiled_target(expr: &Expr) -> bool {
    let Expr::Object(object) = crate::utils::unwrap_expr(expr) else {
        return false;
    };
    if object.props.len() != 2 {
        return false;
    }
    let mut parent = false;
    let mut before = false;
    for prop in &object.props {
        let PropOrSpread::Prop(prop) = prop else {
            return false;
        };
        let Prop::KeyValue(value) = prop.as_ref() else {
            return false;
        };
        match prop_name(&value.key) {
            Some("parent") if !parent => parent = true,
            Some("before") if !before => before = true,
            _ => return false,
        }
    }
    parent && before
}

#[derive(Default)]
struct CompiledInvariantValidator {
    violation: Option<CompiledInvariantViolation>,
}

impl CompiledInvariantValidator {
    fn reject(
        &mut self,
        call: &CallExpr,
        category: CompiledInvariantCategory,
        helper: &str,
        reason: impl Into<String>,
    ) {
        self.violation.get_or_insert_with(|| CompiledInvariantViolation {
            category,
            helper: helper.to_string(),
            span: call.span,
            reason: reason.into(),
        });
    }

    fn validate_scalar_root(&mut self, call: &CallExpr, helper: &str) {
        if compiled_root_range_proof(call) != CompiledRootRangeProof::Single {
            self.reject(
                call,
                CompiledInvariantCategory::ScalarRootRange,
                helper,
                "scalar setup must return a two-item range containing the same node",
            );
        }
    }

    fn validate_slot_factory_mount(&mut self, call: &CallExpr, helper: &str) {
        if call.args.len() != 3 || call.args.iter().any(|arg| arg.spread.is_some()) {
            self.reject(
                call,
                CompiledInvariantCategory::SlotMountAbi,
                helper,
                "slot factory mount requires exactly 3 arguments: target, owner, create",
            );
            return;
        }
        if compiled_slot_mount_proof(call) != CompiledSlotMountProof::Mountable {
            self.reject(
                call,
                CompiledInvariantCategory::SlotMountAbi,
                helper,
                "slot factory mount arguments must have target, owner, create shapes",
            );
        }
    }

    fn validate_slot_at_mount(&mut self, call: &CallExpr, helper: &str) {
        let valid = call.args.len() == 3
            && call.args.iter().all(|arg| arg.spread.is_none())
            && is_compiled_target(call.args[0].expr.as_ref())
            && matches!(crate::utils::unwrap_expr(call.args[1].expr.as_ref()), Expr::Arrow(_))
            && matches!(crate::utils::unwrap_expr(call.args[2].expr.as_ref()), Expr::Arrow(_));
        if !valid {
            self.reject(
                call,
                CompiledInvariantCategory::ComponentAnchorTarget,
                helper,
                "anchored mount requires { parent, before } and two reader functions",
            );
        }
    }
}

impl Visit for CompiledInvariantValidator {
    fn visit_call_expr(&mut self, call: &CallExpr) {
        if self.violation.is_some() {
            return;
        }
        match call_helper(call) {
            Some(helper @ ("_$compiledScalarRoot" | "_$compiledScalarOwnedRoot")) => {
                self.validate_scalar_root(call, helper)
            }
            Some(helper @ "_$mountCompiledSlotFactory") => {
                self.validate_slot_factory_mount(call, helper)
            }
            Some(helper @ "_$mountCompiledSlotAt") => self.validate_slot_at_mount(call, helper),
            _ => {}
        }
        if self.violation.is_none() {
            call.visit_children_with(self);
        }
    }
}

pub(crate) fn validate(program: &Program) -> Result<(), CompiledInvariantViolation> {
    let mut validator = CompiledInvariantValidator::default();
    program.visit_with(&mut validator);
    validator.violation.map_or(Ok(()), Err)
}
