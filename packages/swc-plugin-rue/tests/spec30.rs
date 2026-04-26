//! SWC 插件转换行为测试（spec30）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec30() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const PostDetail: FC = () => {
  console.log('我是setup')
  const count = ref(0)

  if (count.value > 10) {
    return <div>超过5了</div>
  }

  if (count.value > 10) {
    return <div>超过10了</div>
  }

  return (
    <div className="max-w-sm mx-auto p-6">
      <button className="btn btn-primary btn-sm" onClick={() => count.value++}>
        加1
      </button>
      <span id="n" className="text-2xl font-bold text-primary">
        {count.value}
      </span>
    </div>
  )
}

export default PostDetail
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { _$vaporWithHookId, useSetup } from "@rue-js/rue/vapor";
import { type FC, ref } from '@rue-js/rue';
const PostDetail: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            console.log('我是setup');
            const count = _$vaporWithHookId("ref:1:0", ()=>ref(0));
            return {
                count: count
            };
        }));
    const { count: count } = _$useSetup;
    if (count.value > 10) {
        return <div>超过5了</div>;
    }
    if (count.value > 10) {
        return <div>超过10了</div>;
    }
    return (<div className="max-w-sm mx-auto p-6">
      <button className="btn btn-primary btn-sm" onClick={()=>count.value++}>
        加1
      </button>
      <span id="n" className="text-2xl font-bold text-primary">
        {count.value}
      </span>
    </div>);
};
export default PostDetail;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec30.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
