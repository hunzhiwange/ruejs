use rue_runtime_vapor::SignalHandle;
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsValue;

use crate::layer_manager::utils::*;

pub fn render_pages(
    document: &JsValue,
    panel: &JsValue,
    state_sig: &SignalHandle,
    handlers: &Rc<RefCell<State>>,
    rerender: &Rc<dyn Fn()>,
) {
    reflect_set(panel, "innerHTML", &JsValue::from_str(""));
    {
        let mut h = handlers.borrow_mut();
        h.pages_handlers.clear();
    }
    let head = create_element(document, "div");
    set_class(&head, "p-2 flex items-center justify-between border-b border-base-300");
    let t = create_element(document, "div");
    set_class(&t, "text-xs font-semibold");
    set_text(&t, "页面");
    let btn_add = create_element(document, "button");
    set_class(&btn_add, "btn btn-ghost btn-xs");
    set_text(&btn_add, "+");
    append_child(&head, &t);
    append_child(&head, &btn_add);
    append_child(panel, &head);
    let list = create_element(document, "div");
    set_class(&list, "p-2 space-y-1");
    append_child(panel, &list);
    let pages = js_sys::Array::from(&state_sig.get_path_js(JsValue::from_str("pages")));
    let cur = state_sig.get_path_js(JsValue::from_str("current_page")).as_f64();
    for i in 0..pages.length() {
        let p = pages.get(i);
        let row = create_element(document, "div");
        set_class(&row, "px-2 py-1 rounded cursor-pointer hover:bg-base-200 flex items-center justify-between");
        let idv = js_sys::Reflect::get(&p, &JsValue::from_str("id")).unwrap_or(JsValue::UNDEFINED);
        let nm = js_sys::Reflect::get(&p, &JsValue::from_str("name")).unwrap_or(JsValue::from_str(""));
        let lab = create_element(document, "span");
        set_class(&lab, "text-sm");
        reflect_set(&lab, "textContent", &nm);
        if cur.is_some() && idv.as_f64().unwrap_or(-1.0) == cur.unwrap() {
            set_attr(&row, "style", "background:rgba(99,102,241,.12);");
        }
        append_child(&row, &lab);
        let id = idv.as_f64().unwrap_or(1.0);
        let state_sig2 = state_sig.clone();
        let handlers2 = handlers.clone();
        let rerender2 = rerender.clone();
        let handlers_for_tm = handlers2.clone();
        let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
            state_sig2.set_path_js(JsValue::from_str("current_page"), JsValue::from_f64(id));
            let rer = rerender2.clone();
            let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                rer();
            }) as Box<dyn FnMut(JsValue)>);
            set_timeout(&tm, 0);
            handlers_for_tm.borrow_mut().ui_handlers.push(tm);
        }) as Box<dyn FnMut(JsValue)>);
        set_onclick(&row, &cb);
        handlers2.borrow_mut().pages_handlers.push(cb);
        append_child(&list, &row);
    }
    {
        let state_sig2 = state_sig.clone();
        let rerender2 = rerender.clone();
        let handlers_for_tm = handlers.clone();
        let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
            let nextp = state_sig2.get_path_js(JsValue::from_str("next_page_id")).as_f64().unwrap_or(2.0);
            let id = nextp as u32;
            state_sig2.set_path_js(JsValue::from_str("next_page_id"), JsValue::from_f64((id + 1) as f64));
            let o = object_new();
            object_set(&o, "id", &JsValue::from_f64(id as f64));
            object_set(&o, "name", &JsValue::from_str(&format!("页面 {}", id)));
            let cur = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("pages")));
            let newp = array_new();
            for i in 0..cur.length() {
                array_push(&newp, &cur.get(i));
            }
            array_push(&newp, &o);
            state_sig2.set_path_js(JsValue::from_str("pages"), newp.into());
            state_sig2.set_path_js(JsValue::from_str("current_page"), JsValue::from_f64(id as f64));
            let rer = rerender2.clone();
            let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                rer();
            }) as Box<dyn FnMut(JsValue)>);
            set_timeout(&tm, 0);
            handlers_for_tm.borrow_mut().ui_handlers.push(tm);
        }) as Box<dyn FnMut(JsValue)>);
        set_onclick(&btn_add, &cb);
        handlers.borrow_mut().pages_handlers.push(cb);
    }
}
