/*
上下文模块：管理当前组件实例与 Hook 插槽

设计背景：
- 在前端组件体系中，Hook（如 React 的 useState/useEffect）通常依赖“调用顺序”来为每次调用分配稳定的存储槽位。
- 这里我们通过在“实例对象”上维护 `__hooks`（包含 `states` 数组与递增的 `index`）来实现相同的效果。

为什么这么做：
- WebAssembly 与 JS 共存的场景下，直接把 Hook 状态放在 JS 对象上更直观，避免复杂的跨边界所有权管理。
- `with_hook_slot` 提供一个工厂函数。当某一插槽不存在时，就创建并存入；存在则复用。这样保证 Hook 的“稳定性”。
- 通过 `__forcedIndex` 可以覆盖默认的顺序分配逻辑，适配某些需要显式索引的高级场景或调试需求。

根实例：
- 当用户没有显式设置当前实例时，系统提供一个“根实例”，其中包含最基本的字段与 `__hooks` 容器，
  保证 Hook 与副作用仍可正常运行（例如全局层级的状态）。
*/

// 提供获取/设置当前实例，并在有实例时为 Hook 分配稳定的“插槽索引”。
use crate::ComponentInternalInstance;
use crate::DomAdapter;
#[cfg(feature = "dev")]
use crate::log::{log, want_log};
use crate::reactive::core::{
    create_detached_effect_scope, dispose_effect_scope, pop_effect_scope, push_effect_scope,
};
use crate::runtime::mark_crashed_from_hook;
use js_sys::Map;
use js_sys::{Array, Function, Object, Reflect};
use std::collections::HashMap;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;
use wasm_bindgen::throw_val;

thread_local! {
    // 当前组件实例（可能为空）。在运行 Hook 或副作用时用于定位状态容器
    static CURRENT_INSTANCE: std::cell::RefCell<Option<JsValue>> = std::cell::RefCell::new(None);
    // 根实例缓存：当没有显式设置当前实例时，提供一个内置的根对象
    static ROOT_INSTANCE: std::cell::RefCell<Option<JsValue>> = std::cell::RefCell::new(None);
    // 组件实例稳定包装：index -> wrapper JS Object（承载 __hooks / propsRO）
    static CI_WRAPPERS: std::cell::RefCell<HashMap<usize, JsValue>> = std::cell::RefCell::new(HashMap::new());
}

const HOOK_EFFECT_SCOPE_KEY: &str = "__hook_effect_scope_id";

/// 设置当前实例
/// 传入 `null/undefined` 表示清空；否则记录为 Some(instance)
/// 示例（JavaScript）：
/// ```javascript
/// const { setCurrentInstance, getCurrentInstance, withHookSlot, createSignal } = wasmModule;
/// const inst = { name: 'MyComponent' };
/// setCurrentInstance(inst);
///
/// // 在实例上分配一个 Hook 插槽，用于存储状态对象
/// const state = withHookSlot(() => ({ count: createSignal(0) }));
/// console.log(getCurrentInstance()); // 当前实例或根实例
/// ```
#[wasm_bindgen(js_name = setCurrentInstance)]
pub fn set_current_instance(i: JsValue) {
    let v = if i.is_null() || i.is_undefined() { None } else { Some(i) };
    CURRENT_INSTANCE.with(|c| *c.borrow_mut() = v);
}

