//! 列表渲染与 key 转换测试（map + key）
//!
//! 覆盖：编译列表行、键控协调、持久 elements 复用与响应式更新。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_lists_and_keys() {
    let src = r##"
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const list = ['Apple', 'Banana', 'Cherry'];

const ListsAndKeys: FC = () => (
  <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
    <h3 className="text-xl font-semibold">列表渲染与 key</h3>
    <ul className="list-disc pl-6">
      {list.map((item, idx) => <li key={item}>{idx + 1}. {item}</li>)}
    </ul>
    <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
  </div>
);

export default ListsAndKeys;
"##;
    let (program, cm) = utils::parse(src, "ListsAndKeys.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    // 期望输出要点对照：
    // - 列表锚点：rue:list:start/end 注释创建与插入
    // - 持久 Map：_mapX_elements 保存 key→片段 映射
    // - _$compiledKeyedList：传入 items/getKey/elements/parent/before/start/renderItem
    // - renderItem：通过兼容 anchor 渲染，同时保留 index watcher
    // - 更新：watch 中对 elements 引用进行复用更新
    let _expected_fragment = r##"
import { _$compiledRoot, renderAnchor, _$createElement, _$template, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, onScopeDispose, watchEffect, _$compiledKeyedList, _$createTextWrapper, _$setAttribute, _$setClassName } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const _$getTemplate1 = _$template('<div class="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm"><h3 class="text-xl font-semibold">列表渲染与 key</h3><ul class="list-disc pl-6"><!--rue:text-hole:0--></ul><!--rue:opaque-hole:1--></div>');
const list = [
    'Apple',
    'Banana',
    'Cherry'
];
const ListsAndKeys: FC = ()=>_$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[1].childNodes[0];
        const _el2 = _el1.parentNode;
        const _el3 = _root.childNodes[2];
        const _el4 = _el3.parentNode;
        const _list1 = _$createComment("rue:list:start");
        _el2.insertBefore(_list1, _el1);
        let _map1_elements = new Map;
        const _map1_state = {
            elements: _map1_elements
        };
        watchEffect(()=>{
            const _map1_current = list || [];
            const _map1_newElements = _$compiledKeyedList({
                items: _map1_current,
                getKey: (item, idx)=>item,
                state: _map1_state,
                elements: _map1_elements,
                parent: _el2,
                before: _el1,
                singleRoot: true,
                start: _list1,
                renderItem: (item, parent, start, end, idx)=>{
                    const __slot = _$compiledRoot(()=>{
                        const _root = _$createDocumentFragment();
                        const _el5 = _$createElement("li", _root);
                        _$appendChild(_root, _el5);
                        const _el6 = _$createTextWrapper(_el5);
                        _$appendChild(_el5, _el6);
                        watchEffect(()=>{
                            _$settextContent(_el6, idx + 1);
                        });
                        _$appendChild(_el5, _$createTextNode(". "));
                        const _el7 = _$createTextWrapper(_el5);
                        _$appendChild(_el5, _el7);
                        watchEffect(()=>{
                            _$settextContent(_el7, item);
                        });
                        return _root;
                    });
                    renderAnchor(__slot, parent, start);
                }
            });
            _map1_elements = _map1_newElements;
        });
        const _el8 = _$createElement("a", _el4);
        _$appendChild(_el4, _el8);
        _el4.insertBefore(_el8, _el3);
        watchEffect(()=>{
            _$setAttribute(_el8, "href", String(RouterLink.__rueHref("/jsx")));
        });
        const _el8_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/jsx", false)($event);
        _el8.addEventListener("click", _el8_event_1);
        onScopeDispose(()=>_el8.removeEventListener("click", _el8_event_1));
        const _el8_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el8.addEventListener("pointerenter", _el8_event_2);
        onScopeDispose(()=>_el8.removeEventListener("pointerenter", _el8_event_2));
        const _el8_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el8.addEventListener("focus", _el8_event_3);
        onScopeDispose(()=>_el8.removeEventListener("focus", _el8_event_3));
        const _el8_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el8.addEventListener("pointerdown", _el8_event_4);
        onScopeDispose(()=>_el8.removeEventListener("pointerdown", _el8_event_4));
        const _el8_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el8.addEventListener("touchstart", _el8_event_5);
        onScopeDispose(()=>_el8.removeEventListener("touchstart", _el8_event_5));
        _$setClassName(_el8, "text-blue-600 hover:underline");
        _$appendChild(_el8, _$createTextNode("返回目录"));
        return _root;
    });
export default ListsAndKeys;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/lists_and_keys.out.js", utils::strip_marker(&out)).ok();
    let normalized = utils::normalize(&utils::strip_marker(&out));
    assert!(normalized.contains("_$compiledRoot"), "{normalized}");
    assert!(normalized.contains("_$reconcileKeyed"), "{normalized}");
    assert!(normalized.contains("(item, idx)=>item"), "{normalized}");
    assert!(normalized.contains("_$mountCompiledKeyedRow"), "{normalized}");
    assert!(normalized.contains("_$compiledText"), "{normalized}");
    assert!(normalized.contains("_$compiledComponent(RouterLink"), "{normalized}");
    assert!(normalized.contains("_$mountCompiledSlotFactory"), "{normalized}");
    assert!(!normalized.contains("_$compiledKeyedList"), "{normalized}");
    assert!(!normalized.contains("vapor("), "{normalized}");
}
