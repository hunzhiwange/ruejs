/*
侦听模块：监听函数或信号的值变化并触发处理器

设计说明：
- 侦听的本质仍是“副作用”，区别在于我们为副作用体包裹了一个通用执行器：先拿到新值，比较后再调用处理器。
- `watch_fn`：最通用的形式，传入 `getter` 获取值；适合多源组合与复杂计算。
- `watch_effect`：直接把副作用体当作侦听对象，让其内部自行读取信号；依赖会自动收集，形式最自由。
- `watch_signal`：专注侦听单一信号的变化，语义明确。

Rust 结构选择与跨语言协作：
- 由于值与处理器都来自 JS，我们统一使用 `js_sys::Function` 与 `JsValue`，通过 `wasm_bindgen` 与 JS 交互。
- 变化判断支持自定义 `equals(prev, next)`，提升可控性（避免频繁触发或处理不可比对的复杂对象）。
- 调度方面复用 `effect` 的选项（如自定义 scheduler、是否懒执行），以保持整个响应式层的一致性。

Quick Start（JS）
```js
const s = createSignal({ user: { name: 'A' }, items: ['x'] })
const stop = watchDeepSignal(s, (n, o) => console.log('deep', o, '->', n), { immediate: true })
s.setPath(['user','name'], 'B')
watchPath(s, ['user','name'], (n, o) => console.log('name changed', o, '->', n))
// 自定义等值比较（如 lodash）
watchDeepSignal(s, (n, o) => { }, { equals: _.isEqual })
```
*/

