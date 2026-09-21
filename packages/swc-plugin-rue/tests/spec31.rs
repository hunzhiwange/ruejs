//! SWC 插件转换行为测试（spec31）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec31() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const PostDetail: FC = () => {
  console.log('我是setup')

  const count = ref(0)
  
  let msg = 'start'

  const double = () => {
    console.log('double click')
    return count.value * 2
  }

  const dec = () => {
    console.log('dec click')
    count.value--
  }

  if (count.value > 15) {
    console.log('超过15了')
    msg = '超过15了'

    return (
      <div className="max-w-sm mx-auto p-6">
        <div>{msg}</div>
        <button className="btn btn-primary btn-sm" onClick={() => dec()}>
          减1
        </button>
        <div id="n" className="text-2xl font-bold text-primary">
          当前值：{count.value} - 双倍值：{double()}
        </div>
      </div>
    )
  }

  const inc = () => {
    console.log('inc click')
    count.value++
  }
  
  if (count.value > 10) {
    console.log('超过10了')
    msg = '超过10了'

    return (
      <div className="max-w-sm mx-auto p-6">
        <div>{msg}</div>
        <button className="btn btn-primary btn-sm mr-2" onClick={() => inc()}>
          加1
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => dec()}>
          减1
        </button>
        <div id="n" className="text-2xl font-bold text-primary">
          当前值：{count.value} - 双倍值：{double()}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto p-6">
      <button className="btn btn-primary btn-sm" onClick={() => inc()}>
        加1
      </button>
      <div id="n" className="text-2xl font-bold text-primary">
        当前值：{count.value} - 双倍值：{double()}
      </div>
      <div id="msg" className="text-2xl font-bold text-primary">
        开始消息：{msg}
      </div>
    </div>
  )
}

export default PostDetail
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"import { ref, _$compiledWithHookId, _$compiledMarkComponentRenderReactive, useSetup } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const PostDetail: FC = _$compiledMarkComponentRenderReactive(()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        console.log('我是setup');
        const count = ref(0);
        let msg = 'start';
        const double = ()=>{
            console.log('double click');
            return count.value * 2;
        };
        const dec = ()=>{
            console.log('dec click');
            count.value--;
        };
        return {
            count: count,
            double: double,
            dec: dec,
            msg: msg
        };
    }));
    const { count: count, double: double, dec: dec } = _$useSetup;
    let { msg: msg } = _$useSetup;
    if (count.value > 15) {
        console.log('超过15了');
        msg = '超过15了';
        return (<div className="max-w-sm mx-auto p-6">
        <div>{msg}</div>
        <button className="btn btn-primary btn-sm" onClick={()=>dec()}>
          减1
        </button>
        <div id="n" className="text-2xl font-bold text-primary">
          当前值：{count.value} - 双倍值：{double()}
        </div>
      </div>);
    }
    const inc = ()=>{
        console.log('inc click');
        count.value++;
    };
    if (count.value > 10) {
        console.log('超过10了');
        msg = '超过10了';
        return (<div className="max-w-sm mx-auto p-6">
        <div>{msg}</div>
        <button className="btn btn-primary btn-sm mr-2" onClick={()=>inc()}>
          加1
        </button>
        <button className="btn btn-primary btn-sm" onClick={()=>dec()}>
          减1
        </button>
        <div id="n" className="text-2xl font-bold text-primary">
          当前值：{count.value} - 双倍值：{double()}
        </div>
      </div>);
    }
    return (<div className="max-w-sm mx-auto p-6">
      <button className="btn btn-primary btn-sm" onClick={()=>inc()}>
        加1
      </button>
      <div id="n" className="text-2xl font-bold text-primary">
        当前值：{count.value} - 双倍值：{double()}
      </div>
      <div id="msg" className="text-2xl font-bold text-primary">
        开始消息：{msg}
      </div>
    </div>);
});
export default PostDetail;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec31.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$compiledSetup(\"useSetup:0:0\""), "{normalized}");
    assert!(!normalized.contains("_$compiledMarkComponentRenderReactive"), "{normalized}");
    assert_eq!(normalized.matches("if (count.value >").count(), 2);
    assert!(normalized.contains("count.value--"), "{normalized}");
    assert!(normalized.contains("count.value++"), "{normalized}");
    assert!(normalized.contains("双倍值：{double()}"), "{normalized}");
    assert!(normalized.contains("开始消息：{msg}"), "{normalized}");
}
