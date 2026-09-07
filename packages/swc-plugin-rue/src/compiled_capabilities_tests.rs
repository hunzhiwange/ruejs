use crate::compiled_capabilities::{
    RuntimeTier, aggregate_runtime_tier, runtime_import_tier, runtime_tier_for_helper,
    should_auto_inject_helper,
};

#[test]
fn aggregates_module_runtime_tier_from_used_capabilities() {
    assert_eq!(aggregate_runtime_tier(std::iter::empty()), RuntimeTier::None);
    assert_eq!(
        aggregate_runtime_tier(["signal", "effect", "_$compiledRoot"]),
        RuntimeTier::Compiled,
    );
    assert_eq!(
        aggregate_runtime_tier(["signal", "_$compiledMarkComponentRenderReactive"]),
        RuntimeTier::Vapor,
    );
    assert_eq!(aggregate_runtime_tier(["unknownUserBinding"]), RuntimeTier::None,);
}

#[test]
fn classifies_compiled_core_and_vapor_fallback_helpers() {
    for helper in [
        "signal",
        "effect",
        "batch",
        "untrack",
        "onCleanup",
        "createOwner",
        "runWithOwner",
        "disposeOwner",
        "createSelector",
        "_$compiledRoot",
        "_$reconcileKeyed",
        "_$reconcileKeyedSingle",
        "_$disposeCompiledKeyedRows",
        "_$mountCompiledKeyedRowOwnerless",
        "_$mountCompiledKeyedRowSetup",
        "_$mountCompiledKeyedSingleRow",
        "_$mountCompiledKeyedSingleRowOwnerless",
        "_$mountCompiledKeyedSingleRowSetup",
        "_$compiledText",
        "_$withCompiledHookScope",
        "Transition",
        "TransitionGroup",
        "KeepAlive",
        "Suspense",
        "Teleport",
        "Template",
    ] {
        assert_eq!(runtime_tier_for_helper(helper), Some(RuntimeTier::Compiled), "{helper}");
    }

    for helper in [
        "_$createComponent",
        "vapor",
        "useSetup",
        "Hydration",
        "_$compiledMarkComponentRenderReactive",
    ] {
        assert_eq!(runtime_tier_for_helper(helper), Some(RuntimeTier::Vapor), "{helper}");
    }

    assert_eq!(runtime_tier_for_helper("userHelper"), None);
}

#[test]
fn upgrades_shared_compiled_core_helpers_for_vapor_modules() {
    assert_eq!(runtime_import_tier("signal", RuntimeTier::Compiled), Some(RuntimeTier::Compiled),);
    assert_eq!(runtime_import_tier("signal", RuntimeTier::Vapor), Some(RuntimeTier::Vapor),);
    assert_eq!(runtime_import_tier("untrack", RuntimeTier::Vapor), Some(RuntimeTier::Vapor),);
    assert_eq!(runtime_import_tier("_$compiledRoot", RuntimeTier::Vapor), Some(RuntimeTier::Vapor),);

    for helper in
        ["createOwner", "runWithOwner", "disposeOwner", "createSelector", "_$reconcileKeyed"]
    {
        assert_eq!(
            runtime_import_tier(helper, RuntimeTier::Vapor),
            Some(RuntimeTier::Vapor),
            "mixed modules must keep {helper} on the Vapor reactive graph",
        );
    }

    for helper in ["Teleport", "Suspense", "KeepAlive", "Transition", "TransitionGroup", "Template"]
    {
        assert_eq!(
            runtime_import_tier(helper, RuntimeTier::Vapor),
            Some(RuntimeTier::Compiled),
            "compiled builtins must keep the closed owner graph",
        );
    }
}

#[test]
fn distinguishes_routable_user_apis_from_generated_helpers() {
    assert!(!should_auto_inject_helper("signal"));
    assert!(should_auto_inject_helper("effect"));
    assert!(should_auto_inject_helper("onCleanup"));
    assert!(should_auto_inject_helper("_$compiledRoot"));
    assert!(should_auto_inject_helper("_$compiledMemo"));
    assert!(should_auto_inject_helper("_$withCompiledHookScope"));
    assert!(should_auto_inject_helper("_$reconcileKeyed"));
    assert!(should_auto_inject_helper("_$reconcileKeyedSingle"));
    assert!(should_auto_inject_helper("_$disposeCompiledKeyedRows"));
    assert!(should_auto_inject_helper("_$mountCompiledKeyedRowOwnerless"));
    assert!(should_auto_inject_helper("_$mountCompiledKeyedSingleRowOwnerless"));
    assert!(should_auto_inject_helper("createSelector"));
    assert!(should_auto_inject_helper("_$compiledText"));
    assert!(should_auto_inject_helper("untrack"));
    assert!(should_auto_inject_helper("_$compiledMarkComponentRenderReactive"));
}

#[test]
fn routes_reactive_factories_to_their_proven_runtime_tier() {
    for helper in ["ref", "useState", "computed"] {
        assert_eq!(runtime_tier_for_helper(helper), Some(RuntimeTier::Compiled), "{helper}");
        assert_eq!(runtime_import_tier(helper, RuntimeTier::Vapor), Some(RuntimeTier::Vapor));
    }

    for helper in ["useSignal", "useMemo", "useCallback"] {
        assert_eq!(runtime_tier_for_helper(helper), None, "{helper}");
    }

    for helper in [
        "shallowRef",
        "customRef",
        "triggerRef",
        "toRef",
        "toRefs",
        "reactive",
        "shallowReactive",
        "readonly",
        "shallowReadonly",
        "propsReactive",
    ] {
        assert_eq!(runtime_tier_for_helper(helper), Some(RuntimeTier::Vapor), "{helper}");
        assert_eq!(runtime_import_tier(helper, RuntimeTier::Vapor), Some(RuntimeTier::Vapor));
    }
}
