use swc_plugin_rue::apply;

mod utils;

#[test]
fn lowers_safe_single_root_native_list_items_to_direct_mount() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Page: FC<{ items: Array<{ id: string; title: string }> }> = props => (
  <ul>
    {props.items.map(item => (
      <li key={item.id}>{item.title}</li>
    ))}
  </ul>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("_$reconcileKeyed")));
    assert!(out.contains("_$template("), "{out}");
    assert!(out.contains("_$mountCompiledKeyedSingleRow"), "{out}");
    assert!(out.contains("_$mountCompiledSlotFactory"), "{out}");
    assert!(!out.contains(&utils::normalize("singleRoot:")));
    assert!(!out.contains(&utils::normalize(concat!("direct", "Root:"))));
    assert!(!out.contains(&utils::normalize("renderAnchor(__slot, parent, start)")));
    assert!(!out.contains(&utils::normalize("renderBetween(__slot, parent, start, end)")));
}

#[test]
fn lowers_single_root_fragment_list_items_to_compiled_rows() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Page: FC<{ items: Array<{ id: string; title: string }> }> = props => (
  <ul>
    {props.items.map(item => (
      <>
        <li key={item.id}>{item.title}</li>
      </>
    ))}
  </ul>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert!(out.contains("_$mountCompiledKeyedRow"), "{out}");
    assert!(out.contains("_$createDocumentFragment"), "{out}");
    assert!(!out.contains("renderAnchor("), "{out}");
}

#[test]
fn lowers_nested_single_root_fragment_list_items_to_compiled_rows() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Page: FC<{ items: Array<{ id: string; title: string }> }> = props => (
  <ul>
    {props.items.map(item => (
      <>
        <>
          <li key={item.id}>{item.title}</li>
        </>
      </>
    ))}
  </ul>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert!(out.contains("_$mountCompiledKeyedRow"), "{out}");
    assert!(out.contains("_$createDocumentFragment"), "{out}");
    assert!(!out.contains("renderAnchor("), "{out}");
}

#[test]
fn lowers_single_root_builtin_fragment_list_items_to_compiled_rows() {
    let src = r##"
import { type FC, Fragment } from '@rue-js/rue';

const Page: FC<{ items: Array<{ id: string; title: string }> }> = props => (
  <ul>
    {props.items.map(item => (
      <Fragment key={item.id}>
        <li>{item.title}</li>
      </Fragment>
    ))}
  </ul>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert!(out.contains("_$mountCompiledKeyedRow"), "{out}");
    assert!(out.contains("_$compiledComponent(Fragment"), "{out}");
    assert!(!out.contains("renderAnchor("), "{out}");
}

#[test]
fn marks_single_root_list_items_without_index_param_as_not_tracking_index() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Page: FC<{ items: Array<{ id: string; title: string }> }> = props => (
  <ul>
    {props.items.map(item => (
      <li key={item.id}>{item.title}</li>
    ))}
  </ul>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("_$reconcileKeyed")));
    assert!(!out.contains(&utils::normalize("singleRoot:")));
    assert!(!out.contains(&utils::normalize("trackIndex:")));
}

#[test]
fn marks_local_todo_shaped_single_root_items_as_not_tracking_index() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Page: FC<{ todos: Array<{ id: number; text: string; completed: boolean }>; toggleTodo: (id: number) => void; deleteTodo: (id: number) => void }> = props => (
  <div>
    {props.todos.map(todo => (
      <div
        key={todo.id}
        className={`row ${todo.completed ? 'done' : 'open'}`}
      >
        <span onClick={() => props.toggleTodo(todo.id)}>{todo.text}</span>
        <button onClick={() => props.deleteTodo(todo.id)}>删除</button>
      </div>
    ))}
  </div>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));
    assert!(out.contains(&utils::normalize("_$reconcileKeyed")));
    assert_eq!(out.matches("_$compiledDelegateEvent(").count(), 2, "{out}");
    assert!(!out.contains(&utils::normalize(".addEventListener(")), "{out}");
    assert!(!out.contains(&utils::normalize(".removeEventListener(")), "{out}");
    assert!(out.contains("onOwnerCleanup("), "{out}");
    assert!(!out.contains(&utils::normalize("disposeOwner(")));
    assert!(!out.contains(&utils::normalize("_$compiledKeyedList")));
}
