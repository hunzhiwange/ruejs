//! 受控输入转换测试（value/onInput 与文本回显）
//!
//! 覆盖：受控 input 的值绑定、事件更新、文本回显的 watch 包装与内容设置。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_controlled_inputs_tsx() {
    let src = r##"
import { type FC, useState } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const ControlledInputs: FC = () => {
  const [text, setText] = useState('');
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
      <h3 className="text-xl font-semibold">受控输入</h3>
      <input
        className="border rounded-md px-2 py-1"
        value={text.value}
        onInput={(e) => setText((e.target as HTMLInputElement).value)}
        placeholder="输入试试"
      />
      <div>当前：{text.value}</div>
      <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
    </div>
  );
};

export default ControlledInputs;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "ControlledInputs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 期望输出要点对照：
    // - 受控 input：value 走 watch；onInput 绑定更新 state
    // - 文本回显：_$createTextWrapper + _$settextContent + watch
    let expected_fragment = r##"
import { type FC, useState, _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$appendChild, watchEffect, _$createTextWrapper, _$setAttribute, _$addEventListener, _$setClassName, _$setValue } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const ControlledInputs: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const [text, setText] = _$vaporWithHookId("useState:1:0", ()=>useState(''));
            return {
                text: text,
                setText: setText
            };
        }));
    const { text: text, setText: setText } = _$useSetup;
    return vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold");
        _$appendChild(_el1, _$createTextNode("受控输入"));
        const _el2 = _$createElement("input");
        _$appendChild(_root, _el2);
        _$setClassName(_el2, "border rounded-md px-2 py-1");
        watchEffect(()=>{
            _$setValue(_el2, text.value);
        });
        _$addEventListener(_el2, "input", ((e)=>setText((e.target as HTMLInputElement).value)));
        _$setAttribute(_el2, "placeholder", "输入试试");
        const _el3 = _$createElement("div");
        _$appendChild(_root, _el3);
        _$appendChild(_el3, _$createTextNode("当前："));
        const _el4 = _$createTextWrapper(_el3);
        _$appendChild(_el3, _el4);
        watchEffect(()=>{
            _$settextContent(_el4, text.value);
        });
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
};
export default ControlledInputs;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/controlled_inputs.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
