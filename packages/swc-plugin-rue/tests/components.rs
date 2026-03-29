//! 组件与 Props 传递的编译结果测试
//!
//! 覆盖：子组件作为 slot、父组件 renderBetween 插入、className 与文本生成。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_components() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const Hello: FC<{ name: string }> = (props) => <div>你好，{props.name}</div>;

const Components: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold">组件与 Props 传递</h3>
    <Hello name="Rue" />
    <Hello name="World" />
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default Components;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 期望输出要点对照：
    // - 子组件 Hello：props.name 作为 slot → vnode → renderBetween
    // - 父组件：组件元素以注释锚点占位，renderBetween 插入 <Hello/>
    // - 文本与属性：静态文本使用 _$createTextNode；className 使用 setAttribute
    let expected_fragment = r##"
import { type FC, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$appendChild, watchEffect, _$vaporCreateVNode, _$setClassName } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const Hello: FC<{
    name: string;
}> = (props)=>vapor(()=>{
        const _root = _$createElement("div");
        _$appendChild(_root, _$createTextNode("你好，"));
        const _list1 = _$createComment("rue:slot:start");
        const _list2 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        watchEffect(()=>{
            const __slot = (props.name);
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list1, _list2);
        });
        return {
            vaporElement: _root
        };
    });
const Components: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold");
        _$appendChild(_el1, _$createTextNode("组件与 Props 传递"));
        const _list3 = _$createComment("rue:component:start");
        const _list4 = _$createComment("rue:component:end");
        _$appendChild(_root, _list3);
        _$appendChild(_root, _list4);
        const __slot5 = <Hello name="Rue"/>;
        renderBetween(__slot5, _root, _list3, _list4);
        const _list6 = _$createComment("rue:component:start");
        const _list7 = _$createComment("rue:component:end");
        _$appendChild(_root, _list6);
        _$appendChild(_root, _list7);
        const __slot8 = <Hello name="World"/>;
        renderBetween(__slot8, _root, _list6, _list7);
        const _list9 = _$createComment("rue:component:start");
        const _list10 = _$createComment("rue:component:end");
        _$appendChild(_root, _list9);
        _$appendChild(_root, _list10);
        const __child1 = "返回目录";
        const __slot11 = <RouterLink to="/jsx" className="text-blue-600 hover:underline" children={__child1}/>;
        renderBetween(__slot11, _root, _list9, _list10);
        return {
            vaporElement: _root
        };
    });
export default Components;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/components.out.js", strip_marker(&out)).ok();

    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
