//! 事件处理与状态更新转换测试
//!
//! 覆盖：onClick 等事件绑定、useState 的更新闭包、文本回显与 join 的生成。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_events() {
    let src = r##"
import { type FC, useState } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';

const DEC_FORMAT = (n: number) => String(n);
const HEX_FORMAT = (n: number) => '0x' + n.toString(16);

const Events: FC = () => {
  const [count, setCount] = useState(0);
  const [list, setList] = useState<string[]>(['A']);
  const [user, setUser] = useState<{ name: string; age: number }>({ name: 'Alice', age: 20 });
  const [format, setFormat] = useState<(n: number) => string>(() => DEC_FORMAT);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm">
      <h3 className="text-xl font-semibold">事件处理</h3>
      <div>count: {count}</div>
      <button
        className="px-3 py-2 rounded-md bg-blue-600 text-white"
        onClick={() => setCount(c => c + 1)}
      >
        +1
      </button>

      <h3 className="text-xl font-semibold">数据状态（数组）</h3>
      <div>list: {list.join(', ')}</div>
      <div className="space-x-2">
        <button
          className="px-3 py-2 rounded-md bg-gray-100 border"
          onClick={() => setList(xs => [...xs, `Item ${xs.length + 1}`])}
        >
          添加项
        </button>
        <button
          className="px-3 py-2 rounded-md bg-gray-100 border"
          onClick={() => setList(xs => xs.slice(0, -1))}
          disabled={!list.length}
        >
          移除最后一个
        </button>
        <button
          className="px-3 py-2 rounded-md bg-gray-100 border"
          onClick={() => setList(['A'])}
        >
          重置
        </button>
      </div>

      <h3 className="text-xl font-semibold">对象状态</h3>
      <div>
        name: {user.name}, age: {user.age}
      </div>
      <div className="space-x-2">
        <button
          className="px-3 py-2 rounded-md bg-gray-100 border"
          onClick={() => setUser(u => ({ ...u, age: u.age + 1 }))}
        >
          年龄 +1
        </button>
        <input
          className="px-3 py-2 rounded-md border"
          value={user.name}
          onInput={(e: any) =>
            setUser(u => ({ ...u, name: (e.target as HTMLInputElement).value }))
          }
          placeholder="修改 name"
        />
      </div>

      <h3 className="text-xl font-semibold">函数状态</h3>
      <div>
        formatted count: {format(count)}
      </div>
      <div className="space-x-2">
        <button
          className="px-3 py-2 rounded-md bg-gray-100 border"
          onClick={() =>
            setFormat((prev: (n: number) => string) => (prev === DEC_FORMAT ? HEX_FORMAT : DEC_FORMAT))
          }
        >
          切换十进制/十六进制
        </button>
        <button
          className="px-3 py-2 rounded-md bg-gray-100 border"
          onClick={() => setFormat(() => DEC_FORMAT)}
        >
          使用十进制
        </button>
        <button
          className="px-3 py-2 rounded-md bg-gray-100 border"
          onClick={() => setFormat(() => HEX_FORMAT)}
        >
          使用十六进制
        </button>
      </div>

      <RouterLink to="/jsx" className="text-blue-600 hover:underline">返回目录</RouterLink>
    </div>
  );
};

