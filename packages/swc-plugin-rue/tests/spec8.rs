//! SWC 插件转换行为测试（spec8）
//!
//! 覆盖：基础组件与静态样式插入的转换。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec8() {
    let src = r##"
import { type FC, ref, h } from '@rue-js/rue';
const Hello: FC = () => (
  <div>
    <h1 style={{ textAlign: 'center', color: '#e07721ff' }}>Rue 响应式框架示例</h1>
  </div>
);
export default Hello;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"
import { ref, _$compiledRoot, _$template, _$setStyle } from "@rue-js/rue/internal";
import { type FC, h } from '@rue-js/rue';
const _$getTemplate1 = _$template("<div><h1>Rue 响应式框架示例</h1></div>");
const Hello: FC = ()=>_$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[0];
        _$setStyle(_el1, {
            textAlign: 'center',
            color: '#e07721ff'
        });
        return _root;
    });
export default Hello;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec8.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$template(\"<div><h1>Rue 响应式框架示例</h1></div>\")"));
    assert!(normalized.contains("_$compiledRoot(Object.assign("));
    assert!(
        normalized
            .contains("Object.assign(_el1.style, { textAlign: 'center', color: '#e07721ff' })")
    );
    assert!(normalized.contains("__rue_compiled_explicit_roots: true"));
    assert!(!normalized.contains("vapor("));
}
