//! SWC 插件转换行为测试（spec9）
//!
//! 覆盖：两个基础组件的渲染形态与一致性。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec9() {
    let src = r##"
import { type FC, ref, h } from '@rue-js/rue';

const Hello: FC = () => {
  return (
    <div>1</div>
  );
}

const World: FC = () => {
  return (
    <div>1</div>
  );
}

const Goods: FC = () => (
  <div>
    <h1>Rue 响应式框架示例</h1>
    <Hello />
    <World />
  </div>
);
export default Goods;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"
import { ref, _$compiledRoot, _$createComponent, renderAnchor, _$template } from "@rue-js/rue/internal";
import { type FC, h } from '@rue-js/rue';
const _$getTemplate1 = _$template("<div>1</div>");
const _$getTemplate2 = _$template("<div><h1>Rue 响应式框架示例</h1><!--rue:opaque-hole:0--><!--rue:opaque-hole:1--></div>");
const Hello: FC = ()=>{
    return (()=>{
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
};
const World: FC = ()=>{
    return (()=>{
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
};
const Goods: FC = ()=>_$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate2().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[1];
        const _el2 = _el1.parentNode;
        const _el3 = _root.childNodes[2];
        const _el4 = _el3.parentNode;
        const __slot1 = _$createComponent(Hello, {});
        renderAnchor(__slot1, _el2, _el1);
        const __slot2 = _$createComponent(World, {});
        renderAnchor(__slot2, _el4, _el3);
        return _root;
    });
export default Goods;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec9.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert_eq!(normalized.matches("_$compiledRoot(Object.assign(").count(), 3);
    assert_eq!(normalized.matches("_$compiledCreateTextNode(\"1\")").count(), 2);
    assert!(normalized.contains("_$createComponent(Hello, ()=>({}))"));
    assert!(normalized.contains("_$createComponent(World, ()=>({}))"));
    assert_eq!(normalized.matches("renderAnchor(__slot").count(), 2);
    assert_eq!(normalized.matches("__rue_compiled_explicit_roots: true").count(), 3);
    assert!(!normalized.contains("__rue_cleanup_bucket"));
}
