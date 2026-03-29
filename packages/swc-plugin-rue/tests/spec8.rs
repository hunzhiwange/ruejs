//! SWC 插件转换行为测试（spec8）
//!
//! 覆盖：基础组件与静态样式插入的转换。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec8() {
    let src = r##"
import { type FC, ref, h } from 'rue-js';
const Hello: FC = () => (
  <div>
    <h1 style={{ textAlign: 'center', color: '#e07721ff' }}>Rue 响应式框架示例</h1>
  </div>
);
export default Hello;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, h, vapor, _$createElement, _$createTextNode, _$setStyle, _$appendChild, watchEffect } from 'rue-js';
const Hello: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        const _el1 = _$createElement("h1");
        _$appendChild(_root, _el1);
        watchEffect(()=>{
            const _el1_style = ({
                textAlign: 'center',
                color: '#e07721ff'
            });
            _$setStyle(_el1, _el1_style);
        });
        _$appendChild(_el1, _$createTextNode("Rue 响应式框架示例"));
        return {
            vaporElement: _root
        };
    });
export default Hello;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec8.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
