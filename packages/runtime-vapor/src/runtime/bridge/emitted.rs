use super::WasmRue;
use crate::runtime::types::ComponentProps;
use js_sys::{Array, Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl WasmRue {
    #[wasm_bindgen(js_name = "emitted")]
    /// 返回一个 JS 回调函数，用于在组件内部发射事件
    ///
    /// - 根据 props 构建事件发射器 emitter(name, args)
    /// - 回调参数 args 若为数组，将其拆解为 Vec<JsValue> 传入
    pub fn emitted_wasm(&self, props: JsValue) -> JsValue {
        #[cfg(feature = "dev")]
        {
            if crate::log::want_log("debug", "runtime:emitted") {
                crate::log::log("debug", "runtime:emitted");
            }
        }
        // 尝试只读借用 inner：若失败则返回一个空操作回调
        let inner = match self.inner.try_borrow() {
            Ok(i) => i,
            Err(_) => {
                let cb = wasm_bindgen::closure::Closure::wrap(Box::new(
                    move |_evt: JsValue, _args: JsValue| {},
                )
                    as Box<dyn FnMut(JsValue, JsValue)>);
                return cb.into_js_value();
            }
        };
        // props 归一化为 ComponentProps 映射
        let mut props_map: ComponentProps = ComponentProps::new();
        if props.is_object() {
            let obj = Object::from(props.clone());
            let keys = Object::keys(&obj);
            for i in 0..keys.length() {
                let k = keys.get(i);
                if let Some(ks) = k.as_string() {
                    let v = Reflect::get(&obj, &k).unwrap_or(JsValue::UNDEFINED);
                    props_map.insert(ks, v);
                }
            }
        }
        // 创建 emitter，并将其捕获到闭包的环境中
        let mut emitter = inner.emitted(&props_map);
        let cb =
            wasm_bindgen::closure::Closure::wrap(Box::new(move |evt: JsValue, args: JsValue| {
                let name = evt.as_string().unwrap_or_default();
                let mut list: Vec<JsValue> = Vec::new();
                // args 若为数组：拆解为参数列表；否则忽略
                if Array::is_array(&args) {
                    let arr = Array::from(&args);
                    for i in 0..arr.length() {
                        list.push(arr.get(i));
                    }
                }
                emitter(name, list);
            })
                as Box<dyn FnMut(JsValue, JsValue)>);
        cb.into_js_value()
    }
}
