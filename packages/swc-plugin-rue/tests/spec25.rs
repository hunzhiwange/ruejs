//! SWC 插件转换行为测试（spec25）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec25() {
    let src = r##"
import { type FC } from 'rue-js'

const Chain: FC = () => {
  return (
    <div>
      【{0 && <div>A</div>}】
      【{' ' && <div>B</div>}】
      【{'' && <div>C</div>}】
      【 {NaN && <div>D</div>}】
      【 {{} && <div>E</div>}】
      【{false && <div>F</div>}】
      【{null && <div>G</div>}】
      【{undefined && <div>H</div>}】

      ===

      【{!!0 && <div>A</div>}】
      【{!!' ' && <div>B</div>}】
      【{!!'' && <div>C</div>}】
      【 {!!NaN && <div>D</div>}】
      【 {!!{} && <div>E</div>}】
      【{!!false && <div>F</div>}】
      【{!!null && <div>G</div>}】
      【{!!undefined && <div>H</div>}】
    </div>
  )
}

export default Chain

"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$createDocumentFragment, _$appendChild, watchEffect, _$vaporCreateVNode } from 'rue-js';
const Chain: FC = ()=>{
    return vapor(()=>{
        const _root = _$createElement("div");
        _$appendChild(_root, _$createTextNode("【"));
        const _list1 = _$createComment("rue:slot:start");
        const _list2 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        watchEffect(()=>{
            const __slot = 0 ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el1 = _$createElement("div");
                _$appendChild(_root, _el1);
                _$appendChild(_el1, _$createTextNode("A"));
                return {
                    vaporElement: _root
                };
            }) : 0;
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list1, _list2);
        });
        _$appendChild(_root, _$createTextNode("】 【"));
        const _list3 = _$createComment("rue:slot:start");
        const _list4 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list3);
        _$appendChild(_root, _list4);
        watchEffect(()=>{
            const __slot = ' ' ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el2 = _$createElement("div");
                _$appendChild(_root, _el2);
                _$appendChild(_el2, _$createTextNode("B"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list3, _list4);
        });
        _$appendChild(_root, _$createTextNode("】 【"));
        const _list5 = _$createComment("rue:slot:start");
        const _list6 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list5);
        _$appendChild(_root, _list6);
        watchEffect(()=>{
            const __slot = '' ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el3 = _$createElement("div");
                _$appendChild(_root, _el3);
                _$appendChild(_el3, _$createTextNode("C"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list5, _list6);
        });
        _$appendChild(_root, _$createTextNode("】 【 "));
        const _list7 = _$createComment("rue:slot:start");
        const _list8 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list7);
        _$appendChild(_root, _list8);
        watchEffect(()=>{
            const __slot = NaN ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el4 = _$createElement("div");
                _$appendChild(_root, _el4);
                _$appendChild(_el4, _$createTextNode("D"));
                return {
                    vaporElement: _root
                };
            }) : NaN;
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list7, _list8);
        });
        _$appendChild(_root, _$createTextNode("】 【 "));
        const _list9 = _$createComment("rue:slot:start");
        const _list10 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list9);
        _$appendChild(_root, _list10);
        watchEffect(()=>{
            const __slot = {} ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el5 = _$createElement("div");
                _$appendChild(_root, _el5);
                _$appendChild(_el5, _$createTextNode("E"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list9, _list10);
        });
        _$appendChild(_root, _$createTextNode("】 【"));
        const _list11 = _$createComment("rue:slot:start");
        const _list12 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list11);
        _$appendChild(_root, _list12);
        watchEffect(()=>{
            const __slot = false ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el6 = _$createElement("div");
                _$appendChild(_root, _el6);
                _$appendChild(_el6, _$createTextNode("F"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list11, _list12);
        });
        _$appendChild(_root, _$createTextNode("】 【"));
        const _list13 = _$createComment("rue:slot:start");
        const _list14 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list13);
        _$appendChild(_root, _list14);
        watchEffect(()=>{
            const __slot = null ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el7 = _$createElement("div");
                _$appendChild(_root, _el7);
                _$appendChild(_el7, _$createTextNode("G"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list13, _list14);
        });
        _$appendChild(_root, _$createTextNode("】 【"));
        const _list15 = _$createComment("rue:slot:start");
        const _list16 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list15);
        _$appendChild(_root, _list16);
        watchEffect(()=>{
            const __slot = undefined ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el8 = _$createElement("div");
                _$appendChild(_root, _el8);
                _$appendChild(_el8, _$createTextNode("H"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list15, _list16);
        });
        _$appendChild(_root, _$createTextNode("】 === 【"));
        const _list17 = _$createComment("rue:slot:start");
        const _list18 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list17);
        _$appendChild(_root, _list18);
        watchEffect(()=>{
            const __slot = !!0 ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el9 = _$createElement("div");
                _$appendChild(_root, _el9);
                _$appendChild(_el9, _$createTextNode("A"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list17, _list18);
        });
        _$appendChild(_root, _$createTextNode("】 【"));
        const _list19 = _$createComment("rue:slot:start");
        const _list20 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list19);
        _$appendChild(_root, _list20);
        watchEffect(()=>{
            const __slot = !!' ' ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el10 = _$createElement("div");
                _$appendChild(_root, _el10);
                _$appendChild(_el10, _$createTextNode("B"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list19, _list20);
        });
        _$appendChild(_root, _$createTextNode("】 【"));
        const _list21 = _$createComment("rue:slot:start");
        const _list22 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list21);
        _$appendChild(_root, _list22);
        watchEffect(()=>{
            const __slot = !!'' ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el11 = _$createElement("div");
                _$appendChild(_root, _el11);
                _$appendChild(_el11, _$createTextNode("C"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list21, _list22);
        });
        _$appendChild(_root, _$createTextNode("】 【 "));
        const _list23 = _$createComment("rue:slot:start");
        const _list24 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list23);
        _$appendChild(_root, _list24);
        watchEffect(()=>{
            const __slot = !!NaN ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el12 = _$createElement("div");
                _$appendChild(_root, _el12);
                _$appendChild(_el12, _$createTextNode("D"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list23, _list24);
        });
        _$appendChild(_root, _$createTextNode("】 【 "));
        const _list25 = _$createComment("rue:slot:start");
        const _list26 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list25);
        _$appendChild(_root, _list26);
        watchEffect(()=>{
            const __slot = !!{} ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el13 = _$createElement("div");
                _$appendChild(_root, _el13);
                _$appendChild(_el13, _$createTextNode("E"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list25, _list26);
        });
        _$appendChild(_root, _$createTextNode("】 【"));
        const _list27 = _$createComment("rue:slot:start");
        const _list28 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list27);
        _$appendChild(_root, _list28);
        watchEffect(()=>{
            const __slot = !!false ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el14 = _$createElement("div");
                _$appendChild(_root, _el14);
                _$appendChild(_el14, _$createTextNode("F"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list27, _list28);
        });
        _$appendChild(_root, _$createTextNode("】 【"));
        const _list29 = _$createComment("rue:slot:start");
        const _list30 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list29);
        _$appendChild(_root, _list30);
        watchEffect(()=>{
            const __slot = !!null ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el15 = _$createElement("div");
                _$appendChild(_root, _el15);
                _$appendChild(_el15, _$createTextNode("G"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list29, _list30);
        });
        _$appendChild(_root, _$createTextNode("】 【"));
        const _list31 = _$createComment("rue:slot:start");
        const _list32 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list31);
        _$appendChild(_root, _list32);
        watchEffect(()=>{
            const __slot = !!undefined ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el16 = _$createElement("div");
                _$appendChild(_root, _el16);
                _$appendChild(_el16, _$createTextNode("H"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list31, _list32);
        });
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
    std::fs::write("target/vapor_outputs/spec25.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
