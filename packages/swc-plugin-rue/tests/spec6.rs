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

    let expected_fragment = r##"
import { _$vaporWithHookId, vapor, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$createTextWrapper, _$setAttribute } from "@rue-js/rue/vapor";
import { type FC, ref, h } from '@rue-js/rue';
const count = _$vaporWithHookId("ref:1:0", ()=>ref(22));
const Comp: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        const _list1 = _$createComment("rue:slot:anchor");
        _$appendChild(_root, _list1);
        watchEffect(()=>{
            const __slot = count.value === 0 ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el1 = _$createElement("p");
                _$appendChild(_root, _el1);
                _$setAttribute(_el1, "id", "empty");
                _$appendChild(_el1, _$createTextNode("empty"));
                return _root;
            }) : vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el2 = _$createElement("ul");
                _$appendChild(_root, _el2);
                const _el3 = _$createElement("li");
                _$appendChild(_el2, _el3);
                _$appendChild(_el3, _$createTextNode("ok"));
                return _root;
            });
            renderAnchor(__slot, _root, _list1);
        });
        const _el4 = _$createElement("span");
        _$appendChild(_root, _el4);
        _$setAttribute(_el4, "id", "n");
        const _el5 = _$createTextWrapper(_el4);
        _$appendChild(_el4, _el5);
        watchEffect(()=>{
            _$settextContent(_el5, count.value);
        });
        return _root;
    });
export default Comp;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec6.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
