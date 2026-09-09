use super::*;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use swc_core::common::{DUMMY_SP, FileName, SourceMap};
use swc_core::ecma::ast::{Module, ModuleItem, Program};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_core::ecma::visit::VisitMutWith;
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn parse_expr(src: &str, tsx: bool) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm =
        cm.new_source_file(FileName::Custom("helpers-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse expr")
}

fn parse_module_stmt(src: &str, tsx: bool) -> Stmt {
    let cm = Arc::new(SourceMap::default());
    let fm =
        cm.new_source_file(FileName::Custom("helpers-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let module = parser.parse_module().expect("parse module");
    match module.body.into_iter().next().expect("stmt") {
        ModuleItem::Stmt(stmt) => stmt,
        _ => panic!("expected statement"),
    }
}

fn parse_module_stmts(src: &str, tsx: bool) -> Vec<Stmt> {
    let cm = Arc::new(SourceMap::default());
    let fm =
        cm.new_source_file(FileName::Custom("helpers-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    parser
        .parse_module()
        .expect("parse module")
        .body
        .into_iter()
        .filter_map(|item| match item {
            ModuleItem::Stmt(stmt) => Some(stmt),
            _ => None,
        })
        .collect()
}

fn parse_arrow(src: &str) -> ArrowExpr {
    match parse_expr(src, true) {
        Expr::Arrow(arrow) => arrow,
        _ => panic!("expected arrow expr"),
    }
}

fn parse_arrow_param(src: &str) -> Pat {
    parse_arrow(src).params.into_iter().next().expect("first param")
}

fn parse_fn_decl(src: &str) -> FnDecl {
    match parse_module_stmt(src, true) {
        Stmt::Decl(Decl::Fn(fn_decl)) => fn_decl,
        _ => panic!("expected fn decl"),
    }
}

fn parse_var_declarator(src: &str) -> VarDeclarator {
    match parse_module_stmt(src, true) {
        Stmt::Decl(Decl::Var(var)) => var.decls.into_iter().next().expect("var decl"),
        _ => panic!("expected var decl"),
    }
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

fn emit_expr(expr: Expr) -> String {
    emit_stmts(vec![Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(expr) })])
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

fn compact(src: &str) -> String {
    src.chars().filter(|ch| !ch.is_whitespace()).collect()
}

#[test]
fn detects_component_render_shapes_and_boundaries() {
    let render_fn = parse_fn_decl("function Comp() { return h('div', null); }");
    let render_block = render_fn.function.body.clone().expect("body");
    assert!(has_component_render_return_in_block(&render_block));

    let boundary_fn = parse_fn_decl(
        "function Boundary() { const ready = true; if (ok) { return <div />; } return value; }",
    );
    let boundary_block = boundary_fn.function.body.clone().expect("body");
    assert_eq!(first_control_idx(&boundary_block, 2), 1);
    assert_eq!(find_first_return_index(&boundary_block), Some(1));

    let plain_fn = parse_fn_decl("function helper() { const value = 1; return value; }");
    let plain_block = plain_fn.function.body.clone().expect("body");
    assert!(!has_component_render_return_in_block(&plain_block));

    let typed_fn = parse_fn_decl("function View(): JSX.Element { return <div />; }");
    assert!(should_transform_fn_decl(&typed_fn));

    let untyped_arrow = parse_var_declarator("const View = (): JSX.Element => <div />;");
    assert!(is_untyped_arrow_component_decl(&untyped_arrow));
}

#[test]
fn distinguishes_plain_vapor_returns_from_setup_render_control() {
    let plain = parse_fn_decl(
        "function Plain(): JSX.Element { return _$compiledRoot(() => <input value={label.get()} />); }",
    );
    let plain_block = plain.function.body.expect("plain body");
    assert!(!block_has_reactive_render_control(&plain_block));
    assert!(
        !arrow_has_reactive_render_control(&parse_arrow(
            "() => { return _$compiledRoot(() => <input value={label.get()} />); }"
        )),
        "a direct Vapor setup delegates reactive bindings to its local effects"
    );

    let early_return = parse_arrow(
        "() => { if (active.get()) return <input value='active' />; return <input value='idle' />; }",
    );
    assert!(
        arrow_has_reactive_render_control(&early_return),
        "an early render return is setup-stage render control"
    );

    let assigned_branch = parse_arrow(
        "() => { let view; if (active.get()) { view = <p>active</p>; } else { view = <p>idle</p>; } return view; }",
    );
    assert!(arrow_has_reactive_render_control(&assigned_branch));

    let switched = parse_arrow(
        "() => { switch (mode.get()) { case 'a': return <p>a</p>; default: return <p>b</p>; } }",
    );
    assert!(arrow_has_reactive_render_control(&switched));

    let selected = parse_arrow("() => { return active.get() ? <p>active</p> : <p>idle</p>; }");
    assert!(arrow_has_reactive_render_control(&selected));

    let lowered_anchor = parse_arrow(
        "() => { const view = active.get() ? <p>active</p> : <p>idle</p>; return <div>{view}</div>; }",
    );
    assert!(
        !arrow_has_reactive_render_control(&lowered_anchor),
        "a JSX variable initializer is owned by its generated fine-grained anchor"
    );
}

#[test]
fn distinguishes_eager_custom_composable_values_from_closure_owned_reads() {
    let closure_owned = parse_fn_decl(
        "function Sidebar(): JSX.Element { const route = useOptionalRoute(); const path = computed(() => route?.get().path); return <aside enabled={!!route}>{path.get()}</aside>; }",
    );
    let closure_owned_block = closure_owned.function.body.expect("closure-owned body");
    assert!(!block_requires_custom_composable_render_effect(&closure_owned_block));

    let eager = parse_fn_decl(
        "function Locale(): JSX.Element { const { locale, translate } = useLocale(); const current = locale.value; return <p>{translate('hello', current)}</p>; }",
    );
    let eager_block = eager.function.body.expect("eager body");
    assert!(block_requires_custom_composable_render_effect(&eager_block));
}

#[test]
fn rewrites_props_destructure_in_arrow_and_function_bodies() {
    let mut arrow =
        parse_arrow("({ foo = 1, bar: baz, ...rest }) => <div>{foo}{baz}{rest.qux}</div>");
    assert!(rewrite_component_props_destructure_in_arrow(&mut arrow));
    let arrow_rendered = normalize(&emit_stmts(vec![Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Arrow(arrow)),
    })]));

    assert!(arrow_rendered.contains("__rue_props"));
    assert!(arrow_rendered.contains(&normalize(
        "const { foo: __rue_rest_omit_0, bar: __rue_rest_omit_1, ...rest } = __rue_props;",
    )));
    assert!(
        arrow_rendered.contains(&normalize("(__rue_props.foo === void 0 ? 1 : __rue_props.foo)",))
    );
    assert!(arrow_rendered.contains("__rue_props.bar"));
    assert!(arrow_rendered.contains("rest.qux"));

    let mut fn_decl =
        parse_fn_decl("function Comp({ foo, bar: baz }) { return <div>{foo}{baz}</div>; }");
    assert!(rewrite_component_props_destructure_in_function(&mut fn_decl.function));
    let function_rendered = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(function_rendered.contains(&normalize("function Comp(__rue_props) {")));
    assert!(function_rendered.contains("__rue_props.foo"));
    assert!(function_rendered.contains("__rue_props.bar"));
}

#[test]
fn rejects_nested_rest_props_param_rewrite() {
    let mut arrow =
        parse_arrow("({ nested: { foo, ...restInner }, ...rest }) => <div>{foo}{rest.id}</div>");
    assert!(!rewrite_component_props_destructure_in_arrow(&mut arrow));
}

#[test]
fn lowers_derived_consts_through_helper_aliases_in_functions() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const total = props.count * 2; const formatTotal = () => total + 1; const alias = formatTotal; return <div>{alias()}</div>; }",
    );
    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));

    let rendered = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(rendered.contains("computed"));
    assert!(rendered.contains("props.count * 2"));
    assert!(rendered.contains("__rue_phase2_total = total"));
    assert!(rendered.contains("__rue_phase2_total.get() + 1"));
}

#[test]
fn eagerly_primes_lowered_call_expressions_in_source_order() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const initialized = store.ensureInitialized(props.initialValues), marker = mark(), resolved = store.resolve(props.value); onMounted(() => use(initialized)); return <div>{initialized}{resolved}</div>; }",
    );
    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));

    let rendered = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));
    let initialized_decl = rendered
        .find("constinitialized=computed(()=>store.ensureInitialized(props.initialValues));")
        .unwrap_or_else(|| panic!("initialized computed declaration: {rendered}"));
    let initialized_prime = rendered[initialized_decl..]
        .find("initialized.get();")
        .map(|offset| initialized_decl + offset)
        .expect("initialized eager read");
    let marker_decl = rendered.find("constmarker=mark();").expect("marker declaration");
    let resolved_decl = rendered
        .find("constresolved=computed(()=>store.resolve(props.value));")
        .expect("resolved computed declaration");
    let resolved_prime = rendered[resolved_decl..]
        .find("resolved.get();")
        .map(|offset| resolved_decl + offset)
        .expect("resolved eager read");

    assert!(initialized_decl < initialized_prime);
    assert!(initialized_prime < marker_decl);
    assert!(marker_decl < resolved_decl);
    assert!(resolved_decl < resolved_prime);
}

#[test]
fn primes_non_call_phase2_values_for_component_render_tracking() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const value = props.count + 1; return <div>{value}</div>; }",
    );
    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));

    let rendered = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));
    assert!(
        rendered.contains(
            "constvalue=computed(()=>props.count+1);value.get();const__rue_phase2_value=value;"
        ),
        "{rendered}"
    );
}

#[test]
fn keeps_use_emit_initializer_eager_and_outside_phase2_computed() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const emit = useEmit(props); return <button onClick={() => emit('change')} />; }",
    );
    assert!(!lower_props_derived_consts_in_function(&mut fn_decl.function));

    let rendered = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));
    assert!(rendered.contains("constemit=useEmit(props);"), "{rendered}");
    assert!(!rendered.contains("computed(()=>useEmit(props))"), "{rendered}");
}

#[test]
fn wraps_object_literals_in_computed_arrow_expr_bodies() {
    let rendered =
        normalize(&emit_expr(wrap_expr_in_computed(parse_expr("({ x: source.value })", false))));

    assert!(rendered.contains("computed(()=>({ x: source.value }))"), "{rendered}");
}

#[test]
fn collects_setup_and_injects_use_setup_for_hoistable_statements() {
    let fn_decl = parse_fn_decl(
        "function Comp() { const state = ref(0); const helper = () => state.value; watchEffect(() => console.log(state.value)); return <div>{state.value}</div>; }",
    );
    let mut block = fn_decl.function.body.clone().expect("body");

    let ret_idx = find_first_return_index(&block).expect("return index");
    let fci = first_control_idx(&block, ret_idx);
    let (collected, names_const, names_let, available) =
        collect_setup(&block, ret_idx, fci, false, &HashSet::new());

    assert_eq!(collected.len(), 3);
    assert_eq!(names_const, vec!["state".to_string(), "helper".to_string()]);
    assert!(names_let.is_empty());
    assert!(available.contains("state"));
    assert!(available.contains("helper"));

    inject_setup(&mut block, ret_idx, names_const, names_let, collected);
    let rendered = normalize(&emit_stmts(block.stmts.clone()));

    assert!(rendered.contains("_$compiledSetup(\"useSetup:0:0\""), "{rendered}");
    assert!(rendered.contains(&normalize("const { state: state, helper: helper } = _$useSetup;")));
    assert_eq!(rendered.matches("const _$useSetup =").count(), 1);
    assert!(rendered.contains("watchEffect"));
    assert!(rendered.contains("console.log(state.value)"));
}

#[test]
fn lowers_derived_consts_in_arrow_only_for_dynamic_live_candidates() {
    let mut arrow = parse_arrow(
        "(props) => { const total = props.count * 2; const seed = props.seed + 1; const snapshot = ref(seed); const helper = () => total + snapshot.value; const alias = helper; return <div>{alias()}</div>; }",
    );
    assert!(lower_props_derived_consts_in_arrow(&mut arrow));

    let rendered = normalize(&emit_stmts(vec![Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Arrow(arrow)),
    })]));

    assert!(rendered.contains(&normalize("const total = computed(()=>props.count * 2);")));
    assert!(rendered.contains("__rue_phase2_total = total"));
    assert!(rendered.contains("__rue_phase2_total.get() + snapshot.value"));
    assert!(rendered.contains(&normalize("const seed = props.seed + 1;")));
    assert!(rendered.contains(&normalize("const snapshot = ref(seed);")));
    assert!(!rendered.contains(&normalize("const seed = computed(()=>props.seed + 1);")));
    assert!(!rendered.contains("__rue_phase2_seed"));
}

#[test]
fn skips_phase2_lowering_for_props_derived_objects_that_are_mutated() {
    let mut arrow = parse_arrow(
        "(props) => { const componentProps = { ...(props.props ?? {}), ...props.rest }; const userOnClick = componentProps.onClick; if ('onClick' in componentProps) delete componentProps.onClick; componentProps.role = componentProps.role ?? 'status'; componentProps.count++; return <button {...componentProps}>{userOnClick}</button>; }",
    );

    assert!(lower_props_derived_consts_in_arrow(&mut arrow));

    let rendered = normalize(&emit_expr(Expr::Arrow(arrow)));

    assert!(!rendered.contains(&normalize("const componentProps = computed(")), "{rendered}");
    assert!(!rendered.contains("__rue_phase2_componentProps"), "{rendered}");
    assert!(rendered.contains(&normalize("delete componentProps.onClick")), "{rendered}");
    assert!(rendered.contains(&normalize("componentProps.role = componentProps.role ?? 'status'")));
    assert!(rendered.contains(&normalize("componentProps.count++")), "{rendered}");
    assert!(
        rendered.contains(&normalize("const userOnClick = computed(()=>componentProps.onClick);"))
    );
}

#[test]
fn skips_phase2_lowering_for_props_derived_objects_mutated_by_known_helpers() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const componentProps = { ...props }; Object.assign(componentProps, props.patch); Reflect.set(componentProps, 'role', 'status'); return <button {...componentProps} />; }",
    );

    assert!(!lower_props_derived_consts_in_function(&mut fn_decl.function));

    let rendered = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(!rendered.contains(&normalize("const componentProps = computed(")), "{rendered}");
    assert!(!rendered.contains("__rue_phase2_componentProps"), "{rendered}");
    assert!(
        rendered.contains(&normalize("Object.assign(componentProps, props.patch);")),
        "{rendered}"
    );
    assert!(
        rendered.contains(&normalize("Reflect.set(componentProps, 'role', 'status');")),
        "{rendered}"
    );
}

