//! SWC 插件转换行为测试（spec5）
//!
//! 覆盖：属性、事件或文本组合用例。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec5() {
    let src = r##"
import { FC, onMounted, onBeforeUnmount, onBeforeCreate, onCreated } from '@rue-js/rue'
import { useCart } from '../hooks/useCart'
const UseCart: FC = () => {
  const cart = useCart()
  const products = [
    { id: 1, name: '苹果', price: 3 },
    { id: 2, name: '香蕉', price: 2 },
    { id: 3, name: '橘子', price: 4 },
  ]
  onBeforeCreate(() => {
    console.log('UseCart beforeCreate')
  })
  onCreated(() => {
    console.log('UseCart created')
  })
  onMounted(() => {
    console.log('UseCart mounted')
  })
  onBeforeUnmount(() => {
    console.log('UseCart will unmount, cleanup here')
  })
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">购物车示例（useCart）</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map(pr => (
          <div
            key={pr.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <span className="text-gray-800">
              {pr.name} ￥{pr.price}
            </span>
            <button
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => cart.add(pr)}
            >
              加入
            </button>
          </div>
        ))}
      </div>
      <h3 className="mt-6 text-xl font-semibold">购物车</h3>
      {cart.items.value.length === 0 ? (
        <p className="text-gray-500 mt-2">购物车为空</p>
      ) : (
        <ul className="divide-y divide-gray-200 mt-2">
          {cart.items.value.map(i => (
            <li key={i.id} className="flex items-center justify之间 py-3">
              <span className="text-gray-800">
                {i.name} x {i.qty}
              </span>
              <button className="text-red-600 hover:text-red-700" onClick={() => cart.remove(i.id)}>
                移除
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-right text-lg font-medium">总价：￥{cart.total.value}</p>
      <button
        className="mt-2 px-4 py-2 rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200"
        onClick={cart.clear}
      >
        清空
      </button>
    </div>
  )
}
export default UseCart
"##;
    std::fs::create_dir_all("target/vapor_outputs").ok();
    let (program, cm) = utils::parse(src, "Refs.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);

    let _expected_fragment = r##"import { onBeforeCreate, onCreated, onMounted, onBeforeUnmount, _$compiledWithHookId, useSetup, _$compiledRoot, renderAnchor, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, untrack, watchEffect, _$compiledKeyedList, _$createTextWrapper, _$addEventListener, _$setClassName } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
import { useCart } from '../hooks/useCart';
const UseCart: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const cart = useCart();
            const products = [
                {
                    id: 1,
                    name: '苹果',
                    price: 3
                },
                {
                    id: 2,
                    name: '香蕉',
                    price: 2
                },
                {
                    id: 3,
                    name: '橘子',
                    price: 4
                }
            ];
            onBeforeCreate(()=>{
                console.log('UseCart beforeCreate');
            });
            onCreated(()=>{
                console.log('UseCart created');
            });
            onMounted(()=>{
                console.log('UseCart mounted');
            });
            onBeforeUnmount(()=>{
                console.log('UseCart will unmount, cleanup here');
            });
            return {
                cart: cart,
                products: products
            };
        }));
    const { cart: cart, products: products } = _$useSetup;
    return _$compiledRoot(()=>{
        const _root = _$createElement("div");
        _$setClassName(_root, "max-w-3xl mx-auto p-6");
        const _el1 = _$createElement("h2");
        _$appendChild(_root, _el1);
        _$setClassName(_el1, "text-2xl font-semibold mb-4");
        _$appendChild(_el1, _$createTextNode("购物车示例（useCart）"));
        const _el2 = _$createElement("div");
        _$appendChild(_root, _el2);
        _$setClassName(_el2, "grid grid-cols-1 sm:grid-cols-2 gap-4");
        const _list1 = _$createComment("rue:list:start");
        const _list2 = _$createComment("rue:list:end");
        _$appendChild(_el2, _list1);
        _$appendChild(_el2, _list2);
        let _map1_elements = new Map;
        watchEffect(()=>{
            const _map1_current = products || [];
            const _map1_newElements = _$compiledKeyedList({
                items: _map1_current,
                getKey: (pr, idx)=>pr.id,
                elements: _map1_elements,
                parent: _el2,
                before: _list2,
                singleRoot: true,
                trackIndex: false,
                start: _list1,
                renderItem: (pr, parent, start, end, idx)=>{
                    const __slot = _$compiledRoot(()=>{
                        const _root = _$createDocumentFragment();
                        const _el3 = _$createElement("div");
                        _$appendChild(_root, _el3);
                        _$setClassName(_el3, "flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm");
                        const _el4 = _$createElement("span");
                        _$appendChild(_el3, _el4);
                        _$setClassName(_el4, "text-gray-800");
                        const _list3 = _$createComment("rue:slot:anchor");
                        _$appendChild(_el4, _list3);
                        watchEffect(()=>{
                            const __slot = (pr.name);
                            untrack(()=>renderAnchor(__slot, _el4, _list3));
                        });
                        _$appendChild(_el4, _$createTextNode(" ￥"));
                        const _list4 = _$createComment("rue:slot:anchor");
                        _$appendChild(_el4, _list4);
                        watchEffect(()=>{
                            const __slot = (pr.price);
                            untrack(()=>renderAnchor(__slot, _el4, _list4));
                        });
                        const _el5 = _$createElement("button");
                        _$appendChild(_el3, _el5);
                        _$setClassName(_el5, "px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700");
                        _$addEventListener(_el5, "click", (()=>cart.add(pr)));
                        _$appendChild(_el5, _$createTextNode("加入"));
                        return _root;
                    });
                    renderAnchor(__slot, parent, start);
                }
            });
            _map1_elements = _map1_newElements;
        });
        const _el6 = _$createElement("h3");
        _$appendChild(_root, _el6);
        _$setClassName(_el6, "mt-6 text-xl font-semibold");
        _$appendChild(_el6, _$createTextNode("购物车"));
        const _list5 = _$createComment("rue:slot:anchor");
        _$appendChild(_root, _list5);
        watchEffect(()=>{
            const __slot = cart.items.value.length === 0 ? _$compiledRoot(()=>{
                const _root = _$createDocumentFragment();
            const _el7 = _$createElement("p");
            _$appendChild(_root, _el7);
            _$setClassName(_el7, "text-gray-500 mt-2");
            _$appendChild(_el7, _$createTextNode("购物车为空"));
                return _root;
            }) : _$compiledRoot(()=>{
                const _root = _$createDocumentFragment();
            const _el8 = _$createElement("ul");
            _$appendChild(_root, _el8);
            _$setClassName(_el8, "divide-y divide-gray-200 mt-2");
            const _list6 = _$createComment("rue:list:start");
            const _list7 = _$createComment("rue:list:end");
            _$appendChild(_el8, _list6);
            _$appendChild(_el8, _list7);
                let _map2_elements = new Map;
                watchEffect(()=>{
                    const _map2_current = cart.items.value || [];
                    const _map2_newElements = _$compiledKeyedList({
                        items: _map2_current,
                        getKey: (i, idx)=>i.id,
                        elements: _map2_elements,
                parent: _el8,
                before: _list7,
                        singleRoot: true,
                      trackIndex: false,
                start: _list6,
                        renderItem: (i, parent, start, end, idx)=>{
                            const __slot = _$compiledRoot(()=>{
                                const _root = _$createDocumentFragment();
                    const _el9 = _$createElement("li");
                    _$appendChild(_root, _el9);
                    _$setClassName(_el9, "flex items-center justify之间 py-3");
                    const _el10 = _$createElement("span");
                    _$appendChild(_el9, _el10);
                    _$setClassName(_el10, "text-gray-800");
                    const _list8 = _$createComment("rue:slot:anchor");
                    _$appendChild(_el10, _list8);
                                watchEffect(()=>{
                                    const __slot = (i.name);
                                    untrack(()=>renderAnchor(__slot, _el10, _list8));
                                });
                    _$appendChild(_el10, _$createTextNode(" x "));
                    const _list9 = _$createComment("rue:slot:anchor");
                    _$appendChild(_el10, _list9);
                                watchEffect(()=>{
                                    const __slot = (i.qty);
                                    untrack(()=>renderAnchor(__slot, _el10, _list9));
                                });
                    const _el11 = _$createElement("button");
                    _$appendChild(_el9, _el11);
                    _$setClassName(_el11, "text-red-600 hover:text-red-700");
                    _$addEventListener(_el11, "click", (()=>cart.remove(i.id)));
                    _$appendChild(_el11, _$createTextNode("移除"));
                                return _root;
                            });
                            renderAnchor(__slot, parent, start);
                        }
                    });
                    _map2_elements = _map2_newElements;
                });
                return _root;
            });
              untrack(()=>renderAnchor(__slot, _root, _list5));
        });
          const _el12 = _$createElement("p");
          _$appendChild(_root, _el12);
          _$setClassName(_el12, "mt-4 text-right text-lg font-medium");
          _$appendChild(_el12, _$createTextNode("总价：￥"));
          const _el13 = _$createTextWrapper(_el12);
          _$appendChild(_el12, _el13);
        watchEffect(()=>{
            _$settextContent(_el13, cart.total.value);
        });
          const _el14 = _$createElement("button");
          _$appendChild(_root, _el14);
          _$setClassName(_el14, "mt-2 px-4 py-2 rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200");
          _$addEventListener(_el14, "click", (cart.clear));
          _$appendChild(_el14, _$createTextNode("清空"));
        return _root;
    });
};
export default UseCart;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec5.out.js", strip_marker(&out)).ok();
    let normalized = normalize(&strip_marker(&out));
    assert_eq!(normalized.matches("_$reconcileKeyedSingle(").count(), 2);
    assert_eq!(normalized.matches("_$mountCompiledKeyedSingleRow(").count(), 2);
    assert!(normalized.contains("let _$rowItem1 = pr"));
    assert!(normalized.contains("let _$rowItem2 = i"));
    for field in ["_$rowItem1.name", "_$rowItem1.price", "_$rowItem2.name", "_$rowItem2.qty"] {
        assert!(normalized.contains(field), "{normalized}");
    }
    assert!(!normalized.contains("_$rowItem1.get()"));
    assert!(!normalized.contains("_$rowItem2.get()"));
    assert!(normalized.contains("()=>cart.add(_$rowItem1)"));
    assert!(normalized.contains("()=>cart.remove(_$rowItem2.id)"));
    assert!(!normalized.contains("_$compiledKeyedList"));
}
