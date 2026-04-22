// SWC 常量与上下文：
// - DUMMY_SP：稳定的 span 占位
// - SyntaxContext：统一 empty 上下文
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript/JSX AST 节点类型集合（JSXOpeningElement/JSXAttr/Expr 等）
use swc_core::ecma::ast::*;

use crate::emit::*;
use crate::log;
use crate::utils::unwrap_expr;

fn push_expr_stmt(stmts: &mut Vec<Stmt>, expr: Expr) {
    stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(expr) }));
}

fn get_static_literal_value_expr(e: &Expr) -> Option<Expr> {
    match unwrap_expr(e) {
        Expr::Lit(Lit::Str(s)) => Some(Expr::Lit(Lit::Str(s.clone()))),
        Expr::Lit(Lit::Num(n)) => Some(Expr::Lit(Lit::Num(n.clone()))),
        Expr::Lit(Lit::Bool(b)) => Some(Expr::Lit(Lit::Bool(b.clone()))),
        Expr::Lit(Lit::Null(n)) => Some(Expr::Lit(Lit::Null(n.clone()))),
        Expr::Ident(id) if id.sym.as_ref() == "undefined" => Some(Expr::Ident(id.clone())),
        Expr::Unary(u) if matches!(u.op, UnaryOp::Void) => Some(Expr::Unary(u.clone())),
        _ => None,
    }
}

fn get_static_stringified_expr(e: &Expr) -> Option<Expr> {
    match unwrap_expr(e) {
        Expr::Lit(Lit::Str(s)) => Some(Expr::Lit(Lit::Str(s.clone()))),
        Expr::Lit(Lit::Num(n)) => Some(string_expr(&n.value.to_string())),
        Expr::Lit(Lit::Bool(b)) => Some(string_expr(if b.value { "true" } else { "false" })),
        Expr::Lit(Lit::Null(_)) => Some(string_expr("null")),
        Expr::Ident(id) if id.sym.as_ref() == "undefined" => Some(string_expr("undefined")),
        Expr::Unary(u) if matches!(u.op, UnaryOp::Void) => Some(string_expr("undefined")),
        _ => None,
    }
}

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

fn get_static_style_object_expr(obj: &ObjectLit) -> Option<Expr> {
    let mut props = Vec::with_capacity(obj.props.len());
    for prop in &obj.props {
        match prop {
            PropOrSpread::Prop(prop) => match &**prop {
                Prop::KeyValue(kv) => {
                    let value = get_static_literal_value_expr(kv.value.as_ref())?;
                    props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                        key: kv.key.clone(),
                        value: Box::new(value),
                    }))));
                }
                _ => return None,
            },
            PropOrSpread::Spread(_) => return None,
        }
    }
    Some(Expr::Object(ObjectLit { span: obj.span, props }))
}

fn get_static_style_expr(e: &Expr) -> Option<Expr> {
    match unwrap_expr(e) {
        Expr::Object(obj) => get_static_style_object_expr(obj),
        Expr::Lit(Lit::Str(s)) => Some(Expr::Lit(Lit::Str(s.clone()))),
        Expr::Lit(Lit::Num(n)) => Some(Expr::Lit(Lit::Num(n.clone()))),
        Expr::Lit(Lit::Bool(b)) => Some(Expr::Lit(Lit::Bool(b.clone()))),
        Expr::Lit(Lit::Null(n)) => Some(Expr::Lit(Lit::Null(n.clone()))),
        Expr::Ident(id) if id.sym.as_ref() == "undefined" => Some(Expr::Ident(id.clone())),
        Expr::Unary(u) if matches!(u.op, UnaryOp::Void) => Some(Expr::Unary(u.clone())),
        _ => None,
    }
}

fn emit_static_multiple_assign(stmts: &mut Vec<Stmt>, target: &Ident, value: bool) {
    push_expr_stmt(
        stmts,
        Expr::Assign(AssignExpr {
            span: DUMMY_SP,
            op: AssignOp::Assign,
            left: AssignTarget::Simple(SimpleAssignTarget::Member(MemberExpr {
                span: DUMMY_SP,
                obj: Box::new(Expr::Ident(target.clone())),
                prop: MemberProp::Ident(ident_name("multiple")),
            })),
            right: Box::new(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value }))),
        }),
    );
}

