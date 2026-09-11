use std::sync::Arc;

use swc_core::common::{DUMMY_SP, FileName, SourceMap};
use swc_core::ecma::ast::*;
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_core::ecma::parser::{Parser, StringInput, Syntax, TsSyntax};

use crate::emit;
use crate::utils::{is_component, unwrap_expr};

/*
v-model/r-model 预处理：
- 组件：`v-model:user-name={x}` → `userName={x}` + `onUpdateUserName={(value)=>x=value}`，
  修饰符额外生成 `userNameModifiers`。
- 原生元素：根据标签和 input type 改写为 value/checked 与 onInput/onChange 的受控组合。
- 修饰符：trim/number/lazy 在编译期决定 handler 形态；number input 自动启用 number 转换。
- 设计重点：后续属性编译不需要认识 v-model，只处理普通 props 与事件。
*/
const MODEL_DIRECTIVE_NAMES: &[&str] = &["v-model", "r-model"];
const SAFE_MODEL_PREFIX: &str = "__rue_model__";
const SAFE_MODIFIERS_MARKER: &str = "__mods__";
const RAW_MODEL_MODIFIER_NAMES: &[&str] = &["trim", "number", "lazy"];

#[derive(Clone, Debug)]
struct ModelDirectiveSpec {
    prop_name: String,
    update_name: String,
    modifiers_prop_name: String,
    modifiers: Vec<String>,
}

#[derive(Clone, Debug)]
enum NativeModelKind {
    TextInput { event_name: &'static str, auto_number: bool },
    TextArea,
    Select { multiple: bool },
    Checkbox,
    Radio,
}

fn emit_expr_source(expr: &Expr) -> Option<String> {
    // 这里需要把左值表达式重新打印成源码字符串，用于生成赋值 handler。
    // 由于 SWC AST 没有直接的“以该表达式为左值重组字符串”助手，使用 codegen 是最稳妥的路径。
    let cm = Arc::new(SourceMap::default());
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    let script = Script {
        span: DUMMY_SP,
        body: vec![Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(expr.clone()) })],
        shebang: None,
    };
    emitter.emit_script(&script).ok()?;
    let emitted = String::from_utf8(buf).ok()?;
    let source = emitted.trim().trim_end_matches(';').trim().to_string();
    if source.is_empty() || source == "<invalid>" { None } else { Some(source) }
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

fn jsx_attr_value_from_expr(expr: Expr) -> JSXAttrValue {
    JSXAttrValue::JSXExprContainer(JSXExprContainer {
        span: DUMMY_SP,
        expr: JSXExpr::Expr(Box::new(expr)),
    })
}

fn make_attr(name: &str, expr: Expr) -> JSXAttrOrSpread {
    JSXAttrOrSpread::JSXAttr(JSXAttr {
        span: DUMMY_SP,
        name: JSXAttrName::Ident(emit::ident(name).into()),
        value: Some(jsx_attr_value_from_expr(expr)),
    })
}

fn jsx_attr_name_matches(name: &JSXAttrName, expected: &str) -> bool {
    match name {
        JSXAttrName::Ident(ident) => ident.sym.as_ref() == expected,
        JSXAttrName::JSXNamespacedName(_) => false,
    }
}

fn upsert_attr(opening: &mut JSXOpeningElement, name: &str, expr: Expr) {
    for attr_or_spread in &mut opening.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr_or_spread else {
            continue;
        };
        if !jsx_attr_name_matches(&attr.name, name) {
            continue;
        }
        attr.value = Some(jsx_attr_value_from_expr(expr));
        return;
    }

    opening.attrs.push(make_attr(name, expr));
}

