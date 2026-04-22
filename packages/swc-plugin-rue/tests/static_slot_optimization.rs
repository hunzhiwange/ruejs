use swc_plugin_rue::apply_with_options;

mod utils;

fn transform(src: &str) -> String {
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_with_options(program, true);
    utils::strip_marker(&utils::emit(program, cm))
}

#[test]
fn optimizes_static_root_component_to_render_static() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Hello: FC = () => <div>Hello</div>;
const Page: FC = () => <Hello />;

export default Page;
"##;

    let out = utils::normalize(&transform(src));

    assert!(out.contains("rue:static:component"));
    assert!(out.contains(&utils::normalize("renderStatic(__slot")));
    assert!(!out.contains("rue:component:start"));
    assert!(!out.contains("renderBetween("));
}

#[test]
fn optimizes_nested_static_component_to_render_static() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Hello: FC = () => <div>Hello</div>;
const Page: FC = () => (
  <div>
    <Hello />
  </div>
);

export default Page;
"##;

    let out = utils::normalize(&transform(src));

    assert!(out.contains("rue:static:component"));
    assert!(out.contains(&utils::normalize("renderStatic(__slot")));
    assert!(!out.contains("rue:component:start"));
    assert!(!out.contains("renderBetween("));
}

#[test]
fn optimizes_static_jsx_expr_slot_to_render_static() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Hello: FC = () => <div>Hello</div>;
const Page: FC = () => <div>{<Hello />}</div>;

export default Page;
"##;

    let out = utils::normalize(&transform(src));

    assert!(out.contains("rue:static:slot"));
    assert!(out.contains(&utils::normalize("renderStatic(_$vaporCreateVNode(__slot")));
    assert!(!out.contains("watchEffect(()"));
    assert!(!out.contains("renderBetween("));
}