fn try_emit_static_expr_attr(
    stmts: &mut Vec<Stmt>,
    target: &Ident,
    name: &str,
    inner: &Expr,
) -> bool {
    if name == "style" {
        if let Some(style_expr) = get_static_style_expr(inner) {
            push_expr_stmt(
                stmts,
                call_ident("_$setStyle", vec![Expr::Ident(target.clone()), style_expr]),
            );
            return true;
        }
    } else if name == "className" {
        if let Some(class_name) = get_static_stringified_expr(inner) {
            push_expr_stmt(
                stmts,
                call_ident("_$setClassName", vec![Expr::Ident(target.clone()), class_name]),
            );
            return true;
        }
    } else if name == "value" {
        if let Some(value) = get_static_literal_value_expr(inner) {
            push_expr_stmt(
                stmts,
                call_ident("_$setValue", vec![Expr::Ident(target.clone()), value]),
            );
            return true;
        }
    } else if name == "disabled" {
        if let Some(disabled) = get_static_truthy_bool(inner) {
            push_expr_stmt(
                stmts,
                call_ident(
                    "_$setDisabled",
                    vec![
                        Expr::Ident(target.clone()),
                        Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: disabled })),
                    ],
                ),
            );
            return true;
        }
    } else if name == "multiple" {
        if let Some(multiple) = get_static_truthy_bool(inner) {
            emit_static_multiple_assign(stmts, target, multiple);
            return true;
        }
    } else if name == "checked" {
        if let Some(checked) = get_static_truthy_bool(inner) {
            push_expr_stmt(
                stmts,
                call_ident(
                    "_$setChecked",
                    vec![
                        Expr::Ident(target.clone()),
                        Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: checked })),
                    ],
                ),
            );
            return true;
        }
    } else if let Some(attr_value) = get_static_stringified_expr(inner) {
        push_expr_stmt(
            stmts,
            call_ident(
                "_$setAttribute",
                vec![Expr::Ident(target.clone()), string_expr(name), attr_value],
            ),
        );
        return true;
    }

    false
}

