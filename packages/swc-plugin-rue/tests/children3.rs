//! children 转换测试（片段变体 3）
//!
//! 覆盖：children 为多重嵌套 Box+span 的插槽展开与渲染。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_props_children_fragment3() {
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
        <Box title="内部1">
            内部1
            <span>内部1-子元素</span>
        </Box>   
        <Box title="内部2">
            内部1
            <span>内部2-子元素</span>
        </Box>   
    </Box>
);

export default Children;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/children3.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert_eq!(normalized.matches("_$template(").count(), 4, "{out}");
    assert_eq!(normalized.matches(".content.cloneNode(true)").count(), 4, "{out}");
    assert_eq!(normalized.matches("vapor(").count(), 0, "{out}");
    assert_eq!(
        normalized
            .matches("()=>_$compiledValueFactory(_$compiledPropsGet(props, \"title\"))")
            .count(),
        1,
        "{out}"
    );
    assert_eq!(
        normalized.matches("_$compiledRoot(").count()
            + normalized.matches("_$compiledStaticRoot(").count(),
        4,
        "{out}"
    );
    assert!(!normalized.contains("_$compiledCreateElement("), "{out}");
    assert!(!normalized.contains("renderAnchor"), "{out}");
}
