#[derive(Clone, Copy, Debug, Default, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum RuntimeTier {
    #[default]
    None,
    Compiled,
    Vapor,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum RuntimeImportEntry {
    Compiler,
    Component,
    Builtins,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct RuntimeCapability {
    helper: &'static str,
    tier: RuntimeTier,
    available_in_vapor: bool,
    auto_injected: bool,
}

const fn capability(
    helper: &'static str,
    tier: RuntimeTier,
    available_in_vapor: bool,
) -> RuntimeCapability {
    RuntimeCapability { helper, tier, available_in_vapor, auto_injected: false }
}

const fn auto_capability(
    helper: &'static str,
    tier: RuntimeTier,
    available_in_vapor: bool,
) -> RuntimeCapability {
    RuntimeCapability { helper, tier, available_in_vapor, auto_injected: true }
}

// This table is the single source of truth for generated helpers and root values that may be
// moved to a runtime subpath. Shared core helpers upgrade to Vapor with the module tier so one
// module does not split its reactive ownership graph across runtimes.
const RUNTIME_CAPABILITIES: &[RuntimeCapability] = &[
    capability("signal", RuntimeTier::Compiled, true),
    auto_capability("effect", RuntimeTier::Compiled, true),
    capability("batch", RuntimeTier::Compiled, true),
    auto_capability("untrack", RuntimeTier::Compiled, true),
    auto_capability("onCleanup", RuntimeTier::Compiled, true),
    auto_capability("onOwnerCleanup", RuntimeTier::Compiled, true),
    capability("createOwner", RuntimeTier::Compiled, true),
    capability("runWithOwner", RuntimeTier::Compiled, true),
    capability("disposeOwner", RuntimeTier::Compiled, true),
    auto_capability("createSelector", RuntimeTier::Compiled, true),
    capability("setReactiveScheduling", RuntimeTier::Compiled, true),
    auto_capability("_$compiledRoot", RuntimeTier::Compiled, true),
    auto_capability("_$compiledSetup", RuntimeTier::Compiled, true),
    auto_capability("_$compiledUseSetup", RuntimeTier::Compiled, true),
    auto_capability("_$compiledUseRef", RuntimeTier::Compiled, true),
    auto_capability("_$compiledMemo", RuntimeTier::Compiled, true),
    auto_capability("_$compiledPath", RuntimeTier::Compiled, true),
    auto_capability("_$compiledReadPath", RuntimeTier::Compiled, true),
    auto_capability("_$compiledStateRoot", RuntimeTier::Compiled, true),
    auto_capability("_$compiledStateMember", RuntimeTier::Compiled, true),
    auto_capability("_$compiledStateDelete", RuntimeTier::Compiled, true),
    auto_capability("_$compiledStateMutator", RuntimeTier::Compiled, true),
    auto_capability("_$compiledUseState", RuntimeTier::Compiled, true),
    auto_capability("_$compiledUseEffect", RuntimeTier::Compiled, true),
    auto_capability("_$compiledSignal", RuntimeTier::Compiled, true),
    auto_capability("_$compiledBatch", RuntimeTier::Compiled, true),
    auto_capability("_$compiledRenderEffect", RuntimeTier::Compiled, true),
    auto_capability("_$compiledDelegateEvent", RuntimeTier::Compiled, true),
    auto_capability("_$compiledBranch", RuntimeTier::Compiled, true),
    auto_capability("_$compiledBranchAt", RuntimeTier::Compiled, true),
    auto_capability("_$compiledRootFactory", RuntimeTier::Compiled, true),
    auto_capability("_$withCompiledPropsUpdater", RuntimeTier::Compiled, true),
    auto_capability("_$withCompiledHookScope", RuntimeTier::Compiled, true),
    auto_capability("_$mountCompiledComponent", RuntimeTier::Compiled, true),
    auto_capability("_$mountCompiledSlotFactory", RuntimeTier::Compiled, true),
    auto_capability("_$mountCompiledSlotAt", RuntimeTier::Compiled, true),
    auto_capability("_$mountCompiledDynamic", RuntimeTier::Compiled, true),
    auto_capability("_$reconcileKeyed", RuntimeTier::Compiled, true),
    auto_capability("_$reconcileKeyedSingle", RuntimeTier::Compiled, true),
    auto_capability("_$disposeCompiledKeyedRows", RuntimeTier::Compiled, true),
    auto_capability("_$compiledListMemo", RuntimeTier::Compiled, true),
    auto_capability("_$mountCompiledKeyedRow", RuntimeTier::Compiled, true),
    auto_capability("_$mountCompiledKeyedRowOwnerless", RuntimeTier::Compiled, true),
    auto_capability("_$mountCompiledKeyedRowSetup", RuntimeTier::Compiled, true),
    auto_capability("_$mountCompiledKeyedSingleRow", RuntimeTier::Compiled, true),
    auto_capability("_$mountCompiledKeyedSingleRowOwnerless", RuntimeTier::Compiled, true),
    auto_capability("_$mountCompiledKeyedSingleRowSetup", RuntimeTier::Compiled, true),
    auto_capability("_$compiledCreateElement", RuntimeTier::Compiled, true),
    auto_capability("_$compiledCreateDocumentFragment", RuntimeTier::Compiled, true),
    auto_capability("_$compiledCreateTextNode", RuntimeTier::Compiled, true),
    auto_capability("_$compiledCreateComment", RuntimeTier::Compiled, true),
    auto_capability("_$compiledSpreadAttributes", RuntimeTier::Compiled, true),
    auto_capability("_$compiledOmitProps", RuntimeTier::Compiled, true),
    auto_capability("_$compiledPropsGet", RuntimeTier::Compiled, true),
    auto_capability("_$compiledPropsCall", RuntimeTier::Compiled, true),
    auto_capability("_$compiledPropsHas", RuntimeTier::Compiled, true),
    auto_capability("_$compiledPropsKeys", RuntimeTier::Compiled, true),
    auto_capability("_$compiledPropsSnapshot", RuntimeTier::Compiled, true),
    auto_capability("_$compiledSlotValue", RuntimeTier::Compiled, true),
    auto_capability("_$compiledAppendChild", RuntimeTier::Compiled, true),
    auto_capability("_$compiledText", RuntimeTier::Compiled, true),
    auto_capability("_$template", RuntimeTier::Compiled, true),
    auto_capability("onScopeDispose", RuntimeTier::Compiled, true),
    capability("setCurrentInstance", RuntimeTier::Vapor, true),
    auto_capability("getCurrentInstance", RuntimeTier::Compiled, true),
    auto_capability("getCurrentOwner", RuntimeTier::Compiled, true),
    capability("withHookSlot", RuntimeTier::Vapor, true),
    capability("toValue", RuntimeTier::Compiled, true),
    capability("watchFn", RuntimeTier::Vapor, true),
    auto_capability("watchEffect", RuntimeTier::Compiled, true),
    capability("watchSignal", RuntimeTier::Vapor, true),
    capability("watchDeepSignal", RuntimeTier::Vapor, true),
    capability("watchPath", RuntimeTier::Vapor, true),
    capability("createResource", RuntimeTier::Compiled, true),
    capability("watch", RuntimeTier::Compiled, true),
    capability("useState", RuntimeTier::Compiled, true),
    capability("useEffect", RuntimeTier::Compiled, true),
    capability("ref", RuntimeTier::Compiled, true),
    capability("shallowRef", RuntimeTier::Vapor, true),
    capability("isRef", RuntimeTier::Compiled, true),
    capability("customRef", RuntimeTier::Vapor, true),
    capability("triggerRef", RuntimeTier::Vapor, true),
    capability("toRef", RuntimeTier::Vapor, true),
    capability("toRefs", RuntimeTier::Vapor, true),
    auto_capability("computed", RuntimeTier::Compiled, true),
    capability("isReactive", RuntimeTier::Compiled, true),
    capability("isReadonly", RuntimeTier::Compiled, true),
    auto_capability("useSetup", RuntimeTier::Vapor, true),
    capability("useRef", RuntimeTier::Compiled, true),
    capability("unref", RuntimeTier::Vapor, true),
    auto_capability("renderAnchor", RuntimeTier::Compiled, true),
    capability("useApp", RuntimeTier::Compiled, true),
    capability("onBeforeCreate", RuntimeTier::Vapor, true),
    capability("onCreated", RuntimeTier::Vapor, true),
    capability("onBeforeMount", RuntimeTier::Compiled, true),
    capability("onMounted", RuntimeTier::Compiled, true),
    capability("onBeforeUpdate", RuntimeTier::Compiled, true),
    capability("onUpdated", RuntimeTier::Compiled, true),
    capability("onRenderTracked", RuntimeTier::Compiled, true),
    auto_capability("onBeforeUnmount", RuntimeTier::Compiled, true),
    capability("onUnmounted", RuntimeTier::Compiled, true),
    capability("onError", RuntimeTier::Vapor, true),
    capability("getCurrentContainer", RuntimeTier::Compiled, true),
    capability("Hydration", RuntimeTier::Vapor, true),
    capability("Transition", RuntimeTier::Compiled, false),
    capability("TransitionGroup", RuntimeTier::Compiled, false),
    capability("KeepAlive", RuntimeTier::Compiled, false),
    capability("Suspense", RuntimeTier::Compiled, false),
    capability("Teleport", RuntimeTier::Compiled, false),
    auto_capability("Template", RuntimeTier::Compiled, false),
    auto_capability("_$createComponent", RuntimeTier::Vapor, true),
    auto_capability("_$compiledComponent", RuntimeTier::Compiled, true),
    auto_capability("_$compiledDynamicComponent", RuntimeTier::Compiled, true),
    auto_capability("_$compiledWithHookId", RuntimeTier::Compiled, true),
    auto_capability("_$compiledMarkComponentRenderReactive", RuntimeTier::Vapor, true),
    auto_capability("_$createElement", RuntimeTier::Compiled, true),
    auto_capability("_$createComment", RuntimeTier::Compiled, true),
    auto_capability("_$createTextNode", RuntimeTier::Compiled, true),
    auto_capability("_$setStyle", RuntimeTier::Compiled, true),
    auto_capability("_$settextContent", RuntimeTier::Compiled, true),
    auto_capability("_$createDocumentFragment", RuntimeTier::Compiled, true),
    auto_capability("_$appendChild", RuntimeTier::Compiled, true),
    auto_capability("_$insertBefore", RuntimeTier::Compiled, true),
    auto_capability("_$createTextWrapper", RuntimeTier::Compiled, true),
    auto_capability("_$compiledWithKey", RuntimeTier::Compiled, true),
    auto_capability("_$compiledShowStyle", RuntimeTier::Compiled, true),
    auto_capability("_$compiledBindUseRef", RuntimeTier::Compiled, true),
    auto_capability("_$compiledWithEventModifiers", RuntimeTier::Compiled, true),
    auto_capability("_$compiledWithNativeEvents", RuntimeTier::Compiled, true),
    auto_capability("_$setAttribute", RuntimeTier::Compiled, true),
    auto_capability("_$addEventListener", RuntimeTier::Compiled, true),
    auto_capability("_$setClassName", RuntimeTier::Compiled, true),
    auto_capability("_$setInnerHTML", RuntimeTier::Compiled, true),
    auto_capability("_$setValue", RuntimeTier::Compiled, true),
    auto_capability("_$setChecked", RuntimeTier::Compiled, true),
    auto_capability("_$setDisabled", RuntimeTier::Compiled, true),
    auto_capability("_$setProperty", RuntimeTier::Compiled, true),
    auto_capability("_$spreadAttributes", RuntimeTier::Compiled, true),
];

pub(crate) fn runtime_tier_for_helper(helper: &str) -> Option<RuntimeTier> {
    RUNTIME_CAPABILITIES
        .iter()
        .find(|capability| capability.helper == helper)
        .map(|capability| capability.tier)
}

pub(crate) fn should_auto_inject_helper(helper: &str) -> bool {
    RUNTIME_CAPABILITIES
        .iter()
        .find(|capability| capability.helper == helper)
        .is_some_and(|capability| capability.auto_injected)
}

pub(crate) fn aggregate_runtime_tier<'a>(
    helpers: impl IntoIterator<Item = &'a str>,
) -> RuntimeTier {
    helpers.into_iter().filter_map(runtime_tier_for_helper).max().unwrap_or_default()
}

