use swc_plugin_rue::{apply, apply_pre};

mod utils;

#[test]
fn rewrites_v_model_and_r_model_to_controlled_props_in_pre_transform() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue';

type FieldProps = {
  modelValue?: string;
  userName?: string;
  userNameModifiers?: { lazy?: boolean; trim?: boolean };
  onUpdateModelValue?: (value: string) => void;
  onUpdateUserName?: (value: string) => void;
};

const Field: FC<FieldProps> = props => (
  <input value={props.modelValue ?? props.userName ?? ''} onInput={event => props.onUpdateModelValue?.((event.target as HTMLInputElement).value)} />
);

const Demo: FC = () => {
  const text = ref('');
  const age = ref<string | number>('0');
  const lazyNote = ref('blur to sync');
  const checked = ref(false);
  const picked = ref('A');
  const selected = ref<string[]>([]);
  const title = ref('hello');
  const userName = ref('Rue');

  return (
    <section>
      <input v-model={text.value} />
      <input type="number" v-model:trim-number={age.value} />
      <input v-model:lazy={lazyNote.value} />
      <input type="checkbox" r-model={checked.value} />
      <input type="radio" value="A" v-model={picked.value} />
      <select multiple r-model={selected.value}>
        <option value="A">A</option>
        <option value="B">B</option>
      </select>
      <Field v-model={title.value} />
      <Field v-model:lazy-trim-user-name={userName.value} />
      <Field __rue_model__user_name__mods__lazy__trim={userName.value} />
    </section>
  );
};

export default Demo;
"##;

    let (program, cm) = utils::parse(src, "model_directive_pre.tsx");
    let program = apply_pre(program);
    let emitted = utils::strip_marker(&utils::emit(program, cm));
    let out = utils::normalize(&emitted);

    assert!(!out.contains("v-model"));
    assert!(!out.contains("r-model"));
    assert!(!out.contains("__rue_model__"));
    assert!(out.contains(&utils::normalize("value={text.value}")));
    assert!(out.contains("onInput"));
    assert!(out.contains("onChange"));
    assert!(out.contains("value.trim()"));
    assert!(out.contains("parseFloat(value)"));
    assert!(out.contains("Array.isArray(checked.value)"));
    assert!(out.contains("!!(checked.value)"));
    assert!(out.contains(&utils::normalize("checked={(picked.value) === (\"A\")}")));
    assert!(out.contains("selectedOptions"));
    assert!(out.contains(&utils::normalize("modelValue={title.value}")));
    assert!(out.contains("onUpdateModelValue"));
    assert!(out.contains(&utils::normalize("userName={userName.value}")));
    assert!(out.contains("onUpdateUserName"));
    assert!(out.contains("userNameModifiers"));
    assert!(out.contains(&utils::normalize("\"lazy\": true")));
    assert!(out.contains(&utils::normalize("\"trim\": true")));
}

#[test]
fn full_transform_reuses_existing_codegen_after_model_rewrite() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue';

type FieldProps = {
  userName?: string;
  userNameModifiers?: { trim?: boolean };
  onUpdateUserName?: (value: string) => void;
};

const Field: FC<FieldProps> = props => (
  <input value={props.userName ?? ''} onInput={event => props.onUpdateUserName?.((event.target as HTMLInputElement).value)} />
);

const Demo: FC = () => {
  const text = ref('');
  const checked = ref(false);
  const userName = ref('hello');

  return (
    <section>
      <input v-model:lazy={text.value} />
      <input type="checkbox" v-model={checked.value} />
      <Field v-model:trim-user-name={userName.value} />
    </section>
  );
};

export default Demo;
"##;

    let (program, cm) = utils::parse(src, "model_directive_apply.tsx");
    let program = apply(program);
    let emitted = utils::strip_marker(&utils::emit(program, cm));
    let out = utils::normalize(&emitted);

    assert!(!out.contains("v-model"));
    assert!(!out.contains("__rue_model__"));
    assert!(out.contains(".value ="));
    assert!(out.contains(".checked ="));
    assert!(out.contains(".addEventListener("));
    assert!(out.contains("onOwnerCleanup"));
    assert!(out.contains(&utils::normalize("\"change\"")));
    assert!(out.contains("onUpdateUserName"));
    assert!(out.contains("userNameModifiers"));
}