fn build_noop_handler() -> Expr {
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
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

fn parsed_expr_or_noop(src: String, filename: &str) -> Expr {
    parse_expr(&src, filename).unwrap_or_else(build_noop_handler)
}

fn get_attr_value_expr(attr: &JSXAttr) -> Option<Expr> {
    match &attr.value {
        Some(JSXAttrValue::JSXExprContainer(ec)) => match &ec.expr {
            JSXExpr::Expr(e) => Some(*e.clone()),
            _ => None,
        },
        Some(JSXAttrValue::Str(s)) => Some(Expr::Lit(Lit::Str(s.clone()))),
        _ => None,
    }
}

fn get_static_truthy_bool(expr: &Expr) -> Option<bool> {
    match unwrap_expr(expr) {
        Expr::Lit(Lit::Str(s)) => Some(!s.value.is_empty()),
        Expr::Lit(Lit::Num(n)) => Some(n.value != 0.0 && !n.value.is_nan()),
        Expr::Lit(Lit::Bool(b)) => Some(b.value),
        Expr::Lit(Lit::Null(_)) => Some(false),
        Expr::Ident(id) if id.sym.as_ref() == "undefined" => Some(false),
        Expr::Unary(u) if matches!(u.op, UnaryOp::Void) => Some(false),
        _ => None,
    }
}

fn get_attr_expr_by_names(opening: &JSXOpeningElement, names: &[&str]) -> Option<Expr> {
    for attr_or_spread in &opening.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr_or_spread else {
            continue;
        };
        let JSXAttrName::Ident(ident) = &attr.name else {
            continue;
        };
        if names.contains(&ident.sym.as_ref()) {
            return get_attr_value_expr(attr);
        }
    }
    None
}

fn has_truthy_attr(opening: &JSXOpeningElement, name: &str) -> bool {
    for attr_or_spread in &opening.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr_or_spread else {
            continue;
        };
        let JSXAttrName::Ident(ident) = &attr.name else {
            continue;
        };
        if ident.sym.as_ref() != name {
            continue;
        }
        return match &attr.value {
            None => true,
            Some(JSXAttrValue::Str(s)) => !s.value.is_empty(),
            Some(JSXAttrValue::JSXExprContainer(ec)) => match &ec.expr {
                JSXExpr::Expr(expr) => get_static_truthy_bool(expr).unwrap_or(true),
                _ => true,
            },
            _ => true,
        };
    }
    false
}

fn get_static_string_attr(opening: &JSXOpeningElement, name: &str) -> Option<String> {
    for attr_or_spread in &opening.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr_or_spread else {
            continue;
        };
        let JSXAttrName::Ident(ident) = &attr.name else {
            continue;
        };
        if ident.sym.as_ref() != name {
            continue;
        }
        return match &attr.value {
            Some(JSXAttrValue::Str(s)) => Some(s.value.as_str().unwrap_or_default().to_string()),
            Some(JSXAttrValue::JSXExprContainer(ec)) => match &ec.expr {
                JSXExpr::Expr(expr) => match unwrap_expr(expr) {
                    Expr::Lit(Lit::Str(s)) => {
                        Some(s.value.as_str().unwrap_or_default().to_string())
                    }
                    _ => None,
                },
                _ => None,
            },
            _ => None,
        };
    }
    None
}

fn normalize_model_arg(raw: &str) -> Option<String> {
    let trimmed = raw.trim_matches(|ch| ch == '-' || ch == '_' || ch == ':' || ch == '.');
    if trimmed.is_empty() {
        return None;
    }

    if !trimmed.chars().any(|ch| ch == '-' || ch == '_' || ch == ':') {
        let mut chars = trimmed.chars();
        let first = chars.next()?;
        let mut normalized = String::new();
        normalized.extend(first.to_lowercase());
        normalized.push_str(chars.as_str());
        return Some(normalized);
    }

    let mut segments = trimmed.split(['-', '_', ':']).filter(|s| !s.is_empty());
    let first = segments.next()?.to_ascii_lowercase();
    let mut normalized = first;
    for segment in segments {
        let lower = segment.to_ascii_lowercase();
        let mut chars = lower.chars();
        let first = chars.next()?;
        normalized.extend(first.to_uppercase());
        normalized.push_str(chars.as_str());
    }
    Some(normalized)
}

fn pascalize_prop_name(raw: &str) -> String {
    let mut chars = raw.chars();
    let Some(first) = chars.next() else {
        return String::new();
    };
    let mut normalized = String::new();
    normalized.extend(first.to_uppercase());
    normalized.push_str(chars.as_str());
    normalized
}

