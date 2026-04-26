//! 静态字面量（无需 watch）转换测试
//!
//! 覆盖：null/false/undefined/true/数字 在 JSX 表达式中的文本化输出，不引入 watch。
use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::ast::Program;
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

use swc_plugin_rue::apply;
mod utils;

struct Runner;

impl Runner {
    fn parse(&self, src: &str) -> (Program, std::sync::Arc<SourceMap>) {
        let cm = std::sync::Arc::new(SourceMap::default());
        let fm = cm.new_source_file(FileName::Custom("test.tsx".into()).into(), src.to_string());
        let mut parser = Parser::new(
            Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
            StringInput::from(&*fm),
            None,
        );
        (parser.parse_program().expect("parse"), cm)
    }
}

#[test]
fn transforms_static_literals_without_watchers() {
    let r = Runner;
    let src = r##"
import { type FC } from '@rue-js/rue';

const StaticLiterals: FC = () => (
  <div>
    <span>{null}</span>
    <span>{false}</span>
    <span>{undefined}</span>
    <span>{true}</span>
    <span>{1}</span>
    <span>{0}</span>
  </div>
);

export default StaticLiterals;
"##;
    let (program, cm) = r.parse(src);
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 输出到目标目录便于调试
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/static_literals.out.js", utils::strip_marker(&out)).ok();

    // 不应出现 watcher 的调用（但可能仍然导入 watchEffect 标识符）
    assert!(
        !out.contains("watchEffect(()=>") && !out.contains("watchEffect(() =>"),
        "Should NOT create watchEffect for static literals"
    );

    // 应直接设置 textContent
    let s = utils::strip_marker(&out);
    assert!(s.contains("_$settextContent("), "Should use _$settextContent for literals");

    // 空类字面量 -> 空字符串
    assert!(s.contains("\"\")"), "Empty-like literals should render as empty string");

    // 数字字面量 -> 1 与 0
    assert!(s.contains("_$settextContent(") && s.contains("\"1\"") && s.contains("\"0\""));
}

#[test]
fn transforms_static_literal_attributes_without_watchers() {
    let r = Runner;
    let src = r##"
import { type FC } from '@rue-js/rue';

const StaticLiteralAttrs: FC = () => (
    <div className={'wrap'}>
        <svg width={200} height={200}>
            <circle cx={100} cy={100} r={80} strokeWidth={1.5}></circle>
        </svg>
        <input min={0} max={100} value={0} checked={false} disabled={true} />
        <select multiple={true}></select>
    </div>
);

export default StaticLiteralAttrs;
"##;
    let (program, cm) = r.parse(src);
    let program = apply(program);
    let out = utils::emit(program, cm);

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/static_literal_attrs.out.js", utils::strip_marker(&out))
        .ok();

    let s = utils::strip_marker(&out);
    assert!(
        !s.contains("watchEffect(()=>") && !s.contains("watchEffect(() =>"),
        "Should NOT create watchEffect for static literal attrs"
    );

    assert!(
        s.contains("_$setClassName(_root, 'wrap')")
            || s.contains("_$setClassName(_root, \"wrap\")")
    );
    assert!(s.contains("_$setAttribute(_el1, \"width\", \"200\")"));
    assert!(s.contains("_$setAttribute(_el1, \"height\", \"200\")"));
    assert!(s.contains("_$setAttribute(_el2, \"cx\", \"100\")"));
    assert!(s.contains("_$setAttribute(_el2, \"cy\", \"100\")"));
    assert!(s.contains("_$setAttribute(_el2, \"r\", \"80\")"));
    assert!(s.contains("_$setAttribute(_el2, \"strokeWidth\", \"1.5\")"));
    assert!(s.contains("_$setAttribute(_el3, \"min\", \"0\")"));
    assert!(s.contains("_$setAttribute(_el3, \"max\", \"100\")"));
    assert!(s.contains("_$setValue(_el3, 0)"));
    assert!(s.contains("_$setChecked(_el3, false)"));
    assert!(s.contains("_$setDisabled(_el3, true)"));
    assert!(s.contains("_el4.multiple = true;"));
}

#[test]
fn transforms_static_style_expressions_without_watchers() {
    let r = Runner;
    let src = r##"
import { type FC } from '@rue-js/rue';

const StaticStyleExprs: FC = () => (
    <section>
        <div style={{ color: 'tomato', fontWeight: 'bold' }}>A</div>
        <div style={"display:flex;gap:8px;"}>B</div>
        <div style={null}>C</div>
    </section>
);

export default StaticStyleExprs;
"##;
    let (program, cm) = r.parse(src);
    let program = apply(program);
    let out = utils::emit(program, cm);

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/static_style_exprs.out.js", utils::strip_marker(&out))
        .ok();

    let s = utils::strip_marker(&out);
    assert!(
        !s.contains("watchEffect(()=>") && !s.contains("watchEffect(() =>"),
        "Should NOT create watchEffect for static style expressions"
    );

    assert!(
        s.contains("_$setStyle(_el1, {")
            && s.contains("color: 'tomato'")
            && s.contains("fontWeight: 'bold'")
    );
    assert!(
        s.contains("_$setStyle(_el2, \"display:flex;gap:8px;\")")
            || s.contains("_$setStyle(_el2, 'display:flex;gap:8px;')")
    );
    assert!(s.contains("_$setStyle(_el3, null)"));
}

#[test]
fn folds_static_show_style_without_vapor_show_style_helper() {
    let r = Runner;
    let src = r##"
import { type FC } from '@rue-js/rue';

const StaticShowStyles: FC = () => (
    <section>
        <div r-show={true} style={{ color: 'tomato' }}>A</div>
        <div r-show={false} style={{ color: 'tomato' }}>B</div>
        <div r-show={true}>C</div>
        <div r-show={false}>D</div>
    </section>
);

export default StaticShowStyles;
"##;
    let (program, cm) = r.parse(src);
    let program = apply(program);
    let out = utils::emit(program, cm);

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/static_show_styles.out.js", utils::strip_marker(&out))
        .ok();

    let s = utils::strip_marker(&out);
    assert!(!s.contains("_$vaporShowStyle"), "Should fold static show styles without helper");
    assert!(
        !s.contains("watchEffect(()=>") && !s.contains("watchEffect(() =>"),
        "Static show styles should not create watchEffect"
    );
    assert!(
        s.contains("_$setStyle(_el1, {")
            && s.contains("color: 'tomato'")
            && s.contains("display: \"\"")
    );
    assert!(s.contains("display: \"none\""));
    assert!(s.contains("_$setStyle(_el3, {") && s.contains("_$setStyle(_el4, {"));
}
