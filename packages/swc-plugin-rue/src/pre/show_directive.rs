use swc_core::common::DUMMY_SP;
use swc_core::ecma::ast::*;

use crate::emit;
use crate::log;
use crate::utils::unwrap_expr;

/*
模块职责与 AST 说明（中文详解）：
- 目标：将 JSXOpeningElement 上的 `v-show/show` 指令改写为样式驱动的显示控制：
  - 若存在 style 属性：改写为 `style={_$vaporShowStyle(styleValue, cond)}`
  - 若不存在 style 属性：插入 `style={_$vaporShowStyle(undefined, cond)}`
  - 保留其他属性不变，并移除原 `v-show/show` 指令属性
- 设计动机：统一以样式控制显隐，避免在编译期生成额外的条件控制流或包裹节点，从而保持 JSX 结构的稳定

相关 SWC AST 类型：
- JSXOpeningElement：JSX 开始标签部分，包含属性列表 `opening.attrs`
- JSXAttrOrSpread：属性或扩展的枚举；常见的是 JSXAttr（普通属性）
- JSXAttr：具体属性项，包含 name 与 value
- JSXAttrName：属性名，常见为 Ident（标识符）
- JSXAttrValue：属性值，常见为 Str（字符串）或 JSXExprContainer（表达式容器）
- JSXExprContainer：表达式容器，内部 expr 若为 JSXExpr::Expr(e) 则表示普通表达式 e
- Expr：表达式总称，这里会构造 `emit::call_ident("_$vaporShowStyle", [style, cond])`

输入→输出示例（概要）：
- 输入：
  <div v-show={cond} style={{ display: 'block' }} />
- 输出（改写后的 opening）：
  <div style={_$vaporShowStyle({ display: 'block' }, cond)} />
- 若无 style：
  <div v-show={cond} /> → <div style={_$vaporShowStyle(undefined, cond)} />
*/
fn get_static_truthy_bool(e: &Expr) -> Option<bool> {
    match unwrap_expr(e) {
        Expr::Lit(Lit::Str(s)) => Some(!s.value.is_empty()),
        Expr::Lit(Lit::Num(n)) => Some(n.value != 0.0 && !n.value.is_nan()),
        Expr::Lit(Lit::Bool(b)) => Some(b.value),
        Expr::Lit(Lit::Null(_)) => Some(false),
        Expr::Ident(id) if id.sym.as_ref() == "undefined" => Some(false),
        Expr::Unary(u) if matches!(u.op, UnaryOp::Void) => Some(false),
        _ => None,
    }
}

fn is_known_string_expr(e: &Expr) -> bool {
    match unwrap_expr(e) {
        Expr::Lit(Lit::Str(_)) | Expr::Tpl(_) => true,
        Expr::Call(call) => matches!(
            &call.callee,
            Callee::Expr(expr)
                if matches!(unwrap_expr(expr.as_ref()), Expr::Ident(id) if id.sym.as_ref() == "String")
        ),
        Expr::Bin(bin) if matches!(bin.op, BinaryOp::Add) => {
            is_known_string_expr(bin.left.as_ref()) || is_known_string_expr(bin.right.as_ref())
        }
        _ => false,
    }
}

fn display_style_expr(display: &str) -> Expr {
    Expr::Object(ObjectLit {
        span: DUMMY_SP,
        props: vec![PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(emit::ident_name("display")),
            value: Box::new(Expr::Lit(Lit::Str(emit::str_lit(display)))),
        })))],
    })
}

fn append_display_to_object(obj: &ObjectLit, display: &str) -> Expr {
    let mut props = obj.props.clone();
    props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
        key: PropName::Ident(emit::ident_name("display")),
        value: Box::new(Expr::Lit(Lit::Str(emit::str_lit(display)))),
    }))));
    Expr::Object(ObjectLit { span: obj.span, props })
}

fn concat_style_suffix(style_expr: Expr, suffix: &str) -> Expr {
    Expr::Bin(BinExpr {
        span: DUMMY_SP,
        op: BinaryOp::Add,
        left: Box::new(style_expr),
        right: Box::new(Expr::Lit(Lit::Str(emit::str_lit(suffix)))),
    })
}

fn fold_vapor_show_style(style_expr: Expr, cond: bool) -> Option<Expr> {
    let display = if cond { "" } else { "none" };
    match unwrap_expr(&style_expr) {
        Expr::Object(obj) => Some(append_display_to_object(obj, display)),
        Expr::Lit(Lit::Str(s)) => {
            if cond {
                Some(Expr::Lit(Lit::Str(s.clone())))
            } else {
                let mut value = s.value.as_str().unwrap_or("").to_owned();
                value.push_str("; display: none");
                Some(Expr::Lit(Lit::Str(emit::str_lit(&value))))
            }
        }
        Expr::Lit(Lit::Num(_)) | Expr::Lit(Lit::Bool(_)) | Expr::Lit(Lit::Null(_)) => {
            Some(display_style_expr(display))
        }
        Expr::Ident(id) if id.sym.as_ref() == "undefined" => Some(display_style_expr(display)),
        Expr::Unary(u) if matches!(u.op, UnaryOp::Void) => Some(display_style_expr(display)),
        _ if is_known_string_expr(&style_expr) => {
            if cond {
                Some(style_expr)
            } else {
                Some(concat_style_suffix(style_expr, "; display: none"))
            }
        }
        _ => None,
    }
}

