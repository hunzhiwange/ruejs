//! SWC 插件转换行为测试（spec_setup_spread_deep）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn collects_deep_spread_with_nested_arrays_objects_and_arrows() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(1)
  const base = { k: 'v' }
  const inner = [a.value, { t: `x=${a.value}` }]
  const calc = () => a.value + 1
  const obj = {
    ...base,
    arr: [...inner, calc()],
    map: { x: a.value, y: () => a.value > 0 ? 'yes' : 'no' }
  }
  return <div>{obj.arr[0]}-{obj.map.y()}</div>
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
            const base = {
                k: 'v'
            };
            const inner = computed(()=>[
                        a.value,
                        {
                            t: `x=${a.value}`
                        }
                ]);
            untrack(()=>inner.get());
            const __rue_phase2_inner = inner;
            const calc = ()=>a.value + 1;
            const obj = computed(()=>({
                        ...base,
                        arr: [
                            ...__rue_phase2_inner.get(),
                            calc()
                        ],
                        map: {
                            x: a.value,
                            y: ()=>a.value > 0 ? 'yes' : 'no'
                        }
                }));
            untrack(()=>obj.get());
            const __rue_phase2_obj = obj;
            return {
                a: a,
                base: base,
                inner: inner,
                __rue_phase2_inner: __rue_phase2_inner,
                calc: calc,
                obj: obj,
                __rue_phase2_obj: __rue_phase2_obj
            };
        }));
    const { a: a, base: base, inner: inner, __rue_phase2_inner: __rue_phase2_inner, calc: calc, obj: obj, __rue_phase2_obj: __rue_phase2_obj } = _$useSetup;
    return <div>{obj.get().arr[0]}-{obj.get().map.y()}</div>;
};
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_on_setup_spread_deep.out.js", strip_marker(&out))
        .ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
