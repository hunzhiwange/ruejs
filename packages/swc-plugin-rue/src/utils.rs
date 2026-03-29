// 原子字符串：用于构造稳定的字符串字面量
use swc_core::atoms::Atom;
// 稳定的占位位置信息（span），避免来源位置信息影响测试
use swc_core::common::DUMMY_SP;
// SWC ECMAScript/JSX AST 节点类型集合
use swc_core::ecma::ast::*;

/*
工具与判定函数（中文详解）：
- unwrap_expr：剥离括号与 TS 断言，获取表达式核心；
- is_component：首字母大写即组件；
- is_children_member_expr：识别任意对象的 `.children`；
- 文本/空值判定：is_static_empty_like / is_static_text_literal / get_static_text_literal_expr；
- 组件静态性：is_static_component_without_props / is_static_component_children_ident / component_has_no_dynamic_props_excluding_children；
- 事件/回调属性：is_event_attr / is_callback_attr 用于静态性判断的放行。
*/
/// 工具函数说明：
/// - `unwrap_expr`：剥离括号与 TS 断言，得到表达式核心（便于统一判别与改写）。
/// - `is_component`：首字母大写即组件，用于决定走组件渲染分支。
/// - `is_props_member_expr`：识别 `props.xxx`，用于 children/slot 的特殊处理。
/// - `is_static_empty_like`/`is_static_text_literal`：静态空值与文本字面量判定，优化无需 watch 的一次性设置路径。
/// - `get_static_text_literal_expr`：数字转字符串以保持 textContent 的一致类型。
/// 去掉表达式外层的括号与 TS 类型断言，获得真实表达式
pub fn unwrap_expr(e: &Expr) -> &Expr {
    let mut x = e;
    loop {
        match x {
            Expr::Paren(p) => {
                x = &*p.expr;
            }
            Expr::TsAs(a) => {
                x = &*a.expr;
            }
            Expr::TsTypeAssertion(a) => {
                x = &*a.expr;
            }
            _ => break,
        }
    }
    x
}

/// 判断 JSX 元素是否为组件：规则为首字母大写的标识符
pub fn is_component(name: &JSXElementName) -> bool {
    match name {
        JSXElementName::Ident(i) => {
            let s = i.sym.to_string();
            s.chars().next().map(|c| c.is_uppercase()).unwrap_or(false)
        }
        _ => false,
    }
}

fn jsx_attr_ident_name(name: &JSXAttrName) -> Option<String> {
    match name {
        JSXAttrName::Ident(i) => Some(i.sym.to_string()),
        _ => None,
    }
}

fn is_event_attr(name: &JSXAttrName) -> bool {
    if let Some(s) = jsx_attr_ident_name(name) {
        s.starts_with("on") && s.chars().nth(2).map(|c| c.is_uppercase()).unwrap_or(false)
    } else {
        false
    }
}

fn is_callback_attr(name: &JSXAttrName) -> bool {
    if let Some(s) = jsx_attr_ident_name(name) {
        let lower = s.to_ascii_lowercase();
        s.starts_with("on")
            || lower.ends_with("handler")
            || lower.ends_with("callback")
            || lower.ends_with("fn")
    } else {
        false
    }
}

/// 判断表达式是否为 `*.children` 成员访问（不再局限于 `props.children`）
/// 用途：识别任意形态的 `children` 插槽值，例如形参命名为 `p`、`props`、`args` 等
pub fn is_children_member_expr(e: &Expr) -> bool {
    let x = unwrap_expr(e);
    match x {
        Expr::Member(m) => match &m.prop {
            MemberProp::Ident(pi) => pi.sym.as_ref() == "children",
            _ => false,
        },
        _ => false,
    }
}

/// 静态空值检测：`null` / 布尔字面量 / `undefined` / `void 0`
/// 在条件表达式与逻辑分支中，空分支将被转换为 `""` 以保持渲染一致
/// 参考：`tests/conditional_rendering*.rs`
pub fn is_static_empty_like(e: &Expr) -> bool {
    let x = unwrap_expr(e);
    match x {
        Expr::Lit(Lit::Null(_)) => true,
        Expr::Lit(Lit::Bool(_)) => true,
        Expr::Ident(id) if id.sym.as_ref() == "undefined" => true,
        Expr::Unary(u) if matches!(u.op, UnaryOp::Void) => true,
        _ => false,
    }
}

