//! SWC 插件转换行为测试（spec_setup_object_array_nested）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn collects_object_and_array_literals_with_nested_dependencies() {
    let src = r##"
import { type FC, ref } from 'rue-js'

const Comp: FC = () => {
  const a = ref(0)
  const obj = { x: a.value, arr: [a.value, 1, { deep: a.value }] }
  return <div>{obj.arr[0]}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup } from 'rue-js';
const Comp: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(0));
        const obj = {
            x: a.value,
            arr: [
                a.value,
                1,
                {
                    deep: a.value
                }
            ]
        };
        return {
            a: a,
            obj: obj
        };
    }));
    const { a: a, obj: obj } = _$useSetup;
    return <div>{obj.arr[0]}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_object_array_nested.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
