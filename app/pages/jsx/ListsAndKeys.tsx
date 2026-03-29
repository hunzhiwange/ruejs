import { type FC, ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

const list = ['Apple', 'Banana', 'Cherry']

const ListsAndKeys: FC = () => {
  const activeTab = ref<'preview' | 'code'>('code')
  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">列表渲染与 key</h1>
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
          <div className="card bg-base-100 shadow overflow-auto">
            <div className="card-body p-0">
              <Code
                className="h-full"
                lang="tsx"
                code={`import { type FC } from 'rue-js';

const list = ['Apple', 'Banana', 'Cherry'];

const ListsAndKeys: FC = () => (
  <ul className="list-disc pl-6">
    {list.map((item, idx) => <li key={item}>{idx + 1}. {item}</li>)}
  </ul>
);

export default ListsAndKeys;`}
              />
            </div>
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <ul className="list-disc pl-6">
                {list.map((item, idx) => (
                  <li key={item}>
                    {idx + 1}. {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default ListsAndKeys
