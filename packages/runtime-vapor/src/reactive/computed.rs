/*
计算属性：lazy + dirty cache

设计说明：
- 计算属性仍然表现为只读信号，但不再在依赖变化时 eager 重算。
- 首次 `get/peek/getPath/peekPath` 读取时才执行 getter，并缓存结果。
- 依赖变化时只将 computed 标记为 dirty，并唤醒订阅它的 effect；
    真正的重算延迟到下一次读取发生时再执行。

这样可以把“源数据高频变化”与“派生值真正被消费”拆开，减少像 SVGGraph 拖动时的纯计算风暴。
*/

use js_sys::{Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::core::{ComputedState, Signal, schedule_effect_run};
use crate::reactive::effect::create_effect;
use crate::reactive::signal::{SignalHandle, collect_affected_subscribers};

/// 创建计算属性
/// - 参数：可为函数 `() => any`，或对象 `{ get: () => any }`
/// 返回：一个只读信号句柄（通过 get/peek 读取，内部通过 effect 驱动更新）
/// 示例（JavaScript）：
/// ```javascript
/// const { createSignal, createComputed, createEffect } = wasmModule;
/// const count = createSignal(1);
/// const double = createComputed(() => count.get() * 2);
///
/// createEffect(() => {
///   console.log('double =', double.get());
/// });
///
/// count.set(2); // double 将变为 4 并触发订阅者
/// ```
/// 更多用法示例：
///
/// 1) 对象参数（只读 getter）：
/// ```javascript
/// const { createSignal, createComputed, createEffect } = wasmModule;
/// const first = createSignal('John');
/// const last = createSignal('Doe');
/// const fullName = createComputed({
///   get: () => first.get() + ' ' + last.get()
/// });
/// createEffect(() => {
///   console.log('fullName =', fullName.get()); // John Doe
/// });
/// ```
///
/// 2) 通过更新源信号实现“可写效果”（模拟 Vue3 的 setter 行为）：
/// ```javascript
/// const setFullName = (nv) => {
///   const [f, l] = nv.split(' ');
///   first.set(f);
///   last.set(l);
/// };
/// setFullName('David Smith'); // fullName 将变为 "David Smith"
/// ```
///
/// 3) 直接使用 `{ get, set }` 创建“可写 computed”，支持 `.set(value)`：
/// ```javascript
/// const fullName = createComputed({
///   get: () => first.get() + ' ' + last.get(),
///   set: (nv) => {
///     const [f, l] = nv.split(' ');
///     first.set(f);
///     last.set(l);
///   }
/// });
/// fullName.set('David Smith'); // 将调用你的 set 更新源信号，并重算派生值
/// ```
#[wasm_bindgen(js_name = createComputed)]
pub fn create_computed(arg: JsValue) -> SignalHandle {
    // 统一解析：支持函数或 { get } 对象
    let cb: Function = if let Some(f) = arg.dyn_ref::<Function>() {
        f.clone()
    } else if arg.is_object() {
        let get = Reflect::get(&arg, &JsValue::from_str("get")).unwrap_or(JsValue::UNDEFINED);
        if let Some(f) = get.dyn_ref::<Function>() {
            f.clone()
        } else {
            let clo =
                Closure::wrap(Box::new(move || JsValue::UNDEFINED) as Box<dyn FnMut() -> JsValue>);
            let f_js: JsValue = clo.as_ref().clone();
            let func: Function = f_js.dyn_into().unwrap();
            clo.forget();
            func
        }
    } else {
        let clo =
            Closure::wrap(Box::new(move || JsValue::UNDEFINED) as Box<dyn FnMut() -> JsValue>);
        let f_js: JsValue = clo.as_ref().clone();
        let func: Function = f_js.dyn_into().unwrap();
        clo.forget();
        func
    };
    let setter_opt = if arg.is_object() {
        let set = Reflect::get(&arg, &JsValue::from_str("set")).unwrap_or(JsValue::UNDEFINED);
        if let Some(f) = set.dyn_ref::<Function>() { Some(f.clone()) } else { None }
    } else {
        None
    };
    let sig = SignalHandle {
        inner: std::rc::Rc::new(std::cell::RefCell::new(Signal {
            value: JsValue::UNDEFINED,
            subs: Default::default(),
            // computed 最终也表现为一个可被路径读取的 signal，
            // 因此这里与普通 signal 保持同样的数据结构，避免下游路径订阅逻辑分叉。
            path_subs: Default::default(),
            equals: None,
            setter: setter_opt,
            computed: Some(ComputedState {
                effect_id: None,
                dirty: true,
                initialized: false,
                evaluating: false,
            }),
        })),
    };
    let s_clone = sig.inner.clone();
    let eval_fn = {
        let s = s_clone.clone();
        Closure::wrap(Box::new(move || {
            let v = cb.call0(&JsValue::NULL).unwrap_or(JsValue::UNDEFINED);
            let mut inner = s.borrow_mut();
            inner.value = v;
            if let Some(computed) = inner.computed.as_mut() {
                computed.initialized = true;
                computed.dirty = false;
            }
        }) as Box<dyn FnMut()>)
    };
    let mark_dirty_scheduler = {
        let handle = sig.clone();
        Closure::wrap(Box::new(move |_run: JsValue| {
            let to_run = {
                let mut inner = handle.inner.borrow_mut();
                let Some(computed) = inner.computed.as_mut() else {
                    return JsValue::UNDEFINED;
                };
                if computed.dirty {
                    return JsValue::UNDEFINED;
                }
                computed.dirty = true;
                collect_affected_subscribers(&mut inner, None)
            };
            for id in to_run {
                schedule_effect_run(id);
            }
            JsValue::UNDEFINED
        }) as Box<dyn FnMut(JsValue) -> JsValue>)
    };
    let f_js: JsValue = eval_fn.as_ref().clone();
    let func: Function = f_js.dyn_into().unwrap();
    let scheduler_js: JsValue = mark_dirty_scheduler.as_ref().clone();
    let scheduler_fn: Function = scheduler_js.dyn_into().unwrap();
    let opts = Object::new();
    let _ = Reflect::set(&opts, &JsValue::from_str("scheduler"), &scheduler_fn);
    let _ = Reflect::set(&opts, &JsValue::from_str("lazy"), &JsValue::from_bool(true));
    let eh = create_effect(func, Some(opts.into()));
    {
        let mut inner = sig.inner.borrow_mut();
        if let Some(computed) = inner.computed.as_mut() {
            computed.effect_id = Some(eh.id);
        }
    }
    eval_fn.forget();
    mark_dirty_scheduler.forget();
    sig
}

#[wasm_bindgen(typescript_custom_section)]
const TS_COMPUTED_DECL: &'static str = r#"
/**
 * 只读信号句柄：仅提供 get/peek 方法，不支持 set/update
 */
export interface ReadonlySignal<T> { get(): T; peek(): T }

/**
 * 可写信号句柄：提供 get/peek/set/update 方法
 */
export interface WritableSignal<T> extends ReadonlySignal<T> {
  set(value: T): void;
  update?(updater: (current: T) => T): void;
}

/**
 * 计算属性 getter 函数类型：`() => any`
 */
export type ComputedGetter<T> = () => T;

/**
 * 计算属性 setter 函数类型：`(value: T) => void`
 */
export type ComputedSetter<T> = (value: T) => void;

/**
 * 计算属性选项：{ get: ComputedGetter<T>, set?: ComputedSetter<T> }
 */
export interface ComputedOptions<T> { get: ComputedGetter<T>; set?: ComputedSetter<T> }

/**
 * 创建计算属性
 * - 参数：可为函数 `() => any`，或对象 `{ get: () => any }`
 * 返回：一个只读信号句柄（通过 get/peek 读取，内部通过 effect 驱动更新）
 * 示例（JavaScript）：
 * ```javascript
 * const { createSignal, createComputed, createEffect } = wasmModule;
 * const count = createSignal(1);
 * const double = createComputed(() => count.get() * 2);
 *
 * createEffect(() => {
 *   console.log('double =', double.get());
 * });
 *
 * count.set(2); // double 将变为 4 并触发订阅者
 * ```
 * 更多用法示例：
 *
 * 1) 对象参数（只读 getter）：
 * ```javascript
 * const { createSignal, createComputed, createEffect } = wasmModule;
 * const first = createSignal('John');
 * const last = createSignal('Doe');
 * const fullName = createComputed({
 *   get: () => first.get() + ' ' + last.get()
 * });
 * createEffect(() => {
 *   console.log('fullName =', fullName.get()); // John Doe
 * });
 * ```
 *
 * 2) 通过更新源信号实现“可写效果”（模拟 Vue3 的 setter 行为）：
 * ```javascript
 * const setFullName = (nv) => {
 *   const [f, l] = nv.split(' ');
 *   first.set(f);
 *   last.set(l);
 * };
 * setFullName('David Smith'); // fullName 将变为 "David Smith"
 * ```
 *
 * 3) 直接使用 `{ get, set }` 创建“可写 computed”，支持 `.set(value)`：
 * ```javascript
 * const fullName = createComputed({
 *   get: () => first.get() + ' ' + last.get(),
 *   set: (nv) => {
 *     const [f, l] = nv.split(' ');
 *     first.set(f);
 *     last.set(l);
 *   }
 * });
 * fullName.set('David Smith'); // 将调用你的 set 更新源信号，并重算派生值
 * ```
 */
export function createComputed<T>(get: ComputedGetter<T>): ReadonlySignal<T>;
export function createComputed<T>(options: ComputedOptions<T>): WritableSignal<T>;
export function createComputed<T>(arg: ComputedGetter<T> | ComputedOptions<T>): ReadonlySignal<T> | WritableSignal<T>;
"#;
