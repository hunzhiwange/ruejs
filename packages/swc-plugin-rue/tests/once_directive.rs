//! SWC plugin transform tests: v-once / r-once
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_once_directives_to_empty_dep_memo() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const OnceDemo: FC = () => {
  const msg = ref('initial')
  const alt = ref('fallback')
  return (
    <div>
      <span v-once>{msg.value}</span>
      <strong r-once>{alt.value}</strong>
    </div>
  )
}

export default OnceDemo
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/once_directive.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("@rue-js/rue/internal/reactive"), "{normalized}");
    assert!(normalized.contains("_$compiledSetup(\"useSetup:0:0\""), "{normalized}");
    assert_eq!(normalized.matches("_$compiledMemo(\"memo:").count(), 2);
    assert!(!normalized.contains("useMemo"));
    assert!(!normalized.contains("v-once"));
    assert!(!normalized.contains("r-once"));
}

#[test]
fn transforms_once_directive_inside_if_chain() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Chain: FC<{ ok: boolean; msg: string; fallback: string }> = (props) => {
  return (
    <div>
      <span v-if={props.ok} v-once>{props.msg}</span>
      <span r-else r-once>{props.fallback}</span>
    </div>
  )
}

export default Chain
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/once_if_directive.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("@rue-js/rue/internal/reactive"), "{normalized}");
    assert!(normalized.contains("props.ok ? _$compiledMemo"), "{normalized}");
    assert_eq!(normalized.matches("_$compiledMemo(\"memo:").count(), 2);
    assert!(!normalized.contains("useMemo"));
    assert!(!normalized.contains("v-once"));
    assert!(!normalized.contains("r-once"));
}
