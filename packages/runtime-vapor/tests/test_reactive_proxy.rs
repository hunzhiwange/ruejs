use js_sys::{Array, Function, Object, Reflect};
use rue_runtime_vapor::hook::reactive::{props_reactive_js, shallow_equal_prop};
use rue_runtime_vapor::reactive::signal::create_reactive;
use rue_runtime_vapor::{create_effect, set_reactive_scheduling};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

/// 代理属性访问应订阅具体分支，而不是把所有中间层都订到根上。
#[wasm_bindgen_test]
fn reactive_nested_branch_update_does_not_rerun_sibling_effect() {
    set_reactive_scheduling("sync");

    let left = Object::new();
    Reflect::set(&left, &JsValue::from_str("count"), &JsValue::from_f64(1.0)).unwrap();
    let right = Object::new();
    Reflect::set(&right, &JsValue::from_str("count"), &JsValue::from_f64(2.0)).unwrap();
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("left"), &left).unwrap();
    Reflect::set(&root, &JsValue::from_str("right"), &right).unwrap();

    let state = create_reactive(root.into(), None);

    let left_hits = Rc::new(RefCell::new(0));
    let left_hits2 = left_hits.clone();
    let state_left = state.clone();
    let left_effect = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *left_hits2.borrow_mut() += 1;
        let left_branch = Reflect::get(&state_left, &JsValue::from_str("left")).unwrap();
        let _ = Reflect::get(&left_branch, &JsValue::from_str("count")).unwrap();
    }) as Box<dyn FnMut()>);
    let left_fn: Function = left_effect.as_ref().clone().into();
    let _left_handle = create_effect(left_fn, None);

    let right_hits = Rc::new(RefCell::new(0));
    let right_hits2 = right_hits.clone();
    let state_right = state.clone();
    let right_effect = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *right_hits2.borrow_mut() += 1;
        let right_branch = Reflect::get(&state_right, &JsValue::from_str("right")).unwrap();
        let _ = Reflect::get(&right_branch, &JsValue::from_str("count")).unwrap();
    }) as Box<dyn FnMut()>);
    let right_fn: Function = right_effect.as_ref().clone().into();
    let _right_handle = create_effect(right_fn, None);

    assert_eq!(*left_hits.borrow(), 1);
    assert_eq!(*right_hits.borrow(), 1);

    let left_branch = Reflect::get(&state, &JsValue::from_str("left")).unwrap();
    Reflect::set(&left_branch, &JsValue::from_str("count"), &JsValue::from_f64(10.0)).unwrap();

    assert_eq!(*left_hits.borrow(), 2);
    assert_eq!(*right_hits.borrow(), 1);

    left_effect.forget();
    right_effect.forget();
}

/// 对象代理：新增属性后，`ownKeys` 数量增加，且原始对象同步更新
#[wasm_bindgen_test]
fn reactive_object_mirror_keys_update_on_set() {
    let obj = Object::new();
    Reflect::set(&obj, &JsValue::from_str("a"), &JsValue::from_str("A")).unwrap();
    Reflect::set(&obj, &JsValue::from_str("b"), &JsValue::from_str("B")).unwrap();
    // 创建响应式代理，目标为普通对象
    let proxy = create_reactive(obj.clone().into(), None);
    // 读取代理的自有键数量
    let keys1 = js_sys::Reflect::own_keys(&proxy).unwrap_or(Array::new());
    assert_eq!(keys1.length(), 2);
    // 通过代理写入新属性
    Reflect::set(&proxy, &JsValue::from_str("c"), &JsValue::from_str("C")).unwrap();
    // 代理的键数量随之增加
    let keys2 = js_sys::Reflect::own_keys(&proxy).unwrap_or(Array::new());
    assert_eq!(keys2.length(), 3);
    // `__rue_raw__` 为原始 holder，验证原始对象同步更新
    let raw = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let c = js_sys::Reflect::get(&raw, &JsValue::from_str("c")).unwrap().as_string().unwrap();
    assert_eq!(c, "C");
}

/// 子数组代理：通过下标写入后，代理与原始 `items` 保持一致，并保留 `length`
#[wasm_bindgen_test]
fn reactive_array_child_proxy_mirror_updates_on_index_set() {
    let arr = Array::new();
    arr.push(&JsValue::from_str("x"));
    arr.push(&JsValue::from_str("y"));
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("items"), &arr.clone().into()).unwrap();
    // 根对象代理，子属性 `items` 为数组代理
    let proxy = create_reactive(root.clone().into(), None);
    let items = js_sys::Reflect::get(&proxy, &JsValue::from_str("items")).unwrap();
    // 数组下标键存在性
    let has0 = js_sys::Reflect::has(&items, &JsValue::from_f64(0.0)).unwrap();
    let has1 = js_sys::Reflect::has(&items, &JsValue::from_f64(1.0)).unwrap();
    assert!(has0 && has1);
    // 读取与写入数组项通过代理完成
    let v0 = js_sys::Reflect::get(&items, &JsValue::from_f64(0.0)).unwrap().as_string().unwrap();
    assert_eq!(v0, "x");
    js_sys::Reflect::set(&items, &JsValue::from_f64(0.0), &JsValue::from_str("z")).unwrap();
    let v0_2 = js_sys::Reflect::get(&items, &JsValue::from_f64(0.0)).unwrap().as_string().unwrap();
    assert_eq!(v0_2, "z");
    // 原始 holder 的数据同样已更新
    let raw = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_items = js_sys::Reflect::get(&raw, &JsValue::from_str("items")).unwrap();
    let raw_v0 =
        js_sys::Reflect::get(&raw_items, &JsValue::from_f64(0.0)).unwrap().as_string().unwrap();
    assert_eq!(raw_v0, "z");
    // `length` 等常规属性仍存在
    let has_len = js_sys::Reflect::has(&items, &JsValue::from_str("length")).unwrap();
    assert!(has_len);
}

