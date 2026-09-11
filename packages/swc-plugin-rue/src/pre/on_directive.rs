use std::sync::Arc;

use swc_core::common::SourceMap;
use swc_core::common::{DUMMY_SP, FileName};
use swc_core::ecma::ast::*;
use swc_core::ecma::parser::{Parser, StringInput, Syntax, TsSyntax};

use crate::emit;
use crate::utils::{is_component, unwrap_expr};

/*
事件指令预处理：
- 支持形态：`v-on:click` / `r-on:click` / `@click` 经过前置转义后的安全属性名。
- 目标：把指令统一改写为标准 JSX 事件属性（如 `onClick`），让后续属性编译只面对一种事件入口。
- 修饰符：`stop/prevent/once/capture/...` 被整理成字符串数组，运行时由 `_$compiledWithEventModifiers` 包装处理。
- 组件 native 事件：组件上的 `.native` 不直接变成普通 prop，而是改名为内部前缀，
  后续组件编译会把它挂到组件根节点的原生事件上。
*/
const ON_DIRECTIVE_NAMESPACES: &[&str] = &["v-on", "r-on"];
const SAFE_EVENT_PREFIX: &str = "__rue_on__";
const SAFE_MODIFIERS_MARKER: &str = "__mods__";
const COMPONENT_NATIVE_PREFIX: &str = "__rueNativeOn";
const DIRECTIVE_MODIFIER_NAMES: &[&str] = &[
    "stop", "prevent", "self", "once", "capture", "passive", "native", "ctrl", "shift", "alt",
    "meta", "exact", "enter", "tab", "delete", "esc", "space", "up", "down", "left", "right",
    "middle",
];
const HYPHEN_MODIFIER_EVENT_NAMES: &[&str] = &[
    "click",
    "dblclick",
    "keyup",
    "keydown",
    "keypress",
    "input",
    "change",
    "submit",
    "focus",
    "blur",
    "mousedown",
    "mouseup",
    "mousemove",
    "mouseover",
    "mouseout",
    "mouseenter",
    "mouseleave",
    "wheel",
    "scroll",
    "contextmenu",
    "pointerdown",
    "pointerup",
    "pointermove",
    "touchstart",
    "touchmove",
    "touchend",
];

struct OnDirectiveSpec {
    standard_name: String,
    modifiers: Vec<String>,
    has_native: bool,
}

fn normalize_event_suffix(raw: &str) -> Option<String> {
    let trimmed = raw.trim_matches(|ch| ch == '-' || ch == '_' || ch == ':' || ch == '.');
    if trimmed.is_empty() {
        return None;
    }

    let has_separator = trimmed.chars().any(|ch| ch == '-' || ch == '_' || ch == ':');
    let mut normalized = String::new();

    if has_separator {
        for segment in trimmed.split(['-', '_', ':']) {
            if segment.is_empty() {
                continue;
            }
            let mut chars = segment.chars();
            let first = chars.next()?;
            normalized.extend(first.to_uppercase());
            normalized.push_str(chars.as_str());
        }
    } else {
        let mut chars = trimmed.chars();
        let first = chars.next()?;
        normalized.extend(first.to_uppercase());
        normalized.push_str(chars.as_str());
    }

    if normalized.is_empty() { None } else { Some(normalized) }
}

fn normalize_modifier(raw: &str) -> Option<String> {
    let trimmed = raw.trim_matches(|ch| ch == '-' || ch == '_' || ch == ':' || ch == '.');
    if trimmed.is_empty() { None } else { Some(trimmed.to_ascii_lowercase()) }
}

fn is_modifier_token(raw: &str) -> bool {
    let Some(normalized) = normalize_modifier(raw) else {
        return false;
    };

    normalized.chars().all(|ch| ch.is_ascii_digit())
        || DIRECTIVE_MODIFIER_NAMES.contains(&normalized.as_str())
}

