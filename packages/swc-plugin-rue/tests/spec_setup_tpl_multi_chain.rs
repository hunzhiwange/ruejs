//! SWC 插件转换行为测试（spec_setup_tpl_multi_chain）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn nested_template_with_multiple_dependency_chains() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(1)
  const b = a.value + 2
  const c = b * 3
  const t = `a=${a.value}-${a.value > 0 ? `b=${b}-${b > 3 ? `c=${c}` : 'lo'}` : 'none'}`
  return <div>{t}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"import { ref, computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = ref(1);
            const b = computed(()=>a.value + 2);
            untrack(()=>b.get());
            const __rue_phase2_b = b;
            const c = computed(()=>__rue_phase2_b.get() * 3);
            untrack(()=>c.get());
            const __rue_phase2_c = c;
            const t = computed(()=>`a=${a.value}-${a.value > 0 ? `b=${__rue_phase2_b.get()}-${__rue_phase2_b.get() > 3 ? `c=${__rue_phase2_c.get()}` : 'lo'}` : 'none'}`);
            untrack(()=>t.get());
            const __rue_phase2_t = t;
            return {
                a: a,
                b: b,
                __rue_phase2_b: __rue_phase2_b,
                c: c,
                __rue_phase2_c: __rue_phase2_c,
                t: t,
                __rue_phase2_t: __rue_phase2_t
            };
        }));
    const { a: a, b: b, __rue_phase2_b: __rue_phase2_b, c: c, __rue_phase2_c: __rue_phase2_c, t: t, __rue_phase2_t: __rue_phase2_t } = _$useSetup;
    return <div>{t.get()}</div>;
};
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_on_setup_tpl_multi_chain.out.js", strip_marker(&out))
        .ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
