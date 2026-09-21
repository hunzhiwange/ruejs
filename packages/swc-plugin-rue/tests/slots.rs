use swc_plugin_rue::apply;

mod utils;

fn compile(src: &str, name: &str) -> String {
    let (program, cm) = utils::parse(src, &format!("{name}.tsx"));
    let program = apply(program);
    let out = utils::emit(program, cm);

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(format!("target/vapor_outputs/{name}.out.js"), utils::strip_marker(&out)).ok();

    utils::normalize(&utils::strip_marker(&out))
}

#[test]
fn injects_slot_source_and_collects_named_slots() {
    let src = r##"
import { type FC, Slot, Template } from '@rue-js/rue'

const Panel: FC = () => (
  <section>
    <header><Slot name="title">Untitled</Slot></header>
    <main><Slot>Empty</Slot></main>
  </section>
)

const Demo: FC = () => (
  <Panel>
    <Template slot="title">
      <strong>Named title</strong>
    </Template>
    <span>Body</span>
  </Panel>
)
"##;

    let out = compile(src, "slots_named_default");

    assert!(out.contains("_$compiledComponent(Panel, ()=>({"), "{out}");
    assert!(out.contains("__rue_slots"));
    assert!(out.contains(&utils::normalize("\"title\": (target, slotProps, owner)=>")));
    assert!(out.contains(&utils::normalize("children: (target, slotProps, owner)=>")));
}

#[test]
fn lowers_default_scoped_slot_function_into_slot_bag() {
    let src = r##"
import { type FC, Slot } from '@rue-js/rue'

const List: FC = () => (
  <div>
    <Slot props={{ label: 'fallback' }}>missing</Slot>
  </div>
)

const Demo: FC = () => (
  <List>
    {({ label }) => <strong>{label}</strong>}
  </List>
)
"##;

    let out = compile(src, "slots_scoped_default");

    assert!(out.contains("__rue_slots"));
    assert!(out.contains(&utils::normalize("\"default\": ({ label })=>")));
    assert!(out.contains("_$createComponent(List, ()=>({"), "{out}");
}

#[test]
fn hoists_conditional_named_slots_into_slot_bag() {
    let src = r##"
import { type FC, Slot, Template, ref } from '@rue-js/rue'

const Panel: FC = () => (
  <section>
    <header><Slot name="title">Untitled</Slot></header>
    <div><Slot name="actions">Fallback action</Slot></div>
    <main><Slot>Body</Slot></main>
  </section>
)

const Demo: FC = () => {
  const showTitle = ref(true)
  const showActions = ref(true)

  return (
    <Panel>
      {showTitle.value && (
        <Template slot="title">
          <strong>Named title</strong>
          <span>Subtitle</span>
        </Template>
      )}
      {showActions.value && <button slot="actions">Run</button>}
      <div>Body</div>
    </Panel>
  )
}
"##;

    let out = compile(src, "slots_conditional_named");

    assert!(out.contains("_$compiledBranch"));
    assert!(out.contains("showTitle.value"));
    assert!(out.contains("showActions.value"));
    assert!(out.contains("children: (target, slotProps, owner)=>"));
    assert!(!out.contains(&utils::normalize("createComponent(Template")));
    assert!(out.contains(&utils::normalize("\"slot\", \"actions\"")));
}

#[test]
fn lowers_conditional_default_slot_into_optional_children() {
    let src = r##"
import { type FC, Slot, ref } from '@rue-js/rue'

const Panel: FC = () => (
  <section>
    <main><Slot>Fallback body</Slot></main>
  </section>
)

const Demo: FC = () => {
  const showBody = ref(true)

  return (
    <Panel>
      {showBody.value && <div>Body</div>}
    </Panel>
  )
}
"##;

    let out = compile(src, "slots_conditional_default");

    assert!(out.contains(&utils::normalize("children: (target, slotProps, owner)=>")));
    assert!(out.contains("_$compiledBranch"));
    assert!(out.contains("_$compiledComponent(Panel, ()=>({"), "{out}");
}

#[test]
fn lowers_conditional_default_slot_map_callbacks_without_leaking_jsxdev() {
    let src = r##"
import { type FC, Slot, ref } from '@rue-js/rue'

const Panel: FC = () => (
  <section>
    <main><Slot>Fallback body</Slot></main>
  </section>
)

const Demo: FC = () => {
  const showBody = ref(true)
  const items = ref([
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
  ])

  return (
    <Panel>
      {showBody.value && items.value.map((item) => {
        const label = item.label.toUpperCase()
        return <button key={item.id}>{label}</button>
      })}
    </Panel>
  )
}
"##;

    let out = compile(src, "slots_conditional_default_map");

    assert!(out.contains(&utils::normalize("children: (target, slotProps, owner)=>")));
    assert!(out.contains(&utils::normalize("const label = item.label.toUpperCase();")));
    assert!(out.contains("_$reconcileKeyed"));
    assert!(!out.contains("_jsxDEV("));
}