#[test]
fn collect_setup_hoists_wrapped_computed_and_setup_effects_until_jsx_boundary() {
    let fn_decl = parse_fn_decl(
        "function Comp() { const state = ref(0); const doubled = _$compiledWithHookId(\"computed:1:0\", () => computed(() => state.value * 2)); const helper = () => doubled.value; _$compiledWithHookId(\"onMounted:1:1\", () => onMounted(() => console.log(helper()))); const view = <aside />; return <div>{helper()}</div>; }",
    );
    let mut block = fn_decl.function.body.clone().expect("body");

    let ret_idx = find_first_return_index(&block).expect("return index");
    let fci = first_control_idx(&block, ret_idx);
    let (collected, names_const, names_let, available) =
        collect_setup(&block, ret_idx, fci, false, &HashSet::new());

    assert_eq!(collected.len(), 4);
    assert_eq!(names_const, vec!["state".to_string(), "doubled".to_string(), "helper".to_string()]);
    assert!(names_let.is_empty());
    assert!(available.contains("state"));
    assert!(available.contains("doubled"));
    assert!(available.contains("helper"));
    assert!(!available.contains("view"));

    let collected_rendered = normalize(&emit_stmts(collected.clone()));
    assert!(collected_rendered.contains("_$compiledWithHookId(\"computed:1:0\""));
    assert!(collected_rendered.contains("computed(()=>state.value * 2)"));
    assert!(collected_rendered.contains("_$compiledWithHookId(\"onMounted:1:1\""));
    assert!(!collected_rendered.contains(&normalize("const view = <aside />;")));

    inject_setup(&mut block, ret_idx, names_const, names_let, collected);
    let rendered = normalize(&emit_stmts(block.stmts.clone()));

    assert!(rendered.contains("_$compiledSetup(\"useSetup:0:0\""), "{rendered}");
    assert!(rendered.contains("const doubled = computed(()=>state.value * 2);"));
    assert!(rendered.contains("onMounted(()=>console.log(helper()));"));
    assert!(!rendered.contains("computed:1:0"));
    assert!(!rendered.contains("onMounted:1:1"));
    assert!(rendered.contains(&normalize(
        "const { state: state, doubled: doubled, helper: helper } = _$useSetup;",
    )));
    assert!(rendered.contains("const view = <aside"));
}

#[test]
fn rewrites_props_destructure_arrays_defaults_shorthand_and_shadowed_scopes() {
    let mut arrow = parse_arrow(
        "({ items: [first = fallback], nested: { bar }, foo = 1, ...rest }) => { watch(bar); const out = { first, bar }; const mapper = (bar) => bar + foo; function inner(first) { return first; } return <div>{first}{bar}{rest.id}{mapper(bar)}{inner(first)}</div>; }",
    );

    assert!(rewrite_component_props_destructure_in_arrow(&mut arrow));
    let rendered = normalize(&emit_stmts(vec![Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Arrow(arrow)),
    })]));

    assert!(rendered.contains("__rue_props"));
    assert!(rendered.contains(&normalize(
        "const { items: __rue_rest_omit_0, nested: __rue_rest_omit_1, foo: __rue_rest_omit_2, ...rest } = __rue_props;",
    )));
    assert!(rendered.contains(&normalize(
        "(__rue_props.items[0] === void 0 ? fallback : __rue_props.items[0])",
    )));
    assert!(rendered.contains("__rue_props.nested.bar"));
    assert!(rendered.contains(&normalize(
        "const out = { first: (__rue_props.items[0] === void 0 ? fallback : __rue_props.items[0]), bar: __rue_props.nested.bar };",
    )));
    assert!(rendered.contains(&normalize(
        "const mapper = (bar)=>bar + (__rue_props.foo === void 0 ? 1 : __rue_props.foo);",
    )));
    assert!(rendered.contains(&normalize("function inner(first) { return first; }")));

    let mut expr_body = parse_arrow("({ a, ...rest }) => <div>{a}{rest.b}</div>");
    assert!(rewrite_component_props_destructure_in_arrow(&mut expr_body));
    let expr_body_rendered = normalize(&emit_stmts(vec![Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Arrow(expr_body)),
    })]));

    assert!(expr_body_rendered.contains(&normalize("return <div>{__rue_props.a}{rest.b}</div>;",)));
}

#[test]
fn collect_setup_handles_direct_computed_setup_helpers_await_and_jsx_boundaries() {
    let fn_decl = parse_fn_decl(
        "async function Comp(props) { const doubled = computed(() => props.count * 2); const helper = function () { return doubled.get(); }; onMounted(() => helper()); const view = <aside />; const afterView = props.after; await load(); return <div>{helper()}</div>; }",
    );
    let block = fn_decl.function.body.clone().expect("body");

    let ret_idx = find_first_return_index(&block).expect("return index");
    let fci = first_control_idx(&block, ret_idx);
    let params: Vec<Pat> = fn_decl.function.params.iter().map(|param| param.pat.clone()).collect();
    let initial_locals = collect_param_idents(&params);
    let (collected, names_const, names_let, available) =
        collect_setup(&block, ret_idx, fci, false, &initial_locals);
    let collected_rendered = compact(&emit_stmts(collected));

    assert_eq!(names_const, vec!["doubled".to_string(), "helper".to_string()]);
    assert!(names_let.is_empty());
    assert!(available.contains("doubled"));
    assert!(available.contains("helper"));
    assert!(collected_rendered.contains("constdoubled=computed(()=>props.count*2);"));
    assert!(collected_rendered.contains("consthelper=function(){returndoubled.get();};"));
    assert!(collected_rendered.contains("onMounted(()=>helper());"));
    assert!(!collected_rendered.contains("view"));
    assert!(!collected_rendered.contains("afterView"));

    let await_fn = parse_fn_decl(
        "async function Comp(props) { const before = props.value; await load(); const after = props.after; return <div>{before}{after}</div>; }",
    );
    let await_block = await_fn.function.body.clone().expect("body");
    let await_ret_idx = find_first_return_index(&await_block).expect("return index");
    let (await_collected, await_names_const, _, await_available) =
        collect_setup(&await_block, await_ret_idx, await_ret_idx, false, &HashSet::new());

    assert_eq!(await_collected.len(), 1);
    assert_eq!(await_names_const, vec!["before".to_string()]);
    assert!(await_available.contains("before"));
    assert!(!await_available.contains("after"));
}

#[test]
fn process_entries_skip_existing_setup_and_detect_nested_return_boundaries() {
    let direct_return = parse_fn_decl("function Direct() { return (<div />); }");
    let direct_block = direct_return.function.body.clone().expect("body");
    assert_eq!(find_jsx_return_index(&direct_block), Some(0));

    let nested_return = parse_fn_decl(
        "function Nested() { const state = ref(0); switch (kind) { case 'a': return <div>{state.value}</div>; default: break; } try { while (ok) { return <span />; } } finally { cleanup(); } }",
    );
    let nested_block = nested_return.function.body.clone().expect("body");
    assert_eq!(find_first_return_index(&nested_block), Some(1));

    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const state = ref(0); if (props.ok) { return <div>{state.value}</div>; } return h('span', null); }",
    );
    process_fn_decl(&mut fn_decl);
    let fn_rendered = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));
    assert!(fn_rendered.contains("const_$useSetup=_$compiledSetup(\"useSetup:0:0\""));
    assert!(fn_rendered.contains("const{state:state}=_$useSetup;"));
    assert!(fn_rendered.contains("if(props.ok){return<div>{state.value}</div>;}"));

    let mut fn_expr =
        match parse_expr("function (props) { const state = ref(0); return h('div', null); }", true)
        {
            Expr::Fn(fn_expr) => fn_expr,
            other => panic!("expected fn expr, got {other:?}"),
        };
    process_function(&mut fn_expr.function);
    let fn_expr_rendered = compact(&emit_expr(Expr::Fn(fn_expr)));
    assert!(fn_expr_rendered.contains("const_$useSetup=_$compiledSetup(\"useSetup:0:0\""));

    let var_decl = parse_var_declarator(
        "const Comp: FC = (props) => { const state = ref(0); return <div>{state.value}</div>; };",
    );
    let mut var = VarDecl {
        span: DUMMY_SP,
        ctxt: Default::default(),
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![var_decl],
    };
    process_var_decl(&mut var);
    let var_rendered = compact(&emit_stmts(vec![Stmt::Decl(Decl::Var(Box::new(var)))]));
    assert!(var_rendered.contains("const_$useSetup=_$compiledSetup(\"useSetup:0:0\""));

    let mut existing = parse_fn_decl(
        "function Existing() { const _$useSetup = useSetup(() => ({})); const state = ref(0); return <div>{state.value}</div>; }",
    );
    process_fn_decl(&mut existing);
    let existing_rendered = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(existing))]));
    assert!(!existing_rendered.contains("_$compiledSetup(\"useSetup:0:0\""));
}

#[test]
fn lowers_phase2_through_function_declarations_object_shorthand_and_shadowed_blocks() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const total = props.count * 2; function read() { return { total }; } const alias = read; return <div>{alias().total}{(() => { const total = 1; return total; })()}</div>; }",
    );

    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let rendered = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(rendered.contains(&normalize("const total = computed(()=>props.count * 2);",)));
    assert!(rendered.contains("__rue_phase2_total = total"));
    assert!(
        rendered.contains(&normalize(
            "function read() { return { total: __rue_phase2_total.get() }; }",
        ))
    );
    assert!(rendered.contains(&normalize("const total = 1; return total;")));
    assert!(rendered.contains("total.get()"));
}

#[test]
fn covers_return_index_and_component_shape_edge_cases() {
    let empty_return = parse_fn_decl("function Empty() { const value = 1; return; }");
    let empty_block = empty_return.function.body.clone().expect("body");
    assert_eq!(find_jsx_return_index(&empty_block), Some(1));

    let paren_plain = parse_fn_decl("function Plain() { return (value); }");
    let paren_plain_block = paren_plain.function.body.clone().expect("body");
    assert_eq!(find_jsx_return_index(&paren_plain_block), Some(0));

    let no_return = parse_fn_decl("function None() { const value = 1; }");
    let no_return_block = no_return.function.body.clone().expect("body");
    assert_eq!(find_jsx_return_index(&no_return_block), None);
    assert_eq!(find_first_return_index(&no_return_block), None);

    assert!(expr_is_component_renderable(&parse_expr("ok || <span />", true)));
    assert!(expr_is_component_renderable(&parse_expr("ok && h('div', null)", false)));
    assert!(expr_is_component_renderable(&parse_expr("_jsxDEV('div', {})", false)));
    assert!(!expr_is_component_renderable(&parse_expr("String(value)", false)));

    let typed_arrow = parse_var_declarator("const View = (): JSX.Element => { return value; };");
    assert!(!is_untyped_arrow_component_decl(&typed_arrow));

    let typed_non_block = parse_var_declarator("const View = (): JSX.Element => value;");
    assert!(!is_untyped_arrow_component_decl(&typed_non_block));
}

#[test]
fn collects_reactive_prop_aliases_for_arrays_assignment_and_rest_params() {
    let pat = parse_arrow_param("([first = fallback, { id: nestedId }, ...rest]) => first");
    let mut alias_exprs = HashMap::new();
    collect_reactive_prop_alias_exprs_from_pat(
        &pat,
        parse_expr("__rue_props", false),
        &mut alias_exprs,
    );

    assert_eq!(
        normalize(&emit_expr(alias_exprs.get("first").expect("first").clone())),
        normalize("__rue_props[0] === void 0 ? fallback : __rue_props[0];"),
    );
    assert_eq!(
        normalize(&emit_expr(alias_exprs.get("nestedId").expect("nestedId").clone())),
        normalize("__rue_props[1].id;"),
    );
    assert_eq!(
        normalize(&emit_expr(alias_exprs.get("rest").expect("rest").clone())),
        normalize("__rue_props[2];"),
    );

    let object_pat = parse_arrow_param("({ 0: zero, ['x-y']: dashed, ...rest }) => zero");
    let mut object_aliases = HashMap::new();
    collect_reactive_prop_alias_exprs_from_pat(
        &object_pat,
        parse_expr("__rue_props", false),
        &mut object_aliases,
    );

    assert_eq!(
        normalize(&emit_expr(object_aliases.get("zero").expect("zero").clone())),
        normalize("__rue_props[0];"),
    );
    assert_eq!(
        normalize(&emit_expr(object_aliases.get("dashed").expect("dashed").clone())),
        normalize("__rue_props['x-y'];"),
    );
    assert!(!object_aliases.contains_key("rest"));
}

#[test]
fn rewrites_assigned_props_params_and_detects_jsx_initializers_in_setup_collection() {
    let mut fn_decl = parse_fn_decl(
        "function Comp({ foo, ...rest } = defaults) { return <div>{foo}{rest.id}</div>; }",
    );
    assert!(rewrite_component_props_destructure_in_function(&mut fn_decl.function));
    let rendered = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(rendered.contains(&normalize("function Comp(__rue_props = defaults) {")));
    assert!(
        rendered.contains(&normalize("const { foo: __rue_rest_omit_0, ...rest } = __rue_props;",))
    );
    assert!(rendered.contains("__rue_props.foo"));

    let jsx_sources = [
        "function Comp() { const view = { node: <span /> }; return <div />; }",
        "function Comp() { const view = [<span />]; return <div />; }",
        "function Comp() { const view = `${<span />}`; return <div />; }",
    ];
    for src in jsx_sources {
        let fn_decl = parse_fn_decl(src);
        let block = fn_decl.function.body.clone().expect("body");
        let ret_idx = find_first_return_index(&block).expect("return index");
        let (collected, names_const, names_let, available) =
            collect_setup(&block, ret_idx, ret_idx, false, &HashSet::new());

        assert!(collected.is_empty());
        assert!(names_const.is_empty());
        assert!(names_let.is_empty());
        assert!(available.is_empty());
    }
}

#[test]
fn lowers_phase2_through_function_expression_helpers() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const total = props.count * 2; const reader = function () { return { total }; }; const pick = reader; return <div>{pick().total}</div>; }",
    );

    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let rendered = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(rendered.contains(&normalize("const total = computed(()=>props.count * 2);")));
    assert!(rendered.contains("__rue_phase2_total = total"));
    assert!(rendered.contains(&normalize(
        "const reader = function() { return { total: __rue_phase2_total.get() }; };",
    )));
    assert!(rendered.contains("total.get()"));
}

#[test]
fn lowers_phase2_through_parameterized_and_recursive_helpers() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const total = props.count * 2; function read({ value }) { read({ value }); return { total, value }; } const reader = function ({ value }) { return { total, value }; }; return <div data={{ total }}>{read({ value: total }).total}{reader({ value: total }).value}</div>; }",
    );

    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let rendered = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(rendered.contains(&normalize("const total = computed(()=>props.count * 2);")));
    assert!(rendered.contains("__rue_phase2_total = total"));
    assert!(rendered.contains(&normalize("function read({ value }) {")));
    assert!(rendered.contains(&normalize("return { total: __rue_phase2_total.get(), value };")));
    assert!(rendered.contains(&normalize(
        "const reader = function({ value }) { return { total: __rue_phase2_total.get(), value }; };",
    )));
    assert!(rendered.contains(&normalize("data={{ total: total.get() }}")));
}

