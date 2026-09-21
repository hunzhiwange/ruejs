//! SWC 插件转换行为测试（spec_setup_transfer_actual）
//!
//! 覆盖：真实 Rue Design Transfer 组件在 pre-pass 后应具备顶层 useSetup，
//! 且 setup-once 目标下的顶层绑定应位于外层 useSetup 内，而不是裸露在组件主体顶部。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn real_transfer_component_gets_top_level_use_setup() {
    let src = std::fs::read_to_string("../rue-design/src/components/transfer/index.tsx")
        .expect("read transfer component source");

    let (program, cm) = utils::parse(&src, "transfer.tsx");
    let program = apply_pre(program);
    let out = utils::strip_marker(&utils::emit(program, cm));

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_setup_transfer_actual.out.js", &out).ok();

    let transfer_start =
        out.find("const Transfer: FC<TransferProps<any>> =").expect("locate Transfer component");
    let transfer_slice = &out[transfer_start..];

    let top_level_setup_idx = transfer_slice
        .find("const _$useSetup = _$compiledSetup(\"useSetup:")
        .expect("expected top-level useSetup inside Transfer");

    let merged_locale_idx =
        transfer_slice.find("const mergedLocale").expect("locate mergedLocale binding");
    let uncontrolled_target_keys_idx = transfer_slice
        .find("const uncontrolledTargetKeysRef =")
        .expect("locate uncontrolledTargetKeysRef binding");
    let left_page_idx =
        transfer_slice.find("const leftPageRef =").expect("locate leftPageRef binding");
    let left_panel_host_idx =
        transfer_slice.find("const leftPanelHostRef =").expect("locate leftPanelHostRef binding");

    assert!(
        top_level_setup_idx < merged_locale_idx,
        "expected mergedLocale to move under the top-level useSetup"
    );
    assert!(
        top_level_setup_idx < uncontrolled_target_keys_idx,
        "expected uncontrolledTargetKeysRef to move under the top-level useSetup"
    );
    assert!(
        top_level_setup_idx < left_page_idx,
        "expected leftPageRef to move under the top-level useSetup"
    );
    assert!(
        top_level_setup_idx < left_panel_host_idx,
        "expected leftPanelHostRef to move under the top-level useSetup"
    );

    assert!(
        transfer_slice.contains("const mergedLocale: Required<TransferLocale> = computed("),
        "expected mergedLocale to lower into computed in the real Transfer output"
    );
    assert!(
        transfer_slice.contains(
            "const searchConfig = computed(()=>normalizeSearchConfig(__rue_props.showSearch));"
        ),
        "expected searchConfig to lower into computed against __rue_props.showSearch"
    );
    assert!(
        transfer_slice.contains(
            "const paginationConfig = computed(()=>normalizePagination(__rue_props.pagination));"
        ),
        "expected paginationConfig to lower into computed against __rue_props.pagination"
    );
    assert!(
        transfer_slice
            .contains("const sizeConfig = computed(()=>resolveSizeConfig(__rue_props.size));"),
        "expected sizeConfig to lower into computed against __rue_props.size"
    );
}
