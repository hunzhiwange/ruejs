/*
useState 钩子：统一的轻量状态容器（支持 reactive/ref/signal 三种形态）

设计概览：
- 默认形态为 `reactive`：当初始值为对象/数组时直接返回其响应式代理；当为原始类型时自动包裹为 `{ value }` 并返回其代理。
- 可选 `kind`：
  - `'reactive'`：对象/数组的响应式代理；原始类型将自动包裹为 `{ value }`
  - `'ref'`：总是返回 `{ value }` 的响应式代理，便于统一读写
  - `'signal'`：返回底层 `SignalHandle`，适合需要精细控制 get/set/update/path 的场景
- 等值比较：通过 `options.equals(prev, next)` 自定义比较逻辑，返回 `true` 表示值相等，不触发订阅者。
*/
use js_sys::{Array, Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::context::with_hook_slot;
use crate::reactive::signal::{create_reactive, create_signal};

/// useState 钩子：统一的轻量状态容器（支持 reactive/ref/signal 三种形态）
///
/// 设计概览：
/// - 默认形态为 `reactive`：当初始值为对象/数组时直接返回其响应式代理；当为原始类型时自动包裹为 `{ value }` 并返回其代理。
/// - 可选 `kind`：
///   - `'reactive'`：对象/数组的响应式代理；原始类型将自动包裹为 `{ value }`
///   - `'ref'`：总是返回 `{ value }` 的响应式代理，便于统一读写
///   - `'signal'`：返回底层 `SignalHandle`，适合需要精细控制 get/set/update/path 的场景
/// - 等值比较：通过 `options.equals(prev, next)` 自定义比较逻辑，返回 `true` 表示值相等，不触发订阅者。
///
/// 使用示例（JavaScript / TypeScript）：
/// // reactive（默认）
/// const [state, setState] = useState({ user: { name: 'A' }, items: ['x'] })
/// state.user.name = 'B'        // 响应式写入
/// setState({ user: { name: 'C' }, items: ['y'] })  // 整体替换
/// setState(prev => ({ ...prev, user: { ...prev.user, name: 'D' } })) // 基于回调更新
///
/// // ref（原始类型亦可统一为 { value }）
/// const [count, setCount] = useState(0, { kind: 'ref' })
/// console.log(count.value)     // 0
/// setCount(1)                  // 触发订阅者
/// setCount(ref => { ref.value += 1 }) // 2
///
/// // signal（底层句柄）
/// const [sig, setSig] = useState({ a: 1 }, { kind: 'signal' })
/// console.log(sig.get())       // { a: 1 }
/// sig.set({ a: 2 })            // 触发订阅者
/// setSig(handle => ({ a: handle.peek().a + 1 })) // { a: 3 }
/// sig.setPath('a', 4)          // 路径写入
/// console.log(sig.get())       // { a: 4 }
///
/// // 自定义等值比较（默认使用 shallowEqual）
/// const [state2, setState2] = useState({ a: 1, b: 2 }, { kind: 'reactive', equals: (prev, next) => prev.a === next.a })
/// setState2({ a: 1, b: 3 })   // 不触发订阅者，因为 a 未改变
/// setState2({ a: 2, b: 4 })   // 触发订阅者，因为 a 改变
///
#[wasm_bindgen(js_name = useState)]
pub fn use_state(initial: JsValue, options: Option<JsValue>) -> JsValue {
    // 解析传入的 options：
    // - equals: 用于判断“值是否相等”，等于 true 时不触发订阅者
    // - kind: 决定容器类型（reactive/ref/signal）
    let mut equals: Option<Function> = None;
    let mut kind: String = "reactive".to_string();
    // 解析选项：equals 与 kind
    if let Some(opts) = &options {
        if opts.is_object() {
            // 取出 equals 字段并尝试转换为 JS 函数
            let eq = Reflect::get(opts, &JsValue::from_str("equals")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = eq.dyn_ref::<Function>() {
                equals = Some(f.clone());
            }
            // 取出 kind 字段（字符串），决定后续创建的容器形态
            let k = Reflect::get(opts, &JsValue::from_str("kind")).unwrap_or(JsValue::UNDEFINED);
            if let Some(s) = k.as_string() {
                kind = s;
            }
        }
    }
    // 获取当前组件实例的 hooks 槽位（lazy 初始化）
    let factory = Closure::wrap(Box::new(move || {
        // 该槽位对象存放两件事：
        // - created: 是否已经创建过状态容器
        // - state:   实际的状态对象/信号句柄
        let o = Object::new();
        Reflect::set(&o, &JsValue::from_str("created"), &JsValue::from_bool(false)).ok();
        Reflect::set(&o, &JsValue::from_str("state"), &JsValue::UNDEFINED).ok();
        o.into()
    }) as Box<dyn FnMut() -> JsValue>);
    let slot = with_hook_slot(factory.as_ref().clone().into());
    factory.forget();

    // 读取是否已经创建过
    let created = Reflect::get(&slot, &JsValue::from_str("created"))
        .unwrap_or(JsValue::FALSE)
        .as_bool()
        .unwrap_or(false);
    if !created {
        // 首次创建：
        // - 支持惰性初始值（当 initial 为函数时，调用并取其返回值作为初始状态）
        // - 这样可以避免在组件 setup 阶段做不必要的计算，符合常见 Hook 习惯用法
        let init = if let Some(f) = initial.dyn_ref::<Function>() {
            f.call0(&JsValue::NULL).unwrap_or(JsValue::UNDEFINED)
        } else {
            initial.clone()
        };
        // 标记初始值是否为对象/数组，用于 reactive 模式下的“原始类型包裹”判断
        let init_is_object = init.is_object();
        // 根据 kind 创建不同形态的状态容器
        let state = if kind == "signal" {
            // 直接创建基础信号
            let opts_out = equals.clone().map(|eqf| {
                let o = Object::new();
                let _ = Reflect::set(&o, &JsValue::from_str("equals"), &eqf);
                o.into()
            });
            create_signal(init, opts_out).into()
        } else if kind == "reactive" {
            // 创建响应式对象/数组代理
            let opts_out = equals.clone().map(|eqf| {
                let o = Object::new();
                let _ = Reflect::set(&o, &JsValue::from_str("equals"), &eqf);
                o.into()
            });
            create_reactive(init, opts_out)
        } else {
            // 默认使用 ref：包裹为 { value } 并创建响应式代理，等值比较针对 value 字段
            let eq_wrapped = equals.clone().map(|eqf| {
                // 将用户提供的 equals 包装为针对 {value} 的比较器
                let factory = Function::new_with_args(
                    "eq",
                    "return function(prev,next){ return eq(prev && prev.value, next && next.value); }",
                );
                factory.call1(&JsValue::NULL, &eqf.clone().into()).unwrap_or(JsValue::UNDEFINED)
            });
            let opts_out = eq_wrapped.map(|wrapped| {
                let o = Object::new();
                let _ = Reflect::set(&o, &JsValue::from_str("equals"), &wrapped);
                o.into()
            });
            // 将初始值包裹为 { value } 以统一写入路径
            let root = Object::new();
            let _ = Reflect::set(&root, &JsValue::from_str("value"), &init);
            create_reactive(root.into(), opts_out)
        };
        // 把创建好的状态写入 Hook 槽位，并置 created=true
        Reflect::set(&slot, &JsValue::from_str("state"), &state).ok();
        Reflect::set(&slot, &JsValue::from_str("created"), &JsValue::from_bool(true)).ok();
        // 标记是否为 reactive 对原始类型的包裹形态（{ value }）
        if kind == "reactive" {
            let _ = Reflect::set(
                &slot,
                &JsValue::from_str("__wrapped__"),
                &JsValue::from_bool(!init_is_object),
            );
        } else {
            let _ =
                Reflect::set(&slot, &JsValue::from_str("__wrapped__"), &JsValue::from_bool(false));
        }
    }

    // 取出已创建的状态对象（可能是代理或信号句柄）
    let state_obj = Reflect::get(&slot, &JsValue::from_str("state")).unwrap_or(JsValue::UNDEFINED);

    let s_obj = state_obj.clone();
    let is_signal = kind == "signal";
    let is_reactive = kind == "reactive";
    // reactive_wrapped_flag = true 说明当前 reactive 是对原始类型的 { value } 包裹
    let reactive_wrapped_flag = Reflect::get(&slot, &JsValue::from_str("__wrapped__"))
        .unwrap_or(JsValue::FALSE)
        .as_bool()
        .unwrap_or(false);
    // setter：支持直接赋值与基于回调计算两种形式
    // - signal：委托底层句柄的 set/update
    // - reactive：优先通过隐藏的 __signal__ 整体替换；回退为浅合并
    // - ref：写入 { value } 字段
    let set_fn = Closure::wrap(Box::new(move |arg: JsValue| {
        // 情况一：传入 updater 函数（接收当前状态，返回新值或执行就地修改）
        if let Some(updater) = arg.dyn_ref::<Function>() {
            let ret = updater.call1(&JsValue::NULL, &s_obj).unwrap_or(JsValue::UNDEFINED);
            if !ret.is_undefined() {
                if is_signal {
                    // 底层信号：直接调用 set(newValue)
                    let set_m = Reflect::get(&s_obj, &JsValue::from_str("set"))
                        .unwrap_or(JsValue::UNDEFINED);
                    if let Ok(sf) = set_m.dyn_into::<Function>() {
                        let _ = sf.call1(&s_obj, &ret);
                    }
                } else if is_reactive {
                    if reactive_wrapped_flag {
                        // reactive 包裹原始类型：统一写入到 .value
                        if ret.is_object() {
                            let v = Reflect::get(&ret, &JsValue::from_str("value"))
                                .unwrap_or(JsValue::UNDEFINED);
                            let _ = Reflect::set(&s_obj, &JsValue::from_str("value"), &v);
                        } else {
                            let _ = Reflect::set(&s_obj, &JsValue::from_str("value"), &ret);
                        }
                    } else {
                        // 尝试整体设置根对象：通过隐藏的 __signal__ 句柄
                        let sig_v = Reflect::get(&s_obj, &JsValue::from_str("__signal__"))
                            .unwrap_or(JsValue::UNDEFINED);
                        let set_m = Reflect::get(&sig_v, &JsValue::from_str("set"))
                            .unwrap_or(JsValue::UNDEFINED);
                        if let Ok(sf) = set_m.dyn_into::<Function>() {
                            // 若存在 set，则直接整体替换
                            let _ = sf.call1(&sig_v, &ret);
                        } else if ret.is_object() {
                            // 退化为浅合并
                            let s_obj_o: Object = s_obj.clone().unchecked_into();
                            let keys_cur = js_sys::Object::keys(&s_obj_o);
                            for i in 0..keys_cur.length() {
                                let k = keys_cur.get(i);
                                let _ = js_sys::Reflect::delete_property(&s_obj_o, &k);
                            }
                            let ret_o: Object = ret.clone().unchecked_into();
                            let keys_next = js_sys::Object::keys(&ret_o);
                            for i in 0..keys_next.length() {
                                let k = keys_next.get(i);
                                let v =
                                    js_sys::Reflect::get(&ret_o, &k).unwrap_or(JsValue::UNDEFINED);
                                let _ = js_sys::Reflect::set(&s_obj_o, &k, &v);
                            }
                        } else {
                            // 非对象，直接整体替换
                            let set_m2 = Reflect::get(&sig_v, &JsValue::from_str("set"))
                                .unwrap_or(JsValue::UNDEFINED);
                            if let Ok(sf2) = set_m2.dyn_into::<Function>() {
                                let _ = sf2.call1(&sig_v, &ret);
                            }
                        }
                    }
                } else {
                    // ref：仅更新 .value
                    let _ = Reflect::set(&s_obj, &JsValue::from_str("value"), &ret);
                }
            }
        } else {
            // 情况二：直接传入新值
            if is_signal {
                let set_m =
                    Reflect::get(&s_obj, &JsValue::from_str("set")).unwrap_or(JsValue::UNDEFINED);
                if let Ok(sf) = set_m.dyn_into::<Function>() {
                    let _ = sf.call1(&s_obj, &arg);
                }
            } else if is_reactive {
                if reactive_wrapped_flag {
                    // 包裹原始类型：写入 .value
                    if arg.is_object() {
                        let v = Reflect::get(&arg, &JsValue::from_str("value"))
                            .unwrap_or(JsValue::UNDEFINED);
                        let _ = Reflect::set(&s_obj, &JsValue::from_str("value"), &v);
                    } else {
                        let _ = Reflect::set(&s_obj, &JsValue::from_str("value"), &arg);
                    }
                } else {
                    // 尝试调用隐藏的 __signal__.set 以整体替换根对象
                    let sig_v = Reflect::get(&s_obj, &JsValue::from_str("__signal__"))
                        .unwrap_or(JsValue::UNDEFINED);
                    let set_m = Reflect::get(&sig_v, &JsValue::from_str("set"))
                        .unwrap_or(JsValue::UNDEFINED);
                    if let Ok(sf) = set_m.dyn_into::<Function>() {
                        let _ = sf.call1(&sig_v, &arg);
                    } else if arg.is_object() {
                        // 退化为浅合并：将属性赋值到当前代理对象
                        let s_obj_o: Object = s_obj.clone().unchecked_into();
                        let keys_cur = js_sys::Object::keys(&s_obj_o);
                        for i in 0..keys_cur.length() {
                            let k = keys_cur.get(i);
                            let _ = js_sys::Reflect::delete_property(&s_obj_o, &k);
                        }
                        let arg_o: Object = arg.clone().unchecked_into();
                        let keys_next = js_sys::Object::keys(&arg_o);
                        for i in 0..keys_next.length() {
                            let k = keys_next.get(i);
                            let v = js_sys::Reflect::get(&arg_o, &k).unwrap_or(JsValue::UNDEFINED);
                            let _ = js_sys::Reflect::set(&s_obj_o, &k, &v);
                        }
                    } else {
                        // 非对象，直接整体替换
                        let set_m2 = Reflect::get(&sig_v, &JsValue::from_str("set"))
                            .unwrap_or(JsValue::UNDEFINED);
                        if let Ok(sf2) = set_m2.dyn_into::<Function>() {
                            let _ = sf2.call1(&sig_v, &arg);
                        }
                    }
                }
            } else {
                // ref：仅更新 .value
                let _ = Reflect::set(&s_obj, &JsValue::from_str("value"), &arg);
            }
        }
        JsValue::UNDEFINED
    }) as Box<dyn FnMut(JsValue) -> JsValue>);
    let setter_js: JsValue = set_fn.as_ref().clone().into();
    set_fn.forget();

    // 返回 [state, setter] 二元组给 JS 侧
    let out = Array::new();
    out.push(&state_obj);
    out.push(&setter_js);
    out.into()
}

#[wasm_bindgen(typescript_custom_section)]
const TS_USE_STATE_DECL: &'static str = r#"
/**
 * useState 选项
 */
export interface UseStateOptions<T = any> {
  equals?: (prev: T, next: T) => boolean
  kind?: 'reactive' | 'ref' | 'signal'
}

/**
 * useState 钩子：统一的轻量状态容器（支持 reactive/ref/signal 三种形态）
 *
 * 设计概览：
 * - 默认形态为 `reactive`：当初始值为对象/数组时直接返回其响应式代理；当为原始类型时自动包裹为 `{ value }` 并返回其代理。
 * - 可选 `kind`：
 *   - `'reactive'`：对象/数组的响应式代理；原始类型将自动包裹为 `{ value }`
 *   - `'ref'`：总是返回 `{ value }` 的响应式代理，便于统一读写
 *   - `'signal'`：返回底层 `SignalHandle`，适合需要精细控制 get/set/update/path 的场景
 * - 等值比较：通过 `options.equals(prev, next)` 自定义比较逻辑，返回 `true` 表示值相等，不触发订阅者。
 *
 * 使用示例（JavaScript / TypeScript）：
 * // reactive（默认）
 * const [state, setState] = useState({ user: { name: 'A' }, items: ['x'] })
 * state.user.name = 'B'        // 响应式写入
 * setState({ user: { name: 'C' }, items: ['y'] })  // 整体替换
 * setState(prev => ({ ...prev, user: { ...prev.user, name: 'D' } })) // 基于回调更新
 *
 * // ref（原始类型亦可统一为 { value }）
 * const [count, setCount] = useState(0, { kind: 'ref' })
 * console.log(count.value)     // 0
 * setCount(1)                  // 触发订阅者
 * setCount(ref => { ref.value += 1 }) // 2
 *
 * // signal（底层句柄）
 * const [sig, setSig] = useState({ a: 1 }, { kind: 'signal' })
 * console.log(sig.get())       // { a: 1 }
 * sig.set({ a: 2 })            // 触发订阅者
 * setSig(handle => ({ a: handle.peek().a + 1 })) // { a: 3 }
 * sig.setPath('a', 4)          // 路径写入
 * console.log(sig.get())       // { a: 4 }
 *
 * // 自定义等值比较（默认使用 shallowEqual）
 * const [state2, setState2] = useState({ a: 1, b: 2 }, { kind: 'reactive', equals: (prev, next) => prev.a === next.a })
 * setState2({ a: 1, b: 3 })   // 不触发订阅者，因为 a 未改变
 * setState2({ a: 2, b: 4 })   // 触发订阅者，因为 a 改变
 */
export function useState<T extends Primitive>(
  initial: T | (() => T),
  options?: UseStateOptions<T> & { kind?: 'reactive' | 'ref' },
): [{ value: Widen<T> }, (v: Widen<T> | ((ref: { value: Widen<T> }) => Widen<T> | void)) => void]
export function useState<T extends Primitive>(
  initial: T | (() => T),
  options: UseStateOptions<T> & { kind: 'signal' },
): [SignalHandle<Widen<T>>, (v: Widen<T> | ((sig: SignalHandle<Widen<T>>) => Widen<T> | void)) => void]
export function useState<T extends object | Function>(
  initial: T | (() => T),
  options: UseStateOptions<T> & { kind: 'reactive' },
): [T, (v: T | ((state: T) => T | void)) => void]
export function useState<T extends object | Function>(
  initial: T | (() => T),
  options?: UseStateOptions<T> & { kind?: 'reactive' },
): [T, (v: T | ((state: T) => T | void)) => void]
export function useState<T extends object | Function>(
  initial: T | (() => T),
  options: UseStateOptions<T> & { kind: 'ref' },
): [{ value: T }, (v: T | ((ref: { value: T }) => T | void)) => void]
export function useState<T extends object | Function>(
  initial: T | (() => T),
  options: UseStateOptions<T> & { kind: 'signal' },
): [SignalHandle<T>, (v: T | ((sig: SignalHandle<T>) => T | void)) => void]
"#;
