//! 条件渲染转换测试（React 风格，变体 3）
//!
//! 覆盖：ref 状态控制下的嵌套三元渲染与 true 兜底。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_conditional_jsx_branch3() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const ReactConditionalDemo: FC = () => {
   const show = ref(true)

  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-purple-600 mb-3">React 风格条件渲染</h2>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          className="rounded-lg border border-gray-700 bg-gray-700 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-900 hover:bg-gray-900 focus:ring focus:ring-gray-200"
          onClick={() => (show.value = !show.value)}
        >
          {show.value ? '隐藏详情' : '显示详情'}
        </button>
      </div>

      {show.value ? (
        <div className="mt-2">
          <p className="text-gray-700">详情区域：仅在 show 为 true 时显示</p>
        </div>
      ) : true}

      {show.value ? (
        <div className="mt-2">
          <p className="text-gray-700">详情区域：仅在 show 为 true 时显示</p>
        </div>
      ) : false}

      {show.value ? (
        <div className="mt-2">
          <p className="text-gray-700">详情区域：仅在 show 为 true 时显示</p>
        </div>
      ) : undefined}
    </div>
  )
}

export default ReactConditionalDemo;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { _$vaporWithHookId, useSetup, vapor, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$createTextWrapper, _$addEventListener, _$setClassName } from "@rue-js/rue/vapor";
import { type FC, ref } from '@rue-js/rue';
const ReactConditionalDemo: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const show = _$vaporWithHookId("ref:1:0", ()=>ref(true));
            return {
                show: show
            };
        }));
    const { show: show } = _$useSetup;
    return vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-2xl mx-auto p-6 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h2");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold text-purple-600 mb-3");
        _$appendChild(_el1, _$createTextNode("React 风格条件渲染"));
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        _$setClassName(_el2, "flex flex-wrap justify-center gap-2");
        const _el3 = _$createElement("button");
        _$appendChild(_el2, _el3);
        _$setClassName(_el3, "rounded-lg border border-gray-700 bg-gray-700 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-900 hover:bg-gray-900 focus:ring focus:ring-gray-200");
        _$addEventListener(_el3, "click", (()=>(show.value = !show.value)));
        const _el4 = _$createTextWrapper(_el3);
        _$appendChild(_el3, _el4);
        watchEffect(()=>{
            _$settextContent(_el4, show.value ? '隐藏详情' : '显示详情');
        });
        const _list1 = _$createComment("rue:slot:anchor");
        _$appendChild(_root, _list1);
        watchEffect(()=>{
            const __slot = show.value ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el5 = _$createElement("div");
                _$appendChild(_root, _el5);
                _$setClassName(_el5, "mt-2");
                const _el6 = _$createElement("p");
                _$appendChild(_el5, _el6);
                _$setClassName(_el6, "text-gray-700");
                _$appendChild(_el6, _$createTextNode("详情区域：仅在 show 为 true 时显示"));
                return _root;
            }) : "";
            renderAnchor(__slot, _root, _list1);
        });
        _$appendChild(_root, _$createTextNode(" "));
        const _list2 = _$createComment("rue:slot:anchor");
        _$appendChild(_root, _list2);
        watchEffect(()=>{
            const __slot = show.value ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el7 = _$createElement("div");
                _$appendChild(_root, _el7);
                _$setClassName(_el7, "mt-2");
                const _el8 = _$createElement("p");
                _$appendChild(_el7, _el8);
                _$setClassName(_el8, "text-gray-700");
                _$appendChild(_el8, _$createTextNode("详情区域：仅在 show 为 true 时显示"));
                return _root;
            }) : "";
            renderAnchor(__slot, _root, _list2);
        });
        _$appendChild(_root, _$createTextNode(" "));
        const _list3 = _$createComment("rue:slot:anchor");
        _$appendChild(_root, _list3);
        watchEffect(()=>{
            const __slot = show.value ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el9 = _$createElement("div");
                _$appendChild(_root, _el9);
                _$setClassName(_el9, "mt-2");
                const _el10 = _$createElement("p");
                _$appendChild(_el9, _el10);
                _$setClassName(_el10, "text-gray-700");
                _$appendChild(_el10, _$createTextNode("详情区域：仅在 show 为 true 时显示"));
                return _root;
            }) : "";
            renderAnchor(__slot, _root, _list3);
        });
        return _root;
    });
};
export default ReactConditionalDemo;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/conditional_rendering3.out.js", utils::strip_marker(&out))
        .ok();
    assert_eq!(
        utils::normalize(&utils::strip_marker(&out)),
        utils::normalize(&utils::strip_marker(expected_fragment))
    );
}
