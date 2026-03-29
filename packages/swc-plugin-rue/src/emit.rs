// 统一封装 SWC AST 构造的常用助手，减少样板代码
// 这些助手将常见的 Vapor 原生 DOM 片段以 AST 形式拼装，例如：
// - 创建元素：`const _el1 = _$createElement("div")`
// - 插入子节点：`_$appendChild(_root, _el1)`
// - 返回 Rue VNode：`return { vaporElement: _root }`
// 参考转换输出示例：`tests/basic.rs`、`tests/spec14.rs`
//
// 设计要点（中文详解）：
// - 统一封装常见 AST 片段，降低调用点的样板代码与错误率；
// - Vapor 返回值约定为 `{ vaporElement: Node }`，便于运行时拓展元数据而不破坏调用方；
// - 所有构造均使用稳定的 DUMMY_SP 与 SyntaxContext::empty()，避免来源位置信息干扰测试。
// 原子字符串类型：高效符号/字符串存储与比较
use swc_core::atoms::Atom;
// SWC 常量与上下文：稳定 span 与统一 empty 语义上下文
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（Ident/CallExpr/VarDecl/ObjectLit 等）
use swc_core::ecma::ast::*;

/// 设计说明：
/// - 将常见的 AST 片段封装为助手，减少样板与错误率，提升阅读性（如 `const_decl`, `call_ident`）。
/// - Vapor 返回值约定为对象 `{ vaporElement: Node }`：
///   - 这比直接返回 `Node` 更稳定，后续可附加元数据；
///   - 运行时 `vapor()` 只需取 `vaporElement` 即可插入。
/// 构造标识符 `Ident`
pub fn ident(name: &str) -> Ident {
    Ident::new(Atom::from(name), DUMMY_SP, SyntaxContext::empty())
}

/// 构造属性/成员名 `IdentName`
pub fn ident_name(name: &str) -> IdentName {
    IdentName::new(Atom::from(name), DUMMY_SP)
}

/// 构造字符串字面量 `Str`
pub fn str_lit(s: &str) -> Str {
    Str { span: DUMMY_SP, value: Atom::from(s).into(), raw: None }
}

/// 构造字符串表达式 `Expr::Lit(Str)`
pub fn string_expr(s: &str) -> Expr {
    Expr::Lit(Lit::Str(str_lit(s)))
}

/// 构造成员表达式 `obj.prop`
#[allow(dead_code)]
pub fn member(obj: Ident, prop: &str) -> MemberExpr {
    MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(Expr::Ident(obj)),
        prop: MemberProp::Ident(ident_name(prop)),
    }
}

/// 构造对某个标识符的调用表达式 `fn(args...)`
/// 使用场景：`_$appendChild(...)`、`_$createElement(...)` 等运行时方法调用构造
pub fn call_ident(name: &str, args: Vec<Expr>) -> Expr {
    Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident(name)))),
        args: args.into_iter().map(|e| ExprOrSpread { spread: None, expr: Box::new(e) }).collect(),
        type_args: None,
        ctxt: SyntaxContext::empty(),
    })
}

/// 构造成员调用表达式 `obj.prop(args...)`
/// 使用场景：`root.parentNode.appendChild(child)` 等成员上的方法调用
#[allow(dead_code)]
pub fn call_member(obj: Ident, prop: &str, args: Vec<Expr>) -> Expr {
    Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Member(member(obj, prop)))),
        args: args.into_iter().map(|e| ExprOrSpread { spread: None, expr: Box::new(e) }).collect(),
        type_args: None,
        ctxt: SyntaxContext::empty(),
    })
}

/// 构造 `const name = init` 变量声明语句
/// 常用于创建局部节点或临时值：`const _root = _$createElement("div")`
pub fn const_decl(name: Ident, init: Expr) -> Stmt {
    Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent { id: name, type_ann: None }),
            init: Some(Box::new(init)),
            definite: false,
        }],
        ctxt: SyntaxContext::empty(),
    })))
}

/// `_$appendChild(parent, child)` 封装
/// 将子节点插入到父节点：封装为运行时适配层，便于统一优化插入行为
pub fn append_child(parent: Ident, child: Expr) -> Stmt {
    Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(call_ident("_$appendChild", vec![Expr::Ident(parent), child])),
    })
}

/// `return { vaporElement: root }` 语句
/// Vapor 约定返回对象形式，运行时仅需读取 `vaporElement` 即可插入
pub fn return_root(root: Ident) -> Stmt {
    Stmt::Return(ReturnStmt {
        span: DUMMY_SP,
        arg: Some(Box::new(Expr::Object(ObjectLit {
            span: DUMMY_SP,
            props: vec![PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(ident_name("vaporElement")),
                value: Box::new(Expr::Ident(root)),
            })))],
        }))),
    })
}
