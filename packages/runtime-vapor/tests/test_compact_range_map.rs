use js_sys::{Array, Function, Object, Reflect};
use rue_runtime_vapor::reactive::core::{create_effect_scope, pop_effect_scope, push_effect_scope};
use rue_runtime_vapor::{
    JsDomAdapter, create_effect, create_signal, on_cleanup, set_reactive_scheduling,
};
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

use rue_runtime_vapor::{DomAdapter, Rue, VNodeType};

mod common;
use common::TestAdapter;

fn update_siblings(parent: &JsValue) {
    let children = Reflect::get(parent, &JsValue::from_str("children")).unwrap_or(Array::new().into());
    let arr: Array = children.unchecked_into();
    for i in 0..arr.length() {
        let cur = arr.get(i);
        let prev = if i > 0 { arr.get(i - 1) } else { JsValue::NULL };
        let next = if i + 1 < arr.length() { arr.get(i + 1) } else { JsValue::NULL };
        let _ = Reflect::set(&cur, &JsValue::from_str("previousSibling"), &prev);
        let _ = Reflect::set(&cur, &JsValue::from_str("nextSibling"), &next);
        let _ = Reflect::set(&cur, &JsValue::from_str("parentNode"), parent);
    }
}

fn make_linked_adapter() -> JsValue {
    let obj = Object::new();
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("createElement"),
        &Function::new_with_args("tag", "return { tag, children: [] }").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("createTextNode"),
        &Function::new_with_args("text", "return { tag: '#text', text, children: [] }").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("createDocumentFragment"),
        &Function::new_no_args("return { tag: 'fragment', children: [] }").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("isFragment"),
        &Function::new_with_args("el", "return !!el && el.tag === 'fragment'").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("collectFragmentChildren"),
        &Function::new_with_args("el", "return Array.from(el && el.children || [])").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setTextContent"),
        &Function::new_with_args("el,text", "el.text = text").into(),
    );
    let append_impl = Function::new_with_args(
        "p,c",
        "p.children = p.children||[]; \
         if (c && c.tag === 'fragment') { \
           const list = Array.from(c.children||[]); \
           list.forEach(ch => p.children.push(ch)); \
         } else { \
           p.children.push(c); \
         } \
         return;",
    );
    let _ = Reflect::set(&obj, &JsValue::from_str("appendChild"), &append_impl.into());
    let insert_impl = Function::new_with_args(
        "p,c,b",
        "p.children = p.children||[]; \
         const idx = (p.children||[]).indexOf(b); \
         const at = idx >= 0 ? idx : p.children.length; \
         if (c && c.tag === 'fragment') { \
           const list = Array.from(c.children||[]); \
           p.children.splice(at, 0, ...list); \
         } else { \
           p.children.splice(at, 0, c); \
         } \
         return;",
    );
    let _ = Reflect::set(&obj, &JsValue::from_str("insertBefore"), &insert_impl.into());
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("removeChild"),
        &Function::new_with_args("p,c", "p.children = (p.children||[]).filter(x=>x!==c)").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("contains"),
        &Function::new_with_args(
            "p,c",
            "if (p === c) return true; \
             const walk = (node) => (node && (node.children || []).some(ch => ch === c || walk(ch))) || false; \
             return walk(p);",
        )
        .into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setClassName"),
        &Function::new_with_args("el,v", "el.class = v").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("patchStyle"),
        &Function::new_with_args("el,old,newv", "return").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setInnerHTML"),
        &Function::new_with_args("el,html", "el.children=[]; el.text=html").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setValue"),
        &Function::new_with_args("el,v", "el.value = v").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setChecked"),
        &Function::new_with_args("el,b", "el.checked = !!b").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setDisabled"),
        &Function::new_with_args("el,b", "el.disabled = !!b").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("clearRef"),
        &Function::new_with_args("r", "return").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("applyRef"),
        &Function::new_with_args("el,r", "return").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("setAttribute"),
        &Function::new_with_args("el,k,v", "el.attrs = el.attrs||{}; el.attrs[k]=v").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("removeAttribute"),
        &Function::new_with_args("el,k", "if(el.attrs) delete el.attrs[k]").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("getTagName"),
        &Function::new_with_args("el", "return el.tag||''").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("addEventListener"),
        &Function::new_with_args("el,evt,h", "return").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("removeEventListener"),
        &Function::new_with_args("el,evt,h", "return").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("hasValueProperty"),
        &Function::new_with_args("el", "return 'value' in el").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("isSelectMultiple"),
        &Function::new_with_args("el", "return el.tag==='SELECT' && !!el.multiple").into(),
    );
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str("querySelector"),
        &Function::new_with_args("sel", "return { tag: sel, children: [] }").into(),
    );
    obj.into()
}

