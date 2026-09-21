//! SWC 插件转换行为测试（spec46）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec46() {
    let src = r##"
import { type FC, useApp } from '@rue-js/rue'
import { RouterView } from '@rue-js/router'
import router from './router'

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

    let output = utils::strip_marker(&out);

    assert!(
        output.contains(
            "_$createApp(()=>_$compiledComponent(RootApp, ()=>({}))).use(router).mount('#app')"
        ),
        "{output}"
    );
    assert!(output.contains("_$compiledRoot("), "{output}");
    assert!(output.contains("()=>_$compiledPropsGet(p, \"children\")"), "{output}");
    assert!(output.contains("_$mountCompiledComponent(_root, RouterView, ()=>({}))"), "{output}");
    assert!(output.contains("_$compiledComponent(ParentBox, ()=>({"), "{output}");
    assert!(
        output.contains("children: (target, slotProps, owner)=>{")
            && output.contains("_$mountCompiledSlotFactory("),
        "{output}"
    );
    assert!(!output.contains("renderAnchor"), "{output}");
}