#[test]
fn lowers_custom_element_props_context_and_rue_slots_to_properties() {
    let src = r##"
import { type FC, Template, ref } from '@rue-js/rue'

function ThemeContext() {}

const Demo: FC = () => {
  const count = ref(1)

  return (
    <ThemeContext.Provider value="outer">
      <my-panel props={{ count: count.value }}>
        <Template slot="row">
          {({ label }) => <strong>{label}</strong>}
        </Template>
        {({ label }) => <em>{label}</em>}
        <span slot="native">Native slot</span>
      </my-panel>
    </ThemeContext.Provider>
  )
}
"##;

    let out = compile(src, "custom_element_slots_context");

    assert!(out.contains("getCurrentOwner"));
    assert!(out.contains(&utils::normalize(
        r#"_$setProperty(_el1, "__rue_context_parent_instance__", getCurrentOwner())"#,
    )));
    assert!(
        out.contains(&utils::normalize(r#"_$setProperty(_el1, "props", { count: count.value })"#,))
    );
    assert!(out.contains("__rue_slots"));
    assert!(out.contains(&utils::normalize(r#""row": ({ label })=>"#)));
    assert!(out.contains(&utils::normalize(r#""default": ({ label })=>"#)));
    assert!(out.contains(&utils::normalize(r#""slot", "native""#)));
    assert!(out.contains("Native slot"));
}

#[test]
fn lowers_custom_element_complex_attrs_to_properties_without_stringifying_native_attrs() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Demo: FC = () => {
  const ready = ref(true)
  const payload = ref({ id: 'a', label: 'Alpha' })

  return (
    <my-panel
      props={payload.value}
      config={{ ready: ready.value, payload: payload.value }}
      items={[payload.value.id, ready.value]}
      formatter={(value) => value.toUpperCase()}
      data-id={payload.value.id}
      disabled={ready.value}
    />
  )
}
"##;

    let out = compile(src, "custom_element_complex_attrs");

    assert!(out.contains(&utils::normalize(r#"_$setProperty(_root, "props", (payload.value))"#)));
    assert!(out.contains(&utils::normalize(
        r#"_$setProperty(_root, "config", { ready: ready.value, payload: payload.value })"#
    )));
    assert!(out.contains(&utils::normalize(
        r#"_$setProperty(_root, "items", [
          payload.value.id,
          ready.value
        ])"#
    )));
    assert!(out.contains(&utils::normalize(
        r#"_$setProperty(_root, "formatter", (value)=>value.toUpperCase())"#
    )));
    assert!(out.contains(&utils::normalize(
        r#"_$setAttribute(_root, "data-id", String((payload.value.id)))"#,
    )));
    assert!(out.contains(&utils::normalize(r#"_$setDisabled(_root, ready.value)"#)));
    assert!(!out.contains(&utils::normalize("String({ ready: ready.value")));
    assert!(!out.contains(&utils::normalize("String([payload.value.id")));
    assert!(!out.contains(&utils::normalize("String([ payload.value.id")));
    assert!(!out.contains(&utils::normalize("String((value)=>")));
}

#[test]
fn keeps_custom_element_non_slot_expression_children_as_native_children() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Demo: FC = () => {
  const items = ref(['a', 'b'])

  return (
    <my-panel>
      {items.value.map(item => <span slot="native">{item}</span>)}
    </my-panel>
  )
}
"##;

    let out = compile(src, "custom_element_native_expression_children");

    assert!(!out.contains("__rue_slots"));
    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert!(out.contains(&utils::normalize("items.value || []")));
    assert!(out.contains(&utils::normalize(r#""slot", "native""#)));
}

#[test]
fn lowers_custom_element_template_without_slot_to_default_rue_slot() {
    let src = r##"
import { type FC, Template } from '@rue-js/rue'

const Demo: FC = () => (
  <my-panel>
    <Template>
      <strong>Default slot</strong>
    </Template>
    <span slot="native">Native slot</span>
  </my-panel>
)
"##;

    let out = compile(src, "custom_element_default_template_slot");

    assert!(out.contains("__rue_slots"));
    assert!(out.contains(&utils::normalize(r#""default": __child"#)));
    assert!(out.contains(&utils::normalize(r#""slot", "native""#)));
    assert!(out.contains("Native slot"));
    assert!(!out.contains(&utils::normalize("createComponent(Template")));
}