#[test]
fn covers_component_render_prop_access_and_alias_wrap_edges() {
    assert!(expr_is_component_renderable(&parse_expr("ok ? <span /> : null", true)));
    assert!(expr_is_component_renderable(&parse_expr("ok ? value : <span />", true)));
    assert!(!expr_is_component_renderable(&parse_expr("factory.h('div')", false)));

    let object_pat =
        parse_arrow_param("({ \"dash-key\": dashed, 2: two, [dynamicKey]: dyn }) => dashed");
    let mut aliases = HashMap::new();
    collect_reactive_prop_alias_exprs_from_pat(
        &object_pat,
        parse_expr("__rue_props", false),
        &mut aliases,
    );

    assert_eq!(
        normalize(&emit_expr(aliases.get("dashed").expect("dashed").clone())),
        normalize("__rue_props[\"dash-key\"];"),
    );
    assert_eq!(
        normalize(&emit_expr(aliases.get("two").expect("two").clone())),
        normalize("__rue_props[2];"),
    );
    assert_eq!(
        normalize(&emit_expr(aliases.get("dyn").expect("dyn").clone())),
        normalize("__rue_props[dynamicKey];"),
    );

    let bigint_pat = parse_arrow_param("({ 1n: big }) => big");
    let mut bigint_aliases = HashMap::new();
    collect_reactive_prop_alias_exprs_from_pat(
        &bigint_pat,
        parse_expr("__rue_props", false),
        &mut bigint_aliases,
    );
    assert_eq!(
        normalize(&emit_expr(bigint_aliases.get("big").expect("big").clone())),
        normalize("__rue_props[1n];"),
    );

    assert_eq!(
        compact(&emit_expr(wrap_alias_expr_if_needed(parse_expr("(value)", false)))),
        "(value);",
    );
    assert_eq!(compact(&emit_expr(wrap_alias_expr_if_needed(parse_expr("a, b", false)))), "(a,b);",);
}

#[test]
fn collects_setup_from_nested_destructuring_and_mutable_decls() {
    let fn_decl = parse_fn_decl(
        "function Comp() { const [first = fallback, { id: nestedId }] = rows; let { a: alias = 1, ...others } = item; var loose = first; function helper() { return alias; } return <div>{loose}{helper()}</div>; }",
    );
    let mut block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return index");
    let fci = first_control_idx(&block, ret_idx);
    let (collected, names_const, names_let, available) =
        collect_setup(&block, ret_idx, fci, false, &HashSet::new());

    assert_eq!(collected.len(), 4);
    assert_eq!(
        names_const,
        vec!["first".to_string(), "nestedId".to_string(), "helper".to_string()],
    );
    assert_eq!(names_let, vec!["alias".to_string(), "others".to_string(), "loose".to_string()],);
    assert!(available.contains("first"));
    assert!(available.contains("nestedId"));
    assert!(available.contains("alias"));
    assert!(available.contains("others"));
    assert!(available.contains("loose"));
    assert!(available.contains("helper"));

    let len_before = block.stmts.len();
    inject_setup(&mut block, ret_idx, Vec::new(), Vec::new(), Vec::new());
    assert_eq!(block.stmts.len(), len_before);
}

#[test]
fn covers_param_collection_and_return_boundary_shapes() {
    let params = vec![
        parse_arrow_param("([first = fallback, { id }, ...rest]) => first"),
        parse_arrow_param("({ foo: bar = 1, baz, ...others }) => bar"),
    ];
    let names = collect_param_idents(&params);
    for expected in ["first", "id", "rest", "bar", "baz", "others"] {
        assert!(names.contains(expected), "missing {expected}");
    }

    let catch_fn =
        parse_fn_decl("function Catch() { try { work(); } catch (err) { return <div />; } }");
    let catch_block = catch_fn.function.body.clone().expect("body");
    assert!(stmt_contains_return(&catch_block.stmts[0]));

    let finally_fn =
        parse_fn_decl("function Finally() { try { work(); } finally { return <div />; } }");
    let finally_block = finally_fn.function.body.clone().expect("body");
    assert!(stmt_contains_return(&finally_block.stmts[0]));

    let while_fn = parse_fn_decl("function Loop() { while (ok) { return <div />; } }");
    let while_block = while_fn.function.body.clone().expect("body");
    assert!(stmt_contains_return(&while_block.stmts[0]));

    let for_fn =
        parse_fn_decl("function Loop() { for (let i = 0; i < 1; i++) { return <div />; } }");
    let for_block = for_fn.function.body.clone().expect("body");
    assert!(stmt_contains_return(&for_block.stmts[0]));

    let for_in_fn = parse_fn_decl("function Loop() { for (const key in obj) { return <div />; } }");
    let for_in_block = for_in_fn.function.body.clone().expect("body");
    assert!(stmt_contains_return(&for_in_block.stmts[0]));

    let for_of_fn =
        parse_fn_decl("function Loop() { for (const item of items) { return <div />; } }");
    let for_of_block = for_of_fn.function.body.clone().expect("body");
    assert!(stmt_contains_return(&for_of_block.stmts[0]));

    let labeled_fn = parse_fn_decl("function Label() { label: { return <div />; } }");
    let labeled_block = labeled_fn.function.body.clone().expect("body");
    assert!(stmt_contains_return(&labeled_block.stmts[0]));

    let if_alt_fn =
        parse_fn_decl("function Alt() { if (ok) { work(); } else { return <div />; } }");
    let if_alt_block = if_alt_fn.function.body.clone().expect("body");
    assert!(stmt_contains_return(&if_alt_block.stmts[0]));
}

#[test]
fn covers_phase2_alias_selection_snapshots_and_collision_names() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const __rue_phase2_total = 0; const { skip } = props; const base = props.count + 1; const total = base * 2; const state = shallowReactive({ total }); const helper = ({ value }) => ({ total, value }); const alias = helper; return <div>{alias({ value: total }).total}{state.total}</div>; }",
    );
    let block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return index");
    let reactive_inputs = HashSet::from(["props".to_string()]);

    let candidates = collect_phase2_derived_const_candidates(&block, ret_idx, &reactive_inputs);
    assert!(candidates.contains("base"));
    assert!(candidates.contains("total"));

    let selected = select_phase2_live_derived_const_names(&block, ret_idx, &candidates);
    assert!(selected.contains("base"));
    assert!(selected.contains("total"));

    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let rendered = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));
    assert!(rendered.contains("const__rue_phase2_total_1=total;"));
    assert!(rendered.contains("constbase=computed(()=>props.count+1);"));
    assert!(rendered.contains("consttotal=computed(()=>__rue_phase2_base.get()*2);"));
}

#[test]
fn covers_phase2_candidate_filter_and_helper_usage_edges() {
    let fn_decl = parse_fn_decl(
        "function Comp(props) { let skipLet = props.count; const effect = ref(props.count); const impure = (target.value = props.count); const ignored = other + 1; const base = props.count + 1; const helper = () => base; const alias = helper; return <div>{({ alias }).alias()}{helper()}</div>; }",
    );
    let mut block = fn_decl.function.body.clone().expect("body");
    block.stmts.insert(
        1,
        Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: DUMMY_SP,
            ctxt: Default::default(),
            kind: VarDeclKind::Const,
            declare: false,
            decls: vec![VarDeclarator {
                span: DUMMY_SP,
                name: Pat::Ident(BindingIdent {
                    id: Ident::new("missingInit".into(), DUMMY_SP, Default::default()),
                    type_ann: None,
                }),
                init: None,
                definite: false,
            }],
        }))),
    );
    let ret_idx = find_first_return_index(&block).expect("return index");
    let reactive_inputs = HashSet::from(["props".to_string()]);

    let candidates = collect_phase2_derived_const_candidates(&block, ret_idx, &reactive_inputs);
    assert_eq!(candidates, HashSet::from(["base".to_string()]));

    let selected = select_phase2_live_derived_const_names(&block, ret_idx, &candidates);
    assert_eq!(selected, HashSet::from(["base".to_string()]));

    let mut declared = HashSet::new();
    collect_pat_declared_names(&Pat::Invalid(Invalid { span: DUMMY_SP }), &mut declared);
    assert!(declared.is_empty());

    let mut alias_exprs = HashMap::new();
    collect_reactive_prop_alias_exprs_from_pat(
        &Pat::Invalid(Invalid { span: DUMMY_SP }),
        parse_expr("__rue_props", false),
        &mut alias_exprs,
    );
    assert!(alias_exprs.is_empty());
}

#[test]
fn covers_props_rewrite_and_phase2_false_entry_paths() {
    let mut arrow_no_rest = parse_arrow("({ foo }) => <div>{foo}</div>");
    assert!(rewrite_component_props_destructure_in_arrow(&mut arrow_no_rest));
    let no_rest_rendered = compact(&emit_stmts(vec![Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Arrow(arrow_no_rest)),
    })]));
    assert!(no_rest_rendered.contains("=><div>{__rue_props.foo}</div>"));

    let mut invalid_assign = parse_arrow("(foo = defaults) => <div>{foo}</div>");
    assert!(!rewrite_component_props_destructure_in_arrow(&mut invalid_assign));

    let mut nested_rest_assign =
        parse_arrow("({ nested: { foo, ...inner }, ...rest } = defaults) => <div>{foo}</div>");
    assert!(!rewrite_component_props_destructure_in_arrow(&mut nested_rest_assign));

    let mut expr_body = parse_arrow("(props) => props.count");
    assert!(!lower_props_derived_consts_in_arrow(&mut expr_body));

    let mut no_return_arrow = parse_arrow("(props) => { const total = props.count * 2; }");
    assert!(!lower_props_derived_consts_in_arrow(&mut no_return_arrow));

    let mut no_return_fn =
        parse_fn_decl("function Helper(props) { const total = props.count * 2; }");
    assert!(!lower_props_derived_consts_in_function(&mut no_return_fn.function));

    let mut bodyless_fn = Function {
        params: Vec::new(),
        decorators: Vec::new(),
        span: DUMMY_SP,
        ctxt: Default::default(),
        body: None,
        is_generator: false,
        is_async: false,
        type_params: None,
        return_type: None,
    };
    assert!(!lower_props_derived_consts_in_function(&mut bodyless_fn));

    let mut plain_fn =
        match parse_expr("function (props) { const state = ref(0); return state.value; }", true) {
            Expr::Fn(fn_expr) => fn_expr,
            other => panic!("expected fn expr, got {other:?}"),
        };
    process_function(&mut plain_fn.function);
    let plain_rendered = compact(&emit_expr(Expr::Fn(plain_fn)));
    assert!(!plain_rendered.contains("_$compiledWithHookId(\"useSetup"));
}

#[test]
fn covers_process_var_decl_continue_edges() {
    let stmt = parse_module_stmt(
        "const NotComp = 1, Maybe: FC = value, Expr = () => <div />, NoReturn: FC = () => { const x = 1; }, Existing = () => { const _$useSetup = useSetup(() => ({})); return <div />; };",
        true,
    );
    let Stmt::Decl(Decl::Var(mut var)) = stmt else {
        panic!("expected var decl");
    };

    process_var_decl(&mut var);
    let rendered = compact(&emit_stmts(vec![Stmt::Decl(Decl::Var(var))]));
    assert!(rendered.contains("constNotComp=1"));
    assert!(rendered.contains("Maybe"));
    assert!(rendered.contains("=value"));
    assert!(rendered.contains("Expr=()=><div/>"));
    assert!(rendered.contains("NoReturn"));
    assert!(rendered.contains("const_$useSetup=useSetup"));
    assert!(!rendered.contains("_$compiledWithHookId(\"useSetup"));
}

#[test]
fn covers_remaining_setup_helper_boundary_shapes() {
    let array_pat = parse_arrow_param("([first, second]) => first");
    let mut declared = HashSet::new();
    collect_pat_declared_names(&array_pat, &mut declared);
    assert!(declared.contains("first"));
    assert!(declared.contains("second"));

    let assign_pat = parse_arrow_param("(value = fallback) => value");
    collect_pat_declared_names(&assign_pat, &mut declared);
    assert!(declared.contains("value"));

    let rest_pat = parse_arrow_param("(...rest) => rest");
    collect_pat_declared_names(&rest_pat, &mut declared);
    assert!(declared.contains("rest"));

    let class_fn = parse_fn_decl("function Scope() { class Local {} return <div />; }");
    let class_block = class_fn.function.body.clone().expect("body");
    let block_names = collect_block_declared_names(&class_block);
    assert!(block_names.contains("Local"));

    let jsx_sources = [
        "function Comp() { const view = (<span />); return <div />; }",
        "function Comp() { const view = (<span /> as any); return <div />; }",
        "function Comp() { const view = { ...(<span /> as any) }; return <div />; }",
        "function Comp() { const view = ok ? <span /> : value; return <div />; }",
        "function Comp() { const view = ok && <span />; return <div />; }",
        "function Comp() { const view = render(<span />); return <div />; }",
    ];
    for src in jsx_sources {
        let fn_decl = parse_fn_decl(src);
        let block = fn_decl.function.body.clone().expect("body");
        let ret_idx = find_first_return_index(&block).expect("return index");
        let (collected, names_const, names_let, available) =
            collect_setup(&block, ret_idx, ret_idx, false, &HashSet::new());

        assert!(collected.is_empty());
        assert!(names_const.is_empty());
        assert!(names_let.is_empty());
        assert!(available.is_empty());
    }

    let fragment_return = parse_fn_decl("function Frag() { return <>text</>; }");
    let fragment_block = fragment_return.function.body.clone().expect("body");
    assert_eq!(find_jsx_return_index(&fragment_block), Some(0));

    let value_return = parse_fn_decl("function Value() { return value; }");
    let value_block = value_return.function.body.clone().expect("body");
    assert_eq!(find_jsx_return_index(&value_block), Some(0));
}

#[test]
fn collect_setup_keeps_wrapped_function_hook_forms_before_jsx_boundary() {
    let fn_decl = parse_fn_decl(
        "function Comp(flag) { const direct = computed(function () { return flag; }); const wrapped = _$compiledWithHookId(\"computed:0:0\", () => computed(function () { return direct.get(); })); _$compiledWithHookId(\"watchEffect:0:1\", () => watchEffect(function () { direct.get(); })); _$compiledWithHookId(\"effect:0:2\", () => effect(() => wrapped.get())); const view = (<span /> as any); return <div>{wrapped.get()}</div>; }",
    );
    let block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return index");
    let params: Vec<Pat> = fn_decl.function.params.iter().map(|param| param.pat.clone()).collect();
    let initial_locals = collect_param_idents(&params);

    let (collected, names_const, names_let, available) =
        collect_setup(&block, ret_idx, ret_idx, false, &initial_locals);
    let collected_rendered = compact(&emit_stmts(collected));

    assert_eq!(names_const, vec!["direct".to_string(), "wrapped".to_string()]);
    assert!(names_let.is_empty());
    assert!(available.contains("direct"));
    assert!(available.contains("wrapped"));
    assert!(collected_rendered.contains("constdirect=computed(function(){returnflag;});"));
    assert!(collected_rendered.contains("_$compiledWithHookId(\"computed:0:0\""));
    assert!(collected_rendered.contains("_$compiledWithHookId(\"watchEffect:0:1\""));
    assert!(collected_rendered.contains("_$compiledWithHookId(\"effect:0:2\""));
    assert!(!collected_rendered.contains("view"));
}

