use swc_plugin_rue::apply;
mod utils;

#[test]
fn layout_named_props_use_renderable_bindings() {
    let source = include_str!("../../../app/pages/examples/home-demos/LayoutChildrenDemo.tsx");
    let (program, cm) = utils::parse(source, "layout.tsx");
    let out = utils::emit(apply(program), cm);
    assert!(!out.contains("_$compiledText("), "{out}");
    assert!(!out.contains("_$compiledScalarText("), "{out}");
    assert!(out.contains("_$compiledValueFactory("), "{out}");
}
