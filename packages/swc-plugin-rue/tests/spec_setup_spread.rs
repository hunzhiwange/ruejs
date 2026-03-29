//! SWC 插件转换行为测试（spec_setup_spread）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn collects_object_and_array_with_spreads_when_deps_available() {
    let src = r##"
import { type FC, ref } from 'rue-js'

const Comp: FC = () => {
  const extra = { y: 2 }
  const arr0 = [1]
  const a = ref(0)
  const obj = { ...extra, x: a.value }
  const arr = [...arr0, a.value]
  return <div>{arr[1]}-{obj.x}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup } from 'rue-js';
const Comp: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const extra = {
            y: 2
        };
        const arr0 = [
            1
        ];
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(0));
        const obj = {
            ...extra,
            x: a.value
        };
        const arr = [
            ...arr0,
            a.value
        ];
        return {
            extra: extra,
            arr0: arr0,
            a: a,
            obj: obj,
            arr: arr
        };
    }));
    const { extra: extra, arr0: arr0, a: a, obj: obj, arr: arr } = _$useSetup;
    return <div>{arr[1]}-{obj.x}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_on_setup_spread.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
