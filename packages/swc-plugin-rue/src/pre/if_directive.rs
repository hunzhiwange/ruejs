use swc_core::common::DUMMY_SP;
use swc_core::ecma::ast::*;

const IF_DIRECTIVE_NAMES: &[&str] = &["v-if", "r-if"];
const ELSE_IF_DIRECTIVE_NAMES: &[&str] = &["v-else-if", "r-else-if"];
const ELSE_DIRECTIVE_NAMES: &[&str] = &["v-else", "r-else"];

/*
`v-if / v-else-if / v-else` 与 `r-if / r-else-if / r-else` 指令改写：
- 目标：将连续兄弟 JSX 元素上的条件指令转换为一个单一的条件表达式容器（`{ cond ? <A/> : <B/> }`），便于后续 Vapor 化。
- 算法：
    1) 在父元素的 children 中，从 `v-if` 或 `r-if` 开头向后扫描，将紧邻的 `v-else-if` / `v-else` 或 `r-else-if` / `r-else` 组成一条链；
  2) 提取每个元素的指令表达式（字符串或表达式），并移除指令属性；
  3) 构造条件表达式：最末尾若为 `else` 则作为默认分支，其余分支按链逆序嵌套；
  4) 用一个 `JSXExprContainer` 替换该链在 children 中的范围。
- 设计权衡：保持 JSX 结构最小化变化；不引入新的父包裹元素，直接将条件转换为表达式，更贴近 React 风格逻辑。

SWC AST 类型与本文件的相关点：
- JSXElement：表示一个 JSX 标签节点（如 <div/>），其中 opening.attrs 为属性列表；
- JSXAttrOrSpread：属性或扩展语法的枚举，常见的是 JSXAttr；
- JSXAttr：一个具体的 JSX 属性（如 v-if="cond" 或 r-if="cond"），其 name 为 JSXAttrName；
- JSXAttrName：属性名的表示，这里我们关注 Ident（标识符形式的属性名）；
- JSXAttrValue：属性值，可能是字符串（Str）或表达式容器（JSXExprContainer）；
- JSXExprContainer：表达式容器，内部 expr 若是 JSXExpr::Expr(e) 则表示一个普通表达式 e；
- JSXElementChild：元素的子节点枚举，包括 JSXElement（子元素）、JSXText（文本）、JSXExprContainer（表达式容器）等；
- Expr：表达式总称，这里用到 Lit::Str（字符串字面量）、CondExpr（三元条件表达式）、JSXElement（表达式形式的 JSX）。

整体思路：
- 在父元素的 children 上做线性扫描，识别以 v-if 或 r-if 开头的连续链；链中允许空白文本（会跳过），一旦遇到其他类型或非条件指令的元素则链结束；
- 将链中每个元素的条件表达式提取出来（表达式或字符串），并移除该元素上的条件指令属性；
- 把链转成一个嵌套的 CondExpr（从后往前构建），用一个 JSXExprContainer 替换 children 段。

示例（输入片段 → 输出 CondExpr 结构）：
- 输入：
  <Fragment>
    <A v-if={a}/>
    <B v-else-if={b}/>
    <C v-else/>
  </Fragment>
- 输出（替换为一个 JSXExprContainer）：
  { a ? <A/> : (b ? <B/> : <C/>) }
*/
/// 将 JSX 属性的值提取为表达式 Expr
/// 规则：
/// - 若值为 JSXExprContainer，且内部为 JSXExpr::Expr(e) 则返回 e；
/// - 若值为字符串字面量，则转换为字符串表达式；
/// - 其他情况（如空、JSX 表达式等）返回 None。
fn get_attr_value_expr(attr: &JSXAttr) -> Option<Expr> {
    match &attr.value {
        // 形如 v-if={cond} / r-if={cond} 或 v-else-if={expr} / r-else-if={expr} 等
        Some(JSXAttrValue::JSXExprContainer(ec)) => match &ec.expr {
            JSXExpr::Expr(e) => Some(*e.clone()), // 提取内部普通表达式
            _ => None,                            // 空表达式或其他形式，不处理
        },
        // 形如 v-if="cond" / r-if="cond" 的字符串字面量
        Some(JSXAttrValue::Str(s)) => Some(Expr::Lit(Lit::Str(s.clone()))),
        // 其他类型（如 Spread）不视为可用条件表达式
        _ => None,
    }
}

/// 在给定元素的属性列表中查找一个条件指令属性
/// names：要匹配的属性名集合（如 ["v-if", "r-if"] 或 ["v-else", "r-else"]）
fn get_directive_attr<'a>(el: &'a JSXElement, names: &[&str]) -> Option<&'a JSXAttr> {
    for a in &el.opening.attrs {
        if let JSXAttrOrSpread::JSXAttr(attr) = a {
            if let JSXAttrName::Ident(n) = &attr.name {
                let name = n.sym.as_ref();
                if names.contains(&name) {
                    return Some(attr);
                }
            }
        }
    }
    None
}

/// 从元素上移除所有条件指令属性（仅支持 v-* 与 r-* 变体）
/// 说明：保留其他非条件属性不变。
fn remove_directives(el: &mut JSXElement) {
    el.opening.attrs.retain(|a| match a {
        JSXAttrOrSpread::JSXAttr(attr) => match &attr.name {
            JSXAttrName::Ident(n) => {
                let name = n.sym.as_ref();
                !(name == "v-if"
                    || name == "v-else-if"
                    || name == "v-else"
                    || name == "r-if"
                    || name == "r-else-if"
                    || name == "r-else")
            }
            _ => true,
        },
        _ => true,
    });
}

