use js_sys::Function;
use rue_runtime_vapor::reactive::core::{create_effect_scope, pop_effect_scope, push_effect_scope};
use rue_runtime_vapor::{create_effect, create_signal, on_cleanup, set_reactive_scheduling};
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

use rue_runtime_vapor::{DomAdapter, Rue, VNodeType};

mod common;
use common::TestAdapter;

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
