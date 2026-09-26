use swc_plugin_rue::apply;

mod utils;

#[test]
fn compiles_todo_style_jsx_edge_cases() {
    let cases = [
        ("literal siblings", "<div>{[<span>A</span>, <span>B</span>]}</div>", "B"),
        ("nested arrays and holes", "<div>{[[<b>A</b>], , null, [0, <i>B</i>]]}</div>", "B"),
        (
            "conditional array items",
            "<div>{[ready && <b>A</b>, ready ? <i>B</i> : null]}</div>",
            "ready",
        ),
        ("array branch", "<div>{ready ? [<b>A</b>, <i>B</i>] : null}</div>", "ready"),
        ("array fallback", "<div>{null ?? [<b>A</b>, <i>B</i>]}</div>", "B"),
        (
            "array with keyed map",
            "<ul>{[items.map(item => <li key={item.id}>{item.text}</li>), <li>End</li>]}</ul>",
            "_$reconcileKeyed",
        ),
        (
            "fragment and spread props",
            "<div>{[<><span>A</span><span>B</span></>, <input {...props} value={name} />]}</div>",
            "props",
        ),
    ];

    for (name, jsx, expected) in cases {
        let source = format!("const View = () => {jsx}; export default View;");
        let (program, cm) = utils::parse(&source, "jsx-edge-cases.tsx");
        let output = utils::emit(apply(program), cm);
        assert!(output.contains("_$compiledRoot"), "{name}: {output}");
        assert!(output.contains(expected), "{name}: {output}");
        assert!(output.contains("_$mountCompiledSlotAt"), "{name}: {output}");
    }
}
