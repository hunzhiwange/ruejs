/*
信号模块：可订阅的可变值容器

整体设计说明：
- 信号（Signal）是响应式系统的“源数据”载体。副作用通过读取信号值建立订阅，一旦值发生变化，
  所有订阅该信号的副作用就会被调度执行。
- 我们将信号值统一采用 `JsValue`，这使它可以直接承载 JS 世界的任何类型（字符串、对象、函数等）。

为什么用 `Rc<RefCell<Signal>>`？
- `Rc`：在单线程 wasm 环境中，引用计数即可满足共享所有权需求；无需 `Arc`/`Mutex` 的跨线程开销。
- `RefCell`：提供运行时的可变借用检查，允许我们在不可变上下文中内部修改值与订阅集合，
  适合响应式读写场景（尤其是从 JS 回调进入时缺少静态借用信息）。

等值比较策略：
- 默认使用 `Object.is(prev, next)`；可通过 `options.equals(prev, next)` 定制比较逻辑，返回 `true` 表示值相等，
  从而避免不必要的副作用触发。

订阅收集：
- 在 `get()` 读取时，如果存在当前运行的副作用（`CURRENT_EFFECT`），会把其 id 加入订阅集合 `subs`。
  这种“隐式收集”方式简洁高效，使用体验类似现代前端的自动依赖跟踪。
*/

use js_sys::{Array, Object};
use js_sys::{Function, Reflect};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

use crate::reactive::core::{CURRENT_EFFECT, EFFECTS, Signal, schedule_effect_run};
#[wasm_bindgen]
pub struct SignalHandle {
    pub(crate) inner: Rc<RefCell<Signal>>,
}

/// 信号句柄复制
impl Clone for SignalHandle {
    fn clone(&self) -> Self {
        SignalHandle { inner: self.inner.clone() }
    }
}

pub fn signal_from_proxy(proxy: &JsValue) -> Option<JsValue> {
    if !proxy.is_object() {
        return None;
    }
    let obj: Object = proxy.clone().unchecked_into();
    let sig_v = Reflect::get(&obj, &JsValue::from_str("__signal__")).unwrap_or(JsValue::UNDEFINED);
    if sig_v.is_undefined() || sig_v.is_null() {
        return None;
    }
    Some(sig_v)
}

/// 信号句柄
/// 封装底层 `Signal`，通过 wasm_bindgen 暴露到 JS 侧使用。
///
/// 方法总览（JS）：
/// - `get(): any` 读取当前值并进行依赖收集
/// - `set(value: any): void` 设置新值，按等值策略触发订阅者
/// - `update(updater: (current: any) => any): void` 基于回调派生并写入新值
/// - `peek(): any` 偷看当前值，不建立订阅
/// - `peekPath(path: string | Array<(string|number)>): any` 路径偷看，不建立订阅
/// - `setPath(path: string | Array<(string|number)>, value: any): void` 根据路径不可变写入
/// - `getPath(path: string | Array<(string|number)>): any` 根据路径读取并依赖收集
/// - `updatePath(path: string | Array<(string|number)>, updater: (currentAtPath: any) => any): void` 根据路径更新
/// - `toJSON(): any` 序列化时返回内部值
/// - `valueOf(): any` 返回内部值的原始表示
/// - `toString(): string` 返回 JSON 字符串或占位文本
/// - `value: any` 属性读写（读不收集，写等价于 `set`）
///
/// 说明：
/// - 字符串路径使用 `.` 分隔，纯数字段会自动转为数组索引（如 `items.0`）
/// - 数组路径可混合字符串与数字段（如 `['user','profile','name']`、`['items', 0]`）
/// - 根为非对象/数组时，路径写入将以空对象作为根进行赋值
/// Quick Start（JS）
/// const s = createSignal({ user: { name: 'A' }, items: ['x'] })
/// createEffect(() => { console.log('name:', s.getPath(['user','name'])) })
/// s.setPath(['user','name'], 'B') // 触发 effect
/// // 自定义等值比较（如 lodash.isEqual）
/// const s2 = createSignal({ a: 1 }, { equals: (p,n) => _.isEqual(p,n) })
/// s2.set({ a: 1 }) // 不触发（相等）
/// // 基本取值/偷看与路径偷看
/// console.log('get:', s.get())     // 订阅依赖
/// console.log('peek:', s.peek())   // 不订阅
/// console.log('peekPath:', s.peekPath('user.name')) // 不订阅
/// // 属性与调试方法
/// console.log(String(s))           // toString()
/// console.log(s.valueOf())         // valueOf()
/// console.log(JSON.stringify(s))   // toJSON()
/// // 直接通过属性读写
/// console.log(s.value)             // 只读（不订阅）
/// s.value = { user: { name: 'C' } } // 等价于 s.set(...)
/// 提供读取、设置、更新与偷看（peek）等 API，并在值变更时通知订阅的副作用。
#[wasm_bindgen]
impl SignalHandle {
    /// 便于调试：`JSON.stringify(signal)` 时返回内部值
    #[wasm_bindgen(js_name = toJSON)]
    pub fn to_json(&self) -> JsValue {
        self.inner.borrow().value.clone()
    }

    /// 便于调试：`signal.valueOf()` 返回内部值
    #[wasm_bindgen(js_name = valueOf)]
    pub fn value_of_js(&self) -> JsValue {
        self.inner.borrow().value.clone()
    }

    /// 便于调试：`String(signal)` 返回值的 JSON 字符串或占位文本
    #[wasm_bindgen(js_name = toString)]
    pub fn to_string_js(&self) -> String {
        let v = self.inner.borrow().value.clone();
        match js_sys::JSON::stringify(&v) {
            Ok(s) => s.as_string().unwrap_or_else(|| "[object SignalHandle]".to_string()),
            Err(_) => "[object SignalHandle]".to_string(),
        }
    }

    /// 只读调试：`signal.value` 直接返回内部值（不进行依赖收集）
    #[wasm_bindgen(getter, js_name = value)]
    pub fn value_getter(&self) -> JsValue {
        self.inner.borrow().value.clone()
    }

    /// 调试写入：`signal.value = next` 等价于 `signal.set(next)`
    /// 用法示例（JavaScript）：
    /// ```js
    /// const s = createSignal(0)
    /// createEffect(() => { console.log('v =', s.get()) })
    /// s.value = 1         // 触发 effect（等价于 s.set(1)）
    /// s.value = 1         // 若等值比较认为相等，则不触发
    /// ```
    #[wasm_bindgen(setter, js_name = value)]
    pub fn value_setter(&self, v: JsValue) {
        self.set_js(v);
    }

