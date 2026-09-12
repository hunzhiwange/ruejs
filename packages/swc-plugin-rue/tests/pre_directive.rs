//! SWC plugin transform tests: v-pre / r-pre
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn v_pre_skips_element_and_descendant_pre_transforms() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Demo: FC<{ ok: boolean; show: boolean; msg: string }> = (props) => {
  return (
    <div>
      <section v-pre v-show={props.show}>
        <span v-if={props.ok} v-text="props.msg"></span>
      </section>
      <p v-if={props.ok}>A</p>
      <p v-else>B</p>
    </div>
  )
}

export default Demo
"##;
    let (program, cm) = utils::parse(src, "pre_directive.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    use utils::{normalize, strip_marker};
    let out = strip_marker(&out);
    assert!(out.contains("v-pre"));
    assert!(out.contains("v-show"));
    assert!(out.contains("v-if"));
    assert!(out.contains("v-text"));
    assert!(normalize(&out).contains(normalize("{props.ok ? <p>A</p> : <p>B</p>}").as_str()));
}

#[test]
fn r_pre_breaks_if_chain_on_same_element() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Demo: FC<{ ok: boolean }> = (props) => {
  return (
    <div>
      <p r-pre r-if={props.ok}>raw</p>
      <p r-else>fallback</p>
    </div>
  )
}

export default Demo
"##;
    let (program, cm) = utils::parse(src, "pre_directive_r.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    assert!(out.contains("r-pre"));
    assert!(out.contains("r-if"));
    assert!(out.contains("r-else"));
    assert!(!out.contains("props.ok ?"));
}

#[test]
fn pre_preserves_expression_syntax_without_evaluating_it() {
    use swc_core::ecma::ast::*;
    use swc_core::ecma::visit::{Visit, VisitWith};
    #[derive(Default)]
    struct Expressions {
        text: Vec<String>,
        calls: usize,
    }
    impl Visit for Expressions {
        fn visit_str(&mut self, value: &Str) {
            self.text.push(value.value.to_string_lossy().into_owned());
        }
        fn visit_call_expr(&mut self, call: &CallExpr) {
            if let Callee::Expr(callee) = &call.callee {
                if matches!(callee.as_ref(), Expr::Ident(id) if id.sym == "explode") {
                    self.calls += 1;
                }
            }
            call.visit_children_with(self);
        }
    }
    for directive in ["v-pre", "r-pre"] {
        let src = format!(
            r#"
const Demo = () => <div>
  <section {directive} title={{explode()}}>
    <span>{{phase.value}}</span>
    <>{{explode()}}{{ok ? <b>yes</b> : null}}</>
  </section>
  <p>{{live.value}}</p>
</div>;
"#
        );
        for transform in [
            swc_plugin_rue::apply_pre,
            swc_plugin_rue::apply,
            swc_plugin_rue::apply_server,
            swc_plugin_rue::apply_hydrate,
        ] {
            let (program, cm) = utils::parse(&src, "pre_expressions.tsx");
            let program = transform(program);
            let mut expressions = Expressions::default();
            program.visit_with(&mut expressions);
            assert_eq!(expressions.calls, 0, "pre expressions must not execute");
            assert!(
                expressions.text.iter().any(|s| s.contains("{phase.value}")),
                "{:?}",
                expressions.text
            );
            assert!(
                expressions.text.iter().any(|s| s.contains("{explode()}")),
                "{:?}",
                expressions.text
            );
            assert!(
                expressions.text.iter().any(|s| s.contains("<b>yes</b>")),
                "{:?}",
                expressions.text
            );
            let out = utils::emit(program, cm);
            assert!(out.contains("live.value"), "outside expressions remain reactive: {out}");
        }
    }
}
