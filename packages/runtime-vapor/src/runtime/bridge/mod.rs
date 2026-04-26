//! WASM 侧桥接模块（中文注释增强）
//!
//! - 暴露 WasmRue 供 JS 调用（创建、渲染、挂载、卸载等）
//! - 管理默认 MountInput 注册表与异步渲染队列（render/renderBetween/renderStatic）
//! - 通过 Promise.then 驱动批处理刷新，避免重入
//! - 提供 DOM 适配器的设置与读取，以及生命周期 hooks 注册
use crate::reactive::core::dispose_effect_scope;
use crate::reactive::effect::EffectHandle;
use crate::runtime::core::Rue;
use crate::runtime::globals::MOUNT_INPUT_REGISTRY;
use crate::runtime::js_adapter::JsDomAdapter;
use crate::runtime::types::MountInput;
use js_sys::Promise;
use std::cell::RefCell;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

mod create_element;
mod create_rue;
mod emitted;
mod get_current_container;
mod input;
mod mount;
mod on_before_create;
mod on_before_mount;
mod on_before_unmount;
mod on_before_update;
mod on_created;
mod on_error;
mod on_mounted;
mod on_unmounted;
mod on_updated;
mod render;
mod render_anchor;
mod render_between;
mod render_static;
mod set_dom_adapter;
mod unmount;
mod use_plugin;
mod vapor;

pub use create_rue::createRue;

#[wasm_bindgen]
pub struct WasmRue {
    inner: RefCell<Rue<JsDomAdapter>>,
    // 最近一次渲染/挂载的容器引用（JS 值克隆）：
    // - 供 getCurrentContainer() 之类的 API 使用
    // - 也便于在某些错误/兜底路径下找到“当前容器上下文”
    last_container: RefCell<Option<JsValue>>,
    pending_anchor: RefCell<Vec<(MountInput<JsDomAdapter>, JsValue, JsValue)>>,
    pending_between: RefCell<Vec<(MountInput<JsDomAdapter>, JsValue, JsValue, JsValue)>>,
    pending_render: RefCell<Vec<(MountInput<JsDomAdapter>, JsValue)>>,
    pending_static: RefCell<Vec<(MountInput<JsDomAdapter>, JsValue, JsValue)>>,
    // root 级别的 effect 句柄（由 mount 创建）：
    // - mount(app, container) 会用 create_effect 包裹 app 执行，从而实现依赖变化自动重渲染
    // - 需要在 unmount 或再次 mount 时释放，避免多个 root effect 并存导致重复渲染/内存泄漏
    root_effect: RefCell<Option<EffectHandle>>,
    root_effect_scope: RefCell<Option<usize>>,
    root_effect_closure: RefCell<Option<Closure<dyn FnMut()>>>,
}

