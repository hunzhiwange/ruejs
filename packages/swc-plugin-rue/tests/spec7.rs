//! SWC 插件转换行为测试（spec7）
//!
//! 覆盖：特殊 case 的 JSX 展开逻辑。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec7() {
    let src = r##"
import { type FC, ref, h } from '@rue-js/rue';
const count = ref(2);
const Child: FC<{ label: number }> = (p) => (
  <span id="child">{p.label}</span>
);
const Parent: FC = () => (
  <div>
    <Child label={count.value} />
  </div>
);
export default Parent;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let output = utils::strip_marker(&out);

    assert!(output.contains("_$compiledRoot"), "{output}");
    assert!(output.contains("_$compiledText"), "{output}");
    assert!(output.contains("()=>_$compiledPropsGet(p, \"label\")"), "{output}");
    assert!(output.contains("_$createComponent(Child"), "{output}");
    assert!(output.contains("label: count.value"), "{output}");
    assert!(!output.contains("const __slot = (_$compiledPropsGet(p, \"label\"))"), "{output}");
}
