//! SWC 插件转换行为测试（spec_setup_ident_consistency）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn setup_return_uses_inner_bindings_consistently() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const ThemePicker: FC = () => {
  const themes = ['light', 'dark']
  const labels: Record<string, string> = { light: '亮色', dark: '暗色' }
  return (
    <select value={labels.light}>
      {themes.map(n => <option key={n} value={n}>{labels[n] ? `${labels[n]} (${n})` : n}</option>)}
    </select>
  )
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { _$vaporWithHookId, useSetup } from "@rue-js/rue/vapor";
import { type FC } from '@rue-js/rue';
const ThemePicker: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const themes = [
            'light',
            'dark'
        ];
        const labels: Record<string, string> = {
            light: '亮色',
            dark: '暗色'
        };
        return {
            themes: themes,
            labels: labels
        };
    }));
    const { themes: themes, labels: labels } = _$useSetup;
    return (<select value={labels.light}>
      {themes.map((n)=><option key={n} value={n}>{labels[n] ? `${labels[n]} (${n})` : n}</option>)}
    </select>);
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_setup_ident_consistency.out.js", strip_marker(&out))
        .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