#[wasm_bindgen_test]
/// compact_range_map：当 range 的 start 锚点“已不再挂载”时，会触发 vnode 卸载并回收资源。
///
/// 这个测试覆盖一个历史上真实出现的泄漏路径：
/// - `renderBetween` 会把 (start -> vnode) 缓存在 `rue.range_map`；
/// - 当路由切换或条件分支替换导致旧 DOM 被删除时，旧 range 可能变成“孤儿锚点”；
/// - 如果仅仅把 range_map entry 删除、却不调用 vnode 的卸载钩子，
///   那么该 vnode 子树内部注册的副作用（watchEffect/createEffect）就不会被 dispose。
///
/// 本测试构造一个“孤儿 start 锚点 + 带 scope_id 的 Vapor vnode”，并在 scope 里创建一个 effect：
/// - effect 注册 cleanup：用于验证卸载时确实会运行 dispose；
/// - effect 订阅 signal：用于验证卸载后不会再响应更新。
fn compact_range_map_drops_stale_range_and_unmounts_vnode() {
    // 用同步调度，避免测试被微任务时序影响。
    set_reactive_scheduling("sync");

    // 记录 cleanup 次数：用 JS 全局变量便于跨闭包断言。
    let _ = js_sys::eval("globalThis.__rue_compact_cleanup = 0;");

    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let sig2 = sig.clone();

    // 1) 创建一个 scope，并在 scope 内创建 effect，使其归属到该 scope。
    //    后续只要 vnode.before_unmount dispose 了这个 scope，就应当回收该 effect。
    let sid = create_effect_scope();
    push_effect_scope(sid);
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = sig2.get_js();

        let cleanup = Function::new_no_args(
            "globalThis.__rue_compact_cleanup = (globalThis.__rue_compact_cleanup || 0) + 1;",
        );
        on_cleanup(cleanup);
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    cb.forget();
    pop_effect_scope();
    assert_eq!(*hits.borrow(), 1);

    // 2) 构造一个“带 scope_id 的 Vapor vnode”，模拟 Vapor 子树。
    //    invoke_before_unmount_vnode(Vapor/WithSetup) 会读取该字段并 dispose scope。
    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut props: HashMap<String, JsValue> = HashMap::new();
    props.insert("__rue_effect_scope_id".to_string(), JsValue::from_f64(sid as f64));
    let stale_vnode = rue.create_element(VNodeType::Vapor, Some(props), vec![]);

    // 3) 构造一个“孤儿 start 锚点”：它没有 parent，因此会被 compact_range_map 判定为过期。
    let stale_start = rue.get_dom_adapter_mut().unwrap().create_element("stale_start");
    rue.range_map.push((stale_start, Some(stale_vnode)));

    // 4) 调用一次 render_between，让内部先执行 compact_range_map：
    //    - stale range 会被丢弃；
    //    - 丢弃前触发 vnode 卸载，从而 dispose scope；
    //    - scope dispose 会执行 cleanup，并使 effect 不再响应 signal。
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);
    let vnode_new = rue.create_element(VNodeType::Element("div".into()), None, vec![]);
    rue.render_between(vnode_new, &mut parent, start, end);

    // 5) cleanup 应已被执行一次（来自 scope dispose）。
    let v = js_sys::eval("globalThis.__rue_compact_cleanup").unwrap();
    assert_eq!(v.as_f64().unwrap() as i32, 1);

    // 6) scope 已被 dispose：后续 signal 更新不应再触发该 effect。
    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
}

#[wasm_bindgen_test]
/// compact_range_map：当 start 位于“未挂载的 fragment 子树”中时也应视为过期并清理。
///
/// 场景说明：
/// - 某些渲染流程会先构造一个离线的 DocumentFragment/片段树，再在合适时机整体挂载；
/// - 处于该片段树内的 start 节点虽然存在 parentNode，但不应被视为“已连接到文档”，
///   否则旧的 Vapor 子树无法正确清理，造成副作用泄漏。
///
/// 本测试通过适配器构造一个离线 fragment，令 stale_start 挂在其内部；
/// 调用 render_between 时，compact_range_map 应识别并丢弃该过期区间，
/// 同时触发 vnode 卸载，从而执行 cleanup 与停止后续响应。
fn compact_range_map_drops_range_when_start_is_inside_detached_fragment_tree() {
    set_reactive_scheduling("sync");
    let _ = js_sys::eval("globalThis.__rue_compact_cleanup2 = 0;");

    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let sig2 = sig.clone();

    let sid = create_effect_scope();
    push_effect_scope(sid);
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = sig2.get_js();

        let cleanup = Function::new_no_args(
            "globalThis.__rue_compact_cleanup2 = (globalThis.__rue_compact_cleanup2 || 0) + 1;",
        );
        on_cleanup(cleanup);
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    cb.forget();
    pop_effect_scope();
    assert_eq!(*hits.borrow(), 1);

    let mut rue: Rue<TestAdapter> = Rue::new();
    rue.set_dom_adapter(TestAdapter::default());
    let mut props: HashMap<String, JsValue> = HashMap::new();
    props.insert("__rue_effect_scope_id".to_string(), JsValue::from_f64(sid as f64));
    let stale_vnode = rue.create_element(VNodeType::Vapor, Some(props), vec![]);

    // 构造一个离线的 fragment，并在其内部创建一个 holder 元素
    let mut cache_frag = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let holder = rue.get_dom_adapter_mut().unwrap().create_element("holder");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut cache_frag, &holder);
    let mut holder2 = holder.clone();
    let stale_start = rue.get_dom_adapter_mut().unwrap().create_element("stale_start");
    // 注意：stale_start 挂在离线 fragment 的子树中，此时不应视为已连接
    rue.get_dom_adapter_mut().unwrap().append_child(&mut holder2, &stale_start);
    rue.range_map.push((stale_start, Some(stale_vnode)));

    // 执行一次渲染以触发 compact_range_map；应当丢弃过期区间并触发卸载，
    // 从而执行 cleanup（通过全局变量统计）
    let mut parent = rue.get_dom_adapter_mut().unwrap().create_document_fragment();
    let start = rue.get_dom_adapter_mut().unwrap().create_element("start");
    let end = rue.get_dom_adapter_mut().unwrap().create_element("end");
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &start);
    rue.get_dom_adapter_mut().unwrap().append_child(&mut parent, &end);
    let vnode_new = rue.create_element(VNodeType::Element("div".into()), None, vec![]);
    rue.render_between(vnode_new, &mut parent, start, end);

    let v = js_sys::eval("globalThis.__rue_compact_cleanup2").unwrap();
    assert_eq!(v.as_f64().unwrap() as i32, 1);

    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
}

