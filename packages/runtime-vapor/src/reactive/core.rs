/*
核心模块：响应式运行时的调度与状态

整体设计：
- 我们需要一个“全局运行时”记录所有副作用与信号的关系，并提供调度功能。WebAssembly 单线程场景下，
  使用 `thread_local!` 可以安全地维护这些状态，而不会牵涉跨线程同步的复杂性。
- `EFFECTS` 使用 `HashMap<usize, Effect>` 存储副作用对象，id 从 1 自增，便于绑定到 JS 侧的句柄。
- `CURRENT_EFFECT` 记录当前正在执行的副作用 id；当信号被 `get()` 读取时，就能把这个 id 加入订阅集合，完成依赖收集。
- `BATCH_DEPTH` 提供批量更新的计数（可递归/嵌套）。在批量范围内的变更会先进入 `PENDING_EFFECTS`，
  待批量结束后统一调度。这样可以降低无谓的重复执行、避免中间状态闪烁。
- `MICROTASK_SCHEDULED` 确保同一轮事件循环只安排一次微任务 drain，避免无穷追加。
- `SCHEDULING_MODE` 决定默认策略：1 表示尽量同步（但避免自身重入），0 表示统一走微任务。

为什么用这些 Rust 容器与类型？
- `HashMap`/`HashSet`：副作用与订阅者集合均需要快速插入/查找；集合去重与遍历也高效。
- `JsValue` 与 `js_sys::Function`：副作用体与信号值通常来源于 JS，需要跨 FFI 边界传递与调用；
  使用 `wasm_bindgen` 的 JS 类型是最直接且兼容的方式。
- `Closure`：将 Rust 闭包包装为 JS 可调用函数，用于自定义调度器和微任务 drain。
- 选择微任务（Promise.then）而非宏任务：微任务在当前事件循环末尾执行，适合批处理与 UI 更新。

运行保证与边界：
- 避免重入：当一个副作用内部导致自身再次调度，我们切换到默认微任务避免立即重入（`is_self` 检测）。
- 清理函数：每次运行副作用前先执行上次的清理，确保订阅与资源处于一致状态。
- 失败容忍：我们使用 `unwrap_or` 防御 JS 调用失败导致的异常传播；真实产品可进一步增强错误报告。
*/

// 提供 Effect/Signal 的注册、运行、调度以及批量更新机制。
// 该模块以线程局部存储维护运行时全局状态，确保在 WebAssembly 场景下安全共享。
use js_sys::{Function, JSON, Promise, Reflect};
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;
use wasm_bindgen::throw_val;

