/*
副作用模块：创建、调度与清理

整体设计与动机：
- 我们实现的是一个“响应式系统”的副作用层，类似 Vue/Solid 中的 `effect`/`watchEffect`。
- 当一个副作用运行时，它会读取若干信号（Signal）。读取发生的瞬间，副作用会被“订阅”到这些信号上。
  当信号值变更后，订阅了该信号的副作用就会被重新调度执行，从而更新 UI 或进行其他逻辑。

为什么用当前的 Rust 结构？
- `EffectHandle` 只是一个包含 id 的句柄，方便 JS 持有并销毁。Rust 端实际的副作用数据结构放在
  `reactive/core.rs` 的线程局部存储里（`EFFECTS`）。这样可以避免跨语言复杂的所有权转移问题，
  并将“全局运行时”集中到一个地方。
- 我们使用 `wasm_bindgen` 将副作用回调暴露为 `js_sys::Function`，而非使用原生 Rust 闭包，
  因为副作用体通常来自 JS（例如应用逻辑）。在运行时，我们通过 `.call0()` 调用它并捕获依赖。
- “自定义调度器（scheduler）”是为了适配前端生态中的各种调度策略：有时希望在 `requestAnimationFrame`
  或 `MessageChannel` 等时机运行；有时则希望同步立即运行，或统一走微任务合并。这些在 JS 环境里更灵活，
  因此这里把调度权交给 JS 提供的函数。

核心行为与保证：
- 创建副作用时会注册到全局映射并分配一个 id；默认立即执行一次，用于建立依赖。
- 每次执行副作用之前会先跑“清理函数”（例如取消订阅上一轮的事件或释放资源）。
- 支持“批量更新”：在 `batch()` 范围内的信号改变只入队，不会立即触发副作用；批量结束后统一刷新，
  既提升性能，也保证中间状态不被观察到。
*/

