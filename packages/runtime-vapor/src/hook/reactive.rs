// Reactive Hook 入口与对比工具：
// - 提供 shallow_equal_prop 帮助 props/children 比较；
// - 暴露 reactive/shallowReactive/readonly 等 JS API，并接入 Hook 插槽。
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::context::{get_current_instance, with_hook_slot};
use crate::reactive::signal::create_reactive as create_reactive_impl;

const RUE_HOST_NODE_KEY: &str = "__rue_host_node";

fn get_object_field(obj: &Object, key: &str) -> JsValue {
    Reflect::get(obj, &JsValue::from_str(key)).unwrap_or(JsValue::UNDEFINED)
}

fn is_dom_node_like(v: &JsValue) -> bool {
    if !v.is_object() {
        return false;
    }
    let obj: Object = v.clone().unchecked_into();
    let node_type = get_object_field(&obj, "nodeType");
    !node_type.is_undefined() && !node_type.is_null()
}

fn renderable_identity(v: &JsValue) -> Option<JsValue> {
    if is_dom_node_like(v) {
        return Some(v.clone());
    }

    if !v.is_object() {
        return None;
    }

    let obj: Object = v.clone().unchecked_into();
    let host_node = get_object_field(&obj, RUE_HOST_NODE_KEY);
    if !host_node.is_undefined() && !host_node.is_null() {
        return Some(host_node);
    }

    let nodes = get_object_field(&obj, "nodes");
    if Array::is_array(&nodes) {
        let arr = Array::from(&nodes);
        if arr.length() == 1 {
            let first = arr.get(0);
            if !first.is_undefined() && !first.is_null() {
                return Some(first);
            }
        }
    }

    None
}

fn is_block_instance_like(v: &JsValue) -> bool {
    if !v.is_object() {
        return false;
    }

    let obj: Object = v.clone().unchecked_into();
    let kind = get_object_field(&obj, "kind");
    let mount = get_object_field(&obj, "mount");
    kind.as_string().as_deref() == Some("block") && mount.is_function()
}

fn is_block_factory_like(v: &JsValue) -> bool {
    if !v.is_function() {
        return false;
    }

    let obj: Object = v.clone().unchecked_into();
    let kind = get_object_field(&obj, "kind");
    kind.as_string().as_deref() == Some("block-factory")
}

fn is_renderable_reference(v: &JsValue) -> bool {
    renderable_identity(v).is_some() || is_block_instance_like(v) || is_block_factory_like(v)
}

fn same_renderable_reference(a: &JsValue, b: &JsValue) -> bool {
    let a_identity = renderable_identity(a);
    let b_identity = renderable_identity(b);
    if a_identity.is_some() || b_identity.is_some() {
        return match (a_identity, b_identity) {
            (Some(left), Some(right)) => js_sys::Object::is(&left, &right),
            _ => false,
        };
    }

    if is_block_instance_like(a)
        || is_block_instance_like(b)
        || is_block_factory_like(a)
        || is_block_factory_like(b)
    {
        return js_sys::Object::is(a, b);
    }

    false
}

fn is_renderable_like(v: &JsValue) -> bool {
    if is_renderable_reference(v) {
        return true;
    }

    if !Array::is_array(v) {
        return false;
    }

    let arr = Array::from(v);
    let len = arr.length();
    let mut index = 0;
    while index < len {
        if !is_renderable_reference(&arr.get(index)) {
            return false;
        }
        index += 1;
    }

    true
}

