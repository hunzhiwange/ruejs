//! SWC 插件转换行为测试（spec23）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec23_logical_or() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const show = false
const a = false
const b = false

const OrCases: FC = () => {
  return <div>
    {show || <div>Alt</div>}
    {a ? <div>A</div> : (b || <div>B</div>)}
  </div>
}

export default OrCases
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$createDocumentFragment, _$appendChild, watchEffect, _$vaporCreateVNode } from '@rue-js/rue';
const show = false;
const a = false;
const b = false;
const OrCases: FC = ()=>{
    return vapor(()=>{
        const _root = _$createElement("div");
        const _list1 = _$createComment("rue:slot:start");
        const _list2 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        watchEffect(()=>{
            const __slot = show || vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el1 = _$createElement("div");
                _$appendChild(_root, _el1);
                _$appendChild(_el1, _$createTextNode("Alt"));
                return {
                    vaporElement: _root
                };
            });
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list1, _list2);
        });
        _$appendChild(_root, _$createTextNode(" "));
        const _list3 = _$createComment("rue:slot:start");
        const _list4 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list3);
        _$appendChild(_root, _list4);
        watchEffect(()=>{
            const __slot = a ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el2 = _$createElement("div");
                _$appendChild(_root, _el2);
                _$appendChild(_el2, _$createTextNode("A"));
                return {
                    vaporElement: _root
                };
            }) : b || vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el3 = _$createElement("div");
                _$appendChild(_root, _el3);
                _$appendChild(_el3, _$createTextNode("B"));
                return {
                    vaporElement: _root
                };
            });
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list3, _list4);
        });
        return {
            vaporElement: _root
        };
    });
};
export default OrCases;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec23.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