    /// 读取当前值，并在有正在运行的副作用时将其订阅到该信号
    #[wasm_bindgen(js_name = get)]
    pub fn get_js(&self) -> JsValue {
        CURRENT_EFFECT.with(|c| {
            if let Some(id) = *c.borrow() {
                // 将当前运行的副作用 id 加入订阅集合，形成“读取即订阅”的依赖关系
                let mut inner = self.inner.borrow_mut();
                if !inner.subs.contains(&id) {
                    inner.subs.push(id);
                }
            }
        });
        // 返回当前信号值（不改变值，仅建立订阅）
        self.inner.borrow().value.clone()
    }

    /// 设置新值，按等值比较决定是否通知订阅者
    #[wasm_bindgen(js_name = set)]
    pub fn set_js(&self, v: JsValue) {
        // 若存在自定义 setter（如 writable computed 的写入通道），优先委托给它
        let maybe_setter = { self.inner.borrow().setter.clone() };
        if let Some(st) = maybe_setter {
            let _ = st.call1(&JsValue::NULL, &v);
            return;
        }
        let mut s = self.inner.borrow_mut();
        // 计算是否“实际变更”：优先使用自定义等值比较；否则用 Object.is
        let changed = if let Some(eq) = &s.equals {
            let res = eq.call2(&JsValue::NULL, &s.value, &v).unwrap_or(JsValue::FALSE);
            !res.as_bool().unwrap_or(false)
        } else {
            !js_sys::Object::is(&s.value, &v)
        };

        #[cfg(feature = "dev")]
        {
            if changed {
                if crate::log::want_log("debug", "reactive:signal set") {
                    let prev_js: js_sys::JsString = js_sys::JSON::stringify(&s.value)
                        .unwrap_or(JsValue::from_str("<unstringifiable>").into());
                    let next_js: js_sys::JsString = js_sys::JSON::stringify(&v)
                        .unwrap_or(JsValue::from_str("<unstringifiable>").into());
                    let prev_val: JsValue = prev_js.into();
                    let next_val: JsValue = next_js.into();
                    let prev_str = prev_val.as_string().unwrap_or("<unknown>".to_string());
                    let next_str = next_val.as_string().unwrap_or("<unknown>".to_string());
                    let subs_count = s.subs.len();
                    crate::log::log(
                        "debug",
                        &format!(
                            "reactive:signal set changed=true prev={} -> next={} subs={}",
                            prev_str, next_str, subs_count
                        ),
                    );
                }
            }
        }

        s.value = v;
        if changed {
            let mut to_run: Vec<usize> = Vec::new();
            EFFECTS.with(|m| {
                let map = m.borrow();
                s.subs.retain(|id| {
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
            drop(s);
            for id in to_run {
                schedule_effect_run(id);
            }
        }
    }

    /// 根据回调对当前值进行计算并设置（相当于 set( updater(current) )）
    #[wasm_bindgen(js_name = update)]
    pub fn update_js(&self, updater: Function) {
        // 以当前值为输入调用更新器函数，得到 next 后复用 set_js 写入
        let current = { self.inner.borrow().value.clone() };
        let next = updater.call1(&JsValue::NULL, &current).unwrap_or(JsValue::UNDEFINED);
        self.set_js(next);
    }

    /// 偷看当前值：不进行依赖收集（不订阅当前副作用）
    #[wasm_bindgen(js_name = peek)]
    pub fn peek_js(&self) -> JsValue {
        // 偷看当前值：不进行依赖收集，适用于调试与无副作用读取
        self.inner.borrow().value.clone()
    }

    /// 根据路径设置对象/数组的子项值：不可变更新，生成新的根对象并触发订阅者
    ///
    /// 用法（JavaScript）：
    /// ```js
    /// const s = createSignal({ user: { profile: { name: 'A' }, age: 20 }, items: ['x'] })
    /// // 设置嵌套对象字段（数组路径）
    /// s.setPath(['user', 'profile', 'name'], 'B')
    /// // 设置数组元素（数组路径）
    /// s.setPath(['items', 0], 'y')
    /// // 字符串路径（以 . 分隔，数字段转为数组索引）
    /// s.setPath('user.profile.name', 'B')
    /// s.setPath('items.0', 'y')
    /// // 若根不是对象/数组，会以空对象作为根进行赋值
    /// s.setPath(['foo', 'bar'], 1)
    /// s.setPath('foo.bar', 1)
    /// ```
    ///
    /// 参数：
    /// - `path`: JS 数组或以 `.` 分隔的字符串（如 `['user','profile','name']`、`['items', 0]` 或 `'user.profile.name'`、`'items.0'`）
    /// - `value`: 目标路径的新值
    /// 行为与边界：
    /// - 路径缺失会自动以空对象占位，数组越界写入会扩展长度
    /// - 根为非对象/数组时以空对象为根进行赋值
    /// - 函数值作为普通值读写，不会被执行
    #[wasm_bindgen(js_name = setPath)]
    pub fn set_path_js(&self, path: JsValue, value: JsValue) {
        // 读取当前根值，并将路径参数规整为数组形式
        let root = { self.inner.borrow().value.clone() };
        let arr = normalize_path_to_array(&path);
        // 使用不可变更新生成新的根值（逐级浅拷贝后赋值）
        let next_root = set_path_immutable(&root, &arr, value);
        self.set_js(next_root);
    }

    /// 根据路径读取当前对象/数组的子项值（依赖收集）
    ///
    /// 用法（JavaScript）：
    /// ```js
    /// const s = createSignal({ user: { profile: { name: 'A' } } })
    /// const name1 = s.getPath(['user','profile','name']) // 'A'
    /// const name2 = s.getPath('user.profile.name') // 'A'
    /// // 在 watch 中使用路径读取会自动依赖收集
    /// watchFn(() => s.getPath(['user','profile','name']), (n, o) => {  })
    /// watchFn(() => s.getPath('user.profile.name'), (n, o) => {  })
    /// ```
    #[wasm_bindgen(js_name = getPath)]
    pub fn get_path_js(&self, path: JsValue) -> JsValue {
        CURRENT_EFFECT.with(|c| {
            if let Some(id) = *c.borrow() {
                // 路径读取同样建立订阅（以根为粒度），用于 watch 等依赖跟踪
                let mut inner = self.inner.borrow_mut();
                if !inner.subs.contains(&id) {
                    inner.subs.push(id);
                }
            }
        });
        // 读取当前根，并按路径逐级取值
        let root = { self.inner.borrow().value.clone() };
        let arr = normalize_path_to_array(&path);
        get_at_path(&root, &arr)
    }

    /// 路径偷看：不进行依赖收集（不订阅当前副作用），仅返回当前路径的值
    /// - 支持以 `.` 分隔的字符串路径（如 `user.profile.name`）或数组路径（如 `['user','profile','name']`、`['items', 0]`）
    /// - 行为与 `getPath` 相同，但不会触发依赖收集，适合用于调试/序列化
    #[wasm_bindgen(js_name = peekPath)]
    pub fn peek_path_js(&self, path: JsValue) -> JsValue {
        // 路径偷看：不进行依赖收集，仅做读取
        let root = { self.inner.borrow().value.clone() };
        let arr = normalize_path_to_array(&path);
        get_at_path(&root, &arr)
    }

    /// 根据路径函数式更新子项：`updater(currentAtPath) -> nextAtPath`
    ///
    /// 用法（JavaScript）：
    /// ```js
    /// const s = createSignal({ user: { age: 20 }, items: ['x'] })
    /// s.updatePath(['user','age'], prev => prev + 1) // age: 21
    /// s.updatePath(['user','name'], prev => (prev || '').toUpperCase())
    /// // 使用字符串路径
    /// s.updatePath('user.age', prev => prev + 1) // age: 21
    /// s.updatePath('items.0', prev => (prev || '').toUpperCase())
    /// ```
    #[wasm_bindgen(js_name = updatePath)]
    pub fn update_path_js(&self, path: JsValue, updater: Function) {
        // 基于当前路径值调用更新器，随后进行不可变路径写入
        let current_root = { self.inner.borrow().value.clone() };
        let arr = normalize_path_to_array(&path);
        let cur_at = get_at_path(&current_root, &arr);
        let next_at = updater.call1(&JsValue::NULL, &cur_at).unwrap_or(JsValue::UNDEFINED);
        let next_root = set_path_immutable(&current_root, &arr, next_at);
        self.set_js(next_root);
    }
}

/// 工具：不可变设置路径，返回新的根对象/数组
fn set_path_immutable(root: &JsValue, path: &Array, value: JsValue) -> JsValue {
    // 生成根的浅拷贝作为更新基准
    let mut next_root = clone_js_value(root);
    // 若根不是对象/数组，初始化为空对象（便于路径赋值）
    if !(next_root.is_object() || Array::is_array(root)) {
        next_root = Object::new().into();
    }

    // 逐级克隆子节点并在最后一段赋值，整体保持不可变（共享未变更分支）
    let plen = path.length();
    if plen == 0 {
        return value;
    }
    let mut parent = next_root.clone();
    for i in 0..(plen - 1) {
        let seg = path.get(i);
        let child = Reflect::get(&parent, &seg).unwrap_or(JsValue::UNDEFINED);
        let child_clone = if child.is_undefined() || child.is_null() {
            Object::new().into()
        } else {
            clone_js_value(&child)
        };
        let _ = Reflect::set(&parent, &seg, &child_clone);
        parent = child_clone;
    }
    let last = path.get(plen - 1);
    let _ = Reflect::set(&parent, &last, &value);
    next_root
}

/// 工具：读取路径值
fn get_at_path(root: &JsValue, path: &Array) -> JsValue {
    let mut cur = root.clone();
    let plen = path.length();
    for i in 0..plen {
        let seg = path.get(i);
        cur = Reflect::get(&cur, &seg).unwrap_or(JsValue::UNDEFINED);
        if cur.is_undefined() || cur.is_null() {
            // 提前终止：遇到空值时不再继续深入
            break;
        }
    }
    cur
}

/// 工具：将路径参数统一转换为 JS 数组
/// 支持：
/// - JS 数组：直接克隆并返回
/// - 字符串：按 `.` 分割；纯数字段转换为数字索引，其余按字符串处理
fn normalize_path_to_array(input: &JsValue) -> Array {
    if js_sys::Array::is_array(input) {
        return js_sys::Array::from(input);
    }
    if let Some(s) = input.as_string() {
        let out = js_sys::Array::new();
        for seg in s.split('.') {
            if seg.is_empty() {
                continue;
            }
            if let Ok(n) = seg.parse::<i64>() {
                // 纯数字段视为数组索引
                out.push(&JsValue::from_f64(n as f64));
            } else {
                // 其他按字符串键处理
                out.push(&JsValue::from_str(seg));
            }
        }
        return out;
    }
    // 其他类型：返回空数组（相当于对根赋值/读取）
    js_sys::Array::new()
}

/// 工具：浅拷贝对象或数组；其他类型直接返回原值
fn clone_js_value(val: &JsValue) -> JsValue {
    if Array::is_array(val) {
        // 数组浅拷贝：复制元素
        let arr: Array = Array::from(val);
        let out = Array::new();
        let len = arr.length();
        for i in 0..len {
            out.push(&arr.get(i));
        }
        out.into()
    } else if val.is_object() {
        // 对象浅拷贝：复制自有键值
        let obj: Object = val.clone().unchecked_into();
        let keys = Object::keys(&obj);
        let out = Object::new();
        let len = keys.length();
        for i in 0..len {
            let k = keys.get(i);
            let v = Reflect::get(&obj, &k).unwrap_or(JsValue::UNDEFINED);
            let _ = Reflect::set(&out, &k, &v);
        }
        out.into()
    } else {
        // 原始类型：直接返回（不可变）
        val.clone()
    }
}

/// 创建基础信号（不含自定义等值比较）
fn make_signal(initial: JsValue, equals: Option<Function>) -> SignalHandle {
    SignalHandle {
        inner: Rc::new(RefCell::new(Signal {
            value: initial,
            subs: Default::default(),
            equals,
            setter: None,
        })),
    }
}

/// 创建带选项的信号
/// options.equals: Function(prev, next) -> bool，返回 true 表示值相等（不触发）
/// 示例（JavaScript）：
/// ```javascript
/// const { createSignal, createEffect } = wasmModule;
/// const count = createSignal(0);
/// createEffect(() => {
///   console.log('count =', count.get());
/// });
/// count.set(1); // 触发 effect
///
/// const eq = (prev, next) => prev === next;
/// const s = createSignal(0, { equals: eq });
/// s.set(0); // 不触发，因为 equals 返回 true（相等）
/// s.set(2); // 触发订阅者
/// ```
#[wasm_bindgen(js_name = createSignal)]
pub fn create_signal(initial: JsValue, options: Option<JsValue>) -> SignalHandle {
    let equals = if let Some(opts) = options {
        if opts.is_object() {
            let eq =
                Reflect::get(&opts, &JsValue::from_str("equals")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = eq.dyn_ref::<Function>() { Some(f.clone()) } else { None }
        } else {
            None
        }
    } else {
        None
    };
    // 基于初始值与可选等值比较创建信号句柄
    make_signal(initial, equals)
}

/// 创建 Ref：返回一个带有 `value` 字段的响应式代理对象
///
/// 用法（JavaScript / TypeScript）：
/// ```ts
/// // 基本使用：读写 value，自动依赖收集
/// const r = createRef(0)
/// console.log(r.value)        // 0
/// r.value = 1                 // 触发订阅者
///
/// // 与 watchEffect 配合（依赖自动收集）
/// const stop = watchEffect(() => {
///   console.log('ref value =', r.value)
/// })
/// r.value = 2                 // 触发前面的 watchEffect
/// stop()                      // 停止响应
///
/// // peek：查看当前值，不收集依赖（不会订阅当前副作用）
/// const cur = r.peek()        // 仅返回值，不产生订阅
///
/// // update：基于当前值计算并写回
/// r.update(prev => prev + 1)  // 等价于 r.value = (prev + 1)
///
/// // 自定义等值比较：避免无意义的触发
/// const r2 = createRef({ a: 1 }, { equals: (p, n) => _.isEqual(p?.value, n?.value) })
/// r2.value = { a: 1 }         // 不触发（相等）
///
/// // 与组件/DOM 结合（Vapor 模式下自动更新）
/// // <span>{r.value}</span> 会被编译为原生 DOM + 响应式更新
/// ```
#[wasm_bindgen(js_name = createRef)]
pub fn create_ref(initial: JsValue, options: Option<JsValue>) -> JsValue {
    // 将初始值封装为 `{ value: any }`，统一为“对象路径写入”的模型
    let root = Object::new();
    Reflect::set(&root, &JsValue::from_str("value"), &initial).ok();
    let mut opts_out: Option<JsValue> = None;
    if let Some(opts) = options.clone() {
        if opts.is_object() {
            let eq =
                Reflect::get(&opts, &JsValue::from_str("equals")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = eq.dyn_ref::<Function>() {
                // 适配自定义等值比较：改为比较包裹对象的 `value` 字段
                let factory = Function::new_with_args(
                    "eq",
                    "return function(prev,next){ return eq(prev && prev.value, next && next.value); }",
                );
                let wrapped =
                    factory.call1(&JsValue::NULL, &f.clone().into()).unwrap_or(JsValue::UNDEFINED);
                let o = Object::new();
                Reflect::set(&o, &JsValue::from_str("equals"), &wrapped).ok();
                opts_out = Some(o.into());
            } else {
                opts_out = Some(opts);
            }
        }
    }
    // 基于包裹对象创建响应式代理（内部持有 `SignalHandle`）
    let proxy = create_reactive(root.into(), opts_out);
    proxy
}

/// 创建 Reactive：返回一个对象/数组的响应式代理（深/浅、只读可选）
///
/// 用法（JavaScript / TypeScript）：
/// ```ts
/// // 基础对象：读取与写入都响应式
/// const state = createReactive({ user: { name: 'A' }, items: ['x'] })
/// console.log(state.user.name)     // 'A'
/// state.user.name = 'B'            // 写入嵌套字段，触发订阅者
/// state.items.push('y')            // 数组写入也可触发（通过路径写入实现不可变更新）
///
/// // 在 Vapor JSX 中使用（自动 DOM 更新）
/// // <span>{state.user.name}</span>
/// // <input value={state.user.name} onInput={e => state.user.name = e.target.value} />
///
/// // 只读代理：禁止写入
/// const ro = createReactive({ a: 1 }, { readonly: true })
/// // ro.a = 2 // 将被忽略或导致失败（只读）
///
/// // 浅代理：仅对顶层对象进行代理，子对象不递归代理
/// const sh = createReactive({ nested: { a: 1 } }, { shallow: true })
/// // sh.nested 仍为普通对象（非代理）
///
/// // 原始类型：普通值会自动包裹为 { value } 并返回其代理
/// const num = createReactive(0)
/// console.log(num.value)       // 0
/// num.value = 1               // 写入 value 字段触发订阅者
/// const str = createReactive('A')
/// str.value = 'B'             // 原始类型统一通过 value 字段读写
///
/// // 自定义等值比较：用于控制触发频率
/// const eq = (prev: any, next: any) => _.isEqual(prev, next)
/// const obj = createReactive({ a: 1 }, { equals: eq })
/// obj.a = 1 // 不触发（相等）
/// ```
#[wasm_bindgen(js_name = createReactive)]
pub fn create_reactive(initial: JsValue, options: Option<JsValue>) -> JsValue {
    // 解析选项：等值比较、自读标记、浅代理标记
    let mut equals: Option<Function> = None;
    let mut readonly = false;
    let mut shallow = false;
    if let Some(opts) = &options {
        if opts.is_object() {
            let eq = Reflect::get(opts, &JsValue::from_str("equals")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = eq.dyn_ref::<Function>() {
                equals = Some(f.clone());
            }
            let ro =
                Reflect::get(opts, &JsValue::from_str("readonly")).unwrap_or(JsValue::UNDEFINED);
            readonly = ro.as_bool().unwrap_or(false);
            let sh =
                Reflect::get(opts, &JsValue::from_str("shallow")).unwrap_or(JsValue::UNDEFINED);
            shallow = sh.as_bool().unwrap_or(false);
        }
    }
    // 若初始值为原始类型（非对象/数组），自动包裹为 { value }；
    // 并将等值比较适配为比较包裹对象的 value 字段，保证语义一致
    let mut init_val = initial.clone();
    if !initial.is_object() {
        let root = Object::new();
        let _ = Reflect::set(&root, &JsValue::from_str("value"), &initial);
        init_val = root.into();
        if let Some(eqf) = equals.clone() {
            let factory = Function::new_with_args(
                "eq",
                "return function(prev,next){ return eq(prev && prev.value, next && next.value); }",
            );
            let wrapped =
                factory.call1(&JsValue::NULL, &eqf.clone().into()).unwrap_or(JsValue::UNDEFINED);
            if let Some(wf) = wrapped.dyn_ref::<Function>() {
                equals = Some(wf.clone());
            }
        }
    }
    // 以 `SignalHandle` 存储根对象，统一通过路径进行读写与依赖管理
    let sig = create_signal(
        init_val,
        options.map(|_| {
            let o = Object::new();
            if let Some(eqf) = equals.clone() {
                let _ = Reflect::set(&o, &JsValue::from_str("equals"), &eqf);
            }
            o.into()
        }),
    );
    let path = Array::new();
    // 通过 JS `Proxy` 生成响应式代理：拦截读写并转发为对 `SignalHandle` 的路径操作
    make_proxy(sig, path, readonly, shallow)
}

fn make_proxy(sig: SignalHandle, path: Array, readonly_flag: bool, shallow_flag: bool) -> JsValue {
    let current_holder = sig.peek_path_js(path.clone().into());
    // 选择 Proxy 的 target：使用“镜像快照”而非当前 holder 引用，避免修改 target 影响真实值
    // - 数组：新建空数组并复制元素
    // - 对象：新建空对象并复制键值
    // - 其他：空对象
    let target: JsValue = if js_sys::Array::is_array(&current_holder) {
        let out = js_sys::Array::new();
        let arr = js_sys::Array::from(&current_holder);
        let len = arr.length();
        for i in 0..len {
            out.push(&arr.get(i));
        }
        out.into()
    } else if current_holder.is_object() {
        let out = js_sys::Object::new();
        let obj: js_sys::Object = current_holder.clone().unchecked_into();
        let keys = js_sys::Object::keys(&obj);
        let len = keys.length();
        for i in 0..len {
            let k = keys.get(i);
            let v = js_sys::Reflect::get(&obj, &k).unwrap_or(JsValue::UNDEFINED);
            let _ = js_sys::Reflect::set(&out, &k, &v);
        }
        out.into()
    } else {
        Object::new().into()
    };
    let s_get = sig.clone();
    let p_get = path.clone();
    // get trap：属性读取与包装
    let get_trap = wasm_bindgen::closure::Closure::wrap(Box::new(
        move |_: JsValue, key: JsValue, _: JsValue| {
            // 暴露隐藏通道：读取 `__signal__` 可获得底层信号句柄
            if let Some(s) = key.as_string() {
                // 原始值代理：确保读取 `.value` 返回内部包装对象的 value，并进行依赖收集
                if s == "value" {
                    let holder = s_get.get_path_js(p_get.clone().into());
                    if holder.is_object() {
                        let o: Object = holder.clone().unchecked_into();
                        let vv = Reflect::get(&o, &JsValue::from_str("value"))
                            .unwrap_or(JsValue::UNDEFINED);
                        if !shallow_flag {
                            if vv.is_object() && vv.dyn_ref::<Function>().is_none() {
                                let child_path = js_sys::Array::from(&p_get);
                                child_path.push(&JsValue::from_str("value"));
                                let child = make_proxy(
                                    s_get.clone(),
                                    child_path,
                                    readonly_flag,
                                    shallow_flag,
                                );
                                return child;
                            }
                        }
                        return vv;
                    }
                    return JsValue::UNDEFINED;
                }
                // 调试快照：返回当前根对象快照（不收集依赖）
                if s == "__rue_raw__" {
                    return s_get.peek_path_js(p_get.clone().into());
                }
                if s == "__signal__" {
                    return JsValue::from(s_get.clone());
                }
                if s == "__isReactive__" {
                    return JsValue::from_bool(true);
                }
                if s == "__rue_path__" {
                    return p_get.clone().into();
                }
                if s == "__rue_raw__" || s == "__rue_target__" {
                    let holder = s_get.get_path_js(p_get.clone().into());
                    return holder;
                }
                if s == "toJSON" {
                    let factory = Function::new_with_args(
                        "sig,path",
                        "return function(){ return sig.peekPath(path); }",
                    );
                    let f = factory
                        .call2(&JsValue::NULL, &JsValue::from(s_get.clone()), &p_get.clone().into())
                        .unwrap_or(JsValue::UNDEFINED);
                    return f;
                }
                if s == "valueOf" {
                    let factory = Function::new_with_args(
                        "sig,path",
                        "return function(){ return sig.peekPath(path); }",
                    );
                    let f = factory
                        .call2(&JsValue::NULL, &JsValue::from(s_get.clone()), &p_get.clone().into())
                        .unwrap_or(JsValue::UNDEFINED);
                    return f;
                }
                if s == "toString" {
                    let factory = Function::new_with_args(
                        "sig,path",
                        "return function(){ try { var v = sig.peekPath(path); return typeof v === 'string' ? v : JSON.stringify(v); } catch(e) { return '[object RueReactive]'; } }",
                    );
                    let f = factory
                        .call2(&JsValue::NULL, &JsValue::from(s_get.clone()), &p_get.clone().into())
                        .unwrap_or(JsValue::UNDEFINED);
                    return f;
                }
            }
            // 从信号在当前路径处获取底层对象，并读取该属性
            let holder = s_get.get_path_js(p_get.clone().into());
            let v = Reflect::get(&holder, &key).unwrap_or(JsValue::UNDEFINED);
            // 若为函数，返回包装函数，保证 this 绑定为当前路径的底层对象
            if let Some(func) = v.dyn_ref::<Function>() {
                // 每次调用时重新获取当前路径对应的底层对象，作为 `this`
                let s_get2 = s_get.clone();
                let p_get2 = p_get.clone();
                let get_base = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                    s_get2.get_path_js(p_get2.clone().into())
                })
                    as Box<dyn FnMut() -> JsValue>);
                // 构造包装器：(...args) => func.apply(base, args)
                // readonly 模式下：对 base 进行浅克隆，避免对真实值造成原地修改
                // 设计说明（修改点）：
                // - 针对 TypedArray（ArrayBuffer 视图），必须确保方法执行的 this 仍是 TypedArray 实例；
                //   直接 Object.assign 会破坏内部槽，导致诸如 subarray()/set()/sort() 抛错或误改原值。
                // - 采用 base.slice() 为 Array 与 TypedArray 统一生成可变副本，
                //   使只读代理上的变异方法在副本上执行，从而不影响真实值（__rue_raw__ 保持不变）。
                let factory = Function::new_with_args(
                    "fn,getBase,readonly",
                    "return function(){ \
                       var args = Array.prototype.slice.call(arguments); \
                       var base = getBase(); \
                       if (readonly) { \
                         if (Array.isArray(base)) { \
                           base = base.slice(); \
                         } else if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(base) && typeof base.slice === 'function') { \
                           base = base.slice(); \
                         } else if (base && typeof base === 'object') { \
                           base = Object.assign({}, base); \
                         } \
                       } \
                       return fn.apply(base, args); \
                     }",
                );
                let wrapped = factory
                    .call3(
                        &JsValue::NULL,
                        &func.clone().into(),
                        &get_base.as_ref().clone().into(),
                        &JsValue::from_bool(readonly_flag),
                    )
                    .unwrap_or(JsValue::UNDEFINED);
                get_base.forget();
                return wrapped;
            }
            // 递归代理：当非浅代理且读取到子对象时，为其生成子代理
            if !shallow_flag {
                if v.is_object() && v.dyn_ref::<Function>().is_none() {
                    let child_path = js_sys::Array::from(&p_get);
                    child_path.push(&key);
                    let child = make_proxy(s_get.clone(), child_path, readonly_flag, shallow_flag);
                    return child;
                }
            }
            v
        },
    )
        as Box<dyn FnMut(JsValue, JsValue, JsValue) -> JsValue>);

    let s_set = sig.clone();
    let p_set = path.clone();
    let t_mirror = target.clone();
    let set_trap = wasm_bindgen::closure::Closure::wrap(Box::new(
        move |_: JsValue, key: JsValue, value: JsValue, _: JsValue| {
            // 只读模式：直接拒绝写入
            if readonly_flag {
                return JsValue::from_bool(false);
            }
            // 路径写入：构造子路径并委托给信号的 `set_path_js`
            let child_path = js_sys::Array::from(&p_set);
            child_path.push(&key);
            s_set.set_path_js(child_path.clone().into(), value);
            // 同步 Proxy target 的快照内容，便于 DevTools 直观显示最新值
            let latest = s_set.peek_path_js(p_set.clone().into());
            if js_sys::Array::is_array(&t_mirror) && js_sys::Array::is_array(&latest) {
                let mirror_arr: js_sys::Array = t_mirror.clone().unchecked_into();
                let latest_arr: js_sys::Array = js_sys::Array::from(&latest);
                mirror_arr.set_length(0);
                let len = latest_arr.length();
                for i in 0..len {
                    mirror_arr.push(&latest_arr.get(i));
                }
            } else if t_mirror.is_object() && latest.is_object() {
                let mirror_obj: js_sys::Object = t_mirror.clone().unchecked_into();
                let latest_obj: js_sys::Object = latest.clone().unchecked_into();
                // 清空现有键
                let mirror_keys = js_sys::Object::keys(&mirror_obj);
                let mlen = mirror_keys.length();
                for i in 0..mlen {
                    let k = mirror_keys.get(i);
                    let _ = js_sys::Reflect::delete_property(&mirror_obj, &k);
                }
                // 复制最新键值
                let latest_keys = js_sys::Object::keys(&latest_obj);
                let llen = latest_keys.length();
                for i in 0..llen {
                    let k = latest_keys.get(i);
                    let v = js_sys::Reflect::get(&latest_obj, &k).unwrap_or(JsValue::UNDEFINED);
                    let _ = js_sys::Reflect::set(&mirror_obj, &k, &v);
                }
            }
            JsValue::from_bool(true)
        },
    )
        as Box<dyn FnMut(JsValue, JsValue, JsValue, JsValue) -> JsValue>);

    let s_has = sig.clone();
    let p_has = path.clone();
    let has_trap = wasm_bindgen::closure::Closure::wrap(Box::new(move |_: JsValue, key: JsValue| {
        // `in` 操作符：委托给底层对象的 `Reflect.has`
        let obj = s_has.get_path_js(p_has.clone().into());
        let r = Reflect::has(&obj, &key).unwrap_or(false);
        JsValue::from_bool(r)
    })
        as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);

    let s_keys = sig.clone();
    let p_keys = path.clone();
    let own_keys_trap = wasm_bindgen::closure::Closure::wrap(Box::new(move |_: JsValue| {
        // 枚举键：当底层为空时返回空数组，否则 `Reflect.ownKeys`
        let obj = s_keys.get_path_js(p_keys.clone().into());
        if obj.is_undefined() || obj.is_null() {
            return js_sys::Array::new().into();
        }
        let keys = js_sys::Reflect::own_keys(&obj).unwrap_or(js_sys::Array::new());
        if keys.length() == 1 {
            let k = keys.get(0);
            if k.as_string() == Some("value".to_string()) {
                // 隐藏仅包含 value 的原始值包装（{value}），避免 DevTools 展示冗余
                return js_sys::Array::new().into();
            }
        }
        keys.into()
    })
        as Box<dyn FnMut(JsValue) -> JsValue>);

    let s_desc = sig.clone();
    let p_desc = path.clone();
    let desc_trap =
        wasm_bindgen::closure::Closure::wrap(Box::new(move |_: JsValue, key: JsValue| {
            // 属性描述符获取：确保返回的描述符 `configurable=true`，以便代理能覆盖
            let obj = s_desc.get_path_js(p_desc.clone().into());
            if obj.is_object() {
                let o: Object = obj.clone().unchecked_into();
                let d = js_sys::Object::get_own_property_descriptor(&o, &key);
                if d.is_object() {
                    let _ = Reflect::set(
                        &d,
                        &JsValue::from_str("configurable"),
                        &JsValue::from_bool(true),
                    );
                }
                d
            } else {
                JsValue::UNDEFINED
            }
        })
            as Box<dyn FnMut(JsValue, JsValue) -> JsValue>);

    let handler = Object::new();
    // 将各个 trap 方法挂入 handler
    Reflect::set(&handler, &JsValue::from_str("get"), &get_trap.as_ref().clone().into()).ok();
    Reflect::set(&handler, &JsValue::from_str("set"), &set_trap.as_ref().clone().into()).ok();
    Reflect::set(&handler, &JsValue::from_str("has"), &has_trap.as_ref().clone().into()).ok();
    Reflect::set(&handler, &JsValue::from_str("ownKeys"), &own_keys_trap.as_ref().clone().into())
        .ok();
    Reflect::set(
        &handler,
        &JsValue::from_str("getOwnPropertyDescriptor"),
        &desc_trap.as_ref().clone().into(),
    )
    .ok();
    // 避免闭包在 Rust 侧被释放，交由 JS 持有（与 Proxy 生命周期一致）
    get_trap.forget();
    set_trap.forget();
    has_trap.forget();
    own_keys_trap.forget();
    desc_trap.forget();

    // 通过 JS 构造器创建 Proxy：拦截读写并转发到信号路径
    let ctor = Function::new_with_args("t,h", "return new Proxy(t,h)");
    let proxy = ctor
        .call2(&JsValue::NULL, &target.clone().into(), &handler.clone().into())
        .unwrap_or(JsValue::UNDEFINED);

    // 初始化：同步 Proxy target 的内容与当前 holder 快照，避免初始展示为 undefined
    {
        let latest0 = sig.peek_path_js(path.clone().into());
        if js_sys::Array::is_array(&target) && js_sys::Array::is_array(&latest0) {
            let mirror_arr: js_sys::Array = target.clone().unchecked_into();
            let latest_arr: js_sys::Array = js_sys::Array::from(&latest0);
            mirror_arr.set_length(0);
            let len = latest_arr.length();
            for i in 0..len {
                mirror_arr.push(&latest_arr.get(i));
            }
        } else if target.is_object() && latest0.is_object() {
            let mirror_obj: js_sys::Object = target.clone().unchecked_into();
            let latest_obj: js_sys::Object = latest0.clone().unchecked_into();
            // 清空现有键
            let mirror_keys = js_sys::Object::keys(&mirror_obj);
            let mlen = mirror_keys.length();
            for i in 0..mlen {
                let k = mirror_keys.get(i);
                let _ = js_sys::Reflect::delete_property(&mirror_obj, &k);
            }
            // 复制最新键值
            let latest_keys = js_sys::Object::keys(&latest_obj);
            let llen = latest_keys.length();
            for i in 0..llen {
                let k = latest_keys.get(i);
                let v = js_sys::Reflect::get(&latest_obj, &k).unwrap_or(JsValue::UNDEFINED);
                let _ = js_sys::Reflect::set(&mirror_obj, &k, &v);
            }
        }
    }

    {
        // 设计说明（修改点）：
        // - 针对原始值代理（形如 { value }），在 Proxy 上定义只读的 value 访问器：
        //   1) 读取 value 时始终从 holder（真实值）取出，避免镜像 target 导致 undefined。
        //   2) 通过访问器隐藏 ownKeys 的 "value"（与上面的 ownKeys trap 配合），保持 DevTools 展示友好。
        let s_for_val = sig.clone();
        let p_for_val = path.clone();
        let v = s_for_val.peek_path_js(p_for_val.clone().into());
        if v.is_object() {
            let o: Object = v.clone().unchecked_into();
            let keys = Object::keys(&o);
            if keys.length() == 1 {
                let k = keys.get(0);
                if k.as_string() == Some("value".to_string()) {
                    let value_getter = wasm_bindgen::closure::Closure::wrap(Box::new(move || {
                        let v2 = s_for_val.peek_path_js(p_for_val.clone().into());
                        if v2.is_object() {
                            let o2: Object = v2.clone().unchecked_into();
                            let vv = Reflect::get(&o2, &JsValue::from_str("value"))
                                .unwrap_or(JsValue::UNDEFINED);
                            return vv;
                        }
                        v2
                    })
                        as Box<dyn FnMut() -> JsValue>);
                    let desc = Object::new();
                    Reflect::set(
                        &desc,
                        &JsValue::from_str("get"),
                        &value_getter.as_ref().clone().into(),
                    )
                    .ok();
                    Reflect::set(&desc, &JsValue::from_str("configurable"), &JsValue::TRUE).ok();
                    Reflect::set(&desc, &JsValue::from_str("enumerable"), &JsValue::TRUE).ok();
                    let proxy_obj: Object = proxy.clone().unchecked_into();
                    js_sys::Object::define_property(&proxy_obj, &JsValue::from_str("value"), &desc);
                    value_getter.forget();
                }
            }
        }
    }

    proxy
}

#[wasm_bindgen(typescript_custom_section)]
const TS_SIGNAL_DECL: &'static str = r#"
/**
 * 自定义等值比较函数类型：`(prev: T, next: T) => boolean`
 */
export type Equals<T> = (prev: T, next: T) => boolean;

/**
 * 响应式选项：用于创建响应式对象/数组
 */
export interface ReactiveOptions<T> {
  equals?: Equals<T>
  readonly?: boolean
  shallow?: boolean
}

/**
 * 信号句柄：包含
 * `{ get, peek, set, update, getPath, setPath, updatePath, peekPath, toJSON, valueOf, toString, value }` 方法/属性
 */
export interface SignalHandle<T> {
  /**
   * 读取当前值，并在有正在运行的副作用时将其订阅到该信号
   */
  get(): T

  /**
   * 查看当前值：不进行依赖收集（不订阅当前副作用）
   */
  peek(): T

  /**
   * 查看路径值：不进行依赖收集（不订阅当前副作用）
   *
   * 用法（JavaScript）：
   * ```js
   * const s = signal({ user: { name: 'A' }, items: ['x'] })
   * const n = s.peekPath('user.name')   // 'A'（不订阅）
   *
   * // 边界：
   * // - 空路径：返回根值（不订阅）
   * console.log(s.peekPath([]))     // { user: { name: 'A' }, items: ['x'] }
   * console.log(s.peekPath(''))     // { user: { name: 'A' }, items: ['x'] }
   * ```
   */
  peekPath(path: string | Array<string | number>): any

  /**
   * 设置新值，按等值比较决定是否通知订阅者
   */
  set(value: T): void

  /**
   * 根据回调对当前值进行计算并设置（相当于 set( updater(current) )）
   */
  update(updater: (current: T) => T): void

  /**
   * JSON 序列化：`JSON.stringify(signal)` 时返回内部值
   */
  toJSON(): T

  /**
   * 原始值表示：`signal.valueOf()` 返回内部值
   */
  valueOf(): T

  /**
   * 字符串表示：`String(signal)` 返回 JSON 字符串或占位文本
   */
  toString(): string

  /**
   * 只读/写属性：`signal.value` 直接读取内部值；写入等价于 `set`
   *
   * 用法（JavaScript）：
   * ```js
   * const s = signal(0)
   * console.log(s.value) // 0（不订阅）
   * s.value = 1          // 等价于 s.set(1)
   * ```
   */
  value: T

  /**
   * 根据路径读取当前对象/数组的子项值（依赖收集）
   *
   * 用法（JavaScript）：
   * ```js
   * const s = signal({ user: { profile: { name: 'A' } }, items: ['x'] })
   * const name1 = s.getPath(['user','profile','name']) // 'A'
   * const name2 = s.getPath('user.profile.name') // 'A'
   * // 在 watch 中使用路径读取会自动依赖收集
   * watchFn(() => s.getPath(['user','profile','name']), (n, o) => {  })
   * watchFn(() => s.getPath('user.profile.name'), (n, o) => {  })
   *
   * // 边界：
   * // - 空路径：返回根值并订阅
   * const root = s.getPath([]) // 订阅根
   * // - 数字字段解析：'items.0' 解析为 ['items', 0]
   * const first = s.getPath('items.0') // 'x'
   * ```
   */
  getPath(path: string | Array<string | number>): any

  /**
   * 根据路径设置对象/数组的子项值：不可变更新，生成新的根对象并触发订阅者
   *
   * 用法（JavaScript）：
   * ```js
   * const s = signal({ user: { profile: { name: 'A' }, age: 20 }, items: ['x'] })
   * // 设置嵌套对象字段（数组路径）
   * s.setPath(['user', 'profile', 'name'], 'B')
   * // 设置数组元素（数组路径）
   * s.setPath(['items', 0], 'y')
   * // 字符串路径（以 . 分隔，数字段转为数组索引）
   * s.setPath('user.profile.name', 'B')
   * s.setPath('items.0', 'y')
   * // 若根不是对象/数组，会以空对象作为根进行赋值
   * s.setPath(['foo', 'bar'], 1)
   * s.setPath('foo.bar', 1)
   *
   * // 边界：
   * // - 空路径：替换整个根值并触发订阅者
   * s.setPath([], { user: { profile: { name: 'C' } } })
   * s.setPath('', { user: { profile: { name: 'D' } } })
   * // - 缺失中间段：自动以空对象占位
   * s.setPath(['config','theme','color'], 'red') // 若 'config' 不存在，将创建为 {}
   * // - 数组越界写入：当目标段为现有数组时会扩展长度
   * s.setPath(['items', 2], 'z') // items: ['x', undefined, 'z']
   * // - 函数值不执行：作为普通值读写
   * const fn = () => 42
   * s.setPath('cb', fn)
   * console.log(typeof s.getPath('cb')) // 'function'
   * ```
   *
   * 参数：
   * - `path`: JS 数组或以 `.` 分隔的字符串（如 `['user','profile','name']`、`['items', 0]` 或 `'user.profile.name'`、`'items.0'`）
   * - `value`: 目标路径的新值
   * 行为与边界：
   * - 路径缺失会自动以空对象占位，数组越界写入会扩展长度
   * - 根为非对象/数组时以空对象为根进行赋值
   * - 函数值作为普通值读写，不会被执行
   */
  setPath(path: string | Array<string | number>, value: any): void

  /**
   * 根据路径函数式更新子项：`updater(currentAtPath) -> nextAtPath`
   *
   * 用法（JavaScript）：
   * ```js
   * const s = signal({ user: { age: 20 }, items: ['x'] })
   * s.updatePath(['user','age'], prev => prev + 1) // age: 21
   * s.updatePath(['user','name'], prev => (prev || '').toUpperCase())
   * // 使用字符串路径
   * s.updatePath('user.age', prev => prev + 1) // age: 21
   * s.updatePath('items.0', prev => (prev || '').toUpperCase())
   *
   * // 边界：
   * // - 空路径：以根值为输入进行整体更新
   * s.updatePath([], root => ({ ...root, flag: true }))
   * s.updatePath('', root => ({ ...root, mark: 1 }))
   * // - 缺失段：以空对象占位后再写入
   * s.updatePath(['config','theme'], prev => ({ ...(prev || {}), mode: 'dark' }))
   * ```
   */
  updatePath(
    path: string | Array<string | number>,
    updater: (currentAtPath: any) => any,
  ): void
}

/**
 * 创建信号：`createSignal(initialValue, { equals?: Equals<T> })`
 *
 * 参数：
 * - `initialValue`: 初始值
 * - `options.equals`: 自定义等值比较函数，默认使用 `===`
 *
 * 示例（JavaScript）：
 * ```javascript
 * const s = createSignal(0)
 * s.set(1) // 通知订阅者
 * s.set(1) // 不通知订阅者（因为 === 相等）
 *
 * const s2 = createSignal({ a: 0 }, { equals: (prev, next) => JSON.stringify(prev) === JSON.stringify(next) })
 * s2.set({ a: 0 }) // 通知订阅者
 * s2.set({ a: 0 }) // 不通知订阅者（因为 JSON.stringify 相等）
 * ```
 */
export function createSignal<T = any>(
  initial: T,
  options?: { equals?: Equals<T> },
): SignalHandle<T>;

/**
 * 创建引用信号：`createRef(initialValue)`
 *
 * 参数：
 * - `initialValue`: 初始值
 *
 * 示例（JavaScript）：
 * ```javascript
 * const ref = createRef(0)
 * ref.set(1) // 通知订阅者
 * ref.set(1) // 不通知订阅者（因为 === 相等）
 *
  * // 属性与调试方法
  * console.log(ref.value)           // 0（不订阅）
  * ref.value = 2                    // 等价于 ref.set(2)
  * console.log(String(ref))         // 调用 toString()
  * console.log(ref.valueOf())       // 调用 valueOf()
  * console.log(JSON.stringify(ref)) // 调用 toJSON()
 * ```
 */
export function createRef<T = any>(initial: T): SignalHandle<T>;

/**
 * 创建 Reactive：返回一个对象/数组的响应式代理（深/浅、只读可选）
 *
 * 用法（JavaScript / TypeScript）：
 * ```ts
 * // 基础对象：读取与写入都响应式
 * const state = createReactive({ user: { name: 'A' }, items: ['x'] })
 * console.log(state.user.name)     // 'A'
 * state.user.name = 'B'            // 写入嵌套字段，触发订阅者
 * state.items.push('y')            // 数组写入也可触发（通过路径写入实现不可变更新）
 *
 * // 在 Vapor JSX 中使用（自动 DOM 更新）
 * // <span>{state.user.name}</span>
 * // <input value={state.user.name} onInput={e => state.user.name = e.target.value} />
 *
 * // 只读代理：禁止写入
 * const ro = createReactive({ a: 1 }, { readonly: true })
 * // ro.a = 2 // 将被忽略或导致失败（只读）
 *
 * // 浅代理：仅对顶层对象进行代理，子对象不递归代理
 * const sh = createReactive({ nested: { a: 1 } }, { shallow: true })
 * // sh.nested 仍为普通对象（非代理）
 *
 * // 原始类型：普通值会自动包裹为 { value } 并返回其代理
 * const num = createReactive(0)
 * console.log(num.value)       // 0
 * num.value = 1               // 写入 value 字段触发订阅者
 * const str = createReactive('A')
 * str.value = 'B'             // 原始类型统一通过 value 字段读写
 *
 * // 自定义等值比较：用于控制触发频率
 * const eq = (prev: any, next: any) => _.isEqual(prev, next)
 * const obj = createReactive({ a: 1 }, { equals: eq })
 * obj.a = 1 // 不触发（相等）
 * ```
 */
export function createReactive<T = any>(
  initial: T,
  options?: ReactiveOptions<T>,
): never;
export function createReactive<T extends Primitive>(
  initial: T,
  options?: ReactiveOptions<T>,
): { value: Widen<T> };
export function createReactive<T extends object | Function>(
  initial: T,
  options?: ReactiveOptions<T>,
): T;
"#;
