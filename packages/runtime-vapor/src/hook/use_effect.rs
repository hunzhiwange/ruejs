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

use crate::reactive::context::{get_current_instance, with_current_instance_hook_scope, with_hook_slot};
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

fn raw_deps_array(deps: Option<JsValue>) -> Array {
    if let Some(d) = deps {
        if Array::is_array(&d) {
            return Array::from(&d);
        }
    }
    Array::new()
}

fn normalized_sources_from_raw(raw_deps: &Array) -> Array {
    let sources = Array::new();
    for i in 0..raw_deps.length() {
        let item = raw_deps.get(i);
        sources.push(&normalize_dep_item_to_source(&item));
    }
    sources
}

fn clone_array(input: &Array) -> Array {
    let copy = Array::new();
    for i in 0..input.length() {
        copy.push(&input.get(i));
    }
    copy
}

fn is_dynamic_dep_source(value: &JsValue) -> bool {
    if value.dyn_ref::<Function>().is_some() {
        return true;
    }
    if value.is_object() {
        let getter = Reflect::get(value, &JsValue::from_str("get")).unwrap_or(JsValue::UNDEFINED);
        if getter.is_function() {
            return true;
        }
        let value_prop = Reflect::get(value, &JsValue::from_str("value"))
            .unwrap_or(JsValue::UNDEFINED);
        if !value_prop.is_undefined() {
            return true;
        }
    }
    false
}

fn same_dep_array(prev: &JsValue, next: &Array) -> bool {
    if !Array::is_array(prev) {
        return false;
    }
    let prev_arr = Array::from(prev);
    if prev_arr.length() != next.length() {
        return false;
    }
    for i in 0..next.length() {
        let prev_item = prev_arr.get(i);
        let next_item = next.get(i);
        // 这类 deps 自身已经是“动态源”（getter/signal/ref），watch 会在内部追踪它们。
        // 对组件重渲染来说，按槽位位置稳定即可，避免每次 render 因 wrapper/闭包对象变化而重建 watch。
        if is_dynamic_dep_source(&prev_item) && is_dynamic_dep_source(&next_item) {
            continue;
        }
        if !js_sys::Object::is(&prev_item, &next_item) {
            return false;
        }
    }
    true
}

fn same_optional_function(prev: &JsValue, next: Option<&Function>) -> bool {
    match next {
        Some(func) => js_sys::Object::is(prev, &JsValue::from(func.clone())),
        None => prev.is_undefined() || prev.is_null(),
    }
}

fn dispose_effect_handle_value(handle: &JsValue) {
    if handle.is_undefined() || handle.is_null() {
        return;
    }
    let dispose = Reflect::get(handle, &JsValue::from_str("dispose")).unwrap_or(JsValue::UNDEFINED);
    if let Some(func) = dispose.dyn_ref::<Function>() {
        let _ = func.call0(handle);
    }
}

fn set_slot_watch_state(
    slot: &Object,
    handle: &JsValue,
    deps: &Array,
    equals: Option<&Function>,
    scheduler: Option<&Function>,
) {
    let _ = Reflect::set(slot, &JsValue::from_str("handle"), handle);
    let _ = Reflect::set(slot, &JsValue::from_str("deps"), &clone_array(deps).into());
    let _ = Reflect::set(
        slot,
        &JsValue::from_str("equals"),
        &equals.cloned().map(JsValue::from).unwrap_or(JsValue::UNDEFINED),
    );
    let _ = Reflect::set(
        slot,
        &JsValue::from_str("scheduler"),
        &scheduler.cloned().map(JsValue::from).unwrap_or(JsValue::UNDEFINED),
    );
}

