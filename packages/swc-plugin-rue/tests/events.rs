//! 事件处理与状态更新转换测试
//!
//! 覆盖：onClick 等事件绑定、useState 的更新闭包、文本回显与 join 的生成。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_events() {
    let src = r##"
import { type FC, useState } from 'rue-js';
import { RouterLink } from 'rue-router';

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
      <div>count: {count.value}</div>
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
        formatted count: {((format as any).valueOf())(count)}
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

    // 期望输出要点对照：
    // - 事件：button onClick → addEventListener('click', handler)
    // - 文本插值：count/list/user/format 的值以 _$createTextWrapper + _$settextContent + watch 更新
    // - disabled：基于 list.length 的 watch 控制
    // - 函数状态：调用 valueOf() 的格式化函数再 watch 更新
    let expected_fragment = r##"
import { type FC, useState, _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$appendChild, watchEffect, _$createTextWrapper, _$setAttribute, _$addEventListener, _$setClassName, _$setValue, _$setDisabled } from 'rue-js';
import { RouterLink } from 'rue-router';
const DEC_FORMAT = (n: number)=>String(n);
const HEX_FORMAT = (n: number)=>'0x' + n.toString(16);
const Events: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const [count, setCount] = _$vaporWithHookId("useState:1:0", ()=>useState(0));
            const [list, setList] = _$vaporWithHookId("useState:1:1", ()=>useState<string[]>([
                    'A'
                ]));
            const [user, setUser] = _$vaporWithHookId("useState:1:2", ()=>useState<{
                    name: string;
                    age: number;
                }>({
                    name: 'Alice',
                    age: 20
                }));
            const [format, setFormat] = _$vaporWithHookId("useState:1:3", ()=>useState<(n: number) => string>(()=>DEC_FORMAT));
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
    return vapor(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-4xl mx-auto p-6 space-y-4 rounded-lg border bg-white shadow-sm");
        const _el1 = _$createElement("h3");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-xl font-semibold");
        _$appendChild(_el1, _$createTextNode("事件处理"));
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        _$appendChild(_el2, _$createTextNode("count: "));
        const _el3 = _$createTextWrapper(_el2);
        _$appendChild(_el2, _el3);
        watchEffect(()=>{
            _$settextContent(_el3, count.value);
        });
        const _el4 = _$createElement("button");
        _$appendChild(_root, _el4);
        _$setClassName(_el4, "px-3 py-2 rounded-md bg-blue-600 text-white");
        _$addEventListener(_el4, "click", (()=>setCount((c)=>c + 1)));
        _$appendChild(_el4, _$createTextNode("+1"));
        const _el5 = _$createElement("h3");
        _$appendChild(_root, _el5);
        _$setClassName(_el5, "text-xl font-semibold");
        _$appendChild(_el5, _$createTextNode("数据状态（数组）"));
        const _el6 = _$createElement("div");
        _$appendChild(_root, _el6);
        _$appendChild(_el6, _$createTextNode("list: "));
        const _el7 = _$createTextWrapper(_el6);
        _$appendChild(_el6, _el7);
        watchEffect(()=>{
            _$settextContent(_el7, list.join(', '));
        });
        const _el8 = _$createElement("div");
        _$appendChild(_root, _el8);
        _$setClassName(_el8, "space-x-2");
        const _el9 = _$createElement("button");
        _$appendChild(_el8, _el9);
        _$setClassName(_el9, "px-3 py-2 rounded-md bg-gray-100 border");
        _$addEventListener(_el9, "click", (()=>setList((xs)=>[
                    ...xs,
                    `Item ${xs.length + 1}`
                ])));
        _$appendChild(_el9, _$createTextNode("添加项"));
        const _el10 = _$createElement("button");
        _$appendChild(_el8, _el10);
        _$setClassName(_el10, "px-3 py-2 rounded-md bg-gray-100 border");
        _$addEventListener(_el10, "click", (()=>setList((xs)=>xs.slice(0, -1))));
        watchEffect(()=>{
            _$setDisabled(_el10, !list.length);
        });
        _$appendChild(_el10, _$createTextNode("移除最后一个"));
        const _el11 = _$createElement("button");
        _$appendChild(_el8, _el11);
        _$setClassName(_el11, "px-3 py-2 rounded-md bg-gray-100 border");
        _$addEventListener(_el11, "click", (()=>setList([
                'A'
            ])));
        _$appendChild(_el11, _$createTextNode("重置"));
        const _el12 = _$createElement("h3");
        _$appendChild(_root, _el12);
        _$setClassName(_el12, "text-xl font-semibold");
        _$appendChild(_el12, _$createTextNode("对象状态"));
        const _el13 = _$createElement("div");
        _$appendChild(_root, _el13);
        _$appendChild(_el13, _$createTextNode("name: "));
        const _el14 = _$createTextWrapper(_el13);
        _$appendChild(_el13, _el14);
        watchEffect(()=>{
            _$settextContent(_el14, user.name);
        });
        _$appendChild(_el13, _$createTextNode(", age: "));
        const _el15 = _$createTextWrapper(_el13);
        _$appendChild(_el13, _el15);
        watchEffect(()=>{
            _$settextContent(_el15, user.age);
        });
        const _el16 = _$createElement("div");
        _$appendChild(_root, _el16);
        _$setClassName(_el16, "space-x-2");
        const _el17 = _$createElement("button");
        _$appendChild(_el16, _el17);
        _$setClassName(_el17, "px-3 py-2 rounded-md bg-gray-100 border");
        _$addEventListener(_el17, "click", (()=>setUser((u)=>({
                    ...u,
                    age: u.age + 1
                }))));
        _$appendChild(_el17, _$createTextNode("年龄 +1"));
        const _el18 = _$createElement("input");
        _$appendChild(_el16, _el18);
        _$setClassName(_el18, "px-3 py-2 rounded-md border");
        watchEffect(()=>{
            _$setValue(_el18, user.name);
        });
        _$addEventListener(_el18, "input", ((e: any)=>setUser((u)=>({
                    ...u,
                    name: (e.target as HTMLInputElement).value
                }))));
        _$setAttribute(_el18, "placeholder", "修改 name");
        const _el19 = _$createElement("h3");
        _$appendChild(_root, _el19);
        _$setClassName(_el19, "text-xl font-semibold");
        _$appendChild(_el19, _$createTextNode("函数状态"));
        const _el20 = _$createElement("div");
        _$appendChild(_root, _el20);
        _$appendChild(_el20, _$createTextNode("formatted count: "));
        const _el21 = _$createTextWrapper(_el20);
        _$appendChild(_el20, _el21);
        watchEffect(()=>{
            _$settextContent(_el21, ((format as any).valueOf())(count));
        });
        const _el22 = _$createElement("div");
        _$appendChild(_root, _el22);
        _$setClassName(_el22, "space-x-2");
        const _el23 = _$createElement("button");
        _$appendChild(_el22, _el23);
        _$setClassName(_el23, "px-3 py-2 rounded-md bg-gray-100 border");
        _$addEventListener(_el23, "click", (()=>setFormat((prev: (n: number) => string)=>(prev === DEC_FORMAT ? HEX_FORMAT : DEC_FORMAT))));
        _$appendChild(_el23, _$createTextNode("切换十进制/十六进制"));
        const _el24 = _$createElement("button");
        _$appendChild(_el22, _el24);
        _$setClassName(_el24, "px-3 py-2 rounded-md bg-gray-100 border");
        _$addEventListener(_el24, "click", (()=>setFormat(()=>DEC_FORMAT)));
        _$appendChild(_el24, _$createTextNode("使用十进制"));
        const _el25 = _$createElement("button");
        _$appendChild(_el22, _el25);
        _$setClassName(_el25, "px-3 py-2 rounded-md bg-gray-100 border");
        _$addEventListener(_el25, "click", (()=>setFormat(()=>HEX_FORMAT)));
        _$appendChild(_el25, _$createTextNode("使用十六进制"));
        const _list1 = _$createComment("rue:component:start");
        const _list2 = _$createComment("rue:component:end");
        _$appendChild(_root, _list1);
        _$appendChild(_root, _list2);
        const __child1 = "返回目录";
        const __slot3 = <RouterLink to="/jsx" className="text-blue-600 hover:underline" children={__child1}/>;
        renderBetween(__slot3, _root, _list1, _list2);
        return {
            vaporElement: _root
        };
    });
};
export default Events;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/events.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