fn parse_namespaced_directive_name(raw: &str) -> Option<(String, Vec<String>)> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    // 点号写法最接近 Vue：`click.prevent.stop`。
    // 第一个片段是事件名，剩余片段全部作为运行时修饰符处理。
    if trimmed.contains('.') {
        let mut segments = trimmed.split('.');
        let event_raw = segments.next()?;
        let standard_name = format!("on{}", normalize_event_suffix(event_raw)?);
        let modifiers = segments.filter_map(normalize_modifier).collect();
        return Some((standard_name, modifiers));
    }

    let hyphen_tokens: Vec<&str> =
        trimmed.split('-').filter(|segment| !segment.is_empty()).collect();
    if hyphen_tokens.len() > 1 {
        let mut modifiers = Vec::new();
        let mut split_index = hyphen_tokens.len();

        // 连字符写法存在二义性：`mouse-down` 是事件名，`click-prevent` 是修饰符。
        // 这里从尾部向前剥离已知修饰符，并只对常见 DOM 事件启用该规则，减少误判。
        while split_index > 1 {
            let token = hyphen_tokens[split_index - 1];
            if !is_modifier_token(token) {
                break;
            }
            modifiers.insert(0, normalize_modifier(token)?);
            split_index -= 1;
        }

        if !modifiers.is_empty() {
            let event_raw = hyphen_tokens[..split_index].join("-");
            let normalized_event = normalize_event_suffix(&event_raw)?.to_ascii_lowercase();
            if HYPHEN_MODIFIER_EVENT_NAMES.contains(&normalized_event.as_str()) {
                let standard_name = format!("on{}", normalize_event_suffix(&event_raw)?);
                return Some((standard_name, modifiers));
            }
        }
    }

    Some((format!("on{}", normalize_event_suffix(trimmed)?), Vec::new()))
}

fn parse_expr(src: &str, filename: &str) -> Option<Expr> {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(FileName::Custom(filename.into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let expr = parser.parse_expr().ok()?;
    Some(*expr)
}

fn parse_inline_handler_source(src: &str) -> Option<Expr> {
    let trimmed = src.trim();
    if trimmed.is_empty() {
        return Some(build_noop_handler());
    }

    if !trimmed.contains(';')
        && let Some(expr) = parse_expr(trimmed, "v-on-handler.tsx")
    {
        return Some(expr);
    }

    parse_expr(&format!("($event) => {{ {} }}", trimmed), "v-on-handler-inline-statements.tsx")
}

fn parse_safe_directive_name(raw: &str) -> Option<(String, Vec<String>)> {
    let rest = raw.strip_prefix(SAFE_EVENT_PREFIX)?;
    let (event_raw, modifier_raw) = match rest.split_once(SAFE_MODIFIERS_MARKER) {
        Some((event_raw, modifier_raw)) => (event_raw, Some(modifier_raw)),
        None => (rest, None),
    };

    let standard_name = format!("on{}", normalize_event_suffix(event_raw)?);
    let modifiers = modifier_raw
        .map(|raw| raw.split("__").filter_map(normalize_modifier).collect())
        .unwrap_or_default();
    Some((standard_name, modifiers))
}

fn directive_spec_from_name(name: &JSXAttrName) -> Option<OnDirectiveSpec> {
    let (standard_name, modifiers) = match name {
        JSXAttrName::JSXNamespacedName(ns_name) => {
            let ns = ns_name.ns.sym.as_ref();
            if !ON_DIRECTIVE_NAMESPACES.contains(&ns) {
                return None;
            }

            parse_namespaced_directive_name(ns_name.name.sym.as_ref())?
        }
        JSXAttrName::Ident(ident) => parse_safe_directive_name(ident.sym.as_ref())?,
    };

    let has_native = modifiers.iter().any(|modifier| modifier == "native");
    Some(OnDirectiveSpec { standard_name, modifiers, has_native })
}

fn build_event_param() -> Pat {
    Pat::Ident(BindingIdent { id: emit::ident("$event"), type_ann: None })
}

fn build_noop_handler() -> Expr {
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![build_event_param()],
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: Default::default(),
            stmts: vec![],
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: Default::default(),
    })
}

fn build_event_arrow(body: Expr) -> Expr {
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![build_event_param()],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(body))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: Default::default(),
    })
}

fn is_method_path(expr: &Expr) -> bool {
    matches!(unwrap_expr(expr), Expr::Ident(_) | Expr::Member(_))
}

