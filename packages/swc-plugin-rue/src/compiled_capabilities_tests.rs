use crate::compiled_capabilities::{
    RuntimeImportEntry, runtime_import_entry, should_auto_inject_helper,
};

#[test]
fn helpers_have_one_semantic_entry() {
    for (helper, entry) in [
        ("signal", RuntimeImportEntry::Reactive),
        ("_$compiledSignal", RuntimeImportEntry::Reactive),
        ("_$compiledCreateElement", RuntimeImportEntry::Dom),
        ("_$compiledRoot", RuntimeImportEntry::Block),
        ("_$mountCompiledComponent", RuntimeImportEntry::Component),
        ("useEmit", RuntimeImportEntry::Component),
        ("onErrorCaptured", RuntimeImportEntry::Component),
        ("_$reconcileKeyed", RuntimeImportEntry::List),
        ("_$compiledDelegateEvent", RuntimeImportEntry::Events),
        ("Teleport", RuntimeImportEntry::Builtin),
        ("_$claimElement", RuntimeImportEntry::Hydrate),
        ("_$writeElement", RuntimeImportEntry::Ssr),
    ] {
        assert_eq!(runtime_import_entry(helper), Some(entry), "{helper}");
    }
}

#[test]
fn unknown_helpers_and_removed_proxy_apis_have_no_entry() {
    for helper in [
        "_$unknown",
        "_$mountCompiledDynamic",
        "_$compiledDynamicComponent",
        "_$compiledSlotValue",
        "_$compiledMarkComponentRenderReactive",
        "userHelper",
        "reactive",
        "readonly",
        "propsReactive",
        "isProxy",
        "toRaw",
        "toRef",
        "toRefs",
        "Hydration",
    ] {
        assert_eq!(runtime_import_entry(helper), None);
        assert!(!should_auto_inject_helper(helper));
    }
}

#[test]
fn only_generated_helpers_are_automatically_injected() {
    assert!(!should_auto_inject_helper("signal"));
    assert!(should_auto_inject_helper("effect"));
    assert!(should_auto_inject_helper("_$compiledRoot"));
}
