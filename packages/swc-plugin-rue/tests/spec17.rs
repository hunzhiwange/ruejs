//! SWC 插件转换行为测试（spec17）
//!
//! 覆盖：TransitionGroup 列表过渡示例的第三种变体。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec17() {
    let src = r##"
import { type FC, TransitionGroup, ref } from '@rue-js/rue'

const ListTransitionExample: FC = () => {
  const items = ref<number[]>([1, 2, 3, 4, 5])
  const nextId = ref(items.value.length + 1)

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

  return (
    <>
      <h3 className="text-xl font-semibold mb-3">带过渡动效的列表（移植自 Vue）</h3>
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
      </div></>
  )
}

export default ListTransitionExample
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, TransitionGroup, ref, _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$addEventListener, _$setClassName } from '@rue-js/rue';
const ListTransitionExample: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const items = _$vaporWithHookId("ref:1:0", ()=>ref<number[]>([
                    1,
                    2,
                    3,
                    4,
                    5
                ]));
            const nextId = _$vaporWithHookId("ref:1:1", ()=>ref(items.value.length + 1));
            function insert() {
                const i = Math.round(Math.random() * items.value.length);
                items.value.splice(i, 0, nextId.value++);
            }
            function reset() {
                items.value = [
                    1,
                    2,
                    3,
                    4,
                    5
                ];
                nextId.value = items.value.length + 1;
            }
            function shuffle() {
                const arr = items.value.slice();
                let currentIndex = arr.length;
                while(currentIndex !== 0){
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
            return {
                items: items,
                nextId: nextId,
                insert: insert,
                reset: reset,
                shuffle: shuffle,
                remove: remove
            };
        }));
    const { items: items, nextId: nextId, insert: insert, reset: reset, shuffle: shuffle, remove: remove } = _$useSetup;
    return vapor(()=>{
        const _root = _$createDocumentFragment();
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold mb-3");
        _$appendChild(_el1, _$createTextNode("带过渡动效的列表（移植自 Vue）"));
        const _el2 = _$createElement("style");
        _$appendChild(_root, _el2);
        watchEffect(()=>{
            _$settextContent(_el2, `
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
      `);
        });
        const _el3 = _$createElement("div");
        _$appendChild(_root, _el3);
        _$setClassName(_el3, "mt-4 grid md:grid-cols-1 gap-6 items-start");
        const _el4 = _$createElement("div");
        _$appendChild(_el3, _el4);
        _$setClassName(_el4, "flex gap-3");
        const _el5 = _$createElement("button");
        _$appendChild(_el4, _el5);
        _$setClassName(_el5, "btn btn-primary");
        _$addEventListener(_el5, "click", (insert));
        _$appendChild(_el5, _$createTextNode("Insert at random index"));
        const _el6 = _$createElement("button");
        _$appendChild(_el4, _el6);
        _$setClassName(_el6, "btn");
        _$addEventListener(_el6, "click", (reset));
        _$appendChild(_el6, _$createTextNode("Reset"));
        const _el7 = _$createElement("button");
        _$appendChild(_el4, _el7);
        _$setClassName(_el7, "btn");
        _$addEventListener(_el7, "click", (shuffle));
        _$appendChild(_el7, _$createTextNode("Shuffle"));
        const _el8 = _$createElement("ul");
        _$appendChild(_el3, _el8);
        _$setClassName(_el8, "container space-y-3 rounded-xl border border-base-200 bg-base-100 p-3");
        const _list1 = _$createComment("rue:component:start");
        const _list2 = _$createComment("rue:component:end");
        _$appendChild(_el8, _list1);
        _$appendChild(_el8, _list2);
        watchEffect(()=>{
            const __slot3 = <TransitionGroup name="fade" keepJSX>
            {items.value.map((item)=>(<li className="item px-3 py-2 rounded-md border border-base-200 bg-base-100 shadow-sm" key={item}>
                <span className="text-base-content">{item}</span>
                <button className="btn btn-sm" onClick={()=>remove(item)}>
                  x
                </button>
              </li>))}
          </TransitionGroup>;
            renderBetween(__slot3, _el8, _list1, _list2);
        });
        return {
            vaporElement: _root
        };
    });
};
export default ListTransitionExample;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec17.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
