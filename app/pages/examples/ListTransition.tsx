import { type FC, TransitionGroup, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

const INITIAL_IDS = [1, 2, 3, 4, 5]
const TRANSITION_MS = 350

const listStyles = `
.list-shell {
  position: relative;
}

.list-shell ul {
  position: relative;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.75rem;
}

.list-shell li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  transform-origin: center left;
}

.list-enter-active,
.list-leave-active {
  transition:
    opacity ${TRANSITION_MS}ms cubic-bezier(0.55, 0, 0.1, 1),
    transform ${TRANSITION_MS}ms cubic-bezier(0.55, 0, 0.1, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.list-leave-active {
  position: absolute;
  inset-inline: 0;
}

.list-move {
  transition: transform ${TRANSITION_MS}ms cubic-bezier(0.55, 0, 0.1, 1);
}
`

const demoCode = `import { type FC, TransitionGroup, ref } from '@rue-js/rue';

const INITIAL_IDS = [1, 2, 3, 4, 5];

const ListTransitionExample: FC = () => {
  const items = ref<number[]>([...INITIAL_IDS]);
  const nextId = ref(INITIAL_IDS.length + 1);

  const insert = () => {
    const nextItems = items.value.slice();
    const index = Math.round(Math.random() * nextItems.length);
    nextItems.splice(index, 0, nextId.value);
    items.value = nextItems;
    nextId.value += 1;
  };

  const remove = (itemId: number) => {
    items.value = items.value.filter((item) => item !== itemId);
  };

  const shuffle = () => {
    const nextItems = items.value.slice();
    let currentIndex = nextItems.length;
    while (currentIndex !== 0) {
      const randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      const temp = nextItems[currentIndex];
      nextItems[currentIndex] = nextItems[randomIndex];
      nextItems[randomIndex] = temp;
    }
    items.value = nextItems;
  };

  const reset = () => {
    items.value = [...INITIAL_IDS];
    nextId.value = INITIAL_IDS.length + 1;
  };

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-4">
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={insert}>Insert at random index</button>
          <button className="btn" onClick={reset}>Reset</button>
          <button className="btn" onClick={shuffle}>Shuffle</button>
        </div>

        <div className="list-shell rounded-xl border border-base-200 bg-base-100 p-3">
          <TransitionGroup tag="ul" name="list" duration={350}>
            {items.value.map((item) => (
              <li key={item} className="rounded-md border border-base-200 bg-base-100 px-3 py-2 shadow-sm">
                <span className="text-base-content">{item}</span>
                <button className="btn btn-sm" onClick={() => remove(item)}>x</button>
              </li>
            ))}
          </TransitionGroup>
        </div>
      </div>
    </div>
  );
};

export default ListTransitionExample;`

const ListTransitionExample: FC = () => {
  const items = ref<number[]>([...INITIAL_IDS])
  const nextId = ref(INITIAL_IDS.length + 1)
  const activeTab = ref<'preview' | 'code'>('preview')

  const insert = () => {
    const nextItems = items.value.slice()
    const index = Math.round(Math.random() * nextItems.length)
    nextItems.splice(index, 0, nextId.value)
    items.value = nextItems
    nextId.value += 1
  }

  const remove = (itemId: number) => {
    items.value = items.value.filter(item => item !== itemId)
  }

  const shuffle = () => {
    const nextItems = items.value.slice()
    let currentIndex = nextItems.length
    while (currentIndex !== 0) {
      const randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1
      const temp = nextItems[currentIndex]
      nextItems[currentIndex] = nextItems[randomIndex]
      nextItems[randomIndex] = temp
    }
    items.value = nextItems
  }

  const reset = () => {
    items.value = [...INITIAL_IDS]
    nextId.value = INITIAL_IDS.length + 1
  }

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

      <style>{listStyles}</style>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'code' && (
          <div className="card bg-base-100 shadow overflow-auto h-[360px] md:h-[560px]">
            <Code className="h-full" lang="tsx" code={demoCode} />
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

              <div className="list-shell rounded-xl border border-base-200 bg-base-100 p-3">
                <TransitionGroup tag="ul" name="list" duration={TRANSITION_MS}>
                  {items.value.map(item => (
                    <li
                      key={item}
                      className="rounded-md border border-base-200 bg-base-100 px-3 py-2 shadow-sm"
                    >
                      <span className="text-base-content">{item}</span>
                      <button className="btn btn-sm" onClick={() => remove(item)}>
                        x
                      </button>
                    </li>
                  ))}
                </TransitionGroup>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default ListTransitionExample
