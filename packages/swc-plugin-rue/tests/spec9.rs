//! SWC 插件转换行为测试（spec9）
//!
//! 覆盖：两个基础组件的渲染形态与一致性。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec9() {
    let src = r##"
import { type FC, ref, h } from '@rue-js/rue';

const Hello: FC = () => {
  return (
    <div>1</div>
  );
}

const World: FC = () => {
  return (
    <div>1</div>
  );
}

const Goods: FC = () => (
  <div>
    <h1>Rue 响应式框架示例</h1>
    <Hello />
    <World />
  </div>
);
export default Goods;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { vapor, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$appendChild } from "@rue-js/rue/vapor";
import { type FC, ref, h } from '@rue-js/rue';
const Hello: FC = ()=>{
    return vapor(()=>{
        const _root = _$createElement("div");
        _$appendChild(_root, _$createTextNode("1"));
        return _root;
    });
};
const World: FC = ()=>{
    return vapor(()=>{
        const _root = _$createElement("div");
        _$appendChild(_root, _$createTextNode("1"));
        return _root;
    });
};
const Goods: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        const _el1 = _$createElement("h1");
        _$appendChild(_root, _el1);
        _$appendChild(_el1, _$createTextNode("Rue 响应式框架示例"));
        const _list1 = _$createComment("rue:component:anchor");
        _$appendChild(_root, _list1);
        const __slot2 = <Hello/>;
        renderAnchor(__slot2, _root, _list1);
        const _list3 = _$createComment("rue:component:anchor");
        _$appendChild(_root, _list3);
        const __slot4 = <World/>;
        renderAnchor(__slot4, _root, _list3);
        return _root;
    });
export default Goods;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec9.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
