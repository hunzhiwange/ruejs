//! 条件渲染转换测试（React 风格，变体 2）
//!
//! 覆盖：ref 状态驱动的 ?: 分支切换与按钮事件更新。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_conditional_jsx_branch2() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const ReactConditionalDemo: FC = () => {
   const show = ref(true)
   const level = ref(1)
   const message = ref('Hello')

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
        <button
          className="rounded-lg border border-blue-500 bg-blue-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-blue-700 hover:bg-blue-700 focus:ring focus:ring-blue-200"
          onClick={() => level.value++}
        >
          等级+1
        </button>
        <button
          className="rounded-lg border border-gray-500 bg-gray-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-700 hover:bg-gray-700 focus:ring focus:ring-gray-200"
          onClick={() => (message.value = message.value ? '' : 'Hello')}
        >
          {message.value ? <span className="text-red-600">清空消息</span> : '恢复消息'}
        </button>
      </div>

      {show.value ? (
        <div className="mt-2">
          <p className="text-gray-700">详情区域：仅在 show 为 true 时显示</p>
        </div>
      ) : null}

     {show.value &&
        <div className="mt-2">
          <p className="text-gray-700">详情区域2：仅在 show 为 true 时显示</p>
        </div>}

      <p className="text-gray-700">等级状态：{level.value >= 3 ? <span className="text-red-600">高级</span> : <span className="text-green-600">普通</span>}</p>
      {message.value ? <p className="text-gray-700 bg-gray-100 p-2 rounded-md">消息：{message.value}</p> : null}
    </div>
  )
}

export default ReactConditionalDemo;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$createTextWrapper, _$vaporCreateVNode, _$addEventListener, _$setClassName } from '@rue-js/rue';
const ReactConditionalDemo: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const show = _$vaporWithHookId("ref:1:0", ()=>ref(true));
            const level = _$vaporWithHookId("ref:1:1", ()=>ref(1));
            const message = _$vaporWithHookId("ref:1:2", ()=>ref('Hello'));
            return {
                show: show,
                level: level,
                message: message
            };
        }));
    const { show: show, level: level, message: message } = _$useSetup;
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
        const _el5 = _$createElement("button");
        _$appendChild(_el2, _el5);
        _$setClassName(_el5, "rounded-lg border border-blue-500 bg-blue-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-blue-700 hover:bg-blue-700 focus:ring focus:ring-blue-200");
        _$addEventListener(_el5, "click", (()=>level.value++));
        _$appendChild(_el5, _$createTextNode("等级+1"));
        const _el6 = _$createElement("button");
        _$appendChild(_el2, _el6);
        _$setClassName(_el6, "rounded-lg border border-gray-500 bg-gray-500 px-5 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all hover:border-gray-700 hover:bg-gray-700 focus:ring focus:ring-gray-200");
        _$addEventListener(_el6, "click", (()=>(message.value = message.value ? '' : 'Hello')));
        const _list1 = _$createComment("rue:slot:start");
        const _list2 = _$createComment("rue:slot:end");
        _$appendChild(_el6, _list1);
        _$appendChild(_el6, _list2);
        watchEffect(()=>{
            const __slot = message.value ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el7 = _$createElement("span");
                _$appendChild(_root, _el7);
                _$setClassName(_el7, "text-red-600");
                _$appendChild(_el7, _$createTextNode("清空消息"));
                return {
                    vaporElement: _root
                };
            }) : '恢复消息';
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _el6, _list1, _list2);
        });
        const _list3 = _$createComment("rue:slot:start");
        const _list4 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list3);
        _$appendChild(_root, _list4);
        watchEffect(()=>{
            const __slot = show.value ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el8 = _$createElement("div");
                _$appendChild(_root, _el8);
                _$setClassName(_el8, "mt-2");
                const _el9 = _$createElement("p");
                _$appendChild(_el8, _el9);
                _$setClassName(_el9, "text-gray-700");
                _$appendChild(_el9, _$createTextNode("详情区域：仅在 show 为 true 时显示"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list3, _list4);
        });
        _$appendChild(_root, _$createTextNode(" "));
        const _list5 = _$createComment("rue:slot:start");
        const _list6 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list5);
        _$appendChild(_root, _list6);
        watchEffect(()=>{
            const __slot = show.value ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el10 = _$createElement("div");
                _$appendChild(_root, _el10);
                _$setClassName(_el10, "mt-2");
                const _el11 = _$createElement("p");
                _$appendChild(_el10, _el11);
                _$setClassName(_el11, "text-gray-700");
                _$appendChild(_el11, _$createTextNode("详情区域2：仅在 show 为 true 时显示"));
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list5, _list6);
        });
        const _el12 = _$createElement("p");
        _$appendChild(_root, _el12);
        _$setClassName(_el12, "text-gray-700");
        _$appendChild(_el12, _$createTextNode("等级状态："));
        const _list7 = _$createComment("rue:slot:start");
        const _list8 = _$createComment("rue:slot:end");
        _$appendChild(_el12, _list7);
        _$appendChild(_el12, _list8);
        watchEffect(()=>{
            const __slot = level.value >= 3 ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el13 = _$createElement("span");
                _$appendChild(_root, _el13);
                _$setClassName(_el13, "text-red-600");
                _$appendChild(_el13, _$createTextNode("高级"));
                return {
                    vaporElement: _root
                };
            }) : vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el14 = _$createElement("span");
                _$appendChild(_root, _el14);
                _$setClassName(_el14, "text-green-600");
                _$appendChild(_el14, _$createTextNode("普通"));
                return {
                    vaporElement: _root
                };
            });
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _el12, _list7, _list8);
        });
        const _list9 = _$createComment("rue:slot:start");
        const _list10 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list9);
        _$appendChild(_root, _list10);
        watchEffect(()=>{
            const __slot = message.value ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el15 = _$createElement("p");
                _$appendChild(_root, _el15);
                _$setClassName(_el15, "text-gray-700 bg-gray-100 p-2 rounded-md");
                _$appendChild(_el15, _$createTextNode("消息："));
                const _el16 = _$createTextWrapper(_el15);
                _$appendChild(_el15, _el16);
                watchEffect(()=>{
                    _$settextContent(_el16, message.value);
                });
                return {
                    vaporElement: _root
                };
            }) : "";
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list9, _list10);
        });
        return {
            vaporElement: _root
        };
    });
};
export default ReactConditionalDemo;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/conditional_rendering2.out.js", utils::strip_marker(&out))
        .ok();
    assert_eq!(
        utils::normalize(&utils::strip_marker(&out)),
        utils::normalize(&utils::strip_marker(expected_fragment))
    );
}