// props / children 的浅相等判断：
// - 普通情况下退化为 Object.is；
// - 特别处理 Renderable / Renderable 数组的场景，优先用 DOM/host-node identity 来比；
// - 主要用于 propsReactive / sync_props_children，避免无意义更新。
pub fn shallow_equal_prop(a: &JsValue, b: &JsValue) -> bool {
    if js_sys::Object::is(a, b) {
        return true;
    }
    let a_is_arr = Array::is_array(a);
    let b_is_arr = Array::is_array(b);
    if a_is_arr && is_renderable_like(b) {
        let arr = Array::from(a);
        if arr.length() == 1 {
            let ai = arr.get(0);
            let bj = b.clone();
            if is_renderable_like(&ai) && is_renderable_like(&bj) {
                return same_renderable_reference(&ai, &bj);
            }
            return js_sys::Object::is(&ai, &bj);
        }
    }
    if b_is_arr && is_renderable_like(a) {
        let arr = Array::from(b);
        if arr.length() == 1 {
            let bi = arr.get(0);
            let aj = a.clone();
            if is_renderable_like(&bi) && is_renderable_like(&aj) {
                return same_renderable_reference(&bi, &aj);
            }
            return js_sys::Object::is(&bi, &aj);
        }
    }
    if a_is_arr && b_is_arr {
        let aa = Array::from(a);
        let bb = Array::from(b);
        if aa.length() != bb.length() {
            return false;
        }
        let len = aa.length();
        let mut i = 0;
        while i < len {
            let ai = aa.get(i);
            let bi = bb.get(i);
            if is_renderable_like(&ai) && is_renderable_like(&bi) {
                if !same_renderable_reference(&ai, &bi) {
                    return false;
                }
            } else if !js_sys::Object::is(&ai, &bi) {
                return false;
            }
            i += 1;
        }
        return true;
    }
    if is_renderable_like(a) && is_renderable_like(b) {
        return same_renderable_reference(a, b);
    }
    if is_dom_node_like(a) || is_dom_node_like(b) {
        return js_sys::Object::is(a, b);
    }
    if a.is_object() && b.is_object() {
        let ao: Object = a.clone().unchecked_into();
        let bo: Object = b.clone().unchecked_into();
        let ak = js_sys::Object::keys(&ao);
        let bk = js_sys::Object::keys(&bo);
        if ak.length() != bk.length() {
            return false;
        }
        let len = ak.length();
        let mut i = 0;
        while i < len {
            let k = ak.get(i);
            let key_str = match k.as_string() {
                Some(s) => s,
                None => {
                    i += 1;
                    continue;
                }
            };
            let key_js = JsValue::from_str(&key_str);
            let has = js_sys::Reflect::has(&bo, &key_js).unwrap_or(false);
            if !has {
                return false;
            }
            let av = js_sys::Reflect::get(&ao, &key_js).unwrap_or(JsValue::UNDEFINED);
            let bv = js_sys::Reflect::get(&bo, &key_js).unwrap_or(JsValue::UNDEFINED);
            if is_renderable_like(&av) && is_renderable_like(&bv) {
                if !same_renderable_reference(&av, &bv) {
                    return false;
                }
            } else if !js_sys::Object::is(&av, &bv) {
                return false;
            }
            i += 1;
        }
        return true;
    }
    false
}

#[wasm_bindgen(js_name = reactive)]
pub fn reactive_js(
    initial: JsValue,
    options: Option<JsValue>,
    force_global: Option<bool>,
) -> JsValue {
    // 将“创建 reactive 代理”的逻辑包装为函数，以便交给 Hook 插槽懒初始化/复用
    let make =
        Closure::wrap(Box::new(move || create_reactive_impl(initial.clone(), options.clone()))
            as Box<dyn FnMut() -> JsValue>);
    // 当没有当前组件实例或明确要求强制全局时，直接创建并返回
    let use_global = force_global.unwrap_or(false);
    let cur = get_current_instance();
    let res = if use_global || cur.is_undefined() || cur.is_null() {
        let f: Function = make.as_ref().clone().unchecked_into();
        f.call0(&JsValue::NULL).unwrap_or(JsValue::UNDEFINED)
    } else {
        // 否则在“当前组件实例的 Hook 槽位”上创建/复用，保证引用稳定
        let f: Function = make.as_ref().clone().unchecked_into();
        with_hook_slot(f)
    };
    make.forget();
    res
}

#[wasm_bindgen(js_name = shallowReactive)]
pub fn shallow_reactive_js(
    initial: JsValue,
    options: Option<JsValue>,
    force_global: Option<bool>,
) -> JsValue {
    // 在选项上标记 shallow=true，表示仅代理第一层属性
    let out_opts = if let Some(opts) = options {
        if opts.is_object() {
            let o: Object = opts.clone().unchecked_into();
            Reflect::set(&o, &JsValue::from_str("shallow"), &JsValue::from_bool(true)).ok();
            Some(opts)
        } else {
            let o = Object::new();
            Reflect::set(&o, &JsValue::from_str("shallow"), &JsValue::from_bool(true)).ok();
            Some(o.into())
        }
    } else {
        let o = Object::new();
        Reflect::set(&o, &JsValue::from_str("shallow"), &JsValue::from_bool(true)).ok();
        Some(o.into())
    };
    reactive_js(initial, out_opts, force_global)
}

#[wasm_bindgen(js_name = readonly)]
pub fn readonly_js(initial: JsValue, force_global: Option<bool>) -> JsValue {
    // 标记 readonly=true，表示代理只读（写入被忽略/禁止）
    let o = Object::new();
    Reflect::set(&o, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).ok();
    reactive_js(initial, Some(o.into()), force_global)
}

#[wasm_bindgen(js_name = shallowReadonly)]
pub fn shallow_readonly_js(initial: JsValue, force_global: Option<bool>) -> JsValue {
    // 只读 + 浅代理：顶层属性只读，子对象不递归代理
    let o = Object::new();
    Reflect::set(&o, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).ok();
    Reflect::set(&o, &JsValue::from_str("shallow"), &JsValue::from_bool(true)).ok();
    reactive_js(initial, Some(o.into()), force_global)
}

