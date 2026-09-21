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

    let _expected_fragment = r##"
import { _$createElement, _$template, _$settextContent, _$createDocumentFragment, _$appendChild, _$compiledCreateTextNode } from "@rue-js/rue/internal/dom";
import { effect } from "@rue-js/rue/internal/reactive";
import { _$compiledRoot } from "@rue-js/rue/internal/block";
import { type FC } from '@rue-js/rue';
const _$getTemplate1 = _$template('<div class="rue-parent"><h3 class="text-xl font-semibold mb-3">hello</h3><span>world</span></div>');
const Hello: FC = ()=>{
    return _$compiledRoot((__rue_parent_context)=>{
        const _root = _$createDocumentFragment();
        const _el1 = _$createElement("style", _root);
        _$appendChild(_root, _el1);
        effect(()=>{
            _$settextContent(_el1, `
.rue-parent h3{ background: #42b983; padding: 10px; color: white; }
`);
        });
        _root.appendChild(_$getTemplate1().content.cloneNode(true));
        const __rue_first = _$compiledCreateTextNode("");
        const __rue_last = _$compiledCreateTextNode("");
        _root.insertBefore(__rue_first, _root.firstChild);
        _root.appendChild(__rue_last);
        return [
            _root.firstChild,
            _root.lastChild
        ];
    });
};
export default Hello;"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec12.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$compiledCreateElement(\"style\""), "{normalized}");
    assert!(normalized.contains("_$compiledText"), "{normalized}");
    assert!(normalized.contains(".rue-parent h3"), "{normalized}");
    assert!(normalized.contains("_$getTemplate1().content.cloneNode(true)"), "{normalized}");
}