/// 获取当前实例；若未设置则返回空值（null/undefined），不再构造默认根实例
/// 用法（JavaScript）：
/// ```javascript
/// const { setCurrentInstance, getCurrentInstance, withHookSlot } = wasmModule;
///
/// // 设置并获取当前实例
/// setCurrentInstance({ name: 'A' });
/// const inst = getCurrentInstance(); // { name: 'A', ... }
///
/// // 清空当前实例后，获取为空（undefined 或 null）
/// setCurrentInstance(undefined);
/// const none = getCurrentInstance(); // undefined（或 null）
///
/// // 在有当前实例时，withHookSlot 为该实例分配/复用一个 Hook 插槽
/// setCurrentInstance({});
/// const state = withHookSlot(() => ({ count: 0 })); // 首次创建并缓存到 __hooks.states
/// ```
#[wasm_bindgen(js_name = getCurrentInstance)]
pub fn get_current_instance() -> JsValue {
    let ret = CURRENT_INSTANCE.with(|c| c.borrow().clone()).unwrap_or(JsValue::NULL);
    if ret.is_null() || ret.is_undefined() {
        return ret;
    }
    ret
}

/// 内部：将当前实例设置为给定的组件实例对象，并准备 Hook 容器
/// - 复位 __hooks.index = 0，确保本次更新周期的 Hook 对齐
/// - 写入 propsRO，便于 JS 侧访问
pub(crate) fn set_current_instance_ci<A: DomAdapter>(inst: &mut ComponentInternalInstance<A>) {
    let idx = inst.index;
    let wrapper_js = CI_WRAPPERS.with(|wr| {
        let mut m = wr.borrow_mut();
        if let Some(w) = m.get(&idx) {
            w.clone()
        } else {
            let w = Object::new();
            let _ =
                Reflect::set(&w, &JsValue::from_str("__ci_index"), &JsValue::from_f64(idx as f64));
            let hooks = Object::new();
            let _ = Reflect::set(&hooks, &JsValue::from_str("states"), &Array::new());
            let _ = Reflect::set(&hooks, &JsValue::from_str("index"), &JsValue::from_f64(0.0));
            let _ = Reflect::set(&w, &JsValue::from_str("__hooks"), &hooks);
            m.insert(idx, w.clone().into());
            w.into()
        }
    });
    CURRENT_INSTANCE.with(|c| *c.borrow_mut() = Some(wrapper_js.clone()));
    if wrapper_js.is_object() {
        let o = Object::from(wrapper_js.clone());
        // 重置索引
        let hooks = Reflect::get(&o, &JsValue::from_str("__hooks")).unwrap_or(JsValue::UNDEFINED);
        if hooks.is_object() {
            let hooks_obj = Object::from(hooks);
            let _ = Reflect::set(&hooks_obj, &JsValue::from_str("index"), &JsValue::from_f64(0.0));
        }
        // 写入只读 props
        let _ = Reflect::set(&o, &JsValue::from_str("propsRO"), &inst.props_ro);
    }
}

pub(crate) fn ensure_current_instance_hook_scope() -> Option<usize> {
    let inst = CURRENT_INSTANCE.with(|c| c.borrow().clone())?;
    if !inst.is_object() {
        return None;
    }
    let obj = Object::from(inst);
    let existing = Reflect::get(&obj, &JsValue::from_str(HOOK_EFFECT_SCOPE_KEY))
        .unwrap_or(JsValue::UNDEFINED);
    if let Some(scope_id) = existing.as_f64() {
        return Some(scope_id as usize);
    }
    let scope_id = create_detached_effect_scope();
    let _ = Reflect::set(
        &obj,
        &JsValue::from_str(HOOK_EFFECT_SCOPE_KEY),
        &JsValue::from_f64(scope_id as f64),
    );
    Some(scope_id)
}

pub(crate) fn with_current_instance_hook_scope<T>(runner: impl FnOnce() -> T) -> T {
    if let Some(scope_id) = ensure_current_instance_hook_scope() {
        push_effect_scope(scope_id);
        let out = runner();
        let _ = pop_effect_scope();
        out
    } else {
        runner()
    }
}