export default Events;
"##;
    let (program, cm) = utils::parse(src, "Events.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);
    assert!(!out.contains("_$removeEventListener"));

    // 期望输出要点对照：
    // - 事件：button onClick → addEventListener('click', handler)
    // - 文本插值：普通文本值走 _$createTextWrapper；对象成员等可渲染表达式走 slot-anchor + renderAnchor
    // - disabled：基于 list.length 的 watch 控制
    // - 函数状态：调用 valueOf() 的格式化函数再 watch 更新
    let _expected_fragment = r##"
import { useState, _$compiledWithHookId, useSetup, _$compiledRoot, renderAnchor, _$createElement, _$template, _$createTextNode, _$appendChild, onScopeDispose, untrack, watchEffect, _$setAttribute, _$setClassName, _$setValue, _$setDisabled } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { RouterLink } from '@rue-js/router';
const _$getTemplate1 = _$template('<div class="max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm"><h3 class="text-xl font-semibold">事件处理</h3><div>count: <!--rue:text-hole:0--></div><button class="px-3 py-2 rounded-md bg-blue-600 text-white">+1</button><h3 class="text-xl font-semibold">数据状态（数组）</h3><div>list: <!--rue:text-hole:1--></div><div class="space-x-2"><button class="px-3 py-2 rounded-md bg-gray-100 border">添加项</button><button class="px-3 py-2 rounded-md bg-gray-100 border">移除最后一个</button><button class="px-3 py-2 rounded-md bg-gray-100 border">重置</button></div><h3 class="text-xl font-semibold">对象状态</h3><div>name: <!--rue:text-hole:2-->, age: <!--rue:text-hole:3--></div><div class="space-x-2"><button class="px-3 py-2 rounded-md bg-gray-100 border">年龄 +1</button><input class="px-3 py-2 rounded-md border" placeholder="修改 name"></div><h3 class="text-xl font-semibold">函数状态</h3><div>formatted count: <!--rue:text-hole:4--></div><div class="space-x-2"><button class="px-3 py-2 rounded-md bg-gray-100 border">切换十进制/十六进制</button><button class="px-3 py-2 rounded-md bg-gray-100 border">使用十进制</button><button class="px-3 py-2 rounded-md bg-gray-100 border">使用十六进制</button></div><!--rue:opaque-hole:5--></div>');
const DEC_FORMAT = (n: number)=>String(n);
const HEX_FORMAT = (n: number)=>'0x' + n.toString(16);
const Events: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const [count, setCount] = useState(0);
            const [list, setList] = useState<string[]>([
                    'A'
                ]);
            const [user, setUser] = useState<{
                    name: string;
                    age: number;
                }>({
                    name: 'Alice',
                    age: 20
                });
            const [format, setFormat] = useState<(n: number) => string>(()=>DEC_FORMAT);
            return {
                count: count,
                setCount: setCount,
                list: list,
                setList: setList,
                user: user,
                setUser: setUser,
                format: format,
                setFormat: setFormat
            };
        }));
    const { count: count, setCount: setCount, list: list, setList: setList, user: user, setUser: setUser, format: format, setFormat: setFormat } = _$useSetup;
    return _$compiledRoot((__rue_parent_context)=>{
        const _fragment = _$getTemplate1().content.cloneNode(true);
        const _root = _fragment.firstChild;
        const _el1 = _root.childNodes[2];
        const _el2 = _root.childNodes[5].childNodes[0];
        const _el3 = _root.childNodes[5].childNodes[1];
        const _el4 = _root.childNodes[5].childNodes[2];
        const _el5 = _root.childNodes[8].childNodes[0];
        const _el6 = _root.childNodes[8].childNodes[1];
        const _el7 = _root.childNodes[11].childNodes[0];
        const _el8 = _root.childNodes[11].childNodes[1];
        const _el9 = _root.childNodes[11].childNodes[2];
        const _el10 = _root.childNodes[1].childNodes[1];
        const _el11 = _el10.parentNode;
        const _el12 = _root.childNodes[4].childNodes[1];
        const _el13 = _el12.parentNode;
        const _el14 = _root.childNodes[7].childNodes[1];
        const _el15 = _el14.parentNode;
        const _el16 = _root.childNodes[7].childNodes[3];
        const _el17 = _el16.parentNode;
        const _el18 = _root.childNodes[10].childNodes[1];
        const _el19 = _el18.parentNode;
        const _el20 = _root.childNodes[12];
        const _el21 = _el20.parentNode;
        _$setClassName(_el1, "px-3 py-2 rounded-md bg-blue-600 text-white");
        const _el1_event_1 = ($event)=>()=>setCount((c)=>c + 1)($event);
        _el1.addEventListener("click", _el1_event_1);
        onScopeDispose(()=>_el1.removeEventListener("click", _el1_event_1));
        _$setClassName(_el2, "px-3 py-2 rounded-md bg-gray-100 border");
        const _el2_event_1 = ($event)=>()=>setList((xs)=>[
                        ...xs,
                        `Item ${xs.length + 1}`
                    ])($event);
        _el2.addEventListener("click", _el2_event_1);
        onScopeDispose(()=>_el2.removeEventListener("click", _el2_event_1));
        _$setClassName(_el3, "px-3 py-2 rounded-md bg-gray-100 border");
        const _el3_event_1 = ($event)=>()=>setList((xs)=>xs.slice(0, -1))($event);
        _el3.addEventListener("click", _el3_event_1);
        onScopeDispose(()=>_el3.removeEventListener("click", _el3_event_1));
        watchEffect(()=>{
            _$setDisabled(_el3, !list.length);
        });
        _$setClassName(_el4, "px-3 py-2 rounded-md bg-gray-100 border");
        const _el4_event_1 = ($event)=>()=>setList([
                    'A'
                ])($event);
        _el4.addEventListener("click", _el4_event_1);
        onScopeDispose(()=>_el4.removeEventListener("click", _el4_event_1));
        _$setClassName(_el5, "px-3 py-2 rounded-md bg-gray-100 border");
        const _el5_event_1 = ($event)=>()=>setUser((u)=>({
                        ...u,
                        age: u.age + 1
                    }))($event);
        _el5.addEventListener("click", _el5_event_1);
        onScopeDispose(()=>_el5.removeEventListener("click", _el5_event_1));
        _$setClassName(_el6, "px-3 py-2 rounded-md border");
        watchEffect(()=>{
            _$setValue(_el6, user.name);
        });
        const _el6_event_2 = ($event)=>(e: any)=>setUser((u)=>({
                        ...u,
                        name: (e.target as HTMLInputElement).value
                    }))($event);
        _el6.addEventListener("input", _el6_event_2);
        onScopeDispose(()=>_el6.removeEventListener("input", _el6_event_2));
        _$setAttribute(_el6, "placeholder", "修改 name");
        _$setClassName(_el7, "px-3 py-2 rounded-md bg-gray-100 border");
        const _el7_event_1 = ($event)=>()=>setFormat((prev: (n: number) => string)=>(prev === DEC_FORMAT ? HEX_FORMAT : DEC_FORMAT))($event);
        _el7.addEventListener("click", _el7_event_1);
        onScopeDispose(()=>_el7.removeEventListener("click", _el7_event_1));
        _$setClassName(_el8, "px-3 py-2 rounded-md bg-gray-100 border");
        const _el8_event_1 = ($event)=>()=>setFormat(()=>DEC_FORMAT)($event);
        _el8.addEventListener("click", _el8_event_1);
        onScopeDispose(()=>_el8.removeEventListener("click", _el8_event_1));
        _$setClassName(_el9, "px-3 py-2 rounded-md bg-gray-100 border");
        const _el9_event_1 = ($event)=>()=>setFormat(()=>HEX_FORMAT)($event);
        _el9.addEventListener("click", _el9_event_1);
        onScopeDispose(()=>_el9.removeEventListener("click", _el9_event_1));
        watchEffect(()=>{
            const __slot = (count);
            untrack(()=>renderAnchor(__slot, _el11, _el10));
        });
        watchEffect(()=>{
            const __slot = list.join(', ');
            untrack(()=>renderAnchor(__slot, _el13, _el12));
        });
        watchEffect(()=>{
            const __slot = (user.name);
            untrack(()=>renderAnchor(__slot, _el15, _el14));
        });
        watchEffect(()=>{
            const __slot = (user.age);
            untrack(()=>renderAnchor(__slot, _el17, _el16));
        });
        watchEffect(()=>{
            const __slot = format(count);
            untrack(()=>renderAnchor(__slot, _el19, _el18));
        });
        const _el22 = _$createElement("a", _el21);
        _$appendChild(_el21, _el22);
        _el21.insertBefore(_el22, _el20);
        watchEffect(()=>{
            _$setAttribute(_el22, "href", String(RouterLink.__rueHref("/jsx")));
        });
        const _el22_event_1 = ($event)=>(e)=>RouterLink.__rueOnClick(e, "/jsx", false)($event);
        _el22.addEventListener("click", _el22_event_1);
        onScopeDispose(()=>_el22.removeEventListener("click", _el22_event_1));
        const _el22_event_2 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el22.addEventListener("pointerenter", _el22_event_2);
        onScopeDispose(()=>_el22.removeEventListener("pointerenter", _el22_event_2));
        const _el22_event_3 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el22.addEventListener("focus", _el22_event_3);
        onScopeDispose(()=>_el22.removeEventListener("focus", _el22_event_3));
        const _el22_event_4 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el22.addEventListener("pointerdown", _el22_event_4);
        onScopeDispose(()=>_el22.removeEventListener("pointerdown", _el22_event_4));
        const _el22_event_5 = ($event)=>(e)=>RouterLink.__rueOnPrefetch(e, "/jsx", "hover")($event);
        _el22.addEventListener("touchstart", _el22_event_5);
        onScopeDispose(()=>_el22.removeEventListener("touchstart", _el22_event_5));
        _$setClassName(_el22, "text-blue-600 hover:underline");
        _$appendChild(_el22, _$createTextNode("返回目录"));
        return _root;
    });
};
export default Events;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/events.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert!(normalized.contains("_$compiledSetup"), "{normalized}");
    assert!(normalized.contains("effect"), "{normalized}");
    assert!(normalized.contains("addEventListener"), "{normalized}");
    assert!(normalized.contains("_$setValue"), "{normalized}");
    assert!(normalized.contains("_$setDisabled"), "{normalized}");
    assert!(normalized.contains("RouterLink.__rueHref"), "{normalized}");
    assert!(!normalized.contains("watchEffect"), "{normalized}");
}
