//! SWC 插件转换行为测试（spec_setup_transfer_like_h_return）
//!
//! 覆盖：Transfer 风格的 FC 泛型箭头组件返回 h(...) 时，顶层 setup hook / effect / helper
//! 会统一注入顶层 useSetup，而不是只对白名单 hook 做保守 hoist。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transfer_like_setup_once_hoists_hooks_effects_and_helpers() {
    let src = r##"
import { type FC, h, onMounted, ref, useRef, watch } from '@rue-js/rue'

type Props = {
  targetKeys?: string[]
  defaultTargetKeys?: string[]
  showSearch?: boolean | { defaultValue?: string }
}

const normalizeSearchConfig = (showSearch?: boolean | { defaultValue?: string }) => {
  if (typeof showSearch === 'object') {
    return { defaultValue: showSearch.defaultValue ?? '' }
  }

  return { defaultValue: '' }
}

const TransferLike: FC<Props> = ({ targetKeys, defaultTargetKeys, showSearch }) => {
  const searchConfig = normalizeSearchConfig(showSearch)
  const uncontrolledTargetKeysRef = ref(defaultTargetKeys ?? targetKeys ?? [])
  const searchValueRef = ref(searchConfig.defaultValue)
  const pageRef = ref(1)
  const hostRef = useRef<HTMLElement>()

  const renderManagedRegions = () => {
    if (hostRef.current) {
      renderPanel()
    }
  }

  onMounted(() => {
    renderManagedRegions()
  })

  watch(
    () => [pageRef.value, uncontrolledTargetKeysRef.value.length],
    () => {
      renderManagedRegions()
    },
  )

  const renderPanel = () => {
    const localRef = ref(2)
    return <div>{localRef.value}{searchValueRef.value}</div>
  }

  return h(
    'section',
    { title: searchValueRef.value },
    String(pageRef.value),
    renderPanel(),
    hostRef.current ? 'mounted' : 'idle',
    String(uncontrolledTargetKeysRef.value.length),
  )
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_setup_transfer_like_h_return.out.js",
        utils::strip_marker(&out),
    )
    .ok();

    let transfer_like_start = normalized
        .find(&utils::normalize(r#"const TransferLike: FC<Props> = (__rue_props)=>{"#))
        .expect("locate TransferLike component");
    let transfer_like_slice = &normalized[transfer_like_start..];
    let top_level_setup_idx = transfer_like_slice
        .find(&utils::normalize(r#"const _$useSetup = _$compiledSetup("useSetup:0:0"#))
        .expect("expected top-level useSetup inside TransferLike");
    let search_config_idx = transfer_like_slice
        .find(&utils::normalize(
            r#"const searchConfig = normalizeSearchConfig(__rue_props.showSearch);"#,
        ))
        .expect("locate searchConfig binding");

    assert!(
        top_level_setup_idx < search_config_idx,
        "expected top-level useSetup to wrap TransferLike setup bindings"
    );

    assert!(normalized.contains(&utils::normalize(
        r#"const searchConfig = normalizeSearchConfig(__rue_props.showSearch);
      const uncontrolledTargetKeysRef = ref(__rue_props.defaultTargetKeys ?? __rue_props.targetKeys ?? []);
      const searchValueRef = ref(searchConfig.defaultValue);
      const pageRef = ref(1);
      const hostRef = useRef<HTMLElement>();
      const renderManagedRegions = ()=>{"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"onMounted(()=>{
            renderManagedRegions();
        });
      watch(()=>[
                pageRef.value,
                uncontrolledTargetKeysRef.value.length
            ], ()=>{
            renderManagedRegions();
        });
      const renderPanel = ()=>{"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"const { searchConfig: searchConfig, uncontrolledTargetKeysRef: uncontrolledTargetKeysRef, searchValueRef: searchValueRef, pageRef: pageRef, hostRef: hostRef, renderManagedRegions: renderManagedRegions, renderPanel: renderPanel } = _$useSetup;"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"const renderPanel = ()=>{
        const _$useSetup = _$compiledSetup("useSetup:0:0", ()=>{
            const localRef = ref(2);
            return {
                localRef: localRef
            };
        });
        const { localRef: localRef } = _$useSetup;
        return <div>{localRef.value}{searchValueRef.value}</div>;
    };"#,
    )));

    assert_eq!(normalized.matches("const _$useSetup =").count(), 2);
}

#[test]
fn untyped_h_return_component_gets_top_level_use_setup() {
    let src = r##"
import { h, ref, useRef } from '@rue-js/rue'

const normalizeSearchConfig = (showSearch) => {
  if (typeof showSearch === 'object') {
    return { defaultValue: showSearch.defaultValue ?? '' }
  }

  return { defaultValue: '' }
}

const TransferLike = ({ targetKeys, defaultTargetKeys, showSearch }) => {
  const searchConfig = normalizeSearchConfig(showSearch)
  const uncontrolledTargetKeysRef = ref(defaultTargetKeys ?? targetKeys ?? [])
  const searchValueRef = ref(searchConfig.defaultValue)
  const hostRef = useRef()

  return h(
    'section',
    { title: searchValueRef.value },
    String(uncontrolledTargetKeysRef.value.length),
    hostRef.current ? 'mounted' : 'idle',
  )
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));

    assert!(normalized.contains(&utils::normalize(
        r#"const TransferLike = (__rue_props)=>{
      const _$useSetup = _$compiledSetup("useSetup:0:0", ()=>{
      const searchConfig = normalizeSearchConfig(__rue_props.showSearch);
      const uncontrolledTargetKeysRef = ref(__rue_props.defaultTargetKeys ?? __rue_props.targetKeys ?? []);
      const searchValueRef = ref(searchConfig.defaultValue);
      const hostRef = useRef();"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"const { searchConfig: searchConfig, uncontrolledTargetKeysRef: uncontrolledTargetKeysRef, searchValueRef: searchValueRef, hostRef: hostRef } = _$useSetup;"#,
    )));
}
