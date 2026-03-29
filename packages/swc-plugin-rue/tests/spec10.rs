//! SWC 插件转换行为测试（spec10）
//!
//! 覆盖：父组件 children 插槽在转换后的展开与渲染。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec10() {
    let src = r##"
import { type FC, ref, h } from 'rue-js';

const Hello: FC = (props) => {
  return (
    <div>
      1 
      <span>{props.children}</span>
    </div>
  );
}

const Goods: FC = () => (
  <div>
    <h1>Rue 响应式框架示例</h1>
    <Hello>
      <p>这是子内容 A</p>
      <p>这是子内容 B</p>
    </Hello>
  </div>
);
export default Goods;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, h, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$createDocumentFragment, _$appendChild, watchEffect, _$vaporCreateVNode } from 'rue-js';
const Hello: FC = (props)=>{
    return vapor(()=>{
        const _root = _$createElement("div");
        _$appendChild(_root, _$createTextNode("1"));
        const _el1 = _$createElement("span");
        _$appendChild(_root, _el1);
        const _list1 = _$createComment("rue:children:start");
        const _list2 = _$createComment("rue:children:end");
        _$appendChild(_el1, _list1);
        _$appendChild(_el1, _list2);
        watchEffect(()=>{
            const __slot = (props.children);
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _el1, _list1, _list2);
        });
        return {
            vaporElement: _root
        };
    });
};
const Goods: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        const _el2 = _$createElement("h1");
        _$appendChild(_root, _el2);
        _$appendChild(_el2, _$createTextNode("Rue 响应式框架示例"));
        const _list3 = _$createComment("rue:component:start");
        const _list4 = _$createComment("rue:component:end");
        _$appendChild(_root, _list3);
        _$appendChild(_root, _list4);
        const __child1 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _el3 = _$createElement("p");
            _$appendChild(_root, _el3);
            _$appendChild(_el3, _$createTextNode("这是子内容 A"));
            const _el4 = _$createElement("p");
            _$appendChild(_root, _el4);
            _$appendChild(_el4, _$createTextNode("这是子内容 B"));
            return {
                vaporElement: _root
            };
        });
        const __slot5 = <Hello children={__child1}/>;
        renderBetween(__slot5, _root, _list3, _list4);
        return {
            vaporElement: _root
        };
    });
export default Goods;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec10.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
