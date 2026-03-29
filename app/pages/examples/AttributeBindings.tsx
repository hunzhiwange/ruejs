import { type FC, ref } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

const AttributeBindings: FC = () => {
  const message = ref('Hello World!')
  const isRed = ref(true)
  const color = ref<'green' | 'blue'>('green')

  const toggleRed = () => {
    isRed.value = !isRed.value
  }

  const toggleColor = () => {
    color.value = color.value === 'green' ? 'blue' : 'green'
  }

  const activeTab = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">Attribute 绑定（移植自 Vue）</h1>
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
          <div className="card bg-base-100 shadow overflow-auto h-[320px] md:h-[620px]">
            <div className="card-body p-0">
              <Code
                className="h-full"
                lang="tsx"
                code={`import { type FC, ref } from 'rue-js';

const AttributeBindings: FC = () => {
  const message = ref('Hello World!');
  const isRed = ref(true);
  const color = ref<'green' | 'blue'>('green');

  const toggleRed = () => {
    isRed.value = !isRed.value;
  };

  const toggleColor = () => {
    color.value = color.value === 'green' ? 'blue' : 'green';
  };

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-4">
        <p>
          <span title={message.value}>
            Hover your mouse over me for a few seconds to see my dynamically bound title!
          </span>
        </p>

        <p
          className={\`cursor-pointer \${isRed.value ? 'text-red-600' : ''}\`}
          onClick={toggleRed}
        >
          This should be red... but click me to toggle it.
        </p>

        <p className="cursor-pointer" style={{ color: color.value }} onClick={toggleColor}>
          This should be green, and should toggle between green and blue on click.
        </p>
      </div>
    </div>
  );
};

export default AttributeBindings;`}
              />
            </div>
          </div>
        )}
        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4">
              <p>
                <span title={message.value}>
                  Hover your mouse over me for a few seconds to see my dynamically bound title!
                </span>
              </p>

              <p
                className={`cursor-pointer ${isRed.value ? 'text-red-600' : ''}`}
                onClick={toggleRed}
              >
                This should be red... but click me to toggle it.
              </p>

              <p className="cursor-pointer" style={{ color: color.value }} onClick={toggleColor}>
                This should be green, and should toggle between green and blue on click.
              </p>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default AttributeBindings
