//! SWC 插件转换行为测试（spec_setup_tpl_cond）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn collects_tpl_and_conditional_expressions_when_pure() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(0)
  const t = `n=${a.value}-${a.value > 0 ? 'x' : 'y'}`
  return <div>{t}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"import { computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
import { type FC, ref } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = ref(0);
            const t = computed(()=>`n=${a.value}-${a.value > 0 ? 'x' : 'y'}`);
            untrack(()=>t.get());
            const __rue_phase2_t = t;
            return {
                a: a,
                t: t,
                __rue_phase2_t: __rue_phase2_t
            };
        }));
    const { a: a, t: t, __rue_phase2_t: __rue_phase2_t } = _$useSetup;
    return <div>{t.get()}</div>;
};
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_on_setup_tpl_cond.out.js", strip_marker(&out)).ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
