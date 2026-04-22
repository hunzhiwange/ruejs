use swc_plugin_rue::apply_with_transform_options;

mod utils;

#[test]
fn lowers_single_root_native_list_items_to_render_anchor() {
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
    let program = apply_with_transform_options(program, false, true);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("singleRoot: true")));
    assert!(out.contains(&utils::normalize("renderAnchor(__slot, parent, start)")));
    assert!(!out.contains(&utils::normalize("renderBetween(__slot, parent, start, end)")));
}

#[test]
fn keeps_fragment_list_items_on_render_between() {
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
    let program = apply_with_transform_options(program, false, true);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(!out.contains(&utils::normalize("singleRoot: true")));
    assert!(out.contains(&utils::normalize("renderBetween(__slot, parent, start, end)")));
}
