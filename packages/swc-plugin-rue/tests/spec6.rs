//! SWC 插件转换行为测试（spec6）
//!
//! 覆盖：更复杂 JSX 结构的降解与重写。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec6() {
    let src = r##"
import { type FC, ref, h } from '@rue-js/rue';
const count = ref(22);
const Comp: FC = () => (
  <div>
    {count.value === 0 ? (
      <p id="empty">empty</p>
    ) : (
      <ul>
        <li>ok</li>
      </ul>
    )}
    <span id="n">{count.value}</span>
  </div>
);
export default Comp;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _legacy_expected_fragment = r##"
import { ref, _$compiledWithHookId, _$compiledRoot, renderAnchor, _$template, untrack, watchEffect, _$compiledAppendChild, _$compiledCreateElement, _$compiledCreateTextNode, _$compiledRoot } from "@rue-js/rue/internal";
import { type FC, h } from '@rue-js/rue';
const _$getTemplate1 = _$template('<div><!--rue:text-hole:0--><span id="n"><!--rue:text-hole:1--></span></div>');
const count = _$compiledWithHookId("ref:1:0", ()=>ref(22));
const Comp: FC = ()=>_$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[0];
        const _el2 = _el1.parentNode;
        const _el3 = _root.childNodes[1].childNodes[0];
        const _el4 = _el3.parentNode;
        watchEffect(()=>{
            const __slot = count.value === 0 ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("p", __rue_parent_context);
                _root.setAttribute("id", "empty");
                _$compiledAppendChild(_root, _$compiledCreateTextNode("empty"));
                return _root;
            }) : _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("ul", __rue_parent_context);
                const _el5 = _$compiledCreateElement("li", _root);
                _$compiledAppendChild(_root, _el5);
                _$compiledAppendChild(_el5, _$compiledCreateTextNode("ok"));
                return _root;
            });
            untrack(()=>renderAnchor(__slot, _el2, _el1));
        });
        watchEffect(()=>{
            const __slot = (count.value);
            untrack(()=>renderAnchor(__slot, _el4, _el3));
        });
        return _root;
    });
export default Comp;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec6.out.js", strip_marker(&out)).ok();
    let output = normalize(&strip_marker(&out));
    assert!(
        output.contains("const Comp: FC = (_$rueProps, _$rueSlots, _$rueOwner)=>_$compiledRoot"),
        "{output}"
    );
    assert_eq!(output.matches("_$compiledBranchAt(").count(), 1, "{output}");
    assert!(
        output.contains("if (count.value === 0) return { __rue_compiled_branch_key: true"),
        "{output}"
    );
    assert!(output.contains("_$compiledText("), "{output}");
    assert!(output.contains("()=>count.value"), "{output}");
    assert!(!output.contains("vapor(()=>"), "{output}");
    assert!(!output.contains("renderAnchor("), "{output}");
}