/// 响应式数组方法：`indexOf(proxyChild)` 应命中原始数组项，随后 `splice` 应触发订阅更新
#[wasm_bindgen_test]
fn reactive_array_indexof_proxy_child_and_splice_trigger_effect() {
    set_reactive_scheduling("sync");

    let item_a = Object::new();
    Reflect::set(&item_a, &JsValue::from_str("label"), &JsValue::from_str("A")).unwrap();
    let item_b = Object::new();
    Reflect::set(&item_b, &JsValue::from_str("label"), &JsValue::from_str("B")).unwrap();

    let arr = Array::new();
    arr.push(&item_a.clone().into());
    arr.push(&item_b.clone().into());

    let items = create_reactive(arr.into(), None);

    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let items_for_effect = items.clone();
    let effect = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = Reflect::get(&items_for_effect, &JsValue::from_str("length")).unwrap();
    }) as Box<dyn FnMut()>);
    let effect_fn: Function = effect.as_ref().clone().into();
    let _handle = create_effect(effect_fn, None);

    assert_eq!(*hits.borrow(), 1);

    let first_item_proxy = Reflect::get(&items, &JsValue::from_f64(0.0)).unwrap();
    let index_of: Function = Reflect::get(&items, &JsValue::from_str("indexOf"))
        .unwrap()
        .unchecked_into();
    let idx = index_of.call1(&JsValue::NULL, &first_item_proxy).unwrap();
    assert_eq!(idx.as_f64().unwrap(), 0.0);

    let splice: Function = Reflect::get(&items, &JsValue::from_str("splice"))
        .unwrap()
        .unchecked_into();
    splice
        .call2(&JsValue::NULL, &JsValue::from_f64(0.0), &JsValue::from_f64(1.0))
        .unwrap();

    let len = Reflect::get(&items, &JsValue::from_str("length"))
        .unwrap()
        .as_f64()
        .unwrap();
    assert_eq!(len, 1.0);
    assert_eq!(*hits.borrow(), 2);

    effect.forget();
}

/// 响应式数组变异方法：`push` 应通过路径写入触发依赖更新，而不是只改原始数组引用
#[wasm_bindgen_test]
fn reactive_array_push_triggers_effect() {
    set_reactive_scheduling("sync");

    let arr = Array::new();
    arr.push(&JsValue::from_str("A"));
    let items = create_reactive(arr.into(), None);

    let hits = Rc::new(RefCell::new(0));
    let hits2 = hits.clone();
    let items_for_effect = items.clone();
    let effect = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let _ = Reflect::get(&items_for_effect, &JsValue::from_str("length")).unwrap();
    }) as Box<dyn FnMut()>);
    let effect_fn: Function = effect.as_ref().clone().into();
    let _handle = create_effect(effect_fn, None);

    assert_eq!(*hits.borrow(), 1);

    let push: Function = Reflect::get(&items, &JsValue::from_str("push"))
        .unwrap()
        .unchecked_into();
    push.call1(&JsValue::NULL, &JsValue::from_str("B")).unwrap();

    let len = Reflect::get(&items, &JsValue::from_str("length"))
        .unwrap()
        .as_f64()
        .unwrap();
    assert_eq!(len, 2.0);
    assert_eq!(*hits.borrow(), 2);

    effect.forget();
}