#[test]
fn collect_setup_classifies_block_body_computed_wrappers_and_function_helpers() {
    let fn_decl = parse_fn_decl(
        "function Comp(flag) { const direct = computed(() => flag); const wrapped = _$compiledWithHookId(\"computed:0:0\", () => { return computed(function () { return direct.get(); }); }); const read = function () { return wrapped.get(); }; return <div>{read()}</div>; }",
    );
    let block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return index");
    let initial_locals = HashSet::from(["flag".to_string()]);

    let (collected, names_const, names_let, available) =
        collect_setup(&block, ret_idx, ret_idx, false, &initial_locals);
    let collected_rendered = compact(&emit_stmts(collected));

    assert_eq!(names_const, vec!["direct".to_string(), "wrapped".to_string(), "read".to_string()],);
    assert!(names_let.is_empty());
    assert!(available.contains("direct"));
    assert!(available.contains("wrapped"));
    assert!(available.contains("read"));
    assert!(collected_rendered.contains("constdirect=computed(()=>flag);"));
    assert!(collected_rendered.contains("returncomputed(function(){returndirect.get();});"));
    assert!(collected_rendered.contains("constread=function(){returnwrapped.get();};"));
}

#[test]
fn covers_collect_setup_wrapper_false_edges_await_and_entry_bails() {
    let async_fn = parse_fn_decl(
        "async function Comp(props) { const { id = fallback, ...rest } = props; const boxed = { id }; const nonHook = (tools.computed)(() => id); const missingRunner = _$compiledWithHookId(\"computed:0:0\"); const nonArrowRunner = _$compiledWithHookId(\"computed:0:1\", value); const noReturnRunner = _$compiledWithHookId(\"computed:0:2\", () => { const local = id; }); const nonCallRunner = _$compiledWithHookId(\"computed:0:3\", () => id); _$compiledWithHookId(\"effect:0:0\"); _$compiledWithHookId(\"effect:0:1\", value); _$compiledWithHookId(\"effect:0:2\", () => {}); _$compiledWithHookId(\"effect:0:3\", () => value); const later = await fetchValue(); const after = id; return <div>{id}{rest.extra}</div>; }",
    );
    let block = async_fn.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return index");
    let initial_locals = HashSet::from(["props".to_string()]);
    let (collected, names_const, names_let, available) =
        collect_setup(&block, ret_idx, ret_idx, false, &initial_locals);
    let collected_rendered = compact(&emit_stmts(collected));

    assert!(names_const.contains(&"id".to_string()));
    assert!(names_const.contains(&"rest".to_string()));
    assert!(names_const.contains(&"boxed".to_string()));
    assert!(names_const.contains(&"nonHook".to_string()));
    assert!(names_let.is_empty());
    assert!(available.contains("id"));
    assert!(!available.contains("later"));
    assert!(collected_rendered.contains("const{id=fallback,...rest}=props;"));
    assert!(collected_rendered.contains("constboxed={id};"));
    assert!(collected_rendered.contains("constnonHook="));
    assert!(collected_rendered.contains("tools.computed"));
    assert!(collected_rendered.contains("_$compiledWithHookId(\"computed:0:0\")"));
    assert!(collected_rendered.contains("_$compiledWithHookId(\"effect:0:3\",()=>value);"));
    assert!(!collected_rendered.contains("constlater=awaitfetchValue();"));
    assert!(!collected_rendered.contains("constafter=id;"));

    let params = vec![
        parse_arrow_param("(value = fallback) => value"),
        parse_arrow_param("(...rest) => rest"),
    ];
    let param_names = collect_param_idents(&params);
    assert!(param_names.contains("value"));
    assert!(param_names.contains("rest"));

    let return_fn = parse_fn_decl("function Done() { return; }");
    let return_block = return_fn.function.body.clone().expect("body");
    let (return_collected, return_const, return_let, _) = collect_setup(
        &return_block,
        return_block.stmts.len(),
        return_block.stmts.len(),
        false,
        &HashSet::new(),
    );
    assert!(return_collected.is_empty());
    assert!(return_const.is_empty());
    assert!(return_let.is_empty());

    let typed_decl = parse_var_declarator("const Comp: string = () => <div />;");
    assert!(!is_fc_pat(&typed_decl.name));

    let mut no_return_decl = parse_fn_decl("function Helper() { const x = 1; }");
    process_fn_decl(&mut no_return_decl);
    let no_return_rendered = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(no_return_decl))]));
    assert!(!no_return_rendered.contains("_$compiledWithHookId(\"useSetup"));

    let existing_stmt = parse_module_stmt(
        "const Existing = () => { const { _$useSetup } = bag; return <div />; };",
        true,
    );
    let Stmt::Decl(Decl::Var(mut existing_var)) = existing_stmt else {
        panic!("expected var decl");
    };
    process_var_decl(&mut existing_var);
    let existing_rendered = compact(&emit_stmts(vec![Stmt::Decl(Decl::Var(existing_var))]));
    assert!(existing_rendered.contains("const{_$useSetup}=bag;"));
    assert!(
        existing_rendered.contains("_$compiledWithHookId(\"useSetup")
            || existing_rendered.contains("_$compiledSetup(\"useSetup")
    );

    let super_render_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        ctxt: Default::default(),
        callee: Callee::Super(Super { span: DUMMY_SP }),
        args: vec![],
        type_args: None,
    });
    assert!(!expr_is_component_render_call(&super_render_call));
    assert!(!pat_has_object_rest(&parse_arrow_param("(...rest) => rest")));

    let expr_stmt_fn =
        parse_fn_decl("function ExprStmtComp() { value; onMounted(() => {}); ; return <div />; }");
    let expr_stmt_block = expr_stmt_fn.function.body.clone().expect("body");
    let expr_stmt_ret_idx = find_first_return_index(&expr_stmt_block).expect("return index");
    let (expr_collected, _, _, _) = collect_setup(
        &expr_stmt_block,
        expr_stmt_ret_idx,
        expr_stmt_ret_idx,
        false,
        &HashSet::new(),
    );
    let expr_collected_rendered = compact(&emit_stmts(expr_collected));
    assert!(expr_collected_rendered.contains("value;"));
    assert!(expr_collected_rendered.contains("onMounted(()=>{});"));
}

#[test]
fn hardens_phase2_helper_alias_resolution_and_shadowed_rewrites() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const base = props.count + 1; const total = base * 2; const snapshot = readonly({ total }); const shallow = shallowReadonly({ base }); function reader({ value }) { const total = value; return { total, base }; } const alias1 = reader; const alias2 = alias1; return <div>{alias2({ value: total }).base}{snapshot.total}{shallow.base}</div>; }",
    );
    let block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return index");
    let reactive_inputs = HashSet::from(["props".to_string()]);
    let candidate_names =
        collect_phase2_derived_const_candidates(&block, ret_idx, &reactive_inputs);
    let helper_defs = collect_phase2_top_level_helper_defs(&block, ret_idx);
    let helper_aliases = collect_phase2_top_level_helper_aliases(&block, ret_idx, &helper_defs);

    assert!(candidate_names.contains("base"));
    assert!(candidate_names.contains("total"));
    assert!(helper_defs.contains_key("reader"));
    assert_eq!(helper_aliases.get("alias1"), Some(&"reader".to_string()));
    assert_eq!(helper_aliases.get("alias2"), Some(&"reader".to_string()));
    assert_eq!(
        resolve_phase2_helper_alias_target(
            &parse_expr("alias2", false),
            &helper_defs,
            &helper_aliases
        ),
        Some("reader".to_string()),
    );
    assert!(
        resolve_phase2_helper_alias_target(
            &parse_expr("factory.reader", false),
            &helper_defs,
            &helper_aliases
        )
        .is_none()
    );

    let selected = select_phase2_live_derived_const_names(&block, ret_idx, &candidate_names);
    assert!(selected.contains("base"));
    assert!(selected.contains("total"));

    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let rendered = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));
    assert!(rendered.contains(&normalize("const base = computed(()=>props.count + 1);")));
    assert!(
        rendered.contains(&normalize("const total = computed(()=>__rue_phase2_base.get() * 2);",))
    );
    assert!(rendered.contains(&normalize(
        "function reader({ value }) { const total = value; return { total, base: __rue_phase2_base.get() }; }",
    )));
    assert!(rendered.contains(&normalize("alias2({ value: total.get() }).base")));

    let mut collector = Phase2UsageCollector::new(&candidate_names, HashMap::new(), HashMap::new());
    collector.visit_phase2_helper("missing", Phase2UsageMode::Dynamic);
    assert!(collector.dynamic_names.is_empty());

    let mut bodyless_fn = parse_fn_decl("function bodyless() { return base; }");
    bodyless_fn.function.body = None;
    let mut bodyless_block = block.clone();
    bodyless_block.stmts.insert(0, Stmt::Decl(Decl::Fn(bodyless_fn)));
    let bodyless_defs = collect_phase2_top_level_helper_defs(&bodyless_block, ret_idx + 1);
    assert!(!bodyless_defs.contains_key("bodyless"));

    let super_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        ctxt: Default::default(),
        callee: Callee::Super(Super { span: DUMMY_SP }),
        args: vec![],
        type_args: None,
    });
    let Expr::Call(call) = super_call else {
        panic!("expected call");
    };
    assert!(call_expr_callee_ident_name(&call).is_none());
}

#[test]
fn hardens_props_destructure_rewriter_scope_edges() {
    let mut arrow = parse_arrow(
        "({ foo, bar }) => { const obj = { foo }; const mapper = () => { const foo = 1; return { foo, bar }; }; function inner(bar) { return { foo, bar }; } watch(foo); return <div>{obj.foo}{mapper().bar}{inner(bar).foo}</div>; }",
    );

    assert!(rewrite_component_props_destructure_in_arrow(&mut arrow));
    let rendered = normalize(&emit_stmts(vec![Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Arrow(arrow)),
    })]));

    assert!(rendered.contains(&normalize("const obj = { foo: __rue_props.foo };")));
    assert!(rendered.contains(&normalize(
        "const mapper = ()=>{ const foo = 1; return { foo, bar: __rue_props.bar }; };",
    )));
    assert!(
        rendered
            .contains(&normalize("function inner(bar) { return { foo: __rue_props.foo, bar }; }",))
    );
    assert!(rendered.contains(&normalize("watch(__rue_props.foo);")));

    let mut no_param_arrow = parse_arrow("() => <div />");
    assert!(!rewrite_component_props_destructure_in_arrow(&mut no_param_arrow));

    let mut ident_param_arrow = parse_arrow("(props) => <div>{props.foo}</div>");
    assert!(!rewrite_component_props_destructure_in_arrow(&mut ident_param_arrow));

    let mut bodyless_fn = Function {
        params: vec![Param {
            span: DUMMY_SP,
            decorators: Vec::new(),
            pat: parse_arrow_param("({ foo }) => foo"),
        }],
        decorators: Vec::new(),
        span: DUMMY_SP,
        ctxt: Default::default(),
        body: None,
        is_generator: false,
        is_async: false,
        type_params: None,
        return_type: None,
    };
    assert!(rewrite_component_props_destructure_in_function(&mut bodyless_fn));
}

#[test]
fn hardens_collect_setup_and_component_entry_tail_edges() {
    let fn_decl = parse_fn_decl(
        "function Comp(props) { const __rue_phase2_hidden = props.count; const helper = () => __rue_phase2_hidden; const late = helper(); const blocked = late + missingLater; const afterBlocked = props.after; return <div>{late}{afterBlocked}</div>; }",
    );
    let block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return index");
    let initial_locals = HashSet::from(["props".to_string(), "missingLater".to_string()]);
    let (collected, names_const, names_let, available) =
        collect_setup(&block, ret_idx, ret_idx, false, &initial_locals);
    let collected_rendered = compact(&emit_stmts(collected.clone()));

    assert_eq!(collected.len(), 5);
    assert!(names_const.contains(&"__rue_phase2_hidden".to_string()));
    assert!(names_const.contains(&"helper".to_string()));
    assert!(names_const.contains(&"late".to_string()));
    assert!(names_const.contains(&"blocked".to_string()));
    assert!(names_const.contains(&"afterBlocked".to_string()));
    assert!(names_let.is_empty());
    assert!(available.contains("__rue_phase2_hidden"));
    assert!(collected_rendered.contains("const__rue_phase2_hidden=props.count;"));
    assert!(collected_rendered.contains("constblocked=late+missingLater;"));

    let mut empty_body_fn = Function {
        params: Vec::new(),
        decorators: Vec::new(),
        span: DUMMY_SP,
        ctxt: Default::default(),
        body: None,
        is_generator: false,
        is_async: false,
        type_params: None,
        return_type: None,
    };
    process_function(&mut empty_body_fn);

    let mut bodyless_decl = parse_fn_decl("function Bodyless() { return <div />; }");
    bodyless_decl.function.body = None;
    process_fn_decl(&mut bodyless_decl);
    assert!(!should_transform_fn_decl(&bodyless_decl));

    let non_jsx_type = parse_fn_decl("function Typed(): Namespace.Element { return value; }");
    assert!(!should_transform_fn_decl(&non_jsx_type));

    let no_init_decl = parse_var_declarator("let Maybe;");
    assert!(!is_untyped_arrow_component_decl(&no_init_decl));

    let non_arrow_decl = parse_var_declarator("const Maybe = value;");
    assert!(!is_untyped_arrow_component_decl(&non_arrow_decl));

    let dynamic_stmt_fn = parse_fn_decl(
        "function Comp(props) { const base = props.count; sideEffect(base); return <div>{base}</div>; }",
    );
    let dynamic_block = dynamic_stmt_fn.function.body.clone().expect("body");
    let dynamic_ret_idx = find_first_return_index(&dynamic_block).expect("return index");
    let dynamic_candidates = collect_phase2_derived_const_candidates(
        &dynamic_block,
        dynamic_ret_idx,
        &HashSet::from(["props".to_string()]),
    );
    assert_eq!(dynamic_candidates, HashSet::from(["base".to_string()]));
    let dynamic_defs = collect_phase2_top_level_helper_defs(&dynamic_block, dynamic_ret_idx);
    assert!(dynamic_defs.is_empty());
    let dynamic_selected = select_phase2_live_derived_const_names(
        &dynamic_block,
        dynamic_ret_idx,
        &dynamic_candidates,
    );
    assert_eq!(dynamic_selected, HashSet::from(["base".to_string()]));

    let string_return_type = parse_fn_decl("function Typed(): string { return value; }");
    assert!(!should_transform_fn_decl(&string_return_type));

    let rue_fc_decl = parse_var_declarator("const Comp: React.FC = () => <div />;");
    assert!(!is_fc_pat(&rue_fc_decl.name));
}

