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

    let expected_fragment = r##"
import { _$vaporWithHookId, useSetup, vapor, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$appendChild, watchEffect, _$createTextWrapper } from "@rue-js/rue/vapor";
import { type FC, ref } from '@rue-js/rue';
const HelloWorld: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const World: FC = ()=>{
                const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
                        const x = _$vaporWithHookId("ref:1:0", ()=>ref(0));
                        return {
                            x: x
                        };
                    }));
                const { x: x } = _$useSetup;
                return vapor(()=>{
                    const _root = _$createElement("div");
                    const _el1 = _$createElement("div");
                    _$appendChild(_root, _el1);
                    _$appendChild(_el1, _$createTextNode("我是World "));
                    const _el2 = _$createTextWrapper(_el1);
                    _$appendChild(_el1, _el2);
                    watchEffect(()=>{
                        _$settextContent(_el2, x.value);
                    });
                    return _root;
                });
            };
            const Goods: FC = ()=>{
                const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
                        const y = _$vaporWithHookId("ref:1:1", ()=>ref(10));
                        return {
                            y: y
                        };
                    }));
                const { y: y } = _$useSetup;
                return vapor(()=>{
                    const _root = _$createElement("div");
                    const _el3 = _$createElement("div");
                    _$appendChild(_root, _el3);
                    _$appendChild(_el3, _$createTextNode("我是goods "));
                    const _el4 = _$createTextWrapper(_el3);
                    _$appendChild(_el3, _el4);
                    watchEffect(()=>{
                        _$settextContent(_el4, y.value);
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
    return vapor(()=>{
        const _root = _$createElement("div");
        const _list1 = _$createComment("rue:component:anchor");
        _$appendChild(_root, _list1);
        const __slot2 = <World/>;
        renderAnchor(__slot2, _root, _list1);
        const _list3 = _$createComment("rue:component:anchor");
        _$appendChild(_root, _list3);
        const __slot4 = <Goods/>;
        renderAnchor(__slot4, _root, _list3);
        return _root;
    });
};
export default HelloWorld;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec43.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
