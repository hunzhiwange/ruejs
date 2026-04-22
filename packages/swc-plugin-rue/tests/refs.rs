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

    let expected_fragment = r##"
import { type FC, useRef, _$vaporWithHookId, useSetup, vapor, onBeforeUnmount, _$createElement, _$createTextNode, _$appendChild, watchEffect, _$vaporBindUseRef, _$setAttribute, _$addEventListener, _$setClassName } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const Refs: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const inputRef = _$vaporWithHookId("useRef:1:0", ()=>useRef<HTMLInputElement>());
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
    return vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold");
        _$appendChild(_el1, _$createTextNode("Refs 基础"));
        const _el2 = _$createElement("input");
        _$appendChild(_root, _el2);
        const _el2_ref_stop = _$vaporBindUseRef(_el2, ()=>(inputRef));
        onBeforeUnmount(()=>{
            _el2_ref_stop();
        });
        _$setClassName(_el2, "border rounded-md px-2 py-1");
        _$setAttribute(_el2, "placeholder", "点击按钮自动聚焦");
        const _el3 = _$createElement("button");
        _$appendChild(_root, _el3);
        _$setClassName(_el3, "px-3 py-2 rounded-md bg-blue-600 text白");
        _$addEventListener(_el3, "click", (focus));
        _$appendChild(_el3, _$createTextNode("聚焦"));
        const _el4 = _$createElement("a");
        _$appendChild(_root, _el4);
        watchEffect(()=>{
            _$setAttribute(_el4, "href", String(RouterLink.__rueHref("/jsx")));
        });
        _$addEventListener(_el4, "click", ((e)=>RouterLink.__rueOnClick(e, "/jsx", false)));
        _$setClassName(_el4, "text-blue-600 hover:underline");
        _$appendChild(_el4, _$createTextNode("返回目录"));
        return {
            vaporElement: _root
        };
    });
};
export default Refs;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/refs.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