#[test]
fn hardens_remaining_component_shape_and_jsx_setup_edges() {
    let jsx_object_fn = parse_fn_decl(
        "function Comp() { const payload = { view: <span />, ...extras }; return <div>{payload.view}</div>; }",
    );
    let jsx_object_block = jsx_object_fn.function.body.clone().expect("body");
    let jsx_ret_idx = find_first_return_index(&jsx_object_block).expect("return index");
    let (collected, _, _, _) =
        collect_setup(&jsx_object_block, jsx_ret_idx, jsx_ret_idx, false, &HashSet::new());
    assert!(collected.is_empty());

    let jsx_type_assertion_fn = parse_fn_decl(
        "function Comp() { const child = (<span /> as any); return <div>{child}</div>; }",
    );
    let type_block = jsx_type_assertion_fn.function.body.clone().expect("body");
    let type_ret_idx = find_first_return_index(&type_block).expect("return index");
    let (type_collected, _, _, _) =
        collect_setup(&type_block, type_ret_idx, type_ret_idx, false, &HashSet::new());
    assert!(type_collected.is_empty());

    let mut no_return_fn = parse_fn_decl("function Plain() { const value = 1; }");
    process_fn_decl(&mut no_return_fn);
    assert!(
        compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(no_return_fn))])).contains("constvalue=1;")
    );

    let jsx_return_type_block =
        parse_var_declarator("const Comp = (): JSX.Element => { return value; };");
    assert!(!is_untyped_arrow_component_decl(&jsx_return_type_block));

    let jsx_return_type_expr = parse_var_declarator("const Comp = (): JSX.Element => value;");
    assert!(!is_untyped_arrow_component_decl(&jsx_return_type_expr));

    let qualified_jsx_type = parse_fn_decl("function Comp(): JSX.Element { return value; }");
    assert!(!should_transform_fn_decl(&qualified_jsx_type));

    let ident_jsx_type = parse_fn_decl("function Comp(): Element { return value; }");
    assert!(!should_transform_fn_decl(&ident_jsx_type));
}

#[test]
fn hardens_collect_setup_hoistable_call_predicate_edges() {
    let fn_decl = parse_fn_decl(
        "function Comp() { const notComputed = computed(value); const yesComputed = computed(() => value); const hookedComputed = _$compiledWithHookId('c', () => computed(() => value)); watchEffect(value); watchEffect(() => value); _$compiledWithHookId('w', () => watchEffect(() => value)); _$compiledWithHookId('bad', value); helper.effect(); return <div />; }",
    );
    let block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return index");
    let (collected, names_const, names_let, _) =
        collect_setup(&block, ret_idx, ret_idx, false, &HashSet::new());
    let out = compact(&emit_stmts(collected));

    assert!(names_const.contains(&"notComputed".to_string()));
    assert!(names_const.contains(&"yesComputed".to_string()));
    assert!(names_const.contains(&"hookedComputed".to_string()));
    assert!(names_let.is_empty());
    assert!(out.contains("computed(value)"));
    assert!(out.contains("computed(()=>value)"));
    assert!(out.contains("_$compiledWithHookId('w',()=>watchEffect(()=>value));"));
    assert!(out.contains("_$compiledWithHookId('bad',value);"));
    assert!(out.contains("helper.effect();"));
}

#[test]
fn hardens_manual_jsx_element_return_type_and_jsx_boundary_exprs() {
    let mut arrow_decl = parse_var_declarator("const Comp = () => { const value = 1; };");
    let arrow = match arrow_decl.init.as_mut().map(|init| init.as_mut()) {
        Some(Expr::Arrow(arrow)) => arrow,
        other => panic!("expected arrow init, got {other:?}"),
    };
    arrow.return_type = Some(Box::new(TsTypeAnn {
        span: DUMMY_SP,
        type_ann: Box::new(TsType::TsTypeRef(TsTypeRef {
            span: DUMMY_SP,
            type_name: TsEntityName::Ident(crate::emit::ident("JSX.Element")),
            type_params: None,
        })),
    }));
    assert!(is_untyped_arrow_component_decl(&arrow_decl));

    let mut typed_fn = parse_fn_decl("function Comp() { return value; }");
    typed_fn.function.return_type = Some(Box::new(TsTypeAnn {
        span: DUMMY_SP,
        type_ann: Box::new(TsType::TsTypeRef(TsTypeRef {
            span: DUMMY_SP,
            type_name: TsEntityName::Ident(crate::emit::ident("JSX.Element")),
            type_params: None,
        })),
    }));
    assert!(should_transform_fn_decl(&typed_fn));

    let cond_alt_fn = parse_fn_decl(
        "function Comp() { const maybe = ok ? value : <span />; return <div>{maybe}</div>; }",
    );
    let cond_alt_block = cond_alt_fn.function.body.clone().expect("body");
    let cond_ret_idx = find_first_return_index(&cond_alt_block).expect("return");
    let (cond_collected, _, _, _) =
        collect_setup(&cond_alt_block, cond_ret_idx, cond_ret_idx, false, &HashSet::new());
    assert!(cond_collected.is_empty());

    let array_spread_fn = parse_fn_decl(
        "function Comp() { const payload = [value, <span />, ...items]; return <div>{payload}</div>; }",
    );
    let array_block = array_spread_fn.function.body.clone().expect("body");
    let array_ret_idx = find_first_return_index(&array_block).expect("return");
    let (array_collected, _, _, _) =
        collect_setup(&array_block, array_ret_idx, array_ret_idx, false, &HashSet::new());
    assert!(array_collected.is_empty());
}

#[test]
fn hardens_manual_jsx_boundary_expression_shapes() {
    fn stmt_with_init(name: &str, init: Expr) -> Stmt {
        let mut stmt = parse_module_stmt(&format!("const {name} = value;"), true);
        let Stmt::Decl(Decl::Var(var)) = &mut stmt else {
            panic!("expected var decl");
        };
        var.decls[0].init = Some(Box::new(init));
        stmt
    }

    let jsx_value = parse_expr("<span />", true);
    let ts_assertion = Expr::TsTypeAssertion(TsTypeAssertion {
        span: DUMMY_SP,
        expr: Box::new(jsx_value.clone()),
        type_ann: Box::new(TsType::TsKeywordType(TsKeywordType {
            span: DUMMY_SP,
            kind: TsKeywordTypeKind::TsAnyKeyword,
        })),
    });
    let jsx_callee_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        ctxt: Default::default(),
        callee: Callee::Expr(Box::new(jsx_value.clone())),
        args: vec![],
        type_args: None,
    });
    let assign_prop_object = Expr::Object(ObjectLit {
        span: DUMMY_SP,
        props: vec![PropOrSpread::Prop(Box::new(Prop::Assign(AssignProp {
            span: DUMMY_SP,
            key: crate::emit::ident("child"),
            value: Box::new(jsx_value),
        })))],
    });
    let block = BlockStmt {
        span: DUMMY_SP,
        ctxt: Default::default(),
        stmts: vec![
            stmt_with_init("typed", ts_assertion),
            stmt_with_init("called", jsx_callee_call),
            stmt_with_init("assigned", assign_prop_object),
            Stmt::Return(ReturnStmt {
                span: DUMMY_SP,
                arg: Some(Box::new(parse_expr("<div />", true))),
            }),
        ],
    };

    let (collected, names_const, names_let, available) =
        collect_setup(&block, 3, 3, false, &HashSet::new());

    assert!(collected.is_empty());
    assert!(names_const.is_empty());
    assert!(names_let.is_empty());
    assert!(available.is_empty());
}

#[test]
fn hardens_props_rewriter_nested_shorthand_and_watch_edges() {
    let mut arrow = parse_arrow(
        "({ foo, bar }) => { const outer = { foo, nested: { bar } }; watch(foo, () => bar); return <div>{outer.foo}</div>; }",
    );
    assert!(rewrite_component_props_destructure_in_arrow(&mut arrow));

    let rendered = compact(&emit_stmts(vec![Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Arrow(arrow)),
    })]));

    assert!(rendered.contains("foo:__rue_props.foo"));
    assert!(rendered.contains("bar:__rue_props.bar"));
    assert!(rendered.contains("watch(__rue_props.foo,()=>__rue_props.bar);"));
}

#[test]
fn hardens_props_alias_prepare_and_rewriter_bodyless_edges() {
    let sparse_pat = parse_arrow_param("([first,, third] = props.items) => first + third");
    let mut aliases = HashMap::new();
    collect_reactive_prop_alias_exprs_from_pat(
        &sparse_pat,
        parse_expr("props.items", false),
        &mut aliases,
    );
    assert!(aliases.contains_key("first"));
    assert!(aliases.contains_key("third"));
    assert_eq!(aliases.len(), 2);

    let assign_rest_pat = parse_arrow_param("({ foo, ...rest } = fallback) => foo");
    let (assign_aliases, rewritten_pat, prologue) =
        prepare_component_props_param_rewrite(&assign_rest_pat).expect("assign rest rewrite");
    assert!(assign_aliases.contains_key("foo"));
    assert_eq!(prologue.len(), 1);
    assert!(matches!(rewritten_pat, Pat::Assign(_)));

    let non_object_assign = parse_arrow_param("(value = fallback) => value");
    assert!(prepare_component_props_param_rewrite(&non_object_assign).is_none());

    let mut fn_expr = match parse_expr("function helper(total) {}", true) {
        Expr::Fn(fn_expr) => fn_expr,
        other => panic!("expected fn expr, got {other:?}"),
    };
    fn_expr.function.body = None;
    let mut expr = Expr::Fn(fn_expr);
    let derived = HashSet::from(["total".to_string()]);
    let mut rewriter = DerivedConstUsageRewriter::new(&derived, HashMap::new());
    expr.visit_mut_with(&mut rewriter);
    assert!(matches!(expr, Expr::Fn(_)));

    let mut bodyless = Function {
        params: Vec::new(),
        decorators: Vec::new(),
        span: DUMMY_SP,
        ctxt: Default::default(),
        body: None,
        is_generator: false,
        is_async: false,
        type_params: None,
        return_type: None,
    };
    process_function(&mut bodyless);
    assert!(bodyless.body.is_none());
    assert!(!lower_props_derived_consts_in_function(&mut bodyless));

    let mut watch_stmt = parse_module_stmt("watch(foo);", false);
    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("foo".to_string(), parse_expr("__rue_props.foo", false));
    let mut props_rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    watch_stmt.visit_mut_with(&mut props_rewriter);
    let watch_out = compact(&emit_stmts(vec![watch_stmt]));
    assert!(watch_out.contains("watch(__rue_props.foo);"));

    let mut shorthand_stmt = parse_module_stmt("const out = { foo };", false);
    let mut shorthand_rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    shorthand_stmt.visit_mut_with(&mut shorthand_rewriter);
    let shorthand_out = compact(&emit_stmts(vec![shorthand_stmt]));
    assert!(shorthand_out.contains("{foo:__rue_props.foo}"));
}

#[test]
fn hardens_phase2_collector_and_setup_unavailable_edges() {
    let candidate_names = HashSet::from(["value".to_string(), "derived".to_string()]);
    let mut collector = Phase2UsageCollector::new(&candidate_names, HashMap::new(), HashMap::new());
    collector.push_mode(Phase2UsageMode::CandidateInit("value".to_string()));
    collector.record_name("value");
    collector.record_name("derived");
    collector.pop_mode();

    let deps = collector.candidate_deps.get("value").expect("derived dep");
    assert_eq!(deps, &HashSet::from(["derived".to_string()]));
    assert!(!deps.contains("value"));

    let bodyless_fn = parse_expr("function helper(total) {}", true);
    let mut bodyless_fn = match bodyless_fn {
        Expr::Fn(fn_expr) => fn_expr,
        other => panic!("expected fn expr, got {other:?}"),
    };
    bodyless_fn.function.body = None;
    assert!(Phase2HelperDef::from_expr(&Expr::Fn(bodyless_fn)).is_none());

    let no_rest_pat = parse_arrow_param("({ foo }) => foo");
    let Pat::Object(no_rest_object) = no_rest_pat else {
        panic!("expected object pattern");
    };
    assert!(build_rest_destructure_prologue(&no_rest_object).is_none());

    let rest_param = parse_arrow_param("(...rest) => rest");
    let param_names = collect_param_idents(&[rest_param]);
    assert!(param_names.contains("rest"));

    let setup_fn = parse_fn_decl(
        "function Comp() { const blocked = missing; const ready = computed(() => blocked); watchEffect(() => ready); return <div>{ready}</div>; }",
    );
    let block = setup_fn.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return");
    let (collected, const_names, _, _) =
        collect_setup(&block, ret_idx, ret_idx, true, &HashSet::new());
    let out = compact(&emit_stmts(collected));

    assert!(out.contains("constblocked=missing;"));
    assert!(out.contains("constready=computed(()=>blocked);"));
    assert!(out.contains("watchEffect(()=>ready);"));
    assert_eq!(const_names, vec!["blocked".to_string(), "ready".to_string()]);
}

#[test]
fn hardens_more_props_rewrite_jsx_boundary_and_component_entry_edges() {
    let mut assign_rest_arrow =
        parse_arrow("({ title, ...rest } = defaults) => <Panel title={title} rest={rest} />");
    assert!(rewrite_component_props_destructure_in_arrow(&mut assign_rest_arrow));
    let assign_rest_out = compact(&emit_expr(Expr::Arrow(assign_rest_arrow)));
    assert!(assign_rest_out.contains("title:__rue_rest_omit_0"));
    assert!(assign_rest_out.contains("...rest}=__rue_props"));
    assert!(assign_rest_out.contains("__rue_props.title"));

    let call_callee_jsx_fn =
        parse_fn_decl("function Comp() { const value = (<span />)(); return <div>{value}</div>; }");
    let call_callee_block = call_callee_jsx_fn.function.body.clone().expect("body");
    let call_ret_idx = find_first_return_index(&call_callee_block).expect("return");
    let (call_collected, _, _, _) =
        collect_setup(&call_callee_block, call_ret_idx, call_ret_idx, false, &HashSet::new());
    assert!(call_collected.is_empty());

    let object_assign_jsx_fn = parse_fn_decl(
        "function Comp() { const value = { child = <span /> }; return <div>{value.child}</div>; }",
    );
    let object_assign_block = object_assign_jsx_fn.function.body.clone().expect("body");
    let object_ret_idx = find_first_return_index(&object_assign_block).expect("return");
    let (object_collected, _, _, _) =
        collect_setup(&object_assign_block, object_ret_idx, object_ret_idx, false, &HashSet::new());
    assert!(object_collected.is_empty());

    let mut no_return_arrow = parse_arrow("() => { const value = props.count; }");
    assert!(!lower_props_derived_consts_in_arrow(&mut no_return_arrow));
    let mut no_return_fn = parse_fn_decl("function Comp(props) { const value = props.count; }");
    assert!(!lower_props_derived_consts_in_function(&mut no_return_fn.function));

    let mut jsx_return_type_arrow =
        parse_var_declarator("const Comp = () => { const value = 1; return value; };");
    if let Some(Expr::Arrow(arrow)) = jsx_return_type_arrow.init.as_mut().map(|init| init.as_mut())
    {
        arrow.return_type = Some(Box::new(TsTypeAnn {
            span: DUMMY_SP,
            type_ann: Box::new(TsType::TsTypeRef(TsTypeRef {
                span: DUMMY_SP,
                type_name: TsEntityName::Ident(crate::emit::ident("JSX.Element")),
                type_params: None,
            })),
        }));
    }
    assert!(is_untyped_arrow_component_decl(&jsx_return_type_arrow));

    let mut no_return_process = parse_expr("function Plain() { const value = 1; }", true);
    let Expr::Fn(fn_expr) = &mut no_return_process else {
        panic!("expected fn expr");
    };
    process_function(&mut fn_expr.function);
    assert!(compact(&emit_expr(no_return_process)).contains("constvalue=1;"));
}

