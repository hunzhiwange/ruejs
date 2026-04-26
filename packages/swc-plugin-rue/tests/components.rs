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
    // - 子组件 Hello：props.name 作为 slot → vnode → renderAnchor
    // - 父组件：组件元素以注释锚点占位，renderAnchor 插入 <Hello/>
    // - 文本与属性：静态文本使用 _$createTextNode；className 使用 setAttribute
    let expected_fragment = r##"
import { vapor, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$appendChild, watchEffect, _$setAttribute, _$addEventListener, _$setClassName } from "@rue-js/rue/vapor";
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const Hello: FC<{
    name: string;
}> = (props)=>vapor(()=>{
        const _root = _$createElement("div");
        _$appendChild(_root, _$createTextNode("你好，"));
        const _list1 = _$createComment("rue:slot:anchor");
        _$appendChild(_root, _list1);
        watchEffect(()=>{
            const __slot = (props.name);
            renderAnchor(__slot, _root, _list1);
        });
        return _root;
    });
const Components: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold");
        _$appendChild(_el1, _$createTextNode("组件与 Props 传递"));
        const _list2 = _$createComment("rue:component:anchor");
        _$appendChild(_root, _list2);
        const __slot3 = <Hello name="Rue"/>;
        renderAnchor(__slot3, _root, _list2);
        const _list4 = _$createComment("rue:component:anchor");
        _$appendChild(_root, _list4);
        const __slot5 = <Hello name="World"/>;
        renderAnchor(__slot5, _root, _list4);
        const _el2 = _$createElement("a");
        _$appendChild(_root, _el2);
        watchEffect(()=>{
            _$setAttribute(_el2, "href", String(RouterLink.__rueHref("/jsx")));
        });
        _$addEventListener(_el2, "click", ((e)=>RouterLink.__rueOnClick(e, "/jsx", false)));
        _$setClassName(_el2, "text-blue-600 hover:underline");
        _$appendChild(_el2, _$createTextNode("返回目录"));
        return _root;
    });
export default Components;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/components.out.js", strip_marker(&out)).ok();

    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
