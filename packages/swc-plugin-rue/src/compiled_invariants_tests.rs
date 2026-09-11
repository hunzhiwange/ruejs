use std::sync::Arc;

use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::ast::Program;
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

use crate::compiled_invariants::{CompiledInvariantCategory, validate};

fn parse_program(source: &str) -> Program {
    let source_map = Arc::new(SourceMap::default());
    let file = source_map.new_source_file(
        FileName::Custom("compiled-invariants-test.tsx".into()).into(),
        source.to_string(),
    );
    Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*file),
        None,
    )
    .parse_program()
    .expect("parse test program")
}

#[test]
fn rejects_invalid_compiled_scalar_range() {
    let source = "const block = _$compiledScalarRoot(parent => { const first = make(); const last = make(); return [first, last]; });";
    let program = parse_program(source);

    let violation = validate(&program).expect_err("a scalar root must declare one node");
    assert_eq!(violation.category, CompiledInvariantCategory::ScalarRootRange);
    assert_eq!(violation.helper, "_$compiledScalarRoot");
    assert!(violation.span.lo.0 > 0);
    assert!(violation.span.hi.0 > violation.span.lo.0);
    assert!(violation.reason.contains("same node"), "{violation}");

    let panic = std::panic::catch_unwind(|| crate::apply(parse_program(source)))
        .expect_err("the client transform must stop before emitting an invalid scalar root");
    let message = panic
        .downcast_ref::<String>()
        .map(String::as_str)
        .or_else(|| panic.downcast_ref::<&str>().copied())
        .expect("panic message");
    assert!(message.starts_with("__RUE_COMPILER_INVARIANT__{"), "{message}");
    assert!(message.contains("\"category\":\"scalar-root-range\""), "{message}");
    assert!(message.contains("\"helper\":\"_$compiledScalarRoot\""), "{message}");
}

#[test]
fn rejects_invalid_compiled_slot_mount_abi() {
    let program = parse_program("_$mountCompiledSlotFactory(target, owner);");

    let violation = validate(&program).expect_err("slot mounting has a closed three-argument ABI");
    assert_eq!(violation.category, CompiledInvariantCategory::SlotMountAbi);
    assert_eq!(violation.helper, "_$mountCompiledSlotFactory");
    assert!(violation.span.lo.0 > 0);
    assert!(violation.span.hi.0 > violation.span.lo.0);
    assert!(violation.reason.contains("3 arguments"), "{violation}");

    let invalid_target =
        parse_program("_$mountCompiledSlotAt({ parent: root }, () => slot, () => ({}));");
    let violation = validate(&invalid_target).expect_err("anchored mounts require a before node");
    assert_eq!(violation.category, CompiledInvariantCategory::ComponentAnchorTarget);
    assert_eq!(violation.helper, "_$mountCompiledSlotAt");
    assert!(violation.reason.contains("parent, before"), "{violation}");
    assert!(violation.diagnostic().starts_with("__RUE_COMPILER_INVARIANT__{"));
}

#[test]
fn accepts_valid_closed_abi() {
    let program = parse_program(
        r#"
        const scalar = _$compiledScalarRoot(parent => {
            const root = _$compiledCreateElement("div", parent);
            return [root, root];
        });
        const slot = (target, slotProps, owner) =>
            _$mountCompiledSlotFactory(target, owner, () => scalar);
        _$mountCompiledSlotAt(
            { parent: root, before: anchor },
            () => slot,
            () => ({})
        );
        _$mountCompiledComponent(root, Component, () => ({}));
        "#,
    );

    validate(&program).expect("compiler-generated closed ABI should pass");
}
