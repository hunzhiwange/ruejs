//! SWC 插件转换行为测试（spec42）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec42() {
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
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup } from '@rue-js/rue';
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
            return (<div>
        <div>我是World {x.value}</div>
      </div>);
        };
        const Goods: FC = ()=>{
            const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
                const y = _$vaporWithHookId("ref:1:1", ()=>ref(10));
                return {
                    y: y
                };
            }));
            const { y: y } = _$useSetup;
            return (<div>
        <div>我是goods {y.value}</div>
      </div>);
        };
        return {
            World: World,
            Goods: Goods
        };
    }));
    const { World: World, Goods: Goods } = _$useSetup;
    return (<div>
      <World/>
      <Goods/>
    </div>);
};
export default HelloWorld;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec42.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
