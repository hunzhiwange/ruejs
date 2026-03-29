/// JSX 文本空白处理的基础算法
/// - 按字符遍历，收集连续空白到缓冲区
/// - 若本次空白段中包含换行（`\n`/`\r`），则将整段压缩为一个空格
/// - 若不包含换行，则保留原始空白数量（用于展示有意的多个空格）
/// - 在每次遇到可见字符时，将之前的空白缓冲输出，然后输出该字符
/// - 末尾若仍有空白缓冲，则按是否含换行决定输出单空格或原样空白
/// 作用：提供“按段折叠”的中性归一化，供后续更精细的首尾修剪策略使用
pub fn normalize_text(s: &str) -> String {
    let mut out = String::new();
    // 归一化缓冲：ws_buf 用于收集连续空白；run_has_newline 标记本段中是否出现换行
    let mut ws_buf = String::new();
    let mut run_has_newline = false;

    for ch in s.chars() {
        if ch.is_whitespace() {
            if ch == '\n' || ch == '\r' {
                run_has_newline = true;
            }
            ws_buf.push(ch);
        } else {
            // 遇到可见字符时，将之前的空白缓冲输出：含换行压缩为一个空格，否则原样保留连续空格
            if !ws_buf.is_empty() {
                if run_has_newline {
                    out.push(' ');
                } else {
                    out.push_str(&ws_buf);
                }
                ws_buf.clear();
                run_has_newline = false;
            }
            out.push(ch);
        }
    }
    // 末尾仍有空白缓冲时按规则输出
    if !ws_buf.is_empty() {
        if run_has_newline {
            out.push(' ');
        } else {
            out.push_str(&ws_buf);
        }
    }
    out
}

use swc_core::ecma::ast::*;

/// 计算某个 JSX 文本节点的最终内容
/// - 参数：
///   - children：同级子节点数组，用于判断前后邻居类型与上下文
///   - i：当前文本节点在 children 中的索引
///   - txt：已通过 normalize_text 归一化的文本内容
/// - 返回：Some(最终要插入的文本) 或 None（不插入文本节点）
/// 规则说明：
/// - 若 txt 仅由空白构成：仅在“前后均存在文本或表达式邻居”的行内拼接场景插入一个空格
/// - 若 txt 含可见字符：
///   - 在行内拼接（前或后邻居为文本/表达式）时原样保留，以避免破坏“© {year} Rue.js”等意图
///   - 在块级边界（无文本/表达式邻居）时，进行首尾修剪，避免无意义的行首/行尾空白
///   - 若相邻存在“纯空白邻居”（如 {' '}），则进一步对当前文本的首/尾进行对应方向的修剪
pub fn compute_jsx_text_content(
    children: &[JSXElementChild],
    i: usize,
    txt: &str,
) -> Option<String> {
    let is_ws_only = txt.trim().is_empty() && !txt.is_empty();
    let prev = if i > 0 { Some(&children[i - 1]) } else { None };
    let next = if i + 1 < children.len() { Some(&children[i + 1]) } else { None };

    // 邻居是否为“可见文本或表达式容器”，用于判定行内拼接场景
    let prev_texty = match prev {
        Some(JSXElementChild::JSXText(tt)) => !normalize_text(&tt.value).trim().is_empty(),
        Some(JSXElementChild::JSXExprContainer(_)) => true,
        _ => false,
    };
    let next_texty = match next {
        Some(JSXElementChild::JSXText(tt)) => !normalize_text(&tt.value).trim().is_empty(),
        Some(JSXElementChild::JSXExprContainer(_)) => true,
        _ => false,
    };

    // 邻居是否为“纯空白”或 `{' '}` 形式，触发方向性修剪
    let prev_ws_neighbor = match prev {
        Some(JSXElementChild::JSXText(tt)) => {
            let n = normalize_text(&tt.value);
            n.trim().is_empty() && !n.is_empty()
        }
        Some(JSXElementChild::JSXExprContainer(ec)) => match &ec.expr {
            swc_core::ecma::ast::JSXExpr::Expr(expr) => {
                if let swc_core::ecma::ast::Expr::Lit(swc_core::ecma::ast::Lit::Str(s)) = &**expr {
                    s.value == " "
                } else {
                    false
                }
            }
            _ => false,
        },
        _ => false,
    };
    let next_ws_neighbor = match next {
        Some(JSXElementChild::JSXText(tt)) => {
            let n = normalize_text(&tt.value);
            n.trim().is_empty() && !n.is_empty()
        }
        Some(JSXElementChild::JSXExprContainer(ec)) => match &ec.expr {
            swc_core::ecma::ast::JSXExpr::Expr(expr) => {
                if let swc_core::ecma::ast::Expr::Lit(swc_core::ecma::ast::Lit::Str(s)) = &**expr {
                    s.value == " "
                } else {
                    false
                }
            }
            _ => false,
        },
        _ => false,
    };

    if is_ws_only {
        // 仅在行内拼接时插入一个空格；否则不插入空白节点
        if prev_texty && next_texty {
            return Some(" ".to_string());
        }
        return None;
    }

    // 含可见字符：行内拼接场景保留原样；块级场景修剪首尾空白
    let mut content =
        if prev_texty || next_texty { txt.to_string() } else { txt.trim().to_string() };
    // 若邻居不可见或是空白邻居，进一步做方向性修剪
    if !prev_texty || prev_ws_neighbor {
        content = content.trim_start().to_string();
    }
    if !next_texty || next_ws_neighbor {
        content = content.trim_end().to_string();
    }
    if content.is_empty() { None } else { Some(content) }
}
