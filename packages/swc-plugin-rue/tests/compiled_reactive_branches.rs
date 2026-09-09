use swc_plugin_rue::apply;

mod utils;

fn transform(source: &str) -> String {
    let (program, cm) = utils::parse(source, "compiled-reactive-branches.tsx");
    utils::normalize(&utils::strip_marker(&utils::emit(apply(program), cm)))
}

#[test]
fn lowers_proven_nested_reactive_conditions_to_compiled_branch() {
    let output = transform(
        r#"
import { type FC, ref } from '@rue-js/rue';

const visible = ref(true);
const label = ref('ready');

export const View: FC = () => (
  <div>
    {visible.value ? <span>{label.value}</span> : <strong>hidden</strong>}
    {visible.value && <i>shown</i>}
    {visible.value ? <em>active</em> : null}
  </div>
);
"#,
    );

    let vapor_import = output
        .split(';')
        .find(|statement| statement.contains("@rue-js/rue/internal"))
        .expect("compiled reactive branches must use the Vapor graph");
    assert!(vapor_import.contains("_$compiledBranchAt"), "{output}");
    assert!(vapor_import.contains("_$compiledRoot"), "{output}");
    assert!(output.matches("_$compiledBranchAt(").count() >= 3, "{output}");
    assert!(
        output.contains("if (visible.value) return { __rue_compiled_branch_key: true"),
        "{output}"
    );
    assert!(output.contains("label.value"), "{output}");
    assert!(!output.contains("watchEffect"), "{output}");
    assert!(!output.contains("const __slot=visible.value"), "{output}");
}

#[test]
fn preserves_logical_falsy_and_opaque_branch_fallbacks() {
    let output = transform(
        r#"
import { type FC, ref } from '@rue-js/rue';

declare function renderNode(): Node;
const count = ref(0);
const maybe = ref<string | null>(null);

export const View: FC = () => (
  <div>
    {count.value && <span>positive</span>}
    {maybe.value ?? <b>fallback</b>}
    {count.value ? <i>safe</i> : renderNode()}
  </div>
);
"#,
    );

    assert!(output.matches("_$compiledBranchAt(").count() >= 2, "{output}");
    assert!(output.contains("typeof __rue_branch_value === \"number\""), "{output}");
    assert!(output.contains("_$compiledCreateTextNode(typeof __rue_branch_value"), "{output}");
    assert!(output.contains("? __rue_branch_value : \"\""), "{output}");
    assert!(output.contains("__rue_branch_value != null"), "{output}");
    assert!(output.contains("renderNode()"), "{output}");
    assert!(output.contains("effect"), "{output}");
    assert!(!output.contains("watchEffect"), "{output}");
    assert!(output.contains("untrack(()=>renderAnchor(__slot"), "{output}");
}

#[test]
fn lowers_component_props_condition_to_compiled_branch() {
    let output = transform(
        r#"
import { type FC } from '@rue-js/rue';

type Props = { videos: Array<{ title: string }>; emptyHeading?: string };

export const VideoList: FC<Props> = p => (
  <div>
    {p.videos.length === 0
      ? <span>{p.emptyHeading || 'empty'}</span>
      : <ul>{p.videos.map((video, index) => <li key={index}>{video.title}</li>)}</ul>}
  </div>
);
"#,
    );

    assert!(output.contains("_$compiledBranchAt("), "{output}");
    assert!(output.contains("if (_$compiledPropsGet(p, \"videos\").length === 0)"), "{output}");
    assert!(output.contains("_$reconcileKeyedSingle("), "{output}");
    assert!(!output.contains("watchEffect"), "{output}");
    assert!(!output.contains("untrack(()=>renderAnchor"), "{output}");
}
