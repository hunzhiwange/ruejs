/*
Computed 包装（Hook 入口）
*/
use js_sys::Function;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::computed::create_computed;
use crate::reactive::context::{get_current_instance, with_hook_slot};
use crate::reactive::signal::SignalHandle;

thread_local! {
    static COMPUTED_HANDLE_REGISTRY: std::cell::RefCell<Vec<SignalHandle>> = std::cell::RefCell::new(Vec::new());
}

#[wasm_bindgen(js_name = computed)]
pub fn computed_js(arg: JsValue, force_global: Option<bool>) -> SignalHandle {
    // 当没有当前组件实例或明确要求强制全局时，直接创建并返回只读/可写计算属性句柄
    let use_global = force_global.unwrap_or(false);
    let cur = get_current_instance();
    if use_global || cur.is_undefined() || cur.is_null() {
        return create_computed(arg);
    }
    // 否则在 Hook 槽位中懒创建，并把句柄索引存入线程局部注册表，稍后取回
    let make = Closure::wrap(Box::new(move || {
        let h = create_computed(arg.clone());
        let idx = COMPUTED_HANDLE_REGISTRY.with(|r| {
            let mut v = r.borrow_mut();
            v.push(h);
            (v.len() - 1) as f64
        });
        JsValue::from_f64(idx)
    }) as Box<dyn FnMut() -> JsValue>);
    let f: Function = make.as_ref().clone().unchecked_into();
    let v = with_hook_slot(f);
    make.forget();
    // 根据索引取出对应的计算属性句柄并返回
    let idx = v.as_f64().unwrap_or(0.0) as usize;
    COMPUTED_HANDLE_REGISTRY.with(|r| r.borrow()[idx].clone())
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
