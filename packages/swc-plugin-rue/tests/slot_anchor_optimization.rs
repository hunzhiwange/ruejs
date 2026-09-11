use swc_plugin_rue::apply;

mod utils;

#[test]
fn lowers_children_slot_to_compiled_slot_mount() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Layout: FC = props => <article>{props.children}</article>
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("rue:text-hole:0")));
    assert!(!out.contains(&utils::normalize("_$compiledText(")));
    assert!(out.contains(&utils::normalize("_$mountCompiledSlotAt(")), "{out}");
    assert!(
        out.contains(&utils::normalize(
            "()=>_$compiledValueFactory(_$compiledPropsGet(props, \"children\"))"
        )),
        "{out}"
    );
    assert!(!out.contains("renderAnchor"), "{out}");
    assert!(!out.contains(&utils::normalize("rue:children:start")));
}

#[test]
fn lowers_conditional_slot_to_render_anchor() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Page: FC<{ ok: boolean }> = props => <section><div>{props.ok ? <span>yes</span> : ''}</div></section>
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("rue:text-hole:0")));
    assert!(out.contains(&utils::normalize("_$compiledBranchAt(")));
    assert!(out.contains(&utils::normalize("if (_$compiledPropsGet(props, \"ok\")) return")));
    assert!(!out.contains("renderAnchor"));
    assert!(!out.contains(&utils::normalize("renderBetween(__slot")));
}

#[test]
fn reuses_tail_and_static_sibling_boundaries_for_non_empty_compiled_branches() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Tail: FC<{ ok: boolean }> = props => (
  <section>{props.ok ? <b>yes</b> : <i>no</i>}</section>
);
const BeforeStatic: FC<{ ok: boolean }> = props => (
  <section>{props.ok ? <b>yes</b> : <i>no</i>}<footer>stable</footer></section>
);
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert_eq!(out.matches(&utils::normalize("rue:text-hole:")).count(), 0, "{out}");
    assert!(out.contains(&utils::normalize(", null, ()=>")), "{out}");
    assert!(out.contains(&utils::normalize(", _root.childNodes[0], ()=>")), "{out}");
}

#[test]
fn reuses_a_static_successor_for_compiled_slots_but_keeps_unsafe_holes() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const SlotBeforeStatic: FC = props => (
  <article>{props.children}<footer>stable</footer></article>
);
const Nullable: FC<{ ok: boolean }> = props => <div>{props.ok && <b>maybe</b>}</div>;
const Multiple: FC<{ ok: boolean }> = props => (
  <div>{props.ok ? <><b>one</b><i>two</i></> : <><em>three</em><u>four</u></>}</div>
);
const Adjacent: FC<{ a: boolean; b: boolean }> = props => (
  <div>{props.a ? <b>a</b> : <i>A</i>}{props.b ? <em>b</em> : <u>B</u>}</div>
);
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(
        out.contains(&utils::normalize("before: _root.childNodes[0]")),
        "compiled slot should target the stable footer: {out}"
    );
    // Nullable and multi-root share one interned skeleton; the adjacent case owns two holes.
    assert_eq!(out.matches(&utils::normalize("rue:text-hole:")).count(), 3, "{out}");
}
