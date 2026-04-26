//! 赋值逃逸前置转换测试（apply_pre）
//!
//! 覆盖：外部成员赋值与 Object.assign 的处理，避免响应式引用泄漏。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn blocks_external_member_assign_and_object_assign_from_lift() {
    let src = r##"
import { ref } from '@rue-js/rue'

const Comp = () => {
  const count = ref(0)

  const leak = (window as any).x = count

  Object.assign(window as any, { n: count })

  return <div id="n">{count.value}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { _$vaporWithHookId, useSetup } from "@rue-js/rue/vapor";
import { ref } from '@rue-js/rue';
const Comp = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const count = _$vaporWithHookId("ref:1:0", ()=>ref(0));
        const leak = (window as any).x = count;
        Object.assign(window as any, {
            n: count
        });
        return {
            count: count,
            leak: leak
        };
    }));
    const { count: count, leak: leak } = _$useSetup;
    return <div id="n">{count.value}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_escape_assign.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
