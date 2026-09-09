//! 条件渲染转换测试（?: 与 && 分支）
//!
//! 覆盖：空节点、null/false/undefined、数字布尔常量在编译期的剔除与文本化。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_conditional_jsx_branch() {
    let src = r##"
import { type FC } from '@rue-js/rue';
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

    let _expected_fragment = r##"
import { _$compiledRoot, renderAnchor, _$createElement, _$template, _$createTextNode, _$settextContent, _$appendChild, onScopeDispose, untrack, watchEffect, _$createTextWrapper, _$setAttribute, _$setClassName } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const _$getTemplate1 = _$template('<div class="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm"><h3 class="text-xl font-semibold">条件渲染</h3><div><!--rue:text-hole:0--></div><div>--[<!--rue:text-hole:1-->]--</div><div></div><div></div><!--rue:opaque-hole:2--><!--rue:opaque-hole:3--><!--rue:opaque-hole:4--><!--rue:opaque-hole:5--><div>--[1]--</div><div>--[0]--</div><!--rue:opaque-hole:6--></div>');
const showA = true;
const showB = false;
const ConditionalRendering: FC = ()=>_$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[1].childNodes[0];
        const _el2 = _el1.parentNode;
        const _el3 = _root.childNodes[2].childNodes[1];
        const _el4 = _el3.parentNode;
        const _el5 = _root.childNodes[5];
        const _el6 = _el5.parentNode;
        const _el7 = _root.childNodes[6];
        const _el8 = _el7.parentNode;
        const _el9 = _root.childNodes[7];
        const _el10 = _el9.parentNode;
        const _el11 = _root.childNodes[8];
        const _el12 = _el11.parentNode;
        const _el13 = _root.childNodes[11];
        const _el14 = _el13.parentNode;
        watchEffect(()=>{
            const __slot = showA ? 'A 显示（?:）' : 'A 隐藏';
            untrack(()=>renderAnchor(__slot, _el2, _el1));
        });
        watchEffect(()=>{
            const __slot = showB ? 'B 显示（&&）' : "";
            untrack(()=>renderAnchor(__slot, _el4, _el3));
        });
        const _el15 = _$createElement("div", _el6);
        _$appendChild(_el6, _el15);
        _el6.insertBefore(_el15, _el5);
        _$appendChild(_el15, _$createTextNode("--["));
        const _el16 = _$createTextWrapper(_el15);
        _$appendChild(_el15, _el16);
        _$settextContent(_el16, "");
        _$appendChild(_el15, _$createTextNode("]--"));
        const _el17 = _$createElement("div", _el8);
        _$appendChild(_el8, _el17);
        _el8.insertBefore(_el17, _el7);
        _$appendChild(_el17, _$createTextNode("--["));
        const _el18 = _$createTextWrapper(_el17);
        _$appendChild(_el17, _el18);
        _$settextContent(_el18, "");
        _$appendChild(_el17, _$createTextNode("]--"));
        const _el19 = _$createElement("div", _el10);
        _$appendChild(_el10, _el19);
        _el10.insertBefore(_el19, _el9);
        _$appendChild(_el19, _$createTextNode("--["));
        const _el20 = _$createTextWrapper(_el19);
        _$appendChild(_el19, _el20);
        _$settextContent(_el20, "");
        _$appendChild(_el19, _$createTextNode("]--"));
        const _el21 = _$createElement("div", _el12);
        _$appendChild(_el12, _el21);
        _el12.insertBefore(_el21, _el11);
        _$appendChild(_el21, _$createTextNode("--["));
        const _el22 = _$createTextWrapper(_el21);
        _$appendChild(_el21, _el22);
        _$settextContent(_el22, "");
        _$appendChild(_el21, _$createTextNode("]--"));
        const _el23 = _$createElement("a", _el14);
        _$appendChild(_el14, _el23);
        _el14.insertBefore(_el23, _el13);
        watchEffect(()=>{
            _$setAttribute(_el23, "href", String(RouterLink.__rueHref("/jsx")));
        });
        const _el23_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/jsx", false)($event);
        _el23.addEventListener("click", _el23_event_1);
        onScopeDispose(()=>_el23.removeEventListener("click", _el23_event_1));
        const _el23_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el23.addEventListener("pointerenter", _el23_event_2);
        onScopeDispose(()=>_el23.removeEventListener("pointerenter", _el23_event_2));
        const _el23_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el23.addEventListener("focus", _el23_event_3);
        onScopeDispose(()=>_el23.removeEventListener("focus", _el23_event_3));
        const _el23_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el23.addEventListener("pointerdown", _el23_event_4);
        onScopeDispose(()=>_el23.removeEventListener("pointerdown", _el23_event_4));
        const _el23_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el23.addEventListener("touchstart", _el23_event_5);
        onScopeDispose(()=>_el23.removeEventListener("touchstart", _el23_event_5));
        _$setClassName(_el23, "text-blue-600 hover:underline");
        _$appendChild(_el23, _$createTextNode("返回目录"));
        return _root;
    });
export default ConditionalRendering;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/conditional_rendering.out.js", utils::strip_marker(&out))
        .ok();
    let normalized = utils::normalize(&utils::strip_marker(&out));
    assert!(normalized.contains("_$compiledBranchAt"), "{normalized}");
    assert!(normalized.contains("_$compiledRoot"), "{normalized}");
    assert!(normalized.contains("RouterLink.__rueHref"), "{normalized}");
    assert!(normalized.contains("effect"), "{normalized}");
    assert!(!normalized.contains("watchEffect"), "{normalized}");
}
