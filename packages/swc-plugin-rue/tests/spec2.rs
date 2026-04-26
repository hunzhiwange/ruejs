//! SWC 插件转换行为测试（spec2）
//!
//! 覆盖：基础 JSX 场景的扩展与边界。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec2() {
    let src = r##"
import { type FC, ref, h, Fragment } from '@rue-js/rue';
const count = ref(0);
const Comp: FC = () => (
  <>
    <span id="n">{count.value}</span>
  </>
);
export default Comp;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { _$vaporWithHookId, vapor, _$createElement, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$createTextWrapper, _$setAttribute } from "@rue-js/rue/vapor";
import { type FC, ref, h, Fragment } from '@rue-js/rue';
const count = _$vaporWithHookId("ref:1:0", ()=>ref(0));
const Comp: FC = ()=>vapor(()=>{
        const _root = _$createDocumentFragment();
        const _el1 = _$createElement("span");
        _$appendChild(_root, _el1);
        _$setAttribute(_el1, "id", "n");
        const _el2 = _$createTextWrapper(_el1);
        _$appendChild(_el1, _el2);
        watchEffect(()=>{
            _$settextContent(_el2, count.value);
        });
        return _root;
    });
export default Comp;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec2.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
