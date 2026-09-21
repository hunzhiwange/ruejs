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
          <TransitionGroup name="fade">
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

    let _expected_fragment = r##"
import { ref, _$compiledWithHookId, useSetup, TransitionGroup, _$compiledRoot, _$createComponent, renderAnchor, _$createElement, _$template, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, onScopeDispose, untrack, watchEffect, _$createTextWrapper, _$compiledWithKey, _$setClassName } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const _$getTemplate1 = _$template('<h3 class="text-xl font-semibold mb-3">带过渡动效的列表（移植自 Vue）</h3>');
const _$getTemplate2 = _$template('<div class="mt-4 grid md:grid-cols-1 gap-6 items-start"><div class="flex gap-3"><button class="btn btn-primary">Insert at random index</button><button class="btn">Reset</button><button class="btn">Shuffle</button></div><ul class="container space-y-3 rounded-xl border border-base-200 bg-base-100 p-3"><!--rue:opaque-hole:0--></ul></div>');
const ListTransitionExample: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const items = ref<number[]>([
                    1,
                    2,
                    3,
                    4,
                    5
            ]);
            const nextId = ref(items.value.length + 1);
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
    return _$compiledRoot((__rue_parent_context)=>{
        const _root = _$createDocumentFragment();
        _root.appendChild(_$getTemplate1().content.cloneNode(true));
        const _el2 = _$createElement("style", _root);
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
        const _el3_fragment = _$getTemplate2().content.cloneNode(true);
        const _el3 = _el3_fragment.firstChild;
        const _el4 = _el3.childNodes[0].childNodes[0];
        const _el5 = _el3.childNodes[0].childNodes[1];
        const _el6 = _el3.childNodes[0].childNodes[2];
        const _el7 = _el3.childNodes[1].childNodes[0];
        const _el8 = _el7.parentNode;
        _root.appendChild(_el3_fragment);
        _$setClassName(_el4, "btn btn-primary");
        const _el4_event_1 = ($event)=>insert($event);
        _el4.addEventListener("click", _el4_event_1);
        onScopeDispose(()=>_el4.removeEventListener("click", _el4_event_1));
        _$setClassName(_el5, "btn");
        const _el5_event_1 = ($event)=>reset($event);
        _el5.addEventListener("click", _el5_event_1);
        onScopeDispose(()=>_el5.removeEventListener("click", _el5_event_1));
        _$setClassName(_el6, "btn");
        const _el6_event_1 = ($event)=>shuffle($event);
        _el6.addEventListener("click", _el6_event_1);
        onScopeDispose(()=>_el6.removeEventListener("click", _el6_event_1));
        watchEffect(()=>{
            const __slot1 = _$createComponent(TransitionGroup, {
                name: "fade",
                children: items.value.map((item)=>_$compiledWithKey(_$compiledRoot(()=>{
                        const _root = _$createDocumentFragment();
                        const _el9 = _$createElement("li", _root);
                        _$appendChild(_root, _el9);
                        _$setClassName(_el9, "item px-3 py-2 rounded-md border border-base-200 bg-base-100 shadow-sm");
                        const _el10 = _$createElement("span", _el9);
                        _$appendChild(_el9, _el10);
                        _$setClassName(_el10, "text-base-content");
                        const _el11 = _$createTextWrapper(_el10);
                        _$appendChild(_el10, _el11);
                        watchEffect(()=>{
                            _$settextContent(_el11, item);
                        });
                        const _el12 = _$createElement("button", _el9);
                        _$appendChild(_el9, _el12);
                        _$setClassName(_el12, "btn btn-sm");
                        const _el12_event_1 = ($event)=>()=>remove(item)($event);
                        _el12.addEventListener("click", _el12_event_1);
                        onScopeDispose(()=>_el12.removeEventListener("click", _el12_event_1));
                        _$appendChild(_el12, _$createTextNode("x"));
                        return _root;
                    }, true), item))
            });
            untrack(()=>renderAnchor(__slot1, _el8, _el7));
        });
        return _root;
    });
};
export default ListTransitionExample;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec17.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$compiledSetup(\"useSetup:0:0\""), "{normalized}");
    assert!(normalized.contains("@rue-js/rue/internal/transitiongroup"), "{normalized}");
    assert!(normalized.contains("_$transitionGroup(()=>({"), "{normalized}");
    assert!(normalized.contains("_$reconcileKeyed("), "{normalized}");
    assert!(normalized.contains("_$mountCompiledKeyedRow("), "{normalized}");
    assert_eq!(
        normalized.matches(".addEventListener(").count(),
        normalized.matches(".removeEventListener(").count()
    );
    assert!(!normalized.contains("watchEffect"), "{normalized}");
}
