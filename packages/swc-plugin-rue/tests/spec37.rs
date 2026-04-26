//! SWC 插件转换行为测试（spec37）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec37() {
    let src = r##"
import { type FC, ref, useState } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlayground'
import Code from '../site/components/Code'

const ControlledInputs: FC = () => {
  const [text, setText] = useState('')
  const activeTab = ref<'preview' | 'code'>('code')
  var [text2, setText2] = useState('')
  let [text3, setText3] = useState('')
  return (
    <SidebarPlayground type="examples">
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">受控输入</h1>
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
          <div className="card bg-base-100 shadow overflow-auto h-[220px] md:h-[420px]">
            <div className="card-body p-0">
              <Code
                className="h-full"
                lang="tsx"
                code={`import { type FC, useState } from '@rue-js/rue';

const ControlledInputs: FC = () => {
  const [text, setText] = useState('');
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-4">
        <input
          className="input input-bordered"
          value={text.value}
          onInput={(e: any) => setText((e.target as HTMLInputElement).value)}
          placeholder="输入试试"
        />
        <div>当前：{text.value}</div>
      </div>
    </div>
  );
};

export default ControlledInputs;`}
              />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4">
              <input
                className="input input-bordered"
                value={text.value}
                onInput={(e: any) => setText((e.target as HTMLInputElement).value)}
                placeholder="输入试试"
              />
              <div>当前：{text.value}</div>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default ControlledInputs
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { _$vaporWithHookId, useSetup } from "@rue-js/rue/vapor";
import { type FC, ref, useState } from '@rue-js/rue';
import SidebarPlayground from '../site/SidebarPlayground';
import Code from '../site/components/Code';
const ControlledInputs: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const [text, setText] = _$vaporWithHookId("useState:1:0", ()=>useState(''));
            const activeTab = _$vaporWithHookId("ref:1:1", ()=>ref<'preview' | 'code'>('code'));
            var [text2, setText2] = _$vaporWithHookId("useState:1:2", ()=>useState(''));
            let [text3, setText3] = _$vaporWithHookId("useState:1:3", ()=>useState(''));
            return {
                text: text,
                setText: setText,
                activeTab: activeTab,
                text2: text2,
                setText2: setText2,
                text3: text3,
                setText3: setText3
            };
        }));
    const { text: text, setText: setText, activeTab: activeTab } = _$useSetup;
    let { text2: text2, setText2: setText2, text3: text3, setText3: setText3 } = _$useSetup;
    return (<SidebarPlayground type="examples">
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">受控输入</h1>
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
        {activeTab.value === 'code' && (<div className="card bg-base-100 shadow overflow-auto h-[220px] md:h-[420px]">
            <div className="card-body p-0">
              <Code className="h-full" lang="tsx" code={`import { type FC, useState } from '@rue-js/rue';

const ControlledInputs: FC = () => {
  const [text, setText] = useState('');
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-4">
        <input
          className="input input-bordered"
          value={text.value}
          onInput={(e: any) => setText((e.target as HTMLInputElement).value)}
          placeholder="输入试试"
        />
        <div>当前：{text.value}</div>
      </div>
    </div>
  );
};

export default ControlledInputs;`}/>
            </div>
          </div>)}

        {activeTab.value === 'preview' && (<div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4">
              <input className="input input-bordered" value={text.value} onInput={(e: any)=>setText((e.target as HTMLInputElement).value)} placeholder="输入试试"/>
              <div>当前：{text.value}</div>
            </div>
          </div>)}
      </div>
    </SidebarPlayground>);
};
export default ControlledInputs;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec37.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
