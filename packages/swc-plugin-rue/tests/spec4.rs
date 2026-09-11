//! SWC 插件转换行为测试（spec4）
//!
//! 覆盖：条件、循环或其他控制流下的 JSX。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec4() {
    let src = r##"
import { type FC, h, ref } from '@rue-js/rue';
const C: FC = () => <div>ok</div>;
export default C;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"
import { _$template } from "@rue-js/rue/internal";
import { ref } from "@rue-js/rue/internal";
import { type FC, h } from '@rue-js/rue';
const _$getTemplate1 = _$template("<div>ok</div>");
const C: FC = ()=>(()=>{
        let _root;
        let _disposed = false;
        const _dispose = ()=>{
            if (_disposed) return;
            _disposed = true;
            if (_root && _root.parentNode) {
                _root.parentNode.removeChild(_root);
            }
        };
        return {
            __rue_cleanup_bucket: [
                _dispose
            ],
            __rue_compiled_mount: (__rue_parent_context)=>{
                if (_disposed) {
                    throw new Error("Cannot mount a disposed static root");
                }
                if (_root) {
                    throw new Error("A static root can only be mounted once");
                }
                const _fragment = _$getTemplate1().content.cloneNode(true);
                _root = _fragment.firstChild;
                return _root;
            },
            dispose: _dispose
        };
    })();
export default C;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec4.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$compiledRoot("), "{normalized}");
    assert!(
        normalized.contains("_$compiledCreateElement(\"div\", __rue_parent_context)"),
        "{normalized}"
    );
    assert!(normalized.contains("_$compiledCreateTextNode(\"ok\")"), "{normalized}");
    assert!(normalized.contains("return [ _root, _root ]"), "{normalized}");
    assert!(!normalized.contains("__rue_cleanup_bucket"));
}
