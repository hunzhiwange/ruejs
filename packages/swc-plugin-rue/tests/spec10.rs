//! SWC 插件转换行为测试（spec10）
//!
//! 覆盖：父组件 children 插槽在转换后的展开与渲染。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec10() {
    let src = r##"
import { type FC, ref, h } from '@rue-js/rue';

const Hello: FC = (props) => {
  return (
    <div>
      1 
      <span>{props.children}</span>
    </div>
  );
}
const Goods: FC = () => (
  <div>
    <h1>Rue 响应式框架示例</h1>
    <Hello>
      <p>这是子内容 A</p>
      <p>这是子内容 B</p>
    </Hello>
  </div>
);
export default Goods;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec10.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert_eq!(normalized.matches("_$template(").count(), 2, "{out}");
    assert_eq!(normalized.matches(".content.cloneNode(true)").count(), 2, "{out}");
    assert_eq!(normalized.matches("_$compiledRoot(()=>{").count(), 4, "{out}");
    assert_eq!(normalized.matches("_$compiledRoot(").count(), 4, "{out}");
    assert!(normalized.contains("_$mountCompiledSlotAt"), "{out}");
    assert!(normalized.contains("_$createComponent(Hello, ()=>({"), "{out}");
    assert!(normalized.contains("children: ["), "{out}");
    assert!(!normalized.contains("_$createDocumentFragment("), "{out}");
}