thread_local! {
    // 所有已注册的副作用，以自增 id 作为键
    pub(crate) static EFFECTS: RefCell<HashMap<usize, Effect>> = RefCell::new(HashMap::new());
    // 下一次分配的副作用 id（从 1 开始）
    pub(crate) static NEXT_EFFECT_ID: RefCell<usize> = RefCell::new(1);
    // 当前正在执行的副作用 id，用于依赖收集（Signal 读取时订阅到该 id）
    pub(crate) static CURRENT_EFFECT: RefCell<Option<usize>> = RefCell::new(None);
    // 批量更新深度计数；>0 时 Signal 改变不会立即运行副作用，而是入队
    pub(crate) static BATCH_DEPTH: RefCell<usize> = RefCell::new(0);
    // 等待在微任务中统一刷新执行的副作用 id 集合
    pub(crate) static PENDING_EFFECTS: RefCell<HashSet<usize>> = RefCell::new(HashSet::new());
    // 是否已安排一次微任务用于 drain 队列，避免重复安排
    pub(crate) static MICROTASK_SCHEDULED: RefCell<bool> = RefCell::new(false);
    // 调度模式：1=同步立即运行，0=统一走默认微任务
    pub(crate) static SCHEDULING_MODE: RefCell<u8> = RefCell::new(0);

    /*
    Effect Scope（副作用作用域）

    背景问题：
    - Vapor 编译产物（watchEffect/computed/watch 等）会在“创建节点”时注册副作用。
    - 在路由切换 / 片段替换等场景下，旧 Vapor 子树的 DOM 被移除，但如果副作用不被销毁，就会一直留在
      EFFECTS 与各 Signal 的订阅列表里，导致每次触发都越来越多，系统逐渐变卡。

    设计目标：
    - 让“某段 UI 子树”拥有一个可整体销毁的作用域（scope）。
    - 在该子树创建期间注册的 effect 全部归属于这个 scope；当子树卸载时 dispose 掉 scope，统一清理
      其中的 effect（包括嵌套子 scope），从而避免泄漏与重复触发。

    数据结构：
    - NEXT_EFFECT_SCOPE_ID：scope id 自增分配器
    - EFFECT_SCOPE_STACK：当前执行上下文的 scope 栈（push/pop 用于“绑定当前 scope”）
    - EFFECT_SCOPES_EFFECTS：scope_id -> [effect_id]，记录该 scope 内创建的所有 effect
    - EFFECT_SCOPES_CHILDREN：scope_id -> [child_scope_id]，记录 scope 的父子关系（支持嵌套 Vapor）

    生命周期：
    - Vapor setup 执行前 push_effect_scope(scope_id)，执行完 pop_effect_scope()
    - create_effect 时读取 current_effect_scope()，把 effect_id 登记到该 scope
    - VNode before_unmount 时 dispose_effect_scope(scope_id)，递归 dispose 子 scope 并逐个 dispose effect
    */
    pub(crate) static NEXT_EFFECT_SCOPE_ID: RefCell<usize> = RefCell::new(1);
    pub(crate) static EFFECT_SCOPE_STACK: RefCell<Vec<usize>> = RefCell::new(Vec::new());
    pub(crate) static EFFECT_SCOPES_EFFECTS: RefCell<HashMap<usize, Vec<usize>>> = RefCell::new(HashMap::new());
    pub(crate) static EFFECT_SCOPES_CHILDREN: RefCell<HashMap<usize, Vec<usize>>> = RefCell::new(HashMap::new());
}

/// 副作用实体
/// cb: 实际执行的回调函数
/// cleanups: 在下一次执行前要运行的清理函数列表（例如取消订阅、释放资源）
/// disposed: 标记为已销毁后不再运行
/// scheduler: 可选自定义调度器，接受一个可调用的运行函数并自行安排时机
pub(crate) struct Effect {
    pub(crate) cb: Function,
    pub(crate) cleanups: Vec<Function>,
    pub(crate) disposed: bool,
    pub(crate) scheduler: Option<Function>,
    /// 创建该 effect 时所在的 scope（由 create_effect 读取 current_effect_scope 绑定）
    ///
    /// 说明：
    /// - scope 是“清理的归属”而不是运行时必须字段：销毁 scope 时，我们依赖
    ///   EFFECT_SCOPES_EFFECTS 里的 effect 列表逐个 dispose。
    /// - 这里保存 scope_id 主要用于调试/日志与未来扩展（例如把 effect 从 scope 列表里移除）。
    pub(crate) scope_id: Option<usize>,
}

/// 创建一个新的 effect scope，并返回 scope id
///
/// 行为：
/// - 分配一个全局唯一的 id
/// - 若当前存在父 scope（current_effect_scope），建立父子关系
/// - 初始化该 scope 的 effects/children 列表（空 vec）
pub fn create_effect_scope() -> usize {
    let id = NEXT_EFFECT_SCOPE_ID.with(|n| {
        let mut v = n.borrow_mut();
        let id = *v;
        *v += 1;
        id
    });
    let parent = current_effect_scope();
    EFFECT_SCOPES_EFFECTS.with(|m| {
        m.borrow_mut().insert(id, Vec::new());
    });
    EFFECT_SCOPES_CHILDREN.with(|m| {
        m.borrow_mut().insert(id, Vec::new());
    });
    if let Some(p) = parent {
        EFFECT_SCOPES_CHILDREN.with(|m| {
            let mut mm = m.borrow_mut();
            mm.entry(p).or_insert_with(Vec::new).push(id);
        });
    }
    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "reactive:scope create") {
            let depth = EFFECT_SCOPE_STACK.with(|s| s.borrow().len());
            crate::log::log(
                "debug",
                &format!("reactive:scope create id={} parent={:?} depth={}", id, parent, depth),
            );
        }
    }
    id
}