pub(crate) fn dispose_component_hook_scope(inst_index: usize) {
    let scope_id = CI_WRAPPERS.with(|wr| {
        wr.borrow().get(&inst_index).and_then(|wrapper| {
            if !wrapper.is_object() {
                return None;
            }
            let obj = Object::from(wrapper.clone());
            let value = Reflect::get(&obj, &JsValue::from_str(HOOK_EFFECT_SCOPE_KEY))
                .unwrap_or(JsValue::UNDEFINED);
            let _ = Reflect::set(
                &obj,
                &JsValue::from_str(HOOK_EFFECT_SCOPE_KEY),
                &JsValue::UNDEFINED,
            );
            value.as_f64().map(|v| v as usize)
        })
    });
    if let Some(scope_id) = scope_id {
        dispose_effect_scope(scope_id);
    }
}

/// 在当前实例上为 Hook 分配/复用一个插槽
/// - 若无当前实例，则直接执行 factory 返回对象
/// - 有实例时，依据 `__hooks.index` 或 `__forcedIndex` 计算插槽序号
/// 示例（JavaScript）：
/// ```javascript
/// const { setCurrentInstance, withHookSlot } = wasmModule;
/// setCurrentInstance({});
/// const a = withHookSlot(() => ({ id: 1 }));
/// const b = withHookSlot(() => ({ id: 2 }));
/// // 若再次调用 withHookSlot（且未强制索引），将分配下一个插槽
/// ```
#[wasm_bindgen(js_name = withHookSlot)]
pub fn with_hook_slot(factory: Function) -> JsValue {
    let inst = CURRENT_INSTANCE.with(|c| c.borrow().clone());
    if inst.is_none() {
        match factory.call0(&JsValue::NULL) {
            Ok(v) => return v,
            Err(e) => {
                #[cfg(feature = "dev")]
                {
                    if want_log("error", "hook:withHookSlot factory threw (no inst)") {
                        log("error", "hook:withHookSlot factory threw (no inst)");
                    }
                }
                mark_crashed_from_hook(&e);
                throw_val(e.clone());
            }
        }
    }
    let i = inst.unwrap();
    if !i.is_object() {
        match factory.call0(&JsValue::NULL) {
            Ok(v) => return v,
            Err(e) => {
                #[cfg(feature = "dev")]
                {
                    if want_log("error", "hook:withHookSlot factory threw (inst not object)") {
                        log("error", "hook:withHookSlot factory threw (inst not object)");
                    }
                }
                mark_crashed_from_hook(&e);
                throw_val(e.clone());
            }
        }
    }
    let hooks = Reflect::get(&i, &JsValue::from_str("__hooks")).unwrap_or(JsValue::UNDEFINED);
    let hooks_obj = if hooks.is_undefined() || hooks.is_null() {
        let o = Object::new();
        Reflect::set(&o, &JsValue::from_str("states"), &Array::new()).unwrap();
        Reflect::set(&o, &JsValue::from_str("index"), &JsValue::from_f64(0.0)).unwrap();
        Reflect::set(&i, &JsValue::from_str("__hooks"), &o).unwrap();
        o
    } else {
        hooks.unchecked_into::<Object>()
    };
    let forced =
        Reflect::get(&hooks_obj, &JsValue::from_str("__forcedIndex")).unwrap_or(JsValue::UNDEFINED);
    let idx =
        Reflect::get(&hooks_obj, &JsValue::from_str("index")).unwrap_or(JsValue::from_f64(0.0));
    let forced_num = forced.as_f64();
    let idx_num = idx.as_f64().unwrap_or(0.0);
    // 若存在 __forcedIndex，则使用它；否则使用并自增 index
    let i_slot = if let Some(f) = forced_num {
        let next = idx_num.max(f + 1.0);
        Reflect::set(&hooks_obj, &JsValue::from_str("index"), &JsValue::from_f64(next)).unwrap();
        f
    } else {
        // increment index
        let next = idx_num + 1.0;
        Reflect::set(&hooks_obj, &JsValue::from_str("index"), &JsValue::from_f64(next)).unwrap();
        idx_num
    };
    if forced_num.is_some() {
        // 复位 __forcedIndex，避免下次仍被强制
        Reflect::set(&hooks_obj, &JsValue::from_str("__forcedIndex"), &JsValue::UNDEFINED).ok();
    }
    let states_js =
        Reflect::get(&hooks_obj, &JsValue::from_str("states")).unwrap_or(Array::new().into());
    let states: Array = states_js.unchecked_into();
    let existing = states.get(i_slot as u32);
    if existing.is_undefined() {
        // 首次创建该插槽内容
        let created = match factory.call0(&JsValue::NULL) {
            Ok(v) => v,
            Err(e) => {
                #[cfg(feature = "dev")]
                {
                    if want_log("error", "hook:withHookSlot factory threw (create slot)") {
                        log("error", "hook:withHookSlot factory threw (create slot)");
                    }
                }
                mark_crashed_from_hook(&e);
                throw_val(e.clone());
            }
        };
        states.set(i_slot as u32, created.clone());
        return created;
    }
    existing
}