#[test]
fn hardens_more_component_entry_noops_and_phase2_call_edges() {
    let mut no_return_decl = parse_fn_decl("function Maybe(props) { const value = props.count; }");
    process_fn_decl(&mut no_return_decl);
    let no_return_out = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(no_return_decl))]));
    assert!(!no_return_out.contains("_$useSetup"));

    let mut bodyless_decl = parse_fn_decl("function Bodyless() { return <div />; }");
    bodyless_decl.function.body = None;
    process_fn_decl(&mut bodyless_decl);
    assert!(bodyless_decl.function.body.is_none());
    assert!(!should_transform_fn_decl(&bodyless_decl));

    let non_arrow_decl = parse_var_declarator("const View = function () { return <div />; };");
    assert!(!is_untyped_arrow_component_decl(&non_arrow_decl));

    let expr_typed_arrow = parse_var_declarator("const View = (): JSX.Element => value;");
    assert!(!is_untyped_arrow_component_decl(&expr_typed_arrow));

    let array_pat_decl = parse_var_declarator("const [View]: FC[] = [() => <div />];");
    assert!(!is_fc_pat(&array_pat_decl.name));

    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const base = props.count + 1; const extra = props.extra; const helper = (value) => base + value; const alias = helper; return <div>{alias(extra)}</div>; }",
    );
    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let rendered = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));
    assert!(rendered.contains(&normalize("const base = computed(()=>props.count + 1);")));
    assert!(rendered.contains(&normalize("const extra = computed(()=>props.extra);")));
    assert!(rendered.contains("__rue_phase2_base.get() + value"));
    assert!(rendered.contains(&normalize("alias(extra.get())")));
}

#[test]
fn hardens_additional_props_rewriter_and_setup_hoist_edges() {
    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("title".to_string(), parse_expr("__rue_props.title", false));
    alias_exprs
        .insert("choice".to_string(), parse_expr("ok ? __rue_props.a : __rue_props.b", false));

    let mut object_stmt = parse_module_stmt(
        "const out = { title, choice, nested() { const title = local; return { title, choice }; } };",
        false,
    );
    let mut rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    object_stmt.visit_mut_with(&mut rewriter);
    let object_out = compact(&emit_stmts(vec![object_stmt]));
    assert!(object_out.contains("title:__rue_props.title"));
    assert!(object_out.contains("choice:(ok?__rue_props.a:__rue_props.b)"));
    assert!(object_out.contains("return{title,choice:(ok?__rue_props.a:__rue_props.b)}"));

    let bodyless_fn_expr = Expr::Fn(FnExpr {
        ident: None,
        function: Box::new(Function {
            params: vec![Param {
                span: DUMMY_SP,
                decorators: Vec::new(),
                pat: Pat::Ident(crate::emit::ident("title").into()),
            }],
            decorators: Vec::new(),
            span: DUMMY_SP,
            ctxt: Default::default(),
            body: None,
            is_generator: false,
            is_async: false,
            type_params: None,
            return_type: None,
        }),
    });
    let mut bodyless_stmt =
        Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(bodyless_fn_expr) });
    let mut bodyless_rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    bodyless_stmt.visit_mut_with(&mut bodyless_rewriter);
    assert!(compact(&emit_stmts(vec![bodyless_stmt])).contains("function(title)"));

    let fn_block = parse_fn_decl(
        "function Comp(props) { const missing = later + 1; watchEffect(() => later); later = props.value; return <div />; }",
    );
    let block = fn_block.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return");
    let initial_locals = HashSet::from(["later".to_string()]);
    let (collected, const_names, let_names, _) =
        collect_setup(&block, ret_idx, ret_idx, true, &initial_locals);
    let collected_out = compact(&emit_stmts(collected));
    assert!(collected_out.contains("constmissing"));
    assert!(collected_out.contains("watchEffect(()=>later);"));
    assert_eq!(const_names, vec!["missing".to_string()]);
    assert!(let_names.is_empty());

    let mut expr_typed_block_arrow =
        parse_var_declarator("const View = (): JSX.Element => { return value; };");
    if let Some(Expr::Arrow(arrow)) = expr_typed_block_arrow.init.as_mut().map(|init| init.as_mut())
    {
        *arrow.body = BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: Default::default(),
            stmts: vec![Stmt::Return(ReturnStmt {
                span: DUMMY_SP,
                arg: Some(Box::new(parse_expr("value", false))),
            })],
        });
    }
    assert!(!is_untyped_arrow_component_decl(&expr_typed_block_arrow));
}

#[test]
fn hardens_manual_invalid_patterns_and_setup_collection_tolerance() {
    let invalid_pat = Pat::Invalid(Invalid { span: DUMMY_SP });
    assert!(collect_param_idents(std::slice::from_ref(&invalid_pat)).is_empty());

    let invalid_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        ctxt: Default::default(),
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: invalid_pat,
            init: Some(Box::new(parse_expr("1", false))),
            definite: false,
        }],
    })));
    let return_stmt = Stmt::Return(ReturnStmt {
        span: DUMMY_SP,
        arg: Some(Box::new(parse_expr("<div />", true))),
    });
    let block = BlockStmt {
        span: DUMMY_SP,
        ctxt: Default::default(),
        stmts: vec![invalid_decl, Stmt::Empty(EmptyStmt { span: DUMMY_SP }), return_stmt],
    };

    let (collected, names_const, names_let, available) =
        collect_setup(&block, 2, 2, false, &HashSet::new());
    assert_eq!(collected.len(), 2);
    assert!(names_const.is_empty());
    assert!(names_let.is_empty());
    assert!(available.is_empty());

    let rest_with_invalid = Pat::Rest(RestPat {
        span: DUMMY_SP,
        dot3_token: DUMMY_SP,
        arg: Box::new(Pat::Invalid(Invalid { span: DUMMY_SP })),
        type_ann: None,
    });
    assert!(collect_param_idents(&[rest_with_invalid]).is_empty());
}

#[test]
fn hardens_phase2_alias_cycles_and_props_rewrite_in_nested_classes() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const base = props.count + 1; const helper = () => alias(); const alias = () => helper(); const use = () => base; return <div>{use()}</div>; }",
    );
    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let rendered = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(rendered.contains(&normalize("const base = computed(()=>props.count + 1);")));
    assert!(rendered.contains("__rue_phase2_base"));
    assert!(rendered.contains("__rue_phase2_base.get()"));

    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("title".to_string(), parse_expr("__rue_props.title", false));
    let mut class_stmt = parse_module_stmt(
        "class Box { method(title) { return title; } other() { return { title }; } }",
        false,
    );
    let mut rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    class_stmt.visit_mut_with(&mut rewriter);
    let out = compact(&emit_stmts(vec![class_stmt]));

    assert!(out.contains("method(title){returntitle;}"));
    assert!(out.contains("return{title:__rue_props.title};"));
}

#[test]
fn hardens_props_destructure_literal_keys_defaults_and_expr_body_rest() {
    let mut literal_arrow = parse_arrow(
        "({ 'data-id': dataId, 0: first, count = 1, nested: { title = fallback } }) => <Panel id={dataId} first={first} count={count} title={title} />",
    );
    assert!(rewrite_component_props_destructure_in_arrow(&mut literal_arrow));
    let literal_out = compact(&emit_expr(Expr::Arrow(literal_arrow)));

    assert!(literal_out.contains("__rue_props['data-id']"), "{literal_out}");
    assert!(literal_out.contains("__rue_props[0]"), "{literal_out}");
    assert!(literal_out.contains("__rue_props.count===void0?1:__rue_props.count"), "{literal_out}");
    assert!(literal_out.contains("__rue_props.nested.title===void0?fallback"), "{literal_out}");

    let mut rest_expr_arrow = parse_arrow(
        "({ title, kind: type, ...rest }) => <Panel title={title} type={type} rest={rest} />",
    );
    assert!(rewrite_component_props_destructure_in_arrow(&mut rest_expr_arrow));
    let rest_out = compact(&emit_expr(Expr::Arrow(rest_expr_arrow)));

    assert!(rest_out.contains("=>{"));
    assert!(
        rest_out
            .contains("const{title:__rue_rest_omit_0,kind:__rue_rest_omit_1,...rest}=__rue_props;")
    );
    assert!(rest_out.contains("return<Panel"));
    assert!(rest_out.contains("title={__rue_props.title}"));
    assert!(rest_out.contains("type={__rue_props.kind}"));
}

#[test]
fn hardens_phase2_sequence_assignment_and_shadowed_helper_params() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const base = props.count + 1; const extra = props.extra; const helper = (base) => base + extra; const render = () => (base, helper(1)); return <div>{render()}</div>; }",
    );
    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let out = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(out.contains(&normalize("const base = computed(()=>props.count + 1);")));
    assert!(out.contains(&normalize("const extra = computed(()=>props.extra);")));
    assert!(out.contains("base + __rue_phase2_extra.get()"));
    assert!(out.contains("__rue_phase2_base.get(), helper(1)"));

    let mut assignment_arrow = parse_arrow(
        "(props) => { const total = props.count; const set = () => (cache = total); return <div>{set()}</div>; }",
    );
    assert!(lower_props_derived_consts_in_arrow(&mut assignment_arrow));
    let assignment_out = normalize(&emit_expr(Expr::Arrow(assignment_arrow)));
    assert!(assignment_out.contains(&normalize("const total = computed(()=>props.count);")));
    assert!(assignment_out.contains("cache = __rue_phase2_total.get()"));
}

#[test]
fn hardens_collect_setup_with_classes_labels_and_late_known_locals() {
    let fn_decl = parse_fn_decl(
        "function Comp(props) { class LocalBox { value() { return props.value; } } const box = new LocalBox(); label: watchEffect(() => box.value()); let later = box.value(); if (props.skip) later = 1; return <div>{later}</div>; }",
    );
    let block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return");
    let first_control = first_control_idx(&block, ret_idx);
    let (collected, const_names, let_names, available) =
        collect_setup(&block, ret_idx, first_control, true, &HashSet::new());
    let out = compact(&emit_stmts(collected));

    assert!(out.contains("classLocalBox"));
    assert!(out.contains("constbox=newLocalBox();"));
    assert!(out.contains("label:watchEffect(()=>box.value());"));
    assert!(out.contains("letlater=box.value();"));
    assert!(const_names.contains(&"box".to_string()));
    assert!(let_names.contains(&"later".to_string()));
    assert!(available.contains("box"));
    assert!(available.contains("later"));
}

#[test]
fn hardens_props_destructure_computed_keys_array_defaults_and_rest_omits() {
    let mut arrow = parse_arrow(
        "({ [kind]: value, items: [first = fallback], nested: { label }, ...rest }) => <Panel value={value} first={first} label={label} rest={rest} />",
    );
    assert!(rewrite_component_props_destructure_in_arrow(&mut arrow));
    let out = compact(&emit_expr(Expr::Arrow(arrow)));

    assert!(out.contains("__rue_props[kind]"), "{out}");
    assert!(out.contains("__rue_props.items[0]===void0?fallback:__rue_props.items[0]"), "{out}");
    assert!(out.contains("__rue_props.nested.label"), "{out}");
    assert!(out.contains("...rest}=__rue_props"), "{out}");
    assert!(out.contains("value={__rue_props[kind]}"), "{out}");
    assert!(out.contains("label={__rue_props.nested.label}"), "{out}");

    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("value".to_string(), parse_expr("__rue_props.value", false));
    let mut catch_stmt =
        parse_module_stmt("try { throw value; } catch (value) { use(value); }", false);
    let mut rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    catch_stmt.visit_mut_with(&mut rewriter);
    let catch_out = compact(&emit_stmts(vec![catch_stmt]));
    assert!(catch_out.contains("throw__rue_props.value;"), "{catch_out}");
    assert!(catch_out.contains("catch(value){use(value);}"), "{catch_out}");
}

