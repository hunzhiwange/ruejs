//! SWC 插件转换行为测试（spec18）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec18() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Hello: FC = () => {
  const color = ref("blue")
  return (
    <div>
    <div r-show={true} style={{ fontWeight: 'bold', color: 'red' }}>hello world</div>
    <div r-show={true} style="color:blue;">hello world</div>
    <div r-show={true} style={"color:" + color.value + ";"}>hello world</div>
    <div r-show={true} style={null}>hello world</div>
    <div r-show={true} style={undefined}>hello world</div>
    <div r-show={true} style={0}>hello world</div>
    <div r-show={true}>hello world</div>
    <div r-show={true} style="">hello world</div>
    <div r-show={true} style=" ">hello world</div>
    <div r-show={true} style>hello world</div>
    <div r-show={true}>hello world</div>
    </div>
  )
}

export default Hello
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"
import { ref, _$compiledWithHookId, useSetup, _$template, effect, _$compiledRoot } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const _$getTemplate1 = _$template('<div><div>hello world</div><div style="color:blue;">hello world</div><div>hello world</div><div>hello world</div><div>hello world</div><div>hello world</div><div>hello world</div><div style="">hello world</div><div style=" ">hello world</div><div style="">hello world</div><div>hello world</div></div>');
const Hello: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const color = ref("blue");
            return {
                color: color
            };
        }));
    const { color: color } = _$useSetup;
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[0];
        const _el2 = _root.childNodes[2];
        const _el3 = _root.childNodes[3];
        const _el4 = _root.childNodes[4];
        const _el5 = _root.childNodes[5];
        const _el6 = _root.childNodes[6];
        const _el7 = _root.childNodes[10];
        Object.assign(_el1.style, {
            fontWeight: 'bold',
            color: 'red',
            display: ""
        });
        let __child1;
        effect(()=>{
            const __child1_raw = "color:" + color.value + ";";
            const __child1_next = __child1_raw == null ? "" : String(__child1_raw);
            if (!Object.is(__child1, __child1_next)) {
                __child1 = __child1_next;
                _el2.style.cssText = __child1_next;
            }
        });
        Object.assign(_el3.style, {
            display: ""
        });
        Object.assign(_el4.style, {
            display: ""
        });
        Object.assign(_el5.style, {
            display: ""
        });
        Object.assign(_el6.style, {
            display: ""
        });
        Object.assign(_el7.style, {
            display: ""
        });
        return {
            __rue_compiled_host: _root,
            __rue_compiled_roots: [
                _root
            ]
        };
    }, {
        __rue_compiled_explicit_roots: true
    }));
};
export default Hello;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec18.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("@rue-js/rue/internal/dom"), "{normalized}");
    assert!(normalized.contains("_$compiledSetup(\"useSetup:0:0\""), "{normalized}");
    assert!(normalized.contains("_$compiledRoot"), "{normalized}");
    assert!(normalized.contains("Object.assign(_el1.style"), "{normalized}");
    assert!(normalized.contains("_el2.style.cssText = __child1_next"), "{normalized}");
    assert!(normalized.contains("Object.is(__child1, __child1_next)"), "{normalized}");
    assert!(!normalized.contains("vapor("), "{normalized}");
}