fn set_style_expr_value(style_attr: &mut JSXAttr, expr: Expr) {
    style_attr.value = Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
        span: DUMMY_SP,
        expr: JSXExpr::Expr(Box::new(expr)),
    }));
}

/// `v-show/show` 指令改写：
/// - 若存在 `style`，将其改为调用 `_$vaporShowStyle(style, cond)`；否则插入一个 `style={_$vaporShowStyle(undefined, cond)}`
/// - 设计动机：统一以样式驱动显示隐藏，避免在编译期生成额外的控制流程与节点结构。
pub fn transform_opening(opening: &mut JSXOpeningElement) {
    log::debug("pre: show_directive transform_opening");
    // 1) 扫描是否存在 v-show/show 指令属性，并记录其索引
    let mut show_directive_idx: Option<usize> = None;
    for (i, a) in opening.attrs.iter().enumerate() {
        if let JSXAttrOrSpread::JSXAttr(attr) = a {
            if let JSXAttrName::Ident(n) = &attr.name {
                let name = n.sym.as_ref();
                if name == "show" || name == "v-show" {
                    show_directive_idx = Some(i);
                }
            }
        }
    }
    if let Some(vi) = show_directive_idx {
        log::debug("pre: found v-show/show attribute");
        // 2) 解析 v-show/show 的条件表达式 cond：
        //    - 支持表达式容器（{cond}）与字符串字面量（"cond"）
        //    - 其他情况（如空、复杂 JSX 表达式）视为 None（不进行改写）
        let cond_opt: Option<Expr> = match &opening.attrs[vi] {
            JSXAttrOrSpread::JSXAttr(attr) => match &attr.value {
                Some(JSXAttrValue::JSXExprContainer(ec)) => match &ec.expr {
                    JSXExpr::Expr(e) => Some(*e.clone()),
                    _ => None,
                },
                Some(JSXAttrValue::Str(s)) => Some(Expr::Lit(Lit::Str(s.clone()))),
                _ => None,
            },
            _ => None,
        };
        if let Some(cond) = cond_opt {
            let static_cond = get_static_truthy_bool(&cond);
            // 3) 查找是否存在 style 属性
            let mut style_idx: Option<usize> = None;
            for (i, a) in opening.attrs.iter().enumerate() {
                if let JSXAttrOrSpread::JSXAttr(attr) = a {
                    if let JSXAttrName::Ident(n) = &attr.name {
                        if n.sym.as_ref() == "style" {
                            style_idx = Some(i);
                        }
                    }
                }
            }
            match style_idx {
                Some(si) => {
                    log::debug("pre: patch existing style with vaporShowStyle");
                    // 4a) 已存在 style：将其值包装为 _$vaporShowStyle(styleValue, cond)
                    if let JSXAttrOrSpread::JSXAttr(style_attr) = &mut opening.attrs[si] {
                        let style_expr = match &style_attr.value {
                            Some(JSXAttrValue::Str(s)) => {
                                // style 为字符串字面量：直接作为第一个参数传入
                                Expr::Lit(Lit::Str(s.clone()))
                            }
                            Some(JSXAttrValue::JSXExprContainer(ec)) => {
                                // style 为表达式容器：提取表达式；若为空则使用空字符串
                                match &ec.expr {
                                    JSXExpr::Expr(e) => *e.clone(),
                                    _ => Expr::Lit(Lit::Str(emit::str_lit(""))),
                                }
                            }
                            _ => {
                                // 其他形式（不常见）：回退为空字符串，再进行包装
                                Expr::Lit(Lit::Str(emit::str_lit("")))
                            }
                        };
                        let next_expr = static_cond
                            .and_then(|cond| fold_vapor_show_style(style_expr.clone(), cond))
                            .unwrap_or_else(|| {
                                emit::call_ident("_$vaporShowStyle", vec![style_expr, cond.clone()])
                            });
                        set_style_expr_value(style_attr, next_expr);
                    }
                    // 移除 v-show/show 指令属性
                    opening.attrs.remove(vi);
                }
                None => {
                    log::debug("pre: insert style from v-show");
                    // 4b) 不存在 style：插入一个 style，并以 undefined 作为默认样式值
                    let undef = Expr::Ident(emit::ident("undefined"));
                    let next_expr = static_cond
                        .and_then(|cond| fold_vapor_show_style(undef.clone(), cond))
                        .unwrap_or_else(|| {
                            emit::call_ident("_$vaporShowStyle", vec![undef, cond.clone()])
                        });
                    if let JSXAttrOrSpread::JSXAttr(attr) = &opening.attrs[vi] {
                        let mut style_attr = attr.clone();
                        style_attr.name = JSXAttrName::Ident(emit::ident("style").into());
                        set_style_expr_value(&mut style_attr, next_expr);
                        // 直接用新 style 属性覆盖原 v-show/show 属性位置
                        opening.attrs[vi] = JSXAttrOrSpread::JSXAttr(style_attr);
                    }
                }
            }
        }
    }
}
