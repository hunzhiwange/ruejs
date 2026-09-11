use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::ast::*;
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

use crate::reactive_provenance::{
    ReactiveKind, collect_component_parameter_scope, collect_module_scope, collect_parameter_scope,
    collect_stmt_scope,
};
use crate::vapor::VaporTransform;

fn parse_module(source: &str) -> Module {
    let cm = Arc::new(SourceMap::default());
    let file = cm.new_source_file(
        FileName::Custom("reactive-provenance-test.tsx".into()).into(),
        source.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*file),
        None,
    );
    parser.parse_module().expect("parse module")
}

fn transform_with_scope(scope: HashSet<String>) -> VaporTransform {
    VaporTransform {
        next_el: 0,
        next_list: 0,
        next_map: 0,
        next_child: 0,
        once_depth: 0,
        did_transform: false,
        static_templates: false,
        el_tag_by_ident: HashMap::new(),
        renderable_local_scopes: Vec::new(),
        plain_local_scopes: vec![scope],
    }
}

#[test]
fn tracks_rue_reactive_factories_through_hooks_aliases_and_destructuring() {
    let module = parse_module(
        r#"
        import { ref as makeRef, shallowRef, customRef, toRef, toRefs } from "@rue-js/rue";
        import { reactive as makeReactive, shallowReadonly, computed as derive } from "@rue-js/rue/internal";
        import { signal, useSignal as makeSignal, useState } from "@rue-js/rue/internal";

        const localRef = makeRef;
        const count = _$compiledWithHookId("ref:0", () => localRef(0));
        const shallow = shallowRef(0);
        const custom = customRef(factory);
        const property = toRef(model, "property");
        const proxy = makeReactive({ value: 1 });
        const readonlyProxy = shallowReadonly(proxy);
        const total = derive(() => count.value);
        const directSignal = signal(0);
        const [hookSignal] = _$compiledWithHookId("useSignal:0", () => makeSignal(0));
        const [state, setState] = _$compiledWithHookId("useState:0", () => useState(0));
        const { left: leftRef, right } = toRefs(proxy);
        const countAlias = count;
        const arbitraryMember = external.value;
        "#,
    );

    let scope = collect_module_scope(&module, &[]);
    let transform = transform_with_scope(scope);

    for name in
        ["count", "shallow", "custom", "property", "leftRef", "right", "countAlias", "total"]
    {
        assert_eq!(transform.reactive_kind(name), Some(ReactiveKind::RefLike), "{name}");
    }
    for name in ["directSignal"] {
        assert_eq!(transform.reactive_kind(name), Some(ReactiveKind::Signal), "{name}");
    }
    assert_eq!(transform.reactive_kind("hookSignal"), None);
    for name in ["proxy", "readonlyProxy"] {
        assert_eq!(transform.reactive_kind(name), Some(ReactiveKind::ObjectValue), "{name}");
    }
    assert_eq!(transform.reactive_kind("state"), Some(ReactiveKind::StateValue));
    assert_eq!(transform.reactive_kind("setState"), None);
    assert_eq!(transform.reactive_kind("arbitraryMember"), None);
}

#[test]
fn tracks_compiled_use_state_hidden_values_as_signals() {
    let module = parse_module(
        r#"
        const [_$state, setState] = _$compiledUseState("Counter:hook:0", 0);
        "#,
    );

    let transform = transform_with_scope(collect_module_scope(&module, &[]));
    assert_eq!(transform.reactive_kind("_$state"), Some(ReactiveKind::Signal));
    assert_eq!(transform.reactive_kind("setState"), None);
}

#[test]
fn tracks_reactive_values_returned_by_compiled_setup() {
    let module = parse_module(
        r#"
        import { signal, _$compiledSetup } from "@rue-js/rue/internal";
        const _$useSetup = _$compiledSetup("App:setup-region:0", () => {
            const rows = signal([]);
            return { rows };
        });
        const { rows } = _$useSetup;
        "#,
    );

    let scope = collect_module_scope(&module, &[]);
    let transform = transform_with_scope(scope);
    assert_eq!(transform.reactive_kind("rows"), Some(ReactiveKind::Signal));
}

