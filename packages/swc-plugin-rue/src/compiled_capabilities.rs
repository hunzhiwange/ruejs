// Every helper has exactly one entry, independent of other syntax in its module.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum RuntimeImportEntry {
    App,
    Dom,
    Reactive,
    Block,
    Component,
    List,
    Events,
    Builtin,
    Teleport,
    Transition,
    Transitiongroup,
    Keepalive,
    Suspense,
    Hydrate,
    Ssr,
}
impl RuntimeImportEntry {
    pub(crate) fn source(self) -> &'static str {
        match self {
            Self::App => "@rue-js/rue/internal/app",
            Self::Dom => "@rue-js/rue/internal/dom",
            Self::Reactive => "@rue-js/rue/internal/reactive",
            Self::Block => "@rue-js/rue/internal/block",
            Self::Component => "@rue-js/rue/internal/component",
            Self::List => "@rue-js/rue/internal/list",
            Self::Events => "@rue-js/rue/internal/events",
            Self::Teleport => "@rue-js/rue/internal/teleport",
            Self::Transition => "@rue-js/rue/internal/transition",
            Self::Transitiongroup => "@rue-js/rue/internal/transitiongroup",
            Self::Keepalive => "@rue-js/rue/internal/keepalive",
            Self::Suspense => "@rue-js/rue/internal/suspense",
            Self::Builtin => "@rue-js/rue/internal/builtin",
            Self::Ssr => "@rue-js/rue/internal/ssr",
            Self::Hydrate => "@rue-js/rue/internal/hydrate",
        }
    }
}
struct RuntimeCapability {
    helper: &'static str,
    entry: RuntimeImportEntry,
    auto_injected: bool,
}
const fn capability(
    helper: &'static str,
    entry: RuntimeImportEntry,
    auto_injected: bool,
) -> RuntimeCapability {
    RuntimeCapability { helper, entry, auto_injected }
}
const RUNTIME_CAPABILITIES: &[RuntimeCapability] = &[
    capability("getCurrentAppTarget", RuntimeImportEntry::App, false),
    capability("provideContext", RuntimeImportEntry::App, false),
    capability("createContext", RuntimeImportEntry::App, false),
    capability("useContext", RuntimeImportEntry::App, false),
    capability("_$mountApp", RuntimeImportEntry::App, true),
    capability("_$createApp", RuntimeImportEntry::App, true),
    capability("_$claimIgnoreLifecycle", RuntimeImportEntry::Hydrate, false),
    capability("_$writeIgnoreLifecycle", RuntimeImportEntry::Ssr, true),
    capability("_$writePrefetch", RuntimeImportEntry::Ssr, false),
    capability("_$planAsyncComponent", RuntimeImportEntry::Reactive, false),
    capability("_$planContext", RuntimeImportEntry::Reactive, false),
    capability("_$planUseContext", RuntimeImportEntry::Reactive, false),
    capability("_$writeRawText", RuntimeImportEntry::Ssr, true),
    capability("_$claimRawText", RuntimeImportEntry::Hydrate, true),
    capability("hydrateRoot", RuntimeImportEntry::Hydrate, false),
    capability("mountClaimRoot", RuntimeImportEntry::Hydrate, false),
    capability("_$writeElement", RuntimeImportEntry::Ssr, true),
    capability("_$writeText", RuntimeImportEntry::Ssr, true),
    capability("_$writeRange", RuntimeImportEntry::Ssr, true),
    capability("_$writeList", RuntimeImportEntry::Ssr, true),
    capability("_$writeComponent", RuntimeImportEntry::Ssr, true),
    capability("_$writeSlot", RuntimeImportEntry::Ssr, true),
    capability("_$writeTeleport", RuntimeImportEntry::Ssr, true),
    capability("_$writeTransition", RuntimeImportEntry::Ssr, true),
    capability("_$writeTransitionGroup", RuntimeImportEntry::Ssr, true),
    capability("_$writeKeepAlive", RuntimeImportEntry::Ssr, true),
    capability("_$writeSuspense", RuntimeImportEntry::Ssr, true),
    capability("_$claimElement", RuntimeImportEntry::Hydrate, true),
    capability("_$claimText", RuntimeImportEntry::Hydrate, true),
    capability("_$claimRange", RuntimeImportEntry::Hydrate, true),
    capability("_$claimList", RuntimeImportEntry::Hydrate, true),
    capability("_$claimComponent", RuntimeImportEntry::Hydrate, true),
    capability("_$claimSlot", RuntimeImportEntry::Hydrate, true),
    capability("_$claimTeleport", RuntimeImportEntry::Hydrate, true),
    capability("_$claimTransition", RuntimeImportEntry::Hydrate, true),
    capability("_$claimTransitionGroup", RuntimeImportEntry::Hydrate, true),
    capability("_$claimKeepAlive", RuntimeImportEntry::Hydrate, true),
    capability("_$claimSuspense", RuntimeImportEntry::Hydrate, true),
    capability("_$suspense", RuntimeImportEntry::Suspense, true),
    capability("_$keepAlive", RuntimeImportEntry::Keepalive, true),
    capability("_$transitionGroup", RuntimeImportEntry::Transitiongroup, true),
    capability("_$transition", RuntimeImportEntry::Transition, true),
    capability("_$teleport", RuntimeImportEntry::Teleport, true),
    capability("signal", RuntimeImportEntry::Reactive, false),
    capability("effect", RuntimeImportEntry::Reactive, true),
    capability("batch", RuntimeImportEntry::Reactive, false),
    capability("untrack", RuntimeImportEntry::Reactive, true),
    capability("onCleanup", RuntimeImportEntry::Reactive, true),
    capability("onOwnerCleanup", RuntimeImportEntry::Reactive, true),
    capability("adoptOwner", RuntimeImportEntry::Reactive, false),
    capability("createOwner", RuntimeImportEntry::Reactive, false),
    capability("runWithOwner", RuntimeImportEntry::Reactive, false),
    capability("disposeOwner", RuntimeImportEntry::Reactive, false),
    capability("createSelector", RuntimeImportEntry::Reactive, true),
    capability("setReactiveScheduling", RuntimeImportEntry::Reactive, false),
    capability("_$compiledRoot", RuntimeImportEntry::Block, true),
    capability("_$compiledStaticRoot", RuntimeImportEntry::Block, true),
    capability("_$compiledRunWithOwner", RuntimeImportEntry::Reactive, true),
    capability("_$compiledCreateOwner", RuntimeImportEntry::Reactive, true),
    capability("_$compiledSetup", RuntimeImportEntry::Reactive, true),
    capability("_$compiledUseSetup", RuntimeImportEntry::Reactive, true),
    capability("_$compiledBindUseRef", RuntimeImportEntry::Reactive, true),
    capability("_$compiledUseRef", RuntimeImportEntry::Reactive, true),
    capability("_$compiledMemo", RuntimeImportEntry::Reactive, true),
    capability("_$compiledPath", RuntimeImportEntry::Reactive, true),
    capability("_$compiledReadPath", RuntimeImportEntry::Reactive, true),
    capability("_$compiledStateRoot", RuntimeImportEntry::Reactive, true),
    capability("_$compiledStateMember", RuntimeImportEntry::Reactive, true),
    capability("_$compiledStateDelete", RuntimeImportEntry::Reactive, true),
    capability("_$compiledStateMutator", RuntimeImportEntry::Reactive, true),
    capability("_$compiledUseState", RuntimeImportEntry::Reactive, true),
    capability("_$compiledUseActionState", RuntimeImportEntry::Reactive, true),
    capability("_$compiledUseEffect", RuntimeImportEntry::Reactive, true),
    capability("_$compiledSignal", RuntimeImportEntry::Reactive, true),
    capability("_$compiledBatch", RuntimeImportEntry::Reactive, true),
    capability("_$compiledRenderEffect", RuntimeImportEntry::Reactive, true),
    capability("_$compiledScalarSignal", RuntimeImportEntry::Reactive, true),
    capability("_$compiledBridgeSignal", RuntimeImportEntry::Reactive, true),
    capability("_$compiledScalarText", RuntimeImportEntry::Reactive, true),
    capability("_$compiledScalarRoot", RuntimeImportEntry::Reactive, true),
    capability("_$compiledScalarOwnedRoot", RuntimeImportEntry::Reactive, true),
    capability("_$compiledScalarEffect", RuntimeImportEntry::Reactive, true),
    capability("_$compiledScalarCleanup", RuntimeImportEntry::Reactive, true),
    capability("_$compiledDelegateEvent", RuntimeImportEntry::Events, true),
    capability("_$compiledDelegateEventOwnerless", RuntimeImportEntry::Events, true),
    capability("_$compiledBranch", RuntimeImportEntry::Block, true),
    capability("_$compiledBranchAt", RuntimeImportEntry::Block, true),
    capability("_$compiledRootFactory", RuntimeImportEntry::Block, true),
    capability("_$withCompiledPropsUpdater", RuntimeImportEntry::Component, true),
    capability("_$withCompiledHookScope", RuntimeImportEntry::Component, true),
    capability("_$mountCompiledComponent", RuntimeImportEntry::Component, true),
    capability("_$mountCompiledSlotFactory", RuntimeImportEntry::Block, true),
    capability("_$mountCompiledSlotAt", RuntimeImportEntry::Block, true),
    capability("_$compiledValueFactory", RuntimeImportEntry::Block, true),
    capability("_$reconcileKeyed", RuntimeImportEntry::List, true),
    capability("_$reconcileKeyedSingle", RuntimeImportEntry::List, true),
    capability("_$disposeCompiledKeyedRows", RuntimeImportEntry::List, true),
    capability("_$compiledListMemo", RuntimeImportEntry::List, true),
    capability("_$mountCompiledKeyedRow", RuntimeImportEntry::List, true),
    capability("_$mountCompiledKeyedSingleRow", RuntimeImportEntry::List, true),
    capability("_$mountCompiledKeyedSingleRowOwnerless", RuntimeImportEntry::List, true),
    capability("_$mountCompiledKeyedSingleRowDirect", RuntimeImportEntry::List, true),
    capability("_$compiledCreateElement", RuntimeImportEntry::Dom, true),
    capability("_$compiledCreateDocumentFragment", RuntimeImportEntry::Dom, true),
    capability("_$compiledCreateTextNode", RuntimeImportEntry::Dom, true),
    capability("_$compiledCreateComment", RuntimeImportEntry::Dom, true),
    capability("_$compiledSpreadAttributes", RuntimeImportEntry::Dom, true),
    capability("_$compiledStyleValue", RuntimeImportEntry::Dom, true),
    capability("_$compiledSelectValue", RuntimeImportEntry::Dom, true),
    capability("_$compiledOmitProps", RuntimeImportEntry::Component, true),
    capability("_$compiledPropsGet", RuntimeImportEntry::Component, true),
    capability("_$compiledPropsCall", RuntimeImportEntry::Component, true),
    capability("_$compiledPropsHas", RuntimeImportEntry::Component, true),
    capability("_$compiledPropsKeys", RuntimeImportEntry::Component, true),
    capability("_$compiledPropsSnapshot", RuntimeImportEntry::Component, true),
    capability("_$compiledAppendChild", RuntimeImportEntry::Dom, true),
    capability("_$compiledText", RuntimeImportEntry::Dom, true),
    capability("_$template", RuntimeImportEntry::Dom, true),
    capability("onScopeDispose", RuntimeImportEntry::Reactive, true),
    capability("getCurrentInstance", RuntimeImportEntry::Reactive, true),
    capability("getCurrentOwner", RuntimeImportEntry::Reactive, true),
    capability("toValue", RuntimeImportEntry::Reactive, false),
    capability("watchFn", RuntimeImportEntry::Reactive, false),
    capability("watchEffect", RuntimeImportEntry::Reactive, true),
    capability("watchSignal", RuntimeImportEntry::Reactive, false),
    capability("watchPath", RuntimeImportEntry::Reactive, false),
    capability("createResource", RuntimeImportEntry::Reactive, false),
    capability("watch", RuntimeImportEntry::Reactive, false),
    capability("useState", RuntimeImportEntry::Reactive, false),
    capability("useEffect", RuntimeImportEntry::Reactive, false),
    capability("ref", RuntimeImportEntry::Reactive, false),
    capability("shallowRef", RuntimeImportEntry::Reactive, false),
    capability("isRef", RuntimeImportEntry::Reactive, false),
    capability("triggerRef", RuntimeImportEntry::Reactive, false),
    capability("computed", RuntimeImportEntry::Reactive, true),
    capability("useSetup", RuntimeImportEntry::Reactive, true),
    capability("useRef", RuntimeImportEntry::Reactive, false),
    capability("unref", RuntimeImportEntry::Reactive, false),
    capability("onBeforeCreate", RuntimeImportEntry::Reactive, false),
    capability("onCreated", RuntimeImportEntry::Reactive, false),
    capability("onBeforeMount", RuntimeImportEntry::Reactive, false),
    capability("onMounted", RuntimeImportEntry::Reactive, false),
    capability("onBeforeUpdate", RuntimeImportEntry::Reactive, false),
    capability("onUpdated", RuntimeImportEntry::Reactive, false),
    capability("onBeforeUnmount", RuntimeImportEntry::Reactive, true),
    capability("onUnmounted", RuntimeImportEntry::Reactive, false),
    capability("onActivated", RuntimeImportEntry::Reactive, false),
    capability("onDeactivated", RuntimeImportEntry::Reactive, false),
    capability("onError", RuntimeImportEntry::Reactive, false),
    capability("onErrorCaptured", RuntimeImportEntry::Component, false),
    capability("useEmit", RuntimeImportEntry::Component, false),
    capability("Transition", RuntimeImportEntry::Builtin, false),
    capability("TransitionGroup", RuntimeImportEntry::Builtin, false),
    capability("KeepAlive", RuntimeImportEntry::Builtin, false),
    capability("Suspense", RuntimeImportEntry::Builtin, false),
    capability("Teleport", RuntimeImportEntry::Builtin, false),
    capability("Template", RuntimeImportEntry::Builtin, true),
    capability("_$createComponent", RuntimeImportEntry::Component, true),
    capability("_$compiledComponent", RuntimeImportEntry::Component, true),
    capability("_$compiledWithHookId", RuntimeImportEntry::Reactive, true),
    capability("_$createElement", RuntimeImportEntry::Dom, true),
    capability("_$createComment", RuntimeImportEntry::Dom, true),
    capability("_$createTextNode", RuntimeImportEntry::Dom, true),
    capability("_$setStyle", RuntimeImportEntry::Dom, true),
    capability("_$settextContent", RuntimeImportEntry::Dom, true),
    capability("_$createDocumentFragment", RuntimeImportEntry::Dom, true),
    capability("_$appendChild", RuntimeImportEntry::Dom, true),
    capability("_$insertBefore", RuntimeImportEntry::Dom, true),
    capability("_$createTextWrapper", RuntimeImportEntry::Dom, true),
    capability("_$compiledShowStyle", RuntimeImportEntry::Dom, true),
    capability("_$compiledWithEventModifiers", RuntimeImportEntry::Events, true),
    capability("_$setAttribute", RuntimeImportEntry::Dom, true),
    capability("_$setClassName", RuntimeImportEntry::Dom, true),
    capability("_$setInnerHTML", RuntimeImportEntry::Dom, true),
    capability("_$setValue", RuntimeImportEntry::Dom, true),
    capability("_$setChecked", RuntimeImportEntry::Dom, true),
    capability("_$setDisabled", RuntimeImportEntry::Dom, true),
    capability("_$setProperty", RuntimeImportEntry::Dom, true),
    capability("_$spreadAttributes", RuntimeImportEntry::Dom, true),
];
pub(crate) fn runtime_import_entry(helper: &str) -> Option<RuntimeImportEntry> {
    RUNTIME_CAPABILITIES
        .iter()
        .find(|capability| capability.helper == helper)
        .map(|capability| capability.entry)
}
pub(crate) fn should_auto_inject_helper(helper: &str) -> bool {
    RUNTIME_CAPABILITIES
        .iter()
        .find(|capability| capability.helper == helper)
        .is_some_and(|capability| capability.auto_injected)
}

// Syntax safety is independent of helper import selection. Remove these restrictions as
// regional component/hook lowering gains the corresponding capabilities.
pub(crate) fn requires_component_context(helper: &str) -> bool {
    matches!(
        helper,
        "setCurrentInstance"
            | "withHookSlot"
            | "watchFn"
            | "watchSignal"
            | "watchDeepSignal"
            | "watchPath"
            | "shallowRef"
            | "customRef"
            | "triggerRef"
            | "toRef"
            | "toRefs"
            | "useSetup"
            | "unref"
            | "onBeforeCreate"
            | "onCreated"
            | "onError"
            | "Hydration"
            | "_$createComponent"
            | "_$compiledMarkComponentRenderReactive"
    )
}
