//! SWC 插件转换行为测试（spec_setup_keeps_jsx_locals_outside）
//!
//! 覆盖：含 JSX 的本地声明不应被搬进 useSetup，否则会把 render 期依赖冻结为首次值。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn keeps_jsx_locals_outside_use_setup() {
    let src = r##"
import { type FC, useState } from '@rue-js/rue'

const Comp: FC = () => {
  const [open, setOpen] = useState(false)
  const content = <>{open.value ? <span>open</span> : null}</>
  return <div onClick={() => setOpen(true)}>{content}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));

    assert!(normalized.contains(&utils::normalize(
        r#"const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const [open, setOpen] = _$vaporWithHookId("useState:1:0", ()=>useState(false));
        return {
            open: open,
            setOpen: setOpen
        };
    }));"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"const content = <>{open.value ? <span>open</span> : null}</>;"#,
    )));

    assert!(!normalized.contains(&utils::normalize(
        r#"useSetup(()=>{
        const [open, setOpen] = _$vaporWithHookId("useState:1:0", ()=>useState(false));
        const content = <>{open.value ? <span>open</span> : null}</>;"#,
    )));
}
