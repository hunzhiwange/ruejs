//! JSX 属性与 props 的转换与保留策略测试
//!
//! 覆盖：className、style、可选 props、路由链接等在编译期的重写行为。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_attributes_and_props() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const Badge: FC<{ label: string; color?: string }> = (props) => (
  <span className="px-2 py-1 rounded-md" style={{ backgroundColor: props.color ?? '#eee' }}>
    {props.label}
  </span>
);

const AttributesAndProps: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold">属性、className、style 与 Props</h3>
    <div id="box" className="border p-2">className 与 id</div>
    <div style={{ color: 'tomato', fontWeight: 'bold' }}>内联样式对象</div>
    <Badge label="默认" />
    <Badge label="自定义色" color="#cde" />
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default AttributesAndProps;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, vapor, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$setStyle, _$appendChild, watchEffect, _$vaporCreateVNode, _$setAttribute, _$addEventListener, _$setClassName } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const Badge: FC<{
    label: string;
    color?: string;
}> = (props)=>vapor(()=>{
        const _root = _$createElement("span");
        _$setClassName(_root, "px-2 py-1 rounded-md");
        watchEffect(()=>{
            const _root_style = ({
                backgroundColor: props.color ?? '#eee'
            });
            _$setStyle(_root, _root_style);
        });
        const _list1 = _$createComment("rue:slot:anchor");
        _$appendChild(_root, _list1);
        watchEffect(()=>{
            const __slot = (props.label);
            const __vnode = _$vaporCreateVNode(__slot);
            renderAnchor(__vnode, _root, _list1);
        });
        return {
            vaporElement: _root
        };
    });
const AttributesAndProps: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold");
        _$appendChild(_el1, _$createTextNode("属性、className、style 与 Props"));
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        _$setAttribute(_el2, "id", "box");
        _$setClassName(_el2, "border p-2");
        _$appendChild(_el2, _$createTextNode("className 与 id"));
        const _el3 = _$createElement("div");
        _$appendChild(_root, _el3);
        _$setStyle(_el3, {
            color: 'tomato',
            fontWeight: 'bold'
        });
        _$appendChild(_el3, _$createTextNode("内联样式对象"));
        const _list2 = _$createComment("rue:component:anchor");
        _$appendChild(_root, _list2);
        const __slot3 = <Badge label="默认"/>;
        renderAnchor(__slot3, _root, _list2);
        const _list4 = _$createComment("rue:component:anchor");
        _$appendChild(_root, _list4);
        const __slot5 = <Badge label="自定义色" color="#cde"/>;
        renderAnchor(__slot5, _root, _list4);
        const _el4 = _$createElement("a");
        _$appendChild(_root, _el4);
        watchEffect(()=>{
            _$setAttribute(_el4, "href", String(RouterLink.__rueHref("/jsx")));
        });
        _$addEventListener(_el4, "click", ((e)=>RouterLink.__rueOnClick(e, "/jsx", false)));
        _$setClassName(_el4, "text-blue-600 hover:underline");
        _$appendChild(_el4, _$createTextNode("返回目录"));
        return {
            vaporElement: _root
        };
    });
export default AttributesAndProps;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/attributes_and_props.out.js", utils::strip_marker(&out))
        .ok();
    assert_eq!(
        utils::normalize(&utils::strip_marker(&out)),
        utils::normalize(&utils::strip_marker(expected_fragment))
    );
}
