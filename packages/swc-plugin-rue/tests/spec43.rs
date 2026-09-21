//! SWC 插件转换行为测试（spec43）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec43() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const HelloWorld: FC = () => {

  const World: FC = () => {
    const x = ref(0)
    return (
      <div>
        <div>我是World {x.value}</div>
      </div>
    )
  }

  const Goods: FC = () => {
    const y = ref(10)
    return (
      <div>
        <div>我是goods {y.value}</div>
      </div>
    )
  }

  return (
    <div>
      <World />
      <Goods />
    </div>
  )
}

export default HelloWorld
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _legacy_expected_fragment = r##"
import { ref, _$compiledWithHookId, useSetup, _$compiledRoot, _$createComponent, renderAnchor, _$template, untrack, watchEffect } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const _$getTemplate1 = _$template("<div><div>我是World <!--rue:text-hole:0--></div></div>");
const _$getTemplate2 = _$template("<div><div>我是goods <!--rue:text-hole:0--></div></div>");
const _$getTemplate3 = _$template("<div><!--rue:opaque-hole:0--><!--rue:opaque-hole:1--></div>");
const HelloWorld: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0:dup2", ()=>useSetup(()=>{
            const World: FC = ()=>{
                const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
                        const x = ref(0);
                        return {
                            x: x
                        };
                    }));
                const { x: x } = _$useSetup;
                return _$compiledRoot((__rue_parent_context)=>{
                    const _fragment = _$getTemplate1().content.cloneNode(true);
                    const _root = _fragment.firstChild;
                    const _el1 = _root.childNodes[0].childNodes[1];
                    const _el2 = _el1.parentNode;
                    watchEffect(()=>{
                        const __slot = (x.value);
                        untrack(()=>renderAnchor(__slot, _el2, _el1));
                    });
                    return _root;
                });
            };
            const Goods: FC = ()=>{
                const _$useSetup = _$compiledWithHookId("useSetup:0:0:dup1", ()=>useSetup(()=>{
                        const y = ref(10);
                        return {
                            y: y
                        };
                    }));
                const { y: y } = _$useSetup;
                return _$compiledRoot((__rue_parent_context)=>{
                    const _fragment = _$getTemplate2().content.cloneNode(true);
                    const _root = _fragment.firstChild;
                    const _el3 = _root.childNodes[0].childNodes[1];
                    const _el4 = _el3.parentNode;
                    watchEffect(()=>{
                        const __slot = (y.value);
                        untrack(()=>renderAnchor(__slot, _el4, _el3));
                    });
                    return _root;
                });
            };
            return {
                World: World,
                Goods: Goods
            };
        }));
    const { World: World, Goods: Goods } = _$useSetup;
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate3().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el5 = _root.childNodes[0];
        const _el6 = _el5.parentNode;
        const _el7 = _root.childNodes[1];
        const _el8 = _el7.parentNode;
        const __slot1 = _$createComponent(World, {});
        renderAnchor(__slot1, _el6, _el5);
        const __slot2 = _$createComponent(Goods, {});
        renderAnchor(__slot2, _el8, _el7);
        return _root;
    });
};
export default HelloWorld;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec43.out.js", strip_marker(&out)).ok();
    let output = normalize(&strip_marker(&out));
    assert_eq!(
        output.matches("_$compiledRoot(").count() + output.matches("_$compiledScalarRoot(").count(),
        3,
        "{output}"
    );
    assert_eq!(output.matches("_$compiledScalarText(").count(), 2, "{output}");
    assert_eq!(output.matches("_$compiledComponent(").count(), 2, "{output}");
    assert_eq!(output.matches("return [").count(), 3, "{output}");
    assert!(!output.contains("return vapor("), "{output}");
    assert!(!output.contains("watchEffect"), "{output}");
    assert!(!output.contains("untrack"), "{output}");
}