// 暴露 `EffectHandle` 以在 JS 侧控制副作用生命周期，并提供批量更新机制。
use js_sys::{Function, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::core::{
    CURRENT_EFFECT, EFFECTS, Effect, NEXT_EFFECT_ID, current_effect_scope, dispose_effect,
    register_effect_in_scope, run_effect,
};

#[wasm_bindgen]
pub struct EffectHandle {
    pub(crate) id: usize,
}

/// 副作用句柄
/// 通过该句柄可以在 JS 侧主动销毁副作用（停止后续运行）
///
/// 用法（JavaScript）：
/// ```js
/// // 创建副作用，返回句柄
/// const eh = createEffect(() => {
///   // 在此读取信号将建立订阅；变化时该副作用会重跑
///   // 可以在此注册清理逻辑，以释放资源或取消订阅
///   onCleanup(() => {
///     // 该清理在下一次运行前或主动 dispose() 时执行一次
///   })
/// })
///
/// // 主动销毁：停止后续运行，并执行最后一次已注册的清理
/// eh.dispose()
/// ```
#[wasm_bindgen]
impl EffectHandle {
    /// 销毁副作用：标记为已处置，并清空其清理回调
    ///
    /// 用法（JavaScript）：
    /// ```js
    /// const eh = createEffect(() => {
    ///   // ...effect body
    ///   onCleanup(() => {
    ///     // 这里注册的清理会在下一次执行前或 dispose() 时运行
    ///   })
    /// })
    /// // 需要停止该副作用时：
    /// eh.dispose() // 标记为已处置，并执行最后一次已注册的清理
    /// ```
    #[wasm_bindgen(js_name = dispose)]
    pub fn dispose_js(&self) {
        // 这里走统一的 dispose_effect：
        // - 从 EFFECTS 移除，避免后续调度再次命中该 id
        // - 执行所有已注册 cleanups（包括 dispose/unmount 时的最后一次释放）
        //
        // 说明：Signal 的 subs 会在下一次 set 时自动把已处置/不存在的 id 清理掉（见 signal.rs 的 retain 逻辑）。
        dispose_effect(self.id);
    }
}

/// 创建副作用（立即运行一次），并返回句柄
/// 示例（JavaScript）：
/// ```javascript
/// const { createSignal, createEffect, onCleanup, untrack, batch } = wasmModule;
/// const s = createSignal(0);
///
/// // 基本副作用：读取信号并打印
/// createEffect(() => {
///   console.log('value:', s.get());
/// });
/// s.set(1);
///
/// // 清理示例：注册定时器并在下一次运行前清理
/// createEffect(() => {
///   const id = setInterval(() => console.log('tick'), 1000);
///   onCleanup(() => clearInterval(id));
/// });
///
/// // 断开依赖收集：不会订阅 other 信号
/// createEffect(() => {
///   const v = untrack(() => s.get());
///   console.log('untracked:', v);
/// });
///
/// 创建副作用（支持自定义调度器与懒执行）
/// options:
/// - scheduler: Function( run: Function )，用于自定义何时调用 run
/// - lazy: bool，true 时不在创建时立即运行
/// 示例（JavaScript）：
/// ```javascript
/// const { createEffect } = wasmModule;
/// const scheduler = (run) => queueMicrotask(run); // 或者使用 requestAnimationFrame
/// createEffect(() => {
///   // ...effect body
/// }, { scheduler, lazy: false });
/// ```
#[wasm_bindgen(js_name = createEffect)]
pub fn create_effect(cb: Function, options: Option<JsValue>) -> EffectHandle {
    let id = NEXT_EFFECT_ID.with(|n| {
        let mut v = n.borrow_mut();
        let id = *v;
        *v += 1;
        id
    });
    // 将 effect 绑定到“当前执行上下文的 scope”（若存在）：
    // - Vapor 在执行 setup 时会 push_scope(scope_id)，因此 setup 期间创建的 watch/watchEffect/createEffect
    //   都会自动归属到该 Vapor 子树。
    // - 当该 Vapor 子树卸载（before_unmount）时，会 dispose 掉 scope，从而统一清理这些 effect。
    let scope_id = current_effect_scope();
    let mut scheduler: Option<Function> = None;
    let mut lazy = false;
    if let Some(opts) = options {
        if opts.is_object() {
            let sch =
                Reflect::get(&opts, &JsValue::from_str("scheduler")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = sch.dyn_ref::<Function>() {
                scheduler = Some(f.clone());
            }
            let lz = Reflect::get(&opts, &JsValue::from_str("lazy")).unwrap_or(JsValue::UNDEFINED);
            lazy = lz.as_bool().unwrap_or(false);
        }
    }
    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "reactive:effect create") {
            crate::log::log(
                "debug",
                &format!(
                    "reactive:effect create id={} lazy={} scheduler={} scope={:?}",
                    id,
                    lazy,
                    scheduler.is_some(),
                    scope_id
                ),
            );
        }
    }
    EFFECTS.with(|m| {
        m.borrow_mut().insert(
            id,
            Effect {
                cb: cb.clone(),
                cleanups: Vec::new(),
                disposed: false,
                scheduler: scheduler.clone(),
                scope_id,
            },
        );
    });
    // 登记到 scope 的 effect 列表，以便 scope dispose 时批量回收。
    if let Some(sid) = scope_id {
        register_effect_in_scope(id, sid);
    }
    if !lazy {
        // 非懒执行：创建后立即运行一次以建立依赖（并可能触发清理）
        if let Some(s) = &scheduler {
            let run_closure = Closure::wrap(Box::new(move || {
                run_effect(id);
            }) as Box<dyn FnMut()>);
            let run_fn: Function = run_closure.as_ref().clone().unchecked_into();
            let _ = s.call1(&JsValue::NULL, &run_fn);
            run_closure.forget();
        } else {
            // 默认：立即运行
            run_effect(id);
        }
    }
    EffectHandle { id }
}

/// 在当前运行的副作用上注册清理函数
/// 清理函数会在下一次该副作用执行之前被调用
/// 用法与示例（JavaScript）：
/// ```js
/// // 需求：每次依赖变化时重建一个定时器，并在下一次运行前清理上一次的定时器
/// const s = createSignal(0)
/// const eh = createEffect(() => {
///   const v = s.get() // 建立订阅
///   const id = setInterval(() => console.log('[onCleanup-demo] tick v=', v), 500)
///   onCleanup(() => clearInterval(id)) // 下次运行前清理上一次的定时器
/// })
/// s.set(1) // 触发重跑：先清理旧定时器，再创建新定时器（只保留一个）
/// s.set(2) // 同理
/// eh.dispose() // 停止后续运行，并执行最后一次已注册的清理（定时器不再 tick）
/// ```
#[wasm_bindgen(js_name = onCleanup)]
pub fn on_cleanup(cb: Function) {
    CURRENT_EFFECT.with(|c| {
        if let Some(id) = *c.borrow() {
            EFFECTS.with(|m| {
                if let Some(e) = m.borrow_mut().get_mut(&id) {
                    e.cleanups.push(cb);
                }
            });
        }
    });
}