/// 静态文本字面量：字符串或数字
pub fn is_static_text_literal(e: &Expr) -> bool {
    let x = unwrap_expr(e);
    matches!(x, Expr::Lit(Lit::Str(_)) | Expr::Lit(Lit::Num(_)))
}

/// 获取静态文本字面量对应的表达式（字符串保持原值；数字转为字符串）
/// 例如：`42` => `"42"`
pub fn get_static_text_literal_expr(e: &Expr) -> Option<Expr> {
    let x = unwrap_expr(e);
    match x {
        Expr::Lit(Lit::Str(s)) => Some(Expr::Lit(Lit::Str(s.clone()))),
        Expr::Lit(Lit::Num(n)) => {
            let v = n.value.to_string();
            Some(Expr::Lit(Lit::Str(Str {
                span: DUMMY_SP,
                value: Atom::from(v).into(),
                raw: None,
            })))
        }
        _ => None,
    }
}

pub fn is_static_component_without_props(el: &JSXElement) -> bool {
    let opening = &el.opening;
    if !is_component(&opening.name) {
        return false;
    }
    if !el.children.is_empty() {
        return false;
    }
    if opening.attrs.is_empty() {
        return true;
    }
    false
}

pub fn is_static_component_children_ident(el: &JSXElement) -> bool {
    let opening = &el.opening;
    if !is_component(&opening.name) {
        return false;
    }
    if opening.attrs.len() != 1 {
        return false;
    }
    if let JSXAttrOrSpread::JSXAttr(attr) = &opening.attrs[0] {
        if let JSXAttrName::Ident(idn) = &attr.name {
            if idn.sym.as_ref() == "children" {
                if let Some(JSXAttrValue::JSXExprContainer(ec)) = &attr.value {
                    if let JSXExpr::Expr(expr) = &ec.expr {
                        if let Expr::Ident(_) = unwrap_expr(expr) {
                            // children={ident} 以标识符引用的形式，视为静态 children（无需 watch）
                            return true;
                        }
                    }
                }
            }
        }
    }
    false
}

pub fn is_component_named(el: &JSXElement, name: &str) -> bool {
    match &el.opening.name {
        JSXElementName::Ident(i) => {
            let s = i.sym.to_string();
            s == name
        }
        _ => false,
    }
}

fn is_static_literal_expr(e: &Expr) -> bool {
    let x = unwrap_expr(e);
    matches!(
        x,
        Expr::Lit(Lit::Str(_))
            | Expr::Lit(Lit::Num(_))
            | Expr::Lit(Lit::Bool(_))
            | Expr::Lit(Lit::Null(_))
    )
}

fn is_function_literal_expr(e: &Expr) -> bool {
    let x = unwrap_expr(e);
    matches!(x, Expr::Arrow(_) | Expr::Fn(_))
}

pub fn component_has_no_dynamic_props_excluding_children(el: &JSXElement) -> bool {
    let opening = &el.opening;
    if !is_component(&opening.name) {
        return false;
    }
    for a in &opening.attrs {
        if let JSXAttrOrSpread::JSXAttr(attr) = a {
            if let JSXAttrName::Ident(idn) = &attr.name {
                if idn.sym.as_ref() == "children" {
                    continue;
                }
            }
            if is_event_attr(&attr.name) {
                // 事件属性不影响静态性判定
                continue;
            }
            match &attr.value {
                Some(JSXAttrValue::Str(_)) => {}
                Some(JSXAttrValue::JSXExprContainer(ec)) => {
                    if let JSXExpr::Expr(expr) = &ec.expr {
                        if is_function_literal_expr(expr) {
                            // 函数字面量作为属性值不影响静态性判定
                            continue;
                        }
                        if let Expr::Ident(_) = unwrap_expr(expr) {
                            if is_callback_attr(&attr.name) {
                                // 形如 foo={bar}，当属性名表现为回调类语义时视为函数引用，不影响静态性
                                continue;
                            }
                        }
                        if !is_static_literal_expr(expr) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
                _ => {
                    return false;
                }
            }
        } else {
            // spread 或其它形式视为动态
            return false;
        }
    }
    true
}
