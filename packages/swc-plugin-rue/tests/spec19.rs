//! SWC 插件转换行为测试（spec19）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec19() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Hello: FC = () => {
  const color = ref("blue")
  return (
    <div>
      <div show={true} style={{ fontWeight: 'bold', color: 'red' }}>hello world</div>
      <div show={true} style="color:blue;">hello world</div>
      <div show={true} style={"color:" + color.value + ";"}>hello world</div>
      <div show={true} style={null}>hello world</div>
      <div show={true} style={undefined}>hello world</div>
      <div show={true} style={0}>hello world</div>
      <div show={true}>hello world</div>
      <div show={true} style="">hello world</div>
      <div show={true} style=" ">hello world</div>
      <div show={true} style>hello world</div>
      <div show={true}>hello world</div>
    </div>
  )
}

export default Hello
"##;
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
  import { type FC, ref, _$vaporWithHookId, useSetup } from '@rue-js/rue';
const Hello: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const color = _$vaporWithHookId("ref:1:0", ()=>ref("blue"));
        return {
            color: color
        };
    }));
    const { color: color } = _$useSetup;
    return (<div>
      <div style={{
        fontWeight: 'bold',
        color: 'red',
        display: ""
    }}>hello world</div>
      <div style={"color:blue;"}>hello world</div>
      <div style={"color:" + color.value + ";"}>hello world</div>
      <div style={{
        display: ""
    }}>hello world</div>
      <div style={{
        display: ""
    }}>hello world</div>
      <div style={{
        display: ""
    }}>hello world</div>
      <div style={{
        display: ""
    }}>hello world</div>
      <div style={""}>hello world</div>
      <div style={" "}>hello world</div>
      <div style={""}>hello world</div>
      <div style={{
        display: ""
    }}>hello world</div>
    </div>);
};
export default Hello;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec19.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