/// 响应式数组序列化：`JSON.stringify(proxy)` 在 effect 内应收集依赖，数组变更后重新执行
#[wasm_bindgen_test]
fn reactive_array_json_stringify_tracks_mutations() {
    set_reactive_scheduling("sync");

    let item_a = Object::new();
    Reflect::set(&item_a, &JsValue::from_str("label"), &JsValue::from_str("A")).unwrap();

    let arr = Array::new();
    arr.push(&item_a.clone().into());
    let items = create_reactive(arr.into(), None);

    let hits = Rc::new(RefCell::new(0));
    let last_json = Rc::new(RefCell::new(String::new()));
    let hits2 = hits.clone();
    let last_json2 = last_json.clone();
    let items_for_effect = items.clone();
    let effect = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let text = js_sys::JSON::stringify(&items_for_effect)
            .unwrap()
            .as_string()
            .unwrap_or_default();
        *last_json2.borrow_mut() = text;
    }) as Box<dyn FnMut()>);
    let effect_fn: Function = effect.as_ref().clone().into();
    let _handle = create_effect(effect_fn, None);

    assert_eq!(*hits.borrow(), 1);
    assert!(last_json.borrow().contains("\"A\""));

    let push: Function = Reflect::get(&items, &JsValue::from_str("push"))
        .unwrap()
        .unchecked_into();
    let item_b = Object::new();
    Reflect::set(&item_b, &JsValue::from_str("label"), &JsValue::from_str("B")).unwrap();
    push.call1(&JsValue::NULL, &item_b.into()).unwrap();

    assert_eq!(*hits.borrow(), 2);
    assert!(last_json.borrow().contains("\"B\""));

    effect.forget();
}

/// 原始值代理：`.value` 用于读写；`ownKeys` 隐藏，不暴露键
#[wasm_bindgen_test]
fn reactive_primitive_own_keys_hidden_value() {
    // 原始值代理：不暴露任何自有键
    let proxy = create_reactive(JsValue::from_str("A"), None);
    let keys1 = js_sys::Reflect::own_keys(&proxy).unwrap_or(Array::new());
    assert_eq!(keys1.length(), 0);
    // 通过 `.value` 读取当前值
    let v = js_sys::Reflect::get(&proxy, &JsValue::from_str("value")).unwrap().as_string().unwrap();
    assert_eq!(v, "A");
    // 写入 `.value` 更新原始值
    js_sys::Reflect::set(&proxy, &JsValue::from_str("value"), &JsValue::from_str("B")).unwrap();
    let v2 =
        js_sys::Reflect::get(&proxy, &JsValue::from_str("value")).unwrap().as_string().unwrap();
    assert_eq!(v2, "B");
    // 依旧不暴露任何键
    let keys2 = js_sys::Reflect::own_keys(&proxy).unwrap_or(Array::new());
    assert_eq!(keys2.length(), 0);
}

/// 方法调用的 `this` 绑定到原始 holder；代理写入后方法读取到最新值
#[wasm_bindgen_test]
fn reactive_method_this_binding_uses_holder() {
    let obj = Object::new();
    js_sys::Reflect::set(&obj, &JsValue::from_str("x"), &JsValue::from_f64(1.0)).unwrap();
    // 构造依赖 `this.x` 的方法，运行时 `this` 会绑定到原始 holder
    let getx = Function::new_with_args("", "return this.x");
    js_sys::Reflect::set(&obj, &JsValue::from_str("getX"), &getx).unwrap();
    let proxy = create_reactive(obj.clone().into(), None);
    let m: Function =
        js_sys::Reflect::get(&proxy, &JsValue::from_str("getX")).unwrap().unchecked_into();
    // 初次读取为 1
    let r1 = m.call0(&JsValue::NULL).unwrap().as_f64().unwrap();
    assert_eq!(r1, 1.0);
    // 通过代理修改 `x`，方法读取到最新值 2
    js_sys::Reflect::set(&proxy, &JsValue::from_str("x"), &JsValue::from_f64(2.0)).unwrap();
    let r2 = m.call0(&JsValue::NULL).unwrap().as_f64().unwrap();
    assert_eq!(r2, 2.0);
}

/// 代理的属性描述符应为可配置（`configurable=true`）；数组下标同样如此
#[wasm_bindgen_test]
fn reactive_get_own_property_descriptor_configurable_true() {
    let obj = Object::new();
    Reflect::set(&obj, &JsValue::from_str("a"), &JsValue::from_f64(1.0)).unwrap();
    let proxy = create_reactive(obj.into(), None);
    // 属性描述符 `configurable=true`，保证代理可继续拦截与更新
    let d = js_sys::Object::get_own_property_descriptor(
        &proxy.clone().unchecked_into::<Object>(),
        &JsValue::from_str("a"),
    );
    let cfg =
        js_sys::Reflect::get(&d, &JsValue::from_str("configurable")).unwrap().as_bool().unwrap();
    assert!(cfg);
    // 数组下标同样应为可配置
    let arr = Array::new();
    arr.push(&JsValue::from_str("x"));
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("items"), &arr.clone().into()).unwrap();
    let proxy2 = create_reactive(root.into(), None);
    let items = js_sys::Reflect::get(&proxy2, &JsValue::from_str("items")).unwrap();
    let d0 = js_sys::Object::get_own_property_descriptor(
        &items.clone().unchecked_into::<Object>(),
        &JsValue::from_f64(0.0),
    );
    let cfg0 =
        js_sys::Reflect::get(&d0, &JsValue::from_str("configurable")).unwrap().as_bool().unwrap();
    assert!(cfg0);

    let d_len = js_sys::Object::get_own_property_descriptor(
        &items.clone().unchecked_into::<Object>(),
        &JsValue::from_str("length"),
    );
    let cfg_len = js_sys::Reflect::get(&d_len, &JsValue::from_str("configurable"))
        .unwrap()
        .as_bool()
        .unwrap();
    assert!(!cfg_len);
}

