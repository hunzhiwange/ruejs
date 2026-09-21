use swc_plugin_rue::{apply, apply_pre};

mod utils;

#[test]
fn rewrites_v_for_and_r_for_to_standard_map() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const list = [
  { id: 1, name: 'Rue' },
  { id: 2, name: 'Vapor' }
];

const userInfo = {
  name: 'Rue',
  city: 'Beijing'
};

const Demo: FC = () => (
  <div>
    <ul>
      <li v-for="(item, index) in list" key={item.id}>{index + 1}. {item.name}</li>
    </ul>
    <div r-for="(value, key) in userInfo">{key}: {value}</div>
    <span v-for="n in 3">{n}</span>
  </div>
);

export default Demo;
"##;
    let (program, cm) = utils::parse(src, "for_directive.tsx");
    let program = apply_pre(program);
    let emitted = utils::strip_marker(&utils::emit(program, cm));
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/for_directive_pre.out.js", &emitted).ok();
    let out = utils::normalize(&emitted);

    assert!(!out.contains("v-for"));
    assert!(!out.contains("r-for"));
    assert!(
        out.contains(&utils::normalize("((__rue_v_for_source)=>Array.isArray(__rue_v_for_source)"))
    );
    assert!(out.contains("Array.from("));
    assert!(out.contains("length: __rue_v_for_source"));
    assert!(out.contains("index + 1"));
    assert!(out.contains("Object.entries("));
    assert!(out.contains("__rue_v_for_source == null ? {} : __rue_v_for_source"));
    assert!(out.contains(&utils::normalize(
        "))(list).map(([item, index])=><li key={item.id}>{index + 1}. {item.name}</li>)"
    )));
    assert!(out.contains(&utils::normalize(
        "))(userInfo).map(([value, key])=><div>{key}: {value}</div>)"
    )));
    assert!(out.contains(&utils::normalize("))(3).map(([n])=><span>{n}</span>)")));
}

#[test]
fn full_transform_reuses_existing_list_codegen_after_v_for_rewrite() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const list = [
  { id: 1, name: 'Rue' },
  { id: 2, name: 'Vapor' }
];

const Demo: FC = () => (
  <ul>
    <li v-for="(item, index) in list" key={item.id}>{index + 1}. {item.name}</li>
  </ul>
);

export default Demo;
"##;
    let (program, cm) = utils::parse(src, "for_directive_apply.tsx");
    let program = apply(program);
    let emitted = utils::strip_marker(&utils::emit(program, cm));
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/for_directive_apply.out.js", &emitted).ok();
    let out = utils::normalize(&emitted);

    assert!(!out.contains("v-for"));
    assert!(out.contains("_$reconcileKeyed"));
    assert!(out.contains("Array.isArray(__rue_v_for_source)"));
    assert!(out.contains("Object.entries(__rue_v_for_source == null ? {} : __rue_v_for_source)"));
    assert!(out.contains("_$mountCompiledKeyedRow"));
}

#[test]
fn full_transform_avoids_param_name_collisions_for_destructured_v_for_aliases() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const list = [
  { id: 1, name: 'Rue' },
  { id: 2, name: 'Vapor' }
];

const Demo: FC = () => (
  <ul>
    <li v-for="(item, index) in list" key={item.id}>{index + 1}. {item.name}</li>
  </ul>
);

export default Demo;
"##;
    let (program, cm) = utils::parse(src, "for_directive_collision.tsx");
    let program = apply(program);
    let emitted = utils::strip_marker(&utils::emit(program, cm));
    let out = utils::normalize(&emitted);

    assert!(out.contains("_$reconcileKeyed"));
    assert!(!out.contains(&utils::normalize("const [item, index] = item;")));
    assert!(!out.contains(&utils::normalize("=>item.id")));
    assert!(out.contains(&utils::normalize("[0].id")));
    assert!(out.contains(&utils::normalize("[1] + 1")));
    assert!(out.contains(&utils::normalize("[0].name")));
}