/// 按 Hook 唯一 id 绑定插槽索引并运行回调
/// - 行为：在当前实例的 `__hooks.__idMap` 中为 `id` 分配稳定索引，并通过设置 `__forcedIndex` 强制 `withHookSlot` 使用该索引
/// - 若此前不存在该 id，则使用 `states.length` 作为新索引
/// - 运行 `runner()`，并在结束后清除 `__forcedIndex`
#[wasm_bindgen(js_name = vaporWithHookId)]
pub fn vapor_with_hook_id(id: JsValue, runner: Function) -> JsValue {
    let inst = CURRENT_INSTANCE.with(|c| c.borrow().clone());
    if inst.is_none() {
        match runner.call0(&JsValue::NULL) {
            Ok(v) => return v,
            Err(e) => {
                #[cfg(feature = "dev")]
                {
                    if want_log("error", "hook:vaporWithHookId runner threw (no inst)") {
                        log("error", "hook:vaporWithHookId runner threw (no inst)");
                    }
                }
                mark_crashed_from_hook(&e);
                throw_val(e.clone());
            }
        }
    }
    let i = inst.unwrap();
    if !i.is_object() {
        match runner.call0(&JsValue::NULL) {
            Ok(v) => return v,
            Err(e) => {
                #[cfg(feature = "dev")]
                {
                    if want_log("error", "hook:vaporWithHookId runner threw (inst not object)") {
                        log("error", "hook:vaporWithHookId runner threw (inst not object)");
                    }
                }
                mark_crashed_from_hook(&e);
                throw_val(e.clone());
            }
        }
    }
    let hooks = Reflect::get(&i, &JsValue::from_str("__hooks")).unwrap_or(JsValue::UNDEFINED);
    let hooks_obj = if hooks.is_undefined() || hooks.is_null() {
        let o = Object::new();
        Reflect::set(&o, &JsValue::from_str("states"), &Array::new()).unwrap();
        Reflect::set(&o, &JsValue::from_str("index"), &JsValue::from_f64(0.0)).unwrap();
        Reflect::set(&i, &JsValue::from_str("__hooks"), &o).unwrap();
        o
    } else {
        hooks.unchecked_into::<Object>()
    };
    // 获取/创建 id->index 的映射表
    let idmap_v =
        Reflect::get(&hooks_obj, &JsValue::from_str("__idMap")).unwrap_or(JsValue::UNDEFINED);
    let idmap = if idmap_v.is_undefined() || idmap_v.is_null() {
        let m = Map::new();
        Reflect::set(&hooks_obj, &JsValue::from_str("__idMap"), &m).ok();
        m
    } else {
        idmap_v.unchecked_into::<Map>()
    };
    // 查找现有索引；若不存在则使用 states.length 创建新索引
    let states_js =
        Reflect::get(&hooks_obj, &JsValue::from_str("states")).unwrap_or(Array::new().into());
    let states: Array = states_js.unchecked_into();
    let existing = idmap.get(&id);
    let idx = if existing.is_undefined() {
        let next = JsValue::from_f64(states.length() as f64);
        idmap.set(&id, &next);
        next
    } else {
        existing
    };
    // 强制索引
    Reflect::set(&hooks_obj, &JsValue::from_str("__forcedIndex"), &idx).ok();
    let ret = match runner.call0(&JsValue::NULL) {
        Ok(v) => v,
        Err(e) => {
            mark_crashed_from_hook(&e);
            throw_val(e.clone());
        }
    };
    // 清理强制索引
    Reflect::set(&hooks_obj, &JsValue::from_str("__forcedIndex"), &JsValue::UNDEFINED).ok();
    ret
}

