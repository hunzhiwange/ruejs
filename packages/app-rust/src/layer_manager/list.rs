use rue_runtime_vapor::SignalHandle;
use js_sys::Function;
use wasm_bindgen::JsCast;
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsValue;

use crate::layer_manager::utils::*;

pub fn render_list(
    document: &JsValue,
    list: &JsValue,
    state_sig: &SignalHandle,
    handlers: &Rc<RefCell<State>>,
    rerender: &Rc<dyn Fn()>,
) {
    let prev_scroll = reflect_get(list, "scrollTop").as_f64().unwrap_or(0.0);
    reflect_set(list, "innerHTML", &JsValue::from_str(""));
    {
        let mut h = handlers.borrow_mut();
        h.list_handlers.clear();
    }
    let layers = js_sys::Array::from(&state_sig.get_path_js(JsValue::from_str("layers")));
    let selected = state_sig.get_path_js(JsValue::from_str("selected")).as_f64();
    let cur_page = state_sig
        .get_path_js(JsValue::from_str("current_page"))
        .as_f64()
        .unwrap_or(1.0);
    let filtered_indices: Vec<u32> = {
        let mut v = Vec::new();
        let len = layers.length();
        for i in 0..len {
            let l = layers.get(i);
            let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id"))
                .unwrap_or(JsValue::from_f64(1.0))
                .as_f64()
                .unwrap_or(1.0);
            if pid == cur_page {
                v.push(i);
            }
        }
        v
    };

    let layers_len = filtered_indices.len();
    for i in 0..layers_len {
        let idx = filtered_indices[layers_len - 1 - i] as usize;
        let layer = layers.get(idx as u32);
        let row = create_element(document, "div");
        set_class(
            &row,
            "group relative flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer select-none hover:bg-base-200",
        );
        let id_v = js_sys::Reflect::get(&layer, &JsValue::from_str("id")).unwrap_or(JsValue::UNDEFINED);
        if selected.is_some() && id_v.as_f64().unwrap_or(-1.0) == selected.unwrap() {
            set_attr(&row, "style", "background:rgba(99,102,241,.12);");
        }

        let eye = create_element(document, "span");
        set_class(&eye, "text-xs opacity-70 w-5 text-center");
        let visible = js_sys::Reflect::get(&layer, &JsValue::from_str("visible"))
            .unwrap_or(JsValue::from_bool(true))
            .as_bool()
            .unwrap_or(true);
        set_text(&eye, if visible { "👁" } else { "🚫" });
        {
            let state_sig2 = state_sig.clone();
            let handlers_for_tm = handlers.clone();
            let rerender2 = rerender.clone();
            let idx2 = idx;
            let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
                let layers = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("layers")));
                let l = layers.get(idx2 as u32);
                let visible = js_sys::Reflect::get(&l, &JsValue::from_str("visible"))
                    .unwrap_or(JsValue::from_bool(true))
                    .as_bool()
                    .unwrap_or(true);
                state_sig2.set_path_js(JsValue::from_str(&format!("layers.{}.visible", idx2)), JsValue::from_bool(!visible));
                let rer = rerender2.clone();
                let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                    rer();
                }) as Box<dyn FnMut(JsValue)>);
                set_timeout(&tm, 0);
                handlers_for_tm.borrow_mut().ui_handlers.push(tm);
            }) as Box<dyn FnMut(JsValue)>);
            set_onclick(&eye, &cb);
            let handlers_for_push = handlers.clone();
            handlers_for_push.borrow_mut().list_handlers.push(cb);
        }

        let label = create_element(document, "span");
        set_class(&label, "text-sm flex-1");
        let kind_s = js_sys::Reflect::get(&layer, &JsValue::from_str("kind"))
            .unwrap_or(JsValue::from_str(""))
            .as_string()
            .unwrap_or_default();
        let prefix = if kind_s == "rect" { "▭" } else { "T" };
        let name_s = js_sys::Reflect::get(&layer, &JsValue::from_str("name"))
            .unwrap_or(JsValue::from_str(""))
            .as_string()
            .unwrap_or_default();
        set_text(&label, &format!("{} {}", prefix, name_s));
        {
            let state_sig2 = state_sig.clone();
            let rerender2 = rerender.clone();
            let label2 = label.clone();
            let idx2 = idx;
            let document2 = document.clone();
            let handlers_for_cb = handlers.clone();
            let handlers_for_cb2 = handlers_for_cb.clone();
            let cb = Closure::wrap(Box::new(move |_ev: JsValue| {
                reflect_set(&label2, "textContent", &JsValue::from_str(""));
                let inp = create_element(&document2, "input");
                set_class(&inp, "input input-xs input-bordered w-full");
                set_attr(&inp, "data-field", "name");
                let cur = state_sig2.get_path_js(JsValue::from_str(&format!("layers.{}.name", idx2)));
                reflect_set(&inp, "value", &cur);
                append_child(&label2, &inp);
                focus(&inp);
                set_selection_to_end(&inp);
                let state_sig3 = state_sig2.clone();
                let rerender3 = rerender2.clone();
                let inp2 = inp.clone();
                let idx3 = idx2;
                // 为内部闭包使用单独的 handlers 克隆，避免将外部变量 move 导致外层闭包仅为 FnOnce
                let handlers_for_cb_inner = handlers_for_cb2.clone();
                let cb2 = Closure::wrap(Box::new(move |_ev: JsValue| {
                    if let Some(v) = input_value(&inp2) {
                        state_sig3.set_path_js(JsValue::from_str(&format!("layers.{}.name", idx3)), JsValue::from_str(&v));
                        let rer = rerender3.clone();
                        let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                            rer();
                        }) as Box<dyn FnMut(JsValue)>);
                        set_timeout(&tm, 0);
                        handlers_for_cb_inner.borrow_mut().ui_handlers.push(tm);
                    }
                }) as Box<dyn FnMut(JsValue)>);
                set_onchange(&inp, &cb2);
                handlers_for_cb2.borrow_mut().list_handlers.push(cb2);
            }) as Box<dyn FnMut(JsValue)>);
            set_ondblclick(&label, &cb);
            let handlers_for_push = handlers.clone();
            handlers_for_push.borrow_mut().list_handlers.push(cb);
        }

        let actions_bar = create_element(document, "div");
        set_class(&actions_bar, "absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto bg-base-200 rounded-md px-1 shadow");
        // 每行上/下移动按钮
        let btn_up = create_element(document, "button");
        set_class(&btn_up, "btn btn-xs");
        set_text(&btn_up, "上移");
        {
            let state_sig2 = state_sig.clone();
            let rerender2 = rerender.clone();
            let idx2 = idx;
            let handlers_for_tm = handlers.clone();
            let handlers_for_push = handlers.clone();
            let cb = Closure::wrap(Box::new(move |ev: JsValue| {
                let f_prevent = reflect_get(&ev, "preventDefault").dyn_into::<Function>().ok();
                if let Some(func) = f_prevent { let _ = func.call0(&ev); }
                let f_stop = reflect_get(&ev, "stopPropagation").dyn_into::<Function>().ok();
                if let Some(func) = f_stop { let _ = func.call0(&ev); }
                let layers = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("layers")));
                let cur_page = state_sig2.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
                let len = layers.length();
                let mut indices: Vec<u32> = Vec::new();
                for i in 0..len {
                    let l = layers.get(i);
                    let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id"))
                        .unwrap_or(JsValue::from_f64(1.0))
                        .as_f64()
                        .unwrap_or(1.0);
                    if pid == cur_page {
                        indices.push(i);
                    }
                }
                let mut pos: Option<usize> = None;
                for (k, v) in indices.iter().enumerate() {
                    if *v == idx2 as u32 {
                        pos = Some(k);
                        break;
                    }
                }
                if let Some(k) = pos {
                    if k + 1 < indices.len() {
                        let a = indices[k];
                        let b = indices[k + 1];
                        let new_layers = array_new();
                        for i in 0..len {
                            if i == a {
                                array_push(&new_layers, &layers.get(b));
                            } else if i == b {
                                array_push(&new_layers, &layers.get(a));
                            } else {
                                array_push(&new_layers, &layers.get(i));
                            }
                        }
                        state_sig2.set_path_js(JsValue::from_str("layers"), new_layers.into());
                    }
                }
                let rer = rerender2.clone();
                let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                    rer();
                }) as Box<dyn FnMut(JsValue)>);
                set_timeout(&tm, 0);
                handlers_for_tm.borrow_mut().ui_handlers.push(tm);
            }) as Box<dyn FnMut(JsValue)>);
            set_onclick(&btn_up, &cb);
            handlers_for_push.borrow_mut().list_handlers.push(cb);
        }
        let btn_down = create_element(document, "button");
        set_class(&btn_down, "btn btn-xs");
        set_text(&btn_down, "下移");
        {
            let state_sig2 = state_sig.clone();
            let rerender2 = rerender.clone();
            let idx2 = idx;
            let handlers_for_tm = handlers.clone();
            let handlers_for_push = handlers.clone();
            let cb = Closure::wrap(Box::new(move |ev: JsValue| {
                let f_prevent = reflect_get(&ev, "preventDefault").dyn_into::<Function>().ok();
                if let Some(func) = f_prevent { let _ = func.call0(&ev); }
                let f_stop = reflect_get(&ev, "stopPropagation").dyn_into::<Function>().ok();
                if let Some(func) = f_stop { let _ = func.call0(&ev); }
                let layers = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("layers")));
                let cur_page = state_sig2.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
                let len = layers.length();
                let mut indices: Vec<u32> = Vec::new();
                for i in 0..len {
                    let l = layers.get(i);
                    let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id"))
                        .unwrap_or(JsValue::from_f64(1.0))
                        .as_f64()
                        .unwrap_or(1.0);
                    if pid == cur_page {
                        indices.push(i);
                    }
                }
                let mut pos: Option<usize> = None;
                for (k, v) in indices.iter().enumerate() {
                    if *v == idx2 as u32 {
                        pos = Some(k);
                        break;
                    }
                }
                if let Some(k) = pos {
                    if k >= 1 {
                        let a = indices[k];
                        let b = indices[k - 1];
                        let new_layers = array_new();
                        for i in 0..len {
                            if i == a {
                                array_push(&new_layers, &layers.get(b));
                            } else if i == b {
                                array_push(&new_layers, &layers.get(a));
                            } else {
                                array_push(&new_layers, &layers.get(i));
                            }
                        }
                        state_sig2.set_path_js(JsValue::from_str("layers"), new_layers.into());
                    }
                }
                let rer = rerender2.clone();
                let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                    rer();
                }) as Box<dyn FnMut(JsValue)>);
                set_timeout(&tm, 0);
                handlers_for_tm.borrow_mut().ui_handlers.push(tm);
            }) as Box<dyn FnMut(JsValue)>);
            set_onclick(&btn_down, &cb);
            handlers_for_push.borrow_mut().list_handlers.push(cb);
        }
        let btn_del = create_element(document, "button");
        set_class(&btn_del, "btn btn-xs btn-error");
        set_text(&btn_del, "删除");
        {
            let state_sig2 = state_sig.clone();
            let rerender2 = rerender.clone();
            let idx2 = idx;
            let handlers_for_tm = handlers.clone();
            let handlers_for_push = handlers.clone();
            let cb = Closure::wrap(Box::new(move |ev: JsValue| {
                let f_prevent = reflect_get(&ev, "preventDefault").dyn_into::<Function>().ok();
                if let Some(func) = f_prevent { let _ = func.call0(&ev); }
                let f_stop = reflect_get(&ev, "stopPropagation").dyn_into::<Function>().ok();
                if let Some(func) = f_stop { let _ = func.call0(&ev); }
                let layers = js_sys::Array::from(&state_sig2.get_path_js(JsValue::from_str("layers")));
                let len = layers.length();
                let new_layers = array_new();
                for i in 0..len {
                    if i != idx2 as u32 {
                        array_push(&new_layers, &layers.get(i));
                    }
                }
                state_sig2.set_path_js(JsValue::from_str("layers"), new_layers.clone().into());
                let cur_page = state_sig2.get_path_js(JsValue::from_str("current_page")).as_f64().unwrap_or(1.0);
                let mut last_id: Option<f64> = None;
                let nlen = new_layers.length();
                for i in (0..nlen).rev() {
                    let l = new_layers.get(i);
                    let pid = js_sys::Reflect::get(&l, &JsValue::from_str("page_id"))
                        .unwrap_or(JsValue::from_f64(1.0))
                        .as_f64()
                        .unwrap_or(1.0);
                    if pid == cur_page {
                        last_id = js_sys::Reflect::get(&l, &JsValue::from_str("id")).unwrap_or(JsValue::UNDEFINED).as_f64();
                        break;
                    }
                }
                if let Some(idf) = last_id {
                    state_sig2.set_path_js(JsValue::from_str("selected"), JsValue::from_f64(idf));
                } else {
                    state_sig2.set_path_js(JsValue::from_str("selected"), JsValue::UNDEFINED);
                }
                let rer = rerender2.clone();
                let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                    rer();
                }) as Box<dyn FnMut(JsValue)>);
                set_timeout(&tm, 0);
                handlers_for_tm.borrow_mut().ui_handlers.push(tm);
            }) as Box<dyn FnMut(JsValue)>);
            set_onclick(&btn_del, &cb);
            handlers_for_push.borrow_mut().list_handlers.push(cb);
        }

        let chip = create_element(document, "span");
        set_class(&chip, "text-[10px] px-1.5 py-0.5 rounded bg-base-200 text-base-content/70");
        set_text(&chip, &format!("#{}", id_v.as_f64().unwrap_or(0.0) as i32));

        let btn_edit = create_element(document, "button");
        set_class(&btn_edit, "btn btn-xs relative z-[1000]");
        set_text(&btn_edit, "编辑");
        {
            let state_sig2 = state_sig.clone();
            let rerender2 = rerender.clone();
            let label2 = label.clone();
            let document2 = document.clone();
            let handlers_for_cb = handlers.clone();
            let actions_bar2 = actions_bar.clone();
            let idx2 = idx;
            let cb_edit = Closure::wrap(Box::new(move |ev: JsValue| {
                let f_prevent = reflect_get(&ev, "preventDefault").dyn_into::<Function>().ok();
                if let Some(func) = f_prevent { let _ = func.call0(&ev); }
                let f_stop = reflect_get(&ev, "stopPropagation").dyn_into::<Function>().ok();
                if let Some(func) = f_stop { let _ = func.call0(&ev); }
                reflect_set(&label2, "textContent", &JsValue::from_str(""));
                let inp = create_element(&document2, "input");
                set_class(&inp, "input input-xs input-bordered w-full");
                set_attr(&inp, "data-field", "name");
                let cur = state_sig2.get_path_js(JsValue::from_str(&format!("layers.{}.name", idx2)));
                reflect_set(&inp, "value", &cur);
                append_child(&label2, &inp);
                focus(&inp);
                set_selection_to_end(&inp);
                set_class(&actions_bar2, "absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 opacity-0 pointer-events-none bg-base-200 rounded-md px-1 shadow");
                let actions_bar3 = actions_bar2.clone();
                let state_sig_blur = state_sig2.clone();
                let rerender_blur = rerender2.clone();
                let inp_blur = inp.clone();
                let idx_blur = idx2;
                let handlers_for_cb_blur = handlers_for_cb.clone();
                let actions_bar_restore = actions_bar3.clone();
                let cb_blur = Closure::wrap(Box::new(move |_ev: JsValue| {
                    if let Some(v) = input_value(&inp_blur) {
                        state_sig_blur.set_path_js(JsValue::from_str(&format!("layers.{}.name", idx_blur)), JsValue::from_str(&v));
                        let rer = rerender_blur.clone();
                        let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                            rer();
                        }) as Box<dyn FnMut(JsValue)>);
                        set_timeout(&tm, 0);
                        handlers_for_cb_blur.borrow_mut().ui_handlers.push(tm);
                    }
                    set_class(&actions_bar_restore, "absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto bg-base-200 rounded-md px-1 shadow");
                }) as Box<dyn FnMut(JsValue)>);
                set_onblur(&inp, &cb_blur);
                handlers_for_cb.borrow_mut().list_handlers.push(cb_blur);
                let state_sig3 = state_sig2.clone();
                let rerender3 = rerender2.clone();
                let inp2 = inp.clone();
                let idx3 = idx2;
                let handlers_for_cb2 = handlers_for_cb.clone();
                let cb2 = Closure::wrap(Box::new(move |_ev: JsValue| {
                    if let Some(v) = input_value(&inp2) {
                        state_sig3.set_path_js(JsValue::from_str(&format!("layers.{}.name", idx3)), JsValue::from_str(&v));
                        let rer = rerender3.clone();
                        let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                            rer();
                        }) as Box<dyn FnMut(JsValue)>);
                        set_timeout(&tm, 0);
                        handlers_for_cb2.borrow_mut().ui_handlers.push(tm);
                    }
                }) as Box<dyn FnMut(JsValue)>);
                set_onchange(&inp, &cb2);
                handlers_for_cb.borrow_mut().list_handlers.push(cb2);
            }) as Box<dyn FnMut(JsValue)>);
            set_onclick(&btn_edit, &cb_edit);
            let handlers_for_push = handlers.clone();
            handlers_for_push.borrow_mut().list_handlers.push(cb_edit);
        }

        append_child(&row, &eye);
        append_child(&row, &label);
        append_child(&row, &chip);
        append_child(&actions_bar, &btn_edit);
        append_child(&actions_bar, &btn_up);
        append_child(&actions_bar, &btn_down);
        append_child(&actions_bar, &btn_del);
        append_child(&row, &actions_bar);

        let state_sig2 = state_sig.clone();
        let handlers_for_tm = handlers.clone();
        let rerender2 = rerender.clone();
        let id = id_v.as_f64().unwrap_or(0.0);
        let cb = Closure::wrap(Box::new(move |ev: JsValue| {
            let btn = reflect_get(&ev, "button").as_f64().unwrap_or(0.0);
            if btn != 0.0 {
                return;
            }
            state_sig2.set_path_js(JsValue::from_str("selected"), JsValue::from_f64(id));
            let selm = array_new();
            array_push(&selm, &JsValue::from_f64(id));
            state_sig2.set_path_js(JsValue::from_str("selected_multi"), selm.into());
            let rer = rerender2.clone();
            let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                rer();
            }) as Box<dyn FnMut(JsValue)>);
            set_timeout(&tm, 0);
            handlers_for_tm.borrow_mut().ui_handlers.push(tm);
        }) as Box<dyn FnMut(JsValue)>);
        set_onclick(&row, &cb);
        let handlers_for_push = handlers.clone();
        handlers_for_push.borrow_mut().list_handlers.push(cb);

        let state_sig2 = state_sig.clone();
        let rerender2 = rerender.clone();
        let label2 = label.clone();
        let document2 = document.clone();
        let handlers_for_cb = handlers.clone();
        let idx2 = idx;
        let cb_ctx = Closure::wrap(Box::new(move |ev: JsValue| {
            let f_prevent = reflect_get(&ev, "preventDefault").dyn_into::<Function>().ok();
            if let Some(func) = f_prevent { let _ = func.call0(&ev); }
            let f_stop = reflect_get(&ev, "stopPropagation").dyn_into::<Function>().ok();
            if let Some(func) = f_stop { let _ = func.call0(&ev); }
            reflect_set(&label2, "textContent", &JsValue::from_str(""));
            let inp = create_element(&document2, "input");
            set_class(&inp, "input input-xs input-bordered w-full");
            set_attr(&inp, "data-field", "name");
            let cur = state_sig2.get_path_js(JsValue::from_str(&format!("layers.{}.name", idx2)));
            reflect_set(&inp, "value", &cur);
            append_child(&label2, &inp);
            focus(&inp);
            set_selection_to_end(&inp);
            let actions_bar2 = actions_bar.clone();
            set_class(&actions_bar2, "absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 opacity-0 pointer-events-none bg-base-200 rounded-md px-1 shadow");
            let actions_bar3 = actions_bar2.clone();
            let state_sig_blur = state_sig2.clone();
            let rerender_blur = rerender2.clone();
            let inp_blur = inp.clone();
            let idx_blur = idx2;
            let handlers_for_cb_blur = handlers_for_cb.clone();
            let actions_bar_restore = actions_bar3.clone();
            let cb_blur = Closure::wrap(Box::new(move |_ev: JsValue| {
                if let Some(v) = input_value(&inp_blur) {
                    state_sig_blur.set_path_js(JsValue::from_str(&format!("layers.{}.name", idx_blur)), JsValue::from_str(&v));
                    let rer = rerender_blur.clone();
                    let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                        rer();
                    }) as Box<dyn FnMut(JsValue)>);
                    set_timeout(&tm, 0);
                    handlers_for_cb_blur.borrow_mut().ui_handlers.push(tm);
                }
                set_class(&actions_bar_restore, "absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto bg-base-200 rounded-md px-1 shadow");
            }) as Box<dyn FnMut(JsValue)>);
            set_onblur(&inp, &cb_blur);
            handlers_for_cb.borrow_mut().list_handlers.push(cb_blur);
            let state_sig3 = state_sig2.clone();
            let rerender3 = rerender2.clone();
            let inp2 = inp.clone();
            let idx3 = idx2;
            let handlers_for_cb2 = handlers_for_cb.clone();
            let cb2 = Closure::wrap(Box::new(move |_ev: JsValue| {
                if let Some(v) = input_value(&inp2) {
                    state_sig3.set_path_js(JsValue::from_str(&format!("layers.{}.name", idx3)), JsValue::from_str(&v));
                    let rer = rerender3.clone();
                    let tm = Closure::wrap(Box::new(move |_t: JsValue| {
                        rer();
                    }) as Box<dyn FnMut(JsValue)>);
                    set_timeout(&tm, 0);
                    handlers_for_cb2.borrow_mut().ui_handlers.push(tm);
                }
            }) as Box<dyn FnMut(JsValue)>);
            set_onchange(&inp, &cb2);
            handlers_for_cb.borrow_mut().list_handlers.push(cb2);
        }) as Box<dyn FnMut(JsValue)>);
        set_oncontextmenu(&row, &cb_ctx);
        let handlers_for_push_ctx = handlers.clone();
        handlers_for_push_ctx.borrow_mut().list_handlers.push(cb_ctx);
        append_child(list, &row);
    }

    reflect_set(list, "scrollTop", &JsValue::from_f64(prev_scroll));
}
