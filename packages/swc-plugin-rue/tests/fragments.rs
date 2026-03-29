//! 片段（Fragment）转换测试
//!
//! 覆盖：<>...</> 展开为顺序插入的子节点，以及组件插入的锚点管理。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_fragments_tsx() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const Fragments: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold mb-2">Fragments</h3>
    <>
      <span>片段 1</span>
      <span>片段 2</span>
    </>
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default Fragments;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 输出到目标目录便于调试
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/fragments.out.js", utils::strip_marker(&out)).ok();

    // 期望输出要点对照：
    // - 片段：<>...</> 被展开为两个 span 节点顺序插入
    // - 组件：使用注释锚点占位并 renderBetween 插入 RouterLink
    let expected = r##"
import { type FC, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$appendChild, _$setClassName } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const Fragments: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold mb-2");
        _$appendChild(_el1, _$createTextNode("Fragments"));
        const _el2 = _$createElement("span");
        _$appendChild(_root, _el2);
        _$appendChild(_el2, _$createTextNode("片段 1"));
        const _el3 = _$createElement("span");
        _$appendChild(_root, _el3);
        _$appendChild(_el3, _$createTextNode("片段 2"));
        const _list1 = _$createComment("rue:component:start");
        const _list2 = _$createComment("rue:component:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        const __child1 = "返回目录";
        const __slot3 = <RouterLink to="/jsx" className="text-blue-600 hover:underline" children={__child1}/>;
        renderBetween(__slot3, _root, _list1, _list2);
        return {
            vaporElement: _root
        };
    });
export default Fragments;
"##;

    let norm_out = utils::normalize(&utils::strip_marker(&out));
    let norm_exp = utils::normalize(&utils::strip_marker(expected));
    assert_eq!(norm_out, norm_exp, "Fragments.tsx should transform as expected");
}