#[wasm_bindgen_test]
/// clear_dom_between_anchors：当被删掉的是一个父节点时，也要同步清理它内部所有 nested range。
///
/// 历史泄漏路径：
/// - renderBetween miss 会先把 start/end 之间的旧 DOM 整段删掉；
/// - 但旧 range 的 start 锚点可能藏在这段 DOM 的更深层子树里，而不是直接 sibling；
/// - 若只按“当前 sibling 是否正好是 range.start”清理，深层 nested range 会漏掉，
///   后续只能靠 compact_range_map 被动发现，期间其 effect/scope 已经继续泄漏并参与调度。
fn clear_dom_between_anchors_unmounts_nested_ranges_inside_removed_subtree() {
    set_reactive_scheduling("sync");
    let _ = js_sys::eval("globalThis.__rue_nested_range_cleanup = 0;");

    let sig = create_signal(JsValue::from_f64(0.0), None);
    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let sig2 = sig.clone();

    let sid = create_effect_scope();
    push_effect_scope(sid);
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = sig2.get_js();

        let cleanup = Function::new_no_args(
            "globalThis.__rue_nested_range_cleanup = (globalThis.__rue_nested_range_cleanup || 0) + 1;",
        );
        on_cleanup(cleanup);
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = create_effect(f, None);
    cb.forget();
    pop_effect_scope();
    assert_eq!(*hits.borrow(), 1);

    let adapter = make_linked_adapter();
    let mut rue: Rue<JsDomAdapter> = Rue::new();
    rue.set_dom_adapter(JsDomAdapter::new(adapter.clone()));
    let mut props: HashMap<String, JsValue> = HashMap::new();
    props.insert("__rue_effect_scope_id".to_string(), JsValue::from_f64(sid as f64));
    let stale_vnode = rue.create_element(VNodeType::Vapor, Some(props), vec![]);

    let create_document_fragment = Reflect::get(&adapter, &JsValue::from_str("createDocumentFragment")).unwrap();
    let create_document_fragment = create_document_fragment.unchecked_into::<Function>();
    let create_element = Reflect::get(&adapter, &JsValue::from_str("createElement")).unwrap();
    let create_element = create_element.unchecked_into::<Function>();
    let append_child = Reflect::get(&adapter, &JsValue::from_str("appendChild")).unwrap();
    let append_child = append_child.unchecked_into::<Function>();

    let mut parent = create_document_fragment.call0(&adapter).unwrap();
    let start = create_element.call1(&adapter, &JsValue::from_str("start")).unwrap();
    let holder = create_element.call1(&adapter, &JsValue::from_str("holder")).unwrap();
    let end = create_element.call1(&adapter, &JsValue::from_str("end")).unwrap();
    let _ = append_child.call2(&adapter, &parent, &start);
    let _ = append_child.call2(&adapter, &parent, &holder);
    let _ = append_child.call2(&adapter, &parent, &end);
    update_siblings(&parent);

    let nested_start = create_element.call1(&adapter, &JsValue::from_str("nested_start")).unwrap();
    let _ = append_child.call2(&adapter, &holder, &nested_start);
    update_siblings(&holder);
    rue.range_map.push((nested_start, Some(stale_vnode)));

    let vnode_new = rue.create_element(VNodeType::Element("div".into()), None, vec![]);
    rue.render_between(vnode_new, &mut parent, start, end);

    let v = js_sys::eval("globalThis.__rue_nested_range_cleanup").unwrap();
    assert_eq!(v.as_f64().unwrap() as i32, 1);

    sig.set_js(JsValue::from_f64(1.0));
    assert_eq!(*hits.borrow(), 1);
}
