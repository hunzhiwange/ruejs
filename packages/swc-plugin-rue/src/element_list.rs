use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

use crate::elements::build_element;
use crate::emit::*;
use crate::log;
use crate::utils;
use crate::vapor::VaporTransform;

/*
列表渲染（Array.map(JSX)）设计：
- 采用“键控片段复用”策略：持久化 `Map<key, { start,end }>`，在更新时重用已存在的 DOM 片段，减少重建与移动。
- 通过注释锚点 `rue:list:start/end` 标记插入边界，`renderBetween` 在边界间渲染每项的片段。
- `_$vaporKeyedList` 负责对比新旧集合并执行插入/移动/卸载；本模块生成其所需的回调与参数对象。
- 参数解构保护：若 `map` 参数使用解构且使用了解构出的 key，需要在 `getKey`/`renderItem` 中显式对 `item` 解构，以保证作用域正确。
*/
// 抽取 Array.map(JSX) 列表渲染逻辑
// 转换目标：将 `arr.map((item, idx) => <li key={...}>...</li>)` 按 Vapor 的“键控片段复用”策略生成：
// - 在父元素下插入 `rue:list:start` / `rue:list:end` 注释作为渲染锚点
// - 声明持久 `Map` 保存 key 到片段之间的映射，跨次渲染复用已有 DOM
// - 在 `watchEffect` 中调用 `_$vaporKeyedList({ items, getKey, elements, parent, before, start, renderItem })`
// - `getKey(item, idx)`：优先使用 JSX 上的 `key` 表达式；否则回退到索引
// - `renderItem(item, parent, start, end, idx)`：以 `renderBetween(vapor(()=>{...}), parent, start, end)` 渲染每个项
// 关键点：当 map 参数使用解构（如 `({ sha })`）且 `key={sha}`，需在 `getKey` 中先对 `item` 进行一次解构，
// 以确保 `sha` 作用域正确（参考 `tests/spec14.rs`）。
pub(crate) fn try_build_list_from_map(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    call: &CallExpr,
    stmts: &mut Vec<Stmt>,
) -> bool {
    // 将 `arr.map((item, idx) => <li key={...}>{...}</li>)` 转为：
    // - 在父元素下插入列表 start/end 注释
    // - 使用持久化 `Map` 实现 key => item 片段 的复用
    // - 在 `watchEffect` 中调用 `_$vaporKeyedList({ items, getKey, elements, parent, before, start, renderItem })`
    // - `renderItem` 内部通过 `renderBetween(vapor(()=>{ ... }), parent, start, end)` 渲染每个项
    // 参考测试：`tests/lists_and_keys.rs`、`tests/spec14.rs`
    // 仅处理 obj.map(cb) 且仅一个参数的情形
    if let Callee::Expr(expr_callee) = &call.callee {
        if let Expr::Member(MemberExpr { obj, prop: MemberProp::Ident(prop_ident), .. }) =
            &**expr_callee
        {
            if prop_ident.sym == *"map" && call.args.len() == 1 {
                log::debug("list: detected Array.map -> keyed list");
                // 占位标记
                let start = vt.next_list_ident();
                let end = vt.next_list_ident();
                // 生成列表渲染锚点：后续 renderBetween 仅在两注释之间进行插入/移动
                // 注释锚点创建细节：
                // - callee：标识符 `_$createComment`
                // - args：标记字符串（start/end）
                // - ctxt：统一 `SyntaxContext::empty()`，由 emit::call_ident 设置
                let make_start = call_ident("_$createComment", vec![string_expr("rue:list:start")]);
                let make_end = call_ident("_$createComment", vec![string_expr("rue:list:end")]);
                stmts.push(const_decl(start.clone(), make_start));
                stmts.push(const_decl(end.clone(), make_end));
                stmts.push(append_child(el_ident.clone(), Expr::Ident(start.clone())));
                stmts.push(append_child(el_ident.clone(), Expr::Ident(end.clone())));

                // 提取 map 回调与数组对象
                let cb = &call.args[0];
                let cb_expr = utils::unwrap_expr(&cb.expr);
                let arr_expr = utils::unwrap_expr(obj).clone();

                // 使用 Map 键控闭包实现列表渲染与复用
                // 先声明持久 Map：let _mapX_elements = new Map();
                let map_base = vt.next_map_base();
                let elements_ident = ident(&format!("{}{}", map_base, "_elements"));
                // 持久化 Map，实现跨次渲染的片段复用（key -> {start,end,stop}）
                let new_map_expr = Expr::New(NewExpr {
                    span: DUMMY_SP,
                    callee: Box::new(Expr::Ident(ident("Map"))),
                    args: None,
                    type_args: None,
                    ctxt: SyntaxContext::empty(),
                });
                let elements_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    kind: VarDeclKind::Let,
                    declare: false,
                    decls: vec![VarDeclarator {
                        span: DUMMY_SP,
                        name: Pat::Ident(BindingIdent {
                            id: elements_ident.clone(),
                            type_ann: None,
                        }),
                        init: Some(Box::new(new_map_expr)),
                        definite: false,
                    }],
                })));
                stmts.push(elements_decl);
                log::debug("list: emitted anchors and elements Map");

                // 构造 watchEffect 箭头函数体
                let map_current = ident(&format!("{}{}", map_base, "_current"));
                let or_arr = Expr::Bin(BinExpr {
                    span: DUMMY_SP,
                    op: BinaryOp::LogicalOr,
                    left: Box::new(arr_expr.clone()),
                    right: Box::new(Expr::Array(ArrayLit { span: DUMMY_SP, elems: vec![] })),
                });
                let decl_current = const_decl(map_current.clone(), or_arr);

                let map_new = ident(&format!("{}{}", map_base, "_newElements"));

                let mut body_stmts: Vec<Stmt> = vec![decl_current.clone()];

                // 构造 for 循环：for (let idx = 0; idx < _map_current.length; idx++) { const item = _map_current[idx]; ... }
                let mut idx_ident = ident("idx");
                let mut item_ident = ident("item");
                let mut item_param_pattern: Option<Pat> = None;
                if let Expr::Arrow(ArrowExpr { params, body, .. }) = cb_expr {
                    if !params.is_empty() {
                        match &params[0] {
                            Pat::Ident(bi) => {
                                item_ident = bi.id.clone();
                            }
                            Pat::Object(_) | Pat::Array(_) => {
                                item_param_pattern = Some(params[0].clone());
                            }
                            _ => {}
                        }
                    }
                    if params.len() >= 2 {
                        if let Pat::Ident(bi) = &params[1] {
                            idx_ident = bi.id.clone();
                        }
                    }
                    // 提取 JSX 根 key 表达式（若无则使用 idx）
                    let mut item_key_expr: Expr = Expr::Ident(idx_ident.clone());
                    let mut try_extract_key = |ret_expr: &Expr| {
                        let inner_ret0 = utils::unwrap_expr(ret_expr);
                        if let Expr::JSXElement(jsx_el0) = inner_ret0 {
                            for a in &jsx_el0.opening.attrs {
                                if let JSXAttrOrSpread::JSXAttr(attr) = a {
                                    if let JSXAttrName::Ident(n) = &attr.name {
                                        if n.sym.as_ref() == "key" {
                                            match &attr.value {
                                                Some(JSXAttrValue::Str(s)) => {
                                                    item_key_expr = Expr::Lit(Lit::Str(Str {
                                                        span: DUMMY_SP,
                                                        value: s.value.clone(),
                                                        raw: None,
                                                    }));
                                                }
                                                Some(JSXAttrValue::JSXExprContainer(ec)) => {
                                                    if let JSXExpr::Expr(expr) = &ec.expr {
                                                        let inner =
                                                            utils::unwrap_expr(expr.as_ref());
                                                        item_key_expr = inner.clone();
                                                    }
                                                }
                                                _ => {}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    };
                    match &**body {
                        BlockStmtOrExpr::BlockStmt(BlockStmt { stmts: s, .. }) => {
                            for st in s {
                                if let Stmt::Return(ReturnStmt { arg: Some(expr), .. }) = st {
                                    try_extract_key(expr.as_ref());
                                }
                            }
                        }
                        BlockStmtOrExpr::Expr(expr_ret) => {
                            try_extract_key(expr_ret.as_ref());
                        }
                    }

                    // getKey 箭头函数
                    // 若 `map` 参数是对象/数组解构，这里生成块体箭头：
                    // - `const { ... } = item; return <key-expr>;`
                    // 否则直接返回表达式即可，避免额外包裹
                    let get_key_body = if let Some(pat) = &item_param_pattern {
                        let destruct_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
                            span: DUMMY_SP,
                            ctxt: SyntaxContext::empty(),
                            kind: VarDeclKind::Const,
                            declare: false,
                            decls: vec![VarDeclarator {
                                span: DUMMY_SP,
                                name: pat.clone(),
                                init: Some(Box::new(Expr::Ident(item_ident.clone()))),
                                definite: false,
                            }],
                        })));
                        let ret_stmt = Stmt::Return(ReturnStmt {
                            span: DUMMY_SP,
                            arg: Some(Box::new(item_key_expr.clone())),
                        });
                        BlockStmtOrExpr::BlockStmt(BlockStmt {
                            span: DUMMY_SP,
                            ctxt: SyntaxContext::empty(),
                            stmts: vec![destruct_decl, ret_stmt],
                        })
                    } else {
                        BlockStmtOrExpr::Expr(Box::new(item_key_expr.clone()))
                    };
                    let get_key_arrow = Expr::Arrow(ArrowExpr {
                        span: DUMMY_SP,
                        params: vec![
                            Pat::Ident(BindingIdent { id: item_ident.clone(), type_ann: None }),
                            Pat::Ident(BindingIdent { id: idx_ident.clone(), type_ann: None }),
                        ],
                        body: Box::new(get_key_body),
                        is_async: false,
                        is_generator: false,
                        type_params: None,
                        return_type: None,
                        ctxt: SyntaxContext::empty(),
                    });

                    // renderItem(item, start, end)
                    // `_$vaporKeyedList` 的 `renderItem` 约定参数：
                    // - `item`：当前项
                    // - `parent`：父元素（插入点所在）
                    // - `start`/`end`：锚点注释，用于片段插入边界
                    // - `idx`：当前索引
                    // 渲染策略：使用 `renderBetween(vapor(()=>{ ... }), parent, start, end)`
                    let start_param_ident = ident("start");
                    let end_param_ident = ident("end");
                    let child_root = ident("_root");
                    let mut child_body: Vec<Stmt> = vec![const_decl(
                        child_root.clone(),
                        call_ident("_$createDocumentFragment", vec![]),
                    )];
                    if let Some(pat) = &item_param_pattern {
                        let destruct_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
                            span: DUMMY_SP,
                            ctxt: SyntaxContext::empty(),
                            kind: VarDeclKind::Const,
                            declare: false,
                            decls: vec![VarDeclarator {
                                span: DUMMY_SP,
                                name: pat.clone(),
                                init: Some(Box::new(Expr::Ident(item_ident.clone()))),
                                definite: false,
                            }],
                        })));
                        child_body.push(destruct_decl);
                    }
                    match &**body {
                        BlockStmtOrExpr::Expr(ret_expr) => {
                            let inner_ret = utils::unwrap_expr(ret_expr.as_ref());
                            match inner_ret {
                                Expr::JSXElement(jsx_el) => {
                                    build_element(vt, jsx_el, &child_root.clone(), &mut child_body);
                                }
                                Expr::JSXFragment(frag) => {
                                    crate::element_fragment::emit_fragment_children(
                                        vt,
                                        &child_root.clone(),
                                        &frag.children,
                                        &mut child_body,
                                    );
                                }
                                _ => {}
                            }
                        }
                        BlockStmtOrExpr::BlockStmt(block) => {
                            for stmt in &block.stmts {
                                if let Stmt::Return(ReturnStmt { arg: Some(arg), .. }) = stmt {
                                    let inner_ret = utils::unwrap_expr(arg.as_ref());
                                    match inner_ret {
                                        Expr::JSXElement(jsx_el) => {
                                            build_element(
                                                vt,
                                                jsx_el,
                                                &child_root.clone(),
                                                &mut child_body,
                                            );
                                        }
                                        Expr::JSXFragment(frag) => {
                                            crate::element_fragment::emit_fragment_children(
                                                vt,
                                                &child_root.clone(),
                                                &frag.children,
                                                &mut child_body,
                                            );
                                        }
                                        _ => {}
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    child_body.push(return_root(child_root.clone()));
                    let arrow_setup = Expr::Arrow(ArrowExpr {
                        span: DUMMY_SP,
                        params: vec![],
                        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                            span: DUMMY_SP,
                            ctxt: SyntaxContext::empty(),
                            stmts: child_body,
                        })),
                        is_async: false,
                        is_generator: false,
                        type_params: None,
                        return_type: None,
                        ctxt: SyntaxContext::empty(),
                    });
                    let child_vapor_expr = call_ident("vapor", vec![arrow_setup]);
                    // 将当前项编译为 Vapor 片段并渲染到锚点之间
                    // renderBetween 调用细节：
                    // - callee：标识符 `renderBetween`
                    // - args：slot/vnode、父元素、起止注释
                    // - ctxt：统一 `SyntaxContext::empty()`
                    let render_between_call = Expr::Call(CallExpr {
                        span: DUMMY_SP,
                        callee: Callee::Expr(Box::new(Expr::Ident(ident("renderBetween")))),
                        args: vec![
                            ExprOrSpread {
                                spread: None,
                                expr: Box::new(Expr::Ident(ident("__slot"))),
                            },
                            ExprOrSpread {
                                spread: None,
                                expr: Box::new(Expr::Ident(ident("parent"))),
                            },
                            ExprOrSpread {
                                spread: None,
                                expr: Box::new(Expr::Ident(start_param_ident.clone())),
                            },
                            ExprOrSpread {
                                spread: None,
                                expr: Box::new(Expr::Ident(end_param_ident.clone())),
                            },
                        ],
                        type_args: None,
                        ctxt: SyntaxContext::empty(),
                    });
                    let render_item_arrow = Expr::Arrow(ArrowExpr {
                        span: DUMMY_SP,
                        params: vec![
                            Pat::Ident(BindingIdent { id: item_ident.clone(), type_ann: None }),
                            Pat::Ident(BindingIdent { id: ident("parent"), type_ann: None }),
                            Pat::Ident(BindingIdent {
                                id: start_param_ident.clone(),
                                type_ann: None,
                            }),
                            Pat::Ident(BindingIdent {
                                id: end_param_ident.clone(),
                                type_ann: None,
                            }),
                            Pat::Ident(BindingIdent { id: idx_ident.clone(), type_ann: None }),
                        ],
                        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                            span: DUMMY_SP,
                            ctxt: SyntaxContext::empty(),
                            stmts: vec![
                                const_decl(ident("__slot"), child_vapor_expr.clone()),
                                Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(render_between_call),
                                }),
                            ],
                        })),
                        is_async: false,
                        is_generator: false,
                        type_params: None,
                        return_type: None,
                        ctxt: SyntaxContext::empty(),
                    });

                    // _$vaporKeyedList({ items, getKey, elements, parent, before, start, renderItem })
                    let parent_expr = if el_ident.sym.as_ref() == "_root" {
                        // 对于块体根 _root，renderBetween 的 parent 取 start.parentNode；元素上下文直接用 el_ident
                        Expr::Member(MemberExpr {
                            span: DUMMY_SP,
                            obj: Box::new(Expr::Ident(start.clone())),
                            prop: MemberProp::Ident(ident_name("parentNode")),
                        })
                    } else {
                        Expr::Ident(el_ident.clone())
                    };
                    // 传入 keyedList 所需参数：items、key 计算、元素映射以及父/锚点位置
                    let args_obj = Expr::Object(ObjectLit {
                        span: DUMMY_SP,
                        props: vec![
                            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                                key: PropName::Ident(ident_name("items")),
                                value: Box::new(Expr::Ident(map_current.clone())),
                            }))),
                            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                                key: PropName::Ident(ident_name("getKey")),
                                value: Box::new(get_key_arrow),
                            }))),
                            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                                key: PropName::Ident(ident_name("elements")),
                                value: Box::new(Expr::Ident(elements_ident.clone())),
                            }))),
                            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                                key: PropName::Ident(ident_name("parent")),
                                value: Box::new(parent_expr),
                            }))),
                            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                                key: PropName::Ident(ident_name("before")),
                                value: Box::new(Expr::Ident(end.clone())),
                            }))),
                            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                                key: PropName::Ident(ident_name("start")),
                                value: Box::new(Expr::Ident(start.clone())),
                            }))),
                            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                                key: PropName::Ident(ident_name("renderItem")),
                                value: Box::new(render_item_arrow),
                            }))),
                        ],
                    });
                    // _$vaporKeyedList 调用细节：
                    // - callee：标识符 `_$vaporKeyedList`
                    // - args：对象字面量，包含 `items/getKey/elements/parent/before/start/renderItem`
                    // - ctxt：统一 `SyntaxContext::empty()`
                    let decl_new =
                        const_decl(map_new.clone(), call_ident("_$vaporKeyedList", vec![args_obj]));
                    body_stmts.push(decl_new);
                    // elements = newElements
                    // 更新持久 Map 引用，保持下一轮复用
                    body_stmts.push(Stmt::Expr(ExprStmt {
                        span: DUMMY_SP,
                        expr: Box::new(Expr::Assign(AssignExpr {
                            span: DUMMY_SP,
                            op: AssignOp::Assign,
                            left: AssignTarget::Simple(SimpleAssignTarget::Ident(
                                elements_ident.clone().into(),
                            )),
                            right: Box::new(Expr::Ident(map_new.clone())),
                        })),
                    }));
                }

                // watchEffect(() => { ... })
                let arrow = Expr::Arrow(ArrowExpr {
                    span: DUMMY_SP,
                    params: vec![],
                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                        span: DUMMY_SP,
                        ctxt: SyntaxContext::empty(),
                        stmts: body_stmts,
                    })),
                    is_async: false,
                    is_generator: false,
                    type_params: None,
                    return_type: None,
                    ctxt: SyntaxContext::empty(),
                });
                // watch 调用细节：
                // - callee：标识符 `watchEffect`
                // - args：箭头函数体封装列表的 diff 与渲染逻辑
                // - ctxt：`SyntaxContext::empty()`
                let watch_call = call_ident("watchEffect", vec![arrow]);
                stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch_call) }));

                return true;
            }
        }
    }
    false
}
