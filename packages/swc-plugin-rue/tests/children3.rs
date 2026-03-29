//! children 转换测试（片段变体 3）
//!
//! 覆盖：children 为多重嵌套 Box+span 的插槽展开与渲染。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_props_children_fragment3() {
    let src = r##"
import { type FC } from 'rue-js';

const Box: FC<{ title: string }> = (props) => (
  <div className="border p-2 rounded-md space-y-1">
    <div className="font-semibold">{props.title}</div>
    <div>{props.children}</div>
  </div>
);

const Children: FC = () => (
    <Box title="外层">
        <div>
            <span>hello</span>
            <span>嵌套子元素</span>
        </div>
        <Box title="内部1">
            内部1
            <span>内部1-子元素</span>
        </Box>   
        <Box title="内部2">
            内部1
            <span>内部2-子元素</span>
        </Box>   
    </Box>
);

export default Children;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$createTextWrapper, _$vaporCreateVNode, _$setClassName } from 'rue-js';
const Box: FC<{
    title: string;
}> = (props)=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "border p-2 rounded-md space-y-1");
        const _el1 = _$createElement("div");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "font-semibold");
        const _el2 = _$createTextWrapper(_el1);
        _$appendChild(_el1, _el2);
        watchEffect(()=>{
            _$settextContent(_el2, props.title);
        });
        const _el3 = _$createElement("div");
        _$appendChild(_root, _el3);
        const _list1 = _$createComment("rue:children:start");
        const _list2 = _$createComment("rue:children:end");
        _$appendChild(_el3, _list1);
        _$appendChild(_el3, _list2);
        watchEffect(()=>{
            const __slot = (props.children);
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _el3, _list1, _list2);
        });
        return {
            vaporElement: _root
        };
    });
const Children: FC = ()=>vapor(()=>{
        const _root = _$createDocumentFragment();
        const _list3 = _$createComment("rue:component:start");
        const _list4 = _$createComment("rue:component:end");
        _$appendChild(_root, _list3);
        _$appendChild(_root, _list4);
        const __child1 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _el4 = _$createElement("div");
            _$appendChild(_root, _el4);
            const _el5 = _$createElement("span");
            _$appendChild(_el4, _el5);
            _$appendChild(_el5, _$createTextNode("hello"));
            const _el6 = _$createElement("span");
            _$appendChild(_el4, _el6);
            _$appendChild(_el6, _$createTextNode("嵌套子元素"));
            const _list5 = _$createComment("rue:component:start");
            const _list6 = _$createComment("rue:component:end");
            _$appendChild(_root, _list5);
            _$appendChild(_root, _list6);
            const __child2 = vapor(()=>{
                const _root = _$createDocumentFragment();
                _$appendChild(_root, _$createTextNode("内部1"));
                const _el7 = _$createElement("span");
                _$appendChild(_root, _el7);
                _$appendChild(_el7, _$createTextNode("内部1-子元素"));
                return {
                    vaporElement: _root
                };
            });
            const __slot7 = <Box title="内部1" children={__child2}/>;
            renderBetween(__slot7, _root, _list5, _list6);
            const _list8 = _$createComment("rue:component:start");
            const _list9 = _$createComment("rue:component:end");
            _$appendChild(_root, _list8);
            _$appendChild(_root, _list9);
            const __child3 = vapor(()=>{
                const _root = _$createDocumentFragment();
                _$appendChild(_root, _$createTextNode("内部1"));
                const _el8 = _$createElement("span");
                _$appendChild(_root, _el8);
                _$appendChild(_el8, _$createTextNode("内部2-子元素"));
                return {
                    vaporElement: _root
                };
            });
            const __slot10 = <Box title="内部2" children={__child3}/>;
            renderBetween(__slot10, _root, _list8, _list9);
            return {
                vaporElement: _root
            };
        });
        const __slot11 = <Box title="外层" children={__child1}/>;
        renderBetween(__slot11, _root, _list3, _list4);
        return {
            vaporElement: _root
        };
    });
export default Children;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/children3.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
