/*
useEffect 钩子（仿 React）设计说明

- 目标：提供与 React `useEffect` 等价的行为，但以 Vapor 的响应式底层实现（`watch([...])`）。
- 依赖收集：将 `deps` 归一化为 `watch` 的“来源数组”：
  - 函数：直接作为 getter 使用；
  - 含 `get` 方法的对象：视为信号句柄/只读信号，调用其 `get()`；
  - 含 `value` 字段的对象（Ref 形态）：包装为 `() => obj.value` 的 getter；
  - 其他常量：直接作为数组元素（常量不会触发变化）。
- 首次行为：设置 `immediate: true`，创建后立即运行一次（旧值为 `undefined`），与 React 初次执行一致。
- 清理机制：若 effect 返回函数，则通过 `onCleanup()` 注册，确保在下一次重跑前或 dispose/unmount 时执行。
- 等值与调度：支持 `options.equals(prev, next)` 覆盖默认逐项浅比较；支持 `options.scheduler(run)` 自定义调度时机。

对齐点：
- 与 `/reactive/watch.rs` 的统一侦听入口保持一致的选项与比较策略（见 386-388 的自定义比较示例）。
- 注释与结构风格参考 `use_state.rs` 的“选项解析 + 行为说明”，便于统一理解。
*/
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::effect::on_cleanup;
use crate::reactive::watch::watch;

// 依赖项归一化：将任意 `deps` 元素转换为 `watch` 可理解的来源
// - Function：直接返回；
// - 对象且含 `get`：视为信号句柄，直接返回；
// - 对象且含 `value`：视为 Ref，包装为 `() => obj.value`；
// - 其他：常量值，直接返回。
fn normalize_dep_item_to_source(v: &JsValue) -> JsValue {
    if let Some(_f) = v.dyn_ref::<Function>() {
        return v.clone();
    }
    if v.is_object() {
        let gv = Reflect::get(v, &JsValue::from_str("get")).unwrap_or(JsValue::UNDEFINED);
        if let Some(_gf) = gv.dyn_ref::<Function>() {
            return v.clone();
        }
        let vv = Reflect::get(v, &JsValue::from_str("value")).unwrap_or(JsValue::UNDEFINED);
        if !vv.is_undefined() {
            let dep = v.clone();
            let getter = Closure::wrap(Box::new(move || {
                // 将 { value } 转换为 getter 函数，供 watch 统一侦听
                Reflect::get(&dep, &JsValue::from_str("value")).unwrap_or(JsValue::UNDEFINED)
            }) as Box<dyn FnMut() -> JsValue>);
            let f: Function = getter.as_ref().clone().unchecked_into();
            getter.forget();
            return f.into();
        }
        return v.clone();
    }
    v.clone()
}

#[wasm_bindgen(js_name = useEffect)]
pub fn use_effect(effect: Function, deps: Option<JsValue>, options: Option<JsValue>) {
    // 依赖数组归一化（参考 use_state 的“选项解析”风格）：
    // - 先把 `deps` 转为标准的 `sources`，后续统一交给 `watch([...])` 处理
    let sources = Array::new();
    if let Some(d) = deps {
        if Array::is_array(&d) {
            let arr = Array::from(&d);
            for i in 0..arr.length() {
                let item = arr.get(i);
                sources.push(&normalize_dep_item_to_source(&item));
            }
        }
    }
    // 解析可选项：equals 与 scheduler（与 watch.ts 的选项保持一致）
    let mut equals: Option<Function> = None;
    let mut scheduler: Option<Function> = None;
    if let Some(opts) = options {
        if opts.is_object() {
            let eq =
                Reflect::get(&opts, &JsValue::from_str("equals")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = eq.dyn_ref::<Function>() {
                equals = Some(f.clone());
            }
            let sch =
                Reflect::get(&opts, &JsValue::from_str("scheduler")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = sch.dyn_ref::<Function>() {
                scheduler = Some(f.clone());
            }
        }
    }
    let eff = effect.clone();
    let handler = Closure::wrap(Box::new(move |_newv: JsValue, _oldv: JsValue| {
        // 当 watch 侦听到依赖变化时，调用用户传入的 effect
        let ret = eff.call0(&JsValue::NULL).unwrap_or(JsValue::UNDEFINED);
        // 若 effect 返回清理函数，将其注册到 onCleanup
        if let Some(f) = ret.dyn_ref::<Function>() {
            on_cleanup(f.clone());
        }
        JsValue::UNDEFINED
    }) as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let handler_fn: Function = handler.as_ref().clone().unchecked_into();
    let opts = Object::new();
    // 首次立即运行（React 初次执行），旧值为 undefined
    let _ = Reflect::set(&opts, &JsValue::from_str("immediate"), &JsValue::from_bool(true));
    if let Some(eqf) = equals {
        let _ = Reflect::set(&opts, &JsValue::from_str("equals"), &eqf);
    }
    if let Some(s) = scheduler {
        let _ = Reflect::set(&opts, &JsValue::from_str("scheduler"), &s);
    }
    // 使用 watch 的“来源数组”形态实现依赖监听与比较
    let _eh = watch(sources.into(), handler_fn, Some(opts.into()));
    handler.forget();
}

#[wasm_bindgen(typescript_custom_section)]
const TS_USE_EFFECT_DECL: &'static str = r#"
/**
 * useEffect：模拟 React 的效果钩子
 *
 * - 依赖数组采用 `watch([...])` 的统一侦听底层实现
 * - 逐项浅比较（`Object.is`）；可通过 `options.equals(prev, next)` 自定义比较
 * - 返回清理函数将通过 `onCleanup()` 注册，在下一次依赖变化重跑前或侦听被处置时执行
 *
 * 示例：
 * ```ts
 * useEffect(() => {
 *   const timer = setInterval(() => {}, 1000)
 *   return () => clearInterval(timer)
 * }, [])
 *
 * useEffect(() => {
 *   console.log('count =', count.value)
 * }, [() => count.value])
 * ```
 */
export function useEffect(
  effect: () => void | (() => void),
  deps?: any[] | null,
  options?: { equals?: Equals<T>; scheduler?: (run: () => void) => void } | null,
): void;
"#;