#[test]
fn hardens_phase2_defaults_nested_helpers_and_shadowed_catches() {
    let mut fn_decl = parse_fn_decl(
        "function Comp(props) { const base = props.count + 1; function read(mult = base) { try { throw 1; } catch (base) { return mult + base; } } const render = () => base + read(); return <div>{render()}</div>; }",
    );
    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let out = normalize(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(out.contains(&normalize("const base = computed(()=>props.count + 1);")));
    assert!(out.contains("mult = __rue_phase2_base.get()"), "{out}");
    assert!(out.contains("catch (base)"), "{out}");
    assert!(out.contains("mult + base"), "{out}");
    assert!(out.contains("__rue_phase2_base.get() + read()"), "{out}");
}

#[test]
fn hardens_collect_setup_await_rejection_and_labeled_setup_effects() {
    let fn_decl = parse_fn_decl(
        "function Comp(props) { const state = ref(0); label: watchEffect(() => state.value); const blocked = await load(); const after = computed(() => state.value); return <div>{state.value}{after.value}</div>; }",
    );
    let block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return");
    let first_control = first_control_idx(&block, ret_idx);
    let (collected, const_names, let_names, available) =
        collect_setup(&block, ret_idx, first_control, false, &HashSet::new());
    let out = compact(&emit_stmts(collected));

    assert!(out.contains("conststate=ref(0);"), "{out}");
    assert!(out.contains("label:watchEffect(()=>state.value);"), "{out}");
    assert!(!out.contains("awaitload"), "{out}");
    assert!(!out.contains("constafter=computed"), "{out}");
    assert_eq!(const_names, vec!["state".to_string()]);
    assert!(let_names.is_empty());
    assert!(available.contains("state"));
    assert!(!available.contains("after"));
}

#[test]
fn hardens_props_rewriter_watch_shorthand_and_destructured_catch_scopes() {
    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("title".to_string(), parse_expr("__rue_props.title", false));
    alias_exprs.insert("count".to_string(), parse_expr("__rue_props.count", false));

    let mut stmts = parse_module_stmts(
        "const out = { title, nested: () => ({ count }) }; watch(title); try { throw title; } catch ({ title }) { use(title, count); }",
        false,
    );
    let mut rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    for stmt in &mut stmts {
        stmt.visit_mut_with(&mut rewriter);
    }
    let out = compact(&emit_stmts(stmts));

    assert!(out.contains("title:__rue_props.title"), "{out}");
    assert!(out.contains("count:__rue_props.count"), "{out}");
    assert!(out.contains("watch(__rue_props.title);"), "{out}");
    assert!(out.contains("throw__rue_props.title;"), "{out}");
    assert!(out.contains("catch({title}){use(title,__rue_props.count);}"), "{out}");
}

#[test]
fn hardens_props_destructure_assigned_rest_and_setup_unavailable_edges() {
    let mut arrow = parse_arrow(
        "({ title, kind: type, ...rest } = fallback) => <Panel title={title} type={type} rest={rest} />",
    );
    assert!(rewrite_component_props_destructure_in_arrow(&mut arrow));
    let out = compact(&emit_expr(Expr::Arrow(arrow)));

    assert!(out.contains("(__rue_props=fallback)"), "{out}");
    assert!(
        out.contains("const{title:__rue_rest_omit_0,kind:__rue_rest_omit_1,...rest}=__rue_props;"),
        "{out}"
    );
    assert!(out.contains("title={__rue_props.title}"), "{out}");
    assert!(out.contains("type={__rue_props.kind}"), "{out}");

    let fn_decl = parse_fn_decl(
        "function Comp() { const early = later + 1; const kept = ref(0); const setup = useSetup(() => watchEffect(() => later)); let later = kept.value; return <div>{later}</div>; }",
    );
    let block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return");
    let first_control = first_control_idx(&block, ret_idx);
    let (collected, const_names, let_names, available) =
        collect_setup(&block, ret_idx, first_control, true, &HashSet::new());
    let rendered = compact(&emit_stmts(collected));

    assert!(rendered.contains("constearly=later+1;"), "{rendered}");
    assert!(rendered.contains("constkept=ref(0);"), "{rendered}");
    assert!(rendered.contains("constsetup=useSetup(()=>watchEffect(()=>later));"), "{rendered}");
    assert!(rendered.contains("letlater=kept.value;"), "{rendered}");
    assert_eq!(const_names, vec!["early".to_string(), "kept".to_string(), "setup".to_string()]);
    assert_eq!(let_names, vec!["later".to_string()]);
    assert!(available.contains("kept"));
    assert!(available.contains("setup"));
    assert!(available.contains("later"));
}

#[test]
fn hardens_manual_jsx_callee_and_arrow_component_entry_edges() {
    let jsx_callee_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        ctxt: Default::default(),
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent { id: crate::emit::ident("blocked"), type_ann: None }),
            init: Some(Box::new(Expr::Call(CallExpr {
                span: DUMMY_SP,
                ctxt: Default::default(),
                callee: Callee::Expr(Box::new(parse_expr("<Factory />", true))),
                args: vec![ExprOrSpread { spread: None, expr: Box::new(parse_expr("arg", false)) }],
                type_args: None,
            }))),
            definite: false,
        }],
    })));
    let return_stmt = parse_module_stmt("return <div />;", true);
    let block = BlockStmt {
        span: DUMMY_SP,
        ctxt: Default::default(),
        stmts: vec![jsx_callee_decl, return_stmt],
    };
    let (collected, _, _, available) = collect_setup(&block, 1, 1, false, &HashSet::new());
    assert!(collected.is_empty());
    assert!(!available.contains("blocked"));

    let block_typed_arrow =
        parse_var_declarator("const View = (): JSX.Element => { const value = 1; return value; };");
    assert!(!is_untyped_arrow_component_decl(&block_typed_arrow));

    let member_typed_arrow =
        parse_var_declarator("const View = (): React.JSX.Element => { return value; };");
    assert!(!is_untyped_arrow_component_decl(&member_typed_arrow));
}

#[test]
fn hardens_rest_only_assigned_props_and_manual_jsx_element_return_type() {
    let mut rest_only_arrow = parse_arrow("({ ...rest } = fallback) => <Panel rest={rest} />");
    assert!(rewrite_component_props_destructure_in_arrow(&mut rest_only_arrow));
    let rest_out = compact(&emit_expr(Expr::Arrow(rest_only_arrow)));

    assert!(rest_out.contains("(__rue_props=fallback)"), "{rest_out}");
    assert!(rest_out.contains("rest={rest}"), "{rest_out}");
    assert!(!rest_out.contains("__rue_rest_omit"), "{rest_out}");

    let manual_arrow = ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: Default::default(),
            stmts: vec![parse_module_stmt("const value = 1;", false)],
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: Some(Box::new(TsTypeAnn {
            span: DUMMY_SP,
            type_ann: Box::new(TsType::TsTypeRef(TsTypeRef {
                span: DUMMY_SP,
                type_name: TsEntityName::Ident(crate::emit::ident("JSX.Element")),
                type_params: None,
            })),
        })),
        ctxt: Default::default(),
    };
    let manual_decl = VarDeclarator {
        span: DUMMY_SP,
        name: Pat::Ident(BindingIdent { id: crate::emit::ident("View"), type_ann: None }),
        init: Some(Box::new(Expr::Arrow(manual_arrow))),
        definite: false,
    };

    assert!(is_untyped_arrow_component_decl(&manual_decl));
}

#[test]
fn hardens_super_callee_setup_scan_and_arrow_expression_shadowing() {
    let super_call_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        ctxt: Default::default(),
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent { id: crate::emit::ident("maybe"), type_ann: None }),
            init: Some(Box::new(Expr::Call(CallExpr {
                span: DUMMY_SP,
                ctxt: Default::default(),
                callee: Callee::Super(Super { span: DUMMY_SP }),
                args: vec![],
                type_args: None,
            }))),
            definite: false,
        }],
    })));
    let block = BlockStmt {
        span: DUMMY_SP,
        ctxt: Default::default(),
        stmts: vec![super_call_decl, parse_module_stmt("return <div />;", true)],
    };
    let (collected, _, _, available) = collect_setup(&block, 1, 1, false, &HashSet::new());
    let out = compact(&emit_stmts(collected));

    assert!(out.contains("constmaybe=super();"), "{out}");
    assert!(available.contains("maybe"));

    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("title".to_string(), parse_expr("__rue_props.title", false));
    let mut stmts =
        parse_module_stmts("const render = (title) => ({ title }); const value = title;", false);
    let mut rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    for stmt in &mut stmts {
        stmt.visit_mut_with(&mut rewriter);
    }
    let rewritten = compact(&emit_stmts(stmts));

    assert!(rewritten.contains("({title})"), "{rewritten}");
    assert!(rewritten.contains("constvalue=__rue_props.title;"), "{rewritten}");
}

#[test]
fn hardens_props_rewriter_loop_function_and_object_method_scopes() {
    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("title".to_string(), parse_expr("__rue_props.title", false));
    alias_exprs.insert("count".to_string(), parse_expr("__rue_props.count", false));
    alias_exprs.insert("key".to_string(), parse_expr("__rue_props.key", false));

    let mut stmts = parse_module_stmts(
        r#"
for (let count = 0; count < limit; count++) { seen(count, title); }
for (const key in records) { seen(key, count); }
for (const title of titles) { seen(title); }
const mapper = function(count) { return count + title; };
const obj = { method(title) { return title; }, count };
const total = count + title;
"#,
        false,
    );
    let mut rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    for stmt in &mut stmts {
        stmt.visit_mut_with(&mut rewriter);
    }
    let out = compact(&emit_stmts(stmts));

    assert!(
        out.contains("for(letcount=0;count<limit;count++){seen(count,__rue_props.title);}"),
        "{out}"
    );
    assert!(out.contains("for(constkeyinrecords){seen(key,__rue_props.count);}"), "{out}");
    assert!(out.contains("for(consttitleoftitles){seen(title);}"), "{out}");
    assert!(out.contains("returncount+__rue_props.title;"), "{out}");
    assert!(out.contains("method(title){returntitle;}"), "{out}");
    assert!(out.contains("count:__rue_props.count"), "{out}");
    assert!(out.contains("consttotal=__rue_props.count+__rue_props.title;"), "{out}");
}

#[test]
fn hardens_function_props_destructure_with_nested_defaults_and_rest_prologue() {
    let mut fn_decl = parse_fn_decl(
        "function View({ title: heading = 'Untitled', items: [first], ...rest }) { const local = () => heading; return <Panel title={heading} first={first} rest={rest} local={local()} />; }",
    );

    assert!(rewrite_component_props_destructure_in_function(&mut fn_decl.function));
    let out = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(out.contains("functionView(__rue_props)"), "{out}");
    assert!(out.contains("title:__rue_rest_omit_0"), "{out}");
    assert!(out.contains("items:__rue_rest_omit_1"), "{out}");
    assert!(out.contains("...rest}=__rue_props"), "{out}");
    assert!(
        out.contains("constlocal=()=>(__rue_props.title===void0?'Untitled':__rue_props.title);"),
        "{out}"
    );
    assert!(
        out.contains("title={(__rue_props.title===void0?'Untitled':__rue_props.title)}"),
        "{out}"
    );
    assert!(out.contains("first={__rue_props.items[0]}"), "{out}");
    assert!(out.contains("rest={rest}"), "{out}");
}

#[test]
fn hardens_phase2_derived_rewriter_loop_shadow_scopes() {
    let mut fn_decl = parse_fn_decl(
        "function View(props) { const total = props.count * 2; const helper = () => { for (let total = 0; total < 2; total++) use(total); for (const total in props.map) use(total); for (const total of props.items) use(total); return total; }; return <div>{helper()}</div>; }",
    );

    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let out = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(out.contains("consttotal=computed(()=>props.count*2);"), "{out}");
    assert!(out.contains("for(lettotal=0;total<2;total++)use(total);"), "{out}");
    assert!(out.contains("for(consttotalinprops.map)use(total);"), "{out}");
    assert!(out.contains("for(consttotalofprops.items)use(total);"), "{out}");
    assert!(out.contains("return__rue_phase2_total.get();"), "{out}");
}

#[test]
fn hardens_props_and_phase2_rewriters_for_using_heads_shorthand_and_watch_edges() {
    let using_title_head = ForHead::UsingDecl(Box::new(UsingDecl {
        span: DUMMY_SP,
        is_await: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent { id: crate::emit::ident("title"), type_ann: None }),
            init: None,
            definite: false,
        }],
    }));
    let using_count_head = ForHead::UsingDecl(Box::new(UsingDecl {
        span: DUMMY_SP,
        is_await: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent { id: crate::emit::ident("count"), type_ann: None }),
            init: None,
            definite: false,
        }],
    }));

    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("title".to_string(), parse_expr("__rue_props.title", false));
    alias_exprs.insert("count".to_string(), parse_expr("__rue_props.count", false));

    let mut props_stmts = vec![
        Stmt::ForOf(ForOfStmt {
            span: DUMMY_SP,
            is_await: false,
            left: using_title_head,
            right: Box::new(parse_expr("resources", false)),
            body: Box::new(parse_module_stmt("{ seen(title, count); }", false)),
        }),
        parse_module_stmt("const obj = { title };", false),
        parse_module_stmt("watch(title);", false),
        Stmt::ForIn(ForInStmt {
            span: DUMMY_SP,
            left: using_count_head,
            right: Box::new(parse_expr("records", false)),
            body: Box::new(parse_module_stmt("{ seen(count, title); }", false)),
        }),
    ];

    let mut props_rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    for stmt in &mut props_stmts {
        stmt.visit_mut_with(&mut props_rewriter);
    }
    let props_out = compact(&emit_stmts(props_stmts));

    assert!(
        props_out.contains("for(usingtitleofresources){seen(title,__rue_props.count);}"),
        "{props_out}"
    );
    assert!(props_out.contains("constobj={title:__rue_props.title};"), "{props_out}");
    assert!(props_out.contains("watch(__rue_props.title);"), "{props_out}");
    assert!(
        props_out.contains("for(usingcountinrecords){seen(count,__rue_props.title);}"),
        "{props_out}"
    );

    let mut derived_names = HashSet::new();
    derived_names.insert("total".to_string());
    derived_names.insert("label".to_string());
    let mut replacement_idents = HashMap::new();
    replacement_idents.insert("total".to_string(), crate::emit::ident("__rue_phase2_total"));
    replacement_idents.insert("label".to_string(), crate::emit::ident("__rue_phase2_label"));
    let mut phase2_stmts = vec![
        Stmt::ForOf(ForOfStmt {
            span: DUMMY_SP,
            is_await: false,
            left: ForHead::UsingDecl(Box::new(UsingDecl {
                span: DUMMY_SP,
                is_await: false,
                decls: vec![VarDeclarator {
                    span: DUMMY_SP,
                    name: Pat::Ident(BindingIdent {
                        id: crate::emit::ident("total"),
                        type_ann: None,
                    }),
                    init: None,
                    definite: false,
                }],
            })),
            right: Box::new(parse_expr("totals", false)),
            body: Box::new(parse_module_stmt("{ seen(total, label); }", false)),
        }),
        parse_module_stmt("const obj = { total, label };", false),
    ];
    let mut phase2_rewriter = DerivedConstUsageRewriter::new(&derived_names, replacement_idents);
    for stmt in &mut phase2_stmts {
        stmt.visit_mut_with(&mut phase2_rewriter);
    }
    let phase2_out = compact(&emit_stmts(phase2_stmts));

    assert!(
        phase2_out.contains("for(usingtotaloftotals){seen(total,__rue_phase2_label.get());}"),
        "{phase2_out}"
    );
    assert!(
        phase2_out
            .contains("constobj={total:__rue_phase2_total.get(),label:__rue_phase2_label.get()};"),
        "{phase2_out}"
    );
}

#[test]
fn hardens_bare_for_heads_post_return_phase2_and_no_return_entries() {
    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("title".to_string(), parse_expr("__rue_props.title", false));
    alias_exprs.insert("count".to_string(), parse_expr("__rue_props.count", false));

    let mut props_stmts = parse_module_stmts(
        r#"
for (title in records) {
  seen(title, count);
}
for (count of totals) {
  seen(count, title);
}
const bag = { title, count };
"#,
        false,
    );
    let mut props_rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    for stmt in &mut props_stmts {
        stmt.visit_mut_with(&mut props_rewriter);
    }
    let props_out = compact(&emit_stmts(props_stmts));

    assert!(
        props_out.contains("for(titleinrecords){seen(title,__rue_props.count);}"),
        "{props_out}"
    );
    assert!(
        props_out.contains("for(countoftotals){seen(count,__rue_props.title);}"),
        "{props_out}"
    );
    assert!(
        props_out.contains("constbag={title:__rue_props.title,count:__rue_props.count};"),
        "{props_out}"
    );

    let mut fn_decl = parse_fn_decl(
        "function View(props) { const total = props.count * 2; const wrap = () => total + 1; const pick = () => ({ total }); return <div>{wrap()}</div>; after(total); }",
    );
    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let phase2_out = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(phase2_out.contains("consttotal=computed(()=>props.count*2);"), "{phase2_out}");
    assert!(phase2_out.contains("const__rue_phase2_total=total;"), "{phase2_out}");
    assert!(phase2_out.contains("constwrap=()=>__rue_phase2_total.get()+1;"), "{phase2_out}");
    assert!(
        phase2_out.contains("constpick=()=>({total:__rue_phase2_total.get()});"),
        "{phase2_out}"
    );
    assert!(phase2_out.contains("after(total.get());"), "{phase2_out}");

    let mut bodyless_arrow = parse_arrow("() => value");
    assert!(!lower_props_derived_consts_in_arrow(&mut bodyless_arrow));
    assert!(matches!(*bodyless_arrow.body, BlockStmtOrExpr::Expr(_)));

    let typed_block_arrow =
        parse_var_declarator("const View = (): JSX.Element => { return <div />; };");
    assert!(is_untyped_arrow_component_decl(&typed_block_arrow));

    let mut synthetic_ident_jsx_arrow =
        parse_var_declarator("const View = () => { const value = 1; };");
    if let Some(Expr::Arrow(arrow)) =
        synthetic_ident_jsx_arrow.init.as_mut().map(|init| init.as_mut())
    {
        arrow.return_type = Some(Box::new(TsTypeAnn {
            span: DUMMY_SP,
            type_ann: Box::new(TsType::TsTypeRef(TsTypeRef {
                span: DUMMY_SP,
                type_name: TsEntityName::Ident(crate::emit::ident("JSX.Element")),
                type_params: None,
            })),
        }));
    }
    assert!(is_untyped_arrow_component_decl(&synthetic_ident_jsx_arrow));

    let mut watch_member_stmt = parse_module_stmt("watch(title.value);", false);
    let mut props_rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    watch_member_stmt.visit_mut_with(&mut props_rewriter);
    let watch_member_out = compact(&emit_stmts(vec![watch_member_stmt]));
    assert!(watch_member_out.contains("watch(__rue_props.title.value);"), "{watch_member_out}");

    let mut no_return_fn =
        parse_fn_decl("function Helper() { const state = ref(0); state.value++; }");
    process_fn_decl(&mut no_return_fn);
    let no_return_out = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(no_return_fn))]));
    assert!(!no_return_out.contains("_$useSetup"), "{no_return_out}");

    let no_init = parse_var_declarator("const View;");
    assert!(!is_untyped_arrow_component_decl(&no_init));
}

