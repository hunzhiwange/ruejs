//! SWC 插件 map 内组件 children 回归测试。
//!
//! 覆盖：`items.map(...)` 中向自定义组件传入多个兄弟 children 时，
//! 编译结果仍需生成 fragment child 并显式透传到 `children`，不能丢失。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn preserves_multiple_sibling_children_for_custom_components_inside_map() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Surface: FC<{ minHeight?: string }> = ({ minHeight = '10rem', children }) => {
  return <div style={{ minHeight }}>{children}</div>;
};

const Demo: FC = () => {
  const items = [
    { placement: 'topLeft', title: 'A' },
    { placement: 'bottomRight', title: 'B' },
  ];

  return (
    <div>
      {items.map(item => (
        <Surface key={item.placement} minHeight="13rem">
          <div className="badge">{item.placement}</div>
          <section>{item.title}</section>
        </Surface>
      ))}
    </div>
  );
};

export default Demo;
"##;

    let (program, cm) = utils::parse(src, "MapComponentChildren.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/map_component_children.out.js", strip_marker(&out)).ok();

    let normalized = normalize(&strip_marker(&out));

    assert!(!normalized.contains(&normalize("_$compiledKeyedList({")), "{normalized}");
    assert!(normalized.contains(&normalize("_$compiledComponent(Surface, ()=>({")), "{normalized}");
    assert!(normalized.contains("children: (target, slotProps, owner)=>"), "{normalized}");
    let placement = normalized.find("_$rowItem1.get().placement").expect("first component child");
    let title = normalized.find("_$rowItem1.get().title").expect("second component child");
    assert!(placement < title, "{normalized}");
}
