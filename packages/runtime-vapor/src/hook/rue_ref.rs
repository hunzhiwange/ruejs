/*
Ref 包装（Hook 入口）

- 目标：在有组件实例时将创建结果挂载到 Hook 插槽。
- 行为：当 `forceGlobal=true` 或没有当前实例时，直接返回 `createRef` 的结果；否则通过 `withHookSlot` 分配插槽。
- 依赖：复用 reactive 模块中的 `create_ref` 与上下文模块的 `get_current_instance`/`with_hook_slot`。
*/
use js_sys::Function;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::context::{get_current_instance, with_hook_slot};
use crate::reactive::signal::create_ref;

#[wasm_bindgen(js_name = ref)]
pub fn ref_js(initial: JsValue, options: Option<JsValue>, force_global: Option<bool>) -> JsValue {
    // 把“创建 Ref（{ value } 代理）”的过程包装为闭包，以便交给 Hook 槽位懒创建
    let make = Closure::wrap(Box::new(move || create_ref(initial.clone(), options.clone()))
        as Box<dyn FnMut() -> JsValue>);
    // 在不存在当前组件实例或要求全局时，直接返回新建的 Ref
    let use_global = force_global.unwrap_or(false);
    let cur = get_current_instance();
    let res = if use_global || cur.is_undefined() || cur.is_null() {
        let f: Function = make.as_ref().clone().unchecked_into();
        f.call0(&JsValue::NULL).unwrap_or(JsValue::UNDEFINED)
    } else {
        // 否则通过 Hook 槽位保证多次调用拿到同一引用
        let f: Function = make.as_ref().clone().unchecked_into();
        with_hook_slot(f)
    };
    make.forget();
    res
}

#[wasm_bindgen(typescript_custom_section)]
const TS_REF_DECL: &'static str = r#"
/**
 * 创建 Ref：返回一个带有 `value` 字段的响应式代理对象
 *
 * 用法（JavaScript / TypeScript）：
 * ```ts
 * // 基本使用：读写 value，自动依赖收集
 * const r = ref(0)
 * console.log(r.value)        // 0
 * r.value = 1                 // 触发订阅者
 *
 * // 与 watchEffect 配合（依赖自动收集）
 * const stop = watchEffect(() => {
 *   console.log('ref value =', r.value)
 * })
 * r.value = 2                 // 触发前面的 watchEffect
 * stop()                      // 停止响应
 *
 * // peek：查看当前值，不收集依赖（不会订阅当前副作用）
 * const cur = r.peek()        // 仅返回值，不产生订阅
 *
 * // update：基于当前值计算并写回
 * r.update(prev => prev + 1)  // 等价于 r.value = (prev + 1)
 *
 * // 自定义等值比较：避免无意义的触发
 * const r2 = ref({ a: 1 }, { equals: (p, n) => _.isEqual(p?.value, n?.value) })
 * r2.value = { a: 1 }         // 不触发（相等）
 *
 * // 与组件/DOM 结合（Vapor 模式下自动更新）
 * // <span>{r.value}</span> 会被编译为原生 DOM + 响应式更新
 * ```
 */
export function ref<T = any>(
  initial: T,
  options?: { equals?: Equals<T> } | null,
  forceGlobal?: boolean,
): { value: T };
"#;
