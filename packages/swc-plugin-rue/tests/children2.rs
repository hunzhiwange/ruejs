//! children 转换测试（片段变体 2）
//!
//! 覆盖：children 为嵌套 div+span 的插槽展开与渲染。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_props_children_fragment2() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Box: FC<{ title: string }> = (props) => (
  <div className="border p-2 rounded-md space-y-1">
    <div className="font-semibold">{props.title}</div>
    <div>{props.children}</div>
  </div>
);

const Children: FC = () => (
    <Box title="外层">
        <div>
            <span>hello</span>
            <span>嵌套子元素</span>
        </div>
    </Box>
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
    assert!(output.contains("const __rue_first = _$compiledCreateTextNode(\"\")"), "{output}");
    assert!(output.contains("_$compiledComponent(Box"), "{output}");
    assert!(output.contains("<div><span>hello</span><span>嵌套子元素</span></div>"), "{output}");
    assert!(output.contains("_$mountCompiledSlotAt"), "{output}");
    assert!(output.contains("()=>_$compiledPropsGet(props, \"title\")"), "{output}");
    assert!(
        output.contains("()=>_$compiledValueFactory(_$compiledPropsGet(props, \"children\"))"),
        "{output}"
    );
    assert!(!output.contains("renderAnchor"), "{output}");
}