/// propsReactive 包裹 reactive props 时，嵌套数组的 `length` 读取不应触发 Proxy 描述符错误
#[wasm_bindgen_test]
fn props_reactive_nested_array_length_accessible() {
    let children = Array::new();
    let child1 = Object::new();
    Reflect::set(&child1, &JsValue::from_str("name"), &JsValue::from_str("hello")).unwrap();
    let child2 = Object::new();
    Reflect::set(&child2, &JsValue::from_str("name"), &JsValue::from_str("world")).unwrap();
    children.push(&child1.into());
    children.push(&child2.into());

    let model = Object::new();
    Reflect::set(&model, &JsValue::from_str("name"), &JsValue::from_str("My Tree")).unwrap();
    Reflect::set(&model, &JsValue::from_str("children"), &children.clone().into()).unwrap();
    let model_proxy = create_reactive(model.into(), None);

    let props_obj = Object::new();
    Reflect::set(&props_obj, &JsValue::from_str("model"), &model_proxy).unwrap();
    Reflect::set(&props_obj, &JsValue::from_str("className"), &JsValue::from_str("item")).unwrap();
    Reflect::set(&props_obj, &JsValue::from_str("children"), &Array::new().into()).unwrap();

    let props = props_reactive_js(props_obj.into(), Some(true));
    let props_model = Reflect::get(&props, &JsValue::from_str("model")).unwrap();
    let props_children = Reflect::get(&props_model, &JsValue::from_str("children")).unwrap();
    let len = Reflect::get(&props_children, &JsValue::from_str("length"))
        .unwrap()
        .as_f64()
        .unwrap();

    assert_eq!(len, 2.0);
}

/// propsReactive 应保持 host-node renderable prop 为原始对象，避免渲染桥接对象被二次代理后失真。
#[wasm_bindgen_test]
fn props_reactive_keeps_host_node_prop_raw() {
    let host_node = Object::new();
    Reflect::set(
        &host_node,
        &JsValue::from_str("nodeType"),
        &JsValue::from_f64(1.0),
    )
    .unwrap();

    let renderable_owner = Object::new();
    Reflect::set(
        &renderable_owner,
        &JsValue::from_str("__rue_host_node"),
        &host_node.clone().into(),
    )
    .unwrap();

    let props_obj = Object::new();
    Reflect::set(&props_obj, &JsValue::from_str("header"), &renderable_owner).unwrap();
    Reflect::set(&props_obj, &JsValue::from_str("children"), &Array::new().into()).unwrap();

    let props = props_reactive_js(props_obj.into(), Some(true));
    let header = Reflect::get(&props, &JsValue::from_str("header")).unwrap();

    assert!(js_sys::Object::is(&header, &renderable_owner.clone().into()));

    let is_reactive = Reflect::get(&header, &JsValue::from_str("__isReactive__"))
        .unwrap_or(JsValue::FALSE)
        .as_bool()
        .unwrap_or(false);
    assert!(!is_reactive);

    let bridged_host = Reflect::get(&header, &JsValue::from_str("__rue_host_node")).unwrap();
    assert!(js_sys::Object::is(&bridged_host, &host_node.into()));
}

/// shallow_equal_prop 对可挂载值采用 host-node / DOM identity 优先，而不是旧的对象桥接结构判等。
#[wasm_bindgen_test]
fn shallow_equal_prop_prefers_host_node_identity() {
    let host = Object::new();
    Reflect::set(&host, &JsValue::from_str("nodeType"), &JsValue::from_f64(1.0)).unwrap();

    let left = Object::new();
    Reflect::set(&left, &JsValue::from_str("__rue_host_node"), &host.clone().into()).unwrap();
    Reflect::set(&left, &JsValue::from_str("type"), &JsValue::from_str("legacy-a")).unwrap();

    let right = Object::new();
    Reflect::set(&right, &JsValue::from_str("__rue_host_node"), &host.clone().into()).unwrap();
    Reflect::set(&right, &JsValue::from_str("type"), &JsValue::from_str("legacy-b")).unwrap();

    assert!(shallow_equal_prop(&left.clone().into(), &right.clone().into()));

    let other_host = Object::new();
    Reflect::set(&other_host, &JsValue::from_str("nodeType"), &JsValue::from_f64(1.0)).unwrap();
    let third = Object::new();
    Reflect::set(
        &third,
        &JsValue::from_str("__rue_host_node"),
        &other_host.clone().into(),
    )
    .unwrap();

    assert!(!shallow_equal_prop(&left.into(), &third.into()));
}

