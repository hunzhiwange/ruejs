use swc_plugin_rue::apply;

mod utils;

#[test]
fn does_not_auto_inject_signal_user_api() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const count = signal(0);

const Demo: FC = () => <div>{count.value}</div>;
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::strip_marker(&utils::emit(program, cm));
    let normalized = utils::normalize(&out);

    assert!(normalized.contains("signal(0)"));
    assert!(!normalized.contains(&utils::normalize(", signal } from '@rue-js/rue'")));
    assert!(!normalized.contains(&utils::normalize(" signal, ")));
}

#[test]
fn does_not_auto_inject_h_user_api() {
    let src = r##"
const node = h('div', null, 'hello');
"##;

    let (program, cm) = utils::parse(src, "h-test.tsx");
    let program = apply(program);
    let out = utils::strip_marker(&utils::emit(program, cm));
    let normalized = utils::normalize(&out);

    assert!(normalized.contains(&utils::normalize("const node = h('div', null, 'hello');")));
    assert!(!normalized.contains(&utils::normalize("import { h } from '@rue-js/rue';")));
    assert!(!normalized.contains(&utils::normalize(", h } from '@rue-js/rue'")));
}
