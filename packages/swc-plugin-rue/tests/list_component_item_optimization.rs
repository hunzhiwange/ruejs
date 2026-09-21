use swc_plugin_rue::apply;

mod utils;

#[test]
fn lowers_childless_component_list_items_with_lazy_props() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Row: FC<{ item: { id: string; title: string } }> = props => <li>{props.item.title}</li>

const Page: FC<{ items: Array<{ id: string; title: string }> }> = props => (
  <ul>
    {props.items.map(item => <Row key={item.id} item={item} />)}
  </ul>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(
        out.contains(&utils::normalize(
            "_$compiledComponent(Row, ()=>({ item: _$rowItem1.get() }))"
        )),
        "{out}"
    );
    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert!(out.contains("_$mountCompiledKeyedRow"), "{out}");
    assert!(!out.contains("_$compiledKeyedList"), "{out}");
}

#[test]
fn lowers_component_list_items_with_children_and_lazy_props() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Row: FC<{ item: { id: string; title: string }; children?: any }> = props => (
  <li>
    {props.children}
  </li>
)

const Page: FC<{ items: Array<{ id: string; title: string }> }> = props => (
  <ul>
    {props.items.map(item => (
      <Row key={item.id} item={item}>
        <span>{item.title}</span>
      </Row>
    ))}
  </ul>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("children: (target, slotProps, owner)=>")), "{out}");
    assert!(
        out.contains(&utils::normalize(
            "_$compiledComponent(Row, ()=>({ item: _$rowItem1.get(), children:"
        )),
        "{out}"
    );
    assert!(out.contains("_$mountCompiledKeyedRow"), "{out}");
    assert!(!out.contains("_$compiledKeyedList"), "{out}");
}

#[test]
fn keeps_prefix_scope_for_component_list_items() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Row: FC<{ label: string }> = props => <li>{props.label}</li>

const Page: FC<{ items: number[] }> = props => (
  <ul>
    {props.items.map(item => {
      const label = `#${item}`
      return <Row key={item} label={label} />
    })}
  </ul>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains("const label = `#${item}`;"), "{out}");
    assert!(out.contains("_$compiledComponent(Row, ()=>({ label: label }))"), "{out}");
    assert!(out.contains("_$mountCompiledKeyedRow"), "{out}");
    assert!(!out.contains("_$compiledKeyedList"), "{out}");
}
