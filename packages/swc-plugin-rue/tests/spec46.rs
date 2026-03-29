//! SWC 插件转换行为测试（spec46）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec46() {
    let src = r##"
import { type FC, useError, useApp } from '@rue-js/rue'
import { RouterView } from '@rue-js/router'
import router from './router'

useError({ overlay: true, console: true })

const ParentBox: FC = (p) => (
  <div>
    <div>title</div>
    <div className="container mx-auto">
      {p.children}
    </div>
  </div>
)

const RootApp: FC = () => {
  return (
    <ParentBox>
      <RouterView />
    </ParentBox>
  )
}

useApp(RootApp).use(router).mount('#app')
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, useError, useApp, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$createDocumentFragment, _$appendChild, watchEffect, _$vaporCreateVNode, _$setClassName } from '@rue-js/rue';
import { RouterView } from '@rue-js/router';
import router from './router';
useError({
    overlay: true,
    console: true
});
const ParentBox: FC = (p)=>vapor(()=>{
        const _root = _$createElement("div");
        const _el1 = _$createElement("div");
        _$appendChild(_root, _el1);
        _$appendChild(_el1, _$createTextNode("title"));
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        _$setClassName(_el2, "container mx-auto");
        const _list1 = _$createComment("rue:children:start");
        const _list2 = _$createComment("rue:children:end");
        _$appendChild(_el2, _list1);
        _$appendChild(_el2, _list2);
        watchEffect(()=>{
            const __slot = (p.children);
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _el2, _list1, _list2);
        });
        return {
            vaporElement: _root
        };
    });
const RootApp: FC = ()=>{
    return vapor(()=>{
        const _root = _$createDocumentFragment();
        const _list3 = _$createComment("rue:component:start");
        const _list4 = _$createComment("rue:component:end");
        _$appendChild(_root, _list3);
        _$appendChild(_root, _list4);
        const __child1 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _list5 = _$createComment("rue:component:start");
            const _list6 = _$createComment("rue:component:end");
            _$appendChild(_root, _list5);
            _$appendChild(_root, _list6);
            const __slot7 = <RouterView/>;
            renderBetween(__slot7, _root, _list5, _list6);
            return {
                vaporElement: _root
            };
        });
        const __slot8 = <ParentBox children={__child1}/>;
        renderBetween(__slot8, _root, _list3, _list4);
        return {
            vaporElement: _root
        };
    });
};
useApp(RootApp).use(router).mount('#app');
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec46.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
