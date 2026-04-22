//! children 与插槽相关转换测试
//!
//! 覆盖：props.children、嵌套 children、多层 Box 组件下的插槽展开。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_props_children_fragment1() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Box: FC<{ title: string }> = (props) => (
  <div className="border p-2 rounded-md space-y-1">
    <div className="font-semibold">{props.title}</div>
    <div>{props.children}</div>
  </div>
);

const Children: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold">children 插槽与嵌套</h3>
    <Box title="外层">
      <Box title="内层">
        <span>嵌套子元素</span>
      </Box>
    </Box>
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default Children;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, vapor, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$createTextWrapper, _$vaporCreateVNode, _$setAttribute, _$addEventListener, _$setClassName } from '@rue-js/rue';
const Box: FC<{
    title: string;
}> = (props)=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "border p-2 rounded-md space-y-1");
        const _el1 = _$createElement("div");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "font-semibold");
        const _el2 = _$createTextWrapper(_el1);
        _$appendChild(_el1, _el2);
        watchEffect(()=>{
            _$settextContent(_el2, props.title);
        });
        const _el3 = _$createElement("div");
        _$appendChild(_root, _el3);
        const _list1 = _$createComment("rue:children:anchor");
        _$appendChild(_el3, _list1);
        watchEffect(()=>{
            const __slot = (props.children);
            const __vnode = _$vaporCreateVNode(__slot);
            renderAnchor(__vnode, _el3, _list1);
        });
        return {
            vaporElement: _root
        };
    });
const Children: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el4 = _$createElement("h3");
        _$appendChild(_root, _el4);
        _$setClassName(_el4, "text-xl font-semibold");
        _$appendChild(_el4, _$createTextNode("children 插槽与嵌套"));
        const _list4 = _$createComment("rue:component:anchor");
        _$appendChild(_root, _list4);
        const __child1 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _list2 = _$createComment("rue:component:anchor");
            _$appendChild(_root, _list2);
            const __child2 = vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el5 = _$createElement("span");
                _$appendChild(_root, _el5);
                _$appendChild(_el5, _$createTextNode("嵌套子元素"));
                return {
                    vaporElement: _root
                };
            });
            const __slot3 = <Box title="内层" children={__child2}/>;
            renderAnchor(__slot3, _root, _list2);
            return {
                vaporElement: _root
            };
        });
        const __slot5 = <Box title="外层" children={__child1}/>;
        renderAnchor(__slot5, _root, _list4);
        const _el6 = _$createElement("a");
        _$appendChild(_root, _el6);
        watchEffect(()=>{
            _$setAttribute(_el6, "href", String(RouterLink.__rueHref("/jsx")));
        });
        _$addEventListener(_el6, "click", ((e)=>RouterLink.__rueOnClick(e, "/jsx", false)));
        _$setClassName(_el6, "text-blue-600 hover:underline");
        _$appendChild(_el6, _$createTextNode("返回目录"));
        return {
            vaporElement: _root
        };
    });
export default Children;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/children.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
