//! SWC 插件转换行为测试（spec20）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec20() {
    let src = r##"
import { type FC, ref } from 'rue-js'

const Chain: FC = () => {
  const a = ref(true);
  const b = ref(false);
  const c = ref(false);
  const d = ref(false);
  return (
    <div>
      <div if={a}>A</div>
      <div elif={b}>B</div>
      <div elif={c}>C</div>
      <div elseIf={d}>D</div>
      <div else>Else</div>
    </div>
  )
}

export default Chain
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup } from 'rue-js';
const Chain: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(true));
        const b = _$vaporWithHookId("ref:1:1", ()=>ref(false));
        const c = _$vaporWithHookId("ref:1:2", ()=>ref(false));
        const d = _$vaporWithHookId("ref:1:3", ()=>ref(false));
        return {
            a: a,
            b: b,
            c: c,
            d: d
        };
    }));
    const { a: a, b: b, c: c, d: d } = _$useSetup;
    return (<div>
      {a ? <div>A</div> : b ? <div>B</div> : c ? <div>C</div> : d ? <div>D</div> : <div>Else</div>}</div>);
};
export default Chain;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec20.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
