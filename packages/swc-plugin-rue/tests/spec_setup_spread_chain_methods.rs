//! SWC 插件转换行为测试（spec_setup_spread_chain_methods）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn deep_spread_chain_with_object_methods_and_arrows() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(1)
  const b = a.value + 2
  const base = { k: 'v' }
  const extra = { z: () => a.value + b }
  const arr0 = [a.value, b]
  const obj = {
    ...base,
    ...extra,
    arr: [...arr0, () => a.value > 0 ? b : a.value],
    meth() { return a.value + b }
  }
  return <div>{obj.meth()}-{obj.arr[2]()}-{obj.z()}</div>
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
        const b = a.value + 2;
        const base = {
            k: 'v'
        };
        const extra = {
            z: ()=>a.value + b
        };
        const arr0 = [
            a.value,
            b
        ];
        const obj = {
            ...base,
            ...extra,
            arr: [
                ...arr0,
                ()=>a.value > 0 ? b : a.value
            ],
            meth () {
                return a.value + b;
            }
        };
        return {
            a: a,
            b: b,
            base: base,
            extra: extra,
            arr0: arr0,
            obj: obj
        };
    }));
    const { a: a, b: b, base: base, extra: extra, arr0: arr0, obj: obj } = _$useSetup;
    return <div>{obj.meth()}-{obj.arr[2]()}-{obj.z()}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_spread_chain_methods.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