/// 将 scope 压入当前执行上下文栈
///
/// 用途：
/// - 在 Vapor setup 执行前调用，使 setup 内创建的 effect 自动归属到该 scope
/// - 支持嵌套：内层 push 后 current_effect_scope() 会返回内层 scope
pub fn push_effect_scope(id: usize) {
    EFFECT_SCOPE_STACK.with(|s| {
        s.borrow_mut().push(id);
    });
    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "reactive:scope push") {
            let depth = EFFECT_SCOPE_STACK.with(|s| s.borrow().len());
            crate::log::log("debug", &format!("reactive:scope push id={} depth={}", id, depth));
        }
    }
}

/// 将当前执行上下文栈顶 scope 弹出
///
/// 返回：
/// - Some(scope_id)：弹出的 scope
/// - None：栈为空（通常表示 push/pop 不匹配）
pub fn pop_effect_scope() -> Option<usize> {
    let out = EFFECT_SCOPE_STACK.with(|s| s.borrow_mut().pop());
    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "reactive:scope pop") {
            crate::log::log("debug", &format!("reactive:scope pop id={:?}", out));
        }
    }
    out
}

/// 读取当前执行上下文的 scope（栈顶）
pub fn current_effect_scope() -> Option<usize> {
    EFFECT_SCOPE_STACK.with(|s| s.borrow().last().copied())
}

/// 将 effect 登记到指定 scope
///
/// 说明：
/// - create_effect 内部会在 EFFECTS 插入后调用它
/// - 这里不去重：理论上同一个 effect 不会重复注册；若发生重复，dispose 时最多多走一次 dispose_effect 的空路径
pub(crate) fn register_effect_in_scope(effect_id: usize, scope_id: usize) {
    EFFECT_SCOPES_EFFECTS.with(|m| {
        let mut mm = m.borrow_mut();
        mm.entry(scope_id).or_insert_with(Vec::new).push(effect_id);
    });
}

/// 销毁一个 effect：从全局表移除并执行所有已注册清理函数
///
/// 关键点：
/// - 这里是“强销毁”：直接从 EFFECTS 移除（避免后续调度再命中该 id）
/// - 同时从 PENDING_EFFECTS 移除，避免批量/微任务 drain 时再次触发
/// - 最后执行 cleanups，保证资源（订阅/定时器等）被释放
pub(crate) fn dispose_effect(id: usize) {
    PENDING_EFFECTS.with(|p| {
        p.borrow_mut().remove(&id);
    });
    let (cleanups, existed) = EFFECTS.with(|m| {
        let mut map = m.borrow_mut();
        if let Some(mut e) = map.remove(&id) {
            e.disposed = true;
            (std::mem::take(&mut e.cleanups), true)
        } else {
            (Vec::new(), false)
        }
    });
    if !existed {
        return;
    }
    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "reactive:effect dispose") {
            crate::log::log(
                "debug",
                &format!("reactive:effect dispose id={} cleanups={}", id, cleanups.len()),
            );
        }
    }
    for f in cleanups {
        let _ = f.call0(&JsValue::NULL);
    }
}

/// 销毁一个 scope：递归销毁子 scope，并销毁该 scope 内的所有 effect
///
/// 调用方：
/// - runtime 的 VNode 生命周期（before_unmount）会在 Vapor 子树卸载时调用它
///
/// 行为细节：
/// - 会把 scope 的 children/effects 列表从全局表中移除（保证同一个 scope 不会被重复 dispose）
/// - 若该 scope 为空（没有 children/effects），直接返回（对空卸载保持低开销）
pub fn dispose_effect_scope(scope_id: usize) {
    let children = EFFECT_SCOPES_CHILDREN.with(|m| {
        let mut mm = m.borrow_mut();
        mm.remove(&scope_id).unwrap_or_default()
    });
    let effects = EFFECT_SCOPES_EFFECTS.with(|m| {
        let mut mm = m.borrow_mut();
        mm.remove(&scope_id).unwrap_or_default()
    });
    if children.is_empty() && effects.is_empty() {
        return;
    }
    for c in children.iter().copied() {
        dispose_effect_scope(c);
    }
    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "reactive:scope dispose") {
            crate::log::log(
                "debug",
                &format!(
                    "reactive:scope dispose id={} effects={} children={}",
                    scope_id,
                    effects.len(),
                    children.len()
                ),
            );
        }
    }
    for id in effects {
        dispose_effect(id);
    }
}

