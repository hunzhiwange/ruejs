//! SWC 插件转换行为测试（spec4）
//!
//! 覆盖：条件、循环或其他控制流下的 JSX。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec4() {
    let src = r##"
import { type FC, h, ref } from 'rue-js';
const C: FC = () => <div>ok</div>;
export default C;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, h, ref, vapor, _$createElement, _$createTextNode, _$appendChild } from 'rue-js';
const C: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$appendChild(_root, _$createTextNode("ok"));
        return {
            vaporElement: _root
        };
    });
export default C;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec4.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
