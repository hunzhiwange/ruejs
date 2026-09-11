use super::*;
use std::sync::Arc;
use swc_core::common::{DUMMY_SP, FileName, SourceMap};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_core::ecma::visit::VisitMutWith;
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn parse_module(src: &str) -> (Module, Arc<SourceMap>) {
    let cm = Arc::new(SourceMap::default());
    let fm =
        cm.new_source_file(FileName::Custom("transform-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    (parser.parse_module().expect("parse module"), cm)
}

fn parse_expr(src: &str) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm =
        cm.new_source_file(FileName::Custom("transform-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse expr")
}

fn emit_module(module: &Module, cm: Arc<SourceMap>) -> String {
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&Program::Module(module.clone())).expect("emit module");
    String::from_utf8(buf).expect("utf8")
}

fn emit_expr(expr: &Expr) -> String {
    let cm = Arc::new(SourceMap::default());
    let module = Module {
        span: DUMMY_SP,
        body: vec![ModuleItem::Stmt(Stmt::Expr(ExprStmt {
            span: DUMMY_SP,
            expr: Box::new(expr.clone()),
        }))],
        shebang: None,
    };
    emit_module(&module, cm)
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
fn wraps_hook_calls_without_module_scope_and_leaves_member_calls_alone() {
    let mut expr = parse_expr("useState(0)");
    expr.visit_mut_with(&mut PreTransform::default());
    let out = normalize(&emit_expr(&expr));

    assert!(out.contains("_$compiledWithHookId"));
    assert!(out.contains("\"useState:0:0\""));
    assert!(out.contains("()=>useState(0)"));

    let mut member_expr = parse_expr("hooks.useState(0)");
    member_expr.visit_mut_with(&mut PreTransform::default());
    let member_out = normalize(&emit_expr(&member_expr));

    assert!(!member_out.contains("_$compiledWithHookId"));
    assert!(member_out.contains("hooks.useState(0)"));

    let mut super_call = CallExpr {
        span: DUMMY_SP,
        ctxt: Default::default(),
        callee: Callee::Super(Super { span: DUMMY_SP }),
        args: vec![],
        type_args: None,
    };
    super_call.visit_mut_with(&mut PreTransform::default());
    assert!(matches!(super_call.callee, Callee::Super(_)));
}

#[test]
fn module_transform_handles_non_components_pre_short_circuit_and_once_exprs() {
    let src = r#"
function helper() {
  const count = ref(0);
  return count.value;
}

declare function Declared(): JSX.Element;
const Mixed = () => <main />, untouched = 1;
const deep = shallowReadonly(source);
const invoked = factory()(value);
const preserved = <div v-pre><span v-show={ok}>{value}</span></div>;
const once = <section v-once className="x" />;
const plain = hooks.useState(0);
"#;
    let (mut module, cm) = parse_module(src);

    module.visit_mut_with(&mut PreTransform::default());
    let out = normalize(&emit_module(&module, cm));

    assert!(out.contains("_$compiledWithHookId"));
    assert!(out.contains("\"ref:"));
    assert!(out.contains("\"shallowReadonly:"));
    assert!(out.contains("factory()(value)"));
    assert!(out.contains("_$compiledMemo"));
    assert!(!out.contains("useMemo"));
    assert!(out.contains("v-pre"));
    assert!(out.contains("v-show"));
    assert!(out.contains("hooks.useState(0)"));
}

#[test]
fn hook_id_deduper_ignores_malformed_calls_and_suffixes_duplicates() {
    let src = r#"
_$compiledWithHookId();
_$compiledWithHookId(id, () => ref(0));
_$compiledWithHookId("same", () => ref(1));
_$compiledWithHookId("same", () => ref(2));
(factory())();
"#;
    let (mut module, cm) = parse_module(src);

    module.visit_mut_with(&mut HookIdDeduper::default());
    let out = normalize(&emit_module(&module, cm));

    assert!(out.contains("_$compiledWithHookId()"));
    assert!(out.contains("_$compiledWithHookId(id"));
    assert!(out.contains("\"same\""));
    assert!(out.contains("\"same:dup1\""));
    assert!(out.contains("factory"));

    let mut super_call = CallExpr {
        span: DUMMY_SP,
        ctxt: Default::default(),
        callee: Callee::Super(Super { span: DUMMY_SP }),
        args: vec![],
        type_args: None,
    };
    super_call.visit_mut_with(&mut HookIdDeduper::default());
    assert!(matches!(super_call.callee, Callee::Super(_)));
}

#[test]
fn setup_render_control_never_injects_component_render_markers() {
    let src = r#"
const Plain: FC = () => {
  return _$compiledRoot(() => <input value={label.get()} />)
}
const DynamicComponentRoot: FC = () => {
  const active = ref('a')
  return <Tabs activeKey={active.value} />
}
const ConciseDynamicRoot = () => <Tabs activeKey={active.value} />
const ConciseDynamicChildren = () => (
  <Rating><Rating.Item checked={score.value === 1} /></Rating>
)
const ConciseNativeChildren = () => (
  <Card><div><Rating.Item checked={score.value === 1} /></div></Card>
)
const EarlyReturn: FC = () => {
  if (active.get()) return <input value="active" />
  return <input value="idle" />
}
const AssignedBranch: FC = () => {
  let view
  if (active.get()) view = <p>active</p>
  else view = <p>idle</p>
  return view
}
function FunctionBranch(): JSX.Element {
  if (active.get()) return <strong>active</strong>
  return <strong>idle</strong>
}
"#;
    let (mut module, cm) = parse_module(src);

    module.visit_mut_with(&mut PreTransform::default());
    let out = normalize(&emit_module(&module, cm));

    assert!(!out.contains("_$compiledMarkComponentRenderReactive"), "{out}");
    assert!(out.contains("_$compiledSetup"), "{out}");
    assert!(out.contains("return <Tabs"), "{out}");
}

#[test]
fn keeps_custom_composables_in_the_reactive_render_phase() {
    let src = r#"
const useLocale = () => {
  const context = useContext(LocaleContext)
  return context
}

const LocaleReader: FC = () => {
  const { locale, translate } = useLocale()
  const currentLocale = locale.value
  return <p>{translate('hello', currentLocale)}</p>
}
"#;
    let (mut module, cm) = parse_module(src);

    module.visit_mut_with(&mut PreTransform::default());
    let out = normalize(&emit_module(&module, cm));

    assert!(out.contains("const LocaleReader: FC = ()=>"), "{out}");
    assert!(out.contains("const { locale, translate } = useLocale();"), "{out}");
    assert!(!out.contains("useSetup(()=>{ const { locale, translate } = useLocale();"), "{out}");
    assert!(
        !out.contains("_$compiledMarkComponentRenderReactive(()=>{ const context = useContext"),
        "custom composables must not be wrapped as component render functions: {out}"
    );
}

#[test]
fn preserves_destructured_list_callback_params_inside_components() {
    let src = r#"
const Tree: FC<{ rows: Row[]; enabled: boolean }> = ({ rows, enabled }) => {
  return <div>{rows.map(({ node }) => <Row node={node} enabled={enabled} />)}</div>
}
"#;
    let (mut module, cm) = parse_module(src);

    module.visit_mut_with(&mut PreTransform::default());
    let out = normalize(&emit_module(&module, cm));

    assert!(out.contains("rows.map(({ node })=>"), "{out}");
    assert!(out.contains("enabled={__rue_props.enabled}"), "{out}");
    assert!(!out.contains("rows.map((__rue_props)=>"), "{out}");
}