/// 信号实体
/// value: 当前值（JsValue）
/// subs: 订阅该信号的副作用 id 集合
/// equals: 可选的等值比较函数（(prev, next) -> bool），返回 true 表示相等（不触发）
pub(crate) struct Signal {
    pub(crate) value: JsValue,
    pub(crate) subs: Vec<usize>,
    pub(crate) equals: Option<Function>,
    pub(crate) setter: Option<Function>,
}

/// run_effect 借用缩小与重入安全
/// 问题：此前版本在执行回调时持续持有 EFFECTS 的 RefCell 可变借用；当回调体内再次创建/调度/读取依赖导致对 EFFECTS 的可变借用重入，触发运行时 panic（wasm 中表现为 RuntimeError: unreachable）。
/// 方案：在进入回调之前缩小可变借用作用域——先取出需要的清理函数与回调引用并释放对 EFFECTS 的可变借用，再执行清理与回调。这样在回调期间任何对 EFFECTS 的再次借用都不会与当前借用冲突。
/// 行为保证：保持每轮执行前先清理、执行期间设置 CURRENT_EFFECT 用于依赖收集、结束后取消标记；不改变外部可观察行为，仅修复潜在的重入崩溃。
/// 旁注：schedule_effect_run 中仍保持“避免自身重入时切换到微任务”的策略，两者结合保证同步模式下也不会自触发重入。
///
/// 执行指定 id 的副作用
/// - 运行前先执行上一次注册的清理函数（借用缩小后执行）
/// - 执行过程中设置 `CURRENT_EFFECT` 以便 Signal 读取进行依赖收集
/// - 支持嵌套 effect：内部 effect 运行结束后，恢复外层的 `CURRENT_EFFECT`
pub(crate) fn run_effect(id: usize) {
    // 先检查是否已处置，避免不必要的借用与执行
    let disposed = EFFECTS.with(|m| {
        let map = m.borrow();
        map.get(&id).map(|e| e.disposed).unwrap_or(true)
    });
    if disposed {
        return;
    }

    // 取出需要的信息与清理函数，缩小可变借用作用域，避免在回调执行期间发生可变重入借用导致 panic
    let maybe = EFFECTS.with(|m| {
        let mut map = m.borrow_mut();
        if let Some(e) = map.get_mut(&id) {
            let cleans = std::mem::take(&mut e.cleanups);
            let cb = e.cb.clone();
            Some((cleans, cb))
        } else {
            None
        }
    });
    if maybe.is_none() {
        return;
    }
    let (cleanups, cb) = maybe.unwrap();

    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "reactive:effect run start") {
            crate::log::log(
                "debug",
                &format!("reactive:effect run start id={} cleanups={}", id, cleanups.len()),
            );
        }
    }
    // 运行清理函数（不持有 EFFECTS 的可变借用）
    for f in cleanups {
        let _ = f.call0(&JsValue::NULL);
    }

    // 标记当前副作用，用于依赖收集；保存之前的值以支持嵌套 effect。
    // 场景：在一个 effect 内部创建/运行另一个 effect（例如组件渲染时注册 watchEffect），
    // 如果不恢复外层 `CURRENT_EFFECT`，后续对 Signal 的读取将只订阅到内层 effect，
    // 导致外层渲染 effect 失去订阅（界面不再随信号变化重新渲染）。
    let prev_effect = CURRENT_EFFECT.with(|c| c.borrow().clone());
    CURRENT_EFFECT.with(|c| *c.borrow_mut() = Some(id));
    let scope_id = EFFECTS.with(|m| {
        m.borrow()
            .get(&id)
            .and_then(|e| e.scope_id)
    });
    if let Some(sid) = scope_id {
        push_effect_scope(sid);
    }
    let ret = cb.call0(&JsValue::NULL);
    if scope_id.is_some() {
        let _ = pop_effect_scope();
    }
    if let Err(err) = ret {
        let msg_js: js_sys::JsString =
            JSON::stringify(&err).unwrap_or(JsValue::from_str("<unstringifiable>").into());
        let msg_val: JsValue = msg_js.into();
        crate::log::log(
            "warning",
            &format!(
                "effect cb threw id={} err={}",
                id,
                msg_val.as_string().unwrap_or("<unknown>".to_string())
            ),
        );

        throw_val(err.clone());
    }
    // 执行结束后恢复上一层副作用（支持嵌套 effect 场景）
    CURRENT_EFFECT.with(|c| *c.borrow_mut() = prev_effect);
    #[cfg(feature = "dev")]
    {
        if crate::log::want_log("debug", "reactive:effect run end") {
            crate::log::log("debug", &format!("reactive:effect run end id={}", id));
        }
    }
}