pub(crate) fn runtime_import_tier(helper: &str, module_tier: RuntimeTier) -> Option<RuntimeTier> {
    let capability = RUNTIME_CAPABILITIES.iter().find(|capability| capability.helper == helper)?;
    if module_tier == RuntimeTier::Vapor && capability.available_in_vapor {
        Some(RuntimeTier::Vapor)
    } else {
        Some(capability.tier)
    }
}

const BUILTIN_HELPERS: &[&str] =
    &["KeepAlive", "Suspense", "Teleport", "Template", "Transition", "TransitionGroup"];

// Helpers implemented by the component/legacy DOM ABI rather than the compact compiler ABI.
const COMPONENT_HELPERS: &[&str] = &[
    "_$addEventListener",
    "_$appendChild",
    "_$compiledBindUseRef",
    "_$compiledBranch",
    "_$compiledBranchAt",
    "_$compiledComponent",
    "_$compiledDynamicComponent",
    "_$compiledOmitProps",
    "_$compiledShowStyle",
    "_$compiledSlotValue",
    "_$compiledSpreadAttributes",
    "_$compiledUseEffect",
    "_$compiledUseRef",
    "_$compiledWithEventModifiers",
    "_$compiledWithKey",
    "_$compiledWithNativeEvents",
    "_$createComment",
    "_$createComponent",
    "_$createDocumentFragment",
    "_$createDynamic",
    "_$createElement",
    "_$createFragment",
    "_$createTextNode",
    "_$createTextWrapper",
    "_$insertBefore",
    "_$mountCompiledComponent",
    "renderAnchor",
    "_$setAttribute",
    "_$setChecked",
    "_$setClassName",
    "_$setDisabled",
    "_$setInnerHTML",
    "_$setProperty",
    "_$setStyle",
    "_$setValue",
    "_$settextContent",
    "_$spreadAttributes",
    "getCompiledKey",
];

pub(crate) fn runtime_import_entry(
    helper: &str,
    module_tier: RuntimeTier,
) -> Option<RuntimeImportEntry> {
    if BUILTIN_HELPERS.contains(&helper) {
        return Some(RuntimeImportEntry::Builtins);
    }
    if COMPONENT_HELPERS.contains(&helper) {
        return Some(RuntimeImportEntry::Component);
    }
    match runtime_import_tier(helper, module_tier)? {
        RuntimeTier::Compiled => Some(RuntimeImportEntry::Compiler),
        RuntimeTier::Vapor => Some(RuntimeImportEntry::Component),
        RuntimeTier::None => None,
    }
}
