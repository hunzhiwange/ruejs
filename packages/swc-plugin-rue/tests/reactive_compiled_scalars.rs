use swc_plugin_rue::apply;

mod utils;

fn transform(source: &str) -> String {
    let (program, cm) = utils::parse(source, "reactive-compiled-scalars.tsx");
    utils::normalize(&utils::strip_marker(&utils::emit(apply(program), cm)))
}

#[test]
fn compiles_all_proven_rue_reactive_scalar_shapes() {
    let output = transform(
        r#"
import {
  type FC,
  ref as makeRef,
  shallowRef,
  customRef,
  toRef,
  toRefs,
  reactive,
  shallowReactive,
  readonly,
  shallowReadonly,
  propsReactive,
  computed,
  signal,
  useSignal,
  useState,
} from '@rue-js/rue';

const plain = makeRef('plain');
const shallow = shallowRef('shallow');
const custom = customRef(factory);
const property = toRef(model, 'title');
const proxy = reactive({ nested: { title: 'proxy' }, className: 'ready', style: 'color:red' });
const shallowProxy = shallowReactive({ title: 'shallow-proxy' });
const readonlyProxy = readonly(proxy);
const shallowReadonlyProxy = shallowReadonly(proxy);
const propsProxy = propsReactive({ disabled: false });
const { nested: nestedRef } = toRefs(proxy);
const derived = computed(() => plain.value);
const directSignal = signal('signal');

export const View: FC = () => {
  const [hookSignal] = useSignal('hook');
  const [state] = useState('state');
  return (
    <section
      className={proxy.className}
      style={proxy.style}
      title={property.value}
      data-shallow={shallowProxy.title}
      data-readonly={readonlyProxy.nested.title}
      data-shallow-readonly={shallowReadonlyProxy.nested.title}
    >
      <input value={state} checked={propsProxy.disabled} disabled={propsProxy.disabled} />
      <span>{plain.value}</span>
      <span>{shallow.value}</span>
      <span>{custom.value}</span>
      <span>{nestedRef.value.title}</span>
      <span>{derived.get()}</span>
      <span>{directSignal.get()}</span>
      <span>{hookSignal.get()}</span>
    </section>
  );
};
"#,
    );

    for (helper, entry) in [("_$compiledRoot", "block"), ("effect", "reactive")] {
        assert!(
            output.split(';').any(|statement| statement.contains(helper)
                && statement.contains(&format!("@rue-js/rue/internal/{entry}"))),
            "missing {helper}: {output}"
        );
    }
    for read in [
        "plain.value",
        "shallow.value",
        "custom.value",
        "property.value",
        "proxy.className",
        "shallowProxy.title",
        "readonlyProxy.nested.title",
        "shallowReadonlyProxy.nested.title",
        "propsProxy.disabled",
        "nestedRef.value.title",
        "derived.get()",
        "directSignal.get()",
        "hookSignal.get()",
        "state",
    ] {
        assert!(output.contains(read), "missing compiled read {read}: {output}");
    }
    assert!(output.contains("_$compiledRoot("), "{output}");
    assert!(!output.contains("vapor("), "{output}");
    assert!(output.contains("_$mountCompiledSlotAt"), "{output}");
    assert!(output.contains("_$compiledValueFactory"), "{output}");
    assert!(!output.contains("watchEffect"), "{output}");
}

#[test]
fn keeps_unproven_members_and_renderables_on_vapor() {
    let output = transform(
        r#"
import { type FC, ref } from '@rue-js/rue';

declare const obj: { value: unknown };
declare const replacement: { value: unknown };
declare function renderNode(): Node;

const stable = ref('stable');
const UnknownMember: FC = () => <div title={obj.value}>{obj.value}</div>;
const Reassigned: FC = () => {
  let alias = ref('before');
  alias = replacement;
  return <div>{alias.value}</div>;
};
const UnknownCall: FC = () => <div title={renderNode()}>{renderNode()}</div>;
const AsyncView = async () => <div>{stable.value}</div>;

export { UnknownMember, Reassigned, UnknownCall, AsyncView };
"#,
    );

    assert!(output.contains("from \"@rue-js/rue/internal/block\""), "{output}");
    assert!(output.contains("_$compiledRoot("), "{output}");
    assert!(output.contains("effect"), "{output}");
    assert!(!output.contains("watchEffect"), "{output}");
    assert!(output.contains("obj.value"), "{output}");
    assert!(output.contains("alias.value"), "{output}");
    assert!(output.contains("renderNode()"), "{output}");
    assert!(!output.contains("vapor("), "{output}");
    assert!(!output.contains("_$compiledText"), "{output}");
}