/// 断开依赖收集地执行回调（不记录对 Signal 的订阅）
///
/// 用途与示例（JavaScript）：
/// - 在同一个副作用中，订阅主依赖 `a`，但临时读取 `b` 并且不希望 `b` 的变化触发该副作用。
/// - `untrack(fn)` 会在执行 `fn` 时临时关闭依赖收集，`fn` 内部对信号的读取不会把当前副作用订阅到这些信号上。
///
/// ```js
/// const a = createSignal(0)
/// const b = createSignal(0)
/// createEffect(() => {
///   const av = a.get()                // 订阅 a：a 变化会使该副作用重跑
///   const bv = untrack(() => b.get()) // 断开依赖读取 b：b 变化不会触发该副作用
///   console.log('[untrack-demo] run av=', av, 'bv=', bv)
/// })
/// b.set(1)  // 不触发副作用（因为对 b 的读取发生在 untrack 内）
/// b.set(2)  // 不触发副作用
/// a.set(10) // 触发副作用（因为对 a 进行了正常订阅）
/// ```
///
/// 说明：若仅需“不订阅地读取”某个信号，也可使用 `peek()`（例如 `const v = sig.peek()`）。
#[wasm_bindgen]
pub fn untrack(cb: Function) -> JsValue {
    let prev = CURRENT_EFFECT.with(|c| c.borrow_mut().take());
    let ret = cb.call0(&JsValue::NULL);
    CURRENT_EFFECT.with(|c| *c.borrow_mut() = prev);
    match ret {
        Ok(v) => v,
        Err(e) => {
            wasm_bindgen::throw_val(e.clone());
        }
    }
}

/// 批量更新：在回调期间抑制副作用的即时触发，统一在结束后刷新
///
/// 用法与示例（JavaScript）：
/// ```js
/// const { createSignal, createEffect, batch } = wasmModule
///
/// // 示例一：同一信号多次 set，仅在批量结束后重跑一次
/// const count = createSignal(0)
/// createEffect(() => {
///   console.log('[batch-demo] count =', count.get())
/// })
/// batch(() => {
///   count.set(1)
///   count.set(2)
///   count.set(3)
///   // 在批量范围内不会立即触发副作用
/// })
/// // 批量结束后只触发一次副作用，打印最新值 3
///
/// // 示例二：一次性更新多个信号，副作用只合并重跑一次
/// const a = createSignal(0)
/// const b = createSignal(0)
/// createEffect(() => {
///   console.log('[batch-demo] sum =', a.get() + b.get())
/// })
/// batch(() => {
///   a.set(10)
///   b.set(20)
/// }) // 仅一次重跑，输出 sum = 30
/// ```
#[wasm_bindgen]
pub fn batch(cb: Function) {
    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "reactive:batch start") {
            crate::log::log("debug", &format!("reactive:batch start"));
        }
    }
    crate::reactive::core::batch_scope(|| {
        let _ = cb.call0(&JsValue::NULL);
    });
    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "reactive:batch end") {
            crate::log::log("debug", &format!("reactive:batch end"));
        }
    }
}

#[wasm_bindgen(typescript_custom_section)]
const TS_EFFECT_DECL: &'static str = r#"
/**
 * 副作用句柄：用于在 JS 侧停止副作用
 */
export interface EffectHandle {
  /** 停止后续运行，并执行最后一次已注册的清理 */
  dispose(): void;
}

