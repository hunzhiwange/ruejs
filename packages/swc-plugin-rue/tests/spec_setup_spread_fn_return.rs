//! SWC 插件转换行为测试（spec_setup_spread_fn_return）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn spread_of_function_returned_objects_and_arrays_are_collected() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(1)
  function build() {
    return { x: a.value, nested: [a.value, { y: a.value }] }
  }
  const obj = { ...build(), y: a.value }
  const arr = [...build().nested, a.value]
  return <div>{obj.y}-{arr[2]}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { _$vaporWithHookId, useSetup } from "@rue-js/rue/vapor";
import { type FC, ref } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(1));
        function build() {
            return {
                x: a.value,
                nested: [
                    a.value,
                    {
                        y: a.value
                    }
                ]
            };
        }
        const obj = {
            ...build(),
            y: a.value
        };
        const arr = [
            ...build().nested,
            a.value
        ];
        return {
            a: a,
            build: build,
            obj: obj,
            arr: arr
        };
    }));
    const { a: a, build: build, obj: obj, arr: arr } = _$useSetup;
    return <div>{obj.y}-{arr[2]}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_spread_fn_return.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
