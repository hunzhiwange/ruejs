//! SWC 插件转换行为测试（spec45）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec45() {
    let src = r##"
import { type FC, useError, useApp } from 'rue-js'
import { RouterView } from '@rue-js/router'
import router from './router'
import SiteLayout from './pages/site/components/Layout'

useError({ overlay: true, console: true })

const RootApp: FC = () => {
  return (
    <SiteLayout>
      <RouterView />
    </SiteLayout>
  )
}

useApp(RootApp).use(router).mount('#app')
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, useError, useApp, vapor, renderBetween, _$createComment, _$createDocumentFragment, _$appendChild } from 'rue-js';
import { RouterView } from '@rue-js/router';
import router from './router';
import SiteLayout from './pages/site/components/Layout';
useError({
    overlay: true,
    console: true
});
const RootApp: FC = ()=>{
    return vapor(()=>{
        const _root = _$createDocumentFragment();
        const _list1 = _$createComment("rue:component:start");
        const _list2 = _$createComment("rue:component:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        const __child1 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _list3 = _$createComment("rue:component:start");
            const _list4 = _$createComment("rue:component:end");
            _$appendChild(_root, _list3);
            _$appendChild(_root, _list4);
            const __slot5 = <RouterView/>;
            renderBetween(__slot5, _root, _list3, _list4);
            return {
                vaporElement: _root
            };
        });
        const __slot6 = <SiteLayout children={__child1}/>;
        renderBetween(__slot6, _root, _list1, _list2);
        return {
            vaporElement: _root
        };
    });
};
useApp(RootApp).use(router).mount('#app');
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec45.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