/**
 * 创建副作用（立即运行一次），并返回句柄
 * 示例（JavaScript）：
 * ```javascript
 * const { createSignal, createEffect, onCleanup, untrack, batch } = wasmModule;
 * const s = createSignal(0);
 *
 * // 基本副作用：读取信号并打印
 * createEffect(() => {
 *   console.log('value:', s.get());
 * });
 * s.set(1);
 *
 * // 清理示例：注册定时器并在下一次运行前清理
 * createEffect(() => {
 *   const id = setInterval(() => console.log('tick'), 1000);
 *   onCleanup(() => clearInterval(id));
 * });
 *
 * // 断开依赖收集：不会订阅 other 信号
 * createEffect(() => {
 *   const v = untrack(() => s.get());
 *   console.log('untracked:', v);
 * });
 *
 * 创建副作用（支持自定义调度器与懒执行）
 * options:
 * - scheduler: Function( run: Function )，用于自定义何时调用 run
 * - lazy: bool，true 时不在创建时立即运行
 * 示例（JavaScript）：
 * ```javascript
 * const { createEffect } = wasmModule;
 * const scheduler = (run) => queueMicrotask(run); // 或者使用 requestAnimationFrame
 * createEffect(() => {
 *   // ...effect body
 * }, { scheduler, lazy: false });
 * ```
 */
export function createEffect(
  cb: () => void,
  options?: { scheduler?: (run: () => void) => void; lazy?: boolean } | null,
): EffectHandle;

/**
 * 在当前运行的副作用上注册清理函数
 * 清理函数会在下一次该副作用执行之前被调用
 * 用法与示例（JavaScript）：
 * ```js
 * // 需求：每次依赖变化时重建一个定时器，并在下一次运行前清理上一次的定时器
 * const s = createSignal(0)
 * const eh = createEffect(() => {
 *   const v = s.get() // 建立订阅
 *   const id = setInterval(() => console.log('[onCleanup-demo] tick v=', v), 500)
 *   onCleanup(() => clearInterval(id)) // 下次运行前清理上一次的定时器
 * })
 * s.set(1) // 触发重跑：先清理旧定时器，再创建新定时器（只保留一个）
 * s.set(2) // 同理
 * eh.dispose() // 停止后续运行，并执行最后一次已注册的清理（定时器不再 tick）
 * ```
 */
export function onCleanup(cb: () => void): void;

/**
 * 断开依赖收集地执行回调（不记录对 Signal 的订阅）
 *
 * 用途与示例（JavaScript）：
 * - 在同一个副作用中，订阅主依赖 `a`，但临时读取 `b` 并且不希望 `b` 的变化触发该副作用。
 * - `untrack(fn)` 会在执行 `fn` 时临时关闭依赖收集，`fn` 内部对信号的读取不会把当前副作用订阅到这些信号上。
 *
 * ```js
 * const a = createSignal(0)
 * const b = createSignal(0)
 * createEffect(() => {
 *   const av = a.get()                // 订阅 a：a 变化会使该副作用重跑
 *   const bv = untrack(() => b.get()) // 断开依赖读取 b：b 变化不会触发该副作用
 *   console.log('[untrack-demo] run av=', av, 'bv=', bv)
 * })
 * b.set(1)  // 不触发副作用（因为对 b 的读取发生在 untrack 内）
 * b.set(2)  // 不触发副作用
 * a.set(10) // 触发副作用（因为对 a 进行了正常订阅）
 * ```
 *
 * 说明：若仅需“不订阅地读取”某个信号，也可使用 `peek()`（例如 `const v = sig.peek()`）。
 */
export function untrack<T>(cb: () => T): T;

/**
 * 批量更新：在回调期间抑制副作用的即时触发，统一在结束后刷新
 *
 * 用法与示例（JavaScript）：
 * ```js
 * const { createSignal, createEffect, batch } = wasmModule
 *
 * // 示例一：同一信号多次 set，仅在批量结束后重跑一次
 * const count = createSignal(0)
 * createEffect(() => {
 *   console.log('[batch-demo] count =', count.get())
 * })
 * batch(() => {
 *   count.set(1)
 *   count.set(2)
 *   count.set(3)
 *   // 在批量范围内不会立即触发副作用
 * })
 * // 批量结束后只触发一次副作用，打印最新值 3
 *
 * // 示例二：一次性更新多个信号，副作用只合并重跑一次
 * const a = createSignal(0)
 * const b = createSignal(0)
 * createEffect(() => {
 *   console.log('[batch-demo] sum =', a.get() + b.get())
 * })
 *  batch(() => {
 *    a.set(10)
 *    b.set(20)
 *  }) // 仅一次重跑，输出 sum = 30
 * ``` 
 */
export function batch(cb: () => void): void;
"#;
