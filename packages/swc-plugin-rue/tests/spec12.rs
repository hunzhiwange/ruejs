//! SWC 插件转换行为测试（spec12）
//!
//! 覆盖：style 标签与模板字符串、className 与子元素的转换。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec12() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Hello: FC = () => {
  return (
      <>
      <style>{`
.rue-parent h3{ background: #42b983; padding: 10px; color: white; }
`}</style>
      <div className="rue-parent">
        <h3 className="text-xl font-semibold mb-3">hello</h3>
        <span>world</span>
      </div>
    </>
  )
}

export default Hello
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, vapor, _$createElement, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$setClassName } from '@rue-js/rue';
const Hello: FC = ()=>{
    return vapor(()=>{
        const _root = _$createDocumentFragment();
        const _el1 = _$createElement("style");
        _$appendChild(_root, _el1);
        watchEffect(()=>{
            _$settextContent(_el1, `
.rue-parent h3{ background: #42b983; padding: 10px; color: white; }
`);
        });
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        _$setClassName(_el2, "rue-parent");
        const _el3 = _$createElement("h3");
        _$appendChild(_el2, _el3);
        _$setClassName(_el3, "text-xl font-semibold mb-3");
        _$appendChild(_el3, _$createTextNode("hello"));
        const _el4 = _$createElement("span");
        _$appendChild(_el2, _el4);
        _$appendChild(_el4, _$createTextNode("world"));
        return {
            vaporElement: _root
        };
    });
};
export default Hello;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec12.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
