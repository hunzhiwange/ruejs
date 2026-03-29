//! SWC 插件转换行为测试（spec5）
//!
//! 覆盖：属性、事件或文本组合用例。
use swc_plugin_rue::apply;

mod utils;

#[test]
fn transforms_spec5() {
    let src = r##"
import { FC, onMounted, onBeforeUnmount, onBeforeCreate, onCreated } from 'rue-js'
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

    let expected_fragment = r##"
import { FC, onMounted, onBeforeUnmount, onBeforeCreate, onCreated, _$vaporWithHookId, useSetup, vapor, renderBetween, _$createElement, _$createComment, _$createTextNode, _$settextContent, _$createDocumentFragment, _$appendChild, watchEffect, _$vaporKeyedList, _$createTextWrapper, _$vaporCreateVNode, _$setAttribute, _$addEventListener, _$setClassName } from 'rue-js';
import { useCart } from '../hooks/useCart';
const UseCart: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
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
    return vapor(()=>{
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
            const _map1_newElements = _$vaporKeyedList({
                items: _map1_current,
                getKey: (pr, idx)=>pr.id,
                elements: _map1_elements,
                parent: _el2,
                before: _list2,
                start: _list1,
                renderItem: (pr, parent, start, end, idx)=>{
                    const __slot = vapor(()=>{
                        const _root = _$createDocumentFragment();
                        const _el3 = _$createElement("div");
                        _$appendChild(_root, _el3);
                        watchEffect(()=>{
                            _$setAttribute(_el3, "key", String((pr.id)));
                        });
                        _$setClassName(_el3, "flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm");
                        const _el4 = _$createElement("span");
                        _$appendChild(_el3, _el4);
                        _$setClassName(_el4, "text-gray-800");
                        const _el5 = _$createTextWrapper(_el4);
                        _$appendChild(_el4, _el5);
                        watchEffect(()=>{
                            _$settextContent(_el5, pr.name);
                        });
                        _$appendChild(_el4, _$createTextNode(" ￥"));
                        const _el6 = _$createTextWrapper(_el4);
                        _$appendChild(_el4, _el6);
                        watchEffect(()=>{
                            _$settextContent(_el6, pr.price);
                        });
                        const _el7 = _$createElement("button");
                        _$appendChild(_el3, _el7);
                        _$setClassName(_el7, "px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700");
                        _$addEventListener(_el7, "click", (()=>cart.add(pr)));
                        _$appendChild(_el7, _$createTextNode("加入"));
                        return {
                            vaporElement: _root
                        };
                    });
                    renderBetween(__slot, parent, start, end);
                }
            });
            _map1_elements = _map1_newElements;
        });
        const _el8 = _$createElement("h3");
        _$appendChild(_root, _el8);
        _$setClassName(_el8, "mt-6 text-xl font-semibold");
        _$appendChild(_el8, _$createTextNode("购物车"));
        const _list3 = _$createComment("rue:slot:start");
        const _list4 = _$createComment("rue:slot:end");
        _$appendChild(_root, _list3);
        _$appendChild(_root, _list4);
        watchEffect(()=>{
            const __slot = cart.items.value.length === 0 ? vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el9 = _$createElement("p");
                _$appendChild(_root, _el9);
                _$setClassName(_el9, "text-gray-500 mt-2");
                _$appendChild(_el9, _$createTextNode("购物车为空"));
                return {
                    vaporElement: _root
                };
            }) : vapor(()=>{
                const _root = _$createDocumentFragment();
                const _el10 = _$createElement("ul");
                _$appendChild(_root, _el10);
                _$setClassName(_el10, "divide-y divide-gray-200 mt-2");
                const _list5 = _$createComment("rue:list:start");
                const _list6 = _$createComment("rue:list:end");
                _$appendChild(_el10, _list5);
                _$appendChild(_el10, _list6);
                let _map2_elements = new Map;
                watchEffect(()=>{
                    const _map2_current = cart.items.value || [];
                    const _map2_newElements = _$vaporKeyedList({
                        items: _map2_current,
                        getKey: (i, idx)=>i.id,
                        elements: _map2_elements,
                        parent: _el10,
                        before: _list6,
                        start: _list5,
                        renderItem: (i, parent, start, end, idx)=>{
                            const __slot = vapor(()=>{
                                const _root = _$createDocumentFragment();
                                const _el11 = _$createElement("li");
                                _$appendChild(_root, _el11);
                                watchEffect(()=>{
                                    _$setAttribute(_el11, "key", String((i.id)));
                                });
                                _$setClassName(_el11, "flex items-center justify之间 py-3");
                                const _el12 = _$createElement("span");
                                _$appendChild(_el11, _el12);
                                _$setClassName(_el12, "text-gray-800");
                                const _el13 = _$createTextWrapper(_el12);
                                _$appendChild(_el12, _el13);
                                watchEffect(()=>{
                                    _$settextContent(_el13, i.name);
                                });
                                _$appendChild(_el12, _$createTextNode(" x "));
                                const _el14 = _$createTextWrapper(_el12);
                                _$appendChild(_el12, _el14);
                                watchEffect(()=>{
                                    _$settextContent(_el14, i.qty);
                                });
                                const _el15 = _$createElement("button");
                                _$appendChild(_el11, _el15);
                                _$setClassName(_el15, "text-red-600 hover:text-red-700");
                                _$addEventListener(_el15, "click", (()=>cart.remove(i.id)));
                                _$appendChild(_el15, _$createTextNode("移除"));
                                return {
                                    vaporElement: _root
                                };
                            });
                            renderBetween(__slot, parent, start, end);
                        }
                    });
                    _map2_elements = _map2_newElements;
                });
                return {
                    vaporElement: _root
                };
            });
            const __vnode = _$vaporCreateVNode(__slot);
            renderBetween(__vnode, _root, _list3, _list4);
        });
        const _el16 = _$createElement("p");
        _$appendChild(_root, _el16);
        _$setClassName(_el16, "mt-4 text-right text-lg font-medium");
        _$appendChild(_el16, _$createTextNode("总价：￥"));
        const _el17 = _$createTextWrapper(_el16);
        _$appendChild(_el16, _el17);
        watchEffect(()=>{
            _$settextContent(_el17, cart.total.value);
        });
        const _el18 = _$createElement("button");
        _$appendChild(_root, _el18);
        _$setClassName(_el18, "mt-2 px-4 py-2 rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200");
        _$addEventListener(_el18, "click", (cart.clear));
        _$appendChild(_el18, _$createTextNode("清空"));
        return {
            vaporElement: _root
        };
    });
};
export default UseCart;
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec5.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
