use swc_plugin_rue::{apply, apply_pre};

mod utils;

#[test]
fn dedupes_use_setup_hook_ids_across_components_in_same_module() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const LightSignal: FC<{ label?: string }> = props => {
  const label = String(props.label ?? 'Light DOM signal')
  return <div>{label}</div>
}

const ShadowConsole: FC<{ title?: string }> = props => {
  const title = String(props.title ?? 'Shadow console')
  return <article>{title}</article>
}

const Page: FC = () => {
  const headline = 'Web Components'
  return (
    <section>
      <h1>{headline}</h1>
      <LightSignal label="demo" />
      <ShadowConsole title="ops" />
    </section>
  )
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let stripped = utils::strip_marker(&out);
    let normalized = utils::normalize(&stripped);
    assert_eq!(stripped.matches("\"useSetup:0:0\"").count(), 3);
    assert!(
        normalized.contains("_$compiledSetup(\"useSetup:0:0\"")
            || normalized.contains("_$compiledWithHookId(\"useSetup:0:0\"")
    );
    assert!(!stripped.contains("\"useSetup:0:0:dup1\""));
    assert!(!stripped.contains("\"useSetup:0:0:dup2\""));
}

#[test]
fn web_components_page_does_not_emit_removed_render_anchor_helper() {
    let src = include_str!("../../../app/pages/examples/WebComponents.tsx");
    let (program, cm) = utils::parse(src, "WebComponents.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    assert!(!out.contains("renderAnchor"), "{out}");
    assert!(out.contains("_$mountCompiledSlotAt"), "{out}");
    assert!(out.contains("_$createComponent(BridgeContextProvider"), "{out}");
}
