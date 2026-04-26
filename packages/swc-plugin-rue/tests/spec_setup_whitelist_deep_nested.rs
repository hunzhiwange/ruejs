use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn deep_nested_whitelist_calls_with_complex_params_and_nonpure_neighbors() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(0)
  const info = { x: a.value, arr: [a.value, `t=${a.value}`] }
  watchEffect(() => {
    console.log('tick', info.x, info.arr[0])
    onBeforeUnmount(() => watchEffect(() => console.log('cleanup', a.value)))
  })
  const assign = Object.assign(window as any, { a })
  return <div>{info.arr[1]}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { onBeforeUnmount, watchEffect, _$vaporWithHookId, useSetup } from "@rue-js/rue/vapor";
import { type FC, ref } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(0));
        const info = {
            x: a.value,
            arr: [
                a.value,
                `t=${a.value}`
            ]
        };
        _$vaporWithHookId("watchEffect:1:2", ()=>watchEffect(()=>{
                console.log('tick', info.x, info.arr[0]);
                onBeforeUnmount(()=>_$vaporWithHookId("watchEffect:1:1", ()=>watchEffect(()=>console.log('cleanup', a.value))));
            }));
        const assign = Object.assign(window as any, {
            a
        });
        return {
            a: a,
            info: info,
            assign: assign
        };
    }));
    const { a: a, info: info, assign: assign } = _$useSetup;
    return <div>{info.arr[1]}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_whitelist_deep_nested.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
