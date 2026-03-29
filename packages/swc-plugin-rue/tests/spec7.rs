//! SWC 插件转换行为测试（spec7）
//!
//! 覆盖：特殊 case 的 JSX 展开逻辑。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec7() {
    let src = r##"
import { type FC, ref, h } from 'rue-js';
const count = ref(2);
const Child: FC<{ label: number }> = (p) => (
  <span id="child">{p.label}</span>
);
const Parent: FC = () => (
  <div>
    <Child label={count.value} />
  </div>
);
export default Parent;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, h, _$vaporWithHookId, vapor, renderBetween, _$createElement, _$createComment, _$appendChild, watchEffect, _$vaporCreateVNode, _$setAttribute } from 'rue-js';
const count = _$vaporWithHookId("ref:1:0", ()=>ref(2));
const Child: FC<{
    label: number;
}> = (p)=>vapor(()=>{
        const _root = _$createElement("span");
        _$setAttribute(_root, "id", "child");
        const _list1 = _$createComment("rue:slot:start");
        const _list2 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        watchEffect(()=>{
            const __slot = (p.label);
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list1, _list2);
        });
        return {
            vaporElement: _root
        };
    });
const Parent: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        const _list3 = _$createComment("rue:component:start");
        const _list4 = _$createComment("rue:component:end");
        _$appendChild(_root, _list3);
        _$appendChild(_root, _list4);
        watchEffect(()=>{
            const __slot5 = <Child label={count.value}/>;
            renderBetween(__slot5, _root, _list3, _list4);
        });
        return {
            vaporElement: _root
        };
    });
export default Parent;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec7.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