fn normalize_modifier(raw: &str) -> Option<String> {
    let trimmed = raw.trim_matches(|ch| ch == '-' || ch == '_' || ch == ':' || ch == '.');
    if trimmed.is_empty() { None } else { Some(trimmed.to_ascii_lowercase()) }
}

fn is_raw_model_modifier_token(raw: &str) -> bool {
    let Some(normalized) = normalize_modifier(raw) else {
        return false;
    };
    RAW_MODEL_MODIFIER_NAMES.contains(&normalized.as_str())
}

fn parse_model_spec(raw_arg: Option<String>, modifiers: Vec<String>) -> ModelDirectiveSpec {
    let prop_name = raw_arg.unwrap_or_else(|| "modelValue".to_string());
    // 组件 v-model 的公开协议保持 JSX 友好的 Rue 风格：
    // prop 为 modelValue/自定义参数，更新事件为 onUpdateXxx，修饰符落到 xxxModifiers。
    let update_name = format!("onUpdate{}", pascalize_prop_name(&prop_name));
    let modifiers_prop_name = if prop_name == "modelValue" {
        "modelModifiers".to_string()
    } else {
        format!("{}Modifiers", prop_name)
    };
    ModelDirectiveSpec { prop_name, update_name, modifiers_prop_name, modifiers }
}

fn parse_raw_model_suffix(suffix: &str) -> Option<(Option<String>, Vec<String>)> {
    if suffix.is_empty() {
        return Some((None, Vec::new()));
    }

    if let Some(rest) = suffix.strip_prefix(':') {
        if rest.contains('.') {
            return None;
        }

        let tokens: Vec<&str> = rest.split('-').filter(|segment| !segment.is_empty()).collect();
        if tokens.is_empty() {
            return None;
        }

        // `v-model:lazy-trim-user-name` 中前缀 token 可能是修饰符，剩余部分才是参数名。
        // 这种顺序能兼容目前安全属性名的生成方式，也避免把 `user-name` 误拆成修饰符。
        let mut modifiers = Vec::new();
        let mut split_index = 0;
        while split_index < tokens.len() {
            let token = tokens[split_index];
            if !is_raw_model_modifier_token(token) {
                break;
            }
            modifiers.push(normalize_modifier(token)?);
            split_index += 1;
        }

        let arg_raw = tokens[split_index..].join("-");
        if arg_raw.is_empty() {
            return if modifiers.is_empty() { None } else { Some((None, modifiers)) };
        }

        return Some((Some(normalize_model_arg(&arg_raw)?), modifiers));
    }

    None
}

fn parse_safe_model_name(raw: &str) -> Option<(Option<String>, Vec<String>)> {
    // 预处理器早期可能已把不能直接作为 JSX 属性名的 model 语法编码成安全前缀。
    // 这里反向解码出参数名与修饰符，保证与原始 v-model 写法走同一套后续逻辑。
    let rest = raw.strip_prefix(SAFE_MODEL_PREFIX)?;
    let (arg_raw, modifier_raw) = match rest.split_once(SAFE_MODIFIERS_MARKER) {
        Some((arg_raw, modifier_raw)) => (arg_raw, Some(modifier_raw)),
        None => (rest, None),
    };
    let arg_name = if arg_raw.is_empty() { None } else { Some(normalize_model_arg(arg_raw)?) };
    let modifiers = modifier_raw
        .map(|raw| raw.split("__").filter_map(normalize_modifier).collect())
        .unwrap_or_default();
    Some((arg_name, modifiers))
}

fn directive_spec_from_name(name: &JSXAttrName) -> Option<ModelDirectiveSpec> {
    // 支持三种来源：
    // - JSX namespace：`v-model:foo`
    // - 普通 ident：`v-model` / `v-model:foo` 的可解析形态
    // - 安全前缀：上游为了规避 JSX 语法限制生成的内部属性名
    let (raw_arg, modifiers) = match name {
        JSXAttrName::JSXNamespacedName(ns_name) => {
            let namespace = ns_name.ns.sym.as_ref();
            if !MODEL_DIRECTIVE_NAMES.contains(&namespace) {
                return None;
            }
            parse_raw_model_suffix(&format!(":{}", ns_name.name.sym.as_ref()))?
        }
        JSXAttrName::Ident(ident) => {
            let raw = ident.sym.as_ref();
            if raw.starts_with(SAFE_MODEL_PREFIX) {
                parse_safe_model_name(raw)?
            } else if let Some(suffix) = raw.strip_prefix("v-model") {
                parse_raw_model_suffix(suffix)?
            } else if let Some(suffix) = raw.strip_prefix("r-model") {
                parse_raw_model_suffix(suffix)?
            } else {
                return None;
            }
        }
    };

    Some(parse_model_spec(raw_arg, modifiers))
}

