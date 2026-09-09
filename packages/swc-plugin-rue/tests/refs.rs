//! Refs 使用与绑定的转换测试
//!
//! 覆盖：useRef 声明、ref 属性绑定、focus 回调中的 current 访问与调用。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_refs_tsx() {
    let src = r##"
import { type FC, useRef } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const Refs: FC = () => {
  const inputRef = useRef<HTMLInputElement>();
  const focus = () => {
    console.log(inputRef.current);
    inputRef.current?.focus?.();
  };
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
      <h3 className="text-xl font-semibold">Refs 基础</h3>
      <input ref={inputRef} className="border rounded-md px-2 py-1" placeholder="点击按钮自动聚焦" />
      <button className="px-3 py-2 rounded-md bg-blue-600 text白" onClick={focus}>聚焦</button>
      <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
    </div>
  );
};

export default Refs;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"
import { _$compiledWithHookId, useSetup, useRef, _$compiledRoot, _$createElement, _$template, _$createTextNode, _$appendChild, onScopeDispose, watchEffect, _$compiledBindUseRef, _$setAttribute, _$setClassName } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const _$getTemplate1 = _$template('<div class="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm"><h3 class="text-xl font-semibold">Refs 基础</h3><input class="border rounded-md px-2 py-1" placeholder="点击按钮自动聚焦"><button class="px-3 py-2 rounded-md bg-blue-600 text白">聚焦</button><!--rue:opaque-hole:0--></div>');
const Refs: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const inputRef = useRef<HTMLInputElement>();
            const focus = ()=>{
                console.log(inputRef.current);
                inputRef.current?.focus?.();
            };
            return {
                inputRef: inputRef,
                focus: focus
            };
        }));
    const { inputRef: inputRef, focus: focus } = _$useSetup;
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[1];
        const _el2 = _root.childNodes[2];
        const _el3 = _root.childNodes[3];
        const _el4 = _el3.parentNode;
        _$compiledBindUseRef(_el1, ()=>(inputRef));
        _$setClassName(_el1, "border rounded-md px-2 py-1");
        _$setAttribute(_el1, "placeholder", "点击按钮自动聚焦");
        _$setClassName(_el2, "px-3 py-2 rounded-md bg-blue-600 text白");
        const _el2_event_1 = ($event)=>focus($event);
        _el2.addEventListener("click", _el2_event_1);
        onScopeDispose(()=>_el2.removeEventListener("click", _el2_event_1));
        const _el5 = _$createElement("a", _el4);
        _$appendChild(_el4, _el5);
        _el4.insertBefore(_el5, _el3);
        watchEffect(()=>{
            _$setAttribute(_el5, "href", String(RouterLink.__rueHref("/jsx")));
        });
        const _el5_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/jsx", false)($event);
        _el5.addEventListener("click", _el5_event_1);
        onScopeDispose(()=>_el5.removeEventListener("click", _el5_event_1));
        const _el5_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el5.addEventListener("pointerenter", _el5_event_2);
        onScopeDispose(()=>_el5.removeEventListener("pointerenter", _el5_event_2));
        const _el5_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el5.addEventListener("focus", _el5_event_3);
        onScopeDispose(()=>_el5.removeEventListener("focus", _el5_event_3));
        const _el5_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el5.addEventListener("pointerdown", _el5_event_4);
        onScopeDispose(()=>_el5.removeEventListener("pointerdown", _el5_event_4));
        const _el5_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el5.addEventListener("touchstart", _el5_event_5);
        onScopeDispose(()=>_el5.removeEventListener("touchstart", _el5_event_5));
        _$setClassName(_el5, "text-blue-600 hover:underline");
        _$appendChild(_el5, _$createTextNode("返回目录"));
        return _root;
    });
};
export default Refs;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/refs.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("@rue-js/rue/internal/component"), "{normalized}");
    assert!(normalized.contains("_$compiledSetup(\"useSetup:0:0\""), "{normalized}");
    assert!(normalized.contains("__ref1.current = _el1"), "{normalized}");
    assert!(normalized.contains("__ref1.current = null"), "{normalized}");
    assert!(normalized.contains("_$compiledRoot"), "{normalized}");
    assert_eq!(normalized.matches(".addEventListener(").count(), 6);
    assert_eq!(normalized.matches(".removeEventListener(").count(), 6);
    assert!(!normalized.contains("vapor("), "{normalized}");
}
