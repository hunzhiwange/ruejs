use swc_plugin_rue::apply;

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
    let program = apply(program);
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
    let program = apply(program);
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
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("renderAnchor(__slot")));
    assert!(out.contains(&utils::normalize("rue:component:anchor")));
    assert!(!out.contains("rue:static:component"));
    assert!(!out.contains("renderStatic"));
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
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize(
        "<Collapse.Title className=\"font-semibold\" children={__child1}/>"
    )));
    assert!(out.contains(&utils::normalize("renderAnchor(__slot")));
    assert!(out.contains(&utils::normalize("rue:component:anchor")));
}

#[test]
fn keeps_transition_group_children_on_component_root() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const TransitionGroup: FC<{ children?: any }> = props => <div>{props.children}</div>

const Page: FC<{ items: string[] }> = props => (
  <TransitionGroup>
    {props.items.map(item => <span key={item}>{item}</span>)}
  </TransitionGroup>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("<TransitionGroup children={props.items.map")));
    assert!(out.contains("props.items.map"));
    assert!(out.contains("_$vaporWithKey"));
    assert!(out.contains("_$createElement(\"span\")"));
    assert!(out.contains(&utils::normalize("renderAnchor(__slot")));
    assert!(!out.contains("const __child1"));
    assert!(!out.contains("children={__child1}"));
}

#[test]
fn keeps_transition_group_children_without_keepjsx() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const TransitionGroup: FC<{ children?: any }> = props => <div>{props.children}</div>

const Page: FC<{ items: string[] }> = props => (
  <TransitionGroup>
    {props.items.map(item => <span key={item}>{item}</span>)}
  </TransitionGroup>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("<TransitionGroup children={props.items.map")));
    assert!(out.contains("props.items.map"));
    assert!(out.contains("_$vaporWithKey"));
    assert!(out.contains("_$createElement(\"span\")"));
    assert!(out.contains(&utils::normalize("renderAnchor(__slot")));
    assert!(!out.contains("const __child1"));
    assert!(!out.contains("children={__child1}"));
}

#[test]
fn passes_single_member_expression_child_through_component_children_prop() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const IconHost: FC<{ children?: any }> = props => <div>{props.children}</div>

const icons = [
  {
    node: (
      <svg viewBox="0 0 20 20">
        <path d="M10 18a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
    ),
  },
]

const Page: FC = () => (
  <IconHost>{icons[0].node}</IconHost>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("const __child1 = icons[0].node;")));
    assert!(out.contains(&utils::normalize("<IconHost children={__child1}/>")));
    assert!(!out.contains(&utils::normalize("_$settextContent(_el2, icons[0].node);")));
}
