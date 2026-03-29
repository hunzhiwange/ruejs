/*
useMemo：根据依赖缓存计算结果，等值依赖不重新计算

设计要点：
- 在当前组件实例的 Hook 插槽（slot）上存储两个字段：
  - `value`：上次计算得到的值
  - `deps`：上次的依赖数组（已做 `toValue` 取值转换后的快照）
- 每次调用：
  1) 将传入的 `deps` 规范化：若是数组则对每一项执行 `toValue`；否则保持原值（非数组意味着“始终变化”）。
  2) 与 `slot.deps` 做等值比较（长度一致且逐项 `Object.is` 为真）：
     - 若比较失败（变化）：调用 `factory()` 重新计算 `value`，并更新 `deps` 快照
     - 若比较成功（未变）：直接返回旧的 `value`
- 非数组依赖被视为“非稳定标识”，因此每次都会重新计算。
*/
#[cfg(feature = "dev")]
use crate::log::{log, want_log};
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;
use wasm_bindgen::throw_val;

use crate::reactive::context::with_hook_slot;
use crate::reactive::core::to_value;
use crate::runtime::mark_crashed_from_hook;

#[wasm_bindgen(js_name = useMemo)]
pub fn use_memo(factory: Function, deps: JsValue) -> JsValue {
    // 在 Hook 插槽上初始化/复用一个对象，保存计算值与依赖快照
    let factory_slot = Closure::wrap(Box::new(move || {
        let o = Object::new();
        // 初始值为空（未计算）
        let _ = Reflect::set(&o, &JsValue::from_str("value"), &JsValue::UNDEFINED);
        // 初始依赖为空（未记录）
        let _ = Reflect::set(&o, &JsValue::from_str("deps"), &JsValue::UNDEFINED);
        o.into()
    }) as Box<dyn FnMut() -> JsValue>);
    let slot = with_hook_slot(factory_slot.as_ref().clone().into());
    factory_slot.forget();

    // 规范化依赖：
    // - 若为数组：对每一项执行 `toValue`（函数调用/读取对象 value/get）
    // - 若非数组：保留原值（视为“不稳定依赖”，后续强制重新计算）
    let nd = if Array::is_array(&deps) {
        let arr = Array::from(&deps);
        let mapped = Array::new();
        for i in 0..arr.length() {
            // to_value 会：
            // - Function: 调用并取返回值
            // - {value}: 取 value 字段
            // - {get}: 调用 get()
            // - 其它: 原样返回
            mapped.push(&to_value(arr.get(i)));
        }
        mapped.into()
    } else {
        deps.clone()
    };

    // 比对是否发生变化：缺失旧依赖、类型不为数组、长度变化、逐项非 Object.is
    let prev = Reflect::get(&slot, &JsValue::from_str("deps")).unwrap_or(JsValue::UNDEFINED);
    let mut changed = prev.is_undefined() || !Array::is_array(&nd);
    if !changed {
        let nd_arr = Array::from(&nd);
        let prev_arr = Array::from(&prev);
        if nd_arr.length() != prev_arr.length() {
            changed = true;
        } else {
            let obj_is = Function::new_no_args("return Object.is");
            for i in 0..nd_arr.length() {
                let a = nd_arr.get(i);
                let b = prev_arr.get(i);
                let eq = obj_is
                    .call2(&JsValue::UNDEFINED, &a, &b)
                    .unwrap_or(JsValue::FALSE)
                    .as_bool()
                    .unwrap_or(false);
                if !eq {
                    changed = true;
                    break;
                }
            }
        }
    }

    if changed {
        // 发生变化：重新计算并写入 value 与 deps
        let v = match factory.call0(&JsValue::NULL) {
            Ok(val) => val,
            Err(e) => {
                #[cfg(feature = "dev")]
                {
                    if want_log("error", "hook:useMemo factory threw") {
                        log("error", "hook:useMemo factory threw");
                    }
                }
                mark_crashed_from_hook(&e);
                throw_val(e.clone());
            }
        };
        let _ = Reflect::set(&slot, &JsValue::from_str("value"), &v);
        if Array::is_array(&nd) {
            let nd_arr = Array::from(&nd);
            let copy = Array::new();
            for i in 0..nd_arr.length() {
                // 拷贝当前依赖快照，避免后续被外部修改影响比较
                copy.push(&nd_arr.get(i));
            }
            let _ = Reflect::set(&slot, &JsValue::from_str("deps"), &copy.into());
        } else {
            let _ = Reflect::set(&slot, &JsValue::from_str("deps"), &nd);
        }
    }
    // 返回上次计算的缓存值
    Reflect::get(&slot, &JsValue::from_str("value")).unwrap_or(JsValue::UNDEFINED)
}

#[wasm_bindgen(typescript_custom_section)]
const TS_USE_MEMO_DECL: &'static str = r#"
/**
 * useMemo：根据依赖数组缓存计算结果，等值依赖不重新计算
 */
export function useMemo<T>(factory: () => T, deps: any[]): T;
"#;
