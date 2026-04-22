//! SWC 插件转换行为测试（basic）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_classname_and_text() {
    // 输入包含静态属性、文本节点与组件子节点
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const BasicElements: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold">基础元素与自闭合标签</h3>
    <div>div 元素</div>
    <span>span 元素</span>
    <br />
    <img src="https://via.placeholder.com/80" alt="占位图" />
    <input placeholder="自闭合 input" />
    <p>支持文本、嵌套与自闭合形式</p>
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default BasicElements;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 期望输出要点对照：
    // - 导入：vapor/renderBetween/_$createElement/_$appendChild/_$createComment/_$createTextNode
    // - 元素：根 div 与一系列自闭合/嵌套元素的创建与插入
    // - 属性：className → setAttribute("class", ...)
    // - 文本：使用 _$createTextNode 一次性插入静态文本
    // - 组件：使用注释锚点 + renderBetween 进行插槽渲染
    let expected_fragment = r##"
import { type FC, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$appendChild, _$setAttribute, _$setClassName } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const BasicElements: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold");
        _$appendChild(_el1, _$createTextNode("基础元素与自闭合标签"));
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        _$appendChild(_el2, _$createTextNode("div 元素"));
        const _el3 = _$createElement("span");
        _$appendChild(_root, _el3);
        _$appendChild(_el3, _$createTextNode("span 元素"));
        const _el4 = _$createElement("br");
        _$appendChild(_root, _el4);
        const _el5 = _$createElement("img");
        _$appendChild(_root, _el5);
        _$setAttribute(_el5, "src", "https://via.placeholder.com/80");
        _$setAttribute(_el5, "alt", "占位图");
        const _el6 = _$createElement("input");
        _$appendChild(_root, _el6);
        _$setAttribute(_el6, "placeholder", "自闭合 input");
        const _el7 = _$createElement("p");
        _$appendChild(_root, _el7);
        _$appendChild(_el7, _$createTextNode("支持文本、嵌套与自闭合形式"));
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
export default BasicElements;
"##;

    // 为兼容存在或不存在的标记注释，这里剔除标记行再比较
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/basic_elements.out.js", utils::strip_marker(&out)).ok();
    println!("OUT=\n{}", utils::strip_marker(&out));
    assert_eq!(
        utils::normalize(&utils::strip_marker(&out)),
        utils::normalize(&utils::strip_marker(expected_fragment))
    );
}

#[test]
fn transforms_expressions() {
    // 表达式插值与组件渲染
    let src = r#"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const n = 7;
const user = { name: 'Alice', age: 20 };

const Expressions: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold">表达式与插值</h3>
    <div>{1 + 2}</div>
    <div>{`hello ${user.name}`}</div>
    <div>{n > 5 ? '大于5' : '不大于5'}</div>
    <div>{['A', 'B'].join(',')}</div>
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default Expressions;
"#;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$appendChild, watchEffect, _$createTextWrapper, _$setClassName } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const n = 7;
const user = {
    name: 'Alice',
    age: 20
};
const Expressions: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold");
        _$appendChild(_el1, _$createTextNode("表达式与插值"));
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        const _el3 = _$createTextWrapper(_el2);
        _$appendChild(_el2, _el3);
        watchEffect(()=>{
            _$settextContent(_el3, 1 + 2);
        });
        const _el4 = _$createElement("div");
        _$appendChild(_root, _el4);
        const _el5 = _$createTextWrapper(_el4);
        _$appendChild(_el4, _el5);
        watchEffect(()=>{
            _$settextContent(_el5, `hello ${user.name}`);
        });
        const _el6 = _$createElement("div");
        _$appendChild(_root, _el6);
        const _el7 = _$createTextWrapper(_el6);
        _$appendChild(_el6, _el7);
        watchEffect(()=>{
            _$settextContent(_el7, n > 5 ? '大于5' : '不大于5');
        });
        const _el8 = _$createElement("div");
        _$appendChild(_root, _el8);
        const _el9 = _$createTextWrapper(_el8);
        _$appendChild(_el8, _el9);
        watchEffect(()=>{
            _$settextContent(_el9, [
                'A',
                'B'
            ].join(','));
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
export default Expressions;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/expressions.out.js", utils::strip_marker(&out)).ok();
    assert_eq!(
        utils::normalize(&utils::strip_marker(&out)),
        utils::normalize(&utils::strip_marker(expected_fragment))
    );
}

#[test]
fn transforms_root_router_link_as_static_component() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const RootRouterLink: FC = () => (
  <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
);

export default RootRouterLink;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, vapor, renderBetween, _$createComment, _$createDocumentFragment, _$appendChild } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const RootRouterLink: FC = ()=>vapor(()=>{
        const _root = _$createDocumentFragment();
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
export default RootRouterLink;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/root_router_link.out.js", utils::strip_marker(&out)).ok();

    assert_eq!(
        utils::normalize(&utils::strip_marker(&out)),
        utils::normalize(&utils::strip_marker(expected_fragment))
    );
}

#[test]
fn transforms_router_link_in_expr_container_as_static_component() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const InlineRouterLinkExpr: FC = () => (
  <div className="wrap">
    {<RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>}
  </div>
);

export default InlineRouterLinkExpr;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, vapor, renderBetween, _$createElement, _$createComment, _$createDocumentFragment, _$appendChild, _$vaporCreateVNode, _$setClassName } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const InlineRouterLinkExpr: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "wrap");
        const _list1 = _$createComment("rue:slot:start");
        const _list2 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        const __slot6 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _list3 = _$createComment("rue:component:start");
            const _list4 = _$createComment("rue:component:end");
            _$appendChild(_root, _list3);
            _$appendChild(_root, _list4);
            const __child1 = "返回目录";
            const __slot5 = <RouterLink to="/jsx" className="text-blue-600 hover:underline" children={__child1}/>;
            renderBetween(__slot5, _root, _list3, _list4);
            return {
                vaporElement: _root
            };
        });
        renderBetween(_$vaporCreateVNode(__slot6), _root, _list1, _list2);
        return {
            vaporElement: _root
        };
    });
export default InlineRouterLinkExpr;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/inline_router_link_expr.out.js",
        utils::strip_marker(&out),
    )
    .ok();

    assert_eq!(
        utils::normalize(&utils::strip_marker(&out)),
        utils::normalize(&utils::strip_marker(expected_fragment))
    );
}
