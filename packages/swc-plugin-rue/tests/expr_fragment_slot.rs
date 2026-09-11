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
fn compiles_safe_nested_element_and_fragment_slots_directly() {
    let src = r##"
import { type FC } from '@rue-js/rue'
const Demo: FC<{ ok: boolean }> = props => (
  <div>
    {props.ok ? <span>ready</span> : <><em>fallback</em><b>idle</b></>}
    {props.ok && <small>small</small>}
  </div>
)
"##;

    let out = compile(src, "expr_safe_compiled_slots");

    assert!(out.contains("_$compiledBranchAt("), "{out}");
    assert!(
        out.contains(&utils::normalize(
            "if (_$compiledPropsGet(props, \"ok\")) return { __rue_compiled_branch_key: true"
        )),
        "{out}"
    );
    assert!(out.contains(&utils::normalize("_$createDocumentFragment()")), "{out}");
    assert!(out.contains(&utils::normalize("_$compiledCreateElement(\"span\"")), "{out}");
    assert!(out.contains(&utils::normalize("_$compiledCreateElement(\"small\"")), "{out}");
    assert!(
        !out.contains(&utils::normalize("_$compiledPropsGet(props, \"ok\") ? vapor(")),
        "{out}"
    );
}

#[test]
fn unsafe_nested_slots_keep_vapor_fallbacks() {
    let src = r##"
const Child = () => <i />
const holder = { get() {} }
const parts = []
const Demo = (props) => <div>
  {props.ok ? <Child /> : <span>{holder.get()}</span>}
  {props.more && <>{...parts}</>}
</div>
"##;

    let out = compile(src, "expr_unsafe_vapor_slots");

    assert!(
        out.contains(&utils::normalize(
            "props.ok ? _$createComponent(Child, ()=>({})) : _$compiledRoot("
        )),
        "{out}"
    );
    assert!(out.contains(&utils::normalize("props.more ? _$compiledRoot(")), "{out}");
}

#[test]
fn lowers_bare_fragment_expression_container_to_slot_render() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Demo: FC<{ label: string }> = props => (
  <div>{<><span>{props.label}</span></>}</div>
)
"##;

    let out = compile(src, "expr_fragment_slot_bare");

    assert!(out.contains(&utils::normalize("const __slot = _$compiledRoot(")));
    assert!(out.contains(&utils::normalize("renderAnchor(__slot, _el2, _el1)")));
    assert!(out.contains(&utils::normalize("_$compiledCreateElement(\"span\", _root)")));
}

#[test]
fn lowers_conditional_fragment_branches_to_slot_render() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Demo: FC<{ ok: boolean; label: string }> = props => (
  <div>{props.ok ? <><span>{props.label}</span></> : <><em>fallback</em></>}</div>
)
"##;

    let out = compile(src, "expr_fragment_slot_conditional");

    assert!(out.contains(&utils::normalize("_$compiledBranchAt(_el2, _el1")));
    assert!(out.contains(&utils::normalize("_$compiledCreateElement(\"span\", _root)")));
    assert!(out.contains(&utils::normalize("_$compiledCreateElement(\"em\"")));
    assert!(out.contains(&utils::normalize("_$compiledCreateTextNode(\"fallback\")")));
    assert!(!out.contains("renderAnchor"));
}

#[test]
fn lowers_logical_and_fragment_rhs_to_slot_render() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Demo: FC<{ ok: boolean; label: string }> = props => (
  <div>{props.ok && <><span>{props.label}</span></>}</div>
)
"##;

    let out = compile(src, "expr_fragment_slot_logical_and");

    assert!(out.contains(&utils::normalize("_$compiledBranchAt(_el2, _el1")));
    assert!(out.contains(&utils::normalize(
        "const __rue_branch_value = _$compiledPropsGet(props, \"ok\")"
    )));
    assert!(!out.contains("renderAnchor"));
}

#[test]
fn lowers_bare_identifier_inside_fragment_to_slot_render() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Demo: FC<{ holder: any }> = ({ holder }) => (
  <div><>{holder}</></div>
)
"##;

    let out = compile(src, "expr_fragment_slot_bare_identifier");

    assert!(out.contains(&utils::normalize("rue:text-hole:0")));
    assert!(out.contains("holder"), "{out}");
    assert!(out.contains("_$compiledText") || out.contains("_$mountCompiledSlotAt"), "{out}");
    assert!(!out.contains("renderAnchor"));
    assert!(!out.contains(&utils::normalize("_$settextContent(_el1, holder)")));
    assert!(!out.contains(&utils::normalize("_$settextContent(_el2, holder)")));
}

