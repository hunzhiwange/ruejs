//! SWC 插件转换行为测试（spec_setup_spread_fn_return_complex）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn spread_fn_return_with_nested_tpl_and_conditional() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(1)
  function build() {
    return {
      x: a.value,
      nested: [a.value, { y: a.value, label: `n=${a.value}-${a.value > 0 ? 'x' : 'y'}` }],
      flag: a.value > 0 ? 'ok' : 'no'
    }
  }
  const obj = { ...build(), z: a.value }
  const arr = [...build().nested, a.value > 0 ? 't' : 'f']
  return <div>{obj.z}-{arr[2]}</div>
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
        function build() {
            return {
                x: a.value,
                nested: [
                    a.value,
                    {
                        y: a.value,
                        label: `n=${a.value}-${a.value > 0 ? 'x' : 'y'}`
                    }
                ],
                flag: a.value > 0 ? 'ok' : 'no'
            };
        }
        const obj = {
            ...build(),
            z: a.value
        };
        const arr = [
            ...build().nested,
            a.value > 0 ? 't' : 'f'
        ];
        return {
            a: a,
            build: build,
            obj: obj,
            arr: arr
        };
    }));
    const { a: a, build: build, obj: obj, arr: arr } = _$useSetup;
    return <div>{obj.z}-{arr[2]}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_spread_fn_return_complex.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
