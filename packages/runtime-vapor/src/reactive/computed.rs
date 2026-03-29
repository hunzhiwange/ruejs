/*
计算属性：根据回调计算值并写入内部信号

设计说明：
- 计算属性本质上是一个只读信号，其值由一个计算函数 `cb()` 得到。
- 当计算过程中读取其他信号时，这些信号会被自动收集为依赖；一旦依赖变化，
  我们通过副作用重新运行 `cb()` 并更新计算属性的值。

Rust 结构选择：
- 仍然采用 `SignalHandle` 承载计算结果，让外部以统一的 API（`get/peek`）读取。
- 用一个副作用 `create_effect(set_fn)` 驱动计算逻辑；避免在设置时手动维护订阅关系，
  依赖由运行时的 `CURRENT_EFFECT` 与 `Signal.get` 自动完成。

性能与等值比较：
- 计算结果在更新前会进行等值比较（默认 `Object.is`，也可通过自定义 `equals` 扩展）。
  只有在值发生实际变化时才通知订阅者，减少不必要的副作用触发。
*/

// 当依赖的信号变化时，通过副作用自动重新计算并通知订阅者。
use js_sys::{Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::core::{EFFECTS, Signal, schedule_effect_run};
use crate::reactive::effect::create_effect;
use crate::reactive::signal::SignalHandle;

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
            equals: None,
            setter: setter_opt,
        })),
    };
    let s_clone = sig.inner.clone();
    let set_fn = {
        let s = s_clone.clone();
        Closure::wrap(Box::new(move || {
            // 运行计算函数并比较是否变化
            let v = cb.call0(&JsValue::NULL).unwrap_or(JsValue::UNDEFINED);
            let mut inner = s.borrow_mut();
            let changed = if let Some(eq) = &inner.equals {
                let res = eq.call2(&JsValue::NULL, &inner.value, &v).unwrap_or(JsValue::FALSE);
                !res.as_bool().unwrap_or(false)
            } else {
                // 默认比较：Object.is(prev, next)
                !Object::is(&inner.value, &v)
            };
            inner.value = v;
            if changed {
                let mut to_run: Vec<usize> = Vec::new();
                EFFECTS.with(|m| {
                    let map = m.borrow();
                    inner.subs.retain(|id| {
                        if let Some(e) = map.get(id) {
                            if !e.disposed {
                                to_run.push(*id);
                                true
                            } else {
                                false
                            }
                        } else {
                            false
                        }
                    });
                });
                drop(inner);
                for id in to_run {
                    // 逐个调度副作用；调度策略由 core.rs 决定（同步或微任务）
                    schedule_effect_run(id);
                }
            }
        }) as Box<dyn FnMut()>)
    };
    let f_js: JsValue = set_fn.as_ref().clone();
    let func: Function = f_js.dyn_into().unwrap();
    // 通过副作用驱动首次计算与后续依赖变更时的重计算
    let _eh = create_effect(func, None);
    set_fn.forget();
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
