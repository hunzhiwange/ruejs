//! SWC 插件转换行为测试（spec11）
//!
//! 覆盖：表单绑定（checked/names/picked/selected/multiSelected）的编译与更新。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec11() {
    let src = r##"
import { FC, ref } from '@rue-js/rue';

const FormBindings: FC = () => {
  const text = ref('Edit me');
  const checked = ref(true);
  const checkedNames = ref<string[]>(['Jack']);
  const picked = ref<'One' | 'Two'>('One');
  const selected = ref<'A' | 'B' | 'C'>('A');
  const multiSelected = ref<string[]>(['A']);

  const toggleCheckedName = (name: string, nextChecked: boolean) => {
    checkedNames.value = nextChecked
      ? Array.from(new Set([...checkedNames.value, name]))
      : checkedNames.value.filter(n => n !== name);
  };

  const onMultiSelectChange = (e: any) => {
    const opts = Array.from((e.target as HTMLSelectElement).selectedOptions);
    multiSelected.value = opts.map(o => o.value);
  };

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Text Input</h2>
        <input
          className="border rounded-md px-3 py-2 w-full"
          value={text.value}
          onInput={(e: any) => { text.value = (e.target as HTMLInputElement).value; }}
          placeholder="Edit me"
        />
        <p className="mt-2 text-gray-700 dark:text-gray-300">{text.value}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Checkbox</h2>
        <div className="flex items-center gap-2">
          <input
            id="checkbox"
            type="checkbox"
            checked={checked.value}
            onChange={(e: any) => { checked.value = (e.target as HTMLInputElement).checked; }}
          />
          <label htmlFor="checkbox" className="select-none">Checked: {String(checked.value)}</label>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Multi Checkbox</h2>
        <div className="flex items-center gap-4 flex-wrap">
          {['Jack','John','Mike'].map(name => (
            <label key={name} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                value={name}
                checked={checkedNames.value.includes(name)}
                onChange={(e: any) => toggleCheckedName(name, (e.target as HTMLInputElement).checked)}
              />
              <span>{name}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-gray-700 dark:text-gray-300">Checked names: [{checkedNames.value.join(', ')}]</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Radio</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <label htmlFor="one" className="inline-flex items-center gap-2">
            <input
              id="one"
              type="radio"
              value="One"
              checked={picked.value === 'One'}
              onChange={() => { picked.value = 'One'; }}
            />
            <span>One</span>
          </label>
          <label htmlFor="two" className="inline-flex items-center gap-2">
            <input
              id="two"
              type="radio"
              value="Two"
              checked={picked.value === 'Two'}
              onChange={() => { picked.value = 'Two'; }}
            />
            <span>Two</span>
          </label>
        </div>
        <p className="mt-2 text-gray-700 dark:text-gray-300">Picked: {picked.value}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Select</h2>
        <select
          className="border rounded-md px-3 py-2"
          value={selected.value}
          onChange={(e: any) => { selected.value = (e.target as HTMLSelectElement).value as any; }}
        >
          <option value="">Please select one</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
        <p className="mt-2 text-gray-700 dark:text-gray-300">Selected: {selected.value}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Multi Select</h2>
        <select
          className="border rounded-md px-3 py-2 w-[120px]"
          multiple
          value={multiSelected.value}
          onChange={onMultiSelectChange}
        >
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
        <p className="mt-2 text-gray-700 dark:text-gray-300">Selected: [{multiSelected.value.join(', ')}]</p>
      </div>
    </div>
  );
};

export default FormBindings;
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 期望输出要点对照：
    // - 受控输入：input/select/checkbox/radio 的 value/checked 使用适配器 + watch 更新
    // - 事件：onInput/onChange → addEventListener('input'/'change', handler)
    // - 多选 select：规范值为数组 + Set 同步 options.selected
    // - 列表：['Jack','John','Mike'] → keyedList 渲染，renderItem 按项构造片段
    // - 文本插值：_$createTextWrapper + _$settextContent + watchEffect
    // 关键调用触发说明：
    // - _el3.value = text.value（watch）：input 文本回显
    // - addEventListener('input', ...)：文本输入更新 state
    // - _el9.checked（watch）+ change：单选 checkbox 受控
    // - keyedList renderItem：label/input/span 构造每项片段并渲染
    // - 多选 select：watch 中使用 Set 同步 options.selected
    let _expected_fragment = r##"
import { ref, _$compiledWithHookId, useSetup, _$compiledRoot, renderAnchor, _$createElement, _$template, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, onScopeDispose, untrack, watchEffect, _$compiledKeyedList, _$createTextWrapper, _$setAttribute, _$setClassName, _$setValue, _$setChecked } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const _$getTemplate1 = _$template('<div class="grid gap-6"><div><h2 class="text-lg font-semibold mb-2">Text Input</h2><input class="border rounded-md px-3 py-2 w-full" placeholder="Edit me"><p class="mt-2 text-gray-700 dark:text-gray-300"><!--rue:text-hole:0--></p></div><div><h2 class="text-lg font-semibold mb-2">Checkbox</h2><div class="flex items-center gap-2"><input id="checkbox" type="checkbox"><label for="checkbox" class="select-none">Checked: <!--rue:text-hole:1--></label></div></div><div><h2 class="text-lg font-semibold mb-2">Multi Checkbox</h2><div class="flex items-center gap-4 flex-wrap"><!--rue:text-hole:2--></div><p class="mt-2 text-gray-700 dark:text-gray-300">Checked names: [<!--rue:text-hole:3-->]</p></div><div><h2 class="text-lg font-semibold mb-2">Radio</h2><div class="flex items-center gap-4 flex-wrap"><label for="one" class="inline-flex items-center gap-2"><input id="one" type="radio" value="One"><span>One</span></label><label for="two" class="inline-flex items-center gap-2"><input id="two" type="radio" value="Two"><span>Two</span></label></div><p class="mt-2 text-gray-700 dark:text-gray-300">Picked: <!--rue:text-hole:4--></p></div><div><h2 class="text-lg font-semibold mb-2">Select</h2><!--rue:opaque-hole:5--><p class="mt-2 text-gray-700 dark:text-gray-300">Selected: <!--rue:text-hole:6--></p></div><div><h2 class="text-lg font-semibold mb-2">Multi Select</h2><!--rue:opaque-hole:7--><p class="mt-2 text-gray-700 dark:text-gray-300">Selected: [<!--rue:text-hole:8-->]</p></div></div>');
const FormBindings: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const text = ref('Edit me');
            const checked = ref(true);
            const checkedNames = ref<string[]>([
                    'Jack'
                ]);
            const picked = ref<'One' | 'Two'>('One');
            const selected = ref<'A' | 'B' | 'C'>('A');
            const multiSelected = ref<string[]>([
                    'A'
                ]);
            const toggleCheckedName = (name: string, nextChecked: boolean)=>{
                checkedNames.value = nextChecked ? Array.from(new Set([
                    ...checkedNames.value,
                    name
                ])) : checkedNames.value.filter((n)=>n !== name);
            };
            const onMultiSelectChange = (e: any)=>{
                const opts = Array.from((e.target as HTMLSelectElement).selectedOptions);
                multiSelected.value = opts.map((o)=>o.value);
            };
            return {
                text: text,
                checked: checked,
                checkedNames: checkedNames,
                picked: picked,
                selected: selected,
                multiSelected: multiSelected,
                toggleCheckedName: toggleCheckedName,
                onMultiSelectChange: onMultiSelectChange
            };
        }));
    const { text: text, checked: checked, checkedNames: checkedNames, picked: picked, selected: selected, multiSelected: multiSelected, toggleCheckedName: toggleCheckedName, onMultiSelectChange: onMultiSelectChange } = _$useSetup;
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[0].childNodes[1];
        const _el2 = _root.childNodes[1].childNodes[1].childNodes[0];
        const _el3 = _root.childNodes[3].childNodes[1].childNodes[0].childNodes[0];
        const _el4 = _root.childNodes[3].childNodes[1].childNodes[1].childNodes[0];
        const _el5 = _root.childNodes[0].childNodes[2].childNodes[0];
        const _el6 = _el5.parentNode;
        const _el7 = _root.childNodes[1].childNodes[1].childNodes[1].childNodes[1];
        const _el8 = _el7.parentNode;
        const _el9 = _root.childNodes[2].childNodes[1].childNodes[0];
        const _el10 = _el9.parentNode;
        const _el11 = _root.childNodes[2].childNodes[2].childNodes[1];
        const _el12 = _el11.parentNode;
        const _el13 = _root.childNodes[3].childNodes[2].childNodes[1];
        const _el14 = _el13.parentNode;
        const _el15 = _root.childNodes[4].childNodes[1];
        const _el16 = _el15.parentNode;
        const _el17 = _root.childNodes[4].childNodes[2].childNodes[1];
        const _el18 = _el17.parentNode;
        const _el19 = _root.childNodes[5].childNodes[1];
        const _el20 = _el19.parentNode;
        const _el21 = _root.childNodes[5].childNodes[2].childNodes[1];
        const _el22 = _el21.parentNode;
        _$setClassName(_el1, "border rounded-md px-3 py-2 w-full");
        watchEffect(()=>{
            _$setValue(_el1, text.value);
        });
        const _el1_event_2 = ($event)=>(e: any)=>{
                text.value = (e.target as HTMLInputElement).value;
            }($event);
        _el1.addEventListener("input", _el1_event_2);
        onScopeDispose(()=>_el1.removeEventListener("input", _el1_event_2));
        _$setAttribute(_el1, "placeholder", "Edit me");
        _$setAttribute(_el2, "id", "checkbox");
        _$setAttribute(_el2, "type", "checkbox");
        watchEffect(()=>{
            _$setChecked(_el2, !!(checked.value));
        });
        const _el2_event_3 = ($event)=>(e: any)=>{
                checked.value = (e.target as HTMLInputElement).checked;
            }($event);
        _el2.addEventListener("change", _el2_event_3);
        onScopeDispose(()=>_el2.removeEventListener("change", _el2_event_3));
        _$setAttribute(_el3, "id", "one");
        _$setAttribute(_el3, "type", "radio");
        _$setAttribute(_el3, "value", "One");
        watchEffect(()=>{
            _$setChecked(_el3, !!(picked.value === 'One'));
        });
        const _el3_event_4 = ($event)=>()=>{
                picked.value = 'One';
            }($event);
        _el3.addEventListener("change", _el3_event_4);
        onScopeDispose(()=>_el3.removeEventListener("change", _el3_event_4));
        _$setAttribute(_el4, "id", "two");
        _$setAttribute(_el4, "type", "radio");
        _$setAttribute(_el4, "value", "Two");
        watchEffect(()=>{
            _$setChecked(_el4, !!(picked.value === 'Two'));
        });
        const _el4_event_4 = ($event)=>()=>{
                picked.value = 'Two';
            }($event);
        _el4.addEventListener("change", _el4_event_4);
        onScopeDispose(()=>_el4.removeEventListener("change", _el4_event_4));
        watchEffect(()=>{
            const __slot = (text.value);
            untrack(()=>renderAnchor(__slot, _el6, _el5));
        });
        watchEffect(()=>{
            const __slot = String(checked.value);
            untrack(()=>renderAnchor(__slot, _el8, _el7));
        });
        const _list1 = _$createComment("rue:list:start");
        _el10.insertBefore(_list1, _el9);
        let _map1_elements = new Map;
        const _map1_state = {
            elements: _map1_elements
        };
        watchEffect(()=>{
            const _map1_current = [
                'Jack',
                'John',
                'Mike'
            ] || [];
            const _map1_newElements = _$compiledKeyedList({
                items: _map1_current,
                getKey: (name, idx)=>name,
                state: _map1_state,
                elements: _map1_elements,
                parent: _el10,
                before: _el9,
                singleRoot: true,
                trackIndex: false,
                ownedMount: true,
                start: _list1,
                renderItem: (name, parent, start, end, idx)=>{
                    const __slot = _$compiledRoot(()=>{
                        const _root = _$createDocumentFragment();
                        const _el23 = _$createElement("label", _root);
                        _$appendChild(_root, _el23);
                        _$setClassName(_el23, "inline-flex items-center gap-2");
                        const _el24 = _$createElement("input", _el23);
                        _$appendChild(_el23, _el24);
                        _$setAttribute(_el24, "type", "checkbox");
                        watchEffect(()=>{
                            _$setValue(_el24, name);
                        });
                        watchEffect(()=>{
                            _$setChecked(_el24, !!(checkedNames.value.includes(name)));
                        });
                        const _el24_event_3 = ($event)=>(e: any)=>toggleCheckedName(name, (e.target as HTMLInputElement).checked)($event);
                        _el24.addEventListener("change", _el24_event_3);
                        onScopeDispose(()=>_el24.removeEventListener("change", _el24_event_3));
                        const _el25 = _$createElement("span", _el23);
                        _$appendChild(_el23, _el25);
                        const _el26 = _$createTextWrapper(_el25);
                        _$appendChild(_el25, _el26);
                        watchEffect(()=>{
                            _$settextContent(_el26, name);
                        });
                        return _root;
                    });
                    renderAnchor(__slot, parent, start);
                }
            });
            _map1_elements = _map1_newElements;
        });
        watchEffect(()=>{
            const __slot = checkedNames.value.join(', ');
            untrack(()=>renderAnchor(__slot, _el12, _el11));
        });
        watchEffect(()=>{
            const __slot = (picked.value);
            untrack(()=>renderAnchor(__slot, _el14, _el13));
        });
        const _el27 = _$createElement("select", _el16);
        _$appendChild(_el16, _el27);
        _el16.insertBefore(_el27, _el15);
        _$setClassName(_el27, "border rounded-md px-3 py-2");
        watchEffect(()=>{
            _$setValue(_el27, selected.value);
        });
        const _el27_event_2 = ($event)=>(e: any)=>{
                selected.value = (e.target as HTMLSelectElement).value as any;
            }($event);
        _el27.addEventListener("change", _el27_event_2);
        onScopeDispose(()=>_el27.removeEventListener("change", _el27_event_2));
        const _el28 = _$createElement("option", _el27);
        _$appendChild(_el27, _el28);
        _$setAttribute(_el28, "value", "");
        _$appendChild(_el28, _$createTextNode("Please select one"));
        const _el29 = _$createElement("option", _el27);
        _$appendChild(_el27, _el29);
        _$setAttribute(_el29, "value", "A");
        _$appendChild(_el29, _$createTextNode("A"));
        const _el30 = _$createElement("option", _el27);
        _$appendChild(_el27, _el30);
        _$setAttribute(_el30, "value", "B");
        _$appendChild(_el30, _$createTextNode("B"));
        const _el31 = _$createElement("option", _el27);
        _$appendChild(_el27, _el31);
        _$setAttribute(_el31, "value", "C");
        _$appendChild(_el31, _$createTextNode("C"));
        watchEffect(()=>{
            const __slot = (selected.value);
            untrack(()=>renderAnchor(__slot, _el18, _el17));
        });
        const _el32 = _$createElement("select", _el20);
        _$appendChild(_el20, _el32);
        _el20.insertBefore(_el32, _el19);
        _$setClassName(_el32, "border rounded-md px-3 py-2 w-[120px]");
        _$setAttribute(_el32, "multiple", "");
        watchEffect(()=>{
            _$setValue(_el32, multiSelected.value);
        });
        const _el32_event_3 = ($event)=>onMultiSelectChange($event);
        _el32.addEventListener("change", _el32_event_3);
        onScopeDispose(()=>_el32.removeEventListener("change", _el32_event_3));
        const _el33 = _$createElement("option", _el32);
        _$appendChild(_el32, _el33);
        _$setAttribute(_el33, "value", "A");
        _$appendChild(_el33, _$createTextNode("A"));
        const _el34 = _$createElement("option", _el32);
        _$appendChild(_el32, _el34);
        _$setAttribute(_el34, "value", "B");
        _$appendChild(_el34, _$createTextNode("B"));
        const _el35 = _$createElement("option", _el32);
        _$appendChild(_el32, _el35);
        _$setAttribute(_el35, "value", "C");
        _$appendChild(_el35, _$createTextNode("C"));
        watchEffect(()=>{
            const __slot = multiSelected.value.join(', ');
            untrack(()=>renderAnchor(__slot, _el22, _el21));
        });
        return _root;
    });
};
export default FormBindings;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec11.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$compiledSetup(\"useSetup:0:0\""), "{normalized}");
    assert!(normalized.contains("_$reconcileKeyed"), "{normalized}");
    assert!(normalized.contains("_$mountCompiledKeyedRow"), "{normalized}");
    assert!(normalized.contains("_$compiledText"), "{normalized}");
    assert!(normalized.contains("_$setValue"), "{normalized}");
    assert!(normalized.contains("_$setChecked"), "{normalized}");
    assert!(normalized.contains("checkedNames.value.includes(_$rowItem1.get())"), "{normalized}");
    assert_eq!(
        normalized.matches(".addEventListener(").count(),
        normalized.matches(".removeEventListener(").count()
    );
    assert!(!normalized.contains("_$compiledKeyedList"), "{normalized}");
    assert!(!normalized.contains("watchEffect"), "{normalized}");
}
