use swc_plugin_rue::apply;

mod utils;

#[test]
fn lowers_childless_component_list_items_to_direct_render_between() {
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

    assert!(out.contains(&utils::normalize("const __slot = <Row key={item.id} item={item}/>;")));
    assert!(out.contains(&utils::normalize("renderBetween(__slot, parent, start, end);")));
    assert!(!out.contains(&utils::normalize(
        "renderItem: (item, parent, start, end, idx)=>{ const __slot = vapor(()=>"
    )));
}

#[test]
fn lowers_component_list_items_with_children_to_direct_render_between() {
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

    assert!(out.contains(&utils::normalize("const __child1 = vapor(()=>")));
    assert!(out.contains(&utils::normalize(
        "const __slot = <Row key={item.id} item={item} children={__child1}/>;"
    )));
    assert!(out.contains(&utils::normalize("renderBetween(__slot, parent, start, end);")));
    assert!(!out.contains(&utils::normalize(
        "renderItem: (item, parent, start, end, idx)=>{ const __slot = vapor(()=>"
    )));
}

#[test]
fn keeps_prefix_scope_for_direct_component_list_items() {
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

    assert!(out.contains(&utils::normalize(
        "const label = `#${item}`; const __slot = <Row key={item} label={label}/>;"
    )));
    assert!(out.contains(&utils::normalize("renderBetween(__slot, parent, start, end);")));
    assert!(
        !out.contains(&utils::normalize(
            "const __slot = vapor(()=>{ const _root = _$createDocumentFragment(); const label = `#${item}`;"
        ))
    );
}
