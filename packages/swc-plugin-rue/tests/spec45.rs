//! SWC 插件转换行为测试（spec45）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec45() {
    let src = r##"
import { type FC, useApp } from '@rue-js/rue'
import { RouterView } from '@rue-js/router'
import router from './router'
import SiteLayout from './pages/site/components/Layout'

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

    let _expected_fragment = r##"
import { useApp, _$createComponent } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { RouterView } from '@rue-js/router';
import router from './router';
import SiteLayout from './pages/site/components/Layout';
const RootApp: FC = ()=>{
    return (()=>{
        const __child1 = _$createComponent(RouterView, {});
        return _$createComponent(SiteLayout, {
            children: __child1
        });
    })();
};
useApp(RootApp).use(router).mount('#app');
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec45.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$compiledComponent(SiteLayout, ()=>({"), "{normalized}");
    assert!(
        normalized.contains("children: (target, slotProps, owner)=>_$mountCompiledSlotFactory("),
        "{normalized}"
    );
    assert!(
        normalized.contains("_$mountCompiledComponent(_root, RouterView, ()=>({}))"),
        "{normalized}"
    );
    assert!(normalized.contains("_$createDocumentFragment()"), "{normalized}");
    assert!(
        normalized.contains(
            "_$createApp(()=>_$compiledComponent(RootApp, ()=>({}))).use(router).mount('#app')"
        ),
        "{normalized}"
    );
}
