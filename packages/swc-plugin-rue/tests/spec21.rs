//! SWC 插件转换行为测试（spec21）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec21() {
    let src = r##"
import { type FC } from 'rue-js'

const Chain: FC = () => {
  return (
    <div>
      <div if="5">A</div>
      <div else>Else</div>
    </div>
  )
}

export default Chain
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC } from 'rue-js';
const Chain: FC = ()=>{
    return (<div>
      {"5" ? <div>A</div> : <div>Else</div>}</div>);
};
export default Chain;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec21.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
