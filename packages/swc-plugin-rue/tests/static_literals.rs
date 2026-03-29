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
        !out.contains("watchEffect(() => {"),
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
