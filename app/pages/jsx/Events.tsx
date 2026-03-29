import { type FC, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

const Events: FC = () => {
  const countA = ref(0)
  const countB = ref(0)
  const activeTab = ref<'preview' | 'code'>('code')

  const handleClickA = () => {
    countA.value += 1
    console.info('Button A clicked', countA.value)
  }

  const handleClickB = () => {
    countB.value += 1
    console.info('Button B clicked', countB.value)
  }

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">事件处理</h1>

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
          <div className="card bg-base-100 shadow overflow-auto h-[260px] md:h-[640px]">
            <div className="card-body p-0">
              <Code
                className="h-full"
                lang="tsx"
                code={`import { type FC, ref } from '@rue-js/rue';

const Events: FC = () => {
  const countA = ref(0);
  const countB = ref(0);

  const handleClickA = () => {
    countA.value += 1;
    console.log('Button A clicked', countA.value);
  };

  const handleClickB = () => {
    countB.value += 1;
    console.log('Button B clicked', countB.value);
  };

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-6">
        <div className="flex items-center gap-3">
          <button className="btn btn-primary btn-sm" onClick={handleClickA}>
            点击 A
          </button>
          <span>A 次数：{countA.value}</span>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-success btn-sm" onClick={handleClickB}>
            点击 B
          </button>
          <span>B 次数：{countB.value}</span>
        </div>
      </div>
    </div>
  );
};

export default Events;`}
              />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-6">
              <div className="flex items-center gap-3">
                <button className="btn btn-primary btn-sm" onClick={handleClickA}>
                  点击 A
                </button>
                <span>A 次数：{countA.value}</span>
              </div>

              <div className="flex items-center gap-3">
                <button className="btn btn-success btn-sm" onClick={handleClickB}>
                  点击 B
                </button>
                <span>B 次数：{countB.value}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default Events
