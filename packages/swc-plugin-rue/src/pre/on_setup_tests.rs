use super::*;
use std::sync::Arc;
use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::ast::{Module, ModuleItem, Program, Stmt};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn parse_module_stmts(src: &str) -> Vec<Stmt> {
    let cm = Arc::new(SourceMap::default());
    let fm =
        cm.new_source_file(FileName::Custom("on-setup-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let module = parser.parse_module().expect("parse module");
    module
        .body
        .into_iter()
        .map(|item| match item {
            ModuleItem::Stmt(stmt) => stmt,
            _ => panic!("expected statement"),
        })
        .collect()
}

fn emit_stmts(stmts: Vec<Stmt>) -> String {
    let cm = Arc::new(SourceMap::default());
    let module = Module {
        span: DUMMY_SP,
        body: stmts.into_iter().map(ModuleItem::Stmt).collect(),
        shebang: None,
    };
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&Program::Module(module)).expect("emit");
    String::from_utf8(buf).expect("utf8")
}

fn normalize(src: &str) -> String {
    let mut out = String::new();
    let mut prev_space = false;
    for ch in src.chars() {
        if ch.is_whitespace() {
            if !prev_space {
                out.push(' ');
                prev_space = true;
            }
        } else {
            out.push(ch);
            prev_space = false;
        }
    }
    out.trim().to_string()
}

#[test]
fn builds_setup_wrapper_and_binds_nested_names() {
    let collected = parse_module_stmts(
        "
        const { foo = 1, nested: { bar }, ...rest } = props;
        let [first, second] = list;
        function helper() { return first + bar + rest.count; }
        ",
    );

    let rendered = normalize(&emit_stmts(build_setup_with_binds(
        "useSetup:0:0",
        crate::emit::ident("_$useSetup"),
        vec!["foo".into(), "bar".into(), "rest".into(), "helper".into()],
        vec!["first".into(), "second".into()],
        collected,
    )));

    assert!(
        rendered
            .contains(&normalize(r#"const _$useSetup = _$compiledSetup("useSetup:0:0", ()=>{"#,))
    );
    assert!(rendered.contains(&normalize(
        r#"return {
            foo: foo,
            bar: bar,
            rest: rest,
            helper: helper,
            first: first,
            second: second
        };"#,
    )));
    assert!(rendered.contains(&normalize(
        r#"const { foo: foo, bar: bar, rest: rest, helper: helper } = _$useSetup;"#,
    )));
    assert!(
        rendered.contains(&normalize(r#"let { first: first, second: second } = _$useSetup;"#,))
    );
}

#[test]
fn builds_multiple_setup_regions_with_distinct_ids_and_bindings() {
    let first_region = build_setup_with_binds(
        "useSetup:0:0",
        crate::emit::ident("_$useSetupRegion0"),
        vec!["state".into(), "helper".into()],
        vec!["count".into()],
        parse_module_stmts(
            "const state = ref(0); const helper = () => state.value; let count = 0;",
        ),
    );
    let second_region = build_setup_with_binds(
        "useSetup:0:1",
        crate::emit::ident("_$useSetupRegion1"),
        vec!["details".into(), "format".into()],
        Vec::new(),
        parse_module_stmts(
            "const details = loadDetails(); function format() { return details.label; }",
        ),
    );

    let rendered = normalize(&emit_stmts(first_region.into_iter().chain(second_region).collect()));

    assert!(rendered.contains(&normalize(
        r#"const _$useSetupRegion0 = _$compiledSetup("useSetup:0:0", ()=>{"#,
    )));
    assert!(
        rendered.contains(&normalize(
            r#"const { state: state, helper: helper } = _$useSetupRegion0;"#,
        ))
    );
    assert!(rendered.contains(&normalize(r#"let { count: count } = _$useSetupRegion0;"#,)));
    assert!(rendered.contains(&normalize(
        r#"const _$useSetupRegion1 = _$compiledSetup("useSetup:0:1", ()=>{"#,
    )));
    assert!(rendered.contains(&normalize(r#"return { details: details, format: format };"#,)));
    assert!(rendered.contains(&normalize(
        r#"const { details: details, format: format } = _$useSetupRegion1;"#,
    )));
    assert_eq!(rendered.matches("const _$useSetupRegion0 =").count(), 1);
    assert_eq!(rendered.matches("const _$useSetupRegion1 =").count(), 1);
}

#[test]
fn omits_extra_bindings_when_no_names_are_requested() {
    let collected = parse_module_stmts("const state = ref(0);");
    let stmts = build_setup_with_binds(
        "useSetup:0:0",
        crate::emit::ident("_$useSetup"),
        Vec::new(),
        Vec::new(),
        collected,
    );
    let rendered = normalize(&emit_stmts(stmts.clone()));

    assert_eq!(stmts.len(), 1);
    assert!(
        rendered
            .contains(&normalize(r#"const _$useSetup = _$compiledSetup("useSetup:0:0", ()=>{"#))
    );
    assert!(rendered.contains(&normalize("return {};")));
    assert!(!rendered.contains(&normalize("const {")));
    assert!(!rendered.contains(&normalize("let {")));
}

#[test]
fn builds_compiled_owner_setup_without_vapor_helpers() {
    let rendered = normalize(&emit_stmts(build_compiled_setup_with_binds(
        "App:setup-region:0",
        crate::emit::ident("_$useSetup"),
        vec!["rows".into()],
        Vec::new(),
        parse_module_stmts("const rows = signal([]);"),
    )));

    assert!(rendered.contains(&normalize(
        r#"const _$useSetup = _$compiledSetup("App:setup-region:0", ()=>{"#,
    )));
    assert!(!rendered.contains("_$compiledWithHookId"));
    assert!(!rendered.contains("useSetup("));
}

#[test]
fn builds_setup_for_assignment_patterns_and_synthetic_exports() {
    let collected = parse_module_stmts(
        "
        const [first = fallback] = list;
        const plain = source;
        ",
    );

    let rendered = normalize(&emit_stmts(build_setup_with_binds(
        "useSetup:0:0",
        crate::emit::ident("_$useSetup"),
        vec!["first".into(), "missing".into()],
        Vec::new(),
        collected,
    )));

    assert!(rendered.contains(&normalize("first: first")));
    assert!(rendered.contains(&normalize("missing: missing")));
    assert!(
        rendered.contains(&normalize("const { first: first, missing: missing } = _$useSetup;",))
    );
    assert!(rendered.contains(&normalize("const [first = fallback] = list;")));
}

#[test]
fn build_setup_tolerates_uncollectable_patterns() {
    let collected = vec![Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        ctxt: Default::default(),
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Invalid(Invalid { span: DUMMY_SP }),
            init: None,
            definite: false,
        }],
    })))];

    let stmts = build_setup_with_binds(
        "useSetup:0:0",
        crate::emit::ident("_$useSetup"),
        vec!["missing".into()],
        Vec::new(),
        collected,
    );

    assert_eq!(stmts.len(), 2);
}

#[test]
fn strips_direct_internal_hook_ids_but_preserves_setup_identity() {
    let collected = parse_module_stmts(
        r#"
        const state = _$compiledWithHookId("ref:0:0", () => ref(0)),
            doubled = _$compiledWithHookId("computed:0:1", () => computed(() => state.value * 2));
        _$compiledWithHookId("watchEffect:0:2", () => watchEffect(() => consume(state.value)));
        "#,
    );

    let rendered = normalize(&emit_stmts(build_setup_with_binds(
        "useSetup:0:0",
        crate::emit::ident("_$useSetup"),
        vec!["state".into(), "doubled".into()],
        Vec::new(),
        collected,
    )));

    assert!(
        rendered
            .contains(&normalize(r#"const _$useSetup = _$compiledSetup("useSetup:0:0", ()=>{"#,))
    );
    assert!(
        rendered
            .contains(&normalize("const state = ref(0), doubled = computed(()=>state.value * 2);"))
    );
    assert!(rendered.contains(&normalize("watchEffect(()=>consume(state.value));")));
    assert!(!rendered.contains("ref:0:0"));
    assert!(!rendered.contains("computed:0:1"));
    assert!(!rendered.contains("watchEffect:0:2"));
}

#[test]
fn preserves_deferred_and_noncanonical_hook_wrappers() {
    let collected = parse_module_stmts(
        r#"
        function helper() {
            return _$compiledWithHookId("ref:nested", () => ref(0));
        }
        const callback = () => _$compiledWithHookId("ref:arrow", () => ref(1));
        const memo = computed(() => _$compiledWithHookId("ref:computed", () => ref(2)));
        useMemo(() => _$compiledWithHookId("ref:memo", () => ref(3)), []);
        watchEffect(() => _$compiledWithHookId("ref:effect", () => ref(4)));
        const missingRunner = _$compiledWithHookId("ref:missing");
        const parameterizedRunner = _$compiledWithHookId("ref:param", (value) => ref(value));
        const indirect = _$compiledWithHookId("ref:indirect", () => factory);
        "#,
    );

    let rendered = normalize(&emit_stmts(build_setup_with_binds(
        "Component:setup-region:0",
        crate::emit::ident("_$useSetupRegion0"),
        vec!["helper".into(), "callback".into(), "memo".into()],
        Vec::new(),
        collected,
    )));

    assert!(rendered.contains("Component:setup-region:0"));
    for id in [
        "ref:nested",
        "ref:arrow",
        "ref:computed",
        "ref:memo",
        "ref:effect",
        "ref:missing",
        "ref:param",
        "ref:indirect",
    ] {
        assert!(rendered.contains(id), "expected wrapper id {id} in {rendered}");
    }
}
