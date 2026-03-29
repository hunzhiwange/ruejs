use js_sys::Function;
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

pub struct State {
    pub list_handlers: Vec<Closure<dyn FnMut(JsValue)>>,
    pub ui_handlers: Vec<Closure<dyn FnMut(JsValue)>>,
    pub inspector_handlers: Vec<Closure<dyn FnMut(JsValue)>>,
    pub pages_handlers: Vec<Closure<dyn FnMut(JsValue)>>,
}

pub fn reflect_get(obj: &JsValue, key: &str) -> JsValue {
    js_sys::Reflect::get(obj, &JsValue::from_str(key)).unwrap_or(JsValue::UNDEFINED)
}

pub fn reflect_set(obj: &JsValue, key: &str, value: &JsValue) {
    let _ = js_sys::Reflect::set(obj, &JsValue::from_str(key), value);
}

pub fn create_element(document: &JsValue, tag: &str) -> JsValue {
    let ce = reflect_get(document, "createElement")
        .dyn_into::<Function>()
        .unwrap();
    ce.call1(document, &JsValue::from_str(tag)).unwrap()
}

pub fn set_text(node: &JsValue, text: &str) {
    reflect_set(node, "textContent", &JsValue::from_str(text));
}

pub fn set_class(node: &JsValue, class_name: &str) {
    reflect_set(node, "className", &JsValue::from_str(class_name));
}

pub fn set_attr(node: &JsValue, name: &str, value: &str) {
    let set_attribute = reflect_get(node, "setAttribute")
        .dyn_into::<Function>()
        .unwrap();
    let _ = set_attribute.call2(node, &JsValue::from_str(name), &JsValue::from_str(value));
}

pub fn append_child(parent: &JsValue, child: &JsValue) {
    let append = reflect_get(parent, "appendChild")
        .dyn_into::<Function>()
        .unwrap();
    let _ = append.call1(parent, child);
}

pub fn set_onclick(node: &JsValue, cb: &Closure<dyn FnMut(JsValue)>) {
    reflect_set(node, "onclick", cb.as_ref());
}

pub fn set_oninput(node: &JsValue, cb: &Closure<dyn FnMut(JsValue)>) {
    reflect_set(node, "oninput", cb.as_ref());
}

pub fn set_onchange(node: &JsValue, cb: &Closure<dyn FnMut(JsValue)>) {
    reflect_set(node, "onchange", cb.as_ref());
}

pub fn set_onblur(node: &JsValue, cb: &Closure<dyn FnMut(JsValue)>) {
    reflect_set(node, "onblur", cb.as_ref());
}

pub fn set_ondblclick(node: &JsValue, cb: &Closure<dyn FnMut(JsValue)>) {
    reflect_set(node, "ondblclick", cb.as_ref());
}

pub fn set_oncontextmenu(node: &JsValue, cb: &Closure<dyn FnMut(JsValue)>) {
    reflect_set(node, "oncontextmenu", cb.as_ref());
}

pub fn set_onwheel(node: &JsValue, cb: &Closure<dyn FnMut(JsValue)>) {
    reflect_set(node, "onwheel", cb.as_ref());
}

pub fn set_onkeydown(node: &JsValue, cb: &Closure<dyn FnMut(JsValue)>) {
    reflect_set(node, "onkeydown", cb.as_ref());
}

pub fn object_new() -> JsValue {
    js_sys::Object::new().into()
}

pub fn object_set(obj: &JsValue, key: &str, v: &JsValue) {
    let _ = js_sys::Reflect::set(obj, &JsValue::from_str(key), v);
}

pub fn array_new() -> js_sys::Array {
    js_sys::Array::new()
}

pub fn array_push(arr: &js_sys::Array, v: &JsValue) {
    arr.push(v);
}

pub fn input_value(node: &JsValue) -> Option<String> {
    js_sys::Reflect::get(node, &JsValue::from_str("value"))
        .ok()
        .and_then(|v| v.as_string())
}

pub fn input_value_f64(node: &JsValue) -> Option<f64> {
    if let Some(s) = input_value(node) {
        let t = s.trim();
        if t.is_empty() {
            None
        } else {
            t.parse::<f64>().ok()
        }
    } else {
        js_sys::Reflect::get(node, &JsValue::from_str("value"))
            .ok()
            .and_then(|v| v.as_f64())
    }
}