#[test]
fn hardens_for_stmt_init_shadowing_for_props_and_phase2_rewriters() {
    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("title".to_string(), parse_expr("__rue_props.title", false));
    alias_exprs.insert("count".to_string(), parse_expr("__rue_props.count", false));

    let mut props_stmts = parse_module_stmts(
        r#"
for (let i = title; i < count; i++) {
  seen(i, title);
}
for (let title = 0; title < count; title++) {
  seen(title, count);
}
"#,
        false,
    );
    let mut props_rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    for stmt in &mut props_stmts {
        stmt.visit_mut_with(&mut props_rewriter);
    }
    let props_out = compact(&emit_stmts(props_stmts));

    assert!(
        props_out.contains(
            "for(leti=__rue_props.title;i<__rue_props.count;i++){seen(i,__rue_props.title);}"
        ),
        "{props_out}"
    );
    assert!(
        props_out.contains(
            "for(lettitle=0;title<__rue_props.count;title++){seen(title,__rue_props.count);}"
        ),
        "{props_out}"
    );

    let mut derived_names = HashSet::new();
    derived_names.insert("total".to_string());
    derived_names.insert("limit".to_string());
    let mut replacement_idents = HashMap::new();
    replacement_idents.insert("total".to_string(), crate::emit::ident("__rue_phase2_total"));
    replacement_idents.insert("limit".to_string(), crate::emit::ident("__rue_phase2_limit"));

    let mut phase2_stmts = parse_module_stmts(
        r#"
for (let i = total; i < limit; i++) {
  seen(i, total);
}
for (let total = 0; total < limit; total++) {
  seen(total, limit);
}
"#,
        false,
    );
    let mut phase2_rewriter = DerivedConstUsageRewriter::new(&derived_names, replacement_idents);
    for stmt in &mut phase2_stmts {
        stmt.visit_mut_with(&mut phase2_rewriter);
    }
    let phase2_out = compact(&emit_stmts(phase2_stmts));

    assert!(
        phase2_out.contains(
            "for(leti=__rue_phase2_total.get();i<__rue_phase2_limit.get();i++){seen(i,__rue_phase2_total.get());}"
        ),
        "{phase2_out}"
    );
    assert!(
        phase2_out.contains("for(lettotal=0;total<__rue_phase2_limit.get();total++){seen(total,__rue_phase2_limit.get());}"),
        "{phase2_out}"
    );
}

#[test]
fn hardens_direct_props_rewriter_object_and_watch_shapes() {
    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("foo".to_string(), parse_expr("__rue_props.foo", false));
    alias_exprs.insert("bar".to_string(), parse_expr("__rue_props.bar", false));

    let mut stmts = parse_module_stmts(
        r#"
const out = {
  foo,
  nested: { bar },
  method(foo) { return { foo, bar }; },
  arrow: (bar) => ({ foo, bar })
};
watch(foo);
watch(() => bar);
"#,
        false,
    );
    let mut rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    for stmt in &mut stmts {
        stmt.visit_mut_with(&mut rewriter);
    }

    let out = compact(&emit_stmts(stmts));
    assert!(out.contains("foo:__rue_props.foo"), "{out}");
    assert!(out.contains("nested:{bar:__rue_props.bar}"), "{out}");
    assert!(out.contains("method(foo){return{foo,bar:__rue_props.bar};}"), "{out}");
    assert!(out.contains("arrow:(bar)=>({foo:__rue_props.foo,bar})"), "{out}");
    assert!(out.contains("watch(__rue_props.foo);"), "{out}");
    assert!(out.contains("watch(()=>__rue_props.bar);"), "{out}");
}

#[test]
fn hardens_remaining_helper_rewriter_alias_and_setup_edges() {
    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("foo".to_string(), parse_expr("__rue_props.foo", false));
    alias_exprs.insert("bar".to_string(), parse_expr("__rue_props.bar", false));

    let mut props_stmts = parse_module_stmts(
        r#"
const shallow = { foo };
const nested = { inner: { bar } };
watch(foo, () => bar);
watch();
watch(ns.foo);
"#,
        false,
    );
    let mut props_rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    for stmt in &mut props_stmts {
        stmt.visit_mut_with(&mut props_rewriter);
    }
    let props_out = compact(&emit_stmts(props_stmts));

    assert!(props_out.contains("constshallow={foo:__rue_props.foo};"), "{props_out}");
    assert!(props_out.contains("constnested={inner:{bar:__rue_props.bar}};"), "{props_out}");
    assert!(props_out.contains("watch(__rue_props.foo,()=>__rue_props.bar);"), "{props_out}");
    assert!(props_out.contains("watch();"), "{props_out}");
    assert!(props_out.contains("watch(ns.foo);"), "{props_out}");

    let fn_decl = parse_fn_decl(
        "function Comp(props) { var loose = props.count; let label = loose + 1; const fixed = label + 1; function read() { return fixed; } return <div>{read()}</div>; }",
    );
    let block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return index");
    let fci = first_control_idx(&block, ret_idx);
    let mut initial_locals = HashSet::new();
    initial_locals.insert("props".to_string());
    let (collected, names_const, names_let, available) =
        collect_setup(&block, ret_idx, fci, false, &initial_locals);

    assert_eq!(collected.len(), 4);
    assert_eq!(names_const, vec!["fixed".to_string(), "read".to_string()]);
    assert_eq!(names_let, vec!["loose".to_string(), "label".to_string()]);
    assert!(available.contains("loose"));
    assert!(available.contains("label"));

    let typed_block_arrow = parse_var_declarator(
        "const View = (): JSX.Element => { const local = value; return local; };",
    );
    assert!(!is_untyped_arrow_component_decl(&typed_block_arrow));
}

#[test]
fn hardens_phase2_helper_alias_calls_with_arguments_and_shorthand_returns() {
    let mut fn_decl = parse_fn_decl(
        "function View(props) { const base = props.count + 1; const total = base * 2; const read = (extra) => ({ total, extra }); const alias = read; const packed = alias(total); return <div>{packed.total}</div>; }",
    );

    assert!(lower_props_derived_consts_in_function(&mut fn_decl.function));
    let out = compact(&emit_stmts(vec![Stmt::Decl(Decl::Fn(fn_decl))]));

    assert!(out.contains("constbase=computed(()=>props.count+1);"), "{out}");
    assert!(out.contains("consttotal=computed(()=>__rue_phase2_base.get()*2);"), "{out}");
    assert!(out.contains("__rue_phase2_total.get()"), "{out}");
    assert!(out.contains("constpacked=computed(()=>alias(__rue_phase2_total.get()));"), "{out}");
    assert!(out.contains("return<div>{packed.get().total}</div>;"), "{out}");
}

#[test]
fn hardens_props_rewriter_for_loop_and_catch_scopes() {
    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("item".to_string(), parse_expr("__rue_props.item", false));
    alias_exprs.insert("rows".to_string(), parse_expr("__rue_props.rows", false));
    alias_exprs.insert("err".to_string(), parse_expr("__rue_props.err", false));

    let mut stmts = parse_module_stmts(
        r#"
for (let index = item; index < rows.length; index++) {
  seen(index, item);
}
for (const item of rows) {
  seen(item);
}
for (item in rows) {
  seen(item);
}
try {
  seen(err);
} catch (err) {
  seen(err, rows);
}
"#,
        false,
    );
    let mut rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    for stmt in &mut stmts {
        stmt.visit_mut_with(&mut rewriter);
    }
    let out = compact(&emit_stmts(stmts));

    assert!(out.contains("for(letindex=__rue_props.item;index<__rue_props.rows.length;index++)"));
    assert!(out.contains("seen(index,__rue_props.item);"));
    assert!(out.contains("for(constitemof__rue_props.rows){seen(item);}"), "{out}");
    assert!(out.contains("for(itemin__rue_props.rows){seen(item);}"), "{out}");
    assert!(out.contains("try{seen(__rue_props.err);}catch(err){seen(err,__rue_props.rows);}"));
}

#[test]
fn hardens_component_shape_and_process_entry_bails() {
    let bodyless = FnDecl {
        ident: Ident::new("Bodyless".into(), DUMMY_SP, Default::default()),
        declare: false,
        function: Box::new(Function {
            params: Vec::new(),
            decorators: Vec::new(),
            span: DUMMY_SP,
            ctxt: Default::default(),
            body: None,
            is_generator: false,
            is_async: false,
            type_params: None,
            return_type: None,
        }),
    };
    assert!(!should_transform_fn_decl(&bodyless));

    let typed_value_fn = parse_fn_decl("function Value(): JSX.Element { return value; }");
    assert!(!should_transform_fn_decl(&typed_value_fn));

    let non_jsx_type = parse_fn_decl("function Value(): React.ReactNode { return value; }");
    assert!(!should_transform_fn_decl(&non_jsx_type));

    let mut bodyless_function = Function {
        params: Vec::new(),
        decorators: Vec::new(),
        span: DUMMY_SP,
        ctxt: Default::default(),
        body: None,
        is_generator: false,
        is_async: false,
        type_params: None,
        return_type: None,
    };
    process_function(&mut bodyless_function);
    assert!(bodyless_function.body.is_none());
}

#[test]
fn hardens_manual_helper_collectors_and_false_predicate_edges() {
    assert!(
        collect_for_init_names(&Some(VarDeclOrExpr::Expr(Box::new(parse_expr("start", false,)))))
            .is_empty()
    );

    let mut alias_exprs = HashMap::new();
    alias_exprs.insert("foo".to_string(), parse_expr("__rue_props.foo", false));
    let mut props = parse_module_stmts(
        r#"
const out = { foo };
try { use(foo); } catch { use(foo); }
watch(foo.bar);
"#,
        false,
    );
    let mut rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    for stmt in &mut props {
        stmt.visit_mut_with(&mut rewriter);
    }
    let props_out = compact(&emit_stmts(props));
    assert!(props_out.contains("foo:__rue_props.foo"), "{props_out}");
    assert!(props_out.contains("catch{use(__rue_props.foo);}"), "{props_out}");
    assert!(props_out.contains("watch(__rue_props.foo.bar);"), "{props_out}");

    let async_fn = parse_fn_decl(
        "function Comp(flag) { const wrapped = _$compiledWithHookId('computed:bad', () => computed(value)); const effectish = _$compiledWithHookId('effect:bad', () => watchEffect(value)); const later = missing + 1; return <div>{flag}</div>; }",
    );
    let block = async_fn.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return");
    let initial_locals = HashSet::from(["flag".to_string()]);
    let (collected, names_const, _, available) =
        collect_setup(&block, ret_idx, ret_idx, false, &initial_locals);
    let collected_out = compact(&emit_stmts(collected));
    assert!(names_const.contains(&"wrapped".to_string()));
    assert!(names_const.contains(&"effectish".to_string()));
    assert!(available.contains("wrapped"));
    assert!(collected_out.contains("computed(value)"), "{collected_out}");
    assert!(collected_out.contains("watchEffect(value)"), "{collected_out}");
    assert!(collected_out.contains("constlater=missing+1;"), "{collected_out}");
}

#[test]
fn hardens_setup_hoistable_wrapped_watch_and_synthetic_jsx_return_type() {
    let fn_decl = parse_fn_decl(
        "function Comp() { const later = missing + 1; _$compiledWithHookId('watchEffect:edge', () => watchEffect(() => later)); return <div>{later}</div>; }",
    );
    let block = fn_decl.function.body.clone().expect("body");
    let ret_idx = find_first_return_index(&block).expect("return");
    let (collected, names_const, names_let, available) =
        collect_setup(&block, ret_idx, ret_idx, false, &HashSet::from(["missing".to_string()]));
    let out = compact(&emit_stmts(collected));

    assert_eq!(names_const, vec!["later".to_string()]);
    assert!(names_let.is_empty());
    assert!(available.contains("later"));
    assert!(out.contains("_$compiledWithHookId('watchEffect:edge'"), "{out}");
    assert!(out.contains("watchEffect(()=>later)"), "{out}");

    let mut no_return_fn = match parse_expr("function () { const state = ref(0); }", true) {
        Expr::Fn(fn_expr) => fn_expr,
        other => panic!("expected fn expr, got {other:?}"),
    };
    process_function(&mut no_return_fn.function);
    assert!(
        !compact(&emit_expr(Expr::Fn(no_return_fn))).contains("_$compiledWithHookId(\"useSetup")
    );

    let synthetic_arrow = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        ctxt: Default::default(),
        params: Vec::new(),
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: Default::default(),
            stmts: vec![Stmt::Return(ReturnStmt {
                span: DUMMY_SP,
                arg: Some(Box::new(parse_expr("value", false))),
            })],
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: Some(Box::new(TsTypeAnn {
            span: DUMMY_SP,
            type_ann: Box::new(TsType::TsTypeRef(TsTypeRef {
                span: DUMMY_SP,
                type_name: TsEntityName::Ident(Ident::new(
                    "JSX.Element".into(),
                    DUMMY_SP,
                    Default::default(),
                )),
                type_params: None,
            })),
        })),
    });
    let synthetic_decl = VarDeclarator {
        span: DUMMY_SP,
        name: Pat::Ident(BindingIdent {
            id: Ident::new("Synthetic".into(), DUMMY_SP, Default::default()),
            type_ann: None,
        }),
        init: Some(Box::new(synthetic_arrow)),
        definite: false,
    };
    assert!(is_untyped_arrow_component_decl(&synthetic_decl));
}