/// 默认的微任务调度：将副作用 id 入队并在 Promise.then 中统一运行
fn schedule_effect_run_default(id: usize) {
    PENDING_EFFECTS.with(|p| {
        // 将副作用 id 入队，等待微任务统一执行
        p.borrow_mut().insert(id);
    });
    MICROTASK_SCHEDULED.with(|s| {
        if !*s.borrow() {
            // 仅安排一次微任务 drain，避免同轮事件循环重复安排
            *s.borrow_mut() = true;
            let drain = Closure::wrap(Box::new(move |_v: JsValue| {
                // 在微任务中统一运行已入队的副作用
                #[cfg(feature = "dev")]
                {
                    if crate::log::want_log("debug", "reactive:schedule drain start") {
                        crate::log::log("debug", &format!("reactive:schedule drain start"));
                    }
                }
                let ids: Vec<usize> =
                    PENDING_EFFECTS.with(|p| p.borrow().iter().copied().collect());
                PENDING_EFFECTS.with(|p| p.borrow_mut().clear());
                for id in ids {
                    // 按入队顺序逐个运行（内部会做清理与依赖收集）
                    run_effect(id);
                }
                MICROTASK_SCHEDULED.with(|s| *s.borrow_mut() = false);
                #[cfg(feature = "dev")]
                {
                    if crate::log::want_log("debug", "reactive:schedule drain end") {
                        crate::log::log("debug", &format!("reactive:schedule drain end"));
                    }
                }
            }) as Box<dyn FnMut(JsValue)>);
            let _ = Promise::resolve(&JsValue::UNDEFINED).then(&drain);
            drain.forget();
        }
    });
}