fn is_model_directive_attr(attr: &JSXAttr) -> bool {
    directive_spec_from_name(&attr.name).is_some()
}

fn modifiers_object_expr(modifiers: &[String]) -> Expr {
    Expr::Object(ObjectLit {
        span: DUMMY_SP,
        props: modifiers
            .iter()
            .map(|modifier| {
                PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Str(emit::str_lit(modifier)),
                    value: Box::new(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true }))),
                })))
            })
            .collect(),
    })
}

fn build_component_update_handler(model_src: &str) -> Expr {
    parsed_expr_or_noop(
        format!("(value) => ({} = value)", model_src),
        "v-model-component-handler.tsx",
    )
}

// The host strips TypeScript before invoking Wasm plugins. Generated handlers
// must therefore contain JavaScript only, including DOM target reads.
fn build_text_model_handler(model_src: &str, value_src: &str, trim: bool, number: bool) -> Expr {
    let mut body = format!("let value = {};", value_src);
    // 修饰符在 handler 内按顺序落地：先 trim，再尝试 number。
    // number 转换失败时保留原字符串，避免把用户输入中的中间态强行变成 NaN。
    if trim {
        body.push_str("value = value.trim();");
    }
    if number {
        body.push_str(
            "const parsed = parseFloat(value);value = Number.isNaN(parsed) ? value : parsed;",
        );
    }
    body.push_str(&format!("{} = value;", model_src));
    parsed_expr_or_noop(format!("($event) => {{ {} }}", body), "v-model-text-handler.tsx")
}

fn build_checkbox_checked_expr(
    model_src: &str,
    value_src: &str,
    true_value_src: Option<&str>,
) -> Expr {
    // checked 判定与写回逻辑保持一致：
    // - 数组：includes(value)
    // - Set：has(value)
    // - 标量：存在 true-value 时比较 true-value，否则按布尔值判断
    let scalar = true_value_src
        .map(|true_value| format!("({}) === ({})", model_src, true_value))
        .unwrap_or_else(|| format!("!!({})", model_src));
    parsed_expr_or_noop(
        format!(
            "Array.isArray({0}) ? {0}.includes({1}) : {0} instanceof Set ? {0}.has({1}) : {2}",
            model_src, value_src, scalar,
        ),
        "v-model-checkbox-checked.tsx",
    )
}

fn build_checkbox_handler(
    model_src: &str,
    value_src: &str,
    true_value_src: &str,
    false_value_src: &str,
) -> Expr {
    parsed_expr_or_noop(
        format!(
            "($event) => {{ const checked = ($event.target).checked; const value = {value_src}; if (Array.isArray({model_src})) {{ {model_src} = checked ? ({model_src}.includes(value) ? {model_src} : {model_src}.concat([value])) : {model_src}.filter(item => item !== value); return; }} if ({model_src} instanceof Set) {{ {model_src} = checked ? new Set([...{model_src}, value]) : new Set(Array.from({model_src}).filter(item => item !== value)); return; }} {model_src} = checked ? {true_value_src} : {false_value_src}; }}",
            model_src = model_src,
            value_src = value_src,
            true_value_src = true_value_src,
            false_value_src = false_value_src,
        ),
        "v-model-checkbox-handler.tsx",
    )
}

fn build_radio_checked_expr(model_src: &str, value_src: &str) -> Expr {
    parsed_expr_or_noop(format!("({}) === ({})", model_src, value_src), "v-model-radio-checked.tsx")
}

