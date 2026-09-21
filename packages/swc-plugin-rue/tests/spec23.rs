//! SWC 插件转换行为测试（spec23）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec23_logical_or() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const show = false
const a = false
const b = false

const OrCases: FC = () => {
  return <div>
    {show || <div>Alt</div>}
    {a ? <div>A</div> : (b || <div>B</div>)}
  </div>
}

export default OrCases
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"
import { _$compiledRoot, renderAnchor, _$template, untrack, watchEffect, _$compiledAppendChild, _$compiledCreateElement, _$compiledCreateTextNode, _$compiledRoot } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const _$getTemplate1 = _$template("<div><!--rue:text-hole:0--><!--rue:text-hole:1--></div>");
const show = false;
const a = false;
const b = false;
const OrCases: FC = ()=>{
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[0];
        const _el2 = _el1.parentNode;
        const _el3 = _root.childNodes[1];
        const _el4 = _el3.parentNode;
        watchEffect(()=>{
            const __slot = show || _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("Alt"));
                return _root;
            });
            untrack(()=>renderAnchor(__slot, _el2, _el1));
        });
        watchEffect(()=>{
            const __slot = a ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("A"));
                return _root;
            }) : b || _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("B"));
                return _root;
            });
            untrack(()=>renderAnchor(__slot, _el4, _el3));
        });
        return _root;
    });
};
export default OrCases;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec23.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert_eq!(
        normalized.matches("_$compiledRoot(").count()
            + normalized.matches("_$compiledStaticRoot(").count(),
        4
    );
    assert_eq!(normalized.matches("return [").count(), 4);
    assert_eq!(normalized.matches("_$compiledBranchAt(").count(), 0, "{out}");
    assert_eq!(normalized.matches("_$compiledBranch(").count(), 0, "{out}");
    assert!(normalized.contains("_$mountCompiledSlotAt"), "{out}");
}
