//! SWC 插件转换行为测试（spec40）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec40() {
    let src = r##"
import { type FC, ref } from 'rue-js'

const HelloWorld: FC = () => {
  console.log('--------start')
  const x = ref(0)
  console.log(x.value)
  x.value = 100
  console.log(x.value)

  if (true) {
    console.log(124234)
  }

  console.log('====end')

  if (x.value > 500) {
    return <div>hello</div>
  }

  return (
    <div>
      <div>x.value: {x.value}</div>
    </div>
  )
}

export default HelloWorld
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup } from 'rue-js';
const HelloWorld: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        console.log('--------start');
        const x = _$vaporWithHookId("ref:1:0", ()=>ref(0));
        console.log(x.value);
        x.value = 100;
        console.log(x.value);
        if (true) {
            console.log(124234);
        }
        console.log('====end');
        return {
            x: x
        };
    }));
    const { x: x } = _$useSetup;
    if (x.value > 500) {
        return <div>hello</div>;
    }
    return (<div>
      <div>x.value: {x.value}</div>
    </div>);
};
export default HelloWorld;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec40.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