#[test]
fn lowers_memoized_jsx_child_to_slot_render() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Demo: FC = () => {
  const msg = ref('initial')
  return <div><span v-once>{msg.value}</span></div>
}
"##;

    let out = compile(src, "expr_memoized_jsx_child_slot");

    assert!(out.contains("_$compiledMemo(\"memo:"));
    assert!(!out.contains("useMemo"));
    assert!(out.contains(&utils::normalize("const _list1 = _$compiledMemo(")));
    assert!(out.contains(&utils::normalize("renderAnchor(_list1, _el2, _el1);")));
    assert!(out.contains(&utils::normalize("_$compiledText(_el3, ()=>msg.value);")));
    assert!(!out.contains(&utils::normalize("watchEffect(()=>{ const __slot = _$compiledMemo(")));
    assert!(!out.contains(&utils::normalize("watchEffect(()=>{ _$settextContent")));
    assert!(!out.contains("_$settextContent(_el1, _$compiledMemo"));
}

#[test]
fn lowers_conditional_map_callbacks_to_slot_render() {
    let src = r##"
import { computed, ref, type FC } from '@rue-js/rue'

const Demo: FC = () => {
    const items = computed(() => [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
    ])
    const showList = ref(true)

    return (
        <section>
            {showList.value
                ? items.get().map((item) => {
                        const label = item.label.toUpperCase()
                        return <button key={item.id}>{label}</button>
                    })
                : <span>empty</span>}
        </section>
    )
}
"##;

    let out = compile(src, "expr_fragment_slot_conditional_map_callback");

    assert!(out.contains("showList.value"), "{out}");
    assert!(!out.contains(&utils::normalize("_$compiledKeyedList({")));
    assert!(out.contains("items.get().map"), "{out}");
    assert!(out.contains(&utils::normalize("const label = item.label.toUpperCase();")));
    assert!(out.contains("_$compiledRoot("), "{out}");
    assert!(out.contains(&utils::normalize(": _$compiledRoot((__rue_parent_context)=>{")));
    assert!(
        out.contains(&utils::normalize("_$compiledCreateElement(\"span\", __rue_parent_context)"))
    );
    assert!(out.contains(&utils::normalize("renderAnchor(__slot, _el2, _el1)")));
    assert!(!out.contains("_jsxDEV("));
}

#[test]
fn lowers_logical_and_map_callbacks_to_slot_render() {
    let src = r##"
import { computed, ref, type FC } from '@rue-js/rue'

const Demo: FC = () => {
    const items = computed(() => [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
    ])
    const showList = ref(true)

    return (
        <section>
            {showList.value && items.get().map((item) => {
                const label = item.label.toUpperCase()
                return <button key={item.id}>{label}</button>
            })}
        </section>
    )
}
"##;

    let out = compile(src, "expr_fragment_slot_logical_and_map_callback");

    assert!(out.contains("showList.value"), "{out}");
    assert!(!out.contains(&utils::normalize("_$compiledKeyedList({")));
    assert!(out.contains("items.get().map"), "{out}");
    assert!(out.contains(&utils::normalize(": \"\";")));
    assert!(out.contains(&utils::normalize("const label = item.label.toUpperCase();")));
    assert!(out.contains(&utils::normalize("renderAnchor(__slot, _el2, _el1)")));
    assert!(!out.contains("_jsxDEV("));
}

#[test]
fn preserves_key_expr_for_simple_block_map_callbacks_in_conditional_slots() {
    let src = r##"
import { computed, ref, type FC } from '@rue-js/rue'

const STATUS_META = {
    todo: {
        cardClass: 'todo-card',
        badgeClass: 'todo-badge',
        dotClass: 'todo-dot',
        label: 'Todo',
    },
}

const Demo: FC = () => {
    const editingId = ref<string | null>(null)
    const visibleTodos = computed(() => [
        { id: 'a', title: 'Alpha', status: 'todo', archived: false },
        { id: 'b', title: 'Beta', status: 'todo', archived: true },
    ])

    return (
        <div className="grid gap-4">
            {visibleTodos.get().length
                ? visibleTodos.get().map((item) => {
                        const meta = STATUS_META[item.status]
                        const isEditing = editingId.value === item.id

                        return (
                            <div
                                key={item.id}
                                className={`card ${meta.cardClass} ${item.archived ? 'archived' : 'active'}`}
                            >
                                <div className="card-body">
                                    <span className={meta.badgeClass}>{meta.label}</span>
                                    {!isEditing && <h3>{item.title}</h3>}
                                    {isEditing && <input value={item.title} />}
                                </div>
                            </div>
                        )
                    })
                : <div>empty</div>}
        </div>
    )
}
"##;

    let out = compile(src, "expr_fragment_slot_conditional_map_preserves_key");

    assert!(!out.contains(&utils::normalize("_$compiledKeyedList({")), "{out}");
    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert!(out.contains("(item, idx)=>item.id"), "{out}");
    assert!(out.contains(&utils::normalize("visibleTodos.get().length")), "{out}");
    assert!(out.contains(&utils::normalize("renderAnchor(__slot")), "{out}");
}