pub fn get_attribute(node: &JsValue, name: &str) -> Option<String> {
    let f = reflect_get(node, "getAttribute").dyn_into::<Function>().ok()?;
    f.call1(node, &JsValue::from_str(name))
        .ok()
        .and_then(|v| v.as_string())
}

pub fn query_selector(root: &JsValue, selector: &str) -> JsValue {
    let f = reflect_get(root, "querySelector").dyn_into::<Function>().ok();
    if let Some(func) = f {
        func.call1(root, &JsValue::from_str(selector))
            .unwrap_or(JsValue::UNDEFINED)
    } else {
        JsValue::UNDEFINED
    }
}

pub fn focus(node: &JsValue) {
    let f = reflect_get(node, "focus").dyn_into::<Function>().ok();
    if let Some(func) = f {
        let _ = func.call0(node);
    }
}

pub fn set_selection_to_end(node: &JsValue) {
    let val = js_sys::Reflect::get(node, &JsValue::from_str("value")).unwrap_or(JsValue::UNDEFINED);
    let len = val.as_string().map(|s| s.len() as f64).unwrap_or(0.0);
    let f = reflect_get(node, "setSelectionRange").dyn_into::<Function>().ok();
    if let Some(func) = f {
        let _ = func.call2(node, &JsValue::from_f64(len), &JsValue::from_f64(len));
    }
}

pub fn clamp(v: f64, lo: f64, hi: f64) -> f64 {
    if v < lo {
        lo
    } else if v > hi {
        hi
    } else {
        v
    }
}

pub fn palette_color(id: u32) -> String {
    let colors = [
        "#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee", "#4ade80",
    ];
    let i = (id as usize) % colors.len();
    colors[i].to_string()
}

pub fn prompt_text(global: &JsValue, message: &str, default_value: &str) -> Option<String> {
    let p = reflect_get(global, "prompt");
    if !p.is_function() {
        return None;
    }
    let f: Function = p.dyn_into().ok()?;
    let out = f
        .call2(
            &JsValue::UNDEFINED,
            &JsValue::from_str(message),
            &JsValue::from_str(default_value),
        )
        .ok()?;
    out.as_string()
}

pub fn set_timeout(cb: &Closure<dyn FnMut(JsValue)>, ms: i32) {
    let global = js_sys::global();
    let f = reflect_get(&global, "setTimeout").dyn_into::<Function>().unwrap();
    let _ = f.call2(&JsValue::UNDEFINED, cb.as_ref(), &JsValue::from_f64(ms as f64));
}

pub fn set_timeout_id(cb: &Closure<dyn FnMut(JsValue)>, ms: i32) -> JsValue {
    let global = js_sys::global();
    let f = reflect_get(&global, "setTimeout").dyn_into::<Function>().unwrap();
    f.call2(&JsValue::UNDEFINED, cb.as_ref(), &JsValue::from_f64(ms as f64))
        .unwrap_or(JsValue::UNDEFINED)
}

pub fn clear_timeout(id: &JsValue) {
    let global = js_sys::global();
    let f = reflect_get(&global, "clearTimeout").dyn_into::<Function>().unwrap();
    let _ = f.call1(&JsValue::UNDEFINED, id);
}

pub fn debounce<F>(f: F, delay: i32) -> Closure<dyn FnMut(JsValue)>
where
    F: FnMut(JsValue) + 'static,
{
    let timeout = Rc::new(RefCell::new(None::<JsValue>));
    let fcell = Rc::new(RefCell::new(f));
    Closure::wrap(Box::new(move |ev: JsValue| {
        let timeout2 = timeout.clone();
        let f2 = fcell.clone();
        let cb = Closure::wrap(Box::new(move |_t: JsValue| {
            f2.borrow_mut()(ev.clone());
        }) as Box<dyn FnMut(JsValue)>);
        if let Some(t) = timeout2.borrow_mut().take() {
            clear_timeout(&t);
        }
        let id = set_timeout_id(&cb, delay);
        timeout2.borrow_mut().replace(id);
        cb.forget();
    }) as Box<dyn FnMut(JsValue)>)
}
