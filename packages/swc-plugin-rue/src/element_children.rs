use swc_core::ecma::ast::*;

use crate::log;
use crate::vapor::VaporTransform;

/*
元素子节点编译（中文详解）：
- 目标：将 JSXElement 的 children 编译为原生 DOM 操作并附加到父元素；
- 空白策略：normalize_text 归一化段内空白，结合前后邻居（文本/表达式/纯空白）决定插入、保留或修剪；
- 分派路径：文本 → 规范化并插入；片段 → 递归；表达式容器 → 插槽渲染；嵌套元素 → 构建为原生 DOM；
- 设计宗旨：与 Vapor 块体的 children 编译保持一致，避免不同入口出现渲染差异。
*/
/// 元素子节点编译总览
/// - 职责：将 JSX 子节点编译为附加到当前元素的原生 DOM 操作
/// - 文本：使用 normalize_text + 上下文判断，精细保留/修剪空白，避免无意义节点
/// - 片段/表达式/嵌套元素：委托到各自模块，保持职责清晰
pub fn emit_element_children(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    children: &[JSXElementChild],
    stmts: &mut Vec<Stmt>,
) {
    log::debug(&format!("children: count={}", children.len()));
    // 子节点遍历入口：
    // - 逐一检查当前文本及其前后邻居，配合下方空白处理策略决定：
    //   1) 仅空白是否需要插入一个空格（使用 `$createTextNode(" ")` + `$appendChild`）
    //   2) 含可见字符的首尾空白在行内拼接或块级场景中的保留/修剪
    for (i, c) in children.iter().enumerate() {
        match c {
            JSXElementChild::JSXText(t) => {
                // 空白处理策略：
                // - 仅空白（经 normalize 后仍只包含空白）时，不直接插入；仅在前后都存在“文本或表达式邻居”时插入单个空格，避免无意义空白节点
                // - 含有可见字符时：
                //   - 若前后存在“文本或表达式邻居”（同一行的内联内容拼接场景），保留首后边，中间双边空格，尾前边空格以保持意图（例如：'© ' + {year} + ' hello world ' + {1+1} + ' Rue.js')
                //   - 否则修剪首尾空白，避免块级结构前后产生意外空格
                let txt = crate::text::normalize_text(&t.value);
                let is_ws_only = txt.trim().is_empty() && !txt.is_empty();
                if is_ws_only {
                    let prev = if i > 0 { Some(&children[i - 1]) } else { None };
                    let next = if i + 1 < children.len() { Some(&children[i + 1]) } else { None };
                    // 邻居是否为“可见文本或表达式”：
                    let prev_texty = match prev {
                        Some(JSXElementChild::JSXText(tt)) => {
                            !crate::text::normalize_text(&tt.value).trim().is_empty()
                        }
                        Some(JSXElementChild::JSXExprContainer(_)) => true,
                        _ => false,
                    };
                    let next_texty = match next {
                        Some(JSXElementChild::JSXText(tt)) => {
                            !crate::text::normalize_text(&tt.value).trim().is_empty()
                        }
                        Some(JSXElementChild::JSXExprContainer(_)) => true,
                        _ => false,
                    };
                    if prev_texty && next_texty {
                        // 在行内拼接场景插入单个空格，避免无意义节点又保留作者意图
                        // 采用运行时 `$createTextNode(" ")` 创建单个空格文本节点并插入：
                        // - 原因：保持作者意图的行内拼接空格，同时避免创建冗余的不可见节点
                        let text_node = crate::emit::call_ident(
                            "_$createTextNode",
                            vec![crate::emit::string_expr(" ")],
                        );
                        stmts.push(crate::emit::append_child(el_ident.clone(), text_node));
                    }
                } else {
                    let prev = if i > 0 { Some(&children[i - 1]) } else { None };
                    let next = if i + 1 < children.len() { Some(&children[i + 1]) } else { None };
                    // 邻居是否为“可见文本或表达式”
                    let prev_texty = match prev {
                        Some(JSXElementChild::JSXText(tt)) => {
                            !crate::text::normalize_text(&tt.value).trim().is_empty()
                        }
                        Some(JSXElementChild::JSXExprContainer(_)) => true,
                        _ => false,
                    };
                    let next_texty = match next {
                        Some(JSXElementChild::JSXText(tt)) => {
                            !crate::text::normalize_text(&tt.value).trim().is_empty()
                        }
                        Some(JSXElementChild::JSXExprContainer(_)) => true,
                        _ => false,
                    };
                    // 邻居是否为“仅空白”或 `{' '}` 形式（方向性修剪）
                    let prev_ws_neighbor = match prev {
                        Some(JSXElementChild::JSXText(tt)) => {
                            let n = crate::text::normalize_text(&tt.value);
                            n.trim().is_empty() && !n.is_empty()
                        }
                        Some(JSXElementChild::JSXExprContainer(ec)) => match &ec.expr {
                            swc_core::ecma::ast::JSXExpr::Expr(expr) => {
                                if let swc_core::ecma::ast::Expr::Lit(
                                    swc_core::ecma::ast::Lit::Str(s),
                                ) = &**expr
                                {
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
                            let n = crate::text::normalize_text(&tt.value);
                            n.trim().is_empty() && !n.is_empty()
                        }
                        Some(JSXElementChild::JSXExprContainer(ec)) => match &ec.expr {
                            swc_core::ecma::ast::JSXExpr::Expr(expr) => {
                                if let swc_core::ecma::ast::Expr::Lit(
                                    swc_core::ecma::ast::Lit::Str(s),
                                ) = &**expr
                                {
                                    s.value == " "
                                } else {
                                    false
                                }
                            }
                            _ => false,
                        },
                        _ => false,
                    };
                    let mut content =
                        if prev_texty || next_texty { txt } else { txt.trim().to_string() };
                    // 行内拼接场景保留边界空白；块级场景修剪首尾；遇 `{' '}` 则做方向性修剪
                    if !prev_texty {
                        content = content.trim_start().to_string();
                    }
                    if !next_texty {
                        content = content.trim_end().to_string();
                    }
                    if prev_ws_neighbor {
                        content = content.trim_start().to_string();
                    }
                    if next_ws_neighbor {
                        content = content.trim_end().to_string();
                    }
                    if !content.is_empty() {
                        // 非空文本内容：创建文本节点并插入到父元素下
                        let text_node = crate::emit::call_ident(
                            "_$createTextNode",
                            vec![crate::emit::string_expr(&content)],
                        );
                        stmts.push(crate::emit::append_child(el_ident.clone(), text_node));
                    }
                }
            }
            JSXElementChild::JSXFragment(frag) => {
                crate::element_fragment::emit_fragment_children(
                    vt,
                    el_ident,
                    &frag.children,
                    stmts,
                );
            }
            JSXElementChild::JSXExprContainer(ec) => {
                crate::element_expr::emit_element_expr_container_child(vt, el_ident, ec, stmts);
            }
            JSXElementChild::JSXElement(nested) => {
                crate::elements::build_element(vt, nested, el_ident, stmts);
            }
            JSXElementChild::JSXSpreadChild(_) => {}
        }
    }
}
