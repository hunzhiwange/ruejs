//! 对象展开属性（spread props）转换测试
//!
//! 覆盖：组件 props 上的多次展开、className/text 合并顺序与编译结果。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_spread_props() {
    let src = r##"
import { type FC } from 'rue-js';
import { RouterLink } from 'rue-router';

const Button: FC<{ text: string; className?: string }> = (props) => (
  <button className={props.className}>{props.text}</button>
);

const SpreadProps: FC = () => {
  const base = { className: 'px-3 py-2 rounded-md bg-blue-600 text-white' };
  const extra = { text: '我是一个按钮哈' };
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
      <h3 className="text-xl font-semibold">对象展开属性（spread props）</h3>
      <Button {...base} {...extra} />
      <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
    </div>
  );
};

export default SpreadProps;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$appendChild, watchEffect, _$vaporCreateVNode, _$setClassName } from 'rue-js';
import { RouterLink } from 'rue-router';
const Button: FC<{
    text: string;
    className?: string;
}> = (props)=>vapor(()=>{
        const _root = _$createElement("button");
        watchEffect(()=>{
            _$setClassName(_root, String((props.className)));
        });
        const _list1 = _$createComment("rue:slot:start");
        const _list2 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        watchEffect(()=>{
            const __slot = (props.text);
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list1, _list2);
        });
        return {
            vaporElement: _root
        };
    });
const SpreadProps: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const base = {
                className: 'px-3 py-2 rounded-md bg-blue-600 text-white'
            };
            const extra = {
                text: '我是一个按钮哈'
            };
            return {
                base: base,
                extra: extra
            };
        }));
    const { base: base, extra: extra } = _$useSetup;
    return vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold");
        _$appendChild(_el1, _$createTextNode("对象展开属性（spread props）"));
        const _list3 = _$createComment("rue:component:start");
        const _list4 = _$createComment("rue:component:end");
        _$appendChild(_root, _list3);
        _$appendChild(_root, _list4);
        watchEffect(()=>{
            const __slot5 = <Button {...base} {...extra}/>;
            renderBetween(__slot5, _root, _list3, _list4);
        });
        const _list6 = _$createComment("rue:component:start");
        const _list7 = _$createComment("rue:component:end");
        _$appendChild(_root, _list6);
        _$appendChild(_root, _list7);
        const __child1 = "返回目录";
        const __slot8 = <RouterLink to="/jsx" className="text-blue-600 hover:underline" children={__child1}/>;
        renderBetween(__slot8, _root, _list6, _list7);
        return {
            vaporElement: _root
        };
    });
};
export default SpreadProps;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spread_props.out.js", utils::strip_marker(&out)).ok();
    assert_eq!(
        utils::normalize(&utils::strip_marker(&out)),
        utils::normalize(&utils::strip_marker(expected_fragment))
    );
}
