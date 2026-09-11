//! SWC 插件转换行为测试（spec1）
//!
//! 覆盖：基础 JSX 转换路径与最小用例。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec1() {
    let src = r##"
import { type FC, ref, h } from '@rue-js/rue';
const count = ref(0);
const VaporJSXDemo: FC = () => (
    <div className="container">
        <h2>Vapor JSX Demo</h2>
        <button onClick={() => count.value++}>加一</button>
        <span id="n">{count.value}</span>
    </div>
);
export default VaporJSXDemo;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 期望输出要点对照：
    // - 事件：onClick → addEventListener('click', handler)
    // - 受控文本：span 内使用 _$compiledText 显示 count.value
    // - hook：ref(0) 被 _$compiledWithHookId 包裹，生成稳定作用域与索引
    let _expected_fragment = r##"
import { ref, _$compiledWithHookId, _$template, _$compiledText, onCleanup, _$compiledCreateTextNode, _$compiledRoot } from "@rue-js/rue/internal";
import { type FC, h } from '@rue-js/rue';
const _$getTemplate1 = _$template('<div class="container"><h2>Vapor JSX Demo</h2><button>加一</button><span id="n"><!--rue:text-hole:0--></span></div>');
const count = _$compiledWithHookId("ref:1:0", ()=>ref(0));
const VaporJSXDemo: FC = ()=>_$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[1];
        const _el2 = _root.childNodes[2].childNodes[0];
        const _el3 = _el2.parentNode;
        const __event1 = ($event)=>()=>count.value++($event);
        _el1.addEventListener("click", __event1);
        onCleanup(()=>_el1.removeEventListener("click", __event1));
        const _el4 = _$compiledCreateTextNode("");
        _el3.insertBefore(_el4, _el2);
        _el3.removeChild(_el2);
        _$compiledText(_el4, ()=>count.value);
        return { __rue_compiled_host: _root, __rue_compiled_roots: [ _root ] };
    }, { __rue_compiled_explicit_roots: true }));
export default VaporJSXDemo;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec1.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$compiledRoot("), "{out}");
    assert!(normalized.contains("return [ _root, _root ]"), "{out}");
    assert!(normalized.contains("_$compiledText(_el5"), "{out}");
    assert!(normalized.contains("_$getTemplate1().content.cloneNode(true)"), "{out}");
}