/*
属性与事件编译设计：
- 目标：将 JSX 开标签上的属性转化为稳定的原生 DOM 更新语句，动态值用 `watchEffect` 包裹，实现响应式更新。
- 规则摘要：
  - `className`：转换为 `setAttribute("class", String(value))`，动态值 watch 包裹
  - `style`：统一调用 `_$setStyle(el, obj)`，动态值 watch 包裹
  - `dangerouslySetInnerHTML`：设置 `innerHTML`（支持静态/动态对象的 `{ __html }`）
  - `disabled`/`multiple`/`checked` 等布尔：静态直接赋值；动态以布尔保护（`!!expr`）更新对应属性
  - `value`：受控输入；`<select multiple>` 进行集合规范化并同步各 `<option>` 的选中态
  - `ref`：绑定 `useRef`，在卸载时调用 stop 清理
  - 事件（`onClick` 等）：转换为 `addEventListener(event, handler)`，必要时包装以维持最新回调
- 性能与一致性：尽量一次性设置静态值，避免不必要的 watch；使用运行时辅助函数保持不同类型元素的行为统一并便于优化。
*/
/// JSX 属性到原生 DOM 的编译细节（逐调用解释）：
/// - 所有更新均通过运行时适配器完成：来源统一为 `@rue-js/rue/runtime-vapor`，便于优化与跨环境适配。
/// - `$appendChild(parent, child)`：来源 emit::append_child 封装；用于把子节点插入父节点，抽象原生 `appendChild`，便于统一移动/批量插入策略。
/// - `$setAttribute(el, name, value)`：来源运行时适配层；统一封装不同浏览器行为与边界情况（如 `null/undefined` 清理、命名空间）。
/// - `$setClassName(el, class)`：专为 className 适配；避免直接写 `el.setAttribute('class', ...)` 的差异。
/// - `$setStyle(el, obj)`：统一样式对象到行内样式的写入；内部支持移除与驼峰/连字符转换。
/// - `$setInnerHTML(el, html)`：设置 innerHTML；配合 `dangerouslySetInnerHTML` 的对象形态 `{ __html }`。
/// - `watchEffect(fn)`：响应式更新调度器；在值变化时以微任务批量执行 `fn`，避免频繁同步 DOM。
/// - `$addEventListener(el, event, handler)`：事件统一绑定；保持 handler 最新引用。
/// - `$setValue/$setChecked/$setDisabled`：受控输入适配器；统一 HTML 不同输入类型的行为。
/// 选择 watch 包裹或一次性设置的原则：
/// - 纯静态字面量：一次性设置，提高性能；
/// - 动态表达式：包裹到 `watchEffect`，保证值变化时同步到 DOM；
/// - 事件：不使用 watch，而是运行时监听最新 handler 引用，避免重复绑定。
pub fn emit_attrs_for(stmts: &mut Vec<Stmt>, target: &Ident, opening: &JSXOpeningElement) {
    log::debug(&format!("attrs: start count={}", opening.attrs.len()));
    for a in &opening.attrs {
        if let JSXAttrOrSpread::JSXAttr(attr) = a {
            if let JSXAttrName::Ident(n) = &attr.name {
                let name = n.sym.to_string();
                log::debug(&format!("attrs: handle name={}", name));
                match &attr.value {
                    Some(JSXAttrValue::Str(s)) => {
                        if name == "className" {
                            let call = call_ident(
                                "_$setClassName",
                                vec![
                                    Expr::Ident(target.clone()),
                                    Expr::Lit(Lit::Str(Str {
                                        span: DUMMY_SP,
                                        value: s.value.clone(),
                                        raw: None,
                                    })),
                                ],
                            );
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(call),
                            }));
                        } else if name == "disabled" {
                            // disabled 字面量按布尔属性处理：直接设置为 true
                            let call = call_ident(
                                "_$setDisabled",
                                vec![
                                    Expr::Ident(target.clone()),
                                    Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
                                ],
                            );
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(call),
                            }));
                        } else if name == "dangerouslySetInnerHTML" {
                            let call = call_ident(
                                "_$setInnerHTML",
                                vec![
                                    Expr::Ident(target.clone()),
                                    Expr::Lit(Lit::Str(Str {
                                        span: DUMMY_SP,
                                        value: s.value.clone(),
                                        raw: None,
                                    })),
                                ],
                            );
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(call),
                            }));
                        } else {
                            // 其它静态属性：按字符串直接设置
                            let call = call_ident(
                                "_$setAttribute",
                                vec![
                                    Expr::Ident(target.clone()),
                                    string_expr(&name),
                                    Expr::Lit(Lit::Str(Str {
                                        span: DUMMY_SP,
                                        value: s.value.clone(),
                                        raw: None,
                                    })),
                                ],
                            );
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(call),
                            }));
                        }
                    }
                    Some(JSXAttrValue::JSXExprContainer(ec)) => {
                        if let JSXExpr::Expr(expr) = &ec.expr {
                            let inner = unwrap_expr(expr.as_ref());
                            if try_emit_static_expr_attr(stmts, target, &name, inner) {
                                continue;
                            }
                            // 动态属性统一进入 watch，具体属性按类别分别处理
                            if name == "dangerouslySetInnerHTML" {
                                let obj_ident = ident("__obj");
                                let obj_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
                                    span: DUMMY_SP,
                                    ctxt: SyntaxContext::empty(),
                                    kind: VarDeclKind::Const,
                                    declare: false,
                                    decls: vec![VarDeclarator {
                                        span: DUMMY_SP,
                                        name: Pat::Ident(BindingIdent {
                                            id: obj_ident.clone(),
                                            type_ann: None,
                                        }),
                                        init: Some(Box::new(Expr::Paren(ParenExpr {
                                            span: DUMMY_SP,
                                            expr: Box::new(inner.clone()),
                                        }))),
                                        definite: false,
                                    }],
                                })));
                                let has_obj = Expr::Ident(obj_ident.clone());
                                let in_html = Expr::Bin(BinExpr {
                                    span: DUMMY_SP,
                                    op: BinaryOp::In,
                                    left: Box::new(string_expr("__html")),
                                    right: Box::new(Expr::Ident(obj_ident.clone())),
                                });
                                let test = Expr::Bin(BinExpr {
                                    span: DUMMY_SP,
                                    op: BinaryOp::LogicalAnd,
                                    left: Box::new(has_obj),
                                    right: Box::new(in_html),
                                });
                                let html_member = Expr::Member(MemberExpr {
                                    span: DUMMY_SP,
                                    obj: Box::new(Expr::Ident(obj_ident.clone())),
                                    prop: MemberProp::Ident(ident_name("__html")),
                                });
                                let cond = Expr::Cond(CondExpr {
                                    span: DUMMY_SP,
                                    test: Box::new(test),
                                    cons: Box::new(html_member),
                                    alt: Box::new(Expr::Lit(Lit::Str(Str {
                                        span: DUMMY_SP,
                                        value: "".into(),
                                        raw: None,
                                    }))),
                                });
                                let call = call_ident(
                                    "_$setInnerHTML",
                                    vec![Expr::Ident(target.clone()), cond],
                                );
                                let arrow = Expr::Arrow(ArrowExpr {
                                    span: DUMMY_SP,
                                    params: vec![],
                                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                        span: DUMMY_SP,
                                        ctxt: SyntaxContext::empty(),
                                        stmts: vec![
                                            obj_decl,
                                            Stmt::Expr(ExprStmt {
                                                span: DUMMY_SP,
                                                expr: Box::new(call),
                                            }),
                                        ],
                                    })),
                                    is_async: false,
                                    is_generator: false,
                                    type_params: None,
                                    return_type: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                let watch = call_ident("watchEffect", vec![arrow]);
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(watch),
                                }));
                            } else if name == "style" {
                                let style_var = ident(&format!("{}_style", target.sym));
                                let paren = Expr::Paren(ParenExpr {
                                    span: DUMMY_SP,
                                    expr: Box::new(inner.clone()),
                                });
                                let decl = const_decl(style_var.clone(), paren);
                                let set_style = call_ident(
                                    "_$setStyle",
                                    vec![
                                        Expr::Ident(target.clone()),
                                        Expr::Ident(style_var.clone()),
                                    ],
                                );
                                let arrow = Expr::Arrow(ArrowExpr {
                                    span: DUMMY_SP,
                                    params: vec![],
                                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                        span: DUMMY_SP,
                                        ctxt: SyntaxContext::empty(),
                                        stmts: vec![
                                            decl,
                                            Stmt::Expr(ExprStmt {
                                                span: DUMMY_SP,
                                                expr: Box::new(set_style),
                                            }),
                                        ],
                                    })),
                                    is_async: false,
                                    is_generator: false,
                                    type_params: None,
                                    return_type: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                let watch = call_ident("watchEffect", vec![arrow]);
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(watch),
                                }));
                            } else if name == "className" {
                                let arg = match inner {
                                    Expr::Member(_) | Expr::Ident(_) => Expr::Paren(ParenExpr {
                                        span: DUMMY_SP,
                                        expr: Box::new(inner.clone()),
                                    }),
                                    _ => inner.clone(),
                                };
                                let to_string = Expr::Call(CallExpr {
                                    span: DUMMY_SP,
                                    callee: Callee::Expr(Box::new(Expr::Ident(ident("String")))),
                                    args: vec![ExprOrSpread { spread: None, expr: Box::new(arg) }],
                                    type_args: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                let set_attr = call_ident(
                                    "_$setClassName",
                                    vec![Expr::Ident(target.clone()), to_string],
                                );
                                let arrow = Expr::Arrow(ArrowExpr {
                                    span: DUMMY_SP,
                                    params: vec![],
                                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                        span: DUMMY_SP,
                                        ctxt: SyntaxContext::empty(),
                                        stmts: vec![Stmt::Expr(ExprStmt {
                                            span: DUMMY_SP,
                                            expr: Box::new(set_attr),
                                        })],
                                    })),
                                    is_async: false,
                                    is_generator: false,
                                    type_params: None,
                                    return_type: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                let watch = call_ident("watchEffect", vec![arrow]);
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(watch),
                                }));
                            } else if name == "ref" {
                                let stop_ident = ident(&format!("{}_ref_stop", target.sym));
                                // 将动态 ref 值封装成箭头函数（ArrowExpr）
                                // - SWC AST 中 ArrowExpr 表示 `() => expr`，这里用来“延迟求值”，保持最新的 ref
                                // - Vapor 运行时在需要时调用该函数，避免在编译期或初次绑定时就固定值
                                let get_ref_arrow = Expr::Arrow(ArrowExpr {
                                    span: DUMMY_SP,
                                    params: vec![],
                                    body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Paren(
                                        ParenExpr { span: DUMMY_SP, expr: Box::new(inner.clone()) },
                                    )))),
                                    is_async: false,
                                    is_generator: false,
                                    type_params: None,
                                    return_type: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                // 调用 Vapor 运行时 `_$vaporBindUseRef(el, getRef)`
                                // - 返回一个 `stop` 清理函数，负责在组件卸载时解除绑定
                                // - 这里以 CallExpr 形式构造对运行时方法的调用
                                let bind_call = call_ident(
                                    "_$vaporBindUseRef",
                                    vec![Expr::Ident(target.clone()), get_ref_arrow],
                                );
                                // 以 `const _el_ref_stop = _$vaporBindUseRef(...)` 形式保存 stop
                                // - VarDecl/VarDeclarator 组合用于声明常量并初始化
                                let decl_stop = Stmt::Decl(Decl::Var(Box::new(VarDecl {
                                    span: DUMMY_SP,
                                    ctxt: SyntaxContext::empty(),
                                    kind: VarDeclKind::Const,
                                    declare: false,
                                    decls: vec![VarDeclarator {
                                        span: DUMMY_SP,
                                        name: Pat::Ident(BindingIdent {
                                            id: stop_ident.clone(),
                                            type_ann: None,
                                        }),
                                        init: Some(Box::new(bind_call)),
                                        definite: false,
                                    }],
                                })));
                                // `stop()` 的调用表达式（稍后塞进卸载钩子）
                                let call_stop = Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(Expr::Call(CallExpr {
                                        span: DUMMY_SP,
                                        callee: Callee::Expr(Box::new(Expr::Ident(
                                            stop_ident.clone(),
                                        ))),
                                        args: vec![],
                                        type_args: None,
                                        ctxt: SyntaxContext::empty(),
                                    })),
                                });
                                // 卸载时执行 `stop()` 的箭头函数体
                                let unmount_arrow = Expr::Arrow(ArrowExpr {
                                    span: DUMMY_SP,
                                    params: vec![],
                                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                        span: DUMMY_SP,
                                        ctxt: SyntaxContext::empty(),
                                        stmts: vec![call_stop],
                                    })),
                                    is_async: false,
                                    is_generator: false,
                                    type_params: None,
                                    return_type: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                // 注册到运行时的生命周期钩子：`onBeforeUnmount(() => stop())`
                                let unmount_call =
                                    call_ident("onBeforeUnmount", vec![unmount_arrow]);

                                stmts.push(decl_stop);
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(unmount_call),
                                }));
                            } else if name == "value" {
                                // 受控 `value`：
                                // - `<select multiple>`：将值规范化为数组/集合，并同步各 `<option>` 的选中态
                                // - 其它输入：直接赋值给 `el.value`
                                let is_select = match &opening.name {
                                    JSXElementName::Ident(i) => i.sym.as_ref() == "select",
                                    _ => false,
                                };
                                let has_multiple = opening.attrs.iter().any(|a| match a {
                                    JSXAttrOrSpread::JSXAttr(attr) => match &attr.name {
                                        JSXAttrName::Ident(idn) => idn.sym.as_ref() == "multiple",
                                        _ => false,
                                    },
                                    _ => false,
                                });
                                if is_select && has_multiple {
                                    let set_val = call_ident(
                                        "_$setValue",
                                        vec![Expr::Ident(target.clone()), inner.clone()],
                                    );
                                    let arrow = Expr::Arrow(ArrowExpr {
                                        span: DUMMY_SP,
                                        params: vec![],
                                        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                            span: DUMMY_SP,
                                            ctxt: SyntaxContext::empty(),
                                            stmts: vec![Stmt::Expr(ExprStmt {
                                                span: DUMMY_SP,
                                                expr: Box::new(set_val),
                                            })],
                                        })),
                                        is_async: false,
                                        is_generator: false,
                                        type_params: None,
                                        return_type: None,
                                        ctxt: SyntaxContext::empty(),
                                    });
                                    let watch = call_ident("watchEffect", vec![arrow]);
                                    stmts.push(Stmt::Expr(ExprStmt {
                                        span: DUMMY_SP,
                                        expr: Box::new(watch),
                                    }));
                                } else {
                                    // 非 `<select multiple>` 的输入，直接委托到适配器 `_$setValue`
                                    let set_val = call_ident(
                                        "_$setValue",
                                        vec![Expr::Ident(target.clone()), inner.clone()],
                                    );
                                    // 同样用 watch 包裹，确保响应式更新
                                    let arrow = Expr::Arrow(ArrowExpr {
                                        span: DUMMY_SP,
                                        params: vec![],
                                        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                            span: DUMMY_SP,
                                            ctxt: SyntaxContext::empty(),
                                            stmts: vec![Stmt::Expr(ExprStmt {
                                                span: DUMMY_SP,
                                                expr: Box::new(set_val),
                                            })],
                                        })),
                                        is_async: false,
                                        is_generator: false,
                                        type_params: None,
                                        return_type: None,
                                        ctxt: SyntaxContext::empty(),
                                    });
                                    let watch = call_ident("watchEffect", vec![arrow]);
                                    stmts.push(Stmt::Expr(ExprStmt {
                                        span: DUMMY_SP,
                                        expr: Box::new(watch),
                                    }));
                                }
                            } else if name == "disabled" {
                                // 动态 `disabled` 属性，统一交由适配器处理
                                let call = call_ident(
                                    "_$setDisabled",
                                    vec![Expr::Ident(target.clone()), inner.clone()],
                                );
                                // 用 watch 保证每次值变化时更新到 DOM
                                let arrow = Expr::Arrow(ArrowExpr {
                                    span: DUMMY_SP,
                                    params: vec![],
                                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                        span: DUMMY_SP,
                                        ctxt: SyntaxContext::empty(),
                                        stmts: vec![Stmt::Expr(ExprStmt {
                                            span: DUMMY_SP,
                                            expr: Box::new(call),
                                        })],
                                    })),
                                    is_async: false,
                                    is_generator: false,
                                    type_params: None,
                                    return_type: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                let watch = call_ident("watchEffect", vec![arrow]);
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(watch),
                                }));
                            } else if name == "multiple" {
                                // 对任意值进行“布尔保护”，`!!expr` 将其转换为严格的 boolean
                                let paren_inner = Expr::Paren(ParenExpr {
                                    span: DUMMY_SP,
                                    expr: Box::new(inner.clone()),
                                });
                                let notnot = Expr::Unary(UnaryExpr {
                                    span: DUMMY_SP,
                                    op: UnaryOp::Bang,
                                    arg: Box::new(Expr::Unary(UnaryExpr {
                                        span: DUMMY_SP,
                                        op: UnaryOp::Bang,
                                        arg: Box::new(paren_inner),
                                    })),
                                });
                                // 直接写回到元素的 `multiple` 属性（布尔属性）
                                let assign = Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(Expr::Assign(AssignExpr {
                                        span: DUMMY_SP,
                                        op: AssignOp::Assign,
                                        left: AssignTarget::Simple(SimpleAssignTarget::Member(
                                            MemberExpr {
                                                span: DUMMY_SP,
                                                obj: Box::new(Expr::Ident(target.clone())),
                                                prop: MemberProp::Ident(ident_name("multiple")),
                                            },
                                        )),
                                        right: Box::new(notnot),
                                    })),
                                });
                                // 用 watch 包裹上述赋值
                                let arrow = Expr::Arrow(ArrowExpr {
                                    span: DUMMY_SP,
                                    params: vec![],
                                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                        span: DUMMY_SP,
                                        ctxt: SyntaxContext::empty(),
                                        stmts: vec![assign],
                                    })),
                                    is_async: false,
                                    is_generator: false,
                                    type_params: None,
                                    return_type: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                let watch = call_ident("watchEffect", vec![arrow]);
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(watch),
                                }));
                            } else if name == "checked" {
                                // 动态 `checked` 同样做布尔保护并交由适配器处理
                                let paren_inner = Expr::Paren(ParenExpr {
                                    span: DUMMY_SP,
                                    expr: Box::new(inner.clone()),
                                });
                                let notnot = Expr::Unary(UnaryExpr {
                                    span: DUMMY_SP,
                                    op: UnaryOp::Bang,
                                    arg: Box::new(Expr::Unary(UnaryExpr {
                                        span: DUMMY_SP,
                                        op: UnaryOp::Bang,
                                        arg: Box::new(paren_inner),
                                    })),
                                });
                                let call = call_ident(
                                    "_$setChecked",
                                    vec![Expr::Ident(target.clone()), notnot],
                                );
                                // watch 包裹，确保响应式更新
                                let arrow = Expr::Arrow(ArrowExpr {
                                    span: DUMMY_SP,
                                    params: vec![],
                                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                        span: DUMMY_SP,
                                        ctxt: SyntaxContext::empty(),
                                        stmts: vec![Stmt::Expr(ExprStmt {
                                            span: DUMMY_SP,
                                            expr: Box::new(call),
                                        })],
                                    })),
                                    is_async: false,
                                    is_generator: false,
                                    type_params: None,
                                    return_type: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                let watch = call_ident("watchEffect", vec![arrow]);
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(watch),
                                }));
                            } else if name.starts_with("on")
                                && name.chars().nth(2).map(|c| c.is_uppercase()).unwrap_or(false)
                            {
                                // 事件绑定将 `onXxx` 转为 `addEventListener('xxx', handler)`
                                // - 事件名统一小写化（如 onClick => 'click'）
                                // - 处理函数使用动态表达式，保持指向最新回调（无需 watch 包裹，运行时监听引用变化）
                                let event = name.trim_start_matches("on").to_ascii_lowercase();
                                let handler = Expr::Paren(ParenExpr {
                                    span: DUMMY_SP,
                                    expr: Box::new(inner.clone()),
                                });
                                let add = call_ident(
                                    "_$addEventListener",
                                    vec![Expr::Ident(target.clone()), string_expr(&event), handler],
                                );
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(add),
                                }));
                            } else {
                                let arg = match inner {
                                    Expr::Member(_) | Expr::Ident(_) => Expr::Paren(ParenExpr {
                                        span: DUMMY_SP,
                                        expr: Box::new(inner.clone()),
                                    }),
                                    _ => inner.clone(),
                                };
                                // 将任意动态属性值统一转为字符串：`String(value)`
                                let to_string = Expr::Call(CallExpr {
                                    span: DUMMY_SP,
                                    callee: Callee::Expr(Box::new(Expr::Ident(ident("String")))),
                                    args: vec![ExprOrSpread { spread: None, expr: Box::new(arg) }],
                                    type_args: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                // 动态属性统一用适配器设置，避免直接使用原生 DOM API
                                let set_attr = call_ident(
                                    "_$setAttribute",
                                    vec![
                                        Expr::Ident(target.clone()),
                                        string_expr(&name),
                                        to_string,
                                    ],
                                );
                                // 用 watch 包裹以实现响应式属性更新
                                let arrow = Expr::Arrow(ArrowExpr {
                                    span: DUMMY_SP,
                                    params: vec![],
                                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                        span: DUMMY_SP,
                                        ctxt: SyntaxContext::empty(),
                                        stmts: vec![Stmt::Expr(ExprStmt {
                                            span: DUMMY_SP,
                                            expr: Box::new(set_attr),
                                        })],
                                    })),
                                    is_async: false,
                                    is_generator: false,
                                    type_params: None,
                                    return_type: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                // 值变更时触发 watch，生命周期由 vapor-runtime 统一管理与清理
                                let watch = call_ident("watchEffect", vec![arrow]);
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(watch),
                                }));
                            }
                        }
                    }
                    _ => {
                        // 无值布尔属性，如 <select multiple>
                        if name == "disabled" {
                            let call = call_ident(
                                "_$setDisabled",
                                vec![
                                    Expr::Ident(target.clone()),
                                    Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
                                ],
                            );
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(call),
                            }));
                        } else if name == "checked" {
                            // 无值 `checked`：受控输入的初始勾选态
                            let call = call_ident(
                                "_$setChecked",
                                vec![
                                    Expr::Ident(target.clone()),
                                    Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
                                ],
                            );
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(call),
                            }));
                        } else if name == "multiple" {
                            let call = call_ident(
                                "_$setAttribute",
                                vec![
                                    Expr::Ident(target.clone()),
                                    string_expr("multiple"),
                                    string_expr(""),
                                ],
                            );
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(call),
                            }));
                        }
                    }
                }
            }
        }
    }
}
