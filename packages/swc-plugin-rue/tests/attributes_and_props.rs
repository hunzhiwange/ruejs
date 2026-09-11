//! JSX 属性与 props 的转换与保留策略测试
//!
//! 覆盖：className、style、可选 props、路由链接等在编译期的重写行为。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_attributes_and_props() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const Badge: FC<{ label: string; color?: string }> = (props) => (
  <span className="px-2 py-1 rounded-md" style={{ backgroundColor: props.color ?? '#eee' }}>
    {props.label}
  </span>
);

const AttributesAndProps: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold">属性、className、style 与 Props</h3>
    <div id="box" className="border p-2">className 与 id</div>
    <div style={{ color: 'tomato', fontWeight: 'bold' }}>内联样式对象</div>
    <Badge label="默认" />
    <Badge label="自定义色" color="#cde" />
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default AttributesAndProps;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/attributes_and_props.out.js", utils::strip_marker(&out))
        .ok();
    assert!(!out.contains("_$removeAttribute"));
    let normalized = utils::normalize(&utils::strip_marker(&out));
    assert!(normalized.contains("_$template('<span"), "{out}");
    assert!(normalized.contains("_$template('<div class=\"max-w-4xl"), "{out}");
    assert!(normalized.contains(".content.cloneNode(true)"), "{out}");
    assert!(normalized.contains("_$compiledComponent(RouterLink"), "{out}");
    assert!(normalized.contains("to: \"/jsx\""), "{out}");
    assert!(normalized.contains("className: \"text-blue-600 hover:underline\""), "{out}");
    assert!(normalized.contains("_$mountCompiledSlotFactory"), "{out}");
    assert!(!normalized.contains("_$addEventListener"), "{out}");
}

#[test]
fn quotes_hyphenated_component_prop_names() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const TooltipHost: FC<{ [key: string]: unknown }> = (props) => <div>{props.children}</div>;

const Demo: FC = () => <TooltipHost data-tip="Home" aria-label="导航">Home</TooltipHost>;

export default Demo;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let normalized = utils::normalize(&utils::strip_marker(&out));

    assert!(normalized.contains(&utils::normalize(
        r#"_$compiledComponent(TooltipHost, ()=>({ "data-tip": "Home", "aria-label": "导航""#,
    )));
    assert!(
        normalized.contains("children: (target, slotProps, owner)=>_$mountCompiledSlotFactory")
    );
}
