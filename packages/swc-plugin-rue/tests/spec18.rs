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
      <div show={true} style={{ fontWeight: 'bold', color: 'red' }}>hello world</div>
      <div show={true} style="color:blue;">hello world</div>
      <div show={true} style={"color:" + color.value + ";"}>hello world</div>
      <div show={true} style={null}>hello world</div>
      <div show={true} style={undefined}>hello world</div>
      <div show={true} style={0}>hello world</div>
      <div show={true}>hello world</div>
      <div show={true} style="">hello world</div>
      <div show={true} style=" ">hello world</div>
      <div show={true} style>hello world</div>
      <div show={true}>hello world</div>
    </div>
  )
}

export default Hello
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup, vapor, _$createElement, _$createTextNode, _$setStyle, _$appendChild, watchEffect } from '@rue-js/rue';
const Hello: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const color = _$vaporWithHookId("ref:1:0", ()=>ref("blue"));
        return {
            color: color
        };
    }));
    const { color: color } = _$useSetup;
    return vapor(()=>{
        const _root = _$createElement("div");
        const _el1 = _$createElement("div");
        _$appendChild(_root, _el1);
        _$setStyle(_el1, {
            fontWeight: 'bold',
            color: 'red',
            display: ""
        });
        _$appendChild(_el1, _$createTextNode("hello world"));
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        _$setStyle(_el2, "color:blue;");
        _$appendChild(_el2, _$createTextNode("hello world"));
        const _el3 = _$createElement("div");
        _$appendChild(_root, _el3);
        watchEffect(()=>{
            const _el3_style = ("color:" + color.value + ";");
            _$setStyle(_el3, _el3_style);
        });
        _$appendChild(_el3, _$createTextNode("hello world"));
        const _el4 = _$createElement("div");
        _$appendChild(_root, _el4);
        _$setStyle(_el4, {
            display: ""
        });
        _$appendChild(_el4, _$createTextNode("hello world"));
        const _el5 = _$createElement("div");
        _$appendChild(_root, _el5);
        _$setStyle(_el5, {
            display: ""
        });
        _$appendChild(_el5, _$createTextNode("hello world"));
        const _el6 = _$createElement("div");
        _$appendChild(_root, _el6);
        _$setStyle(_el6, {
            display: ""
        });
        _$appendChild(_el6, _$createTextNode("hello world"));
        const _el7 = _$createElement("div");
        _$appendChild(_root, _el7);
        _$setStyle(_el7, {
            display: ""
        });
        _$appendChild(_el7, _$createTextNode("hello world"));
        const _el8 = _$createElement("div");
        _$appendChild(_root, _el8);
        _$setStyle(_el8, "");
        _$appendChild(_el8, _$createTextNode("hello world"));
        const _el9 = _$createElement("div");
        _$appendChild(_root, _el9);
        _$setStyle(_el9, " ");
        _$appendChild(_el9, _$createTextNode("hello world"));
        const _el10 = _$createElement("div");
        _$appendChild(_root, _el10);
        _$setStyle(_el10, "");
        _$appendChild(_el10, _$createTextNode("hello world"));
        const _el11 = _$createElement("div");
        _$appendChild(_root, _el11);
        _$setStyle(_el11, {
            display: ""
        });
        _$appendChild(_el11, _$createTextNode("hello world"));
        return {
            vaporElement: _root
        };
    });
};
export default Hello;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec18.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
