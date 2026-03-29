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

// 粗判一个值是否“长得像 VNode”（用于 props/children 的浅比对）：
// - 显式标记 __isVNode__，或带 __rue_vnode_id；
// - 或者至少有 type 字段（JSX/h 返回的开发态对象）。
fn is_vnode_like(v: &JsValue) -> bool {
    if !v.is_object() {
        return false;
    }
    let obj: Object = v.clone().unchecked_into();
    let flag = Reflect::get(&obj, &JsValue::from_str("__isVNode__")).unwrap_or(JsValue::UNDEFINED);
    if flag.as_bool().unwrap_or(false) {
        return true;
    }
    let id = Reflect::get(&obj, &JsValue::from_str("__rue_vnode_id")).unwrap_or(JsValue::UNDEFINED);
    if !id.is_undefined() && !id.is_null() {
        return true;
    }
    let ty = Reflect::get(&obj, &JsValue::from_str("type")).unwrap_or(JsValue::UNDEFINED);
    if !ty.is_undefined() && !ty.is_null() {
        return true;
    }
    false
}

// 比较两个 VNode-like 对象是否代表“同一个虚拟节点”：
// - 仅比较 type 与 key，忽略 props/children 的具体内容；
// - 对应 Vue/React 中的“同 key 同 type 可复用”策略。
fn same_vnode(a: &JsValue, b: &JsValue) -> bool {
    if !a.is_object() || !b.is_object() {
        return false;
    }
    let ao: Object = a.clone().unchecked_into();
    let bo: Object = b.clone().unchecked_into();
    let at = Reflect::get(&ao, &JsValue::from_str("type")).unwrap_or(JsValue::UNDEFINED);
    let bt = Reflect::get(&bo, &JsValue::from_str("type")).unwrap_or(JsValue::UNDEFINED);
    if !js_sys::Object::is(&at, &bt) {
        return false;
    }
    let ak = Reflect::get(&ao, &JsValue::from_str("key")).unwrap_or(JsValue::UNDEFINED);
    let bk = Reflect::get(&bo, &JsValue::from_str("key")).unwrap_or(JsValue::UNDEFINED);
    js_sys::Object::is(&ak, &bk)
}

// props / children 的浅相等判断：
// - 普通情况下退化为 Object.is；
// - 特别处理 VNode / VNode 数组的场景，尽量用 same_vnode 来比；
// - 主要用于 propsReactive / sync_props_children，避免无意义更新。
pub fn shallow_equal_prop(a: &JsValue, b: &JsValue) -> bool {
    if js_sys::Object::is(a, b) {
        return true;
    }
    let a_is_arr = Array::is_array(a);
    let b_is_arr = Array::is_array(b);
    if a_is_arr && is_vnode_like(b) {
        let arr = Array::from(a);
        if arr.length() == 1 {
            let ai = arr.get(0);
            let bj = b.clone();
            if is_vnode_like(&ai) && is_vnode_like(&bj) {
                return same_vnode(&ai, &bj);
            }
            return js_sys::Object::is(&ai, &bj);
        }
    }
    if b_is_arr && is_vnode_like(a) {
        let arr = Array::from(b);
        if arr.length() == 1 {
            let bi = arr.get(0);
            let aj = a.clone();
            if is_vnode_like(&bi) && is_vnode_like(&aj) {
                return same_vnode(&bi, &aj);
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
            if is_vnode_like(&ai) && is_vnode_like(&bi) {
                if !same_vnode(&ai, &bi) {
                    return false;
                }
            } else if !js_sys::Object::is(&ai, &bi) {
                return false;
            }
            i += 1;
        }
        return true;
    }
    if is_vnode_like(a) && is_vnode_like(b) {
        return same_vnode(a, b);
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
            if is_vnode_like(&av) && is_vnode_like(&bv) {
                if !same_vnode(&av, &bv) {
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
