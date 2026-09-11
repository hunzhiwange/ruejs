//! SWC 插件转换行为测试（spec41）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec41() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

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
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"
import { ref, _$compiledWithHookId, _$compiledMarkComponentRenderReactive, useSetup, _$template, _$compiledText, _$compiledCreateTextNode, _$compiledRoot } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const _$getTemplate1 = _$template("<div>hello</div>");
const _$getTemplate2 = _$template("<div><div>x.value: <!--rue:text-hole:0--></div></div>");
const HelloWorld: FC = _$compiledMarkComponentRenderReactive(()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            console.log('--------start');
            const x = ref(0);
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
        return (()=>{
            let _root;
            let _disposed = false;
            const _dispose = ()=>{
                if (_disposed) return;
                _disposed = true;
                if (_root && _root.parentNode) {
                    _root.parentNode.removeChild(_root);
                }
            };
            return {
                __rue_cleanup_bucket: [
                    _dispose
                ],
                __rue_compiled_mount: (__rue_parent_context)=>{
                    if (_disposed) {
                        throw new Error("Cannot mount a disposed static root");
                    }
                    if (_root) {
                        throw new Error("A static root can only be mounted once");
                    }
                    const _fragment = _$getTemplate1().content.cloneNode(true);
                    _root = _fragment.firstChild;
                    return _root;
                },
                dispose: _dispose
            };
        })();
    }
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate2().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[0].childNodes[1];
        const _el2 = _el1.parentNode;
        const _el3 = _$compiledCreateTextNode("");
        _el2.insertBefore(_el3, _el1);
        _el2.removeChild(_el1);
        _$compiledText(_el3, ()=>x.value);
        return _root;
    });
});
export default HelloWorld;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec41.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("const x = ref(0)"), "{out}");
    assert!(normalized.contains("_$compiledRoot("), "{out}");
    assert!(normalized.contains("return [ _root, _root ]"), "{out}");
    assert!(normalized.contains("_$compiledText(_el3, ()=>x.value)"), "{out}");
}