impl WasmRue {
    /// 处理挂起的渲染队列：render 优先，其次 renderBetween，最后 renderStatic
    ///
    /// 若借用失败（重入），将任务放回队列并终止本次处理
    fn process_queues(&self) {
        loop {
            let r = {
                let mut queue = self.pending_render.borrow_mut();
                if queue.is_empty() {
                    None
                } else {
                    Some(queue.remove(0))
                }
            };
            if let Some((vnode_r, cont_r)) = r {
                match self.inner.try_borrow_mut() {
                    Ok(mut inner_r) => {
                        let mut cr = cont_r.clone();
                        inner_r.render_input(vnode_r, (&mut cr).into());
                    }
                    Err(_) => {
                        self.pending_render.borrow_mut().push((vnode_r, cont_r));
                        break;
                    }
                }
                continue;
            }
            let b = {
                let mut queue = self.pending_between.borrow_mut();
                if queue.is_empty() {
                    None
                } else {
                    Some(queue.remove(0))
                }
            };
            if let Some((vnode_b, p_b, s_b, e_b)) = b {
                match self.inner.try_borrow_mut() {
                    Ok(mut inner_b) => {
                        let mut pb = p_b.clone();
                        inner_b.render_between_input(vnode_b, (&mut pb).into(), s_b.into(), e_b.into());
                    }
                    Err(_) => {
                        self.pending_between.borrow_mut().push((vnode_b, p_b, s_b, e_b));
                        break;
                    }
                }
                continue;
            }
            let a = {
                let mut queue = self.pending_anchor.borrow_mut();
                if queue.is_empty() {
                    None
                } else {
                    Some(queue.remove(0))
                }
            };
            if let Some((vnode_a, p_a, anchor_a)) = a {
                match self.inner.try_borrow_mut() {
                    Ok(mut inner_a) => {
                        let mut pa = p_a.clone();
                        inner_a.render_anchor_input(vnode_a, (&mut pa).into(), anchor_a.into());
                    }
                    Err(_) => {
                        self.pending_anchor.borrow_mut().push((vnode_a, p_a, anchor_a));
                        break;
                    }
                }
                continue;
            }
            let s = {
                let mut queue = self.pending_static.borrow_mut();
                if queue.is_empty() {
                    None
                } else {
                    Some(queue.remove(0))
                }
            };
            if let Some((vnode_s, p_s, a_s)) = s {
                match self.inner.try_borrow_mut() {
                    Ok(mut inner_s) => {
                        let mut ps = p_s.clone();
                        inner_s.render_static_input(vnode_s, (&mut ps).into(), a_s.into());
                    }
                    Err(_) => {
                        self.pending_static.borrow_mut().push((vnode_s, p_s, a_s));
                        break;
                    }
                }
                continue;
            }
            break;
        }
    }

    /// 是否存在挂起任务（render / renderBetween / renderStatic）
    fn has_pending(&self) -> bool {
        !self.pending_render.borrow().is_empty()
            || !self.pending_anchor.borrow().is_empty()
            || !self.pending_between.borrow().is_empty()
            || !self.pending_static.borrow().is_empty()
    }

    /// 创建一个闭包用于驱动队列处理；在任务未清空时递归调度
    fn make_process_closure(this_ptr: *const WasmRue) -> Closure<dyn FnMut(JsValue)> {
        Closure::wrap(Box::new(move |_v: JsValue| {
            let this = unsafe { &*this_ptr };
            this.process_queues();
            if this.has_pending() {
                let cb2 = WasmRue::make_process_closure(this_ptr);
                let _ = Promise::resolve(&JsValue::UNDEFINED).then(&cb2);
                cb2.forget();
            }
        }) as Box<dyn FnMut(JsValue)>)
    }

    /// 安排一次异步刷新：Promise.then 调用处理闭包
    pub(super) fn schedule_flush(&self) {
        let this_ptr = self as *const WasmRue;
        let cb = WasmRue::make_process_closure(this_ptr);
        let _ = Promise::resolve(&JsValue::UNDEFINED).then(&cb);
        cb.forget();
    }

    fn dispose_root_effect(&self) {
        // 释放 mount 创建的 root effect（如果存在）。
        //
        // 设计上，一个 WasmRue 实例同一时刻只应该有一个“root effect”：
        // - 负责把 app(props) 的结果渲染到指定容器
        // - 依赖追踪会让它在响应式数据变化时自动重新运行
        //
        // 若不释放：
        // - 重复 mount 会叠加多个 effect，造成重复 render / DOM 重复插入
        // - 同时也会导致 JS Function / Closure 等资源无法回收
        if let Some(scope_id) = self.root_effect_scope.borrow_mut().take() {
            dispose_effect_scope(scope_id);
        }
        self.root_effect.borrow_mut().take();
        self.root_effect_closure.borrow_mut().take();
    }

    /// 从默认输入注册表按 id 取出 MountInput（并置空其槽位）
    pub(super) fn take_mount_input_from_registry(idv: &JsValue) -> Option<MountInput<JsDomAdapter>> {
        if let Some(idf) = idv.as_f64() {
            let idx = idf as usize;
            MOUNT_INPUT_REGISTRY.with(|reg| {
                let mut r = reg.borrow_mut();
                if idx < r.len() { r[idx].take() } else { None }
            })
        } else {
            None
        }
    }
}