/// 只读代理：写入被拒绝（返回 false/不生效），原始快照保持不变
#[wasm_bindgen_test]
fn reactive_readonly_set_blocked_and_raw_unchanged() {
    let obj = Object::new();
    Reflect::set(&obj, &JsValue::from_str("a"), &JsValue::from_str("A")).unwrap();
    let opts = Object::new();
    Reflect::set(&opts, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).unwrap();
    let proxy = create_reactive(obj.into(), Some(opts.into()));
    // 只读代理：写入操作返回 false/不生效
    let ok =
        js_sys::Reflect::set(&proxy, &JsValue::from_str("a"), &JsValue::from_str("B")).unwrap();
    assert!(!ok);
    // 原始 holder 保持不变
    let raw = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let a = js_sys::Reflect::get(&raw, &JsValue::from_str("a")).unwrap().as_string().unwrap();
    assert_eq!(a, "A");
}

/// 浅代理：子对象不会被再代理，`__isReactive__` 为 false
#[wasm_bindgen_test]
fn reactive_shallow_child_not_proxy() {
    let nested = Object::new();
    Reflect::set(&nested, &JsValue::from_str("name"), &JsValue::from_str("A")).unwrap();
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("user"), &nested.clone().into()).unwrap();
    let opts = Object::new();
    Reflect::set(&opts, &JsValue::from_str("shallow"), &JsValue::from_bool(true)).unwrap();
    let proxy = create_reactive(root.into(), Some(opts.into()));
    // 浅代理只代理第一层；子对象不会被再次代理
    let user = js_sys::Reflect::get(&proxy, &JsValue::from_str("user")).unwrap();
    let flag = js_sys::Reflect::get(&user, &JsValue::from_str("__isReactive__"))
        .unwrap()
        .as_bool()
        .unwrap_or(false);
    assert!(!flag);
}

/// 数组变更方法（push/splice）在重新获取后体现到原始 holder 上
#[wasm_bindgen_test]
fn reactive_array_methods_push_splice_update_on_reget() {
    let arr = Array::new();
    arr.push(&JsValue::from_str("x"));
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("items"), &arr.clone().into()).unwrap();
    let proxy = create_reactive(root.into(), None);
    let items = js_sys::Reflect::get(&proxy, &JsValue::from_str("items")).unwrap();
    let push: Function =
        js_sys::Reflect::get(&items, &JsValue::from_str("push")).unwrap().unchecked_into();
    // push 添加元素，原始 holder 长度增加
    let _ = push.call1(&JsValue::NULL, &JsValue::from_str("y"));
    let raw1 = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_items1 = js_sys::Reflect::get(&raw1, &JsValue::from_str("items")).unwrap();
    let len1 = js_sys::Array::from(&raw_items1).length();
    assert_eq!(len1, 2);
    let items2 = js_sys::Reflect::get(&proxy, &JsValue::from_str("items")).unwrap();
    let splice: Function =
        js_sys::Reflect::get(&items2, &JsValue::from_str("splice")).unwrap().unchecked_into();
    // splice 删除一个元素
    let _ = splice.call2(&JsValue::NULL, &JsValue::from_f64(1.0), &JsValue::from_f64(1.0));
    let raw2 = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_items2 = js_sys::Reflect::get(&raw2, &JsValue::from_str("items")).unwrap();
    let len2 = js_sys::Array::from(&raw_items2).length();
    assert_eq!(len2, 1);
}

/// 将数组代理重新赋值回宿主对象后，仍应保留数组方法并写回原始 holder。
#[wasm_bindgen_test]
fn reactive_array_proxy_self_assignment_preserves_push() {
    let arr = Array::new();
    arr.push(&JsValue::from_str("x"));
    arr.push(&JsValue::from_str("y"));

    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("children"), &arr.clone().into()).unwrap();

    let proxy = create_reactive(root.into(), None);
    let children = Reflect::get(&proxy, &JsValue::from_str("children")).unwrap();
    Reflect::set(&proxy, &JsValue::from_str("children"), &children).unwrap();

    let push: Function = Reflect::get(&children, &JsValue::from_str("push"))
        .unwrap()
        .unchecked_into();
    push.call1(&JsValue::NULL, &JsValue::from_str("z")).unwrap();

    let raw = Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_children = Reflect::get(&raw, &JsValue::from_str("children")).unwrap();
    assert_eq!(Array::from(&raw_children).length(), 3);
}

/// 数组代理自赋值后，ownKeys 仍需满足 length 不变式，Object.keys 不应抛错。
#[wasm_bindgen_test]
fn reactive_array_proxy_self_assignment_keeps_length_in_ownkeys() {
    let arr = Array::new();
    arr.push(&JsValue::from_str("x"));
    arr.push(&JsValue::from_str("y"));

    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("children"), &arr.clone().into()).unwrap();

    let proxy = create_reactive(root.into(), None);
    let children = Reflect::get(&proxy, &JsValue::from_str("children")).unwrap();
    Reflect::set(&proxy, &JsValue::from_str("children"), &children).unwrap();

    let keys = js_sys::Reflect::own_keys(&children).unwrap();
    let mut has_length = false;
    for i in 0..keys.length() {
        if keys.get(i).as_string().as_deref() == Some("length") {
            has_length = true;
            break;
        }
    }
    assert!(has_length);

    let object_keys = js_sys::Object::keys(&children.clone().unchecked_into::<Object>());
    assert_eq!(object_keys.length(), 2);
}

