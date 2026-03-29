//! SWC 插件转换行为测试（spec3）
//!
//! 覆盖：组件与插槽的组合用例。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec3() {
    let src = r##"
import { type FC, ref, h, Fragment } from 'rue-js';
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

    let expected_fragment = r##"
import { type FC, ref, h, Fragment, _$vaporWithHookId, vapor, renderBetween, _$createElement, _$createComment, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$createTextWrapper, _$setAttribute } from 'rue-js';
const count = _$vaporWithHookId("ref:1:0", ()=>ref(0));
const Comp: FC = ()=>vapor(()=>{
        const _root = _$createDocumentFragment();
        const _list1 = _$createComment("rue:component:start");
        const _list2 = _$createComment("rue:component:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        const __child1 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _el1 = _$createElement("span");
            _$appendChild(_root, _el1);
            _$setAttribute(_el1, "id", "n");
            const _el2 = _$createTextWrapper(_el1);
            _$appendChild(_el1, _el2);
            watchEffect(()=>{
                _$settextContent(_el2, count.value);
            });
            return {
                vaporElement: _root
            };
        });
        const __slot3 = <Fragment children={__child1}/>;
        renderBetween(__slot3, _root, _list1, _list2);
        return {
            vaporElement: _root
        };
    });
export default Comp;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec3.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
