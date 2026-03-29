//! SWC 插件测试工具函数
//!
//! 提供源码解析（TSX）、代码生成与字符串归一化等能力，方便快照对比。
#![allow(dead_code)]
use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::ast::Program;
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

pub fn strip_marker(s: &str) -> String {
    s.lines().filter(|l| !l.contains("RUE_VAPOR_TRANSFORMED")).collect::<Vec<_>>().join("\n")
}

pub fn normalize(s: &str) -> String {
    let replaced = s
        .replace("\r\n", "\n")
        .replace(" />", "/>")
        .replace("[ ", "[")
        .replace(" ]", "]")
        .replace(
            "(typeof __slot === \"boolean\" || __slot == null ? h(\"fragment\", null) : h(\"fragment\", null, String(__slot ?? \"\")))",
            "h(\"fragment\", null, String(__slot ?? \"\"))",
        )
        .replace(
            "typeof __slot === \"boolean\" || __slot == null ? h(\"fragment\", null) : h(\"fragment\", null, String(__slot ?? \"\"))",
            "h(\"fragment\", null, String(__slot ?? \"\"))",
        );
    let mut out = String::new();
    let mut prev_space = false;
    for ch in replaced.chars() {
        if ch.is_whitespace() {
            if !prev_space {
                out.push(' ');
                prev_space = true;
            }
        } else {
            out.push(ch);
            prev_space = false;
        }
    }
    out.trim().to_string()
}

/// 将 TSX 源码解析为 Program 与 SourceMap
pub fn parse(src: &str, filename: &str) -> (Program, std::sync::Arc<SourceMap>) {
    let cm = std::sync::Arc::new(SourceMap::default());
    let fm = cm.new_source_file(FileName::Custom(filename.into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    (parser.parse_program().expect("parse"), cm)
}

pub fn parse_tsx(src: &str) -> (Program, std::sync::Arc<SourceMap>) {
    parse(src, "test.tsx")
}

/// 将 AST 重新生成 JS 代码字符串
pub fn emit(program: Program, cm: std::sync::Arc<SourceMap>) -> String {
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm.clone(), "\n", &mut buf, None),
    };
    emitter.emit_program(&program).expect("emit");
    String::from_utf8(buf).expect("utf8")
}