fn build_radio_handler(model_src: &str, value_src: &str) -> Expr {
    parsed_expr_or_noop(
        format!(
            "($event) => {{ if (($event.target).checked) {{ {} = {}; }} }}",
            model_src, value_src,
        ),
        "v-model-radio-handler.tsx",
    )
}

fn build_select_multiple_handler(model_src: &str, trim: bool, number: bool) -> Expr {
    let mapper = if trim || number {
        // 多选 select 需要把 selectedOptions 映射成数组；
        // trim/number 对每个 option.value 独立执行，和单值输入保持同样语义。
        let mut body = "let value = option.value;".to_string();
        if trim {
            body.push_str("value = value.trim();");
        }
        if number {
            body.push_str(
                "const parsed = parseFloat(value);value = Number.isNaN(parsed) ? value : parsed;",
            );
        }
        body.push_str("return value;");
        format!("Array.from(($event.target).selectedOptions).map(option => {{ {} }})", body,)
    } else {
        "Array.from(($event.target).selectedOptions).map(option => option.value)".to_string()
    };

    parsed_expr_or_noop(
        format!("($event) => {{ {} = {}; }}", model_src, mapper),
        "v-model-select-multiple-handler.tsx",
    )
}

fn native_model_kind(opening: &JSXOpeningElement) -> NativeModelKind {
    let tag = match &opening.name {
        JSXElementName::Ident(ident) => ident.sym.as_ref().to_ascii_lowercase(),
        _ => String::new(),
    };

    match tag.as_str() {
        "textarea" => NativeModelKind::TextArea,
        "select" => NativeModelKind::Select { multiple: has_truthy_attr(opening, "multiple") },
        "input" => {
            let input_type = get_static_string_attr(opening, "type")
                .unwrap_or_else(|| "text".to_string())
                .to_ascii_lowercase();
            match input_type.as_str() {
                // checkbox/radio 的受控状态来自 checked；其它文本型控件统一走 value。
                "checkbox" => NativeModelKind::Checkbox,
                "radio" => NativeModelKind::Radio,
                "number" | "range" => {
                    NativeModelKind::TextInput { event_name: "onInput", auto_number: true }
                }
                _ => NativeModelKind::TextInput { event_name: "onInput", auto_number: false },
            }
        }
        _ => NativeModelKind::TextInput { event_name: "onInput", auto_number: false },
    }
}

fn apply_component_model(
    opening: &mut JSXOpeningElement,
    spec: &ModelDirectiveSpec,
    model_expr: Expr,
) {
    let model_src = emit_expr_source(&model_expr).unwrap_or_else(|| "undefined".to_string());
    // 组件只生成受控 props 协议，不关心 DOM 类型：
    // `prop=value` 负责读，`onUpdateXxx` 负责写回。
    upsert_attr(opening, &spec.prop_name, model_expr);
    upsert_attr(opening, &spec.update_name, build_component_update_handler(&model_src));
    if !spec.modifiers.is_empty() {
        upsert_attr(opening, &spec.modifiers_prop_name, modifiers_object_expr(&spec.modifiers));
    }
}