fn create_use_effect_watch(
    slot: &Object,
    raw_deps: &Array,
    equals: Option<Function>,
    scheduler: Option<Function>,
) -> JsValue {
    let slot_for_handler = slot.clone();
    let handler = Closure::wrap(Box::new(move |_newv: JsValue, _oldv: JsValue| {
        let effect = Reflect::get(&slot_for_handler, &JsValue::from_str("effect"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = effect.dyn_ref::<Function>() {
            let ret = func.call0(&JsValue::NULL).unwrap_or(JsValue::UNDEFINED);
            if let Some(cleanup) = ret.dyn_ref::<Function>() {
                on_cleanup(cleanup.clone());
            }
        }
        JsValue::UNDEFINED
    }) as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);
    let handler_fn: Function = handler.as_ref().clone().unchecked_into();

    let opts = Object::new();
    let _ = Reflect::set(&opts, &JsValue::from_str("immediate"), &JsValue::from_bool(true));
    if let Some(eqf) = equals.as_ref() {
        let _ = Reflect::set(&opts, &JsValue::from_str("equals"), eqf);
    }
    if let Some(sch) = scheduler.as_ref() {
        let _ = Reflect::set(&opts, &JsValue::from_str("scheduler"), sch);
    }

    let handle = watch(normalized_sources_from_raw(raw_deps).into(), handler_fn, Some(opts.into()));
    handler.forget();
    JsValue::from(handle)
}

#[wasm_bindgen(js_name = useEffect)]
pub fn use_effect(effect: Function, deps: Option<JsValue>, options: Option<JsValue>) {
    let raw_deps = raw_deps_array(deps);
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

    let cur = get_current_instance();
    if cur.is_undefined() || cur.is_null() {
        let slot = Object::new();
        let _ = Reflect::set(&slot, &JsValue::from_str("effect"), &JsValue::from(effect));
        let _ = create_use_effect_watch(&slot, &raw_deps, equals, scheduler);
        return;
    }

    let effect_for_factory = effect.clone();
    let deps_for_factory = clone_array(&raw_deps);
    let equals_for_factory = equals.clone();
    let scheduler_for_factory = scheduler.clone();
    let slot_factory = Closure::wrap(Box::new(move || {
        let slot = Object::new();
        let _ = Reflect::set(&slot, &JsValue::from_str("effect"), &JsValue::from(effect_for_factory.clone()));
        let handle = with_current_instance_hook_scope(|| {
            create_use_effect_watch(
                &slot,
                &deps_for_factory,
                equals_for_factory.clone(),
                scheduler_for_factory.clone(),
            )
        });
        set_slot_watch_state(
            &slot,
            &handle,
            &deps_for_factory,
            equals_for_factory.as_ref(),
            scheduler_for_factory.as_ref(),
        );
        slot.into()
    }) as Box<dyn FnMut() -> JsValue>);
    let slot_value = with_hook_slot(slot_factory.as_ref().clone().unchecked_into());
    slot_factory.forget();

    let slot = Object::from(slot_value);
    let _ = Reflect::set(&slot, &JsValue::from_str("effect"), &JsValue::from(effect));

    let prev_deps = Reflect::get(&slot, &JsValue::from_str("deps")).unwrap_or(JsValue::UNDEFINED);
    let prev_equals = Reflect::get(&slot, &JsValue::from_str("equals")).unwrap_or(JsValue::UNDEFINED);
    let prev_scheduler = Reflect::get(&slot, &JsValue::from_str("scheduler")).unwrap_or(JsValue::UNDEFINED);

    let should_recreate = !same_dep_array(&prev_deps, &raw_deps)
        || !same_optional_function(&prev_equals, equals.as_ref())
        || !same_optional_function(&prev_scheduler, scheduler.as_ref());

    if should_recreate {
        let prev_handle = Reflect::get(&slot, &JsValue::from_str("handle")).unwrap_or(JsValue::UNDEFINED);
        dispose_effect_handle_value(&prev_handle);
        let handle = with_current_instance_hook_scope(|| {
            create_use_effect_watch(&slot, &raw_deps, equals.clone(), scheduler.clone())
        });
        set_slot_watch_state(&slot, &handle, &raw_deps, equals.as_ref(), scheduler.as_ref());
    }
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
