//! 条件渲染转换测试（?: 与 && 分支）
//!
//! 覆盖：空节点、null/false/undefined、数字布尔常量在编译期的剔除与文本化。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_conditional_jsx_branch() {
    let src = r##"
import { type FC } from 'rue-js';
import { RouterLink } from '@rue-js/router';

const showA = true;
const showB = false;

const ConditionalRendering: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold">条件渲染</h3>
    <div>{showA ? 'A 显示（?:）' : 'A 隐藏'}</div>
    <div>--[{showB && 'B 显示（&&）'}]--</div>
    <div />
    <div></div>
    <div>--[{null}]--</div>
    <div>--[{false}]--</div>
    <div>--[{undefined}]--</div>
    <div>--[{true}]--</div>
    <div>--[{1}]--</div>
    <div>--[{0}]--</div>
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default ConditionalRendering;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$appendChild, watchEffect, _$createTextWrapper, _$setClassName } from 'rue-js';
import { RouterLink } from '@rue-js/router';
const showA = true;
const showB = false;
const ConditionalRendering: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold");
        _$appendChild(_el1, _$createTextNode("条件渲染"));
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        const _el3 = _$createTextWrapper(_el2);
        _$appendChild(_el2, _el3);
        watchEffect(()=>{
            _$settextContent(_el3, showA ? 'A 显示（?:）' : 'A 隐藏');
        });
        const _el4 = _$createElement("div");
        _$appendChild(_root, _el4);
        _$appendChild(_el4, _$createTextNode("--["));
        const _el5 = _$createTextWrapper(_el4);
        _$appendChild(_el4, _el5);
        watchEffect(()=>{
            _$settextContent(_el5, showB && 'B 显示（&&）');
        });
        _$appendChild(_el4, _$createTextNode("]--"));
        const _el6 = _$createElement("div");
        _$appendChild(_root, _el6);
        const _el7 = _$createElement("div");
        _$appendChild(_root, _el7);
        const _el8 = _$createElement("div");
        _$appendChild(_root, _el8);
        _$appendChild(_el8, _$createTextNode("--["));
        const _el9 = _$createTextWrapper(_el8);
        _$appendChild(_el8, _el9);
        _$settextContent(_el9, "");
        _$appendChild(_el8, _$createTextNode("]--"));
        const _el10 = _$createElement("div");
        _$appendChild(_root, _el10);
        _$appendChild(_el10, _$createTextNode("--["));
        const _el11 = _$createTextWrapper(_el10);
        _$appendChild(_el10, _el11);
        _$settextContent(_el11, "");
        _$appendChild(_el10, _$createTextNode("]--"));
        const _el12 = _$createElement("div");
        _$appendChild(_root, _el12);
        _$appendChild(_el12, _$createTextNode("--["));
        const _el13 = _$createTextWrapper(_el12);
        _$appendChild(_el12, _el13);
        _$settextContent(_el13, "");
        _$appendChild(_el12, _$createTextNode("]--"));
        const _el14 = _$createElement("div");
        _$appendChild(_root, _el14);
        _$appendChild(_el14, _$createTextNode("--["));
        const _el15 = _$createTextWrapper(_el14);
        _$appendChild(_el14, _el15);
        _$settextContent(_el15, "");
        _$appendChild(_el14, _$createTextNode("]--"));
        const _el16 = _$createElement("div");
        _$appendChild(_root, _el16);
        _$appendChild(_el16, _$createTextNode("--["));
        const _el17 = _$createTextWrapper(_el16);
        _$appendChild(_el16, _el17);
        _$settextContent(_el17, "1");
        _$appendChild(_el16, _$createTextNode("]--"));
        const _el18 = _$createElement("div");
        _$appendChild(_root, _el18);
        _$appendChild(_el18, _$createTextNode("--["));
        const _el19 = _$createTextWrapper(_el18);
        _$appendChild(_el18, _el19);
        _$settextContent(_el19, "0");
        _$appendChild(_el18, _$createTextNode("]--"));
        const _list1 = _$createComment("rue:component:start");
        const _list2 = _$createComment("rue:component:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        const __child1 = "返回目录";
        const __slot3 = <RouterLink to="/jsx" className="text-blue-600 hover:underline" children={__child1}/>;
        renderBetween(__slot3, _root, _list1, _list2);
        return {
            vaporElement: _root
        };
    });
export default ConditionalRendering;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/conditional_rendering.out.js", utils::strip_marker(&out))
        .ok();
    assert_eq!(
        utils::normalize(&utils::strip_marker(&out)),
        utils::normalize(&utils::strip_marker(expected_fragment))
    );
}