#[wasm_bindgen(js_name = propsReactive)]
pub fn props_reactive_js(initial: JsValue, force_global: Option<bool>) -> JsValue {
    let opts = Object::new();
    Reflect::set(&opts, &JsValue::from_str("readonly"), &JsValue::from_bool(true)).ok();
    // 组件 props 应保持浅只读：顶层访问可追踪，DOM/raw value/已有 reactive 值按原样透传。
    Reflect::set(&opts, &JsValue::from_str("shallow"), &JsValue::from_bool(true)).ok();
    let eq = Closure::wrap(Box::new(move |prev: JsValue, next: JsValue| -> bool {
        shallow_equal_prop(&prev, &next)
    }) as Box<dyn FnMut(JsValue, JsValue) -> bool>);
    let f: &Function = eq.as_ref().unchecked_ref();
    Reflect::set(&opts, &JsValue::from_str("equals"), f).ok();
    let res = reactive_js(initial, Some(opts.into()), force_global);
    eq.forget();
    res
}

#[wasm_bindgen(typescript_custom_section)]
const TS_REACTIVE_DECL: &'static str = r#"
/**
 * 创建 Reactive：返回一个对象/数组的响应式代理（深/浅、只读可选）
 *
 * 用法（JavaScript / TypeScript）：
 * ```ts
 * // 基础对象：读取与写入都响应式
 * const state = reactive({ user: { name: 'A' }, items: ['x'] })
 * console.log(state.user.name)     // 'A'
 * state.user.name = 'B'            // 写入嵌套字段，触发订阅者
 * state.items.push('y')            // 数组写入也可触发（通过路径写入实现不可变更新）
 *
 * // 在 Vapor JSX 中使用（自动 DOM 更新）
 * // <span>{state.user.name}</span>
 * // <input value={state.user.name} onInput={e => state.user.name = e.target.value} />
 *
 * // 只读代理：禁止写入
 * const ro = reactive({ a: 1 }, { readonly: true })
 * // ro.a = 2 // 将被忽略或导致失败（只读）
 *
 * // 浅代理：仅对顶层对象进行代理，子对象不递归代理
 * const sh = reactive({ nested: { a: 1 } }, { shallow: true })
 * // sh.nested 仍为普通对象（非代理）
 *
 * // 原始类型：普通值会自动包裹为 { value } 并返回其代理
 * const num = reactive(0)
 * console.log(num.value)       // 0
 * num.value = 1               // 写入 value 字段触发订阅者
 * const str = reactive('A')
 * str.value = 'B'             // 原始类型统一通过 value 字段读写
 *
 * // 自定义等值比较：用于控制触发频率
 * const eq = (prev: any, next: any) => _.isEqual(prev, next)
 * const obj = reactive({ a: 1 }, { equals: eq })
 * obj.a = 1 // 不触发（相等）
 * ```
 */
export function reactive<T extends Primitive>(
  initial: T,
  options?: ReactiveOptions<T>,
  forceGlobal?: boolean,
): { value: Widen<T> }
export function reactive<T extends object | Function>(
  initial: T,
  options?: ReactiveOptions<T>,
  forceGlobal?: boolean,
): T
export function reactive<T = any>(
  initial: T,
  options?: ReactiveOptions<T>,
  forceGlobal?: boolean,
): any

/**
 * 创建 Reactive：返回一个对象/数组的响应式代理（浅）
 *
 * 用法（JavaScript / TypeScript）：
 * ```ts
 * // 只读代理：禁止写入
 * const ro = shallowReactive({ a: 1 })
 * // ro.a = 2 // 将被忽略或导致失败（只读）
 *
 * // 浅代理：仅对顶层对象进行代理，子对象不递归代理
 * const sh = shallowReactive({ nested: { a: 1 } })
 * // sh.nested 仍为普通对象（非代理）
 *
 * // 自定义等值比较：用于控制触发频率
 * const eq = (prev: any, next: any) => _.isEqual(prev, next)
 * const obj = shallowReactive({ a: 1 }, { equals: eq })
 * obj.a = 1 // 不触发（相等）
 * ```
 */
export function shallowReactive<T extends object>(
  initial: T,
  options?: { equals?: Equals<T> },
  forceGlobal?: boolean,
): T

/**
 * 创建 Reactive：返回一个对象/数组的响应式代理（深度只读）
 *
 * 用法（JavaScript / TypeScript）：
 * ```ts
 * // 只读代理：禁止写入
 * const ro = readonly({ a: 1 })
 * // ro.a = 2 // 将被忽略或导致失败（只读）
 * ```
 */
export function readonly<T extends object>(initial: T, forceGlobal?: boolean): T

/**
 * 创建 Reactive：返回一个对象/数组的响应式代理（第一层只读）
 *
 * 用法（JavaScript / TypeScript）：
 * ```ts
 * // 只读代理：禁止写入
 * const ro = readonly({ a: 1, b: {hello: 'world'} })
 * // ro.a = 2 // 将被忽略或导致失败（只读）
 * // ro.hello = 'new world' // 成功
 * ```
 */
export function shallowReadonly<T extends object>(initial: T, forceGlobal?: boolean): T
"#;
