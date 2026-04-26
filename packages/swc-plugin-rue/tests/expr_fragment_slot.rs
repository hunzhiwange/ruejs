use swc_plugin_rue::apply;

mod utils;

fn compile(src: &str, name: &str) -> String {
    let (program, cm) = utils::parse(src, &format!("{name}.tsx"));
    let program = apply(program);
    let out = utils::emit(program, cm);

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(format!("target/vapor_outputs/{name}.out.js"), utils::strip_marker(&out)).ok();

    utils::normalize(&utils::strip_marker(&out))
}

#[test]
fn lowers_bare_fragment_expression_container_to_slot_render() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Demo: FC<{ label: string }> = props => (
  <div>{<><span>{props.label}</span></>}</div>
)
"##;

    let out = compile(src, "expr_fragment_slot_bare");

    assert!(out.contains(&utils::normalize("const __slot = vapor(()=>{")));
    assert!(out.contains(&utils::normalize("renderAnchor(__slot, _root, _list1);")));
    assert!(out.contains(&utils::normalize("const _el1 = _$createElement(\"span\");")));
}

#[test]
fn lowers_conditional_fragment_branches_to_slot_render() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Demo: FC<{ ok: boolean; label: string }> = props => (
  <div>{props.ok ? <><span>{props.label}</span></> : <><em>fallback</em></>}</div>
)
"##;

    let out = compile(src, "expr_fragment_slot_conditional");

    assert!(out.contains(&utils::normalize("const __slot = props.ok ? vapor(()=>{")));
    assert!(out.contains(&utils::normalize("const _el1 = _$createElement(\"span\");")));
    assert!(out.contains(&utils::normalize("_$createElement(\"em\")")));
    assert!(out.contains(&utils::normalize("renderAnchor(__slot, _root, _list1);")));
}

#[test]
fn lowers_logical_and_fragment_rhs_to_slot_render() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Demo: FC<{ ok: boolean; label: string }> = props => (
  <div>{props.ok && <><span>{props.label}</span></>}</div>
)
"##;

    let out = compile(src, "expr_fragment_slot_logical_and");

    assert!(out.contains(&utils::normalize("const __slot = props.ok ? vapor(()=>{")));
    assert!(out.contains(&utils::normalize(": \"\";")));
    assert!(out.contains(&utils::normalize("renderAnchor(__slot, _root, _list1);")));
}
