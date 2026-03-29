//! SWC 插件转换行为测试（spec24）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec24() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Chain: FC = () => {
  return <div>
    【<div>A </div>】
    【<div>B</div>】
    【<div>C d</div>】
    【<div> D </div>】
    【<div>E g</div>】
    【<div>F</div>】
    【<div>
      E
    </div>】
  </div>
}

export default Chain
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, vapor, _$createElement, _$createTextNode, _$appendChild } from '@rue-js/rue';
const Chain: FC = ()=>{
    return vapor(()=>{
        const _root = _$createElement("div");
        _$appendChild(_root, _$createTextNode("【"));
        const _el1 = _$createElement("div");
        _$appendChild(_root, _el1);
        _$appendChild(_el1, _$createTextNode("A"));
        _$appendChild(_root, _$createTextNode("】 【"));
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        _$appendChild(_el2, _$createTextNode("B"));
        _$appendChild(_root, _$createTextNode("】 【"));
        const _el3 = _$createElement("div");
        _$appendChild(_root, _el3);
        _$appendChild(_el3, _$createTextNode("C d"));
        _$appendChild(_root, _$createTextNode("】 【"));
        const _el4 = _$createElement("div");
        _$appendChild(_root, _el4);
        _$appendChild(_el4, _$createTextNode("D"));
        _$appendChild(_root, _$createTextNode("】 【"));
        const _el5 = _$createElement("div");
        _$appendChild(_root, _el5);
        _$appendChild(_el5, _$createTextNode("E g"));
        _$appendChild(_root, _$createTextNode("】 【"));
        const _el6 = _$createElement("div");
        _$appendChild(_root, _el6);
        _$appendChild(_el6, _$createTextNode("F"));
        _$appendChild(_root, _$createTextNode("】 【"));
        const _el7 = _$createElement("div");
        _$appendChild(_root, _el7);
        _$appendChild(_el7, _$createTextNode("E"));
        _$appendChild(_root, _$createTextNode("】"));
        return {
            vaporElement: _root
        };
    });
};
export default Chain;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec24.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
