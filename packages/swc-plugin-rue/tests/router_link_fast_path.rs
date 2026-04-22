use swc_plugin_rue::apply;

mod utils;

#[test]
fn lowers_simple_router_link_to_native_anchor() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const Page: FC<{ active: boolean }> = props => (
  <div>
    <RouterLink
      to="/examples/hello-world"
      className={props.active ? 'active w-full' : 'w-full'}
      onMouseDown={() => console.log('down')}
    >
      Hello World
    </RouterLink>
  </div>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains(&utils::normalize("RouterLink.__rueHref")));
    assert!(out.contains(&utils::normalize("RouterLink.__rueOnClick")));
    assert!(out.contains(&utils::normalize("_$createElement(\"a\")")));
    assert!(!out.contains("rue:component:start"));
    assert!(!out.contains("renderBetween("));
}

#[test]
fn keeps_router_link_component_path_when_onclick_is_present() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const Page: FC<{ handleClick: () => void }> = props => (
  <div>
    <RouterLink to="/examples/hello-world" onClick={props.handleClick}>
      Hello World
    </RouterLink>
  </div>
)
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::normalize(&utils::strip_marker(&utils::emit(program, cm)));

    assert!(out.contains("rue:component:start"));
    assert!(out.contains("renderBetween("));
}