#[wasm_bindgen(typescript_custom_section)]
const TS_CONTEXT_DECL: &'static str = r#"
/**
 * 组件实例上下文，用于响应式访问 Hook 插槽
 */
export interface HookContainer {
  states: any[];
  index: number;
  __forcedIndex?: number;
  [key: string]: any;
}

/**
 * 组件实例上下文类型，可用于类型注解
 */
export type HookHost =
  | (Record<string, any> & { __hooks?: HookContainer })
  | null
  | undefined;

/**
 * 设置当前实例
 * 传入 `null/undefined` 表示清空；否则记录为 Some(instance)
 * 示例（JavaScript）：
 * ```javascript
 * const { setCurrentInstance, getCurrentInstance, withHookSlot, createSignal } = wasmModule;
 * const inst = { name: 'MyComponent' };
 * setCurrentInstance(inst);
 *
 * // 在实例上分配一个 Hook 插槽，用于存储状态对象
 * const state = withHookSlot(() => ({ count: createSignal(0) }));
 * console.log(getCurrentInstance()); // 当前实例或根实例
 * ```
 */
export function setCurrentInstance(instance: HookHost): void;

/**
 * 获取当前实例；若未设置则返回空值（null/undefined），不再构造默认根实例
 * 用法（JavaScript）：
 * ```javascript
 * const { setCurrentInstance, getCurrentInstance, withHookSlot } = wasmModule;
 *
 * // 设置并获取当前实例
 * setCurrentInstance({ name: 'A' });
 * const inst = getCurrentInstance(); // { name: 'A', ... }
 *
 * // 清空当前实例后，获取为空（undefined 或 null）
 * setCurrentInstance(undefined);
 * const none = getCurrentInstance(); // undefined（或 null）
 *
 * // 在有当前实例时，withHookSlot 为该实例分配/复用一个 Hook 插槽
 * setCurrentInstance({});
 * const state = withHookSlot(() => ({ count: 0 })); // 首次创建并缓存到 __hooks.states
 * ```
 */
export function getCurrentInstance(): HookHost;

/**
 * 在当前实例上为 Hook 分配/复用一个插槽
 * - 若无当前实例，则直接执行 factory 返回对象
 * - 有实例时，依据 `__hooks.index` 或 `__forcedIndex` 计算插槽序号
 * 示例（JavaScript）：
 * ```javascript
 * const { setCurrentInstance, withHookSlot } = wasmModule;
 * setCurrentInstance({});
 * const a = withHookSlot(() => ({ id: 1 }));
 * const b = withHookSlot(() => ({ id: 2 }));
 * // 若再次调用 withHookSlot（且未强制索引），将分配下一个插槽
 * ```
 */
export function withHookSlot<T = any>(factory: () => T): T;

/**
 * 通过唯一 id 为 Hook 分配稳定插槽索引并运行回调
 * - 若该 id 尚未存在，则以当前 `states.length` 作为新索引
 * - 运行期间通过设置 `__forcedIndex` 确保 `withHookSlot` 使用该索引
 * - 运行结束后自动清理 `__forcedIndex`
 */
export function vaporWithHookId<T = any>(id: string, runner: () => T): T;
"#;
