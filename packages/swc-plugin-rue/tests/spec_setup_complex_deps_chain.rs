//! SWC 插件转换行为测试（spec_setup_complex_deps_chain）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn collects_dependency_chain_and_skips_after_control() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(1)
  const b = a.value + 1
  const c = b + a.value
  function log() {
    console.log(a.value, b, c)
  }
  if (a.value > 0) {
    const d = a.value + c
  }
  return <div>{c}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"import { ref, computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = ref(1);
            const b = computed(()=>a.value + 1);
            untrack(()=>b.get());
            const __rue_phase2_b = b;
            const c = computed(()=>__rue_phase2_b.get() + a.value);
            untrack(()=>c.get());
            const __rue_phase2_c = c;
            function log() {
                console.log(a.value, __rue_phase2_b.get(), __rue_phase2_c.get());
            }
            if (a.value > 0) {
                const d = a.value + __rue_phase2_c.get();
            }
            return {
                a: a,
                b: b,
                __rue_phase2_b: __rue_phase2_b,
                c: c,
                __rue_phase2_c: __rue_phase2_c,
                log: log
            };
        }));
    const { a: a, b: b, __rue_phase2_b: __rue_phase2_b, c: c, __rue_phase2_c: __rue_phase2_c, log: log } = _$useSetup;
    return <div>{c.get()}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_complex_deps_chain.out.js",
        strip_marker(&out),
    )
    .ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$compiledSetup(\"useSetup:0:0\""), "{normalized}");
    assert!(normalized.contains("const b = computed(()=>a.value + 1)"), "{normalized}");
    assert!(
        normalized.contains("const c = computed(()=>__rue_phase2_b.get() + a.value)"),
        "{normalized}"
    );
    assert!(normalized.contains("const __rue_phase2_b = b"), "{normalized}");
    assert!(normalized.contains("const __rue_phase2_c = c"), "{normalized}");
    assert!(normalized.contains("const d = a.value + __rue_phase2_c.get()"), "{normalized}");
    assert!(normalized.contains("<div>{c.get()}</div>"), "{normalized}");
}