fn build_handler_expr(expr: Expr) -> Expr {
    let inner = unwrap_expr(&expr).clone();
    match &inner {
        Expr::Arrow(_) | Expr::Fn(_) => inner,
        // 方法路径（如 `submit` / `actions.submit`）需要补上 `$event` 调用，
        // 这样 `<button v-on:click={submit}>` 与模板直觉保持一致。
        _ if is_method_path(&inner) => Expr::Arrow(ArrowExpr {
            span: DUMMY_SP,
            params: vec![build_event_param()],
            body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Call(CallExpr {
                span: DUMMY_SP,
                callee: Callee::Expr(Box::new(inner)),
                args: vec![ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Ident(emit::ident("$event"))),
                }],
                type_args: None,
                ctxt: Default::default(),
            })))),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
            ctxt: Default::default(),
        }),
        _ => build_event_arrow(inner),
    }
}

fn build_handler_expr_from_attr(attr: &JSXAttr) -> Option<Expr> {
    let expr = match &attr.value {
        None => return Some(build_noop_handler()),
        // 字符串属性可能是表达式，也可能是多条语句；先尝试按表达式解析，
        // 失败或包含分号时再包成 `($event) => { ... }`。
        Some(JSXAttrValue::Str(s)) => parse_inline_handler_source(&s.value.to_string_lossy())?,
        Some(JSXAttrValue::JSXExprContainer(container)) => match &container.expr {
            JSXExpr::Expr(expr) => unwrap_expr(expr.as_ref()).clone(),
            JSXExpr::JSXEmptyExpr(_) => return Some(build_noop_handler()),
        },
        _ => return None,
    };

    Some(build_handler_expr(expr))
}

fn modifier_array_expr(modifiers: &[String]) -> Expr {
    Expr::Array(ArrayLit {
        span: DUMMY_SP,
        elems: modifiers
            .iter()
            .map(|modifier| {
                Some(ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Lit(Lit::Str(Str {
                        span: DUMMY_SP,
                        value: modifier.as_str().into(),
                        raw: None,
                    }))),
                })
            })
            .collect(),
    })
}

fn wrap_with_modifiers(handler: Expr, modifiers: &[String]) -> Expr {
    if modifiers.is_empty() {
        handler
    } else {
        emit::call_ident(
            "_$compiledWithEventModifiers",
            vec![handler, modifier_array_expr(modifiers)],
        )
    }
}

fn handler_to_attr_value(handler: Expr) -> JSXAttrValue {
    JSXAttrValue::JSXExprContainer(JSXExprContainer {
        span: DUMMY_SP,
        expr: JSXExpr::Expr(Box::new(handler)),
    })
}

fn native_prop_name(standard_name: &str) -> String {
    format!("{}{}", COMPONENT_NATIVE_PREFIX, standard_name.trim_start_matches("on"))
}

pub fn transform_opening(opening: &mut JSXOpeningElement) {
    let is_component_opening = is_component(&opening.name);

    for attr_or_spread in &mut opening.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr_or_spread else {
            continue;
        };

        let Some(spec) = directive_spec_from_name(&attr.name) else {
            continue;
        };
        let Some(handler_expr) = build_handler_expr_from_attr(attr) else {
            continue;
        };

        // `.native` 参与编译期分流；原生 capture/once/passive 进入监听选项，
        // 其余行为修饰符由专用事件包装器处理。
        let runtime_modifiers: Vec<String> = spec
            .modifiers
            .iter()
            .filter(|modifier| {
                modifier.as_str() != "native"
                    && (is_component_opening
                        || !matches!(modifier.as_str(), "capture" | "once" | "passive"))
            })
            .cloned()
            .collect();
        let handler_expr = wrap_with_modifiers(handler_expr, &runtime_modifiers);

        // 组件 native 事件先改成内部属性名，避免和组件 props 的 `onClick` 语义混在一起。
        let mut next_name = if is_component_opening && spec.has_native {
            native_prop_name(&spec.standard_name)
        } else {
            spec.standard_name.clone()
        };

        if !is_component_opening {
            for (modifier, suffix) in
                [("capture", "Capture"), ("once", "Once"), ("passive", "Passive")]
            {
                if spec.modifiers.iter().any(|value| value == modifier) {
                    next_name.push_str(suffix);
                }
            }
        }

        attr.value = Some(handler_to_attr_value(handler_expr));
        attr.name = JSXAttrName::Ident(emit::ident(next_name.as_str()).into());
    }
}

#[cfg(test)]
#[path = "on_directive_tests.rs"]
mod tests;
