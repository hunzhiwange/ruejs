//! 列表渲染与 key 转换测试（map + key）
//!
//! 覆盖：列表锚点、键控渲染（_$vaporKeyedList）、持久 elements 复用与 watch 更新。
use swc_plugin_rue::apply;
mod utils;

#[test]
fn transforms_lists_and_keys() {
    let src = r##"
import { type FC } from 'rue-js';
import { RouterLink } from 'rue-router';

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
    // - _$vaporKeyedList：传入 items/getKey/elements/parent/before/start/renderItem
    // - renderItem：使用 renderBetween(vapor(()=>{...}), parent, start, end) 渲染每项
    // - 更新：watch 中对 elements 引用进行复用更新
    let expected_fragment = r##"
import { type FC, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$vaporKeyedList, _$createTextWrapper, _$setAttribute, _$setClassName } from 'rue-js';
import { RouterLink } from 'rue-router';
const list = [
    'Apple',
    'Banana',
    'Cherry'
];
const ListsAndKeys: FC = ()=>vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold");
        _$appendChild(_el1, _$createTextNode("列表渲染与 key"));
        const _el2 = _$createElement("ul");
        _$appendChild(_root, _el2);
        _$setClassName(_el2, "list-disc pl-6");
        const _list1 = _$createComment("rue:list:start");
        const _list2 = _$createComment("rue:list:end");
        _$appendChild(_el2, _list1);
        _$appendChild(_el2, _list2);
        let _map1_elements = new Map;
        watchEffect(()=>{
            const _map1_current = list || [];
            const _map1_newElements = _$vaporKeyedList({
                items: _map1_current,
                getKey: (item, idx)=>item,
                elements: _map1_elements,
                parent: _el2,
                before: _list2,
                start: _list1,
                renderItem: (item, parent, start, end, idx)=>{
                    const __slot = vapor(()=>{
                        const _root = _$createDocumentFragment();
                        const _el3 = _$createElement("li");
                        _$appendChild(_root, _el3);
                        watchEffect(()=>{
                            _$setAttribute(_el3, "key", String((item)));
                        });
                        const _el4 = _$createTextWrapper(_el3);
                        _$appendChild(_el3, _el4);
                        watchEffect(()=>{
                            _$settextContent(_el4, idx + 1);
                        });
                        _$appendChild(_el3, _$createTextNode(". "));
                        const _el5 = _$createTextWrapper(_el3);
                        _$appendChild(_el3, _el5);
                        watchEffect(()=>{
                            _$settextContent(_el5, item);
                        });
                        return {
                            vaporElement: _root
                        };
                    });
                    renderBetween(__slot, parent, start, end);
                }
            });
            _map1_elements = _map1_newElements;
        });
        const _list3 = _$createComment("rue:component:start");
        const _list4 = _$createComment("rue:component:end");
        _$appendChild(_root, _list3);
        _$appendChild(_root, _list4);
        const __child1 = "返回目录";
        const __slot5 = <RouterLink to="/jsx" className="text-blue-600 hover:underline" children={__child1}/>;
        renderBetween(__slot5, _root, _list3, _list4);
        return {
            vaporElement: _root
        };
    });
export default ListsAndKeys;
"##;

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/lists_and_keys.out.js", utils::strip_marker(&out)).ok();
    assert_eq!(
        utils::normalize(&utils::strip_marker(&out)),
        utils::normalize(&utils::strip_marker(expected_fragment))
    );
}
