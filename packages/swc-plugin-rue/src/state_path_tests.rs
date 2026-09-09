use std::sync::Arc;

use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::ast::Program;
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn transform_module(src: &str) -> String {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("compiled-component-regions-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let program = Program::Module(parser.parse_module().expect("parse module"));
    let program = crate::run_full_transform_with_options(program, true, true, None);
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&program).expect("emit transformed module");
    String::from_utf8(buf).expect("utf8")
}

#[test]
fn state_path_static_numeric_optional_and_reuse() {
    let output = transform_module(
        r#"
import { useState } from '@rue-js/rue';
export function View() {
  const [state, setState] = useState({ user: { name: 'one' }, rows: [{ title: 'row' }] });
  return <div><span>{state.user.name}</span><strong>{state.user.name}</strong><b>{state.rows[0].title}</b><u>{state.rows["0"].title}</u><i>{state.user?.name}</i></div>;
}
"#,
    );
    assert!(output.contains("_$compiledReadPath("), "{output}");
    assert_eq!(output.matches("_$compiledPath(").count(), 3, "{output}");
    assert!(!output.contains(".get().user"), "{output}");
    assert!(!output.contains(".get().rows"), "{output}");
    assert!(output.contains("internal/compiler"), "{output}");
}

#[test]
fn state_path_preserves_shadowing_and_snapshot_aliases() {
    let output = transform_module(
        r#"
import { useState } from '@rue-js/rue';
export function View() {
  const [state] = useState({ user: { name: 'one' } });
  let alias = state;
  alias = { user: { name: 'other' } };
  const read = (state) => state.user.name;
  return <div>{state.user.name}{read(alias)}</div>;
}
"#,
    );
    assert!(output.contains("_$compiledReadPath("), "{output}");
    assert!(output.contains("state.user.name"), "{output}");
    assert!(!output.contains("_$compiledReadPath(alias"), "{output}");
}

#[test]
fn state_path_preserves_method_receivers_and_write_targets() {
    let output = transform_module(
        r#"
import { useState } from '@rue-js/rue';
export function View() {
  const [state] = useState({ user: { name: 'one' }, rows: [] });
  const change = () => { state.user.name = 'two'; state.rows.push(1); state.user.name?.toString(); delete state.user.name; };
  return <div onClick={change}>{state.user.name}</div>;
}
"#,
    );
    assert!(output.contains("_$compiledReadPath("), "{output}");
    assert!(output.contains("_$compiledStateMember"), "{output}");
    assert!(output.contains("_$compiledStateMutator"), "{output}");
    assert!(output.contains("_$compiledStateDelete"), "{output}");
}

#[test]
fn state_path_mutations_use_tracked_references() {
    let output = transform_module(
        r#"
import { useState } from '@rue-js/rue';
export function View() {
 const [state] = useState({ n: 1, rows: [1, 2] });
 const change = (key) => { state.n = 2; state[key()] += 3; state.n++; --state.n; delete state.n; state.rows.push(3); state.rows.splice(0, 1); state.rows.sort(); };
 return <p onClick={change}>{state.n}</p>;
}"#,
    );
    assert!(output.contains("_$compiledStateMember"), "{output}");
    assert!(!output.contains(".get().n ="), "{output}");
    assert!(output.contains("_$compiledStateDelete"), "{output}");
    assert!(output.contains("_$compiledStateMutator"), "{output}");
}

#[test]
fn state_path_rejects_escapes_with_source_positions() {
    for operation in [
        "unknown(state)",
        "Object.defineProperty(state, 'x', { value: 1 })",
        "const { rows } = state; rows[0] = 1",
        "state.rows[method](1)",
    ] {
        let output = transform_module(&format!(
            "import {{ useState }} from '@rue-js/rue'; export function View() {{ const [state] = useState({{ rows: [] }}); const change = () => {{ {operation}; }}; return <p onClick={{change}}>{{state.rows.length}}</p>; }}"
        ));
        assert!(output.contains("state-escape"), "{operation}: {output}");
        assert!(output.contains("start"), "{output}");
    }
}
