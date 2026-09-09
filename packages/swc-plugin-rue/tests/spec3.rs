//! SWC 插件转换行为测试（spec3）
//!
//! 覆盖：组件与插槽的组合用例。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec3() {
    let src = r##"
import { type FC, ref, h, Fragment } from '@rue-js/rue';
const count = ref(0);
const Comp: FC = () => (
  <Fragment>
    <span id="n">{count.value}</span>
  </Fragment>
);
export default Comp;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"
import { ref, _$compiledWithHookId, _$compiledRoot, renderAnchor, _$template, _$createDocumentFragment, untrack, watchEffect } from "@rue-js/rue/internal";
import { type FC, h, Fragment } from '@rue-js/rue';
const _$getTemplate1 = _$template('<span id="n"><!--rue:text-hole:0--></span>');
const count = _$compiledWithHookId("ref:1:0", ()=>ref(0));
const Comp: FC = ()=>(()=>{
        const __child1 = _$compiledRoot(()=>{
            const _root = _$createDocumentFragment();
            const _el1_fragment = _$getTemplate1().content.cloneNode(true);
            const _el1 = _el1_fragment.firstChild;
            const _el2 = _el1.childNodes[0];
            const _el3 = _el2.parentNode;
            _root.appendChild(_el1_fragment);
            watchEffect(()=>{
                const __slot = (count.value);
                untrack(()=>renderAnchor(__slot, _el3, _el2));
            });
            return _root;
        });
        return __child1;
    })();
export default Comp;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec3.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("@rue-js/rue/internal/component"), "{normalized}");
    assert!(normalized.contains("_$compiledComponent(Fragment, ()=>({"), "{normalized}");
    assert!(normalized.contains("_$mountCompiledSlotFactory"), "{normalized}");
    assert!(normalized.contains("_$compiledRoot"), "{normalized}");
    assert!(normalized.contains("effect(()=>{ const __slot = (count.value)"), "{normalized}");
    assert!(!normalized.contains("vapor("), "{normalized}");
    assert!(!normalized.contains("watchEffect"), "{normalized}");
}
