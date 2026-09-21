//! SWC 插件转换行为测试（spec_fncomp）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_function_component_setup() {
    let src = r##"
import { ref } from '@rue-js/rue'

function PostDetail() {
  console.log('我是setup')

  const count = ref(0)
  
  let msg = 'start'

  function double() {
    console.log('double click')
    return count.value * 2
  }

  function dec() {
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

  function inc() {
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
function PostDetail() {
    _$compiledMarkComponentRenderReactive();
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            console.log('我是setup');
            const count = ref(0);
            let msg = 'start';
            function double() {
                console.log('double click');
                return count.value * 2;
            }
            function dec() {
                console.log('dec click');
                count.value--;
            }
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
    function inc() {
        console.log('inc click');
        count.value++;
    }
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
}
_$compiledMarkComponentRenderReactive(PostDetail);
export default PostDetail;"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_fncomp.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("function PostDetail()"), "{normalized}");
    assert!(normalized.contains("_$compiledSetup(\"useSetup:0:0\""), "{normalized}");
    assert!(!normalized.contains("_$compiledMarkComponentRenderReactive();"), "{normalized}");
    assert!(
        !normalized.contains("_$compiledMarkComponentRenderReactive(PostDetail)"),
        "{normalized}"
    );
    assert!(normalized.contains("function double()"), "{normalized}");
    assert!(normalized.contains("function dec()"), "{normalized}");
    assert!(normalized.contains("function inc()"), "{normalized}");
    assert_eq!(normalized.matches("if (count.value >").count(), 2);
}