/// 只读数组：变更方法（push）不应修改原始数据
#[wasm_bindgen_test]
fn reactive_readonly_array_methods_no_change() {
    let arr = Array::new();
    arr.push(&JsValue::from_str("x"));
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("items"), &arr.clone().into()).unwrap();
    let opts = Object::new();
    Reflect::set(&opts, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).unwrap();
    let proxy = create_reactive(root.into(), Some(opts.into()));
    let items = js_sys::Reflect::get(&proxy, &JsValue::from_str("items")).unwrap();
    let push: Function =
        js_sys::Reflect::get(&items, &JsValue::from_str("push")).unwrap().unchecked_into();
    // 只读数组：push 不应改变原始数据
    let _ = push.call1(&JsValue::NULL, &JsValue::from_str("y"));
    let raw1 = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_items1 = js_sys::Reflect::get(&raw1, &JsValue::from_str("items")).unwrap();
    let len1 = js_sys::Array::from(&raw_items1).length();
    assert_eq!(len1, 1);
}

/// 浅代理：读取建立在根对象上；直接改子属性不触发依赖/副作用
#[wasm_bindgen_test]
fn reactive_shallow_child_write_no_effect_and_no_subscription() {
    let nested = Object::new();
    Reflect::set(&nested, &JsValue::from_str("name"), &JsValue::from_str("A")).unwrap();
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("user"), &nested.clone().into()).unwrap();
    let opts = Object::new();
    Reflect::set(&opts, &JsValue::from_str("shallow"), &JsValue::from_bool(true)).unwrap();
    let proxy = create_reactive(root.into(), Some(opts.into()));
    let hits = std::rc::Rc::new(std::cell::RefCell::new(0));
    let hits2 = hits.clone();
    let p1 = proxy.clone();
    // effect 只在读取 `user.name` 时订阅根对象的路径，不订阅子对象本身
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
        *hits2.borrow_mut() += 1;
        let u = js_sys::Reflect::get(&p1, &JsValue::from_str("user")).unwrap();
        let n = js_sys::Reflect::get(&u, &JsValue::from_str("name")).unwrap();
        let _ = n.as_string().unwrap();
    }) as Box<dyn FnMut()>);
    let f: Function = cb.as_ref().clone().into();
    let _eh = rue_runtime_vapor::create_effect(f, None);
    assert_eq!(*hits.borrow(), 1);
    // 直接改子对象属性不触发 effect 重新执行
    let u2 = js_sys::Reflect::get(&proxy, &JsValue::from_str("user")).unwrap();
    let _ = js_sys::Reflect::set(&u2, &JsValue::from_str("name"), &JsValue::from_str("B"));
    assert_eq!(*hits.borrow(), 1);
    cb.forget();
}

/// 对比只读与浅代理：只读写入被拒且 keys 不变；浅代理子对象 keys 来自普通对象
#[wasm_bindgen_test]
fn reactive_ownkeys_readonly_shallow_differences() {
    // readonly：写入被拒绝且 keys 不变
    let obj = Object::new();
    Reflect::set(&obj, &JsValue::from_str("a"), &JsValue::from_str("A")).unwrap();
    let opts_ro = Object::new();
    Reflect::set(&opts_ro, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).unwrap();
    let proxy_ro = create_reactive(obj.clone().into(), Some(opts_ro.into()));
    let keys_before = js_sys::Reflect::own_keys(&proxy_ro).unwrap();
    let _ = js_sys::Reflect::set(&proxy_ro, &JsValue::from_str("b"), &JsValue::from_str("B"));
    let keys_after = js_sys::Reflect::own_keys(&proxy_ro).unwrap();
    assert_eq!(keys_before.length(), keys_after.length());

    // shallow：子对象非代理，ownKeys 来自普通对象
    let nested = Object::new();
    Reflect::set(&nested, &JsValue::from_str("name"), &JsValue::from_str("A")).unwrap();
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("user"), &nested.clone().into()).unwrap();
    let opts_sh = Object::new();
    Reflect::set(&opts_sh, &JsValue::from_str("shallow"), &JsValue::from_bool(true)).unwrap();
    let proxy_sh = create_reactive(root.into(), Some(opts_sh.into()));
    let user = js_sys::Reflect::get(&proxy_sh, &JsValue::from_str("user")).unwrap();
    let keys_user = js_sys::Reflect::own_keys(&user).unwrap();
    assert_eq!(keys_user.length(), 1);
}

