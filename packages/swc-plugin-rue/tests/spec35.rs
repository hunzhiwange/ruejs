//! SWC 插件转换行为测试（spec35）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_spec35() {
    let src = r##"
import { type FC, ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlayground'
import Code from '../site/components/Code'

const HandlingInput: FC = () => {
  const message = ref('Hello World!')
  let yes = ref(message.value)
  const reverseMessage = () => {
    message.value = message.value.split('').reverse().join('')
  }
  let hello = ref('Hello World!')
  let world = ref(message.value)
  const notify = () => {
    alert('navigation was prevented.')
  }
  var goods = ref([
    {
      name: '商品1',
      price: 100
    },
    {
      name: '商品2',
      price: 200
    }
  ])
  const activeTab = ref<'preview' | 'code'>('preview')
  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">处理输入（移植自 Vue）</h1>
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
          <div className="card bg-base-100 shadow overflow-auto h-[260px] md:h-[560px]">
            <div className="card-body p-0">
              <Code
                className="h-full"
                lang="tsx"
                code={`import { type FC, ref } from 'rue-js';

const HandlingInput: FC = () => {
  const message = ref('Hello World!');
  const reverseMessage = () => {
    message.value = message.value.split('').reverse().join('');
  };
  const notify = () => {
    alert('navigation was prevented.');
  };
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h1 className="text-2xl font-semibold">{message.value}</h1>
        <button className="btn btn-primary" onClick={reverseMessage}>
          Reverse Message
        </button>
        <button className="btn btn-outline" onClick={() => (message.value += '!')}>
          Append "!"
        </button>
        <a
          className="link link-primary"
          href="https://google.com"
          onClick={(e: any) => {
            e.preventDefault()
            notify()
          }}
        >
          A link with e.preventDefault()
        </a>
      </div>
    </div>
  );
};

export default HandlingInput;`}
              />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h1 className="text-2xl font-semibold">{message.value}</h1>
              <button className="btn btn-primary" onClick={reverseMessage}>
                Reverse Message
              </button>
              <button className="btn btn-outline" onClick={() => (message.value += '!')}>
                Append "!"
              </button>
              <a
                className="link link-primary"
                href="https://google.com"
                onClick={(e: any) => {
                  e.preventDefault()
                  notify()
                }}
              >
                A link with e.preventDefault()
              </a>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default HandlingInput
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup } from 'rue-js';
import SidebarPlayground from '../site/SidebarPlayground';
import Code from '../site/components/Code';
const HandlingInput: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const message = _$vaporWithHookId("ref:1:0", ()=>ref('Hello World!'));
        let yes = _$vaporWithHookId("ref:1:1", ()=>ref(message.value));
        const reverseMessage = ()=>{
            message.value = message.value.split('').reverse().join('');
        };
        let hello = _$vaporWithHookId("ref:1:2", ()=>ref('Hello World!'));
        let world = _$vaporWithHookId("ref:1:3", ()=>ref(message.value));
        const notify = ()=>{
            alert('navigation was prevented.');
        };
        var goods = _$vaporWithHookId("ref:1:4", ()=>ref([
                {
                    name: '商品1',
                    price: 100
                },
                {
                    name: '商品2',
                    price: 200
                }
            ]));
        const activeTab = _$vaporWithHookId("ref:1:5", ()=>ref<'preview' | 'code'>('preview'));
        return {
            message: message,
            reverseMessage: reverseMessage,
            notify: notify,
            activeTab: activeTab,
            yes: yes,
            hello: hello,
            world: world,
            goods: goods
        };
    }));
    const { message: message, reverseMessage: reverseMessage, notify: notify, activeTab: activeTab } = _$useSetup;
    let { yes: yes, hello: hello, world: world, goods: goods } = _$useSetup;
    return (<SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">处理输入（移植自 Vue）</h1>
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
        {activeTab.value === 'code' && (<div className="card bg-base-100 shadow overflow-auto h-[260px] md:h-[560px]">
            <div className="card-body p-0">
              <Code className="h-full" lang="tsx" code={`import { type FC, ref } from 'rue-js';

const HandlingInput: FC = () => {
  const message = ref('Hello World!');
  const reverseMessage = () => {
    message.value = message.value.split('').reverse().join('');
  };
  const notify = () => {
    alert('navigation was prevented.');
  };
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h1 className="text-2xl font-semibold">{message.value}</h1>
        <button className="btn btn-primary" onClick={reverseMessage}>
          Reverse Message
        </button>
        <button className="btn btn-outline" onClick={() => (message.value += '!')}>
          Append "!"
        </button>
        <a
          className="link link-primary"
          href="https://google.com"
          onClick={(e: any) => {
            e.preventDefault()
            notify()
          }}
        >
          A link with e.preventDefault()
        </a>
      </div>
    </div>
  );
};

export default HandlingInput;`}/>
            </div>
          </div>)}

        {activeTab.value === 'preview' && (<div className="card bg-base-100 shadow">
            <div className="card-body">
              <h1 className="text-2xl font-semibold">{message.value}</h1>
              <button className="btn btn-primary" onClick={reverseMessage}>
                Reverse Message
              </button>
              <button className="btn btn-outline" onClick={()=>(message.value += '!')}>
                Append "!"
              </button>
              <a className="link link-primary" href="https://google.com" onClick={(e: any)=>{
        e.preventDefault();
        notify();
    }}>
                A link with e.preventDefault()
              </a>
            </div>
          </div>)}
      </div>
    </SidebarPlayground>);
};
export default HandlingInput;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec35.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