/// 将条件链构造成嵌套的三元表达式（CondExpr）
/// 输入：chain 为若干 (元素, 条件表达式) 的列表；最后一个若条件为 None，则视为 else 分支
/// 过程：
/// - alt 初始为 null；
/// - 若链末尾是 else（test_last 为 None），则 alt 设为该元素的 JSX；
/// - 然后自后向前遍历链：若存在条件 test，则构建 test ? cons : alt；若无条件（else），alt = cons。
fn build_cond_expr(chain: &[(JSXElement, Option<Expr>)]) -> Expr {
    let mut alt: Expr = Expr::Lit(Lit::Null(Null { span: DUMMY_SP }));
    if let Some((el_last, test_last)) = chain.last() {
        if test_last.is_none() {
            alt = Expr::JSXElement(Box::new(el_last.clone()));
        }
    }
    for (el, test) in chain.iter().rev() {
        if let Some(t) = test {
            let cons = Expr::JSXElement(Box::new(el.clone()));
            alt = Expr::Cond(CondExpr {
                span: DUMMY_SP,
                test: Box::new(t.clone()),
                cons: Box::new(cons),
                alt: Box::new(alt.clone()),
            });
        } else {
            let cons = Expr::JSXElement(Box::new(el.clone()));
            alt = cons;
        }
    }
    alt
}

/// 将父元素 children 中的 v-if / v-else-if / v-else 或 r-if / r-else-if / r-else 连续链改写为一个条件表达式容器
/// 细节：
/// - 仅当遇到以 v-if 或 r-if 开头的元素时，开始尝试构造链；
/// - 链中允许跳过纯空白文本节点；遇到非条件元素或其他子节点类型则链终止；
/// - 移除链上每个元素的条件指令属性，再生成条件表达式；
/// - 用一个 JSXExprContainer 替换掉原链范围。
pub fn transform_element(el: &mut JSXElement) {
    let mut i = 0;
    while i < el.children.len() {
        // 当前 child 是否是带 v-if/r-if 的元素
        let start_is_if = match &el.children[i] {
            JSXElementChild::JSXElement(e) => {
                let e_ref: &JSXElement = e.as_ref();
                get_directive_attr(e_ref, IF_DIRECTIVE_NAMES).is_some()
            }
            _ => false,
        };
        if !start_is_if {
            i += 1;
            continue;
        }
        // items 收集链上的元素与对应条件表达式（else 用 None）
        let mut items: Vec<(JSXElement, Option<Expr>)> = vec![];
        let mut j = i;
        let mut got_first = false;
        while j < el.children.len() {
            match &el.children[j] {
                JSXElementChild::JSXText(t) => {
                    // 允许跨越空白文本（例如换行与缩进）
                    if t.value.trim().is_empty() {
                        j += 1;
                        continue;
                    }
                    break;
                }
                JSXElementChild::JSXElement(e_box) => {
                    let e_ref: &JSXElement = e_box.as_ref();
                    let a_if = get_directive_attr(e_ref, IF_DIRECTIVE_NAMES);
                    let a_elseif = get_directive_attr(e_ref, ELSE_IF_DIRECTIVE_NAMES);
                    let a_else = get_directive_attr(e_ref, ELSE_DIRECTIVE_NAMES);
                    if !got_first {
                        if let Some(a) = a_if {
                            // 链的第一个必须是 v-if 或 r-if
                            items.push((*e_box.clone(), get_attr_value_expr(a)));
                            got_first = true;
                            j += 1;
                            continue;
                        } else {
                            break;
                        }
                    } else if let Some(a) = a_elseif {
                        // 中间可以是 v-else-if 或 r-else-if
                        items.push((*e_box.clone(), get_attr_value_expr(a)));
                        j += 1;
                        continue;
                    } else if a_else.is_some() {
                        // 链末尾可以是 v-else 或 r-else（条件为 None）
                        items.push((*e_box.clone(), None));
                        j += 1;
                        continue;
                    } else {
                        break;
                    }
                }
                _ => break,
            }
        }
        if items.is_empty() {
            i += 1;
            continue;
        }
        // 清理每个元素上的条件指令属性，避免在生成表达式后仍残留
        let mut clean_chain: Vec<JSXElement> = items.iter().map(|(e, _)| e.clone()).collect();
        for c in &mut clean_chain {
            remove_directives(c);
        }
        // 恢复 (元素, 条件表达式) 对，并准备生成条件表达式
        let mut pairs: Vec<(JSXElement, Option<Expr>)> = vec![];
        for (idx, (_, test)) in items.iter().enumerate() {
            pairs.push((clean_chain[idx].clone(), test.clone()));
        }
        let expr = build_cond_expr(&pairs);
        // 将表达式包裹为 JSXExprContainer，并替换掉原 children 的链范围
        let ec = JSXExprContainer { span: DUMMY_SP, expr: JSXExpr::Expr(Box::new(expr)) };
        let new_child = JSXElementChild::JSXExprContainer(ec);
        el.children.splice(i..j, [new_child]);
        // 继续扫描后续 children
        i += 1;
    }
}