/// 安排运行副作用
/// - 当处于批量更新中（`BATCH_DEPTH>0`）时，先入队等待批量结束
/// - 若存在自定义调度器，则交由其安排
/// - 否则根据 `SCHEDULING_MODE` 决定是直接运行还是走默认微任务
pub(crate) fn schedule_effect_run(id: usize) {
    // 这个函数是“信号值变化后”的统一入口：Signal.set / trigger 会调用它。
    //
    // 这里要同时满足几类约束：
    // 1) disposed/missing：已经销毁的 effect 不允许再被调度（否则会出现卸载后仍然更新）。
    // 2) batch：在批量更新范围内（BATCH_DEPTH>0）不能立即运行 effect，
    //    因为这会导致：
    //    - 多次连续 set 引发多次重复渲染（你遇到的“点击过快出现重复”就属于这种现象的放大版）
    //    - effect 在“中间态”运行，看到不一致的状态组合（例如 A 更新了但 B 还没更新）
    //    因此 batch 内只做“去重入队”，等 batch 结束统一 flush。
    // 3) scheduler：允许 effect 携带自定义调度器（例如用户希望把更新合并到 RAF）。
    // 4) sync vs microtask：默认策略可以是同步（尽快运行）或微任务合并运行。
    let disposed_or_missing =
        EFFECTS.with(|m| m.borrow().get(&id).map(|e| e.disposed).unwrap_or(true));
    if disposed_or_missing {
        return;
    }
    let in_batch = BATCH_DEPTH.with(|bd| *bd.borrow() > 0);
    if in_batch {
        PENDING_EFFECTS.with(|p| {
            // 批量模式：仅入队，不立即运行
            //
            // 这里用 HashSet 的语义保证去重：
            // - 同一个 effect 在一个 batch 中被多次触发，只需要在 batch 结束时运行一次
            p.borrow_mut().insert(id);
        });
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "reactive:schedule queued") {
                crate::log::log("debug", &format!("reactive:schedule queued id={}", id));
            }
        }
        return;
    }
    PENDING_EFFECTS.with(|p| {
        let mut set = p.borrow_mut();
        // 走到这里说明“不在 batch 中”，因此可以把旧的 pending 去掉：
        // - 避免后续 drain 再次运行同一个 id（造成重复执行）
        // - 也使得 schedule_effect_run_default 的队列状态更干净
        set.remove(&id);
    });
    // 是否已由自定义调度器处理
    let mut handled = false;
    EFFECTS.with(|m| {
        if let Some(e) = m.borrow().get(&id) {
            if e.disposed {
                return;
            }
            if let Some(s) = &e.scheduler {
                #[cfg(feature = "dev")]
                {
                    if crate::log::want_log("debug", "reactive:schedule custom") {
                        crate::log::log("debug", &format!("reactive:schedule custom id={}", id));
                    }
                }
                // 将运行逻辑包装为可供 JS 调度的函数
                let run_closure = Closure::wrap(Box::new(move || {
                    run_effect(id);
                }) as Box<dyn FnMut()>);
                let run_fn: Function = run_closure.as_ref().clone().unchecked_into();
                let _ = s.call1(&JsValue::NULL, &run_fn);
                run_closure.forget();
                handled = true;
            }
        }
    });
    if !handled {
        SCHEDULING_MODE.with(|m| {
            if *m.borrow() == 1 {
                // 避免副作用内部触发自身的直接重入
                let is_self = CURRENT_EFFECT.with(|c| match *c.borrow() {
                    Some(cur) if cur == id => true,
                    _ => false,
                });
                if is_self {
                    #[cfg(feature = "dev")]
                    {
                        if crate::log::want_log("debug", "reactive:schedule avoid_self") {
                            crate::log::log(
                                "debug",
                                &format!("reactive:schedule avoid_self id={}", id),
                            );
                        }
                    }
                    // 在自身重入时切换到默认微任务，避免无限递归
                    schedule_effect_run_default(id);
                } else {
                    #[cfg(feature = "dev")]
                    {
                        if crate::log::want_log("debug", "reactive:schedule direct") {
                            crate::log::log(
                                "debug",
                                &format!("reactive:schedule direct id={}", id),
                            );
                        }
                    }
                    // 同步模式：直接运行
                    run_effect(id);
                }
            } else {
                #[cfg(feature = "dev")]
                {
                    if crate::log::want_log("debug", "reactive:schedule default_microtask") {
                        crate::log::log(
                            "debug",
                            &format!("reactive:schedule default_microtask id={}", id),
                        );
                    }
                }
                // 微任务模式：统一入队等待 drain
                schedule_effect_run_default(id);
            }
        });
    }
}

/// 批量更新作用域：在回调执行期间延迟 effect 运行，并在最外层结束时统一 flush
pub fn batch_scope<F: FnOnce()>(cb: F) {
    // batch_scope 的语义：把一段“可能触发多次 Signal 更新”的逻辑包起来，
    // 在这段逻辑执行期间：
    // - schedule_effect_run 会被短路为“只入队不执行”
    // 在最外层 batch 结束时（BATCH_DEPTH 回到 0）：
    // - 统一把 PENDING_EFFECTS 里的 effect 触发一次（去重后的结果）
    //
    // 为什么是“深度计数”而不是 bool：
    // - 允许嵌套 batch：内层 batch 结束不能提前 flush，必须等最外层结束
    BATCH_DEPTH.with(|bd| {
        *bd.borrow_mut() += 1;
    });
    cb();
    BATCH_DEPTH.with(|bd| {
        let mut b = bd.borrow_mut();
        if *b > 0 {
            *b -= 1;
        }
    });
    BATCH_DEPTH.with(|bd| {
        if *bd.borrow() == 0 {
            PENDING_EFFECTS.with(|p| {
                let ids: Vec<usize> = p.borrow().iter().copied().collect();
                p.borrow_mut().clear();
                for id in ids {
                    // 注意这里调用的是 schedule_effect_run 而不是 run_effect：
                    // - 这样能复用“自定义调度器 / 同步 vs 微任务 / avoid_self 重入保护”等策略
                    // - 同时也确保 effect 在 flush 阶段仍会尊重 disposed 状态
                    schedule_effect_run(id);
                }
            });
        }
    });
}

