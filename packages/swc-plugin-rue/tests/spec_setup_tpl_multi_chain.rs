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

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(1));
        const b = a.value + 2;
        const c = b * 3;
        const t = `a=${a.value}-${a.value > 0 ? `b=${b}-${b > 3 ? `c=${c}` : 'lo'}` : 'none'}`;
        return {
            a: a,
            b: b,
            c: c,
            t: t
        };
    }));
    const { a: a, b: b, c: c, t: t } = _$useSetup;
    return <div>{t}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_on_setup_tpl_multi_chain.out.js", strip_marker(&out))
        .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
