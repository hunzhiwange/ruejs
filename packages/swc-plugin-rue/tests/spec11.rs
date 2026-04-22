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
    let expected_fragment = r##"
import { FC, ref, _$vaporWithHookId, useSetup, vapor, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$vaporKeyedList, _$createTextWrapper, _$setAttribute, _$addEventListener, _$setClassName, _$setValue, _$setChecked } from '@rue-js/rue';
const FormBindings: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const text = _$vaporWithHookId("ref:1:0", ()=>ref('Edit me'));
            const checked = _$vaporWithHookId("ref:1:1", ()=>ref(true));
            const checkedNames = _$vaporWithHookId("ref:1:2", ()=>ref<string[]>([
                    'Jack'
                ]));
            const picked = _$vaporWithHookId("ref:1:3", ()=>ref<'One' | 'Two'>('One'));
            const selected = _$vaporWithHookId("ref:1:4", ()=>ref<'A' | 'B' | 'C'>('A'));
            const multiSelected = _$vaporWithHookId("ref:1:5", ()=>ref<string[]>([
                    'A'
                ]));
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
    return vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "grid gap-6");
        const _el1 = _$createElement("div");
        _$appendChild(_root, _el1);
        const _el2 = _$createElement("h2");
        _$appendChild(_el1, _el2);
        _$setClassName(_el2, "text-lg font-semibold mb-2");
        _$appendChild(_el2, _$createTextNode("Text Input"));
        const _el3 = _$createElement("input");
        _$appendChild(_el1, _el3);
        _$setClassName(_el3, "border rounded-md px-3 py-2 w-full");
        watchEffect(()=>{
            _$setValue(_el3, text.value);
        });
        _$addEventListener(_el3, "input", ((e: any)=>{
            text.value = (e.target as HTMLInputElement).value;
        }));
        _$setAttribute(_el3, "placeholder", "Edit me");
        const _el4 = _$createElement("p");
        _$appendChild(_el1, _el4);
        _$setClassName(_el4, "mt-2 text-gray-700 dark:text-gray-300");
        const _el5 = _$createTextWrapper(_el4);
        _$appendChild(_el4, _el5);
        watchEffect(()=>{
            _$settextContent(_el5, text.value);
        });
        const _el6 = _$createElement("div");
        _$appendChild(_root, _el6);
        const _el7 = _$createElement("h2");
        _$appendChild(_el6, _el7);
        _$setClassName(_el7, "text-lg font-semibold mb-2");
        _$appendChild(_el7, _$createTextNode("Checkbox"));
        const _el8 = _$createElement("div");
        _$appendChild(_el6, _el8);
        _$setClassName(_el8, "flex items-center gap-2");
        const _el9 = _$createElement("input");
        _$appendChild(_el8, _el9);
        _$setAttribute(_el9, "id", "checkbox");
        _$setAttribute(_el9, "type", "checkbox");
        watchEffect(()=>{
            _$setChecked(_el9, !!(checked.value));
        });
        _$addEventListener(_el9, "change", ((e: any)=>{
            checked.value = (e.target as HTMLInputElement).checked;
        }));
        const _el10 = _$createElement("label");
        _$appendChild(_el8, _el10);
        _$setAttribute(_el10, "htmlFor", "checkbox");
        _$setClassName(_el10, "select-none");
        _$appendChild(_el10, _$createTextNode("Checked: "));
        const _el11 = _$createTextWrapper(_el10);
        _$appendChild(_el10, _el11);
        watchEffect(()=>{
            _$settextContent(_el11, String(checked.value));
        });
        const _el12 = _$createElement("div");
        _$appendChild(_root, _el12);
        const _el13 = _$createElement("h2");
        _$appendChild(_el12, _el13);
        _$setClassName(_el13, "text-lg font-semibold mb-2");
        _$appendChild(_el13, _$createTextNode("Multi Checkbox"));
        const _el14 = _$createElement("div");
        _$appendChild(_el12, _el14);
        _$setClassName(_el14, "flex items-center gap-4 flex-wrap");
        const _list1 = _$createComment("rue:list:start");
        const _list2 = _$createComment("rue:list:end");
        _$appendChild(_el14, _list1);
        _$appendChild(_el14, _list2);
        let _map1_elements = new Map;
        watchEffect(()=>{
            const _map1_current = [
                'Jack',
                'John',
                'Mike'
            ] || [];
            const _map1_newElements = _$vaporKeyedList({
                items: _map1_current,
                getKey: (name, idx)=>name,
                elements: _map1_elements,
                parent: _el14,
                before: _list2,
                singleRoot: true,
                start: _list1,
                renderItem: (name, parent, start, end, idx)=>{
                    const __slot = vapor(()=>{
                        const _root = _$createDocumentFragment();
                        const _el15 = _$createElement("label");
                        _$appendChild(_root, _el15);
                        watchEffect(()=>{
                            _$setAttribute(_el15, "key", String((name)));
                        });
                        _$setClassName(_el15, "inline-flex items-center gap-2");
                        const _el16 = _$createElement("input");
                        _$appendChild(_el15, _el16);
                        _$setAttribute(_el16, "type", "checkbox");
                        watchEffect(()=>{
                            _$setValue(_el16, name);
                        });
                        watchEffect(()=>{
                            _$setChecked(_el16, !!(checkedNames.value.includes(name)));
                        });
                        _$addEventListener(_el16, "change", ((e: any)=>toggleCheckedName(name, (e.target as HTMLInputElement).checked)));
                        const _el17 = _$createElement("span");
                        _$appendChild(_el15, _el17);
                        const _el18 = _$createTextWrapper(_el17);
                        _$appendChild(_el17, _el18);
                        watchEffect(()=>{
                            _$settextContent(_el18, name);
                        });
                        return {
                            vaporElement: _root
                        };
                    });
                    renderAnchor(__slot, parent, start);
                }
            });
            _map1_elements = _map1_newElements;
        });
        const _el19 = _$createElement("p");
        _$appendChild(_el12, _el19);
        _$setClassName(_el19, "mt-2 text-gray-700 dark:text-gray-300");
        _$appendChild(_el19, _$createTextNode("Checked names: ["));
        const _el20 = _$createTextWrapper(_el19);
        _$appendChild(_el19, _el20);
        watchEffect(()=>{
            _$settextContent(_el20, checkedNames.value.join(', '));
        });
        _$appendChild(_el19, _$createTextNode("]"));
        const _el21 = _$createElement("div");
        _$appendChild(_root, _el21);
        const _el22 = _$createElement("h2");
        _$appendChild(_el21, _el22);
        _$setClassName(_el22, "text-lg font-semibold mb-2");
        _$appendChild(_el22, _$createTextNode("Radio"));
        const _el23 = _$createElement("div");
        _$appendChild(_el21, _el23);
        _$setClassName(_el23, "flex items-center gap-4 flex-wrap");
        const _el24 = _$createElement("label");
        _$appendChild(_el23, _el24);
        _$setAttribute(_el24, "htmlFor", "one");
        _$setClassName(_el24, "inline-flex items-center gap-2");
        const _el25 = _$createElement("input");
        _$appendChild(_el24, _el25);
        _$setAttribute(_el25, "id", "one");
        _$setAttribute(_el25, "type", "radio");
        _$setAttribute(_el25, "value", "One");
        watchEffect(()=>{
            _$setChecked(_el25, !!(picked.value === 'One'));
        });
        _$addEventListener(_el25, "change", (()=>{
            picked.value = 'One';
        }));
        const _el26 = _$createElement("span");
        _$appendChild(_el24, _el26);
        _$appendChild(_el26, _$createTextNode("One"));
        const _el27 = _$createElement("label");
        _$appendChild(_el23, _el27);
        _$setAttribute(_el27, "htmlFor", "two");
        _$setClassName(_el27, "inline-flex items-center gap-2");
        const _el28 = _$createElement("input");
        _$appendChild(_el27, _el28);
        _$setAttribute(_el28, "id", "two");
        _$setAttribute(_el28, "type", "radio");
        _$setAttribute(_el28, "value", "Two");
        watchEffect(()=>{
            _$setChecked(_el28, !!(picked.value === 'Two'));
        });
        _$addEventListener(_el28, "change", (()=>{
            picked.value = 'Two';
        }));
        const _el29 = _$createElement("span");
        _$appendChild(_el27, _el29);
        _$appendChild(_el29, _$createTextNode("Two"));
        const _el30 = _$createElement("p");
        _$appendChild(_el21, _el30);
        _$setClassName(_el30, "mt-2 text-gray-700 dark:text-gray-300");
        _$appendChild(_el30, _$createTextNode("Picked: "));
        const _el31 = _$createTextWrapper(_el30);
        _$appendChild(_el30, _el31);
        watchEffect(()=>{
            _$settextContent(_el31, picked.value);
        });
        const _el32 = _$createElement("div");
        _$appendChild(_root, _el32);
        const _el33 = _$createElement("h2");
        _$appendChild(_el32, _el33);
        _$setClassName(_el33, "text-lg font-semibold mb-2");
        _$appendChild(_el33, _$createTextNode("Select"));
        const _el34 = _$createElement("select");
        _$appendChild(_el32, _el34);
        _$setClassName(_el34, "border rounded-md px-3 py-2");
        watchEffect(()=>{
            _$setValue(_el34, selected.value);
        });
        _$addEventListener(_el34, "change", ((e: any)=>{
            selected.value = (e.target as HTMLSelectElement).value as any;
        }));
        const _el35 = _$createElement("option");
        _$appendChild(_el34, _el35);
        _$setAttribute(_el35, "value", "");
        _$appendChild(_el35, _$createTextNode("Please select one"));
        const _el36 = _$createElement("option");
        _$appendChild(_el34, _el36);
        _$setAttribute(_el36, "value", "A");
        _$appendChild(_el36, _$createTextNode("A"));
        const _el37 = _$createElement("option");
        _$appendChild(_el34, _el37);
        _$setAttribute(_el37, "value", "B");
        _$appendChild(_el37, _$createTextNode("B"));
        const _el38 = _$createElement("option");
        _$appendChild(_el34, _el38);
        _$setAttribute(_el38, "value", "C");
        _$appendChild(_el38, _$createTextNode("C"));
        const _el39 = _$createElement("p");
        _$appendChild(_el32, _el39);
        _$setClassName(_el39, "mt-2 text-gray-700 dark:text-gray-300");
        _$appendChild(_el39, _$createTextNode("Selected: "));
        const _el40 = _$createTextWrapper(_el39);
        _$appendChild(_el39, _el40);
        watchEffect(()=>{
            _$settextContent(_el40, selected.value);
        });
        const _el41 = _$createElement("div");
        _$appendChild(_root, _el41);
        const _el42 = _$createElement("h2");
        _$appendChild(_el41, _el42);
        _$setClassName(_el42, "text-lg font-semibold mb-2");
        _$appendChild(_el42, _$createTextNode("Multi Select"));
        const _el43 = _$createElement("select");
        _$appendChild(_el41, _el43);
        _$setClassName(_el43, "border rounded-md px-3 py-2 w-[120px]");
        _$setAttribute(_el43, "multiple", "");
        watchEffect(()=>{
            _$setValue(_el43, multiSelected.value);
        });
        _$addEventListener(_el43, "change", (onMultiSelectChange));
        const _el44 = _$createElement("option");
        _$appendChild(_el43, _el44);
        _$setAttribute(_el44, "value", "A");
        _$appendChild(_el44, _$createTextNode("A"));
        const _el45 = _$createElement("option");
        _$appendChild(_el43, _el45);
        _$setAttribute(_el45, "value", "B");
        _$appendChild(_el45, _$createTextNode("B"));
        const _el46 = _$createElement("option");
        _$appendChild(_el43, _el46);
        _$setAttribute(_el46, "value", "C");
        _$appendChild(_el46, _$createTextNode("C"));
        const _el47 = _$createElement("p");
        _$appendChild(_el41, _el47);
        _$setClassName(_el47, "mt-2 text-gray-700 dark:text-gray-300");
        _$appendChild(_el47, _$createTextNode("Selected: ["));
        const _el48 = _$createTextWrapper(_el47);
        _$appendChild(_el47, _el48);
        watchEffect(()=>{
            _$settextContent(_el48, multiSelected.value.join(', '));
        });
        _$appendChild(_el47, _$createTextNode("]"));
        return {
            vaporElement: _root
        };
    });
};
export default FormBindings;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec11.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