/// 设置调度模式
/// - mode="sync"：信号变更时尽可能同步触发副作用
/// - 其他值：采用默认微任务合并调度
/// 示例（JavaScript）：
/// ```javascript
/// const { setReactiveScheduling } = wasmModule;
/// setReactiveScheduling('sync'); // 适合少量、快速的更新
/// // setReactiveScheduling('microtask'); // 使用默认微任务合并（传非 "sync" 即可）
/// ```
#[wasm_bindgen(js_name = setReactiveScheduling)]
pub fn set_reactive_scheduling(mode: &str) {
    let v = if mode == "sync" { 1 } else { 0 };
    SCHEDULING_MODE.with(|m| *m.borrow_mut() = v);
}

// batch function is exposed in effect.rs

/// 通用取值转换
/// 支持以下输入：
/// - 函数：调用并返回其结果
/// - 对象：优先读取 `value` 字段，其次尝试调用 `get()` 方法
/// - 其他：直接返回原值
/// 示例（JavaScript）：
/// ```javascript
/// const { toValue } = wasmModule;
/// toValue(() => 1); // 1
/// toValue({ value: 2 }); // 2
/// toValue({ get() { return 3; } }); // 3
/// toValue('hello'); // 'hello'
/// ```
#[wasm_bindgen(js_name = toValue)]
pub fn to_value(x: JsValue) -> JsValue {
    if let Some(f) = x.dyn_ref::<Function>() {
        return f.call0(&JsValue::NULL).unwrap_or(JsValue::UNDEFINED);
    }
    if x.is_object() {
        let v = Reflect::get(&x, &JsValue::from_str("value")).unwrap_or(JsValue::UNDEFINED);
        if !v.is_undefined() {
            return v;
        }
        let getf = Reflect::get(&x, &JsValue::from_str("get")).unwrap_or(JsValue::UNDEFINED);
        if let Some(g) = getf.dyn_ref::<Function>() {
            return g.call0(&x).unwrap_or(JsValue::UNDEFINED);
        }
    }
    x
}

#[wasm_bindgen(typescript_custom_section)]
const TS_CORE_DECL: &'static str = r#"
/**
 * 设置调度模式
 * - mode="sync"：信号变更时尽可能同步触发副作用
 * - 其他值：采用默认微任务合并调度
 * 示例（JavaScript）：
 * ```javascript
 * const { setReactiveScheduling } = wasmModule;
 * setReactiveScheduling('sync'); // 适合少量、快速的更新
 * // setReactiveScheduling('microtask'); // 使用默认微任务合并（传非 "sync" 即可）
 * ```
 */
export function setReactiveScheduling(mode: 'sync' | string): void;

/**
 * 通用取值转换
 * 支持以下输入：
 * - 函数：调用并返回其结果
 * - 对象：优先读取 `value` 字段，其次尝试调用 `get()` 方法
 * - 其他：直接返回原值
 * 示例（JavaScript）：
 * ```javascript
 * const { toValue } = wasmModule;
 * toValue(() => 1); // 1
 * toValue({ value: 2 }); // 2
 * toValue({ get() { return 3; } }); // 3
 * toValue('hello'); // 'hello'
 * ```
 */
export function toValue<T>(x: T | (() => T) | { value?: T; get?: () => T }): T;

/**
 * 原始类型：普通值会自动包裹为 { value } 并返回其代理
 */
type Primitive = string | number | bigint | boolean | symbol | null | undefined

/**
 * 扩展原始类型：将原始值包裹为 { value: T } 并返回其代理
 */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends bigint
        ? bigint
        : T extends symbol
          ? symbol
          : T extends null | undefined
            ? T
            : never
"#;
