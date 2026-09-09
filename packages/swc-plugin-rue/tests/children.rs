//! children 与插槽相关转换测试
//!
//! 覆盖：props.children、嵌套 children、多层 Box 组件下的插槽展开。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_props_children_fragment1() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Box: FC<{ title: string }> = (props) => (
  <div className="border p-2 rounded-md space-y-1">
    <div className="font-semibold">{props.title}</div>
    <div>{props.children}</div>
  </div>
);

const Children: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold">children 插槽与嵌套</h3>
    <Box title="外层">
      <Box title="内层">
        <span>嵌套子元素</span>
      </Box>
    </Box>
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default Children;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let output = utils::strip_marker(&out);

    assert!(output.contains("@rue-js/rue/internal"), "{output}");
    assert!(output.contains("_$compiledRoot"), "{output}");
    assert!(output.contains("_$compiledText("), "{output}");
    assert!(!output.contains("_$compiledCreateTextNode("), "{output}");
    assert!(output.contains("_$createComponent(Box"), "{output}");
    assert!(output.contains("RouterLink.__rueHref"), "{output}");
    assert!(output.contains("_$mountCompiledSlotAt"), "{output}");
    assert!(output.contains("()=>_$compiledPropsGet(props, \"title\")"), "{output}");
    assert!(output.contains("()=>_$compiledPropsGet(props, \"children\")"), "{output}");
}
