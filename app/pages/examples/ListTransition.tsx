import { type FC, TransitionGroup, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

const ListTransitionExample: FC = () => {
  const items = ref<number[]>([1, 2, 3, 4, 5])
  const nextId = ref(items.value.length + 1)
  const activeTab = ref<'preview' | 'code'>('preview')

  function insert() {
    const i = Math.round(Math.random() * items.value.length)
    items.value.splice(i, 0, nextId.value++)
  }

  function reset() {
    items.value = [1, 2, 3, 4, 5]
    nextId.value = items.value.length + 1
  }

  function shuffle() {
    // Fisher–Yates shuffle to avoid external deps
    const arr = items.value.slice()
    let currentIndex = arr.length
    while (currentIndex !== 0) {
      const randomIdx = Math.floor(Math.random() * currentIndex)
      currentIndex--
      const tmp = arr[currentIndex]
      arr[currentIndex] = arr[randomIdx]
      arr[randomIdx] = tmp
    }
    items.value = arr
  }

  function remove(item: number) {
    const i = items.value.indexOf(item)
    if (i > -1) items.value.splice(i, 1)
  }

  const code = `import { type FC, ref, TransitionGroup } from '@rue-js/rue';

const ListTransitionExample: FC = () => {
  const items = ref<number[]>([1, 2, 3, 4, 5]);
  const nextId = ref(items.value.length + 1);

  function insert() {
    const i = Math.round(Math.random() * items.value.length);
    items.value.splice(i, 0, nextId.value++);
  }

  function reset() {
    items.value = [1, 2, 3, 4, 5];
    nextId.value = items.value.length + 1;
  }

  function shuffle() {
    // Fisher–Yates shuffle to avoid external deps
    const arr = items.value.slice();
    let currentIndex = arr.length;
    while (currentIndex !== 0) {
      const randomIdx = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      const tmp = arr[currentIndex];
      arr[currentIndex] = arr[randomIdx];
      arr[randomIdx] = tmp;
    }
    items.value = arr;
  }

  function remove(item: number) {
    const i = items.value.indexOf(item);
    if (i > -1) items.value.splice(i, 1);
  }

  return (
    <>
        <style>{\`
.container {
  position: relative;
  padding: 0;
  margin: 0;
  list-style-type: none;
}

/* Items visuals are mainly controlled by Tailwind utility classes */
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 1. 声明过渡效果 */
.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.35s cubic-bezier(0.55, 0, 0.1, 1);
  will-change: transform, opacity;
}

/* 2. 声明进入和离开的状态 */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.98) translate(24px, 0);
}

/* 3. 离开项移出布局流，便于计算移动动画 */
.fade-leave-active {
  position: absolute;
  pointer-events: none;
}
      \`}</style>
      <div className="card bg-base-100 shadow">
        <div className="card-body grid gap-4">
          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={insert}>
              Insert at random index
            </button>
            <button className="btn" onClick={reset}>
              Reset
            </button>
            <button className="btn" onClick={shuffle}>
              Shuffle
            </button>
          </div>

          <ul className="container space-y-3 rounded-xl border border-base-200 bg-base-100 p-3">
            <TransitionGroup name="fade" keepJSX>
              {items.value.map(item => (
                <li
                  className="item px-3 py-2 rounded-md border border-base-200 bg-base-100 shadow-sm"
                  key={item}
                >
                  <span className="text-base-content">{item}</span>
                  <button className="btn btn-sm" onClick={() => remove(item)}>
                    x
                  </button>
                </li>
              ))}
            </TransitionGroup>
          </ul>
        </div>
      </div>
    </>
  );
};

export default ListTransitionExample;`

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">带过渡动效的列表（移植自 Vue）</h1>

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

      <style>{`
.container {
  position: relative;
  padding: 0;
  margin: 0;
  list-style-type: none;
}

/* Items visuals are mainly controlled by Tailwind utility classes */
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 1. 声明过渡效果 */
.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.35s cubic-bezier(0.55, 0, 0.1, 1);
  will-change: transform, opacity;
}

/* 2. 声明进入和离开的状态 */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.98) translate(24px, 0);
}

/* 3. 离开项移出布局流，便于计算移动动画 */
.fade-leave-active {
  position: absolute;
  pointer-events: none;
}
      `}</style>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'code' && (
          <div className="card bg-base-100 shadow overflow-auto h-[360px] md:h-[560px]">
            <Code className="h-full" lang="tsx" code={code} />
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4">
              <div className="flex gap-3">
                <button className="btn btn-primary" onClick={insert}>
                  Insert at random index
                </button>
                <button className="btn" onClick={reset}>
                  Reset
                </button>
                <button className="btn" onClick={shuffle}>
                  Shuffle
                </button>
              </div>

              <ul className="container space-y-3 rounded-xl border border-base-200 bg-base-100 p-3">
                <TransitionGroup name="fade" keepJSX>
                  {items.value.map(item => (
                    <li
                      className="item px-3 py-2 rounded-md border border-base-200 bg-base-100 shadow-sm"
                      key={item}
                    >
                      <span className="text-base-content">{item}</span>
                      <button className="btn btn-sm" onClick={() => remove(item)}>
                        x
                      </button>
                    </li>
                  ))}
                </TransitionGroup>
              </ul>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default ListTransitionExample
