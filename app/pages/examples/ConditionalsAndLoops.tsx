import { type FC, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

const ConditionalsAndLoops: FC = () => {
  console.log('hello1')
  const show = ref(true)
  const list = ref<number[]>([1, 2, 3])
  console.log('hello2')
  const toggleShow = () => {
    show.value = !show.value
  }
  console.log('i am here1')
  const pushNumber = () => {
    list.value = [...list.value, list.value.length + 1]
  }
  const popNumber = () => {
    list.value = list.value.slice(0, -1)
  }
  const reverseList = () => {
    list.value = [...list.value].reverse()
  }

  const activeTab = ref<'preview' | 'code'>('preview')
  console.log('i am here2')

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">条件与循环（移植自 Vue）</h1>
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
          <div className="card bg-base-100 shadow overflow-auto h-[360px] md:h-[560px]">
            <div className="card-body p-0">
              <Code
                className="h-full"
                lang="tsx"
                code={`import { type FC, ref } from '@rue-js/rue';

const ConditionalsAndLoops: FC = () => {
  const show = ref(true);
  const list = ref<number[]>([1, 2, 3]);

  const toggleShow = () => {
    show.value = !show.value;
  };
  const pushNumber = () => {
    list.value = [...list.value, list.value.length + 1];
  };
  const popNumber = () => {
    list.value = list.value.slice(0, -1);
  };
  const reverseList = () => {
    list.value = [...list.value].reverse();
  };

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-4">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={toggleShow}>
            Toggle List
          </button>
          <button className="btn btn-primary" onClick={pushNumber}>
            Push Number
          </button>
          <button className="btn btn-primary" onClick={popNumber}>
            Pop Number
          </button>
          <button className="btn btn-primary" onClick={reverseList}>
            Reverse List
          </button>
        </div>

        {show.value && list.value.length ? (
          <ul className="list-disc pl-6 space-y-1">
            {list.value.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : list.value.length ? (
          <p className="text-gray-700">List is not empty, but hidden.</p>
        ) : (
          <p className="text-gray-700">List is empty.</p>
        )}
      </div>
    </div>
  );
};

export default ConditionalsAndLoops;`}
              />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4">
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={toggleShow}>
                  Toggle List
                </button>
                <button className="btn btn-primary" onClick={pushNumber}>
                  Push Number
                </button>
                <button className="btn btn-primary" onClick={popNumber}>
                  Pop Number
                </button>
                <button className="btn btn-primary" onClick={reverseList}>
                  Reverse List
                </button>
              </div>

              {show.value && list.value.length ? (
                <ul className="list-disc pl-6 space-y-1">
                  {list.value.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : list.value.length ? (
                <p className="text-gray-700">List is not empty, but hidden.</p>
              ) : (
                <p className="text-gray-700">List is empty.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default ConditionalsAndLoops
