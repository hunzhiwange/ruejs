//! SWC 插件转换行为测试（spec25）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec25() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Chain: FC = () => {
  return (
    <div>
      【{0 && <div>A</div>}】
      【{' ' && <div>B</div>}】
      【{'' && <div>C</div>}】
      【 {NaN && <div>D</div>}】
      【 {{} && <div>E</div>}】
      【{false && <div>F</div>}】
      【{null && <div>G</div>}】
      【{undefined && <div>H</div>}】

      ===

      【{!!0 && <div>A</div>}】
      【{!!' ' && <div>B</div>}】
      【{!!'' && <div>C</div>}】
      【 {!!NaN && <div>D</div>}】
      【 {!!{} && <div>E</div>}】
      【{!!false && <div>F</div>}】
      【{!!null && <div>G</div>}】
      【{!!undefined && <div>H</div>}】
    </div>
  )
}

export default Chain

"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _legacy_expected_fragment = r##"
import { _$compiledRoot, renderAnchor, _$template, untrack, watchEffect, _$compiledAppendChild, _$compiledCreateElement, _$compiledCreateTextNode, _$compiledRoot } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const _$getTemplate1 = _$template("<div>【<!--rue:text-hole:0-->】 【<!--rue:text-hole:1-->】 【<!--rue:text-hole:2-->】 【 <!--rue:text-hole:3-->】 【 <!--rue:text-hole:4-->】 【<!--rue:text-hole:5-->】 【<!--rue:text-hole:6-->】 【<!--rue:text-hole:7-->】 === 【<!--rue:text-hole:8-->】 【<!--rue:text-hole:9-->】 【<!--rue:text-hole:10-->】 【 <!--rue:text-hole:11-->】 【 <!--rue:text-hole:12-->】 【<!--rue:text-hole:13-->】 【<!--rue:text-hole:14-->】 【<!--rue:text-hole:15-->】</div>");
const Chain: FC = ()=>{
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[1];
        const _el2 = _el1.parentNode;
        const _el3 = _root.childNodes[3];
        const _el4 = _el3.parentNode;
        const _el5 = _root.childNodes[5];
        const _el6 = _el5.parentNode;
        const _el7 = _root.childNodes[7];
        const _el8 = _el7.parentNode;
        const _el9 = _root.childNodes[9];
        const _el10 = _el9.parentNode;
        const _el11 = _root.childNodes[11];
        const _el12 = _el11.parentNode;
        const _el13 = _root.childNodes[13];
        const _el14 = _el13.parentNode;
        const _el15 = _root.childNodes[15];
        const _el16 = _el15.parentNode;
        const _el17 = _root.childNodes[17];
        const _el18 = _el17.parentNode;
        const _el19 = _root.childNodes[19];
        const _el20 = _el19.parentNode;
        const _el21 = _root.childNodes[21];
        const _el22 = _el21.parentNode;
        const _el23 = _root.childNodes[23];
        const _el24 = _el23.parentNode;
        const _el25 = _root.childNodes[25];
        const _el26 = _el25.parentNode;
        const _el27 = _root.childNodes[27];
        const _el28 = _el27.parentNode;
        const _el29 = _root.childNodes[29];
        const _el30 = _el29.parentNode;
        const _el31 = _root.childNodes[31];
        const _el32 = _el31.parentNode;
        watchEffect(()=>{
            const __slot = 0 ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("A"));
                return _root;
            }) : 0;
            untrack(()=>renderAnchor(__slot, _el2, _el1));
        });
        watchEffect(()=>{
            const __slot = ' ' ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("B"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el4, _el3));
        });
        watchEffect(()=>{
            const __slot = '' ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("C"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el6, _el5));
        });
        watchEffect(()=>{
            const __slot = NaN ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("D"));
                return _root;
            }) : NaN;
            untrack(()=>renderAnchor(__slot, _el8, _el7));
        });
        watchEffect(()=>{
            const __slot = {} ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("E"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el10, _el9));
        });
        watchEffect(()=>{
            const __slot = false ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("F"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el12, _el11));
        });
        watchEffect(()=>{
            const __slot = null ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("G"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el14, _el13));
        });
        watchEffect(()=>{
            const __slot = undefined ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("H"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el16, _el15));
        });
        watchEffect(()=>{
            const __slot = !!0 ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("A"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el18, _el17));
        });
        watchEffect(()=>{
            const __slot = !!' ' ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("B"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el20, _el19));
        });
        watchEffect(()=>{
            const __slot = !!'' ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("C"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el22, _el21));
        });
        watchEffect(()=>{
            const __slot = !!NaN ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("D"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el24, _el23));
        });
        watchEffect(()=>{
            const __slot = !!{} ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("E"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el26, _el25));
        });
        watchEffect(()=>{
            const __slot = !!false ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("F"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el28, _el27));
        });
        watchEffect(()=>{
            const __slot = !!null ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("G"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el30, _el29));
        });
        watchEffect(()=>{
            const __slot = !!undefined ? _$compiledRoot((__rue_parent_context)=>{
                const _root = _$compiledCreateElement("div", __rue_parent_context);
                _$compiledAppendChild(_root, _$compiledCreateTextNode("H"));
                return _root;
            }) : "";
            untrack(()=>renderAnchor(__slot, _el32, _el31));
        });
        return _root;
    });
};
export default Chain;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec25.out.js", strip_marker(&out)).ok();
    let output = normalize(&strip_marker(&out));
    assert_eq!(output.matches("_$compiledBranchAt(").count(), 16, "{output}");
    assert!(!output.contains("watchEffect("), "{output}");
    assert!(!output.contains("renderAnchor("), "{output}");
    assert!(output.contains("const __rue_branch_value = 0"), "{output}");
    assert!(
        output.contains(
            "typeof __rue_branch_value === \"number\" || typeof __rue_branch_value === \"bigint\""
        ),
        "{output}"
    );
}
