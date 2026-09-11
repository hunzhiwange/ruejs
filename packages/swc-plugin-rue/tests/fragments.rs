//! 片段（Fragment）转换测试
//!
//! 覆盖：<>...</> 展开为顺序插入的子节点，以及组件插入的锚点管理。
use swc_plugin_rue::apply;
mod utils;

fn compile(src: &str, name: &str) -> String {
    let (program, cm) = utils::parse(src, &format!("{name}.tsx"));
    let program = apply(program);
    utils::strip_marker(&utils::emit(program, cm))
}

#[test]
fn compiles_safe_root_fragments_without_vapor() {
    let out = compile(
        r##"
import { type FC } from '@rue-js/rue';
const Demo: FC = () => <><h1>Title</h1><span title={Boolean(true)}>safe</span></>;
"##,
        "safe-root-fragment",
    );
    let normalized = utils::normalize(&out);

    assert!(out.contains("@rue-js/rue/internal"), "{out}");
    assert!(normalized.contains(&utils::normalize("_$compiledRoot((__rue_parent_context)=>{")));
    assert!(normalized.contains(&utils::normalize("_$createDocumentFragment()")));
    assert!(normalized.contains(&utils::normalize("_$template(\"<span>safe</span>\")")));
    assert!(!normalized.contains(&utils::normalize("vapor(")), "{out}");
}

#[test]
fn static_component_fragments_compile_while_unsafe_roots_keep_vapor_fallbacks() {
    let component = compile(
        "import { type FC } from '@rue-js/rue'; const Child: FC = () => <i />; const Demo: FC = () => <><Child /></>;",
        "fragment-component-fallback",
    );
    let spread = compile(
        "import { type FC } from '@rue-js/rue'; const parts = []; const Demo: FC = () => <>{...parts}</>;",
        "fragment-spread-fallback",
    );
    let renderable = compile(
        "import { type FC } from '@rue-js/rue'; const holder = { get() {} }; const Demo: FC = () => <>{holder.get()}</>;",
        "fragment-get-fallback",
    );
    let async_root = compile(
        "import { type FC } from '@rue-js/rue'; const Demo = async () => <><span>later</span></>;",
        "fragment-async-fallback",
    );

    let normalized_component = utils::normalize(&component);
    assert!(component.contains("@rue-js/rue/internal"), "{component}");
    assert!(normalized_component.contains("_$compiledRootFactory("), "{component}");
    assert!(normalized_component.contains("_$compiledRoot("), "{component}");
    assert!(!normalized_component.contains("vapor("), "{component}");

    for out in [spread, renderable, async_root] {
        assert!(out.contains("@rue-js/rue/internal"), "{out}");
        assert!(utils::normalize(&out).contains(&utils::normalize("_$compiledRoot(")), "{out}");
    }
}

#[test]
fn transforms_fragments_tsx() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const Fragments: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold mb-2">Fragments</h3>
    <>
      <span>片段 1</span>
      <span>片段 2</span>
    </>
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default Fragments;
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 输出到目标目录便于调试
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/fragments.out.js", utils::strip_marker(&out)).ok();

    // 期望输出要点对照：
    // - 片段：<>...</> 被展开为两个 span 节点顺序插入
    // - 组件：RouterLink 被快速路径重写为原生 <a> 元素
    let _expected = r##"
import { _$compiledRoot, _$createElement, _$template, _$createTextNode, _$appendChild, watchEffect, _$setAttribute, _$addEventListener, _$setClassName } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const _$getTemplate1 = _$template('<h3 class="text-xl font-semibold mb-2">Fragments</h3>');
const _$getTemplate2 = _$template("<span>片段 1</span>");
const _$getTemplate3 = _$template("<span>片段 2</span>");
const Fragments: FC = ()=>_$compiledRoot((__rue_parent_context)=>{
        const _root = _$createElement("div", __rue_parent_context);
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        _root.appendChild(_$getTemplate1().content.cloneNode(true));
        _root.appendChild(_$getTemplate2().content.cloneNode(true));
        _root.appendChild(_$getTemplate3().content.cloneNode(true));
        const _el4 = _$createElement("a", _root);
        _$appendChild(_root, _el4);
        watchEffect(()=>{
            _$setAttribute(_el4, "href", String(RouterLink.__rueHref("/jsx")));
        });
        _$addEventListener(_el4, "click", ((e)=>RouterLink.__rueOnClick(e, "/jsx", false)));
        _$addEventListener(_el4, "pointerenter", ((e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")));
        _$addEventListener(_el4, "focus", ((e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")));
        _$addEventListener(_el4, "pointerdown", ((e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")));
        _$addEventListener(_el4, "touchstart", ((e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")));
        _$setClassName(_el4, "text-blue-600 hover:underline");
        _$appendChild(_el4, _$createTextNode("返回目录"));
        return _root;
    });
export default Fragments;
"##;

    let norm_out = utils::normalize(&utils::strip_marker(&out));
    assert!(norm_out.contains("_$template"));
    assert!(norm_out.contains("<span>片段 1</span><span>片段 2</span>"));
    assert!(norm_out.contains("RouterLink.__rueHref(\"/jsx\")"));
    assert_eq!(norm_out.matches(".addEventListener(").count(), 5);
    assert_eq!(norm_out.matches("onScopeDispose(").count(), 5);
}