/// 只读数组：pop/shift/unshift/sort/reverse 等变更不应影响原始
#[wasm_bindgen_test]
fn reactive_readonly_array_methods_pop_shift_unshift_sort_reverse_no_change() {
    let arr = Array::new();
    arr.push(&JsValue::from_str("b"));
    arr.push(&JsValue::from_str("a"));
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("items"), &arr.clone().into()).unwrap();
    let opts = Object::new();
    Reflect::set(&opts, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).unwrap();
    let proxy = create_reactive(root.into(), Some(opts.into()));
    let items = js_sys::Reflect::get(&proxy, &JsValue::from_str("items")).unwrap();
    let pop: Function =
        js_sys::Reflect::get(&items, &JsValue::from_str("pop")).unwrap().unchecked_into();
    let shift: Function =
        js_sys::Reflect::get(&items, &JsValue::from_str("shift")).unwrap().unchecked_into();
    let unshift: Function =
        js_sys::Reflect::get(&items, &JsValue::from_str("unshift")).unwrap().unchecked_into();
    let sort: Function =
        js_sys::Reflect::get(&items, &JsValue::from_str("sort")).unwrap().unchecked_into();
    let reverse: Function =
        js_sys::Reflect::get(&items, &JsValue::from_str("reverse")).unwrap().unchecked_into();
    let _ = pop.call0(&JsValue::NULL);
    let _ = shift.call0(&JsValue::NULL);
    let _ = unshift.call1(&JsValue::NULL, &JsValue::from_str("c"));
    let _ = sort.call0(&JsValue::NULL);
    let _ = reverse.call0(&JsValue::NULL);
    let raw = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_items = js_sys::Reflect::get(&raw, &JsValue::from_str("items")).unwrap();
    let len = js_sys::Array::from(&raw_items).length();
    assert_eq!(len, 2);
    let e0 =
        js_sys::Reflect::get(&raw_items, &JsValue::from_f64(0.0)).unwrap().as_string().unwrap();
    let e1 =
        js_sys::Reflect::get(&raw_items, &JsValue::from_f64(1.0)).unwrap().as_string().unwrap();
    assert_eq!(e0, "b");
    assert_eq!(e1, "a");
}

/// 只读数组：`fill` 与 `copyWithin` 对原始数据无影响
#[wasm_bindgen_test]
fn reactive_readonly_array_methods_fill_copywithin_no_change() {
    let arr = Array::new();
    arr.push(&JsValue::from_str("a"));
    arr.push(&JsValue::from_str("b"));
    arr.push(&JsValue::from_str("c"));
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("items"), &arr.clone().into()).unwrap();
    let opts = Object::new();
    Reflect::set(&opts, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).unwrap();
    let proxy = create_reactive(root.into(), Some(opts.into()));
    let items = js_sys::Reflect::get(&proxy, &JsValue::from_str("items")).unwrap();
    let fill: Function =
        js_sys::Reflect::get(&items, &JsValue::from_str("fill")).unwrap().unchecked_into();
    let copy_within: Function =
        js_sys::Reflect::get(&items, &JsValue::from_str("copyWithin")).unwrap().unchecked_into();
    let _ = fill.call2(&JsValue::NULL, &JsValue::from_str("z"), &JsValue::from_f64(0.0));
    let _ = copy_within.call2(&JsValue::NULL, &JsValue::from_f64(0.0), &JsValue::from_f64(1.0));
    let raw = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_items = js_sys::Reflect::get(&raw, &JsValue::from_str("items")).unwrap();
    let e0 =
        js_sys::Reflect::get(&raw_items, &JsValue::from_f64(0.0)).unwrap().as_string().unwrap();
    let e1 =
        js_sys::Reflect::get(&raw_items, &JsValue::from_f64(1.0)).unwrap().as_string().unwrap();
    let e2 =
        js_sys::Reflect::get(&raw_items, &JsValue::from_f64(2.0)).unwrap().as_string().unwrap();
    assert_eq!(e0, "a");
    assert_eq!(e1, "b");
    assert_eq!(e2, "c");
}

/// 只读 TypedArray：`fill`/`copyWithin` 不应更改原始缓冲区
#[wasm_bindgen_test]
fn reactive_readonly_typedarray_fill_copywithin_no_change() {
    // Uint8Array under readonly proxy: methods should not mutate raw
    let data = js_sys::Uint8Array::new_with_length(3);
    data.set_index(0, 1);
    data.set_index(1, 2);
    data.set_index(2, 3);
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("buf"), &data.clone().into()).unwrap();
    let opts = Object::new();
    Reflect::set(&opts, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).unwrap();
    let proxy = create_reactive(root.into(), Some(opts.into()));
    let buf = js_sys::Reflect::get(&proxy, &JsValue::from_str("buf")).unwrap();
    let fill: Function =
        js_sys::Reflect::get(&buf, &JsValue::from_str("fill")).unwrap().unchecked_into();
    let copy_within: Function =
        js_sys::Reflect::get(&buf, &JsValue::from_str("copyWithin")).unwrap().unchecked_into();
    let _ = fill.call1(&JsValue::NULL, &JsValue::from_f64(9.0));
    let _ = copy_within.call2(&JsValue::NULL, &JsValue::from_f64(0.0), &JsValue::from_f64(1.0));
    let raw = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_buf: js_sys::Uint8Array =
        js_sys::Reflect::get(&raw, &JsValue::from_str("buf")).unwrap().unchecked_into();
    assert_eq!(raw_buf.get_index(0), 1);
    assert_eq!(raw_buf.get_index(1), 2);
    assert_eq!(raw_buf.get_index(2), 3);
}

