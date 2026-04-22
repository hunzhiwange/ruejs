//! SWC 插件转换行为测试（spec36）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec36() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlayground'
import Code from '../site/components/Code'

const FormBindings: FC = () => {
  const text = ref('Edit me')
  const checked = ref(true)
  const checkedNames = ref<string[]>(['Jack'])
  const picked = ref<'One' | 'Two'>('One')
  const selected = ref<'A' | 'B' | 'C'>('A')
  const multiSelected = ref<string[]>(['A'])

  const toggleCheckedName = (name: string, nextChecked: boolean) => {
    checkedNames.value = nextChecked
      ? Array.from(new Set([...checkedNames.value, name]))
      : checkedNames.value.filter(n => n !== name)
  }

  const onMultiSelectChange = (e: any) => {
    const opts = Array.from((e.target as HTMLSelectElement).selectedOptions)
    multiSelected.value = opts.map(o => o.value)
  }

  const activeTab = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground type="examples">
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">表单绑定（移植自 Vue）</h1>
      <div role="tablist" className="tabs tabs-box">
        <button
          role="tab"
          className={`tab ${activeTab.value === 'preview' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'preview'
          }}
        >
          效果
        </button>
        <button
          role="tab"
          className={`tab ${activeTab.value === 'code' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'code'
          }}
        >
          代码
        </button>
      </div>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'code' && (
          <div className="card bg-base-100 shadow overflow-auto h-[520px] md:h-[720px]">
            <div className="card-body p-0">
              <Code
                className="h-full"
                lang="tsx"
                code={`import { type FC, ref } from '@rue-js/rue';

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
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Text Input</h2>
          <input
            className="input input-bordered w-full"
            value={text.value}
            onInput={(e: any) => {
              text.value = (e.target as HTMLInputElement).value
            }}
            placeholder="Edit me"
          />
          <p className="mt-2 text-gray-700">{text.value}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Checkbox</h2>
          <div className="flex items-center gap-2">
            <input
              id="checkbox"
              type="checkbox"
              className="checkbox"
              checked={checked.value}
              onChange={(e: any) => {
                checked.value = (e.target as HTMLInputElement).checked
              }}
            />
            <label htmlFor="checkbox" className="select-none">
              Checked: {String(checked.value)}
            </label>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Multi Checkbox</h2>
          <div className="flex items-center gap-4 flex-wrap">
            {['Jack', 'John', 'Mike'].map(name => (
              <label key={name} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox"
                  value={name}
                  checked={checkedNames.value.includes(name)}
                  onChange={(e: any) =>
                    toggleCheckedName(name, (e.target as HTMLInputElement).checked)
                  }
                />
                <span>{name}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-gray-700">Checked names: {checkedNames.value.join(', ')}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Radio</h2>
          <div className="flex items-center gap-4 flex-wrap">
            <label htmlFor="one" className="inline-flex items-center gap-2">
              <input
                id="one"
                type="radio"
                className="radio"
                value="One"
                checked={picked.value === 'One'}
                onChange={() => {
                  picked.value = 'One'
                }}
              />
              <span>One</span>
            </label>
            <label htmlFor="two" className="inline-flex items-center gap-2">
              <input
                id="two"
                type="radio"
                className="radio"
                value="Two"
                checked={picked.value === 'Two'}
                onChange={() => {
                  picked.value = 'Two'
                }}
              />
              <span>Two</span>
            </label>
          </div>
          <p className="mt-2 text-gray-700">Picked: {picked.value}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Select</h2>
          <select
            className="select select-bordered"
            value={selected.value}
            onChange={(e: any) => {
              selected.value = (e.target as HTMLSelectElement).value as any
            }}
          >
            <option value="">Please select one</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <p className="mt-2 text-gray-700">Selected: {selected.value}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Multi Select</h2>
          <select
            className="select select-bordered w-[160px]"
            multiple
            value={multiSelected.value}
            onChange={onMultiSelectChange}
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <p className="mt-2 text-gray-700">Selected: {multiSelected.value.join(', ')}</p>
        </div>
      </div>
    </div>
  );
};

export default FormBindings;`}
              />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Text Input</h2>
                <input
                  className="input input-bordered w-full"
                  value={text.value}
                  onInput={(e: any) => {
                    text.value = (e.target as HTMLInputElement).value
                  }}
                  placeholder="Edit me"
                />
                <p className="mt-2 text-gray-700">{text.value}</p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Checkbox</h2>
                <div className="flex items-center gap-2">
                  <input
                    id="checkbox"
                    type="checkbox"
                    className="checkbox"
                    checked={checked.value}
                    onChange={(e: any) => {
                      checked.value = (e.target as HTMLInputElement).checked
                    }}
                  />
                  <label htmlFor="checkbox" className="select-none">
                    Checked: {String(checked.value)}
                  </label>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Multi Checkbox</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  {['Jack', 'John', 'Mike'].map(name => (
                    <label key={name} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox"
                        value={name}
                        checked={checkedNames.value.includes(name)}
                        onChange={(e: any) =>
                          toggleCheckedName(name, (e.target as HTMLInputElement).checked)
                        }
                      />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-gray-700">Checked names: {checkedNames.value.join(', ')}</p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Radio</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  <label htmlFor="one" className="inline-flex items-center gap-2">
                    <input
                      id="one"
                      type="radio"
                      className="radio"
                      value="One"
                      checked={picked.value === 'One'}
                      onChange={() => {
                        picked.value = 'One'
                      }}
                    />
                    <span>One</span>
                  </label>
                  <label htmlFor="two" className="inline-flex items-center gap-2">
                    <input
                      id="two"
                      type="radio"
                      className="radio"
                      value="Two"
                      checked={picked.value === 'Two'}
                      onChange={() => {
                        picked.value = 'Two'
                      }}
                    />
                    <span>Two</span>
                  </label>
                </div>
                <p className="mt-2 text-gray-700">Picked: {picked.value}</p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Select</h2>
                <select
                  className="select select-bordered"
                  value={selected.value}
                  onChange={(e: any) => {
                    selected.value = (e.target as HTMLSelectElement).value as any
                  }}
                >
                  <option value="">Please select one</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
                <p className="mt-2 text-gray-700">Selected: {selected.value}</p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Multi Select</h2>
                <select
                  className="select select-bordered w-[160px]"
                  multiple
                  value={multiSelected.value}
                  onChange={onMultiSelectChange}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
                <p className="mt-2 text-gray-700">Selected: {multiSelected.value.join(', ')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default FormBindings
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup } from '@rue-js/rue';
import SidebarPlayground from '../site/SidebarPlayground';
import Code from '../site/components/Code';
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
            const activeTab = _$vaporWithHookId("ref:1:6", ()=>ref<'preview' | 'code'>('preview'));
            return {
                text: text,
                checked: checked,
                checkedNames: checkedNames,
                picked: picked,
                selected: selected,
                multiSelected: multiSelected,
                toggleCheckedName: toggleCheckedName,
                onMultiSelectChange: onMultiSelectChange,
                activeTab: activeTab
            };
        }));
    const { text: text, checked: checked, checkedNames: checkedNames, picked: picked, selected: selected, multiSelected: multiSelected, toggleCheckedName: toggleCheckedName, onMultiSelectChange: onMultiSelectChange, activeTab: activeTab } = _$useSetup;
    return (<SidebarPlayground type="examples">
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">表单绑定（移植自 Vue）</h1>
      <div role="tablist" className="tabs tabs-box">
        <button role="tab" className={`tab ${activeTab.value === 'preview' ? 'tab-active' : ''}`} onClick={()=>{
        activeTab.value = 'preview';
    }}>
          效果
        </button>
        <button role="tab" className={`tab ${activeTab.value === 'code' ? 'tab-active' : ''}`} onClick={()=>{
        activeTab.value = 'code';
    }}>
          代码
        </button>
      </div>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'code' && (<div className="card bg-base-100 shadow overflow-auto h-[520px] md:h-[720px]">
            <div className="card-body p-0">
              <Code className="h-full" lang="tsx" code={`import { type FC, ref } from '@rue-js/rue';

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
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Text Input</h2>
          <input
            className="input input-bordered w-full"
            value={text.value}
            onInput={(e: any) => {
              text.value = (e.target as HTMLInputElement).value
            }}
            placeholder="Edit me"
          />
          <p className="mt-2 text-gray-700">{text.value}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Checkbox</h2>
          <div className="flex items-center gap-2">
            <input
              id="checkbox"
              type="checkbox"
              className="checkbox"
              checked={checked.value}
              onChange={(e: any) => {
                checked.value = (e.target as HTMLInputElement).checked
              }}
            />
            <label htmlFor="checkbox" className="select-none">
              Checked: {String(checked.value)}
            </label>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Multi Checkbox</h2>
          <div className="flex items-center gap-4 flex-wrap">
            {['Jack', 'John', 'Mike'].map(name => (
              <label key={name} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox"
                  value={name}
                  checked={checkedNames.value.includes(name)}
                  onChange={(e: any) =>
                    toggleCheckedName(name, (e.target as HTMLInputElement).checked)
                  }
                />
                <span>{name}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-gray-700">Checked names: {checkedNames.value.join(', ')}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Radio</h2>
          <div className="flex items-center gap-4 flex-wrap">
            <label htmlFor="one" className="inline-flex items-center gap-2">
              <input
                id="one"
                type="radio"
                className="radio"
                value="One"
                checked={picked.value === 'One'}
                onChange={() => {
                  picked.value = 'One'
                }}
              />
              <span>One</span>
            </label>
            <label htmlFor="two" className="inline-flex items-center gap-2">
              <input
                id="two"
                type="radio"
                className="radio"
                value="Two"
                checked={picked.value === 'Two'}
                onChange={() => {
                  picked.value = 'Two'
                }}
              />
              <span>Two</span>
            </label>
          </div>
          <p className="mt-2 text-gray-700">Picked: {picked.value}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Select</h2>
          <select
            className="select select-bordered"
            value={selected.value}
            onChange={(e: any) => {
              selected.value = (e.target as HTMLSelectElement).value as any
            }}
          >
            <option value="">Please select one</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <p className="mt-2 text-gray-700">Selected: {selected.value}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Multi Select</h2>
          <select
            className="select select-bordered w-[160px]"
            multiple
            value={multiSelected.value}
            onChange={onMultiSelectChange}
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <p className="mt-2 text-gray-700">Selected: {multiSelected.value.join(', ')}</p>
        </div>
      </div>
    </div>
  );
};

export default FormBindings;`}/>
            </div>
          </div>)}

        {activeTab.value === 'preview' && (<div className="card bg-base-100 shadow">
            <div className="card-body grid gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Text Input</h2>
                <input className="input input-bordered w-full" value={text.value} onInput={(e: any)=>{
        text.value = (e.target as HTMLInputElement).value;
    }} placeholder="Edit me"/>
                <p className="mt-2 text-gray-700">{text.value}</p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Checkbox</h2>
                <div className="flex items-center gap-2">
                  <input id="checkbox" type="checkbox" className="checkbox" checked={checked.value} onChange={(e: any)=>{
        checked.value = (e.target as HTMLInputElement).checked;
    }}/>
                  <label htmlFor="checkbox" className="select-none">
                    Checked: {String(checked.value)}
                  </label>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Multi Checkbox</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  {[
        'Jack',
        'John',
        'Mike'
    ].map((name)=>(<label key={name} className="inline-flex items-center gap-2">
                      <input type="checkbox" className="checkbox" value={name} checked={checkedNames.value.includes(name)} onChange={(e: any)=>toggleCheckedName(name, (e.target as HTMLInputElement).checked)}/>
                      <span>{name}</span>
                    </label>))}
                </div>
                <p className="mt-2 text-gray-700">Checked names: {checkedNames.value.join(', ')}</p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Radio</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  <label htmlFor="one" className="inline-flex items-center gap-2">
                    <input id="one" type="radio" className="radio" value="One" checked={picked.value === 'One'} onChange={()=>{
        picked.value = 'One';
    }}/>
                    <span>One</span>
                  </label>
                  <label htmlFor="two" className="inline-flex items-center gap-2">
                    <input id="two" type="radio" className="radio" value="Two" checked={picked.value === 'Two'} onChange={()=>{
        picked.value = 'Two';
    }}/>
                    <span>Two</span>
                  </label>
                </div>
                <p className="mt-2 text-gray-700">Picked: {picked.value}</p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Select</h2>
                <select className="select select-bordered" value={selected.value} onChange={(e: any)=>{
        selected.value = (e.target as HTMLSelectElement).value as any;
    }}>
                  <option value="">Please select one</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
                <p className="mt-2 text-gray-700">Selected: {selected.value}</p>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">Multi Select</h2>
                <select className="select select-bordered w-[160px]" multiple value={multiSelected.value} onChange={onMultiSelectChange}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
                <p className="mt-2 text-gray-700">Selected: {multiSelected.value.join(', ')}</p>
              </div>
            </div>
          </div>)}
      </div>
    </SidebarPlayground>);
};
export default FormBindings;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec36.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
