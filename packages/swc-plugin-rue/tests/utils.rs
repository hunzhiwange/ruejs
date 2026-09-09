//! SWC 插件测试工具函数
//!
//! 提供源码解析（TSX）、代码生成与字符串归一化等能力，方便快照对比。
#![allow(dead_code)]
use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::ast::Program;
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

pub fn strip_marker(s: &str) -> String {
    s.lines().filter(|l| !l.contains("RUE_TRANSFORMED")).collect::<Vec<_>>().join("\n")
}

fn strip_create_element_parent_arg(s: &str) -> String {
    let token = "_$createElement(\"";
    let mut out = String::with_capacity(s.len());
    let mut i = 0;

    while i < s.len() {
        if s[i..].starts_with(token) {
            out.push_str(token);
            i += token.len();

            while i < s.len() {
                let ch = s[i..].chars().next().expect("char");
                out.push(ch);
                i += ch.len_utf8();
                if ch == '"' {
                    break;
                }
            }

            if i < s.len() && s[i..].starts_with(", ") {
                i += 2;
                while i < s.len() {
                    let ch = s[i..].chars().next().expect("char");
                    if ch == ')' {
                        out.push(')');
                        i += 1;
                        break;
                    }
                    i += ch.len_utf8();
                }
                continue;
            }
            continue;
        }

        let ch = s[i..].chars().next().expect("char");
        out.push(ch);
        i += ch.len_utf8();
    }

    out
}

pub fn normalize(s: &str) -> String {
    let replaced = strip_create_element_parent_arg(s)
        .replace("_$compiledRoot((__rue_parent_context)=>{", "_$compiledRoot(()=>{")
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

/// Normalize setup snapshots across the compiler-only runtime boundary migration.
///
/// These tests primarily verify which declarations stay in setup and how their
/// dependencies are rewritten. Runtime import placement and the equivalent
/// `compiledWithHookId(useSetup(...))`/`compiledSetup(...)` wrapper are covered
/// by dedicated boundary tests, so ignore those two representation details here.
pub fn normalize_setup_snapshot(s: &str) -> String {
    let normalized = normalize(s)
        .replace("_$compiledWithHookId(\"useSetup:", "_$compiledSetup(\"useSetup:")
        .replace(", ()=>useSetup(()=>{", ", ()=>{")
        .replace("})); const {", "}); const {")
        .replace("})); let {", "}); let {");

    let mut body = normalized.as_str();
    while body.starts_with("import ") {
        let Some(end) = body.find("; ") else {
            break;
        };
        body = &body[end + 2..];
    }
    body.to_string()
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