#[test]
fn tracks_compiler_internal_reactive_factories() {
    let module = parse_module(
        r#"
        import { signal, _$compiledSetup } from "@rue-js/rue/internal/compiler";
        const state = signal(0);
        const setup = _$compiledSetup("App:setup-region:0", () => ({ state }));
        "#,
    );
    let transform = transform_with_scope(collect_module_scope(&module, &[]));
    assert_eq!(transform.reactive_kind("state"), Some(ReactiveKind::Signal));
}

#[test]
fn invalidates_shadowed_reassigned_and_unknown_values() {
    let module = parse_module(
        r#"
        import { ref, computed } from "@rue-js/rue";
        const stable = ref(0);
        const unknownReturn = makeFactory();
        const unknownAlias = unknownReturn;
        let reassigned = computed(() => 1);
        reassigned = getUnknown();

        function nested(ref, stable) {
            const shadowedFactoryResult = ref(0);
            const shadowedValueAlias = stable;
            const member = object.current;
        }
        "#,
    );

    let module_scope = collect_module_scope(&module, &[]);
    let module_transform = transform_with_scope(module_scope.clone());
    assert_eq!(module_transform.reactive_kind("stable"), Some(ReactiveKind::RefLike));
    for name in ["unknownReturn", "unknownAlias", "reassigned"] {
        assert_eq!(module_transform.reactive_kind(name), None, "{name}");
    }

    let function = module
        .body
        .iter()
        .find_map(|item| match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Fn(function))) => Some(&function.function),
            _ => None,
        })
        .expect("nested function");
    let parameter_scope =
        collect_parameter_scope(function.params.iter().map(|parameter| &parameter.pat));
    let body = function.body.as_ref().expect("function body");
    let scopes = vec![module_scope, parameter_scope];
    let body_scope = collect_stmt_scope(body.stmts.iter(), &scopes);
    let mut nested_transform = transform_with_scope(scopes[0].clone());
    nested_transform.plain_local_scopes.push(scopes[1].clone());
    nested_transform.plain_local_scopes.push(body_scope);

    for name in ["ref", "stable", "shadowedFactoryResult", "shadowedValueAlias", "member"] {
        assert_eq!(nested_transform.reactive_kind(name), None, "{name}");
    }
}

#[test]
fn marks_component_props_and_slots_parameters() {
    let module = parse_module("function component(props, context) {}");
    let function = module
        .body
        .iter()
        .find_map(|item| match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Fn(function))) => Some(&function.function),
            _ => None,
        })
        .expect("component function");

    let component_scope =
        collect_component_parameter_scope(function.params.iter().map(|parameter| &parameter.pat));
    let component_transform = transform_with_scope(component_scope);
    assert_eq!(component_transform.reactive_kind("props"), Some(ReactiveKind::PropsValue));
    assert_eq!(component_transform.reactive_kind("context"), Some(ReactiveKind::SlotsValue));

    let ordinary_scope =
        collect_parameter_scope(function.params.iter().map(|parameter| &parameter.pat));
    let ordinary_transform = transform_with_scope(ordinary_scope);
    assert_eq!(ordinary_transform.reactive_kind("props"), None);
    assert_eq!(ordinary_transform.reactive_kind("context"), None);
}

#[test]
fn computed_value_and_get_are_compiled_scalar_reads() {
    let module = parse_module(
        r#"
      import { computed } from '@rue-js/rue';
      const derived = computed(() => 2);
      derived.value;
      derived.get();
    "#,
    );
    let vt = transform_with_scope(collect_module_scope(&module, &[]));
    for item in &module.body {
        if let ModuleItem::Stmt(Stmt::Expr(expression)) = item {
            assert!(crate::vapor::is_compiled_reactive_scalar_expr(
                &vt,
                &expression.expr,
                &HashSet::new()
            ));
        }
    }
}