fn apply_native_model(opening: &mut JSXOpeningElement, model_expr: Expr, modifiers: &[String]) {
    let model_src = emit_expr_source(&model_expr).unwrap_or_else(|| "undefined".to_string());
    let trim = modifiers.iter().any(|modifier| modifier == "trim");
    let lazy = modifiers.iter().any(|modifier| modifier == "lazy");
    let explicit_number = modifiers.iter().any(|modifier| modifier == "number");

    // value/true-value/false-value 可能已由用户显式提供；
    // 编译出的 checked/handler 会复用这些值，避免 v-model 覆盖用户的取值语义。
    let value_expr = get_attr_expr_by_names(opening, &["value"]);
    let value_src = value_expr
        .as_ref()
        .and_then(emit_expr_source)
        .unwrap_or_else(|| "($event.target).value".to_string());
    let checked_value_src =
        value_expr.as_ref().and_then(emit_expr_source).unwrap_or_else(|| "\"on\"".to_string());
    let true_value_src = get_attr_expr_by_names(opening, &["true-value", "trueValue"])
        .and_then(|expr| emit_expr_source(&expr))
        .unwrap_or_else(|| "true".to_string());
    let false_value_src = get_attr_expr_by_names(opening, &["false-value", "falseValue"])
        .and_then(|expr| emit_expr_source(&expr))
        .unwrap_or_else(|| "false".to_string());

    match native_model_kind(opening) {
        NativeModelKind::TextInput { event_name, auto_number } => {
            // 文本输入默认 input 实时同步；lazy 修饰符切换到 change。
            let event_name = if lazy { "onChange" } else { event_name };
            let number = explicit_number || auto_number;
            let dom_value_src = "($event.target).value".to_string();
            upsert_attr(opening, "value", model_expr);
            upsert_attr(
                opening,
                event_name,
                build_text_model_handler(&model_src, &dom_value_src, trim, number),
            );
        }
        NativeModelKind::TextArea => {
            let event_name = if lazy { "onChange" } else { "onInput" };
            upsert_attr(opening, "value", model_expr);
            upsert_attr(
                opening,
                event_name,
                build_text_model_handler(
                    &model_src,
                    "($event.target).value",
                    trim,
                    explicit_number,
                ),
            );
        }
        NativeModelKind::Select { multiple } => {
            upsert_attr(opening, "value", model_expr);
            if multiple {
                // 多选 select 的模型值是数组，因此单独生成 selectedOptions 收集逻辑。
                upsert_attr(
                    opening,
                    "onChange",
                    build_select_multiple_handler(&model_src, trim, explicit_number),
                );
            } else {
                upsert_attr(
                    opening,
                    "onChange",
                    build_text_model_handler(
                        &model_src,
                        "($event.target).value",
                        trim,
                        explicit_number,
                    ),
                );
            }
        }
        NativeModelKind::Checkbox => {
            // checkbox 支持三种模型：数组、Set、标量 true/false-value。
            let true_value_opt = get_attr_expr_by_names(opening, &["true-value", "trueValue"])
                .and_then(|expr| emit_expr_source(&expr));
            upsert_attr(
                opening,
                "checked",
                build_checkbox_checked_expr(
                    &model_src,
                    &checked_value_src,
                    true_value_opt.as_deref(),
                ),
            );
            upsert_attr(
                opening,
                "onChange",
                build_checkbox_handler(&model_src, &value_src, &true_value_src, &false_value_src),
            );
        }
        NativeModelKind::Radio => {
            upsert_attr(
                opening,
                "checked",
                build_radio_checked_expr(&model_src, &checked_value_src),
            );
            upsert_attr(opening, "onChange", build_radio_handler(&model_src, &value_src));
        }
    }
}

pub fn transform_opening(opening: &mut JSXOpeningElement) {
    // 先收集再删除，避免边遍历边修改 attrs 导致跳过或重复处理。
    let directives: Vec<(ModelDirectiveSpec, Expr)> = opening
        .attrs
        .iter()
        .filter_map(|attr_or_spread| match attr_or_spread {
            JSXAttrOrSpread::JSXAttr(attr) => {
                let spec = directive_spec_from_name(&attr.name)?;
                let value = get_attr_value_expr(attr)
                    .unwrap_or_else(|| Expr::Ident(emit::ident("undefined")));
                Some((spec, value))
            }
            _ => None,
        })
        .collect();

    if directives.is_empty() {
        return;
    }

    opening.attrs.retain(|attr_or_spread| match attr_or_spread {
        JSXAttrOrSpread::JSXAttr(attr) => !is_model_directive_attr(attr),
        _ => true,
    });

    if is_component(&opening.name) {
        // 组件允许多个 v-model（不同参数名）；每个都展开成独立 prop/update 对。
        for (spec, model_expr) in directives {
            apply_component_model(opening, &spec, model_expr);
        }
        return;
    }

    if let Some((spec, model_expr)) = directives.into_iter().next() {
        // 原生元素只有一个真实 value/checked 通道，多个 model 没有清晰语义；保守使用第一个。
        apply_native_model(opening, model_expr, &spec.modifiers);
    }
}

#[cfg(test)]
#[path = "model_directive_tests.rs"]
mod tests;
