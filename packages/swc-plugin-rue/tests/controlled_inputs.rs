//! 受控输入转换测试（value/onInput 与文本回显）
//!
//! 覆盖：受控 input 的值绑定、事件更新、文本回显的 watch 包装与内容设置。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_controlled_inputs_tsx() {
    let src = r##"
import { type FC, useState } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const ControlledInputs: FC = () => {
  const [text, setText] = useState('');
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
      <h3 className="text-xl font-semibold">受控输入</h3>
      <input
        className="border rounded-md px-2 py-1"
        value={text}
        onInput={(e) => setText((e.target as HTMLInputElement).value)}
        placeholder="输入试试"
      />
      <div>当前：{text}</div>
      <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
    </div>
  );
};

export default ControlledInputs;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "ControlledInputs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 期望输出要点对照：
    // - 受控 input：value 走 watch；onInput 绑定更新 state
    // - 文本回显：_$createTextWrapper + _$settextContent + watch
    let _expected_fragment = r##"
import { useState, _$compiledWithHookId, useSetup, _$compiledRoot, renderAnchor, _$createElement, _$template, _$createTextNode, _$appendChild, onScopeDispose, untrack, watchEffect, _$setAttribute, _$setClassName, _$setValue } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const _$getTemplate1 = _$template('<div class="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm"><h3 class="text-xl font-semibold">受控输入</h3><input class="border rounded-md px-2 py-1" placeholder="输入试试"><div>当前：<!--rue:text-hole:0--></div><!--rue:opaque-hole:1--></div>');
const ControlledInputs: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const [text, setText] = useState('');
            return {
                text: text,
                setText: setText
            };
        }));
    const { text: text, setText: setText } = _$useSetup;
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[1];
        const _el2 = _root.childNodes[2].childNodes[1];
        const _el3 = _el2.parentNode;
        const _el4 = _root.childNodes[3];
        const _el5 = _el4.parentNode;
        _$setClassName(_el1, "border rounded-md px-2 py-1");
        watchEffect(()=>{
            _$setValue(_el1, text);
        });
        const _el1_event_2 = ($event)=>(e)=>setText((e.target as HTMLInputElement).value)($event);
        _el1.addEventListener("input", _el1_event_2);
        onScopeDispose(()=>_el1.removeEventListener("input", _el1_event_2));
        _$setAttribute(_el1, "placeholder", "输入试试");
        watchEffect(()=>{
            const __slot = (text);
            untrack(()=>renderAnchor(__slot, _el3, _el2));
        });
        const _el6 = _$createElement("a", _el5);
        _$appendChild(_el5, _el6);
        _el5.insertBefore(_el6, _el4);
        watchEffect(()=>{
            _$setAttribute(_el6, "href", String(RouterLink.__rueHref("/jsx")));
        });
        const _el6_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/jsx", false)($event);
        _el6.addEventListener("click", _el6_event_1);
        onScopeDispose(()=>_el6.removeEventListener("click", _el6_event_1));
        const _el6_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el6.addEventListener("pointerenter", _el6_event_2);
        onScopeDispose(()=>_el6.removeEventListener("pointerenter", _el6_event_2));
        const _el6_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el6.addEventListener("focus", _el6_event_3);
        onScopeDispose(()=>_el6.removeEventListener("focus", _el6_event_3));
        const _el6_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el6.addEventListener("pointerdown", _el6_event_4);
        onScopeDispose(()=>_el6.removeEventListener("pointerdown", _el6_event_4));
        const _el6_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el6.addEventListener("touchstart", _el6_event_5);
        onScopeDispose(()=>_el6.removeEventListener("touchstart", _el6_event_5));
        _$setClassName(_el6, "text-blue-600 hover:underline");
        _$appendChild(_el6, _$createTextNode("返回目录"));
        return _root;
    });
};
export default ControlledInputs;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/controlled_inputs.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$compiledSetup"), "{normalized}");
    assert!(normalized.contains("_el1.value = __child1_next"), "{normalized}");
    assert!(normalized.contains("_$mountCompiledSlotAt"), "{normalized}");
    assert!(normalized.contains("_$compiledComponent(RouterLink"), "{normalized}");
    assert!(!normalized.contains("watchEffect"), "{normalized}");
}
