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

    let expected_fragment = r##"import { computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
import { type FC, ref } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = ref(1);
            const b = computed(()=>a.value + 2);
            untrack(()=>b.get());
            const __rue_phase2_b = b;
            const base = {
                k: 'v'
            };
            const extra = computed(()=>({
                        z: ()=>a.value + __rue_phase2_b.get()
                }));
            untrack(()=>extra.get());
            const __rue_phase2_extra = extra;
            const arr0 = computed(()=>[
                        a.value,
                        __rue_phase2_b.get()
                ]);
            untrack(()=>arr0.get());
            const __rue_phase2_arr0 = arr0;
            const obj = computed(()=>({
                        ...base,
                        ...__rue_phase2_extra.get(),
                        arr: [
                            ...__rue_phase2_arr0.get(),
                            ()=>a.value > 0 ? __rue_phase2_b.get() : a.value
                        ],
                        meth () {
                            return a.value + __rue_phase2_b.get();
                        }
                }));
            untrack(()=>obj.get());
            const __rue_phase2_obj = obj;
            return {
                a: a,
                b: b,
                __rue_phase2_b: __rue_phase2_b,
                base: base,
                extra: extra,
                __rue_phase2_extra: __rue_phase2_extra,
                arr0: arr0,
                __rue_phase2_arr0: __rue_phase2_arr0,
                obj: obj,
                __rue_phase2_obj: __rue_phase2_obj
            };
        }));
    const { a: a, b: b, __rue_phase2_b: __rue_phase2_b, base: base, extra: extra, __rue_phase2_extra: __rue_phase2_extra, arr0: arr0, __rue_phase2_arr0: __rue_phase2_arr0, obj: obj, __rue_phase2_obj: __rue_phase2_obj } = _$useSetup;
    return <div>{obj.get().meth()}-{obj.get().arr[2]()}-{obj.get().z()}</div>;
};
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_spread_chain_methods.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
