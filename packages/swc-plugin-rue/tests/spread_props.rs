//! 对象展开属性（spread props）转换测试
//!
//! 覆盖：组件 props 上的多次展开、className/text 合并顺序与编译结果。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_spread_props() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const Button: FC<{ text: string; className?: string }> = (props) => (
  <button className={props.className}>{props.text}</button>
);

const SpreadProps: FC = () => {
  const base = { className: 'px-3 py-2 rounded-md bg-blue-600 text-white' };
  const extra = { text: '我是一个按钮哈' };
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
      <h3 className="text-xl font-semibold">对象展开属性（spread props）</h3>
      <Button {...base} {...extra} />
      <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
    </div>
  );
};

export default SpreadProps;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let output = utils::strip_marker(&out);

    assert!(output.contains("@rue-js/rue/internal"), "{output}");
    assert!(output.contains("_$compiledRoot"), "{output}");
    assert!(output.contains("renderAnchor(__slot1"), "{output}");
    assert!(output.contains("()=>props.text"), "{output}");
    assert!(output.contains("props.className"), "{output}");
    assert!(output.contains("...base"), "{output}");
    assert!(output.contains("...extra"), "{output}");
    assert!(output.contains("_$createComponent(Button, ()=>({"), "{output}");
    assert!(output.contains("RouterLink.__rueHref"), "{output}");
    assert!(!output.contains("const __slot = (props.text)"), "{output}");
}
