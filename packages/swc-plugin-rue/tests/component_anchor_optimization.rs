use swc_plugin_rue::apply_with_transform_options;

mod utils;

#[test]
fn lowers_dynamic_component_element_to_render_anchor() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Code: FC<{ code: string }> = props => <div>{props.code}</div>

const Page: FC<{ code: string }> = props => (
  <section>
    <Code code={props.code} />
  </section>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_with_transform_options(program, false, true);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("renderAnchor(__slot")));
    assert!(out.contains(&utils::normalize("rue:component:anchor")));
    assert!(!out.contains("renderBetween(__slot"));
}

#[test]
fn lowers_dynamic_component_root_to_render_anchor() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Code: FC<{ code: string }> = props => <div>{props.code}</div>

const Page: FC<{ code: string }> = props => <Code code={props.code} />
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_with_transform_options(program, false, true);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("renderAnchor(__slot")));
    assert!(out.contains(&utils::normalize("rue:component:anchor")));
    assert!(!out.contains("renderBetween(__slot"));
}

#[test]
fn does_not_lower_static_component_to_render_static_when_component_anchors_enabled() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Hello: FC = () => <div>Hello</div>;

const Page: FC<{ show: boolean }> = props => (
  <section>
    {props.show ? <Hello /> : null}
  </section>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_with_transform_options(program, true, true);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("renderAnchor(__slot")));
    assert!(out.contains(&utils::normalize("rue:component:anchor")));
    assert!(!out.contains("rue:static:component"));
    assert!(!out.contains(&utils::normalize("renderStatic(__slot")));
}

#[test]
fn treats_jsx_member_expression_as_component() {
    let src = r##"
import { type FC } from '@rue-js/rue';

declare const Collapse: any;

const Page: FC = () => (
  <section>
    <Collapse.Title className="font-semibold">Hello</Collapse.Title>
  </section>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_with_transform_options(program, false, true);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize(
        "<Collapse.Title className=\"font-semibold\" children={__child1}/>"
    )));
    assert!(out.contains(&utils::normalize("renderAnchor(__slot")));
    assert!(out.contains(&utils::normalize("rue:component:anchor")));
}
