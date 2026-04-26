//! SWC 插件转换行为测试（spec45）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec45() {
    let src = r##"
import { type FC, useError, useApp } from '@rue-js/rue'
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
import { vapor, renderAnchor, _$createComment, _$createDocumentFragment, _$appendChild } from "@rue-js/rue/vapor";
import { type FC, useError, useApp } from '@rue-js/rue';
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
        const _list3 = _$createComment("rue:component:anchor");
        _$appendChild(_root, _list3);
        const __child1 = vapor(()=>{
            const _root = _$createDocumentFragment();
            const _list1 = _$createComment("rue:component:anchor");
            _$appendChild(_root, _list1);
            const __slot2 = <RouterView/>;
            renderAnchor(__slot2, _root, _list1);
            return _root;
        });
        const __slot4 = <SiteLayout children={__child1}/>;
        renderAnchor(__slot4, _root, _list3);
        return _root;
    });
};
useApp(RootApp).use(router).mount('#app');
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec45.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
