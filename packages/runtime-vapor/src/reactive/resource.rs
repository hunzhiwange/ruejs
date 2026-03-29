/*
资源模块：将异步数据获取过程封装为响应式三段式状态

设计目标：
- 基于一个“来源信号”（src）的值，调用用户提供的 fetcher(src) 返回 Promise<TData>
- 同步暴露三个信号：data（数据）、error（错误）、loading（加载态）
- 当 src 发生变化时，自动重发请求并更新三信号，便于界面以声明式响应显示状态

行为细节：
- 每次 src 改变：
  1) loading = true
  2) error = undefined
  3) 调用 fetcher(src) 并等待 Promise
  4) resolved: data = 结果；loading = false
     rejected: error = 异常；loading = false
- 对 data/error/loading 的读取可参与依赖收集（例如在 createEffect/watch 中使用）
- 该实现不执行“请求竞态取消”，若需要可在 fetcher 内自行根据最新 src 进行忽略或使用 AbortController
*/
use js_sys::{Function, Object, Promise};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;

use crate::reactive::effect::create_effect;
use crate::reactive::signal::{SignalHandle, create_signal};

/// 创建资源：根据 `src` 信号的值调用 `fetcher`（返回 Promise），
/// 并提供 `{ data, error, loading }` 三个信号以反映异步状态。
/// 示例（JavaScript）：
/// ```javascript
/// const { createSignal, createResource, createEffect } = wasmModule;
/// const key = createSignal('https://api.example.com/data');
/// const res = createResource(key, async (k) => {
///   const r = await fetch(k);
///   if (!r.ok) throw new Error('network error');
///   return r.json();
/// });
///
/// createEffect(() => {
///   console.log('loading:', res.loading.get());
///   console.log('data:', res.data.get());
///   console.log('error:', res.error.get());
/// });
///
/// key.set('https://api.example.com/data2');
/// ```
#[wasm_bindgen(js_name = createResource)]
pub fn create_resource(src: &SignalHandle, fetcher: Function) -> JsValue {
    let data = create_signal(JsValue::UNDEFINED, None);
    let error = create_signal(JsValue::UNDEFINED, None);
    let loading = create_signal(JsValue::from_bool(false), None);

    let s1 = src.clone();
    let d1 = data.clone();
    let e1 = error.clone();
    let l1 = loading.clone();
    let run = Closure::wrap(Box::new(move || {
        // 读取当前来源值并开始一次异步获取过程
        let v = s1.get_js();
        // 进入加载态，清理旧错误
        l1.set_js(JsValue::from_bool(true));
        e1.set_js(JsValue::UNDEFINED);
        // 调用用户的 fetcher(src)：期望返回 Promise
        let ret = fetcher.call1(&JsValue::NULL, &v).unwrap_or(JsValue::UNDEFINED);
        let p: Promise = ret.dyn_into().unwrap_or_else(|_| Promise::resolve(&JsValue::UNDEFINED));

        let d2 = d1.clone();
        let l2 = l1.clone();
        let on_ok = Closure::wrap(Box::new(move |x: JsValue| {
            // 成功：写入 data 并退出加载态
            d2.set_js(x);
            l2.set_js(JsValue::from_bool(false));
        }) as Box<dyn FnMut(JsValue)>);

        let e2 = e1.clone();
        let l3 = l1.clone();
        let on_err = Closure::wrap(Box::new(move |err: JsValue| {
            // 失败：写入 error 并退出加载态
            e2.set_js(err);
            l3.set_js(JsValue::from_bool(false));
        }) as Box<dyn FnMut(JsValue)>);

        let _ = p.then(&on_ok).catch(&on_err);
        on_ok.forget();
        on_err.forget();
    }) as Box<dyn FnMut()>);
    let f_js: JsValue = run.as_ref().clone();
    let func: Function = f_js.dyn_into().unwrap();
    // 以副作用驱动：src 改变时自动执行一次获取流程
    let _eh = create_effect(func, None);
    run.forget();

    let obj = Object::new();
    // 返回结构体：{ data, error, loading } 三个信号句柄
    js_sys::Reflect::set(&obj, &JsValue::from_str("data"), &JsValue::from(data)).unwrap();
    js_sys::Reflect::set(&obj, &JsValue::from_str("error"), &JsValue::from(error)).unwrap();
    js_sys::Reflect::set(&obj, &JsValue::from_str("loading"), &JsValue::from(loading)).unwrap();
    obj.into()
}

#[wasm_bindgen(typescript_custom_section)]
const TS_RESOURCE_DECL: &'static str = r#"
/**
 * 资源句柄：包含 `{ data, error, loading }` 三个信号
 */
export interface Resource<TData = any> {
  data: SignalHandle;
  error: SignalHandle;
  loading: SignalHandle;
}

/**
 * 创建资源：根据 `src` 信号的值调用 `fetcher`（返回 Promise），
 * 并提供 `{ data, error, loading }` 三个信号以反映异步状态。
 * 示例（JavaScript）：
 * ```javascript
 * const { createSignal, createResource, createEffect } = wasmModule;
 * const key = createSignal('https://api.example.com/data');
 * const res = createResource(key, async (k) => {
 *   const r = await fetch(k);
 *   if (!r.ok) throw new Error('network error');
 *   return r.json();
 * });
 *
 * createEffect(() => {
 *   console.log('loading:', res.loading.get());
 *   console.log('data:', res.data.get());
 *   console.log('error:', res.error.get());
 * });
 *
 * key.set('https://api.example.com/data2');
 * ```
 */
export function createResource<TSrc, TData>(
  src: SignalHandle,
  fetcher: (src: TSrc) => Promise<TData>,
): Resource<TData>;
"#;
