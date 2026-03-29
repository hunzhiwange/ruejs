//! SWC 插件转换行为测试（spec22）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec22() {
    let src = r##"
import { type FC, ref } from 'rue-js'

const Chain: FC = () => {
  const a = ref(0)
  const b = ref(1)
  const c = ref(2)
  return <div>{a ? <div>A</div> : b ? <div>B</div> : c ? <div>C</div> : <div>Else</div>}</div>
}

export default Chain
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$createDocumentFragment, _$appendChild, watchEffect, _$vaporCreateVNode } from 'rue-js';
const Chain: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(0));
        const b = _$vaporWithHookId("ref:1:1", ()=>ref(1));
        const c = _$vaporWithHookId("ref:1:2", ()=>ref(2));
        return {
            a: a,
            b: b,
            c: c
        };
    }));
    const { a: a, b: b, c: c } = _$useSetup;
    return vapor(()=>{
        const _root = _$createElement("div");
        const _list1 = _$createComment("rue:slot:start");
        const _list2 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        watchEffect(()=>{
            const __slot = a ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el1 = _$createElement("div");
                _$appendChild(_root, _el1);
                _$appendChild(_el1, _$createTextNode("A"));
                return {
                    vaporElement: _root
                };
            }) : b ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el2 = _$createElement("div");
                _$appendChild(_root, _el2);
                _$appendChild(_el2, _$createTextNode("B"));
                return {
                    vaporElement: _root
                };
            }) : c ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el3 = _$createElement("div");
                _$appendChild(_root, _el3);
                _$appendChild(_el3, _$createTextNode("C"));
                return {
                    vaporElement: _root
                };
            }) : vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el4 = _$createElement("div");
                _$appendChild(_root, _el4);
                _$appendChild(_el4, _$createTextNode("Else"));
                return {
                    vaporElement: _root
                };
            });
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list1, _list2);
        });
        return {
            vaporElement: _root
        };
    });
};
export default Chain;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec22.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
