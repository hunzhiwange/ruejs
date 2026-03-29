//! SWC 插件转换行为测试（spec1）
//!
//! 覆盖：基础 JSX 转换路径与最小用例。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec1() {
    let src = r##"
import { type FC, ref, h } from 'rue-js';
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
    // - 受控文本：span 内使用 _$createTextWrapper + _$settextContent + watch 显示 count.value
    // - hook：ref(0) 被 _$vaporWithHookId 包裹，生成稳定作用域与索引
    let expected_fragment = r##"
import { type FC, ref, h, _$vaporWithHookId, vapor, _$createElement, _$createTextNode, _$settextContent, _$appendChild, watchEffect, _$createTextWrapper, _$setAttribute, _$addEventListener, _$setClassName } from 'rue-js';
const count = _$vaporWithHookId("ref:1:0", ()=>ref(0));
const VaporJSXDemo: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "container");
        const _el1 = _$createElement("h2");
        _$appendChild(_root, _el1);
        _$appendChild(_el1, _$createTextNode("Vapor JSX Demo"));
        const _el2 = _$createElement("button");
        _$appendChild(_root, _el2);
        _$addEventListener(_el2, "click", (()=>count.value++));
        _$appendChild(_el2, _$createTextNode("加一"));
        const _el3 = _$createElement("span");
        _$appendChild(_root, _el3);
        _$setAttribute(_el3, "id", "n");
        const _el4 = _$createTextWrapper(_el3);
        _$appendChild(_el3, _el4);
        watchEffect(()=>{
            _$settextContent(_el4, count.value);
        });
        return {
            vaporElement: _root
        };
    });
export default VaporJSXDemo;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec1.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
