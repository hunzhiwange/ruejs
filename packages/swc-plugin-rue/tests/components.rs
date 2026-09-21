//! 组件与 Props 传递的编译结果测试
//!
//! 覆盖：子组件作为 slot、父组件 renderAnchor 插入、className 与文本生成。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_components() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const Hello: FC<{ name: string }> = (props) => <div>你好，{props.name}</div>;

const Components: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold">组件与 Props 传递</h3>
    <Hello name="Rue" />
    <Hello name="World" />
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default Components;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 期望输出要点对照：
    // - 子组件 Hello：props.name 作为 slot → vnode → renderAnchor
    // - 父组件：组件元素以注释锚点占位，renderAnchor 插入 <Hello/>
    // - 文本与属性：静态文本使用 _$createTextNode；className 使用 setAttribute
    let output = utils::strip_marker(&out);

    assert!(output.contains("@rue-js/rue/internal"), "{output}");
    assert!(output.contains("_$compiledRoot"), "{output}");
    assert_eq!(output.matches("_$compiledText(").count(), 0, "{output}");
    assert!(output.contains("_$mountCompiledSlotAt"), "{output}");
    assert!(
        output.contains("()=>_$compiledValueFactory(_$compiledPropsGet(props, \"name\"))"),
        "{output}"
    );
    assert_eq!(output.matches("_$compiledComponent(Hello").count(), 2, "{output}");
    assert!(output.contains("_$compiledComponent(RouterLink"), "{output}");
    assert!(!output.contains("const __slot = (_$compiledPropsGet(props, \"name\"))"), "{output}");
}
