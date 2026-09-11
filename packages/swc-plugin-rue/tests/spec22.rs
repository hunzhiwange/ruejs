//! SWC 插件转换行为测试（spec22）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec22() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Chain: FC = () => {
  const a = ref(0)
  const b = ref(1)
  const c = ref(2)
  return <div>{a ? <div>A</div> : b ? <div>B</div> : c ? <div>C</div> : <div>Else</div>}</div>
}

export default Chain
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"
import { ref, _$compiledWithHookId, useSetup, _$compiledRoot, renderAnchor, _$template, untrack, watchEffect, _$compiledAppendChild, _$compiledCreateElement, _$compiledCreateTextNode, _$compiledRoot } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const _$getTemplate1 = _$template("<div><!--rue:text-hole:0--></div>");
const Chain: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = _$compiledWithHookId("ref:1:0", ()=>ref(0));
            const b = _$compiledWithHookId("ref:1:1", ()=>ref(1));
            const c = _$compiledWithHookId("ref:1:2", ()=>ref(2));
            return {
                a: a,
                b: b,
                c: c
            };
        }));
    const { a: a, b: b, c: c } = _$useSetup;
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[0];
        const _el2 = _el1.parentNode;
        watchEffect(()=>{
            const __slot = a ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("A"));
                return _root;
            }) : b ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("B"));
                return _root;
            }) : c ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("C"));
                return _root;
            }) : _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("Else"));
                return _root;
            });
            untrack(()=>renderAnchor(__slot, _el2, _el1));
        });
        return _root;
    });
};
export default Chain;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec22.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert_eq!(normalized.matches("_$compiledRoot(").count(), 5);
    assert_eq!(normalized.matches("return [").count(), 5);
    assert!(normalized.contains("const a = ref(0)"), "{out}");
    assert!(normalized.contains("_$compiledBranchAt"), "{out}");
    assert_eq!(normalized.matches("_$compiledBranch(").count(), 2, "{out}");
    assert!(!normalized.contains("renderAnchor("), "{out}");
}