/// 只读 TypedArray：`sort` 不应更改原始缓冲区的内容顺序
#[wasm_bindgen_test]
fn reactive_readonly_typedarray_sort_no_change() {
    let data = js_sys::Uint8Array::new_with_length(3);
    data.set_index(0, 3);
    data.set_index(1, 1);
    data.set_index(2, 2);
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("buf"), &data.clone().into()).unwrap();
    let opts = Object::new();
    Reflect::set(&opts, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).unwrap();
    let proxy = create_reactive(root.into(), Some(opts.into()));
    let buf = js_sys::Reflect::get(&proxy, &JsValue::from_str("buf")).unwrap();
    let sort: Function =
        js_sys::Reflect::get(&buf, &JsValue::from_str("sort")).unwrap().unchecked_into();
    let _ = sort.call0(&JsValue::NULL);
    let raw = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_buf: js_sys::Uint8Array =
        js_sys::Reflect::get(&raw, &JsValue::from_str("buf")).unwrap().unchecked_into();
    assert_eq!(raw_buf.get_index(0), 3);
    assert_eq!(raw_buf.get_index(1), 1);
    assert_eq!(raw_buf.get_index(2), 2);
}

/// 只读 TypedArray：对子视图 `subarray` 调用 `set` 不影响原始缓冲区
#[wasm_bindgen_test]
fn reactive_readonly_typedarray_subarray_set_no_change() {
    let data = js_sys::Uint8Array::new_with_length(4);
    data.set_index(0, 1);
    data.set_index(1, 2);
    data.set_index(2, 3);
    data.set_index(3, 4);
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("buf"), &data.clone().into()).unwrap();
    let opts = Object::new();
    Reflect::set(&opts, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).unwrap();
    let proxy = create_reactive(root.into(), Some(opts.into()));
    let buf = js_sys::Reflect::get(&proxy, &JsValue::from_str("buf")).unwrap();
    let subarray: Function =
        js_sys::Reflect::get(&buf, &JsValue::from_str("subarray")).unwrap().unchecked_into();
    // sub = buf.subarray(1, 3)
    let sub =
        subarray.call2(&JsValue::NULL, &JsValue::from_f64(1.0), &JsValue::from_f64(3.0)).unwrap();
    let setf: Function =
        js_sys::Reflect::get(&sub, &JsValue::from_str("set")).unwrap().unchecked_into();
    let source = js_sys::Uint8Array::new_with_length(2);
    source.set_index(0, 9);
    source.set_index(1, 8);
    let _ = setf.call1(&JsValue::NULL, &source.into());
    let raw = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_buf: js_sys::Uint8Array =
        js_sys::Reflect::get(&raw, &JsValue::from_str("buf")).unwrap().unchecked_into();
    assert_eq!(raw_buf.get_index(0), 1);
    assert_eq!(raw_buf.get_index(1), 2);
    assert_eq!(raw_buf.get_index(2), 3);
    assert_eq!(raw_buf.get_index(3), 4);
}
/// 只读 TypedArray：先 `reverse` 再 `set`，原始缓冲区仍保持不变
#[wasm_bindgen_test]
fn reactive_readonly_typedarray_reverse_set_no_change() {
    let data = js_sys::Uint8Array::new_with_length(3);
    data.set_index(0, 1);
    data.set_index(1, 2);
    data.set_index(2, 3);
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("buf"), &data.clone().into()).unwrap();
    let opts = Object::new();
    Reflect::set(&opts, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).unwrap();
    let proxy = create_reactive(root.into(), Some(opts.into()));
    let buf = js_sys::Reflect::get(&proxy, &JsValue::from_str("buf")).unwrap();
    let reverse: Function =
        js_sys::Reflect::get(&buf, &JsValue::from_str("reverse")).unwrap().unchecked_into();
    let setf: Function =
        js_sys::Reflect::get(&buf, &JsValue::from_str("set")).unwrap().unchecked_into();
    let source = js_sys::Uint8Array::new_with_length(2);
    source.set_index(0, 9);
    source.set_index(1, 8);
    let _ = reverse.call0(&JsValue::NULL);
    let _ = setf.call2(&JsValue::NULL, &source.into(), &JsValue::from_f64(1.0));
    let raw = js_sys::Reflect::get(&proxy, &JsValue::from_str("__rue_raw__")).unwrap();
    let raw_buf: js_sys::Uint8Array =
        js_sys::Reflect::get(&raw, &JsValue::from_str("buf")).unwrap().unchecked_into();
    assert_eq!(raw_buf.get_index(0), 1);
    assert_eq!(raw_buf.get_index(1), 2);
    assert_eq!(raw_buf.get_index(2), 3);
}
