use swc_plugin_rue::apply_with_transform_options;

mod utils;

#[test]
fn lowers_children_slot_to_render_anchor() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Layout: FC = props => <article>{props.children}</article>
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_with_transform_options(program, false, true);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("rue:children:anchor")));
    assert!(out.contains(&utils::normalize("renderAnchor(__vnode")));
    assert!(!out.contains(&utils::normalize("rue:children:start")));
}

#[test]
fn lowers_conditional_slot_to_render_anchor() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Page: FC<{ ok: boolean }> = props => <section><div>{props.ok ? <span>yes</span> : ''}</div></section>
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_with_transform_options(program, false, true);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("rue:slot:anchor")));
    assert!(out.contains(&utils::normalize("renderAnchor(__vnode")));
    assert!(!out.contains(&utils::normalize("renderBetween(__vnode")));
}