// 提供 watch_fn、watch_effect、watch_signal 三种入口以适配不同使用场景。
use js_sys::Array;
use js_sys::{Function, Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

#[cfg(feature = "dev")]
use crate::log::{log, want_log};
use crate::reactive::effect::{EffectHandle, create_effect};
use crate::reactive::signal::SignalHandle;

struct ParsedOptions {
    immediate: bool,
    scheduler: Option<Function>,
    equals: Option<Function>,
    debounce: Option<f64>,
}

/// 创建防抖调度器
fn create_debounce_scheduler(delay: f64) -> Function {
    Function::new_with_args("delay", r#"
        let timer = null;
        return function(run) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(function() {
                timer = null;
                run();
            }, delay);
        }
    "#).call1(&JsValue::NULL, &JsValue::from_f64(delay)).unwrap().unchecked_into()
}

fn parse_options(options: Option<JsValue>) -> ParsedOptions {
    let mut immediate = false;
    let mut scheduler: Option<Function> = None;
    let mut equals: Option<Function> = None;
    let mut debounce: Option<f64> = None;
    if let Some(opts) = options {
        if opts.is_object() {
            let imm =
                Reflect::get(&opts, &JsValue::from_str("immediate")).unwrap_or(JsValue::UNDEFINED);
            immediate = imm.as_bool().unwrap_or(false);
            let sch =
                Reflect::get(&opts, &JsValue::from_str("scheduler")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = sch.dyn_ref::<Function>() {
                scheduler = Some(f.clone());
            }
            let eq =
                Reflect::get(&opts, &JsValue::from_str("equals")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = eq.dyn_ref::<Function>() {
                equals = Some(f.clone());
            }
            let db =
                Reflect::get(&opts, &JsValue::from_str("debounce")).unwrap_or(JsValue::UNDEFINED);
            if let Some(d) = db.as_f64() {
                debounce = Some(d);
            }
        }
    }
    ParsedOptions { immediate, scheduler, equals, debounce }
}

/// 构造副作用执行器：在副作用运行时调用 getter 获取新值，判断是否变化，
/// 再调用 handler(new, old)。支持首次立即触发与自定义等值比较。
fn make_effect_runner(
    getter: Function,
    handler: Function,
    immediate: bool,
    equals: Option<Function>,
) -> Function {
    let prev = std::rc::Rc::new(std::cell::RefCell::new(JsValue::UNDEFINED));
    let first = std::rc::Rc::new(std::cell::RefCell::new(true));
    let equals_fn = equals.clone();
    let run = Closure::wrap(Box::new(move || {
        // 计算当前值并与前值比较
        let newv = match getter.call0(&JsValue::NULL) {
            Ok(v) => v,
            Err(e) => {
                #[cfg(feature = "dev")]
                {
                    if want_log("error", "reactive:watch getter threw") {
                        log("error", "reactive:watch getter threw");
                    }
                }
                wasm_bindgen::throw_val(e.clone());
            }
        };
        let is_first = *first.borrow();
        let prevv = prev.borrow().clone();
        let changed = if is_first {
            true
        } else if let Some(eq) = &equals_fn {
            let res = match eq.call2(&JsValue::NULL, &prevv, &newv) {
                Ok(v) => v,
                Err(e) => {
                    #[cfg(feature = "dev")]
                    {
                        if want_log("error", "reactive:watch equals threw") {
                            log("error", "reactive:watch equals threw");
                        }
                    }
                    wasm_bindgen::throw_val(e.clone());
                }
            };
            !res.as_bool().unwrap_or(false)
        } else {
            // 默认逐项浅比较：Object.is(prev, next)
            !js_sys::Object::is(&prevv, &newv)
        };
        if is_first {
            if immediate {
                #[cfg(feature = "dev")]
                {
                    if want_log("debug", "reactive:watch invoke immediate") {
                        log("debug", "reactive:watch invoke immediate");
                    }
                }
                // 首次立即触发：old 为 undefined
                match handler.call2(&JsValue::NULL, &newv, &JsValue::UNDEFINED) {
                    Ok(_) => {}
                    Err(e) => {
                        #[cfg(feature = "dev")]
                        {
                            if want_log("error", "reactive:watch handler threw (immediate)") {
                                log("error", "reactive:watch handler threw (immediate)");
                            }
                        }
                        wasm_bindgen::throw_val(e.clone());
                    }
                }
            }
            *first.borrow_mut() = false;
        } else if changed {
            #[cfg(feature = "dev")]
            {
                if want_log("debug", "reactive:watch invoke changed") {
                    log("debug", "reactive:watch invoke changed");
                }
            }
            // 值变化：以 (new, old) 调用处理器
            match handler.call2(&JsValue::NULL, &newv, &prevv) {
                Ok(_) => {}
                Err(e) => {
                    #[cfg(feature = "dev")]
                    {
                        if want_log("error", "reactive:watch handler threw (changed)") {
                            log("error", "reactive:watch handler threw (changed)");
                        }
                    }
                    wasm_bindgen::throw_val(e.clone());
                }
            }
        }
        *prev.borrow_mut() = newv;
    }) as Box<dyn FnMut()>);
    let f_js: JsValue = run.as_ref().clone();
    let func: Function = f_js.unchecked_into();
    run.forget();
    func
}

/// 侦听任意 getter 函数的结果变化
/// options: { immediate?: bool, scheduler?: Function, equals?: Function }
/// 示例（JavaScript）：
/// ```javascript
/// const { watchFn } = wasmModule;
/// const obj = { value: 0 };
/// const stop = watchFn(
///   () => obj.value,
///   (newv, oldv) => console.log('changed:', oldv, '->', newv),
///   { immediate: true }
/// );
/// obj.value = 1; // 当 getter 读取到新值时触发 handler
/// ```
#[wasm_bindgen(js_name = watchFn)]
pub fn watch_fn(getter: Function, handler: Function, options: Option<JsValue>) -> EffectHandle {
    let ParsedOptions { immediate, scheduler, equals, debounce } = parse_options(options);
    let mut final_scheduler = scheduler;
    if final_scheduler.is_none() {
        if let Some(delay) = debounce {
            final_scheduler = Some(create_debounce_scheduler(delay));
        }
    }
    let func = make_effect_runner(getter, handler, immediate, equals);
    let opts = Object::new();
    if let Some(s) = &final_scheduler {
        let _ = Reflect::set(&opts, &JsValue::from_str("scheduler"), s);
    }
    let _ = Reflect::set(&opts, &JsValue::from_str("lazy"), &JsValue::from_bool(true));
    let eh = create_effect(func, Some(opts.into()));
    crate::reactive::core::run_effect(eh.id);
    eh
}

/// 侦听副作用：在副作用体内自行读取信号，依赖会自动收集
/// 类似 Vue 的 `watchEffect`
/// 示例（JavaScript）：
/// ```javascript
/// const { createSignal, watchEffect } = wasmModule;
/// const s = createSignal(0);
/// watchEffect(() => {
///   console.log('value:', s.get());
/// }, {
///     //可选 scheduler
/// });
/// s.set(1);
/// ```
#[wasm_bindgen(js_name = watchEffect)]
pub fn watch_effect(cb: Function, options: Option<JsValue>) -> EffectHandle {
    let mut scheduler: Option<Function> = None;
    let mut debounce: Option<f64> = None;
    if let Some(opts) = options {
        if opts.is_object() {
            let sch =
                Reflect::get(&opts, &JsValue::from_str("scheduler")).unwrap_or(JsValue::UNDEFINED);
            if let Some(f) = sch.dyn_ref::<Function>() {
                scheduler = Some(f.clone());
            }
            let db =
                Reflect::get(&opts, &JsValue::from_str("debounce")).unwrap_or(JsValue::UNDEFINED);
            if let Some(d) = db.as_f64() {
                debounce = Some(d);
            }
        }
    }
    if scheduler.is_none() {
        if let Some(delay) = debounce {
            scheduler = Some(create_debounce_scheduler(delay));
        }
    }
    let opts = Object::new();
    if let Some(s) = &scheduler {
        let _ = Reflect::set(&opts, &JsValue::from_str("scheduler"), s);
    }
    let _ = Reflect::set(&opts, &JsValue::from_str("lazy"), &JsValue::from_bool(true));
    let eh = create_effect(cb, Some(opts.into()));
    crate::reactive::core::run_effect(eh.id);
    eh
}

/// 侦听单个信号的变化并在变化时触发处理器
/// options: { immediate?: bool, scheduler?: Function, equals?: Function }
/// 示例（JavaScript）：
/// ```javascript
/// const { createSignal, watchSignal } = wasmModule;
/// const s = createSignal(0);
/// watchSignal(s, (newv, oldv) => {
///   console.log('signal changed:', oldv, '->', newv);
/// }, { immediate: true });
/// s.set(1);
/// ```
#[wasm_bindgen(js_name = watchSignal)]
pub fn watch_signal(
    src: &SignalHandle,
    handler: Function,
    options: Option<JsValue>,
) -> EffectHandle {
    let ParsedOptions { immediate, scheduler, equals, debounce } = parse_options(options);
    let mut final_scheduler = scheduler;
    if final_scheduler.is_none() {
        if let Some(delay) = debounce {
            final_scheduler = Some(create_debounce_scheduler(delay));
        }
    }
    // 将信号读取包装为 getter，以复用通用执行器逻辑
    let s1 = src.clone();
    let getter = Closure::wrap(Box::new(move || s1.get_js()) as Box<dyn FnMut() -> JsValue>);
    let getter_fn: Function = getter.as_ref().clone().unchecked_into();
    let func = make_effect_runner(getter_fn, handler, immediate, equals);
    getter.forget();
    let opts = Object::new();
    if let Some(s) = &final_scheduler {
        let _ = Reflect::set(&opts, &JsValue::from_str("scheduler"), s);
    }
    let _ = Reflect::set(&opts, &JsValue::from_str("lazy"), &JsValue::from_bool(true));
    let eh = create_effect(func, Some(opts.into()));
    crate::reactive::core::run_effect(eh.id);
    eh
}

/// 深度侦听：当对象/数组任意子项变化时触发
///
/// 用法（JavaScript）：
/// ```js
/// const s = createSignal({ user: { name: 'A' }, items: ['x'] })
/// const stop = watchDeepSignal(s, (newv, oldv) => {
///   console.log('deep changed', oldv, '->', newv)
/// }, { immediate: true })
/// s.setPath(['user','name'], 'B')
/// s.setPath(['items', 0], 'y')
/// stop.dispose() // 取消侦听
/// ```
#[wasm_bindgen(js_name = watchDeepSignal)]
pub fn watch_deep_signal(
    src: &SignalHandle,
    handler: Function,
    options: Option<JsValue>,
) -> EffectHandle {
    let ParsedOptions { immediate, scheduler, equals, debounce } = parse_options(options);
    let mut final_scheduler = scheduler;
    if final_scheduler.is_none() {
        if let Some(delay) = debounce {
            final_scheduler = Some(create_debounce_scheduler(delay));
        }
    }
    let s1 = src.clone();
    let getter = Closure::wrap(Box::new(move || s1.get_js()) as Box<dyn FnMut() -> JsValue>);
    let getter_fn: Function = getter.as_ref().clone().unchecked_into();
    // 默认深比较：对象与数组递归比较，原始值用 Object.is。
    // 当 options.equals 提供时，覆盖默认递归比较（例如 Lodash _.isEqual）。
    let default_eq = Function::new_with_args(
        "prev, next",
        r#"
        function isDeepEqual(a, b, seen) {
          if (Object.is(a, b)) return true;
          const ta = typeof a, tb = typeof b;
          if (ta !== tb) return false;
          if (a == null || b == null) return false;
          if (ta !== 'object') return false;
          if (!seen) seen = new WeakMap();
          const cached = seen.get(a);
          if (cached && cached === b) return true;
          seen.set(a, b);
          const aa = Array.isArray(a), ab = Array.isArray(b);
          if (aa !== ab) return false;
          if (aa) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
              if (!isDeepEqual(a[i], b[i], seen)) return false;
            }
            return true;
          }
          const ak = Object.keys(a), bk = Object.keys(b);
          if (ak.length !== bk.length) return false;
          for (let i = 0; i < ak.length; i++) {
            const k = ak[i];
            if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
            if (!isDeepEqual(a[k], b[k], seen)) return false;
          }
          return true;
        }
        return isDeepEqual(prev, next);
        "#,
    );
    let func = make_effect_runner(
        getter_fn,
        handler,
        immediate,
        if let Some(eq) = equals { Some(eq) } else { Some(default_eq) },
    );
    getter.forget();
    let opts = Object::new();
    if let Some(s) = &final_scheduler {
        let _ = Reflect::set(&opts, &JsValue::from_str("scheduler"), s);
    }
    let _ = Reflect::set(&opts, &JsValue::from_str("lazy"), &JsValue::from_bool(true));
    let eh = create_effect(func, Some(opts.into()));
    crate::reactive::core::run_effect(eh.id);
    eh
}

/// 侦听指定路径的值变化：`path` 支持 JS 数组或以 `.` 分隔的字符串
///
/// 用法（JavaScript）：
/// ```js
/// const s = createSignal({ user: { profile: { name: 'A' } } })
/// // 数组路径
/// watchPath(s, ['user','profile','name'], (n, o) => {
///   console.log('name changed:', o, '->', n)
/// }, { immediate: true })
/// // 字符串路径（数字段会自动转为数组索引）
/// watchPath(s, 'user.profile.name', (n, o) => {
///   console.log('name changed:', o, '->', n)
/// }, { immediate: true })
/// s.setPath(['user','profile','name'], 'B')
/// s.setPath('user.profile.name', 'B')
/// ```
#[wasm_bindgen(js_name = watchPath)]
pub fn watch_path(
    src: &SignalHandle,
    path: JsValue,
    handler: Function,
    options: Option<JsValue>,
) -> EffectHandle {
    let ParsedOptions { immediate, scheduler, equals, debounce } = parse_options(options);
    let mut final_scheduler = scheduler;
    if final_scheduler.is_none() {
        if let Some(delay) = debounce {
            final_scheduler = Some(create_debounce_scheduler(delay));
        }
    }

    // 仅侦听路径的值：配合不可变路径更新，old/new 为快照，适合局部联动
    let s1 = src.clone();
    let getter = Closure::wrap(Box::new(move || {
        let root = s1.get_js();
        let arr = normalize_path_to_array(&path);
        get_at_path(&root, &arr)
    }) as Box<dyn FnMut() -> JsValue>);
    let getter_fn: Function = getter.as_ref().clone().unchecked_into();
    let func = make_effect_runner(getter_fn, handler, immediate, equals);
    getter.forget();
    let opts = Object::new();
    if let Some(s) = &final_scheduler {
        let _ = Reflect::set(&opts, &JsValue::from_str("scheduler"), s);
    }
    let _ = Reflect::set(&opts, &JsValue::from_str("lazy"), &JsValue::from_bool(true));
    let eh = create_effect(func, Some(opts.into()));
    crate::reactive::core::run_effect(eh.id);
    eh
}

/// 统一侦听入口：接受函数、信号句柄对象（含 `get` 方法）或来源数组
///
/// 用法（JavaScript）：
/// ```js
/// // 1) 侦听函数源（等价 watchFn）
/// const stop1 = watch(() => state.count, (n, o) => { console.log(n, o) }, { immediate: true })
///
/// // 2) 侦听信号句柄对象（含 get 方法）
/// const s = createSignal(0)
/// const stop2 = watch(s, (n, o) => { console.log(n, o) })
/// s.set(1)
///
/// // 3) 侦听来源数组：函数 / 信号句柄 / 常量混合
/// const s1 = createSignal(0)
/// const s2 = createSignal(10)
/// const stop3 = watch([() => s1.get(), s2, 'x'], ([n1, n2, c], [o1, o2, oc]) => { console.log(n1, n2, c, o1, o2, oc) })
/// s1.set(1); s2.set(11)
///
/// // 自定义比较：覆盖默认逐项浅比较
/// watch([s1, s2], (n, o) => {}, { equals: (prev, next) => _.isEqual(prev, next) })
/// ```
#[wasm_bindgen(js_name = watch)]
pub fn watch(source: JsValue, handler: Function, options_raw: Option<JsValue>) -> EffectHandle {
    // 统一入口：根据 `source` 的形态分发
    // - 函数：视为 getter，交给 `watch_fn`
    // - 含 `get` 的对象（信号句柄/只读信号等）：以该对象为 this 调用其 `get`
    // - 数组：逐项计算出当前值数组，并进行逐项浅比较
    // - 其它常量：把常量封装为 getter，按等值策略比较
    // 说明（设计取舍）：
    // - 不进行 `SignalHandle` 的显式类型检测：`SignalHandle` 并非可直接 `JsCast` 的类型，无法通过 `dyn_ref::<SignalHandle>()` 检测。
    //   为保证通用性与兼容性，这里采用“对象含 `get` 方法”的策略统一处理信号句柄与只读信号代理。
    if let Some(f) = source.dyn_ref::<Function>() {
        return watch_fn(f.clone(), handler, options_raw);
    }
    if source.is_object() {
        // 对象形态：尝试读取其 `get` 方法（信号句柄或计算属性）
        let getter_v =
            Reflect::get(&source, &JsValue::from_str("get")).unwrap_or(JsValue::UNDEFINED);
        if let Some(_gf) = getter_v.dyn_ref::<Function>() {
            // 构造 getter（重要逻辑）：
            // - 每次运行时动态读取 `source.get` 并以 `source` 为接收者调用，避免在闭包创建时捕获的方法引用在后续运行中失效或丢失 `this` 绑定。
            // - 这样可保证 `watch(s1, { immediate: false })` 的首次不触发、后续 `set()` 时稳定触发回调，
            //   同时兼容由 `createReactive` 生成的代理对象（其 `get` 可能是动态封装）。
            let src_for = source.clone();
            let getter = Closure::wrap(Box::new(move || {
                let gv =
                    Reflect::get(&src_for, &JsValue::from_str("get")).unwrap_or(JsValue::UNDEFINED);
                if let Some(fcur) = gv.dyn_ref::<Function>() {
                    fcur.call0(&src_for).unwrap_or(JsValue::UNDEFINED)
                } else {
                    JsValue::UNDEFINED
                }
            }) as Box<dyn FnMut() -> JsValue>);
            let getter_fn: Function = getter.as_ref().clone().unchecked_into();
            // 解析选项：首次触发、调度器、自定义等值比较
            let ParsedOptions { immediate, scheduler, equals, debounce } = parse_options(options_raw.clone());
            let mut final_scheduler = scheduler;
            if final_scheduler.is_none() {
                if let Some(delay) = debounce {
                    final_scheduler = Some(create_debounce_scheduler(delay));
                }
            }
            // 构造副作用执行器：在每次副作用运行时计算新值并比较
            let func = make_effect_runner(getter_fn, handler, immediate, equals);
            // 释放 Rust 侧闭包所有权（交由 JS 长期持有）
            getter.forget();
            let opts = Object::new();
            if let Some(s) = &final_scheduler {
                let _ = Reflect::set(&opts, &JsValue::from_str("scheduler"), s);
            }
            let _ = Reflect::set(&opts, &JsValue::from_str("lazy"), &JsValue::from_bool(true));
            let eh = create_effect(func, Some(opts.into()));
            crate::reactive::core::run_effect(eh.id);
            return eh;
        }
    }
    if js_sys::Array::is_array(&source) {
        // 数组形态：支持混合来源（函数 / 含 get 的对象 / 常量）
        let ParsedOptions { immediate, scheduler, equals, debounce } = parse_options(options_raw.clone());
        let mut final_scheduler = scheduler;
        if final_scheduler.is_none() {
            if let Some(delay) = debounce {
                final_scheduler = Some(create_debounce_scheduler(delay));
            }
        }
        let arr = js_sys::Array::from(&source);
        let mut parts: Vec<JsValue> = Vec::new();
        for i in 0..arr.length() {
            parts.push(arr.get(i));
        }
        // getter：逐项计算出当前值数组
        let getter = Closure::wrap(Box::new(move || {
            let out = js_sys::Array::new();
            for p in &parts {
                if let Some(f) = p.dyn_ref::<Function>() {
                    // 函数项：直接调用得到值
                    let v = f.call0(&JsValue::NULL).unwrap_or(JsValue::UNDEFINED);
                    out.push(&v);
                } else if p.is_object() {
                    // 对象项：若存在 `get` 则调用，以该对象为接收者（保持 this）
                    let gv =
                        Reflect::get(p, &JsValue::from_str("get")).unwrap_or(JsValue::UNDEFINED);
                    if let Some(gf) = gv.dyn_ref::<Function>() {
                        let v = gf.call0(p).unwrap_or(JsValue::UNDEFINED);
                        out.push(&v);
                    } else {
                        // 普通对象：作为常量直接放入（不递归求值）
                        out.push(p);
                    }
                } else {
                    // 非对象常量：直接放入
                    out.push(p);
                }
            }
            out.into()
        }) as Box<dyn FnMut() -> JsValue>);
        let getter_fn: Function = getter.as_ref().clone().unchecked_into();
        // 默认数组等值比较：长度相同且逐项 `Object.is` 相等
        // 若用户提供了 `equals`，则优先使用自定义
        let array_eq = Function::new_with_args(
            "prev,next",
            r#"
            if (!Array.isArray(prev) || !Array.isArray(next)) return Object.is(prev, next);
            if (prev.length !== next.length) return false;
            for (let i = 0; i < prev.length; i++) {
              if (!Object.is(prev[i], next[i])) return false;
            }
            return true;
            "#,
        );
        let func = make_effect_runner(
            getter_fn,
            handler,
            immediate,
            if let Some(eq) = equals { Some(eq) } else { Some(array_eq) },
        );
        // 交给 JS 持有闭包，避免被 Rust 销毁
        getter.forget();
        let opts = Object::new();
        if let Some(s) = final_scheduler {
            let _ = Reflect::set(&opts, &JsValue::from_str("scheduler"), &s);
        }
        // 数组 watch 同样选择非惰性，立即完成首轮求值
        let _ = Reflect::set(&opts, &JsValue::from_str("lazy"), &JsValue::from_bool(false));
        return create_effect(func, Some(opts.into()));
    }
    // 其余情况：视为“常量来源”，以闭包返回固定值进行比较
    let ParsedOptions { immediate, scheduler, equals, debounce } = parse_options(options_raw.clone());
    let mut final_scheduler = scheduler;
    if final_scheduler.is_none() {
        if let Some(delay) = debounce {
            final_scheduler = Some(create_debounce_scheduler(delay));
        }
    }
    let getter = Closure::wrap(Box::new(move || source.clone()) as Box<dyn FnMut() -> JsValue>);
    let getter_fn: Function = getter.as_ref().clone().unchecked_into();
    let func = make_effect_runner(getter_fn, handler, immediate, equals);
    // 移交闭包所有权给 JS
    getter.forget();
    let opts = Object::new();
    if let Some(s) = final_scheduler {
        let _ = Reflect::set(&opts, &JsValue::from_str("scheduler"), &s);
    }
    // 非惰性：进行首轮求值（仅当 immediate 时会触发 handler）
    let _ = Reflect::set(&opts, &JsValue::from_str("lazy"), &JsValue::from_bool(false));
    create_effect(func, Some(opts.into()))
}

#[wasm_bindgen(typescript_custom_section)]
const TS_WATCH_DECL: &'static str = r#"
/**
 * 侦听选项：{ immediate?: bool, scheduler?: Function, equals?: Function, debounce?: number }
 */
export interface WatchOptions<T = any> {
  immediate?: boolean;
  scheduler?: (run: () => void) => void;
  equals?: (prev: T, next: T) => boolean;
  debounce?: number;
}

/**
 * 侦听副作用：在副作用体内自行读取信号，依赖会自动收集
 * 类似 Vue 的 `watchEffect`
 * 示例（JavaScript）：
 * ```javascript
 * const { createSignal, watchEffect } = wasmModule;
 * const s = createSignal(0);
 * watchEffect(() => {
 *   console.log('value:', s.get());
 * }, {
 *     //可选 scheduler
 * });
 * s.set(1);
 * ```
 */
export function watchEffect(
  cb: () => void,
  options?: { scheduler?: (run: () => void) => void } | null,
): EffectHandle;

/** 
 * 侦听任意 getter 函数的结果变化
 * options: { immediate?: bool, scheduler?: Function, equals?: Function }
 * 示例（JavaScript）：
 * ```javascript
 * const { watchFn } = wasmModule;
 * const obj = { value: 0 };
 * const stop = watchFn(
 *   () => obj.value,
 *   (newv, oldv) => console.log('changed:', oldv, '->', newv),
 *   { immediate: true }
 * );
 * obj.value = 1; // 当 getter 读取到新值时触发 handler
 * ```
 */
export function watchFn<T>(
  getter: () => T,
  handler: (newv: T, oldv: T) => void,
  options?: WatchOptions<T> | null,
): EffectHandle;

/** 
 * 侦听信号值变化：`src` 为信号句柄，`handler` 为值变化时的回调函数
 * options: { immediate?: bool, scheduler?: Function, equals?: Function }
 * 示例（JavaScript）：
 * ```javascript
 * const { createSignal, watchSignal } = wasmModule;
 * const s = createSignal(0);
 * watchSignal(s, (newv, oldv) => {
 *   console.log('value:', oldv, '->', newv);
 * }, { immediate: true });
 * s.set(1); // 当信号值变化时触发 handler
 * ```
 */
export function watchSignal(
  src: SignalHandle,
  handler: (newv: any, oldv: any) => void,
  options?: WatchOptions<any> | null,
): EffectHandle;

/** 
 * 侦听信号值变化（深度）：`src` 为信号句柄，`handler` 为值变化时的回调函数
 * options: { immediate?: bool, scheduler?: Function, equals?: Function }
 * 示例（JavaScript）：
 * ```javascript
 * const { createSignal, watchDeepSignal } = wasmModule;
 * const s = createSignal({ a: 0 });
 * watchDeepSignal(s, (newv, oldv) => {
 *   console.log('value:', oldv, '->', newv);
 * }, { immediate: true });
 * s.set({ a: 1 }); // 当信号值变化时触发 handler
 * ```
 */
export function watchDeepSignal(
  src: SignalHandle,
  handler: (newv: any, oldv: any) => void,
  options?: WatchOptions<any> | null,
): EffectHandle;

/** 
 * 侦听信号路径值变化：`src` 为信号句柄，`path` 为路径（数组或点分字符串），`handler` 为值变化时的回调函数
 * options: { immediate?: bool, scheduler?: Function, equals?: Function }
 * 示例（JavaScript）：
 * ```javascript
 * const { createSignal, watchPath } = wasmModule;
 * const s = createSignal({ a: { b: 0 } });
 * watchPath(s, ['a','b'], (n, o) => {
 *   console.log('b changed:', o, '->', n)
 * }, { immediate: true })
 * s.setPath(['a','b'], 1) // 当路径值变化时触发 handler
 * ```
 */
export function watchPath(
  src: SignalHandle,
  path: string | Array<string | number>,
  handler: (newv: any, oldv: any) => void,
  options?: WatchOptions<any> | null,
): EffectHandle;

/**
 * 侦听来源：信号句柄、getter 函数或来源数组（信号句柄 / getter 函数）
 */
export type WatchSource<T = any> = SignalHandle | (() => T) | Array<SignalHandle | (() => any)>;

/**
 * 侦听任意来源变化：`source` 为信号句柄、getter 函数或来源数组（信号句柄 / getter 函数 / 常量），`handler` 为变化时的回调函数
 * options: { immediate?: bool, scheduler?: Function, equals?: Function }
 * 示例（JavaScript）：
 * ```javascript
 * const { createSignal, watch } = wasmModule;
 * const s1 = createSignal(0);
 * const s2 = createSignal(10);
 * watch([s1, s2, 'x'], (n, o) => {
 *   console.log('values:', o, '->', n);
 * }, { immediate: true });
 * s1.set(1); s2.set(11); // 当来源数组中任意值变化时触发 handler
 * ```
 */
export function watch<T>(
  source: WatchSource<T>,
  handler: (newv: T | any[], oldv: T | any[]) => void,
  options?: WatchOptions<T | any[]> | null,
): EffectHandle;
"#;

fn get_at_path(root: &JsValue, path: &Array) -> JsValue {
    let mut cur = root.clone();
    let plen = path.length();
    for i in 0..plen {
        let seg = path.get(i);
        cur = Reflect::get(&cur, &seg).unwrap_or(JsValue::UNDEFINED);
        if cur.is_undefined() || cur.is_null() {
            break;
        }
    }
    cur
}

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
                out.push(&JsValue::from_f64(n as f64));
            } else {
                out.push(&JsValue::from_str(seg));
            }
        }
        return out;
    }
    js_sys::Array::new()
}
