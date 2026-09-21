use swc_plugin_rue::{apply, apply_pre};

mod utils;

#[test]
fn rewrites_v_on_r_on_and_safe_preprocessed_directives_to_standard_event_props() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const handleClick = () => {};
const handleInput = () => {};
const handleMouseDown = () => {};
const handleEnter = () => {};
const backClick = () => {};
const metaExact = () => {};
const metaExactRight = () => {};
const Card: FC = () => <button />;

const Demo: FC = () => (
  <section>
    <button v-on:click={handleClick}>A</button>
    <input r-on:input={handleInput} />
    <button v-on:click-meta-exact="metaExact">Meta</button>
    <button r-on:click-meta-exact="metaExactRight">Meta Right</button>
    <div __rue_on__mouse_down={handleMouseDown} />
    <input __rue_on__keyup__mods__enter="handleEnter" />
    <Card __rue_on__click__mods__native="backClick" />
    <div v-once={true} />
  </section>
);

export default Demo;
"##;

    let (program, cm) = utils::parse(src, "on_directive_pre.tsx");
    let program = apply_pre(program);
    let emitted = utils::strip_marker(&utils::emit(program, cm));
    let out = utils::normalize(&emitted);

    assert!(!out.contains("v-on:click"));
    assert!(!out.contains("r-on:input"));
    assert!(!out.contains("__rue_on__"));
    assert!(out.contains("onClick"));
    assert!(out.contains("handleClick($event)"));
    assert!(out.contains("onInput"));
    assert!(out.contains("handleInput($event)"));
    assert!(out.contains("metaExact($event)"));
    assert!(out.contains("metaExactRight($event)"));
    assert!(out.contains("onMouseDown"));
    assert!(out.contains("handleMouseDown($event)"));
    assert!(out.contains("onKeyup"));
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(out.contains("handleEnter($event)"));
    assert!(out.contains("__rueNativeOnClick"));
    assert!(out.contains("backClick($event)"));
    assert!(!out.contains("v-once"));
}

#[test]
fn full_transform_reuses_existing_event_codegen_after_on_directive_rewrite() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const logClick = () => {};
const backClick = () => {};
const metaExact = () => {};
const metaExactRight = () => {};
const Card: FC = () => <button />;

const Demo: FC = () => (
  <div>
    <button __rue_on__click__mods__stop__prevent="logClick">Click</button>
    <button v-on:click-meta-exact="metaExact">Meta</button>
    <button r-on:click-meta-exact="metaExactRight">Meta Right</button>
    <input r-on:input={(e: any) => console.log(e.target.value)} />
    <button __rue_on__click__mods__once="backClick" />
  </div>
);

export default Demo;
"##;

    let (program, cm) = utils::parse(src, "on_directive_apply.tsx");
    let program = apply(program);
    let emitted = utils::strip_marker(&utils::emit(program, cm));
    let out = utils::normalize(&emitted);

    assert!(!out.contains("v-on"));
    assert!(!out.contains("r-on"));
    assert!(!out.contains("__rue_on__"));
    assert!(out.contains(".addEventListener("));
    assert!(out.contains("onOwnerCleanup"));
    assert!(out.contains(&utils::normalize("\"click\"")));
    assert!(out.contains(&utils::normalize("\"input\"")));
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(out.contains(&utils::normalize("\"meta\"")));
    assert!(out.contains(&utils::normalize("\"exact\"")));
}
