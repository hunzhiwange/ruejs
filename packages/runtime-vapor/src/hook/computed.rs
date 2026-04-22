/*
Computed 包装（Hook 入口）
*/
use js_sys::{Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::computed::create_computed;
use crate::reactive::context::{get_current_instance, with_current_instance_hook_scope, with_hook_slot};
use crate::reactive::core::schedule_effect_run;
use crate::reactive::signal::{SignalHandle, collect_affected_subscribers};

thread_local! {
    static COMPUTED_HANDLE_REGISTRY: std::cell::RefCell<Vec<SignalHandle>> = std::cell::RefCell::new(Vec::new());
}

fn arg_has_setter(arg: &JsValue) -> bool {
    if !arg.is_object() {
        return false;
    }
    let setter = Reflect::get(arg, &JsValue::from_str("set")).unwrap_or(JsValue::UNDEFINED);
    setter.is_function()
}

fn make_dynamic_computed_arg(holder: &Object, writable: bool) -> JsValue {
    let getter_holder = holder.clone();
    let getter = Closure::wrap(Box::new(move || {
        let current = Reflect::get(&getter_holder, &JsValue::from_str("arg"))
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(func) = current.dyn_ref::<Function>() {
            return func.call0(&JsValue::NULL).unwrap_or(JsValue::UNDEFINED);
        }
        if current.is_object() {
            let getter = Reflect::get(&current, &JsValue::from_str("get"))
                .unwrap_or(JsValue::UNDEFINED);
            if let Some(func) = getter.dyn_ref::<Function>() {
                return func.call0(&JsValue::NULL).unwrap_or(JsValue::UNDEFINED);
            }
        }
        JsValue::UNDEFINED
    }) as Box<dyn FnMut() -> JsValue>);
    let getter_fn: Function = getter.as_ref().clone().unchecked_into();
    getter.forget();

    let options = Object::new();
    let _ = Reflect::set(&options, &JsValue::from_str("get"), &getter_fn);

    if writable {
        let setter_holder = holder.clone();
        let setter = Closure::wrap(Box::new(move |value: JsValue| {
            let current = Reflect::get(&setter_holder, &JsValue::from_str("arg"))
                .unwrap_or(JsValue::UNDEFINED);
            if current.is_object() {
                let setter = Reflect::get(&current, &JsValue::from_str("set"))
                    .unwrap_or(JsValue::UNDEFINED);
                if let Some(func) = setter.dyn_ref::<Function>() {
                    let _ = func.call1(&JsValue::NULL, &value);
                }
            }
        }) as Box<dyn FnMut(JsValue)>);
        let setter_fn: Function = setter.as_ref().clone().unchecked_into();
        setter.forget();
        let _ = Reflect::set(&options, &JsValue::from_str("set"), &setter_fn);
    }

    options.into()
}

fn mark_computed_dirty(handle: &SignalHandle) {
    let to_run = {
        let mut inner = handle.inner.borrow_mut();
        let Some(computed) = inner.computed.as_mut() else {
            return;
        };
        computed.dirty = true;
        computed.initialized = false;
        collect_affected_subscribers(&mut inner, None)
    };
    for id in to_run {
        schedule_effect_run(id);
    }
}

#[wasm_bindgen(js_name = computed)]
pub fn computed_js(arg: JsValue, force_global: Option<bool>) -> SignalHandle {
    // 当没有当前组件实例或明确要求强制全局时，直接创建并返回只读/可写计算属性句柄
    let use_global = force_global.unwrap_or(false);
    let cur = get_current_instance();
    if use_global || cur.is_undefined() || cur.is_null() {
        return create_computed(arg);
    }
    // 组件内 computed 需要两层复用：
    // 1) hook 槽位复用同一个句柄；
    // 2) 底层 effect 绑定到持久 hook scope，而不是每轮 render scope。
    let initial_arg = arg.clone();
    let make = Closure::wrap(Box::new(move || {
        let slot = Object::new();
        let holder = Object::new();
        let _ = Reflect::set(&holder, &JsValue::from_str("arg"), &initial_arg);
        let handle = with_current_instance_hook_scope(|| {
            create_computed(make_dynamic_computed_arg(&holder, arg_has_setter(&initial_arg)))
        });
        let handle_index = COMPUTED_HANDLE_REGISTRY.with(|registry| {
            let mut handles = registry.borrow_mut();
            handles.push(handle);
            (handles.len() - 1) as f64
        });
        let _ = Reflect::set(&slot, &JsValue::from_str("holder"), &holder);
        let _ = Reflect::set(
            &slot,
            &JsValue::from_str("handleIndex"),
            &JsValue::from_f64(handle_index),
        );
        slot.into()
    }) as Box<dyn FnMut() -> JsValue>);
    let f: Function = make.as_ref().clone().unchecked_into();
    let slot = with_hook_slot(f);
    make.forget();

    let slot_obj = Object::from(slot);
    let holder = Reflect::get(&slot_obj, &JsValue::from_str("holder")).unwrap_or(JsValue::UNDEFINED);
    if holder.is_object() {
        let holder_obj = Object::from(holder);
        let _ = Reflect::set(&holder_obj, &JsValue::from_str("arg"), &arg);
    }

    let handle_index = Reflect::get(&slot_obj, &JsValue::from_str("handleIndex"))
        .unwrap_or(JsValue::from_f64(0.0))
        .as_f64()
        .unwrap_or(0.0) as usize;
    let handle = COMPUTED_HANDLE_REGISTRY.with(|registry| registry.borrow()[handle_index].clone());
    // getter 在重渲染时可能捕获了新的闭包，显式标脏让下次读取走新 getter。
    mark_computed_dirty(&handle);
    handle
}

#[wasm_bindgen(typescript_custom_section)]
const TS_COMPUTED_HOOK_DECL: &'static str = r#"
/**
 * 创建计算属性
 * - 参数：可为函数 `() => any`，或对象 `{ get: () => any }`
 * 返回：一个只读信号句柄（通过 get/peek 读取，内部通过 effect 驱动更新）
 * 示例（JavaScript）：
 * ```javascript
 * const count = signal(1);
 * const double = computed(() => count.get() * 2);
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
 * const first = signal('John');
 * const last = signal('Doe');
 * const fullName = computed({
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
 * const fullName = computed({
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
export function computed<T>(get: ComputedGetter<T>, forceGlobal?: boolean): ReadonlySignal<T>
export function computed<T>(options: ComputedOptions<T>, forceGlobal?: boolean): WritableSignal<T>
export function computed<T>(
  arg: any,
  forceGlobal?: boolean,
): ReadonlySignal<T> | WritableSignal<T>;
"#;
